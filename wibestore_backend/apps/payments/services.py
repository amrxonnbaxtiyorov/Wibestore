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

from .models import EscrowTransaction, PaymentMethod, SellerVerification, Transaction

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
            from .telegram_notify import notify_purchase_created
            notify_purchase_created(escrow, chat_room_id=chat_room_id)
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
        except Exception:
            pass

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
        except Exception:
            pass

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

        # BLOCK 7.2: In-app notification for refund
        try:
            from apps.notifications.services import NotificationService
            NotificationService.notify_trade_status_change(escrow, "refunded")
        except Exception:
            pass

        return escrow

    @staticmethod
    @db_transaction.atomic
    def process_trade_confirmation(escrow: "EscrowTransaction", side: str) -> tuple:
        """
        Sotuvchi yoki haridor savdoni tasdiqlaydi.
        side = 'seller' | 'buyer'
        Ikkala tomon tasdiqlaganda to'lovni avtomatik sotuvchiga o'tkazadi.
        Returns (escrow, both_confirmed: bool)
        """
        import json as _json
        from django.utils import timezone as _tz

        if escrow.status not in ("paid", "delivered"):
            raise BusinessLogicError("Savdo allaqachon yakunlangan yoki bekor qilingan.")

        try:
            resolution = _json.loads(escrow.dispute_resolution) if escrow.dispute_resolution else {}
        except Exception:
            resolution = {}

        now = _tz.now().isoformat()
        if side == "seller":
            resolution["trade_seller_confirmed"] = True
            resolution["trade_seller_confirmed_at"] = now
        elif side == "buyer":
            resolution["trade_buyer_confirmed"] = True
            resolution["trade_buyer_confirmed_at"] = now

        escrow.dispute_resolution = _json.dumps(resolution)

        both_confirmed = bool(
            resolution.get("trade_seller_confirmed") and resolution.get("trade_buyer_confirmed")
        )

        if both_confirmed:
            escrow.status = "confirmed"
            escrow.buyer_confirmed_at = _tz.now()
            escrow.seller_paid_at = _tz.now()
            escrow.save(update_fields=[
                "status", "buyer_confirmed_at", "seller_paid_at", "dispute_resolution"
            ])

            seller = escrow.seller
            seller.balance += escrow.seller_earnings
            seller.save(update_fields=["balance"])

            from apps.marketplace.services import ListingService
            ListingService.mark_as_sold(escrow.listing)

            Transaction.objects.create(
                user=seller,
                amount=escrow.commission_amount,
                type="commission",
                status="completed",
                description=f"Commission for listing {escrow.listing.title}",
                processed_at=_tz.now(),
            )
            logger.info("Trade confirmed by both parties: escrow %s", escrow.id)
        else:
            escrow.save(update_fields=["dispute_resolution"])
            logger.info("Trade confirmation by %s: escrow %s (waiting for other party)", side, escrow.id)

        return escrow, both_confirmed

    @staticmethod
    @db_transaction.atomic
    def cancel_trade_by_party(escrow: "EscrowTransaction", side: str) -> "EscrowTransaction":
        """
        Sotuvchi yoki haridor savdoni bekor qiladi.
        Haridor pulini qaytarib oladi, listing qayta aktiv bo'ladi.
        """
        from django.utils import timezone as _tz

        if escrow.status not in ("paid", "delivered"):
            raise BusinessLogicError("Savdoni bekor qilish mumkin emas.")

        buyer = escrow.buyer
        buyer.balance += escrow.amount
        buyer.save(update_fields=["balance"])

        who = "Sotuvchi" if side == "seller" else "Haridor"
        escrow.status = "refunded"
        escrow.dispute_reason = f"{who} savdoni bekor qildi."
        escrow.admin_released_at = _tz.now()
        escrow.save(update_fields=["status", "dispute_reason", "admin_released_at"])

        listing = escrow.listing
        listing.status = "active"
        listing.sold_at = None
        listing.save(update_fields=["status", "sold_at"])

        logger.info("Trade cancelled by %s: escrow %s, refunded %s to buyer", side, escrow.id, escrow.amount)
        return escrow

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
