"""
WibeStore Backend - Subscriptions Services
"""

import logging
from datetime import timedelta
from decimal import Decimal

from django.db import transaction
from django.utils import timezone

from core.exceptions import BusinessLogicError, InsufficientFundsError

from .models import SubscriptionPlan, UserSubscription

logger = logging.getLogger("apps.subscriptions")


class SubscriptionService:
    """Service layer for subscription operations."""

    @staticmethod
    @transaction.atomic
    def purchase_subscription(
        user, plan_slug: str, billing_period: str = "monthly"
    ) -> UserSubscription:
        """Purchase or upgrade a subscription."""
        try:
            plan = SubscriptionPlan.objects.get(slug=plan_slug, is_active=True)
        except SubscriptionPlan.DoesNotExist:
            raise BusinessLogicError("Subscription plan not found.")

        # Calculate price
        price = plan.price_monthly if billing_period == "monthly" else plan.price_yearly

        if user.balance < price:
            raise InsufficientFundsError("Insufficient balance for subscription.")

        # Cancel existing subscription
        UserSubscription.objects.filter(user=user, status="active").update(
            status="cancelled", cancelled_at=timezone.now()
        )

        # Deduct balance
        user.balance -= price
        user.save(update_fields=["balance"])

        # Create subscription
        now = timezone.now()
        duration = timedelta(days=30) if billing_period == "monthly" else timedelta(days=365)

        subscription = UserSubscription.objects.create(
            user=user,
            plan=plan,
            status="active",
            start_date=now,
            end_date=now + duration,
            auto_renew=True,
            payment_history=[{
                "amount": str(price),
                "date": now.isoformat(),
                "period": billing_period,
            }],
        )

        logger.info(
            "Subscription purchased: %s -> %s (%s)",
            user.email, plan.name, billing_period,
        )
        return subscription

    @staticmethod
    @transaction.atomic
    def cancel_subscription(user, reason: str = "") -> UserSubscription:
        """Cancel user's active subscription."""
        try:
            subscription = UserSubscription.objects.get(user=user, status="active")
        except UserSubscription.DoesNotExist:
            raise BusinessLogicError("No active subscription found.")

        subscription.status = "cancelled"
        subscription.auto_renew = False
        subscription.cancelled_at = timezone.now()
        subscription.cancel_reason = reason
        subscription.save(
            update_fields=["status", "auto_renew", "cancelled_at", "cancel_reason"]
        )

        logger.info("Subscription cancelled for: %s", user.email)
        return subscription

    @staticmethod
    def get_user_plan(user) -> str:
        """Get user's current plan type."""
        subscription = UserSubscription.objects.filter(
            user=user, status="active"
        ).select_related("plan").first()

        if not subscription or subscription.is_expired:
            return "free"
        if subscription.plan.is_pro:
            return "pro"
        if subscription.plan.is_premium:
            return "premium"
        return "free"
