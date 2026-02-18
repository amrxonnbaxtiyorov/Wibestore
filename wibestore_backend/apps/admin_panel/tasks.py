"""
WibeStore Backend - Admin Panel Celery Tasks
"""

import logging
from datetime import timedelta

from celery import shared_task
from django.utils import timezone

logger = logging.getLogger("apps.admin_panel")


@shared_task(name="apps.admin_panel.tasks.calculate_daily_statistics")
def calculate_daily_statistics() -> dict:
    """
    Calculate and log daily platform statistics.
    Runs daily at midnight via Celery Beat.
    """
    from django.contrib.auth import get_user_model
    from django.db.models import Count, Sum

    from apps.marketplace.models import Listing
    from apps.payments.models import EscrowTransaction, Transaction

    User = get_user_model()
    today = timezone.now().date()
    yesterday = today - timedelta(days=1)

    stats = {
        "date": str(yesterday),
        "new_users": User.objects.filter(
            created_at__date=yesterday
        ).count(),
        "new_listings": Listing.objects.filter(
            created_at__date=yesterday
        ).count(),
        "listings_sold": Listing.objects.filter(
            sold_at__date=yesterday
        ).count(),
        "total_transactions": Transaction.objects.filter(
            created_at__date=yesterday, status="completed"
        ).count(),
        "transaction_volume": float(
            Transaction.objects.filter(
                created_at__date=yesterday, status="completed"
            ).aggregate(total=Sum("amount"))["total"] or 0
        ),
        "escrow_completed": EscrowTransaction.objects.filter(
            seller_paid_at__date=yesterday, status="confirmed"
        ).count(),
        "commission_earned": float(
            EscrowTransaction.objects.filter(
                seller_paid_at__date=yesterday, status="confirmed"
            ).aggregate(total=Sum("commission_amount"))["total"] or 0
        ),
    }

    logger.info("Daily statistics for %s: %s", yesterday, stats)
    return stats
