"""
WibeStore Backend - Marketplace Views
"""

import logging

from django_filters.rest_framework.backends import DjangoFilterBackend
from drf_spectacular.utils import extend_schema
from rest_framework import filters, generics, parsers, permissions, status
from rest_framework.response import Response
from rest_framework.views import APIView

from core.permissions import IsOwnerOrReadOnly

from .filters import ListingFilterSet
from .models import Favorite, Listing, ListingImage, ListingView
from .serializers import (
    ListingCreateSerializer,
    ListingImageSerializer,
    ListingListSerializer,
    ListingSerializer,
)
from .services import ListingService

logger = logging.getLogger("apps.marketplace")


@extend_schema(tags=["Listings"])
class ListingListCreateView(generics.ListCreateAPIView):
    """GET /api/v1/listings/ — List or create listings."""

    filter_backends = [DjangoFilterBackend, filters.SearchFilter, filters.OrderingFilter]
    filterset_class = ListingFilterSet
    search_fields = ["title", "description"]
    ordering_fields = ["created_at", "price", "views_count", "favorites_count"]
    ordering = ["-is_premium", "-created_at"]

    def get_permissions(self):
        if self.request.method == "GET":
            return [permissions.AllowAny()]
        return [permissions.IsAuthenticated()]

    def get_serializer_class(self):
        if self.request.method == "POST":
            return ListingCreateSerializer
        return ListingListSerializer

    def get_queryset(self):
        return (
            Listing.objects.filter(status="active")
            .select_related("game", "seller")
            .prefetch_related("images")
        )


@extend_schema(tags=["Listings"])
class ListingDetailView(generics.RetrieveUpdateDestroyAPIView):
    """GET/PUT/PATCH/DELETE /api/v1/listings/{id}/ — Listing detail."""

    queryset = Listing.objects.filter(deleted_at__isnull=True).select_related("game", "seller").prefetch_related("images")
    permission_classes = [IsOwnerOrReadOnly]

    def get_serializer_class(self):
        if self.request.method in ("PUT", "PATCH"):
            return ListingCreateSerializer
        return ListingSerializer

    def perform_destroy(self, instance):
        instance.soft_delete()
        logger.info("Listing soft deleted: %s", instance.id)


@extend_schema(tags=["Listings"])
class ListingFavoriteView(APIView):
    """POST/DELETE /api/v1/listings/{id}/favorite/ — Add/remove from favorites."""

    permission_classes = [permissions.IsAuthenticated]

    def post(self, request, pk):
        try:
            listing = Listing.objects.get(pk=pk, status="active")
        except Listing.DoesNotExist:
            return Response(
                {"success": False, "error": {"message": "Listing not found."}},
                status=status.HTTP_404_NOT_FOUND,
            )

        favorite, created = Favorite.objects.get_or_create(
            user=request.user, listing=listing
        )

        if created:
            listing.favorites_count += 1
            listing.save(update_fields=["favorites_count"])
            return Response(
                {"success": True, "message": "Added to favorites."},
                status=status.HTTP_201_CREATED,
            )
        return Response(
            {"success": True, "message": "Already in favorites."},
            status=status.HTTP_200_OK,
        )

    def delete(self, request, pk):
        deleted, _ = Favorite.objects.filter(
            user=request.user, listing_id=pk
        ).delete()
        if deleted:
            try:
                listing = Listing.objects.get(pk=pk)
                listing.favorites_count = max(0, listing.favorites_count - 1)
                listing.save(update_fields=["favorites_count"])
            except Listing.DoesNotExist:
                pass
            return Response(
                {"success": True, "message": "Removed from favorites."},
                status=status.HTTP_200_OK,
            )
        return Response(
            {"success": False, "error": {"message": "Not in favorites."}},
            status=status.HTTP_404_NOT_FOUND,
        )


@extend_schema(tags=["Listings"])
class ListingViewCountView(APIView):
    """POST /api/v1/listings/{id}/view/ — Record a listing view."""

    permission_classes = [permissions.AllowAny]

    def post(self, request, pk):
        try:
            listing = Listing.objects.get(pk=pk, status="active")
        except Listing.DoesNotExist:
            return Response(
                {"success": False, "error": {"message": "Listing not found."}},
                status=status.HTTP_404_NOT_FOUND,
            )

        ip = request.META.get("REMOTE_ADDR", "")
        user = request.user if request.user.is_authenticated else None

        # Check for unique view today
        from django.utils import timezone
        today = timezone.now().date()
        existing = ListingView.objects.filter(
            listing=listing,
            viewed_at__date=today,
        )
        if user:
            existing = existing.filter(user=user)
        else:
            existing = existing.filter(ip_address=ip)

        if not existing.exists():
            ListingView.objects.create(listing=listing, user=user, ip_address=ip)
            listing.views_count += 1
            listing.save(update_fields=["views_count"])

        return Response(
            {"success": True, "views_count": listing.views_count},
            status=status.HTTP_200_OK,
        )


