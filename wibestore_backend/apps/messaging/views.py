"""
WibeStore Backend - Messaging Views
"""

from django.contrib.auth import get_user_model
from drf_spectacular.utils import extend_schema
from rest_framework import generics, permissions, status
from rest_framework.response import Response
from rest_framework.views import APIView

from .models import ChatRoom, Message
from .serializers import (
    ChatRoomSerializer,
    CreateChatRoomSerializer,
    MessageSerializer,
    SendMessageSerializer,
)

User = get_user_model()


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
            from django.utils import timezone
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
        return Message.objects.filter(
            room_id=room_id, room__participants=self.request.user
        ).select_related("sender")


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

        room.last_message = message.content[:200]
        from django.utils import timezone
        room.last_message_at = timezone.now()
        room.save(update_fields=["last_message", "last_message_at"])

        return Response(
            {
                "success": True,
                "data": MessageSerializer(message, context={"request": request}).data,
            },
            status=status.HTTP_201_CREATED,
        )
