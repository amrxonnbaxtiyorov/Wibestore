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

from .models import EscrowTransaction, PaymentMethod, Transaction

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

        logger.info(
            "Escrow created: %s (buyer: %s, seller: %s, amount: %s)",
            escrow.id, buyer.email, listing.seller.email, listing.price,
        )

        # Schedule auto-release
        from .tasks import release_escrow_payment
        release_escrow_payment.apply_async(
            args=[str(escrow.id)],
            countdown=settings.ESCROW_AUTO_RELEASE_HOURS * 3600,
        )

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
        """
        if escrow.status not in ("paid", "delivered"):
            raise BusinessLogicError("Escrow cannot be released.")

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
        return escrow

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

        logger.info("Escrow refunded: %s by admin %s", escrow.id, admin_user.email)
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
