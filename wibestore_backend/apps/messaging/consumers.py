"""
WibeStore Backend - Messaging WebSocket Consumer
"""

import json
import logging

from channels.db import database_sync_to_async
from channels.generic.websocket import AsyncJsonWebSocketConsumer

logger = logging.getLogger("apps.messaging")


class ChatConsumer(AsyncJsonWebSocketConsumer):
    """WebSocket consumer for real-time chat."""

    async def connect(self):
        self.room_id = self.scope["url_route"]["kwargs"]["room_id"]
        self.room_group_name = f"chat_{self.room_id}"
        self.user = self.scope.get("user")

        if not self.user or self.user.is_anonymous:
            await self.close()
            return

        # Verify user is participant
        is_participant = await self.check_participation()
        if not is_participant:
            await self.close()
            return

        await self.channel_layer.group_add(self.room_group_name, self.channel_name)
        await self.accept()
        logger.info("WebSocket connected: user=%s, room=%s", self.user.email, self.room_id)

    async def disconnect(self, close_code):
        await self.channel_layer.group_discard(self.room_group_name, self.channel_name)
        logger.info("WebSocket disconnected: room=%s", self.room_id)

    async def receive_json(self, content):
        message_type = content.get("type", "chat.message")
        message_content = content.get("content", "")

        # Heartbeat: client sends {"type": "ping"} → server responds {"type": "pong"}
        if message_type == "ping":
            await self.send_json({"type": "pong"})
            return

        if message_type == "chat.message" and message_content:
            # Save message to database
            message_data = await self.save_message(message_content)

            # Broadcast to room
            await self.channel_layer.group_send(
                self.room_group_name,
                {
                    "type": "chat_message",
                    "message": message_data,
                },
            )

            # Send Telegram notification to recipients (BLOCK 3)
            await self.notify_recipient_telegram(message_data)

            # If admin just wrote — check if we should auto-send credentials
            creds_msg = await self.maybe_send_credentials_ws()
            if creds_msg:
                await self.channel_layer.group_send(
                    self.room_group_name,
                    {
                        "type": "chat_message",
                        "message": creds_msg,
                    },
                )

        elif message_type == "chat.typing":
            await self.channel_layer.group_send(
                self.room_group_name,
                {
                    "type": "chat_typing",
                    "user_id": str(self.user.id),
                    "username": self.user.display_name,
                },
            )

        elif message_type == "chat.read":
            message_id = content.get("message_id")
            if message_id:
                await self.mark_message_read(message_id)

    async def chat_message(self, event):
        await self.send_json(event["message"])

    async def chat_typing(self, event):
        # Don't send typing indicator to the sender
        if event["user_id"] != str(self.user.id):
            await self.send_json(
                {
                    "type": "typing",
                    "user_id": event["user_id"],
                    "username": event["username"],
                }
            )

    @database_sync_to_async
    def check_participation(self) -> bool:
        from .models import ChatRoom
        return ChatRoom.objects.filter(
            id=self.room_id, participants=self.user
        ).exists()

    @database_sync_to_async
    def save_message(self, content: str) -> dict:
        from django.utils import timezone
        from .models import ChatRoom, Message

        room = ChatRoom.objects.get(id=self.room_id)
        message = Message.objects.create(
            room=room, sender=self.user, content=content
        )
        room.last_message = content[:200]
        room.last_message_at = timezone.now()
        room.save(update_fields=["last_message", "last_message_at"])

        return {
            "type": "message",
            "id": str(message.id),
            "sender": {
                "id": str(self.user.id),
                "username": self.user.username,
                "display_name": self.user.display_name,
            },
            "content": message.content,
            "message_type": message.message_type,
            "created_at": message.created_at.isoformat(),
            "is_read": message.is_read,
        }

    @database_sync_to_async
    def maybe_send_credentials_ws(self) -> dict | None:
        """
        If admin wrote to an order chat with unpaid credentials, auto-send them.
        Returns serialised message dict if credentials were sent, else None.
        """
        if not self.user.is_staff:
            return None

        from .models import ChatRoom
        try:
            room = ChatRoom.objects.get(id=self.room_id)
        except ChatRoom.DoesNotExist:
            return None

        if room.credentials_sent or not room.listing_id:
            return None

        from apps.payments.models import EscrowTransaction
        escrow = EscrowTransaction.objects.filter(
            listing_id=room.listing_id,
            status="paid",
        ).first()
        if not escrow:
            return None

        from .services import send_credentials_to_chat
        sent = send_credentials_to_chat(room, escrow, sent_by_user=self.user)
        if not sent:
            return None

        # Notify via Telegram
        try:
            from apps.payments.telegram_notify import notify_credentials_sent
            notify_credentials_sent(escrow)
        except Exception as tg_err:
            logger.warning("Telegram credentials notification failed: %s", tg_err)

        # Return the last system message for broadcast
        from .models import Message
        msg = Message.objects.filter(room_id=self.room_id, message_type="system").last()
        if not msg:
            return None

        return {
            "type": "message",
            "id": str(msg.id),
            "sender": {
                "id": str(self.user.id),
                "username": self.user.username,
                "display_name": self.user.display_name,
            },
            "content": msg.content,
            "message_type": "system",
            "created_at": msg.created_at.isoformat(),
            "is_read": False,
        }

    async def notify_recipient_telegram(self, message_data: dict) -> None:
        """Send Telegram notification to offline recipients (BLOCK 3)."""
        try:
            from django.conf import settings as _settings
            message_id = message_data.get("id")
            if not message_id:
                return
            delay = getattr(_settings, "CHAT_NOTIFICATION_DELAY_SECONDS", 10)
            try:
                from apps.payments.telegram_notify import notify_new_chat_message
                notify_new_chat_message.apply_async(args=[message_id], countdown=delay)
            except Exception:
                # Celery unavailable — send synchronously
                from apps.payments.telegram_notify import notify_new_chat_message_sync
                import asyncio
                loop = asyncio.get_event_loop()
                await loop.run_in_executor(None, notify_new_chat_message_sync, message_id)
        except Exception as e:
            logger.warning("Could not schedule chat Telegram notification: %s", e)

    @database_sync_to_async
    def mark_message_read(self, message_id: str) -> None:
        from .models import Message
        try:
            message = Message.objects.get(id=message_id, room_id=self.room_id)
            message.mark_as_read()
        except Message.DoesNotExist:
            pass
