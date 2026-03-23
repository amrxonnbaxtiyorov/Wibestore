"""
WibeStore Backend - Payments Services
"""

import logging
from decimal import Decimal

from django.conf import settings
from django.db import transaction as db_transaction
from django.utils import timezone

from core.exceptions import BusinessLogicError, InsufficientFundsError
from core.utils import calculate_commission, calculate_seller_earnings

from .models import EscrowTransaction, PaymentMethod, SellerVerification, Transaction, WithdrawalRequest

logger = logging.getLogger("apps.payments")


class PaymentService:
    """Service layer for payment operations."""

    @staticmethod
    @db_transaction.atomic
    def create_deposit(user, amount: Decimal, payment_method_code: str) -> Transaction:
        """Create a deposit transaction."""
        payment_method = PaymentMethod.objects.filter(
            code=payment_method_code, is_active=True
        ).first()

        txn = Transaction.objects.create(
            user=user,
            amount=amount,
            type="deposit",
            status="pending",
            payment_method=payment_method,
            description=f"Deposit via {payment_method_code}",
        )

        logger.info("Deposit created: %s for user %s, amount: %s", txn.id, user.email, amount)
        return txn

    @staticmethod
    @db_transaction.atomic
    def create_withdrawal(user, amount: Decimal, payment_method_code: str) -> Transaction:
        """Create a withdrawal transaction."""
        if user.balance < amount:
            raise InsufficientFundsError("Insufficient balance for withdrawal.")

        payment_method = PaymentMethod.objects.filter(
            code=payment_method_code, is_active=True
        ).first()

        txn = Transaction.objects.create(
            user=user,
            amount=amount,
            type="withdrawal",
            status="pending",
            payment_method=payment_method,
            description=f"Withdrawal via {payment_method_code}",
        )

        # Deduct from balance
        user.balance -= amount
        user.save(update_fields=["balance"])

        logger.info("Withdrawal created: %s for user %s, amount: %s", txn.id, user.email, amount)
        return txn

    @staticmethod
    @db_transaction.atomic
    def complete_deposit(transaction: Transaction) -> Transaction:
        """Complete a deposit (called by webhook)."""
        if transaction.status != "pending":
            raise BusinessLogicError("Transaction is not in pending state.")

        transaction.status = "completed"
        transaction.processed_at = timezone.now()
        transaction.save(update_fields=["status", "processed_at"])

        # Add to user balance
        user = transaction.user
        user.balance += transaction.amount
        user.save(update_fields=["balance"])

        logger.info("Deposit completed: %s", transaction.id)
        return transaction


