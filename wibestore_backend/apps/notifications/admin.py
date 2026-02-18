"""
WibeStore Backend - Notifications Admin
"""

from django.contrib import admin

from .models import Notification, NotificationType


@admin.register(NotificationType)
class NotificationTypeAdmin(admin.ModelAdmin):
    list_display = ["name", "code", "icon"]
    search_fields = ["name", "code"]


@admin.register(Notification)
class NotificationAdmin(admin.ModelAdmin):
    list_display = [
        "user",
        "type",
        "title",
        "is_read",
        "created_at",
    ]
    list_filter = ["is_read", "type", "created_at"]
    search_fields = ["user__email", "title", "message"]
    readonly_fields = ["id", "created_at"]
    raw_id_fields = ["user", "type"]
    date_hierarchy = "created_at"
