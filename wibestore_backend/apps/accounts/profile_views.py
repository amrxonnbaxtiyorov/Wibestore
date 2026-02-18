"""
WibeStore Backend - Profile Views
"""

from django.contrib.auth import get_user_model
from drf_spectacular.utils import extend_schema
from rest_framework import generics, permissions, status
from rest_framework.response import Response
from rest_framework.views import APIView

from apps.marketplace.models import Listing, Favorite
from apps.marketplace.serializers import ListingSerializer, FavoriteListSerializer
from apps.notifications.models import Notification
from apps.notifications.serializers import NotificationSerializer
from apps.payments.models import EscrowTransaction

from .serializers import UserSerializer, UserProfileUpdateSerializer

User = get_user_model()


@extend_schema(tags=["Profile"])
class ProfileView(generics.RetrieveUpdateAPIView):
    """GET/PATCH /api/v1/profile/ — User profile."""

    permission_classes = [permissions.IsAuthenticated]

    def get_serializer_class(self):
        if self.request.method == "PATCH":
            return UserProfileUpdateSerializer
        return UserSerializer

    def get_object(self):
        return self.request.user


@extend_schema(tags=["Profile"])
class MyListingsView(generics.ListAPIView):
    """GET /api/v1/profile/listings/ — Current user's listings."""

    serializer_class = ListingSerializer
    permission_classes = [permissions.IsAuthenticated]

    def get_queryset(self):
        return Listing.objects.filter(seller=self.request.user).select_related("game")


@extend_schema(tags=["Profile"])
class MyFavoritesView(generics.ListAPIView):
    """GET /api/v1/profile/favorites/ — Current user's favorites."""

    serializer_class = FavoriteListSerializer
    permission_classes = [permissions.IsAuthenticated]

    def get_queryset(self):
        return Favorite.objects.filter(user=self.request.user).select_related(
            "listing__game", "listing__seller"
        )


@extend_schema(tags=["Profile"])
class MyPurchasesView(generics.ListAPIView):
    """GET /api/v1/profile/purchases/ — Current user's purchases."""

    permission_classes = [permissions.IsAuthenticated]

    def get_queryset(self):
        from apps.payments.serializers import EscrowTransactionSerializer
        return EscrowTransaction.objects.filter(buyer=self.request.user).select_related(
            "listing", "seller"
        )

    def get_serializer_class(self):
        from apps.payments.serializers import EscrowTransactionSerializer
        return EscrowTransactionSerializer


@extend_schema(tags=["Profile"])
class MySalesView(generics.ListAPIView):
    """GET /api/v1/profile/sales/ — Current user's sales."""

    permission_classes = [permissions.IsAuthenticated]

    def get_queryset(self):
        return EscrowTransaction.objects.filter(seller=self.request.user).select_related(
            "listing", "buyer"
        )

    def get_serializer_class(self):
        from apps.payments.serializers import EscrowTransactionSerializer
        return EscrowTransactionSerializer


@extend_schema(tags=["Profile"])
class MyNotificationsView(generics.ListAPIView):
    """GET /api/v1/profile/notifications/ — Current user's notifications."""

    serializer_class = NotificationSerializer
    permission_classes = [permissions.IsAuthenticated]

    def get_queryset(self):
        return Notification.objects.filter(user=self.request.user).select_related("type")


@extend_schema(tags=["Profile"])
class MarkNotificationReadView(APIView):
    """PATCH /api/v1/profile/notifications/{id}/read/ — Mark notification as read."""

    permission_classes = [permissions.IsAuthenticated]

    def patch(self, request, pk):
        try:
            notification = Notification.objects.get(pk=pk, user=request.user)
            notification.mark_as_read()
            return Response(
                {"success": True, "message": "Notification marked as read."},
                status=status.HTTP_200_OK,
            )
        except Notification.DoesNotExist:
            return Response(
                {"success": False, "error": {"message": "Notification not found."}},
                status=status.HTTP_404_NOT_FOUND,
            )
