"""
Reviews App - Services
"""

import logging

from django.db import transaction
from django.db.models import Avg
from django.utils import timezone

from core.exceptions import BusinessLogicError

from apps.reviews.models import Review

logger = logging.getLogger(__name__)


class ReviewService:
    """Service for review-related operations."""

    @staticmethod
    @transaction.atomic
    def create_review(
        reviewer,
        reviewee,
        listing,
        rating: int,
        comment: str = "",
        escrow=None,
    ) -> Review:
        """Create a new review for a completed transaction."""
        if escrow:
            existing = Review.objects.filter(
                reviewer=reviewer,
                escrow=escrow,
            ).first()
        else:
            existing = Review.objects.filter(
                reviewer=reviewer,
                reviewee=reviewee,
                listing=listing,
            ).first()

        if existing:
            raise BusinessLogicError("Review already exists for this transaction.")

        if rating < 1 or rating > 5:
            raise BusinessLogicError("Rating must be between 1 and 5.")

        review = Review.objects.create(
            reviewer=reviewer,
            reviewee=reviewee,
            listing=listing,
            escrow=escrow,
            rating=rating,
            comment=comment,
            is_moderated=True,
        )

        ReviewService.update_seller_rating(reviewee)

        logger.info("Review created: %s for seller %s", review.id, reviewee.id)
        return review

    @staticmethod
    def update_seller_rating(seller) -> None:
        """Recalculate seller's average rating."""
        avg = Review.objects.filter(
            reviewee=seller
        ).aggregate(Avg("rating"))["rating__avg"]

        if avg is not None:
            seller.rating = round(avg, 2)
            seller.save(update_fields=["rating"])
            logger.info("Seller %s rating updated to %s", seller.id, seller.rating)

    @staticmethod
    @transaction.atomic
    def add_reply(review: Review, seller, response_text: str) -> Review:
        """Add a seller reply to a review."""
        if review.reviewee != seller:
            raise BusinessLogicError("Only the reviewed seller can reply.")

        if review.reply:
            raise BusinessLogicError("Reply already exists for this review.")

        review.reply = response_text
        review.reply_at = timezone.now()
        review.save(update_fields=["reply", "reply_at"])

        logger.info("Reply added to review %s by seller %s", review.id, seller.id)
        return review

    @staticmethod
    @transaction.atomic
    def delete_review(review: Review) -> None:
        """Delete a review and recalculate seller rating."""
        reviewee = review.reviewee
        review.delete()
        ReviewService.update_seller_rating(reviewee)
        logger.info("Review deleted")
