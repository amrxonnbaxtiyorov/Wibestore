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


@extend_schema(tags=["Profile"])
class SellerDashboardView(APIView):
    """GET /api/v1/profile/dashboard/ — Seller stats: sales, views, conversion."""

    permission_classes = [permissions.IsAuthenticated]

    def get(self, request):
        from django.db.models import Count, Sum
        user = request.user
        listings = Listing.objects.filter(seller=user)
        active = listings.filter(status="active")
        sold = listings.filter(status="sold")
        total_views = active.aggregate(s=Sum("views_count"))["s"] or 0
        from apps.payments.models import EscrowTransaction
        sales = EscrowTransaction.objects.filter(seller=user, status="confirmed")
        total_sales_count = sales.count()
        total_sales_amount = sales.aggregate(s=Sum("seller_earnings"))["s"] or 0
        return Response({
            "active_listings": active.count(),
            "sold_listings": sold.count(),
            "total_views": total_views,
            "total_sales_count": total_sales_count,
            "total_sales_amount": str(total_sales_amount),
            "conversion": round((total_sales_count / total_views * 100), 2) if total_views else 0,
        })


@extend_schema(tags=["Profile"])
class ReferralView(APIView):
    """GET /api/v1/profile/referral/ — My referral code and stats."""

    permission_classes = [permissions.IsAuthenticated]

    def get(self, request):
        import secrets
        from apps.accounts.models import Referral
        user = request.user
        if not user.referral_code:
            user.referral_code = secrets.token_urlsafe(8).upper()[:10]
            user.save(update_fields=["referral_code"])
        referred_count = Referral.objects.filter(referrer=user).count()
        return Response({
            "referral_code": user.referral_code,
            "referral_url": f"{request.build_absolute_uri('/')}?ref={user.referral_code}",
            "referred_count": referred_count,
        })


@extend_schema(tags=["Profile"])
class SavedSearchListCreateView(generics.ListCreateAPIView):
    """GET/POST /api/v1/profile/saved-searches/ — List or create saved search."""

    permission_classes = [permissions.IsAuthenticated]

    def get_queryset(self):
        from apps.marketplace.models import SavedSearch
        return SavedSearch.objects.filter(user=self.request.user)

    def get_serializer_class(self):
        from apps.marketplace.serializers import SavedSearchSerializer
        return SavedSearchSerializer

    def perform_create(self, serializer):
        serializer.save(user=self.request.user)


@extend_schema(tags=["Profile"])
class SavedSearchDetailView(generics.RetrieveUpdateDestroyAPIView):
    """GET/PATCH/DELETE /api/v1/profile/saved-searches/<id>/."""

    permission_classes = [permissions.IsAuthenticated]

    def get_queryset(self):
        from apps.marketplace.models import SavedSearch
        return SavedSearch.objects.filter(user=self.request.user)

    def get_serializer_class(self):
        from apps.marketplace.serializers import SavedSearchSerializer
        return SavedSearchSerializer
