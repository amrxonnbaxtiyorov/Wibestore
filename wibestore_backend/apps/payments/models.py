"""
WibeStore Backend - Payments Models
PaymentMethod, Transaction, EscrowTransaction models.
"""

from django.conf import settings
from django.db import models

from core.constants import (
    ESCROW_STATUS_CHOICES,
    PAYMENT_METHOD_CHOICES,
    TRANSACTION_STATUS_CHOICES,
    TRANSACTION_TYPE_CHOICES,
)
from core.models import BaseModel


class PaymentMethod(BaseModel):
    """Available payment methods: Google Pay, Visa Card, Mastercard, Apple Pay."""

    name = models.CharField(max_length=50)
    code = models.CharField(max_length=20, unique=True, choices=PAYMENT_METHOD_CHOICES)
    icon = models.CharField(max_length=10, blank=True, default="💳")
    is_active = models.BooleanField(default=True)
    config = models.JSONField(default=dict, blank=True)

    class Meta:
        db_table = "payment_methods"
        ordering = ["name"]
        verbose_name = "Payment Method"
        verbose_name_plural = "Payment Methods"

    def __str__(self) -> str:
        return self.name


class Transaction(BaseModel):
    """Financial transaction record."""

    user = models.ForeignKey(
        settings.AUTH_USER_MODEL,
        on_delete=models.CASCADE,
        related_name="transactions",
    )
    amount = models.DecimalField(max_digits=15, decimal_places=2)
    currency = models.CharField(max_length=3, default="UZS")
    type = models.CharField(
        max_length=20, choices=TRANSACTION_TYPE_CHOICES, db_index=True
    )
    status = models.CharField(
        max_length=20, choices=TRANSACTION_STATUS_CHOICES, default="pending", db_index=True
    )
    payment_method = models.ForeignKey(
        PaymentMethod, on_delete=models.SET_NULL, null=True, blank=True
    )
    provider_transaction_id = models.CharField(
        max_length=255, blank=True, default=""
    )
    description = models.TextField(blank=True, default="")
    metadata = models.JSONField(default=dict, blank=True)
    processed_at = models.DateTimeField(null=True, blank=True)
    failed_at = models.DateTimeField(null=True, blank=True)

    class Meta:
        db_table = "transactions"
        ordering = ["-created_at"]
        verbose_name = "Transaction"
        verbose_name_plural = "Transactions"
        indexes = [
            models.Index(fields=["user", "type"]),
            models.Index(fields=["status", "created_at"]),
        ]

    def __str__(self) -> str:
        return f"{self.type} - {self.amount} {self.currency} ({self.status})"


class EscrowTransaction(BaseModel):
    """Escrow (safe deal) transaction between buyer and seller."""

    listing = models.ForeignKey(
        "marketplace.Listing",
        on_delete=models.CASCADE,
        related_name="escrow_transactions",
    )
    buyer = models.ForeignKey(
        settings.AUTH_USER_MODEL,
        on_delete=models.CASCADE,
        related_name="escrow_purchases",
    )
    seller = models.ForeignKey(
        settings.AUTH_USER_MODEL,
        on_delete=models.CASCADE,
        related_name="escrow_sales",
    )
    amount = models.DecimalField(max_digits=15, decimal_places=2)
    commission_amount = models.DecimalField(
        max_digits=15, decimal_places=2, default=0
    )
    seller_earnings = models.DecimalField(
        max_digits=15, decimal_places=2, default=0
    )
    status = models.CharField(
        max_length=20, choices=ESCROW_STATUS_CHOICES, default="pending_payment", db_index=True
    )
    buyer_confirmed_at = models.DateTimeField(null=True, blank=True)
    seller_paid_at = models.DateTimeField(null=True, blank=True)
    admin_released_at = models.DateTimeField(null=True, blank=True)
    dispute_reason = models.TextField(blank=True, default="")
    dispute_resolved_by = models.ForeignKey(
        settings.AUTH_USER_MODEL,
        on_delete=models.SET_NULL,
        null=True,
        blank=True,
        related_name="resolved_disputes",
    )
    dispute_resolution = models.TextField(blank=True, default="")

    class Meta:
        db_table = "escrow_transactions"
        ordering = ["-created_at"]
        verbose_name = "Escrow Transaction"
        verbose_name_plural = "Escrow Transactions"

    def __str__(self) -> str:
        return f"Escrow: {self.listing.title} ({self.status})"
