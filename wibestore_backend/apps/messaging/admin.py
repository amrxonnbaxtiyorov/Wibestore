"""
WibeStore Backend - Messaging Admin
"""

from django.contrib import admin

from .models import ChatRoom, Message


@admin.register(ChatRoom)
class ChatRoomAdmin(admin.ModelAdmin):
    list_display = [
        "id",
        "listing",
        "last_message_at",
        "is_active",
        "created_at",
    ]
    list_filter = ["is_active", "created_at"]
    search_fields = ["participants__email"]
    filter_horizontal = ["participants"]
    readonly_fields = ["id", "created_at", "updated_at"]
    date_hierarchy = "created_at"


@admin.register(Message)
class MessageAdmin(admin.ModelAdmin):
    list_display = [
        "id",
        "room",
        "sender",
        "message_type",
        "short_content",
        "is_read",
        "created_at",
    ]
    list_filter = ["message_type", "is_read", "created_at"]
    search_fields = ["sender__email", "content"]
    readonly_fields = ["id", "created_at"]
    raw_id_fields = ["room", "sender"]
    date_hierarchy = "created_at"

    @admin.display(description="Content")
    def short_content(self, obj):
        return obj.content[:80] + "..." if len(obj.content) > 80 else obj.content
