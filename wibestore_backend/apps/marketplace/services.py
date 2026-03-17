"""
WibeStore Backend - Marketplace Services
"""

import logging
from datetime import timedelta
from decimal import Decimal

from django.conf import settings
from django.db import transaction
from django.utils import timezone

from core.exceptions import BusinessLogicError
from core.utils import calculate_commission, calculate_seller_earnings

from .models import Listing

logger = logging.getLogger("apps.marketplace")


class ListingService:
    """Service layer for listing business logic."""

    @staticmethod
    @transaction.atomic
    def create_listing(*, seller, game, title, description, price, **kwargs) -> Listing:
        """Create a new listing (goes to pending moderation)."""
        listing = Listing.objects.create(
            seller=seller,
            game=game,
            title=title,
            description=description,
            price=price,
            status="pending",
            **kwargs,
        )
        logger.info("New listing created: %s by %s", listing.id, seller.email)

        # Notify admins
        from apps.marketplace.tasks import notify_admins_new_listing
        notify_admins_new_listing.delay(str(listing.id))

        return listing

    @staticmethod
    @transaction.atomic
    def approve_listing(listing: Listing, admin_user) -> Listing:
        """Approve a listing for publication."""
        if listing.status != "pending":
            raise BusinessLogicError("Only pending listings can be approved.")

        listing.status = "active"
        listing.moderated_by = admin_user
        listing.moderated_at = timezone.now()
        listing.approved_at = timezone.now()
        listing.save(update_fields=["status", "moderated_by", "moderated_at", "approved_at"])

        # Sotuvchiga bildirishnoma: akkaunt tasdiqlandi va sotuvda
        try:
            from apps.notifications.services import NotificationService

            NotificationService.create_notification(
                user=listing.seller,
                title="Akkaunt tasdiqlandi",
                message="Sizning akkauntingiz tasdiqlandi va sotuvda.",
                type_code="listing_approved",
                data={"listing_id": str(listing.id), "listing_title": listing.title},
            )
        except Exception as e:
            logger.warning("Failed to send listing_approved notification: %s", e)

        # Telegram orqali ham xabar yuborish
        try:
            from apps.payments.telegram_notify import notify_listing_approved
            notify_listing_approved(listing)
        except Exception as e:
            logger.warning("Failed to send Telegram listing_approved notification: %s", e)

        logger.info("Listing approved: %s by admin %s", listing.id, admin_user.email)
        return listing

    @staticmethod
    @transaction.atomic
    def reject_listing(listing: Listing, admin_user, reason: str) -> Listing:
        """Reject a listing with reason."""
        if listing.status != "pending":
            raise BusinessLogicError("Only pending listings can be rejected.")

        listing.status = "rejected"
        listing.moderated_by = admin_user
        listing.moderated_at = timezone.now()
        listing.rejected_at = timezone.now()
        listing.rejection_reason = reason
        listing.save(
            update_fields=[
                "status", "moderated_by", "moderated_at", "rejected_at", "rejection_reason"
            ]
        )

        # Sotuvchiga in-app va Telegram bildirishnoma
        try:
            from apps.notifications.services import NotificationService
            NotificationService.create_notification(
                user=listing.seller,
                title="Akkaunt rad etildi",
                message=f"Akkauntingiz rad etildi. Sabab: {reason}",
                type_code="listing_rejected",
                data={"listing_id": str(listing.id), "listing_title": listing.title, "reason": reason},
            )
        except Exception as e:
            logger.warning("Failed to send listing_rejected notification: %s", e)

        try:
            from apps.payments.telegram_notify import notify_listing_rejected
            notify_listing_rejected(listing, reason)
        except Exception as e:
            logger.warning("Failed to send Telegram listing_rejected notification: %s", e)

        logger.info("Listing rejected: %s by admin %s", listing.id, admin_user.email)
        return listing

    @staticmethod
    @transaction.atomic
    def mark_as_sold(listing: Listing) -> Listing:
        """Mark listing as sold."""
        listing.status = "sold"
        listing.sold_at = timezone.now()
        listing.save(update_fields=["status", "sold_at"])

        # Increment seller sales count
        seller = listing.seller
        seller.total_sales += 1
        seller.save(update_fields=["total_sales"])

        logger.info("Listing marked as sold: %s", listing.id)
        return listing
