"""
WibeStore Backend - Payments Admin
"""

from django.contrib import admin

from .models import EscrowTransaction, PaymentMethod, Transaction


@admin.register(PaymentMethod)
class PaymentMethodAdmin(admin.ModelAdmin):
    list_display = ["name", "code", "icon", "is_active", "created_at"]
    list_filter = ["is_active"]
    search_fields = ["name", "code"]
    list_editable = ["is_active"]


@admin.register(Transaction)
class TransactionAdmin(admin.ModelAdmin):
    list_display = [
        "id",
        "user",
        "type",
        "amount",
        "currency",
        "status",
        "payment_method",
        "created_at",
    ]
    list_filter = ["type", "status", "currency", "created_at"]
    search_fields = ["user__email", "provider_transaction_id", "description"]
    readonly_fields = ["id", "created_at", "updated_at"]
    raw_id_fields = ["user", "payment_method"]
    date_hierarchy = "created_at"


@admin.register(EscrowTransaction)
class EscrowTransactionAdmin(admin.ModelAdmin):
    list_display = [
        "id",
        "listing",
        "buyer",
        "seller",
        "amount",
        "commission_amount",
        "seller_earnings",
        "status",
        "created_at",
    ]
    list_filter = ["status", "created_at"]
    search_fields = [
        "buyer__email",
        "seller__email",
        "listing__title",
    ]
    readonly_fields = [
        "id",
        "commission_amount",
        "seller_earnings",
        "created_at",
        "updated_at",
    ]
    raw_id_fields = ["listing", "buyer", "seller", "dispute_resolved_by"]
    date_hierarchy = "created_at"
