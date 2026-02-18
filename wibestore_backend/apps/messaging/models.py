"""
WibeStore Backend - Messaging Models
"""

from django.conf import settings
from django.db import models

from core.constants import MESSAGE_TYPE_CHOICES
from core.models import BaseModel


class ChatRoom(BaseModel):
    """Chat room between two users."""

    participants = models.ManyToManyField(
        settings.AUTH_USER_MODEL, related_name="chat_rooms"
    )
    listing = models.ForeignKey(
        "marketplace.Listing",
        on_delete=models.SET_NULL,
        null=True,
        blank=True,
        related_name="chat_rooms",
    )
    last_message = models.TextField(blank=True, default="")
    last_message_at = models.DateTimeField(null=True, blank=True)
    is_active = models.BooleanField(default=True)

    class Meta:
        db_table = "chat_rooms"
        ordering = ["-last_message_at"]
        verbose_name = "Chat Room"
        verbose_name_plural = "Chat Rooms"

    def __str__(self) -> str:
        return f"ChatRoom {self.id}"


class Message(BaseModel):
    """Chat message."""

    room = models.ForeignKey(ChatRoom, on_delete=models.CASCADE, related_name="messages")
    sender = models.ForeignKey(
        settings.AUTH_USER_MODEL,
        on_delete=models.CASCADE,
        related_name="sent_messages",
    )
    content = models.TextField()
    message_type = models.CharField(
        max_length=20, choices=MESSAGE_TYPE_CHOICES, default="text"
    )
    attachment = models.FileField(upload_to="chat_attachments/%Y/%m/", blank=True, null=True)
    is_read = models.BooleanField(default=False)
    read_at = models.DateTimeField(null=True, blank=True)

    class Meta:
        db_table = "messages"
        ordering = ["created_at"]
        verbose_name = "Message"
        verbose_name_plural = "Messages"

    def __str__(self) -> str:
        return f"{self.sender.email}: {self.content[:50]}"

    def mark_as_read(self) -> None:
        from django.utils import timezone
        if not self.is_read:
            self.is_read = True
            self.read_at = timezone.now()
            self.save(update_fields=["is_read", "read_at"])
