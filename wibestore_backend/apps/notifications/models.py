"""
WibeStore Backend - Notifications Models
"""

from django.conf import settings
from django.db import models

from core.models import BaseModel


class NotificationType(BaseModel):
    """Types of notifications."""

    code = models.CharField(max_length=50, unique=True)
    name = models.CharField(max_length=100)
    template = models.TextField(blank=True, default="")
    icon = models.CharField(max_length=10, default="🔔")

    class Meta:
        db_table = "notification_types"
        verbose_name = "Notification Type"
        verbose_name_plural = "Notification Types"

    def __str__(self) -> str:
        return self.name


class Notification(BaseModel):
    """User notification."""

    user = models.ForeignKey(
        settings.AUTH_USER_MODEL,
        on_delete=models.CASCADE,
        related_name="notifications",
    )
    type = models.ForeignKey(
        NotificationType,
        on_delete=models.CASCADE,
        null=True,
        blank=True,
    )
    title = models.CharField(max_length=200)
    message = models.TextField()
    data = models.JSONField(default=dict, blank=True)
    is_read = models.BooleanField(default=False, db_index=True)
    read_at = models.DateTimeField(null=True, blank=True)
    link = models.URLField(blank=True, default="")

    class Meta:
        db_table = "notifications"
        ordering = ["-created_at"]
        verbose_name = "Notification"
        verbose_name_plural = "Notifications"
        indexes = [
            models.Index(fields=["user", "is_read"]),
        ]

    def __str__(self) -> str:
        return f"{self.user.email}: {self.title}"

    def mark_as_read(self) -> None:
        from django.utils import timezone
        if not self.is_read:
            self.is_read = True
            self.read_at = timezone.now()
            self.save(update_fields=["is_read", "read_at"])
