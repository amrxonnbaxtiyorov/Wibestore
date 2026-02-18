"""
WibeStore Backend - Notifications Views
"""

from drf_spectacular.utils import extend_schema
from rest_framework import generics, permissions, status
from rest_framework.response import Response
from rest_framework.views import APIView

from .models import Notification
from .serializers import NotificationSerializer
from .services import NotificationService


@extend_schema(tags=["Notifications"])
class NotificationListView(generics.ListAPIView):
    """GET /api/v1/notifications/ — User's notifications."""

    serializer_class = NotificationSerializer
    permission_classes = [permissions.IsAuthenticated]

    def get_queryset(self):
        return Notification.objects.filter(user=self.request.user).select_related("type")


@extend_schema(tags=["Notifications"])
class NotificationMarkReadView(APIView):
    """POST /api/v1/notifications/{id}/read/ — Mark notification as read."""

    permission_classes = [permissions.IsAuthenticated]

    def post(self, request, pk):
        try:
            notification = Notification.objects.get(pk=pk, user=request.user)
            notification.mark_as_read()
            return Response({"success": True})
        except Notification.DoesNotExist:
            return Response(
                {"success": False, "error": {"message": "Notification not found."}},
                status=status.HTTP_404_NOT_FOUND,
            )


@extend_schema(tags=["Notifications"])
class NotificationMarkAllReadView(APIView):
    """POST /api/v1/notifications/read-all/ — Mark all as read."""

    permission_classes = [permissions.IsAuthenticated]

    def post(self, request):
        count = NotificationService.mark_all_read(request.user)
        return Response({"success": True, "marked_count": count})


@extend_schema(tags=["Notifications"])
class UnreadCountView(APIView):
    """GET /api/v1/notifications/unread-count/ — Unread notifications count."""

    permission_classes = [permissions.IsAuthenticated]

    def get(self, request):
        count = Notification.objects.filter(user=request.user, is_read=False).count()
        return Response({"unread_count": count})
