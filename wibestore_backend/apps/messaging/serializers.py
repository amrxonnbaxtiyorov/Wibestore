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


class ListingMinimalSerializer(serializers.Serializer):
    """Minimal listing info for chat room display."""
    id = serializers.UUIDField()
    title = serializers.CharField()
    primary_image = serializers.SerializerMethodField()
    game_name = serializers.SerializerMethodField()

    def get_primary_image(self, obj):
        request = self.context.get("request")
        image = None
        first_img = obj.images.first() if hasattr(obj, 'images') else None
        if first_img:
            image = first_img.image
        if image and request:
            return request.build_absolute_uri(image.url) if hasattr(image, 'url') else str(image)
        return str(image) if image else None

    def get_game_name(self, obj):
        if obj.game:
            return obj.game.name
        return None


class ChatRoomSerializer(serializers.ModelSerializer):
    participants = UserPublicSerializer(many=True, read_only=True)
    last_message_preview = serializers.CharField(source="last_message", read_only=True)
    unread_count = serializers.SerializerMethodField()
    escrow_id = serializers.SerializerMethodField()
    escrow_status = serializers.SerializerMethodField()
    buyer_id = serializers.SerializerMethodField()
    seller_id = serializers.SerializerMethodField()
    listing = serializers.SerializerMethodField()

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

    def get_listing(self, obj):
        if not obj.listing_id or not obj.listing:
            return None
        return ListingMinimalSerializer(obj.listing, context=self.context).data

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


class AdminOrderChatSerializer(ChatRoomSerializer):
    """Extended serializer for admin trade chat panel — includes listing title and game."""

    listing_title = serializers.SerializerMethodField()
    listing_game = serializers.SerializerMethodField()
    buyer_name = serializers.SerializerMethodField()
    seller_name = serializers.SerializerMethodField()
    escrow_amount = serializers.SerializerMethodField()

    class Meta(ChatRoomSerializer.Meta):
        fields = ChatRoomSerializer.Meta.fields + [
            "listing_title",
            "listing_game",
            "buyer_name",
            "seller_name",
            "escrow_amount",
        ]

    def get_listing_title(self, obj):
        return obj.listing.title if obj.listing else None

    def get_listing_game(self, obj):
        if obj.listing and obj.listing.game:
            return obj.listing.game.name
        return None

    def get_buyer_name(self, obj):
        escrow = self._get_escrow(obj)
        if escrow and escrow.buyer:
            return escrow.buyer.display_name or escrow.buyer.email
        return None

    def get_seller_name(self, obj):
        escrow = self._get_escrow(obj)
        if escrow and escrow.seller:
            return escrow.seller.display_name or escrow.seller.email
        return None

    def get_escrow_amount(self, obj):
        escrow = self._get_escrow(obj)
        return str(escrow.amount) if escrow else None


class CreateChatRoomSerializer(serializers.Serializer):
    participant_id = serializers.UUIDField()
    listing_id = serializers.UUIDField(required=False)
    initial_message = serializers.CharField(required=False, default="")


class SendMessageSerializer(serializers.Serializer):
    content = serializers.CharField(min_length=1, max_length=5000)
    message_type = serializers.CharField(default="text")
