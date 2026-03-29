"""
WibeStore Backend - Admin Panel WebSocket Consumer
Real-time notifications for admin panel.
"""

import json
import logging

from channels.generic.websocket import AsyncJsonWebsocketConsumer

logger = logging.getLogger("apps.admin_panel")


class AdminNotificationConsumer(AsyncJsonWebsocketConsumer):
    """WebSocket consumer for admin real-time notifications."""

    async def connect(self):
        user = self.scope.get('user')
        if not user or not user.is_authenticated or not user.is_staff:
            await self.close()
            return

        await self.channel_layer.group_add('admin_notifications', self.channel_name)
        await self.accept()

    async def disconnect(self, code):
        await self.channel_layer.group_discard('admin_notifications', self.channel_name)

    async def admin_notification(self, event):
        """Send admin notification to connected clients."""
        await self.send_json(event.get('data', {}))
