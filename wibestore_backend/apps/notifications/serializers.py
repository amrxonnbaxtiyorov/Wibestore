"""
WibeStore Backend - Notifications Serializers
"""

from rest_framework import serializers

from .models import Notification, NotificationType


class NotificationTypeSerializer(serializers.ModelSerializer):
    class Meta:
        model = NotificationType
        fields = ["code", "name", "icon"]


class NotificationSerializer(serializers.ModelSerializer):
    type = NotificationTypeSerializer(read_only=True)

    class Meta:
        model = Notification
        fields = [
            "id",
            "type",
            "title",
            "message",
            "data",
            "is_read",
            "read_at",
            "link",
            "created_at",
        ]
