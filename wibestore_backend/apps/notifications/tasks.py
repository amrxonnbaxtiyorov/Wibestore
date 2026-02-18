"""
WibeStore Backend - Notifications Celery Tasks
"""

import logging
from datetime import timedelta

from celery import shared_task
from django.utils import timezone

logger = logging.getLogger("apps.notifications")


@shared_task(name="apps.notifications.tasks.cleanup_old_notifications")
def cleanup_old_notifications(days: int = 90) -> int:
    """
    Remove read notifications older than `days` days.
    Runs daily at 3:00 AM via Celery Beat.
    """
    from .models import Notification

    cutoff = timezone.now() - timedelta(days=days)
    deleted, _ = Notification.objects.filter(
        is_read=True,
        created_at__lt=cutoff,
    ).delete()

    logger.info("Cleaned up %d old notifications", deleted)
    return deleted


@shared_task(name="apps.notifications.tasks.send_bulk_notification")
def send_bulk_notification(
    user_ids: list[str],
    title: str,
    message: str,
    type_code: str | None = None,
    data: dict | None = None,
) -> int:
    """Send a notification to multiple users."""
    from .services import NotificationService

    count = 0
    for user_id in user_ids:
        try:
            from django.contrib.auth import get_user_model

            User = get_user_model()
            user = User.objects.get(id=user_id, is_active=True)
            NotificationService.create_notification(
                user=user,
                title=title,
                message=message,
                type_code=type_code,
                data=data,
            )
            count += 1
        except Exception as e:
            logger.error("Failed to notify user %s: %s", user_id, e)

    logger.info("Sent %d bulk notifications", count)
    return count
