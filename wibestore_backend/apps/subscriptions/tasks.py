"""
WibeStore Backend - Subscriptions Celery Tasks
"""

import logging
from datetime import timedelta

from celery import shared_task
from django.utils import timezone

logger = logging.getLogger("apps.subscriptions")


@shared_task(name="apps.subscriptions.tasks.check_subscription_expirations")
def check_subscription_expirations() -> int:
    """Check and expire subscriptions. Runs every hour."""
    from .models import UserSubscription

    expired = UserSubscription.objects.filter(
        status="active",
        end_date__lte=timezone.now(),
    )

    count = 0
    for sub in expired:
        if sub.auto_renew:
            # Try auto-renew
            try:
                from .services import SubscriptionService
                SubscriptionService.purchase_subscription(
                    sub.user, sub.plan.slug, "monthly"
                )
                logger.info("Auto-renewed subscription for: %s", sub.user.email)
            except Exception:
                sub.status = "expired"
                sub.save(update_fields=["status"])
                count += 1
        else:
            sub.status = "expired"
            sub.save(update_fields=["status"])
            count += 1

    logger.info("Expired %d subscriptions", count)
    return count


@shared_task(name="apps.subscriptions.tasks.send_subscription_expiring_soon_notifications")
def send_subscription_expiring_soon_notifications() -> int:
    """Notify users whose subscription expires in 3 days."""
    from django.conf import settings
    from .models import UserSubscription
    from apps.accounts.tasks import send_notification_email

    warning_date = timezone.now() + timedelta(
        days=settings.SUBSCRIPTION_EXPIRY_WARNING_DAYS
    )

    expiring = UserSubscription.objects.filter(
        status="active",
        end_date__date=warning_date.date(),
    ).select_related("user", "plan")

    count = 0
    for sub in expiring:
        send_notification_email.delay(
            str(sub.user.id),
            "Your subscription is expiring soon",
            f"Your {sub.plan.name} subscription expires on {sub.end_date.strftime('%Y-%m-%d')}.",
        )
        count += 1

    logger.info("Sent %d subscription expiry warnings", count)
    return count
