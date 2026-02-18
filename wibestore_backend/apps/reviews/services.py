"""
WibeStore Backend - Reviews Services
Business logic for reviews and rating recalculation.
"""

import logging
from decimal import Decimal

from django.db import models, transaction
from django.utils import timezone

from core.exceptions import BusinessLogicError

from .models import Review

logger = logging.getLogger("apps.reviews")


class ReviewService:
    """Service layer for review operations."""

    @staticmethod
    @transaction.atomic
    def create_review(
        reviewer,
        reviewee,
        listing,
        escrow,
        rating: int,
        comment: str = "",
    ) -> Review:
        """
        Create a review after a completed escrow transaction.
        Only the buyer can leave a review, and only once per transaction.
        """
        # Validate buyer
        if escrow.buyer != reviewer:
            raise BusinessLogicError("Only the buyer can leave a review.")

        # Validate escrow status
        if escrow.status != "confirmed":
            raise BusinessLogicError(
                "Review can only be left after a confirmed transaction."
            )

        # Check for existing review
        if Review.objects.filter(reviewer=reviewer, escrow=escrow).exists():
            raise BusinessLogicError(
                "You have already left a review for this transaction."
            )

        review = Review.objects.create(
            reviewer=reviewer,
            reviewee=reviewee,
            listing=listing,
            escrow=escrow,
            rating=rating,
            comment=comment,
            is_moderated=True,  # Auto-moderate for now
        )

        # Recalculate seller rating
        ReviewService.recalculate_user_rating(reviewee)

        logger.info(
            "Review created: %s reviewed %s (rating=%d)",
            reviewer.email,
            reviewee.email,
            rating,
        )
        return review

    @staticmethod
    def recalculate_user_rating(user) -> Decimal:
        """
        Recalculate a user's average rating from all their moderated reviews.
        Updates the user's rating field.
        """
        avg = Review.objects.filter(
            reviewee=user, is_moderated=True
        ).aggregate(avg_rating=models.Avg("rating"))["avg_rating"]

        new_rating = Decimal(str(round(avg, 2))) if avg else Decimal("5.0")
        user.rating = new_rating
        user.save(update_fields=["rating"])

        logger.info("Rating recalculated for %s: %s", user.email, new_rating)
        return new_rating

    @staticmethod
    def add_reply(review: Review, seller, response_text: str) -> Review:
        """Seller replies to a review."""
        if review.reviewee != seller:
            raise BusinessLogicError("Only the reviewed seller can reply.")

        if review.reply:
            raise BusinessLogicError("You have already replied to this review.")

        review.reply = response_text
        review.reply_at = timezone.now()
        review.save(update_fields=["reply", "reply_at"])

        logger.info("Seller replied to review: %s", review.id)
        return review
