"""
WibeStore Backend - Messaging Serializers
"""

from rest_framework import serializers

from apps.accounts.serializers import UserPublicSerializer

from .models import ChatRoom, Message


class MessageSerializer(serializers.ModelSerializer):
    sender = UserPublicSerializer(read_only=True)

    class Meta:
        model = Message
        fields = [
            "id",
            "room",
            "sender",
            "content",
            "message_type",
            "attachment",
            "is_read",
            "read_at",
            "created_at",
        ]
        read_only_fields = ["id", "sender", "is_read", "read_at", "created_at"]


class ChatRoomSerializer(serializers.ModelSerializer):
    participants = UserPublicSerializer(many=True, read_only=True)
    last_message_preview = serializers.CharField(source="last_message", read_only=True)
    unread_count = serializers.SerializerMethodField()

    class Meta:
        model = ChatRoom
        fields = [
            "id",
            "participants",
            "listing",
            "last_message_preview",
            "last_message_at",
            "unread_count",
            "is_active",
            "created_at",
        ]

    def get_unread_count(self, obj) -> int:
        request = self.context.get("request")
        if request and request.user.is_authenticated:
            return obj.messages.filter(is_read=False).exclude(sender=request.user).count()
        return 0


class CreateChatRoomSerializer(serializers.Serializer):
    participant_id = serializers.UUIDField()
    listing_id = serializers.UUIDField(required=False)
    initial_message = serializers.CharField(required=False, default="")


class SendMessageSerializer(serializers.Serializer):
    content = serializers.CharField()
    message_type = serializers.CharField(default="text")
