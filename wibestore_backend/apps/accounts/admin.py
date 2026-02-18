"""
WibeStore Backend - Accounts Admin
"""

from django.contrib import admin
from django.contrib.auth import get_user_model
from django.contrib.auth.admin import UserAdmin as BaseUserAdmin

User = get_user_model()


@admin.register(User)
class UserAdmin(BaseUserAdmin):
    list_display = [
        "email",
        "username",
        "full_name",
        "is_active",
        "is_staff",
        "is_verified",
        "rating",
        "total_sales",
        "balance",
        "created_at",
    ]
    list_filter = ["is_active", "is_staff", "is_verified", "created_at"]
    search_fields = ["email", "username", "full_name", "phone_number"]
    ordering = ["-created_at"]

    fieldsets = (
        (None, {"fields": ("email", "password")}),
        (
            "Personal Info",
            {"fields": ("username", "full_name", "phone_number", "avatar", "language", "timezone")},
        ),
        (
            "Marketplace",
            {"fields": ("rating", "total_sales", "total_purchases", "balance")},
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
