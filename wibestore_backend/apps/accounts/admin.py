"""
WibeStore Backend - Accounts Admin
"""

from django.contrib import admin, messages
from django.contrib.auth import get_user_model
from django.contrib.auth.admin import UserAdmin as BaseUserAdmin

from apps.accounts.models import PasswordHistory, Referral, TelegramRegistrationCode
from apps.subscriptions.models import UserSubscription

User = get_user_model()


class UserSubscriptionInline(admin.TabularInline):
    model = UserSubscription
    extra = 0
    readonly_fields = ["created_at", "updated_at"]
    fields = ["plan", "status", "start_date", "end_date", "auto_renew", "created_at"]
    raw_id_fields = ["plan"]
    ordering = ["-created_at"]
    verbose_name = "Obuna"
    verbose_name_plural = "Obunalar"


@admin.register(PasswordHistory)
class PasswordHistoryAdmin(admin.ModelAdmin):
    list_display = ["user", "created_at"]
    list_filter = ["created_at"]
    search_fields = ["user__email"]
    readonly_fields = ["password_hash", "created_at"]
    ordering = ["-created_at"]


@admin.register(User)
class UserAdmin(BaseUserAdmin):
    list_display = [
        "email",
        "username",
        "full_name",
        "phone_number",
        "telegram_id",
        "is_active",
        "is_staff",
        "is_verified",
        "_current_plan",
        "rating",
        "total_sales",
        "balance",
        "created_at",
    ]
    list_filter = ["is_active", "is_staff", "is_verified", "created_at"]
    search_fields = ["email", "username", "full_name", "phone_number"]
    ordering = ["-created_at"]
    actions = ["grant_premium_action", "grant_pro_action"]
    inlines = [UserSubscriptionInline]

    @admin.display(description="Tarif")
    def _current_plan(self, obj):
        from apps.subscriptions.services import SubscriptionService
        return SubscriptionService.get_user_plan(obj)

    @admin.action(description="Premium berish (1 oy)")
    def grant_premium_action(self, request, queryset):
        from apps.subscriptions.services import SubscriptionService
        from core.exceptions import BusinessLogicError
        ok, err = 0, 0
        for user in queryset:
            try:
                SubscriptionService.grant_subscription(user, "premium", months=1)
                ok += 1
            except BusinessLogicError as e:
                self.message_user(request, f"{user.email}: {e}", level=messages.ERROR)
                err += 1
        if ok:
            self.message_user(request, f"{ok} ta foydalanuvchiga Premium (1 oy) berildi.", level=messages.SUCCESS)
        if err:
            self.message_user(request, f"{err} ta foydalanuvchi uchun xato.", level=messages.ERROR)

    @admin.action(description="Pro berish (1 oy)")
    def grant_pro_action(self, request, queryset):
        from apps.subscriptions.services import SubscriptionService
        from core.exceptions import BusinessLogicError
        ok, err = 0, 0
        for user in queryset:
            try:
                SubscriptionService.grant_subscription(user, "pro", months=1)
                ok += 1
            except BusinessLogicError as e:
                self.message_user(request, f"{user.email}: {e}", level=messages.ERROR)
                err += 1
        if ok:
            self.message_user(request, f"{ok} ta foydalanuvchiga Pro (1 oy) berildi.", level=messages.SUCCESS)
        if err:
            self.message_user(request, f"{err} ta foydalanuvchi uchun xato.", level=messages.ERROR)

    fieldsets = (
        (None, {"fields": ("email", "password")}),
        (
            "Personal Info",
            {"fields": ("username", "full_name", "phone_number", "telegram_id", "avatar", "language", "timezone")},
        ),
        (
            "Marketplace",
            {"fields": ("rating", "total_sales", "total_purchases", "balance", "referral_code")},
        ),
        (
            "Permissions",
            {"fields": ("is_active", "is_staff", "is_superuser", "is_verified", "groups", "user_permissions")},
        ),
        ("Dates", {"fields": ("last_login", "created_at", "deleted_at")}),
    )

    readonly_fields = ["created_at", "last_login"]

    add_fieldsets = (
        (
            None,
            {
                "classes": ("wide",),
                "fields": ("email", "password1", "password2", "full_name"),
            },
        ),
    )


@admin.register(TelegramRegistrationCode)
class TelegramRegistrationCodeAdmin(admin.ModelAdmin):
    list_display = ["telegram_id", "phone_number", "full_name", "code", "is_used", "expires_at", "created_at"]
    list_filter = ["is_used", "created_at"]
    search_fields = ["phone_number", "code"]
    readonly_fields = ["created_at"]
    ordering = ["-created_at"]


@admin.register(Referral)
class ReferralAdmin(admin.ModelAdmin):
    list_display = ["referrer", "referred", "referral_code_used", "bonus_given_to_referrer", "created_at"]
    list_filter = ["bonus_given_to_referrer"]
    search_fields = ["referrer__email", "referred__email"]
