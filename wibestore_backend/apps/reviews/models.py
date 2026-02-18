"""
WibeStore Backend - Reviews Models
"""

from django.conf import settings
from django.db import models

from core.models import BaseModel


class Review(BaseModel):
    """User review / rating."""

    reviewer = models.ForeignKey(
        settings.AUTH_USER_MODEL,
        on_delete=models.CASCADE,
        related_name="given_reviews",
    )
    reviewee = models.ForeignKey(
        settings.AUTH_USER_MODEL,
        on_delete=models.CASCADE,
        related_name="received_reviews",
    )
    listing = models.ForeignKey(
        "marketplace.Listing",
        on_delete=models.CASCADE,
        related_name="reviews",
        null=True,
        blank=True,
    )
    escrow = models.ForeignKey(
        "payments.EscrowTransaction",
        on_delete=models.CASCADE,
        related_name="reviews",
        null=True,
        blank=True,
    )
    rating = models.PositiveIntegerField(
        help_text="Rating 1-5"
    )
    comment = models.TextField(blank=True, default="")
    is_moderated = models.BooleanField(default=False)
    moderated_at = models.DateTimeField(null=True, blank=True)
    reply = models.TextField(blank=True, default="")
    reply_at = models.DateTimeField(null=True, blank=True)

    class Meta:
        db_table = "reviews"
        ordering = ["-created_at"]
        verbose_name = "Review"
        verbose_name_plural = "Reviews"
        unique_together = ["reviewer", "escrow"]

    def __str__(self) -> str:
        return f"Review: {self.reviewer.email} → {self.reviewee.email} ({self.rating}★)"