class EscrowService:
    """Service layer for escrow (safe deal) operations."""

    @staticmethod
    @db_transaction.atomic
    def create_escrow(buyer, listing) -> EscrowTransaction:
        """Create an escrow transaction for a listing purchase."""
        if listing.status != "active":
            raise BusinessLogicError("Listing is not available for purchase.")

        if buyer == listing.seller:
            raise BusinessLogicError("You cannot buy your own listing.")

        if buyer.balance < listing.price:
            raise InsufficientFundsError("Insufficient balance.")

        # Get seller subscription plan
        plan_type = EscrowService._get_seller_plan(listing.seller)
        commission = calculate_commission(listing.price, plan_type)
        earnings = calculate_seller_earnings(listing.price, plan_type)

        # Deduct from buyer balance
        buyer.balance -= listing.price
        buyer.save(update_fields=["balance"])

        escrow = EscrowTransaction.objects.create(
            listing=listing,
            buyer=buyer,
            seller=listing.seller,
            amount=listing.price,
            commission_amount=commission,
            seller_earnings=earnings,
            status="paid",
        )

        # Increment buyer purchases count
        buyer.total_purchases += 1
        buyer.save(update_fields=["total_purchases"])

        # Mark listing as sold immediately — hide from public listings.
        # seller.total_sales is incremented later in release_payment → mark_as_sold.
        listing.status = "sold"
        listing.sold_at = timezone.now()
        listing.save(update_fields=["status", "sold_at"])

        logger.info(
            "Escrow created: %s (buyer: %s, seller: %s, amount: %s)",
            escrow.id, buyer.email, listing.seller.email, listing.price,
        )

        # BLOCK 2.2: Telegram notifications for new purchase
        try:
            from apps.messaging.services import create_order_chat_for_escrow
            chat_room = create_order_chat_for_escrow(escrow)
            chat_room_id = str(chat_room.id) if chat_room else None
        except Exception as chat_err:
            logger.warning("Could not create order chat: %s", chat_err)
            chat_room_id = None

        try:
            from .telegram_notify import notify_purchase_created, notify_admin_new_trade
            notify_purchase_created(escrow, chat_room_id=chat_room_id)
            notify_admin_new_trade(escrow)
        except Exception as tg_err:
            logger.warning("Telegram purchase notification failed: %s", tg_err)

        # BLOCK 7.2: In-app notification
        try:
            from apps.notifications.services import NotificationService
            NotificationService.notify_trade_status_change(escrow, "paid")
        except Exception as notif_err:
            logger.warning("In-app trade notification failed: %s", notif_err)

        # Schedule auto-release (optional — fails silently if Celery/Redis unavailable)
        try:
            from .tasks import release_escrow_payment
            release_escrow_payment.apply_async(
                args=[str(escrow.id)],
                countdown=getattr(settings, "ESCROW_AUTO_RELEASE_HOURS", 24) * 3600,
            )
        except Exception as celery_err:
            logger.warning("Could not schedule auto-release for escrow %s: %s", escrow.id, celery_err)

        return escrow

    @staticmethod
    @db_transaction.atomic
    def seller_confirm_transfer(escrow: EscrowTransaction, seller) -> EscrowTransaction:
        """Sotuvchi akkauntni topshirganini tasdiqlaydi (bot orqali)."""
        if escrow.seller != seller:
            raise BusinessLogicError("Faqat sotuvchi akkaunt topshirilganini tasdiqlay oladi.")
        if escrow.status not in ("paid",):
            raise BusinessLogicError("Escrow holati to'g'ri emas (paid bo'lishi kerak).")

        # dispute_resolution maydoniga sotuvchi tasdig'ini saqlaymiz
        import json as _json
        from django.utils import timezone as _tz

        seller_data = {
            "seller_confirmed": True,
            "seller_confirmed_at": _tz.now().isoformat(),
        }
        escrow.dispute_resolution = _json.dumps(seller_data)
        escrow.save(update_fields=["dispute_resolution"])

        logger.info("Escrow seller confirmed transfer: %s", escrow.id)

        # Sotuvchi shaxsini tasdiqlash yozuvini yaratish yoki qayta boshlash
        verification = SellerVerification.objects.filter(escrow=escrow).order_by("-created_at").first()
        if verification and verification.status == SellerVerification.STATUS_REJECTED:
            # Avvalgi rad etilgani bor — qayta yuborish uchun sıfırla
            verification.reset_for_resubmission()
        elif not verification:
            verification = SellerVerification.objects.create(
                escrow=escrow,
                seller=seller,
                status=SellerVerification.STATUS_PENDING,
            )

        # Sotuvchiga shaxs tasdiqlash so'rovi yuborish
        try:
            from .telegram_notify import notify_verification_request, notify_seller_confirmed
            notify_verification_request(escrow, verification)
            notify_seller_confirmed(escrow)
        except Exception as tg_err:
            logger.warning("Telegram seller-confirm/verification notification failed: %s", tg_err)

        return escrow

    @staticmethod
    @db_transaction.atomic
    def confirm_delivery(escrow: EscrowTransaction, buyer) -> EscrowTransaction:
        """Buyer confirms receiving the account."""
        if escrow.buyer != buyer:
            raise BusinessLogicError("Only the buyer can confirm delivery.")
        if escrow.status != "paid":
            raise BusinessLogicError("Escrow is not in paid status.")

        escrow.status = "delivered"
        escrow.buyer_confirmed_at = timezone.now()
        escrow.save(update_fields=["status", "buyer_confirmed_at"])

        logger.info("Escrow delivery confirmed: %s", escrow.id)

        # Block 2.2: Notify seller to confirm transfer, notify buyer to confirm receipt
        try:
            from .telegram_notify import notify_seller_confirm_transfer, notify_buyer_confirm_received
            notify_seller_confirm_transfer(escrow)
            notify_buyer_confirm_received(escrow)
        except Exception as tg_err:
            logger.warning("Telegram delivery confirmation notifications failed: %s", tg_err)

        return escrow

    @staticmethod
    @db_transaction.atomic
    def release_payment(escrow: EscrowTransaction) -> EscrowTransaction:
        """Release payment to seller after confirmation period.

        Note: seller.total_sales is incremented solely via
        ListingService.mark_as_sold() to avoid double-counting.
        Seller verification must be approved before payment is released.
        """
        if escrow.status not in ("paid", "delivered"):
            raise BusinessLogicError("Escrow cannot be released.")

        # Sotuvchi shaxsini tasdiqlash tekshiruvi
        verification = (
            SellerVerification.objects.filter(escrow=escrow)
            .order_by("-created_at")
            .first()
        )
        if not verification or verification.status != SellerVerification.STATUS_APPROVED:
            raise BusinessLogicError(
                "Sotuvchi hujjatlari tasdiqlanmagan. "
                "To'lov ushlab turilgan. Telegram botda hujjatlarni taqdim eting."
            )

        # Transfer earnings to seller
        seller = escrow.seller
        seller.balance += escrow.seller_earnings
        seller.save(update_fields=["balance"])

        escrow.status = "confirmed"
        escrow.seller_paid_at = timezone.now()
        escrow.save(update_fields=["status", "seller_paid_at"])

        # Mark listing as sold — this handles seller.total_sales increment
        from apps.marketplace.services import ListingService
        ListingService.mark_as_sold(escrow.listing)

        # Create a commission transaction record
        Transaction.objects.create(
            user=seller,
            amount=escrow.commission_amount,
            type="commission",
            status="completed",
            description=f"Commission for listing {escrow.listing.title}",
            processed_at=timezone.now(),
        )

        logger.info("Escrow payment released: %s, seller earned: %s", escrow.id, escrow.seller_earnings)

        try:
            from .telegram_notify import notify_trade_completed
            notify_trade_completed(escrow)
        except Exception as tg_err:
            logger.warning("Telegram trade-completed notification failed: %s", tg_err)

        # BLOCK 7.2: In-app notification for trade confirmed
        try:
            from apps.notifications.services import NotificationService
            NotificationService.notify_trade_status_change(escrow, "confirmed")
        except Exception as e:
            logger.warning("In-app notification (trade confirmed) failed: %s", e)

        return escrow

    @staticmethod
    @db_transaction.atomic
    def approve_seller_verification(verification: SellerVerification, admin_user=None) -> EscrowTransaction:
        """Admin sotuvchi hujjatlarini tasdiqlaydi va to'lovni chiqaradi."""
        from django.utils import timezone as _tz

        if verification.status not in (
            SellerVerification.STATUS_SUBMITTED,
            SellerVerification.STATUS_PENDING,
            SellerVerification.STATUS_VIDEO,
            SellerVerification.STATUS_PASSPORT_BACK,
        ):
            raise BusinessLogicError("Tekshiruv holati tasdiqlash uchun mos emas.")

        verification.status = SellerVerification.STATUS_APPROVED
        verification.reviewed_at = _tz.now()
        if admin_user:
            verification.reviewed_by = admin_user
        verification.save(update_fields=["status", "reviewed_at", "reviewed_by"])

        logger.info("SellerVerification approved: %s", verification.id)

        # To'lovni chiqarish
        escrow = verification.escrow
        if escrow.status in ("paid", "delivered"):
            return EscrowService.release_payment(escrow)
        return escrow

    @staticmethod
    @db_transaction.atomic
    def reject_seller_verification(
        verification: SellerVerification, admin_user=None, note: str = ""
    ) -> SellerVerification:
        """Admin sotuvchi hujjatlarini rad etadi."""
        from django.utils import timezone as _tz

        verification.status = SellerVerification.STATUS_REJECTED
        verification.reviewed_at = _tz.now()
        if admin_user:
            verification.reviewed_by = admin_user
        if note:
            verification.admin_note = note
        verification.save(update_fields=["status", "reviewed_at", "reviewed_by", "admin_note"])

        logger.info("SellerVerification rejected: %s", verification.id)

        # Sotuvchiga qayta yuborish so'rovi
        try:
            from .telegram_notify import notify_verification_rejected
            notify_verification_rejected(verification)
        except Exception as tg_err:
            logger.warning("Telegram verification reject notification failed: %s", tg_err)

        return verification

    @staticmethod
    @db_transaction.atomic
    def open_dispute(escrow: EscrowTransaction, buyer, reason: str) -> EscrowTransaction:
        """Open a dispute for an escrow transaction."""
        if escrow.buyer != buyer:
            raise BusinessLogicError("Only the buyer can open a dispute.")
        if escrow.status not in ("paid", "delivered"):
            raise BusinessLogicError("Cannot dispute this transaction.")

        escrow.status = "disputed"
        escrow.dispute_reason = reason
        escrow.save(update_fields=["status", "dispute_reason"])

        logger.info("Escrow dispute opened: %s", escrow.id)

        try:
            from .telegram_notify import notify_dispute_opened
            notify_dispute_opened(escrow, reason)
        except Exception as tg_err:
            logger.warning("Telegram dispute notification failed: %s", tg_err)

        # BLOCK 7.2: In-app notification for dispute
        try:
            from apps.notifications.services import NotificationService
            NotificationService.notify_trade_status_change(escrow, "disputed")
        except Exception as e:
            logger.warning("In-app notification (dispute opened) failed: %s", e)

        return escrow

    @staticmethod
    @db_transaction.atomic
    def refund_escrow(escrow: EscrowTransaction, admin_user, resolution: str) -> EscrowTransaction:
        """Refund buyer and close dispute."""
        if escrow.status != "disputed":
            raise BusinessLogicError("Only disputed transactions can be refunded.")

        # Refund buyer
        buyer = escrow.buyer
        buyer.balance += escrow.amount
        buyer.save(update_fields=["balance"])

        escrow.status = "refunded"
        escrow.dispute_resolved_by = admin_user
        escrow.dispute_resolution = resolution
        escrow.admin_released_at = timezone.now()
        escrow.save(
            update_fields=[
                "status", "dispute_resolved_by", "dispute_resolution", "admin_released_at"
            ]
        )

        # Restore listing to active so it can be re-listed or sold again
        listing = escrow.listing
        listing.status = "active"
        listing.sold_at = None
        listing.save(update_fields=["status", "sold_at"])

        logger.info("Escrow refunded: %s by admin %s", escrow.id, admin_user.email)

        # Block 2.2: Telegram notification — trade cancelled (refunded by admin)
        try:
            from .telegram_notify import notify_trade_cancelled
            notify_trade_cancelled(escrow, cancelled_by="admin")
        except Exception as tg_err:
            logger.warning("Telegram trade_cancelled notification failed: %s", tg_err)

        # BLOCK 7.2: In-app notification for refund
        try:
            from apps.notifications.services import NotificationService
            NotificationService.notify_trade_status_change(escrow, "refunded")
        except Exception as e:
            logger.warning("In-app notification (escrow refunded) failed: %s", e)

        return escrow

    @staticmethod
    @db_transaction.atomic
    def process_trade_confirmation(escrow: "EscrowTransaction", side: str) -> tuple:
        """
        Sotuvchi yoki haridor savdoni tasdiqlaydi.
        side = 'seller' | 'buyer'
        Ikkala tomon tasdiqlaganda verifikatsiya jarayoni boshlanadi.
        Returns (escrow, both_confirmed: bool)
        """
        if escrow.status not in ("paid", "delivered"):
            raise BusinessLogicError("Savdo allaqachon yakunlangan yoki bekor qilingan.")

        now = timezone.now()
        if side == "seller":
            if escrow.seller_confirmed:
                raise BusinessLogicError("Sotuvchi allaqachon tasdiqlagan.")
            escrow.seller_confirmed = True
            escrow.seller_confirmed_at_trade = now
        elif side == "buyer":
            if escrow.buyer_confirmed:
                raise BusinessLogicError("Haridor allaqachon tasdiqlagan.")
            escrow.buyer_confirmed = True
            escrow.buyer_confirmed_at_trade = now

        both_confirmed = escrow.seller_confirmed and escrow.buyer_confirmed

        if both_confirmed:
            # Ikki tomon tasdiqladi — verifikatsiya jarayoniga o'tish
            escrow.save(update_fields=[
                "seller_confirmed", "seller_confirmed_at_trade",
                "buyer_confirmed", "buyer_confirmed_at_trade",
            ])

            # Sotuvchi verifikatsiyasini boshlash (BLOK 3)
            verification = SellerVerification.objects.filter(escrow=escrow).order_by("-created_at").first()
            if verification and verification.status == SellerVerification.STATUS_REJECTED:
                verification.reset_for_resubmission()
            elif not verification:
                verification = SellerVerification.objects.create(
                    escrow=escrow,
                    seller=escrow.seller,
                    status=SellerVerification.STATUS_PENDING,
                )

            try:
                from .telegram_notify import notify_verification_request
                notify_verification_request(escrow, verification)
            except Exception as tg_err:
                logger.warning("Verification request notification failed: %s", tg_err)

            logger.info("Trade confirmed by both parties: escrow %s — verification started", escrow.id)
        else:
            escrow.save(update_fields=[
                "seller_confirmed", "seller_confirmed_at_trade",
                "buyer_confirmed", "buyer_confirmed_at_trade",
            ])
            logger.info("Trade confirmation by %s: escrow %s (waiting for other party)", side, escrow.id)

        return escrow, both_confirmed

    @staticmethod
    @db_transaction.atomic
    def cancel_trade_by_party(escrow: "EscrowTransaction", side: str, reason: str = "") -> "EscrowTransaction":
        """
        Sotuvchi yoki haridor savdoni bekor qiladi.
        Ikkala tomon bekor qilsa — pul qaytariladi.
        Bir tomon tasdiqlagan, biri bekor qilsa — nizo (dispute).
        """
        if escrow.status not in ("paid", "delivered"):
            raise BusinessLogicError("Savdoni bekor qilish mumkin emas.")

        now = timezone.now()
        if side == "seller":
            if escrow.seller_cancelled:
                raise BusinessLogicError("Sotuvchi allaqachon bekor qilgan.")
            escrow.seller_cancelled = True
            escrow.seller_cancelled_at = now
            escrow.seller_cancel_reason = reason
        elif side == "buyer":
            if escrow.buyer_cancelled:
                raise BusinessLogicError("Haridor allaqachon bekor qilgan.")
            escrow.buyer_cancelled = True
            escrow.buyer_cancelled_at = now
            escrow.buyer_cancel_reason = reason

        both_cancelled = escrow.seller_cancelled and escrow.buyer_cancelled

        # Bir tomon tasdiqlagan, biri bekor qilgan → nizo
        one_confirmed_one_cancelled = (
            (escrow.seller_confirmed and escrow.buyer_cancelled) or
            (escrow.buyer_confirmed and escrow.seller_cancelled)
        )

        if both_cancelled:
            # Ikki tomon ham bekor qildi → pul qaytarish
            buyer = escrow.buyer
            buyer.balance += escrow.amount
            buyer.save(update_fields=["balance"])

            escrow.status = "refunded"
            escrow.dispute_reason = "Ikkala tomon savdoni bekor qildi."
            escrow.admin_released_at = now
            escrow.save()

            listing = escrow.listing
            listing.status = "active"
            listing.sold_at = None
            listing.save(update_fields=["status", "sold_at"])

            logger.info("Trade cancelled by both parties: escrow %s, refunded", escrow.id)
        elif one_confirmed_one_cancelled:
            # Nizo → admin hal qiladi
            escrow.status = "disputed"
            who = "Sotuvchi" if side == "seller" else "Haridor"
            escrow.dispute_reason = f"{who} bekor qildi (boshqa tomon tasdiqlagan). Sabab: {reason}"
            escrow.save()
            logger.info("Trade disputed (one confirmed, one cancelled): escrow %s", escrow.id)
        else:
            # Faqat bir tomon bekor qildi, ikkinchisi hali javob bermagan
            escrow.save()
            logger.info("Trade cancel by %s: escrow %s (waiting for other party)", side, escrow.id)

        return escrow

    # ── Alohida tasdiqlash/bekor qilish metodlari (API uchun) ──

    @staticmethod
    @db_transaction.atomic
    def seller_confirm_trade(escrow_id, user):
        """Sotuvchi savdoni tasdiqlaydi (API endpoint uchun)."""
        escrow = EscrowTransaction.objects.select_related(
            "buyer", "seller", "listing"
        ).get(id=escrow_id, seller=user)
        return EscrowService.process_trade_confirmation(escrow, "seller")

    @staticmethod
    @db_transaction.atomic
    def buyer_confirm_trade(escrow_id, user):
        """Haridor savdoni tasdiqlaydi (API endpoint uchun)."""
        escrow = EscrowTransaction.objects.select_related(
            "buyer", "seller", "listing"
        ).get(id=escrow_id, buyer=user)
        return EscrowService.process_trade_confirmation(escrow, "buyer")

    @staticmethod
    @db_transaction.atomic
    def seller_cancel_trade(escrow_id, user, reason=""):
        """Sotuvchi savdoni bekor qiladi (API endpoint uchun)."""
        escrow = EscrowTransaction.objects.select_related(
            "buyer", "seller", "listing"
        ).get(id=escrow_id, seller=user)
        return EscrowService.cancel_trade_by_party(escrow, "seller", reason)

    @staticmethod
    @db_transaction.atomic
    def buyer_cancel_trade(escrow_id, user, reason=""):
        """Haridor savdoni bekor qiladi (API endpoint uchun)."""
        escrow = EscrowTransaction.objects.select_related(
            "buyer", "seller", "listing"
        ).get(id=escrow_id, buyer=user)
        return EscrowService.cancel_trade_by_party(escrow, "buyer", reason)

    @staticmethod
    def _get_seller_plan(seller) -> str:
        """Get seller's subscription plan type."""
        from apps.subscriptions.models import UserSubscription

        active_sub = UserSubscription.objects.filter(
            user=seller, status="active"
        ).select_related("plan").first()

        if not active_sub:
            return "free"
        if active_sub.plan.is_pro:
            return "pro"
        if active_sub.plan.is_premium:
            return "premium"
        return "free"