@extend_schema(tags=["Listings"])
class ListingImageUploadView(APIView):
    """POST /api/v1/listings/{id}/images/ — Upload images for a listing."""

    permission_classes = [permissions.IsAuthenticated]
    parser_classes = [parsers.MultiPartParser, parsers.FormParser]

    def post(self, request, pk):
        try:
            listing = Listing.objects.get(pk=pk, seller=request.user)
        except Listing.DoesNotExist:
            return Response(
                {"success": False, "error": {"message": "Listing not found or you are not the owner."}},
                status=status.HTTP_404_NOT_FOUND,
            )

        images = request.FILES.getlist("images")
        if not images:
            return Response(
                {"success": False, "error": {"message": "No images provided."}},
                status=status.HTTP_400_BAD_REQUEST,
            )

        created_images = []
        is_first = not listing.images.exists()
        for i, img_file in enumerate(images):
            image_obj = ListingImage.objects.create(
                listing=listing,
                image=img_file,
                is_primary=(is_first and i == 0),
                sort_order=listing.images.count(),
            )
            created_images.append(image_obj)

        serializer = ListingImageSerializer(created_images, many=True)
        return Response(
            {
                "success": True,
                "message": f"{len(created_images)} image(s) uploaded.",
                "data": serializer.data,
            },
            status=status.HTTP_201_CREATED,
        )

    def delete(self, request, pk):
        """DELETE /api/v1/listings/{id}/images/ — Delete a specific image."""
        image_id = request.data.get("image_id")
        if not image_id:
            return Response(
                {"success": False, "error": {"message": "image_id is required."}},
                status=status.HTTP_400_BAD_REQUEST,
            )
        try:
            image = ListingImage.objects.get(
                id=image_id, listing_id=pk, listing__seller=request.user
            )
        except ListingImage.DoesNotExist:
            return Response(
                {"success": False, "error": {"message": "Image not found."}},
                status=status.HTTP_404_NOT_FOUND,
            )
        image.delete()
        return Response(
            {"success": True, "message": "Image deleted."},
            status=status.HTTP_200_OK,
        )


@extend_schema(tags=["Reviews"])
class ListingReviewsView(generics.ListAPIView):
    """GET /api/v1/listings/{id}/reviews/ — Reviews for a specific listing."""

    from apps.reviews.serializers import ReviewSerializer

    serializer_class = ReviewSerializer
    permission_classes = [permissions.AllowAny]

    def get_queryset(self):
        from apps.reviews.models import Review

        listing_id = self.kwargs.get("pk")
        return (
            Review.objects.filter(listing_id=listing_id, is_moderated=True)
            .select_related("reviewer", "reviewee")
            .order_by("-created_at")
        )


@extend_schema(tags=["Listings"])
class ApplyPromoView(APIView):
    """POST /api/v1/listings/promo/apply/ — Apply promo code; body: { code, amount } or { code, listing_id }."""

    permission_classes = [permissions.IsAuthenticated]

    def post(self, request):
        from django.utils import timezone
        from .models import PromoCode, PromoCodeUse

        code = (request.data.get("code") or "").strip().upper()
        amount = request.data.get("amount")
        listing_id = request.data.get("listing_id")
        if not code:
            return Response(
                {"success": False, "error": "code is required"},
                status=status.HTTP_400_BAD_REQUEST,
            )
        try:
            promo = PromoCode.objects.get(code=code, is_active=True)
        except PromoCode.DoesNotExist:
            return Response(
                {"success": False, "error": "Promo code not found or inactive"},
                status=status.HTTP_404_NOT_FOUND,
            )
        now = timezone.now()
        if promo.valid_from and now < promo.valid_from:
            return Response(
                {"success": False, "error": "Promo not yet valid"},
                status=status.HTTP_400_BAD_REQUEST,
            )
        if promo.valid_until and now > promo.valid_until:
            return Response(
                {"success": False, "error": "Promo expired"},
                status=status.HTTP_400_BAD_REQUEST,
            )
        if amount is None and listing_id:
            try:
                listing = Listing.objects.get(id=listing_id, status="active")
                amount = float(listing.price)
            except (Listing.DoesNotExist, ValueError):
                amount = 0
        if amount is None:
            amount = 0
        amount = float(amount)
        if promo.min_purchase and amount < float(promo.min_purchase):
            return Response(
                {"success": False, "error": f"Minimum purchase: {promo.min_purchase}"},
                status=status.HTTP_400_BAD_REQUEST,
            )
        uses_count = PromoCodeUse.objects.filter(promo=promo).count()
        if promo.max_uses_total is not None and uses_count >= promo.max_uses_total:
            return Response(
                {"success": False, "error": "Promo limit reached"},
                status=status.HTTP_400_BAD_REQUEST,
            )
        user_uses = PromoCodeUse.objects.filter(promo=promo, user=request.user).count()
        if user_uses >= promo.max_uses_per_user:
            return Response(
                {"success": False, "error": "You have already used this promo"},
                status=status.HTTP_400_BAD_REQUEST,
            )
        discount_fixed = float(promo.discount_fixed or 0)
        discount_percent = (float(amount) * promo.discount_percent) / 100
        discount = max(discount_fixed, discount_percent)
        final_amount = max(0, amount - discount)
        return Response({
            "success": True,
            "discount": discount,
            "final_amount": final_amount,
            "promo_code": promo.code,
        })
