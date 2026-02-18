"""
WibeStore Backend - Celery Configuration
"""

import os

from celery import Celery
from celery.schedules import crontab

os.environ.setdefault("DJANGO_SETTINGS_MODULE", "config.settings.development")

app = Celery("wibestore")
app.config_from_object("django.conf:settings", namespace="CELERY")
app.autodiscover_tasks()

# ============================================================
# PERIODIC TASKS (Celery Beat)
# ============================================================
app.conf.beat_schedule = {
    # Check subscription expirations every hour
    "check-subscription-expirations": {
        "task": "apps.subscriptions.tasks.check_subscription_expirations",
        "schedule": crontab(minute=0),  # Every hour
    },
    # Send subscription expiring soon notifications (daily at 10:00)
    "send-subscription-expiring-soon": {
        "task": "apps.subscriptions.tasks.send_subscription_expiring_soon_notifications",
        "schedule": crontab(hour=10, minute=0),
    },
    # Cleanup old notifications (daily at 3:00 AM)
    "cleanup-old-notifications": {
        "task": "apps.notifications.tasks.cleanup_old_notifications",
        "schedule": crontab(hour=3, minute=0),
    },
    # Cleanup unverified users (daily at 4:00 AM)
    "cleanup-unverified-users": {
        "task": "apps.accounts.tasks.cleanup_unverified_users",
        "schedule": crontab(hour=4, minute=0),
    },
    # Archive old listings (daily at 5:00 AM)
    "archive-old-listings": {
        "task": "apps.marketplace.tasks.archive_old_listings",
        "schedule": crontab(hour=5, minute=0),
    },
    # Calculate daily statistics (daily at midnight)
    "calculate-daily-statistics": {
        "task": "apps.admin_panel.tasks.calculate_daily_statistics",
        "schedule": crontab(hour=0, minute=0),
    },
}
