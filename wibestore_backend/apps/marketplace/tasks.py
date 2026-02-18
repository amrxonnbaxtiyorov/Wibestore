"""
WibeStore Backend - Marketplace Celery Tasks
"""

import logging
from datetime import timedelta

from celery import shared_task
from django.utils import timezone

logger = logging.getLogger("apps.marketplace")


@shared_task(name="apps.marketplace.tasks.notify_admins_new_listing")
def notify_admins_new_listing(listing_id: str) -> None:
    """Notify admins about new listing pending moderation."""
    from apps.marketplace.models import Listing
    from apps.notifications.services import NotificationService

    try:
        listing = Listing.objects.select_related("seller", "game").get(id=listing_id)
        NotificationService.notify_admins(
            title="New listing needs moderation",
            message=f"{listing.seller.display_name} posted '{listing.title}' in {listing.game.name}",
            data={"listing_id": str(listing.id)},
        )
        logger.info("Admins notified about listing: %s", listing_id)
    except Exception as e:
        logger.error("Failed to notify admins about listing %s: %s", listing_id, e)


@shared_task(name="apps.marketplace.tasks.auto_approve_if_timeout")
def auto_approve_if_timeout(listing_id: str) -> None:
    """Auto-approve listing if admin hasn't reviewed within 48 hours."""
    from apps.marketplace.models import Listing

    try:
        listing = Listing.objects.get(id=listing_id)
        if listing.status == "pending":
            cutoff = listing.created_at + timedelta(hours=48)
            if timezone.now() >= cutoff:
                listing.status = "active"
                listing.approved_at = timezone.now()
                listing.save(update_fields=["status", "approved_at"])
                logger.info("Listing auto-approved: %s", listing_id)
    except Exception as e:
        logger.error("Failed to auto-approve listing %s: %s", listing_id, e)


@shared_task(name="apps.marketplace.tasks.archive_old_listings")
def archive_old_listings() -> int:
    """Archive listings older than 180 days without sales."""
    from apps.marketplace.models import Listing

    cutoff = timezone.now() - timedelta(days=180)
    old_listings = Listing.objects.filter(
        status="active",
        created_at__lt=cutoff,
        sold_at__isnull=True,
    )
    count = old_listings.update(status="archived")
    logger.info("Archived %d old listings", count)
    return count
