"""
WibeStore Backend - Subscriptions Admin
"""

from django.contrib import admin

from .models import SubscriptionPlan, UserSubscription


@admin.register(SubscriptionPlan)
class SubscriptionPlanAdmin(admin.ModelAdmin):
    list_display = [
        "name",
        "slug",
        "price_monthly",
        "price_yearly",
        "commission_rate",
        "is_premium",
        "is_pro",
        "is_active",
        "sort_order",
    ]
    list_filter = ["is_active", "is_premium", "is_pro"]
    search_fields = ["name", "slug"]
    list_editable = ["is_active", "sort_order"]
    prepopulated_fields = {"slug": ("name",)}


@admin.register(UserSubscription)
class UserSubscriptionAdmin(admin.ModelAdmin):
    list_display = [
        "user",
        "plan",
        "status",
        "start_date",
        "end_date",
        "auto_renew",
        "created_at",
    ]
    list_filter = ["status", "auto_renew", "plan"]
    search_fields = ["user__email", "user__username"]
    readonly_fields = ["created_at", "updated_at"]
    raw_id_fields = ["user", "plan"]
    date_hierarchy = "created_at"
