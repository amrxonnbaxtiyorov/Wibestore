"""
WibeStore Backend - Reports Models
"""

from django.conf import settings
from django.db import models

from core.constants import REPORT_REASON_CHOICES
from core.models import BaseModel


class Report(BaseModel):
    """User report / complaint."""

    reporter = models.ForeignKey(
        settings.AUTH_USER_MODEL,
        on_delete=models.CASCADE,
        related_name="filed_reports",
    )
    reported_user = models.ForeignKey(
        settings.AUTH_USER_MODEL,
        on_delete=models.CASCADE,
        null=True,
        blank=True,
        related_name="received_reports",
    )
    reported_listing = models.ForeignKey(
        "marketplace.Listing",
        on_delete=models.CASCADE,
        null=True,
        blank=True,
        related_name="reports",
    )
    reason = models.CharField(max_length=30, choices=REPORT_REASON_CHOICES)
    description = models.TextField()
    evidence = models.JSONField(default=list, blank=True)
    status = models.CharField(
        max_length=20,
        choices=[
            ("pending", "Pending"),
            ("reviewing", "Reviewing"),
            ("resolved", "Resolved"),
            ("dismissed", "Dismissed"),
        ],
        default="pending",
        db_index=True,
    )
    resolved_by = models.ForeignKey(
        settings.AUTH_USER_MODEL,
        on_delete=models.SET_NULL,
        null=True,
        blank=True,
        related_name="resolved_reports",
    )
    resolution_note = models.TextField(blank=True, default="")
    resolved_at = models.DateTimeField(null=True, blank=True)

    class Meta:
        db_table = "reports"
        ordering = ["-created_at"]
        verbose_name = "Report"
        verbose_name_plural = "Reports"

    def __str__(self) -> str:
        return f"Report by {self.reporter.email} ({self.reason})"


class SuspiciousActivity(models.Model):
    """Log suspicious activity for admin review (fraud detection)."""

    activity_type = models.CharField(
        max_length=30,
        choices=[
            ("many_purchases_same_ip", "Many purchases from same IP"),
            ("new_user_high_value", "New user high-value purchase"),
            ("many_accounts_same_ip", "Many accounts from same IP"),
            ("other", "Other"),
        ],
        db_index=True,
    )
    user = models.ForeignKey(
        settings.AUTH_USER_MODEL,
        on_delete=models.CASCADE,
        null=True,
        blank=True,
        related_name="suspicious_activities",
    )
    ip_address = models.GenericIPAddressField(null=True, blank=True)
    details = models.JSONField(default=dict, blank=True)
    resolved = models.BooleanField(default=False, db_index=True)
    resolved_by = models.ForeignKey(
        settings.AUTH_USER_MODEL,
        on_delete=models.SET_NULL,
        null=True,
        blank=True,
        related_name="resolved_suspicious",
    )
    resolved_at = models.DateTimeField(null=True, blank=True)
    created_at = models.DateTimeField(auto_now_add=True)

    class Meta:
        db_table = "suspicious_activities"
        ordering = ["-created_at"]
        verbose_name = "Suspicious Activity"
        verbose_name_plural = "Suspicious Activities"

    def __str__(self) -> str:
        return f"{self.activity_type} ({self.created_at})"
