"""
WibeStore Backend - Messaging Views
"""

import logging

from django.contrib.auth import get_user_model
from django.utils import timezone
from drf_spectacular.utils import extend_schema
from rest_framework import generics, permissions, status
from rest_framework.response import Response
from rest_framework.views import APIView

from .models import ChatRoom, Message
from .serializers import (
    AdminOrderChatSerializer,
    ChatRoomSerializer,
    CreateChatRoomSerializer,
    MessageSerializer,
    SendMessageSerializer,
)

User = get_user_model()
logger = logging.getLogger("apps.messaging")


@extend_schema(tags=["Messaging"])
class ChatRoomListView(generics.ListAPIView):
    """GET /api/v1/chat/ — User's chat rooms."""

    serializer_class = ChatRoomSerializer
    permission_classes = [permissions.IsAuthenticated]

    def get_queryset(self):
        return ChatRoom.objects.filter(
            participants=self.request.user, is_active=True
        ).prefetch_related("participants")


@extend_schema(tags=["Messaging"])
class ChatRoomCreateView(APIView):
    """POST /api/v1/chat/ — Create chat room."""

    permission_classes = [permissions.IsAuthenticated]
    serializer_class = CreateChatRoomSerializer

    def post(self, request):
        serializer = CreateChatRoomSerializer(data=request.data)
        serializer.is_valid(raise_exception=True)

        participant_id = serializer.validated_data["participant_id"]
        listing_id = serializer.validated_data.get("listing_id")

        if str(participant_id) == str(request.user.id):
            return Response(
                {"success": False, "error": {"message": "Cannot create a chat room with yourself."}},
                status=status.HTTP_400_BAD_REQUEST,
            )

        try:
            other_user = User.objects.get(id=participant_id, is_active=True)
        except User.DoesNotExist:
            return Response(
                {"success": False, "error": {"message": "User not found."}},
                status=status.HTTP_404_NOT_FOUND,
            )

        # Check for existing room between these users
        existing_rooms = ChatRoom.objects.filter(participants=request.user).filter(
            participants=other_user
        )
        if listing_id:
            existing_rooms = existing_rooms.filter(listing_id=listing_id)

        if existing_rooms.exists():
            room = existing_rooms.first()
        else:
            room = ChatRoom.objects.create(listing_id=listing_id)
            room.participants.add(request.user, other_user)

        # Send initial message if provided
        initial_message = serializer.validated_data.get("initial_message", "")
        if initial_message:
            Message.objects.create(
                room=room, sender=request.user, content=initial_message
            )
            room.last_message = initial_message
            room.last_message_at = timezone.now()
            room.save(update_fields=["last_message", "last_message_at"])

        return Response(
            {
                "success": True,
                "data": ChatRoomSerializer(room, context={"request": request}).data,
            },
            status=status.HTTP_201_CREATED,
        )


@extend_schema(tags=["Messaging"])
class ChatRoomMessagesView(generics.ListAPIView):
    """GET /api/v1/chat/{room_id}/messages/ — Chat room messages."""

    serializer_class = MessageSerializer
    permission_classes = [permissions.IsAuthenticated]

    def get_queryset(self):
        room_id = self.kwargs.get("room_id")
        return (
            Message.objects.filter(
                room_id=room_id, room__participants=self.request.user
            )
            .select_related("sender")
            .order_by("-created_at")
        )


@extend_schema(tags=["Messaging"])
class SendMessageView(APIView):
    """POST /api/v1/chat/{room_id}/messages/ — Send message."""

    permission_classes = [permissions.IsAuthenticated]
    serializer_class = SendMessageSerializer

    def post(self, request, room_id):
        serializer = SendMessageSerializer(data=request.data)
        serializer.is_valid(raise_exception=True)

        try:
            room = ChatRoom.objects.get(
                id=room_id, participants=request.user, is_active=True
            )
        except ChatRoom.DoesNotExist:
            return Response(
                {"success": False, "error": {"message": "Chat room not found."}},
                status=status.HTTP_404_NOT_FOUND,
            )

        message = Message.objects.create(
            room=room,
            sender=request.user,
            content=serializer.validated_data["content"],
            message_type=serializer.validated_data.get("message_type", "text"),
        )

        room.last_message = (message.content[:197] + "...") if len(message.content) > 200 else message.content
        room.last_message_at = timezone.now()
        room.save(update_fields=["last_message", "last_message_at"])

        # If admin writes first message to an order chat — auto-send credentials
        _maybe_send_credentials(room, request.user)

        return Response(
            {
                "success": True,
                "data": MessageSerializer(message, context={"request": request}).data,
            },
            status=status.HTTP_201_CREATED,
        )


@extend_schema(tags=["Messaging"])
class MarkChatReadView(APIView):
    """POST /api/v1/chats/{room_id}/read/ — Mark incoming messages as read."""

    permission_classes = [permissions.IsAuthenticated]

    def post(self, request, room_id):
        try:
            room = ChatRoom.objects.get(
                id=room_id, participants=request.user, is_active=True
            )
        except ChatRoom.DoesNotExist:
            return Response(
                {"success": False, "error": {"message": "Chat room not found."}},
                status=status.HTTP_404_NOT_FOUND,
            )

        updated = (
            Message.objects.filter(room=room, is_read=False)
            .exclude(sender=request.user)
            .update(is_read=True, read_at=timezone.now())
        )

        return Response({"success": True, "data": {"updated": updated}}, status=status.HTTP_200_OK)


@extend_schema(tags=["Messaging"])
class AdminOrderChatsView(generics.ListAPIView):
    """GET /api/v1/chat/admin/order-chats/ — All trade/order chats (staff only)."""

    serializer_class = AdminOrderChatSerializer
    permission_classes = [permissions.IsAuthenticated, permissions.IsAdminUser]

    def get_queryset(self):
        qs = (
            ChatRoom.objects.filter(listing__isnull=False, is_active=True)
            .prefetch_related("participants")
            .select_related("listing", "listing__game")
            .order_by("-last_message_at")
        )
        # Optional filter by escrow status
        escrow_status = self.request.query_params.get("escrow_status")
        if escrow_status:
            from apps.payments.models import EscrowTransaction
            listing_ids = EscrowTransaction.objects.filter(
                status=escrow_status
            ).values_list("listing_id", flat=True)
            qs = qs.filter(listing_id__in=listing_ids)
        return qs


# ── Helper ─────────────────────────────────────────────────────────────────────

def _maybe_send_credentials(room: ChatRoom, sender_user) -> None:
    """
    If an admin (is_staff) just wrote to an order chat (listing + active escrow)
    and credentials have not been sent yet — send them automatically.
    Also broadcasts via WebSocket and notifies buyer/seller via Telegram.
    """
    if room.credentials_sent:
        return
    if not sender_user.is_staff:
        return
    if not room.listing_id:
        return

    from apps.payments.models import EscrowTransaction
    escrow = EscrowTransaction.objects.filter(
        listing_id=room.listing_id,
        status="paid",
    ).first()
    if not escrow:
        return

    from .services import send_credentials_to_chat
    sent = send_credentials_to_chat(room, escrow, sent_by_user=sender_user)

    if sent:
        # Notify buyer and seller via Telegram
        try:
            from apps.payments.telegram_notify import notify_credentials_sent
            notify_credentials_sent(escrow)
        except Exception as tg_err:
            logger.warning("Telegram credentials notification failed: %s", tg_err)
