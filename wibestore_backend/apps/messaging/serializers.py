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
    escrow_id = serializers.SerializerMethodField()
    escrow_status = serializers.SerializerMethodField()
    buyer_id = serializers.SerializerMethodField()
    seller_id = serializers.SerializerMethodField()

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
            "escrow_id",
            "escrow_status",
            "buyer_id",
            "seller_id",
        ]

    def _get_escrow(self, obj):
        if not obj.listing_id:
            return None
        if not hasattr(obj, "_cached_escrow"):
            from apps.payments.models import EscrowTransaction
            obj._cached_escrow = (
                EscrowTransaction.objects.filter(listing_id=obj.listing_id)
                .order_by("-created_at")
                .first()
            )
        return obj._cached_escrow

    def get_unread_count(self, obj) -> int:
        request = self.context.get("request")
        if request and request.user.is_authenticated:
            return obj.messages.filter(is_read=False).exclude(sender=request.user).count()
        return 0

    def get_escrow_id(self, obj):
        escrow = self._get_escrow(obj)
        return str(escrow.id) if escrow else None

    def get_escrow_status(self, obj):
        escrow = self._get_escrow(obj)
        return escrow.status if escrow else None

    def get_buyer_id(self, obj):
        escrow = self._get_escrow(obj)
        return str(escrow.buyer_id) if escrow else None

    def get_seller_id(self, obj):
        escrow = self._get_escrow(obj)
        return str(escrow.seller_id) if escrow else None


class CreateChatRoomSerializer(serializers.Serializer):
    participant_id = serializers.UUIDField()
    listing_id = serializers.UUIDField(required=False)
    initial_message = serializers.CharField(required=False, default="")


class SendMessageSerializer(serializers.Serializer):
    content = serializers.CharField(min_length=1, max_length=5000)
    message_type = serializers.CharField(default="text")