class WithdrawalService:
    """Pul yechish so'rovlarini boshqarish."""

    @staticmethod
    @db_transaction.atomic
    def create_withdrawal(user, amount, card_number, card_holder_name, card_type="humo"):
        """Yangi pul yechish so'rovi yaratish."""
        from decimal import Decimal

        amount = Decimal(str(amount))
        if amount < Decimal("10000"):
            raise BusinessLogicError("Minimal pul yechish miqdori: 10,000 so'm")
        if user.balance < amount:
            raise InsufficientFundsError("Balans yetarli emas.")

        # Balansdan ushlab turish (freeze)
        user.balance -= amount
        user.save(update_fields=["balance"])

        withdrawal = WithdrawalRequest.objects.create(
            user=user,
            amount=amount,
            card_number=card_number,
            card_holder_name=card_holder_name,
            card_type=card_type,
            user_telegram_id=getattr(user, "telegram_id", None),
        )

        logger.info("Withdrawal request created: %s, amount: %s, user: %s", withdrawal.id, amount, user.email)

        # Adminlarga Telegram xabar
        try:
            from .telegram_notify import notify_withdrawal_request
            notify_withdrawal_request(user, amount, card_number)
        except Exception as tg_err:
            logger.warning("Withdrawal Telegram notification failed: %s", tg_err)

        return withdrawal

    @staticmethod
    @db_transaction.atomic
    def approve_withdrawal(withdrawal_id, admin_user=None):
        """Admin pul yechish so'rovini tasdiqlaydi."""
        withdrawal = WithdrawalRequest.objects.select_related("user").get(id=withdrawal_id)
        if withdrawal.status != WithdrawalRequest.STATUS_PENDING:
            raise BusinessLogicError("Bu so'rov allaqachon ko'rib chiqilgan.")

        withdrawal.status = WithdrawalRequest.STATUS_COMPLETED
        withdrawal.reviewed_by = admin_user
        withdrawal.reviewed_at = timezone.now()
        withdrawal.save(update_fields=["status", "reviewed_by", "reviewed_at"])

        # Transaction yozuvi
        Transaction.objects.create(
            user=withdrawal.user,
            amount=withdrawal.amount,
            type="withdrawal",
            status="completed",
            description=f"Pul yechish — {withdrawal.card_type} {withdrawal.card_number}",
            processed_at=timezone.now(),
        )

        logger.info("Withdrawal approved: %s by admin %s", withdrawal.id, admin_user)

        try:
            from .telegram_notify import notify_withdrawal_processed
            notify_withdrawal_processed(withdrawal.user, withdrawal.amount, "completed")
        except Exception as tg_err:
            logger.warning("Withdrawal approval Telegram notification failed: %s", tg_err)

        return withdrawal

    @staticmethod
    @db_transaction.atomic
    def reject_withdrawal(withdrawal_id, admin_user=None, reason=""):
        """Admin pul yechish so'rovini rad etadi va balansni qaytaradi."""
        withdrawal = WithdrawalRequest.objects.select_related("user").get(id=withdrawal_id)
        if withdrawal.status != WithdrawalRequest.STATUS_PENDING:
            raise BusinessLogicError("Bu so'rov allaqachon ko'rib chiqilgan.")

        withdrawal.status = WithdrawalRequest.STATUS_REJECTED
        withdrawal.reviewed_by = admin_user
        withdrawal.reviewed_at = timezone.now()
        withdrawal.rejection_reason = reason
        withdrawal.save(update_fields=["status", "reviewed_by", "reviewed_at", "rejection_reason"])

        # Balansni qaytarish (unfreeze)
        user = withdrawal.user
        user.balance += withdrawal.amount
        user.save(update_fields=["balance"])

        logger.info("Withdrawal rejected: %s, balance restored for user %s", withdrawal.id, user.email)

        try:
            from .telegram_notify import notify_withdrawal_processed
            notify_withdrawal_processed(user, withdrawal.amount, "rejected")
        except Exception as tg_err:
            logger.warning("Withdrawal rejection Telegram notification failed: %s", tg_err)

        return withdrawal
