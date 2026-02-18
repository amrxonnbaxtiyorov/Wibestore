"""
WibeStore Backend - Subscriptions Models
"""

from django.conf import settings
from django.db import models

from core.constants import SUBSCRIPTION_STATUS_CHOICES
from core.models import BaseModel


class SubscriptionPlan(BaseModel):
    """Subscription plan (Free, Premium, Pro)."""

    name = models.CharField(max_length=50)
    slug = models.SlugField(unique=True)
    price_monthly = models.DecimalField(max_digits=15, decimal_places=2, default=0)
    price_yearly = models.DecimalField(max_digits=15, decimal_places=2, default=0)
    commission_rate = models.DecimalField(max_digits=5, decimal_places=2, default=0.10)
    features = models.JSONField(default=list, blank=True)
    is_premium = models.BooleanField(default=False)
    is_pro = models.BooleanField(default=False)
    sort_order = models.PositiveIntegerField(default=0)
    is_active = models.BooleanField(default=True)

    class Meta:
        db_table = "subscription_plans"
        ordering = ["sort_order"]
        verbose_name = "Subscription Plan"
        verbose_name_plural = "Subscription Plans"

    def __str__(self) -> str:
        return self.name


class UserSubscription(BaseModel):
    """User's active subscription."""

    user = models.ForeignKey(
        settings.AUTH_USER_MODEL,
        on_delete=models.CASCADE,
        related_name="subscriptions",
    )
    plan = models.ForeignKey(
        SubscriptionPlan,
        on_delete=models.CASCADE,
        related_name="user_subscriptions",
    )
    status = models.CharField(
        max_length=20, choices=SUBSCRIPTION_STATUS_CHOICES, default="active", db_index=True
    )
    start_date = models.DateTimeField()
    end_date = models.DateTimeField()
    auto_renew = models.BooleanField(default=True)
    cancelled_at = models.DateTimeField(null=True, blank=True)
    cancel_reason = models.TextField(blank=True, default="")
    payment_history = models.JSONField(default=list, blank=True)

    class Meta:
        db_table = "user_subscriptions"
        ordering = ["-created_at"]
        verbose_name = "User Subscription"
        verbose_name_plural = "User Subscriptions"

    def __str__(self) -> str:
        return f"{self.user.email} - {self.plan.name} ({self.status})"

    @property
    def is_expired(self) -> bool:
        from django.utils import timezone
        return self.end_date < timezone.now()
