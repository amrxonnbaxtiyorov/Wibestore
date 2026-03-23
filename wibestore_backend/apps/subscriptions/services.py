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
    def _sync_seller_listings_premium(user) -> None:
        """
        Listing.is_premium must follow seller's current plan.
        Premium & Pro sellers' listings are marked premium (pending+active).
        """
        try:
            from apps.marketplace.models import Listing
            plan = SubscriptionService.get_user_plan(user)
            should_be_premium = plan in ("premium", "pro")
            Listing.objects.filter(
                seller=user,
                status__in=["pending", "active"],
                deleted_at__isnull=True,
            ).update(is_premium=should_be_premium)
        except Exception as e:
            # Never block subscription flow due to marketplace sync
            logger.warning("Failed to sync seller listings premium: %s", e)

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

        # First month 50% discount: only for first-ever paid subscription (premium/pro)
        if plan_slug in ("premium", "pro") and billing_period == "monthly":
            has_ever_paid = UserSubscription.objects.filter(
                user=user,
                plan__slug__in=["premium", "pro"],
            ).exists()
            if not has_ever_paid:
                price = (price * Decimal("0.5")).quantize(Decimal("0.01"))

        # Check existing active subscription for upgrade/downgrade logic
        existing = UserSubscription.objects.filter(
            user=user, status="active", end_date__gt=timezone.now()
        ).select_related("plan").first()
        if existing:
            current_slug = existing.plan.slug
            # Block re-purchase of same plan before expiry
            if current_slug == plan_slug:
                days_left = max(0, (existing.end_date - timezone.now()).days)
                raise BusinessLogicError(
                    f"Sizda allaqachon {plan_slug} tarifi bor. "
                    f"Muddati: {existing.end_date.strftime('%d.%m.%Y')} ({days_left} kun qoldi)."
                )
            # Block Pro → Premium downgrade
            if current_slug == "pro" and plan_slug == "premium":
                raise BusinessLogicError(
                    "Pro tarifdan Premium ga tushib bo'lmaydi. "
                    "Faqat yangilash (Premium → Pro) mumkin."
                )
            # Premium → Pro upgrade is allowed; existing will be cancelled below

        if user.balance < price:
            raise InsufficientFundsError("Insufficient balance for subscription.")

        # Cancel existing subscription (handles upgrade case)
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
        SubscriptionService._sync_seller_listings_premium(user)
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
        SubscriptionService._sync_seller_listings_premium(user)
        return subscription

    @staticmethod
    @transaction.atomic
    def grant_subscription(user, plan_slug: str, months: int = 1) -> UserSubscription:
        """
        Admin tomonidan foydalanuvchiga tarif berish (to'lovsiz).
        Mavjud aktiv obunani bekor qiladi va yangi yaratadi.
        """
        try:
            plan = SubscriptionPlan.objects.get(slug=plan_slug, is_active=True)
        except SubscriptionPlan.DoesNotExist:
            raise BusinessLogicError(f"Tarif topilmadi: {plan_slug}")

        now = timezone.now()
        duration = timedelta(days=30 * months)

        UserSubscription.objects.filter(user=user, status="active").update(
            status="cancelled", cancelled_at=now
        )

        subscription = UserSubscription.objects.create(
            user=user,
            plan=plan,
            status="active",
            start_date=now,
            end_date=now + duration,
            auto_renew=False,
            payment_history=[{
                "source": "admin_grant",
                "months": months,
                "date": now.isoformat(),
            }],
        )
        logger.info("Admin granted %s to %s for %s month(s)", plan_slug, user.email, months)
        SubscriptionService._sync_seller_listings_premium(user)
        return subscription

    @staticmethod
    def check_listing_limit(user) -> dict:
        """
        Check if user can create a new listing based on their plan's monthly limit.
        Returns dict with 'allowed', 'used', 'limit' keys.
        """
        from apps.marketplace.models import Listing

        plan_slug = SubscriptionService.get_user_plan(user)
        try:
            plan = SubscriptionPlan.objects.get(slug=plan_slug, is_active=True)
            limit = plan.monthly_listing_limit
        except SubscriptionPlan.DoesNotExist:
            limit = 5  # default free limit

        # Count listings created this month
        now = timezone.now()
        month_start = now.replace(day=1, hour=0, minute=0, second=0, microsecond=0)
        used = Listing.objects.filter(
            seller=user,
            created_at__gte=month_start,
            deleted_at__isnull=True,
        ).count()

        return {
            "allowed": used < limit,
            "used": used,
            "limit": limit,
            "plan": plan_slug,
        }

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
