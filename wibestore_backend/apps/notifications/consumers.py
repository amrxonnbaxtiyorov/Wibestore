"""
WibeStore Backend - Notifications WebSocket Consumer
"""

import logging
from channels.generic.websocket import AsyncJsonWebSocketConsumer

logger = logging.getLogger("apps.notifications")


class NotificationConsumer(AsyncJsonWebSocketConsumer):
    """WebSocket consumer for real-time notifications."""

    async def connect(self):
        self.user = self.scope.get("user")
        if not self.user or self.user.is_anonymous:
            await self.close()
            return

        self.group_name = f"notifications_{self.user.id}"
        await self.channel_layer.group_add(self.group_name, self.channel_name)
        await self.accept()
        logger.info("Notification WS connected: user=%s", self.user.email)

    async def disconnect(self, close_code):
        if hasattr(self, "group_name"):
            await self.channel_layer.group_discard(self.group_name, self.channel_name)

    async def notification_message(self, event):
        """Send notification to WebSocket client."""
        await self.send_json(event["notification"])
