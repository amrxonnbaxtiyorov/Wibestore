"""
WibeStore Backend - Accounts Admin
"""

from decimal import Decimal

from django import forms
from django.contrib import admin, messages
from django.contrib.auth import get_user_model
from django.contrib.auth.admin import UserAdmin as BaseUserAdmin
from django.db.models import Sum

from apps.accounts.models import PasswordHistory, Referral, TelegramBotStat, TelegramRegistrationCode
from apps.subscriptions.models import UserSubscription

User = get_user_model()


class AddBalanceForm(forms.Form):
    """Tanlab olingan foydalanuvchilarga mablag' qo'shish formasi."""
    amount = forms.DecimalField(
        label="Qo'shilajak summa (UZS)",
        min_value=Decimal("1"),
        max_digits=15,
        decimal_places=2,
        widget=forms.NumberInput(attrs={"style": "width:200px", "placeholder": "Masalan: 50000"}),
    )


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
        "_balance_display",
        "created_at",
    ]
    list_filter = ["is_active", "is_staff", "is_verified", "created_at"]
    search_fields = ["email", "username", "full_name", "phone_number"]
    ordering = ["-created_at"]
    actions = ["grant_premium_action", "grant_pro_action", "add_balance_action", "reset_balance_action"]
    inlines = [UserSubscriptionInline]

    @admin.display(description="💰 Mablag' (UZS)", ordering="balance")
    def _balance_display(self, obj):
        val = obj.balance or 0
        color = "#22c55e" if val > 0 else "#6b7280"
        return f'<span style="color:{color};font-weight:600">{val:,.0f} UZS</span>'

    _balance_display.allow_tags = True  # Django 3.x compat

    @admin.action(description="💰 Tanlanganlarga mablag' qo'shish (50 000 UZS)")
    def add_balance_action(self, request, queryset):
        updated = 0
        for user in queryset:
            user.balance = (user.balance or 0) + Decimal("50000")
            user.save(update_fields=["balance"])
            updated += 1
        self.message_user(request, f"{updated} ta foydalanuvchiga 50 000 UZS qo'shildi.", level=messages.SUCCESS)

    @admin.action(description="🔄 Tanlanganlarga balansni nolga tushirish")
    def reset_balance_action(self, request, queryset):
        count = queryset.update(balance=Decimal("0"))
        self.message_user(request, f"{count} ta foydalanuvchi balansi nolga tushirildi.", level=messages.WARNING)

    def changelist_view(self, request, extra_context=None):
        extra_context = extra_context or {}
        totals = User.objects.aggregate(total_balance=Sum("balance"))
        extra_context["total_balance"] = totals.get("total_balance") or 0
        return super().changelist_view(request, extra_context=extra_context)

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


@admin.register(TelegramBotStat)
class TelegramBotStatAdmin(admin.ModelAdmin):
    list_display = [
        "telegram_id", "telegram_username", "total_commands",
        "last_command", "last_active_at", "created_at",
    ]
    list_filter = ["created_at"]
    search_fields = ["telegram_id", "telegram_username"]
    readonly_fields = ["telegram_id", "telegram_username", "created_at", "updated_at"]
    ordering = ["-created_at"]

    def total_commands(self, obj):
        return getattr(obj, "commands_count", "—")
    total_commands.short_description = "Buyruqlar"

    def last_command(self, obj):
        return getattr(obj, "last_command", "—")
    last_command.short_description = "Oxirgi buyruq"

    def last_active_at(self, obj):
        return getattr(obj, "last_active_at", None) or obj.updated_at
    last_active_at.short_description = "Oxirgi faollik"
