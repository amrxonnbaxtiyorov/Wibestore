"""
WibeStore Backend - Marketplace Views
"""

import logging

from django.conf import settings
from django.db import connection, OperationalError, ProgrammingError
from django.db.models import F
from django_filters.rest_framework.backends import DjangoFilterBackend
from drf_spectacular.utils import extend_schema
from rest_framework import filters, generics, parsers, permissions, status
from rest_framework.response import Response
from rest_framework.views import APIView

from core.permissions import IsOwnerOrReadOnly

from .filters import ListingFilterSet
from .models import Favorite, Listing, ListingImage, ListingPromotion, ListingView
from .serializers import (
    ListingCreateSerializer,
    ListingImageSerializer,
    ListingListSerializer,
    ListingPromotionSerializer,
    ListingSerializer,
    PromotionCalculateSerializer,
    PromotionCreateSerializer,
)
from .services import ListingService

logger = logging.getLogger("apps.marketplace")

_listing_code_column_exists = None


def _listing_code_exists() -> bool:
    """Check if listing_code column exists in DB (cached after first call)."""
    global _listing_code_column_exists
    if _listing_code_column_exists is not None:
        return _listing_code_column_exists
    try:
        with connection.cursor() as cursor:
            cursor.execute(
                "SELECT 1 FROM information_schema.columns "
                "WHERE table_name = 'listings' AND column_name = 'listing_code' LIMIT 1"
            )
            _listing_code_column_exists = cursor.fetchone() is not None
    except (OperationalError, ProgrammingError):
        _listing_code_column_exists = False
    return _listing_code_column_exists


@extend_schema(tags=["Listings"])
class ListingListCreateView(generics.ListCreateAPIView):
    """GET /api/v1/listings/ — List or create listings."""

    filter_backends = [DjangoFilterBackend, filters.OrderingFilter]
    filterset_class = ListingFilterSet
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
        qs = Listing.objects.filter(status="active")
        # Defer listing_code if column not yet migrated
        if not _listing_code_exists():
            qs = qs.defer("listing_code")
        return qs.select_related("game", "seller").prefetch_related("images")


@extend_schema(tags=["Listings"])
class ListingDetailView(generics.RetrieveUpdateDestroyAPIView):
    """GET/PUT/PATCH/DELETE /api/v1/listings/{id}/ — Listing detail."""

    permission_classes = [IsOwnerOrReadOnly]

    def get_queryset(self):
        qs = Listing.objects.filter(deleted_at__isnull=True)
        if not _listing_code_exists():
            qs = qs.defer("listing_code")
        return qs.select_related("game", "seller").prefetch_related("images")

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
            Listing.objects.filter(pk=listing.pk).update(favorites_count=F("favorites_count") + 1)
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
            Listing.objects.filter(pk=pk, favorites_count__gt=0).update(
                favorites_count=F("favorites_count") - 1
            )
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
            Listing.objects.filter(pk=listing.pk).update(views_count=F("views_count") + 1)
            listing.refresh_from_db(fields=["views_count"])

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

        serializer = ListingImageSerializer(created_images, many=True, context={"request": request})
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

    permission_classes = [permissions.AllowAny]

    def get_serializer_class(self):
        from apps.reviews.serializers import ReviewSerializer
        return ReviewSerializer

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


# ===== VIDEO UPLOAD / VIEW VIA TELEGRAM =====

@extend_schema(tags=["Listings"])
class ListingVideoUploadTokenView(APIView):
    """POST /api/v1/listings/{id}/video-upload/ — Generate upload token, return Telegram deep link."""

    permission_classes = [permissions.IsAuthenticated]

    def post(self, request, pk):
        import secrets
        from .models import Listing

        try:
            listing = Listing.objects.get(pk=pk, seller=request.user)
        except Listing.DoesNotExist:
            return Response(
                {"success": False, "error": "Listing topilmadi yoki sizga tegishli emas."},
                status=status.HTTP_404_NOT_FOUND,
            )

        # Generate unique token
        token = secrets.token_urlsafe(32)
        listing.video_upload_token = token
        listing.save(update_fields=["video_upload_token"])

        bot_username = getattr(settings, "TELEGRAM_BOT_USERNAME", "wibestorebot")
        deep_link = f"https://t.me/{bot_username}?start=uploadvideo_{token}"

        return Response({
            "success": True,
            "deep_link": deep_link,
            "token": token,
            "has_video": bool(listing.video_file_id),
        })

    def get(self, request, pk):
        """GET — Check video status for listing."""
        from .models import Listing

        try:
            listing = Listing.objects.get(pk=pk, seller=request.user)
        except Listing.DoesNotExist:
            return Response(
                {"success": False, "error": "Listing topilmadi."},
                status=status.HTTP_404_NOT_FOUND,
            )

        return Response({
            "success": True,
            "has_video": bool(listing.video_file_id),
        })

    def delete(self, request, pk):
        """DELETE — Remove video from listing."""
        from .models import Listing

        try:
            listing = Listing.objects.get(pk=pk, seller=request.user)
        except Listing.DoesNotExist:
            return Response(
                {"success": False, "error": "Listing topilmadi."},
                status=status.HTTP_404_NOT_FOUND,
            )

        listing.video_file_id = ""
        listing.video_upload_token = ""
        listing.save(update_fields=["video_file_id", "video_upload_token"])

        return Response({"success": True, "message": "Video o'chirildi."})


@extend_schema(tags=["Listings"])
class ListingVideoViewView(APIView):
    """GET/POST /api/v1/listings/{id}/video-view/ — Request to view video via Telegram bot."""

    permission_classes = [permissions.AllowAny]

    def post(self, request, pk):
        from .models import Listing

        try:
            listing = Listing.objects.get(pk=pk)
        except Listing.DoesNotExist:
            return Response(
                {"success": False, "error": "Listing topilmadi."},
                status=status.HTTP_404_NOT_FOUND,
            )

        if not listing.video_file_id:
            return Response(
                {"success": False, "error": "Bu e'lon uchun video mavjud emas."},
                status=status.HTTP_404_NOT_FOUND,
            )

        bot_username = getattr(settings, "TELEGRAM_BOT_USERNAME", "wibestorebot")
        deep_link = f"https://t.me/{bot_username}?start=viewvideo_{pk}"

        return Response({
            "success": True,
            "deep_link": deep_link,
        })

    def get(self, request, pk):
        """GET — returns file_id for bot (authenticated by X-Bot-Secret header)."""
        from .models import Listing

        # Bot secret tekshirish
        bot_secret = request.headers.get("X-Bot-Secret", "")
        expected = getattr(settings, "TELEGRAM_BOT_SECRET", "")
        if not expected or bot_secret != expected:
            return Response(
                {"success": False, "error": "Unauthorized"},
                status=status.HTTP_403_FORBIDDEN,
            )

        try:
            listing = Listing.objects.get(pk=pk)
        except Listing.DoesNotExist:
            return Response(
                {"success": False, "error": "Listing topilmadi."},
                status=status.HTTP_404_NOT_FOUND,
            )

        if not listing.video_file_id:
            return Response(
                {"success": False, "error": "Video mavjud emas."},
                status=status.HTTP_404_NOT_FOUND,
            )

        return Response({
            "success": True,
            "file_id": listing.video_file_id,
        })


@extend_schema(tags=["Listings"])
class ListingVideoWebhookView(APIView):
    """POST /api/v1/listings/video-webhook/ — Called by Telegram bot when video is uploaded."""

    permission_classes = [permissions.AllowAny]

    def post(self, request):
        from .models import Listing

        # Verify bot secret
        secret = request.data.get("secret", "")
        expected = getattr(settings, "TELEGRAM_BOT_SECRET", "") or ""
        if not expected or secret != expected:
            return Response(
                {"success": False, "error": "Unauthorized"},
                status=status.HTTP_403_FORBIDDEN,
            )

        token = request.data.get("token", "")
        file_id = request.data.get("file_id", "")

        if not token or not file_id:
            return Response(
                {"success": False, "error": "token and file_id required"},
                status=status.HTTP_400_BAD_REQUEST,
            )

        try:
            listing = Listing.objects.get(video_upload_token=token)
        except Listing.DoesNotExist:
            return Response(
                {"success": False, "error": "Invalid or expired token"},
                status=status.HTTP_404_NOT_FOUND,
            )

        listing.video_file_id = file_id
        listing.video_upload_token = ""  # Invalidate token
        listing.video_status = "pending"
        listing.video_rejected_reason = ""
        listing.save(update_fields=["video_file_id", "video_upload_token", "video_status", "video_rejected_reason"])

        return Response({
            "success": True,
            "listing_id": str(listing.id),
            "listing_title": listing.title,
            "seller_id": str(listing.seller_id),
            "seller_name": getattr(listing.seller, 'full_name', '') or listing.seller.username or listing.seller.email,
            "game_name": listing.game.name if listing.game else "",
            "price": str(listing.price),
        })


@extend_schema(tags=["Listings"])
class ListingVideoModerateView(APIView):
    """POST /api/v1/listings/video-moderate/ — Admin approves/rejects video via bot."""

    permission_classes = [permissions.AllowAny]

    def post(self, request):
        from .models import Listing

        secret = request.data.get("secret", "")
        expected = getattr(settings, "TELEGRAM_BOT_SECRET", "") or ""
        if not expected or secret != expected:
            return Response({"success": False, "error": "Unauthorized"}, status=status.HTTP_403_FORBIDDEN)

        listing_id = request.data.get("listing_id", "")
        action = request.data.get("action", "")  # approve / reject
        reason = request.data.get("reason", "")

        if not listing_id or action not in ("approve", "reject"):
            return Response({"success": False, "error": "listing_id and action (approve/reject) required"}, status=status.HTTP_400_BAD_REQUEST)

        try:
            listing = Listing.objects.select_related("seller").get(pk=listing_id)
        except Listing.DoesNotExist:
            return Response({"success": False, "error": "Listing not found"}, status=status.HTTP_404_NOT_FOUND)

        if action == "approve":
            listing.video_status = "approved"
            listing.video_rejected_reason = ""
            listing.save(update_fields=["video_status", "video_rejected_reason"])
        else:
            listing.video_status = "rejected"
            listing.video_rejected_reason = reason
            listing.video_file_id = ""  # O'chirish
            listing.save(update_fields=["video_status", "video_rejected_reason", "video_file_id"])

        # Sotuvchi Telegram ID sini olish
        seller_telegram_id = None
        try:
            from apps.accounts.models import TelegramBotStat
            tg_stat = TelegramBotStat.objects.filter(user=listing.seller).first()
            if tg_stat:
                seller_telegram_id = tg_stat.telegram_id
        except Exception:
            pass

        return Response({
            "success": True,
            "listing_id": str(listing.id),
            "listing_title": listing.title,
            "video_status": listing.video_status,
            "seller_telegram_id": seller_telegram_id,
            "seller_name": getattr(listing.seller, 'full_name', '') or listing.seller.username or "",
        })


# ============================================================
# RENTAL PROMOTION VIEWS
# ============================================================

def _calculate_promotion_cost(hours: int) -> dict:
    """Calculate promotion cost with tiered discounts.

    Pricing: 5000 so'm/hour
    Discount: 10% per every 10 hours (10h=10%, 20h=20%, 30h=30%, max 90%)
    """
    from core.constants import (
        RENTAL_PROMOTION_PRICE_PER_HOUR,
        RENTAL_PROMOTION_DISCOUNT_STEP,
        RENTAL_PROMOTION_DISCOUNT_RATE,
    )

    price_per_hour = RENTAL_PROMOTION_PRICE_PER_HOUR
    base_cost = price_per_hour * hours
    discount_steps = hours // RENTAL_PROMOTION_DISCOUNT_STEP
    discount_percent = min(int(discount_steps * RENTAL_PROMOTION_DISCOUNT_RATE * 100), 90)
    discount_amount = int(base_cost * discount_percent / 100)
    total_cost = base_cost - discount_amount

    return {
        "hours": hours,
        "price_per_hour": price_per_hour,
        "base_cost": base_cost,
        "discount_percent": discount_percent,
        "discount_amount": discount_amount,
        "total_cost": total_cost,
    }


@extend_schema(tags=["Rental Promotions"])
class RentalPromotionCalculateView(APIView):
    """GET /api/v1/rentals/promotion/calculate/?hours=N — Calculate promotion cost."""

    permission_classes = [permissions.IsAuthenticated]

    def get(self, request):
        hours = request.query_params.get("hours")
        if not hours:
            return Response(
                {"success": False, "error": {"message": "hours parametri kerak."}},
                status=status.HTTP_400_BAD_REQUEST,
            )
        try:
            hours = int(hours)
            if hours < 1 or hours > 720:
                raise ValueError
        except (ValueError, TypeError):
            return Response(
                {"success": False, "error": {"message": "hours 1 dan 720 gacha bo'lishi kerak."}},
                status=status.HTTP_400_BAD_REQUEST,
            )

        cost_info = _calculate_promotion_cost(hours)
        cost_info["user_balance"] = float(request.user.balance)
        cost_info["balance_sufficient"] = request.user.balance >= cost_info["total_cost"]
        cost_info["deficit"] = max(0, cost_info["total_cost"] - float(request.user.balance))
        cost_info["success"] = True

        return Response(cost_info)


@extend_schema(tags=["Rental Promotions"])
class RentalPromotionCreateView(APIView):
    """POST /api/v1/rentals/promotion/create/ — Create promotion (deduct balance)."""

    permission_classes = [permissions.IsAuthenticated]

    def post(self, request):
        serializer = PromotionCreateSerializer(data=request.data, context={"request": request})
        serializer.is_valid(raise_exception=True)

        listing = serializer.listing
        hours = serializer.validated_data["hours"]
        cost_info = _calculate_promotion_cost(hours)
        total_cost = cost_info["total_cost"]

        user = request.user
        if user.balance < total_cost:
            deficit = total_cost - float(user.balance)
            bot_username = getattr(settings, "TELEGRAM_BOT_USERNAME", "wibestorebot")
            topup_link = f"https://t.me/{bot_username}?start=topup_{int(deficit)}"
            return Response({
                "success": False,
                "error": {
                    "code": "insufficient_balance",
                    "message": f"Balansingizda mablag' yetarli emas. Kamomad: {int(deficit):,} so'm",
                    "deficit": int(deficit),
                    "balance": float(user.balance),
                    "required": total_cost,
                    "topup_link": topup_link,
                },
            }, status=status.HTTP_402_PAYMENT_REQUIRED)

        # Deduct balance
        from django.utils import timezone
        from django.db import transaction as db_transaction
        from apps.payments.models import Transaction

        now = timezone.now()
        expires = now + timezone.timedelta(hours=hours)

        with db_transaction.atomic():
            # Check and extend existing active promotion
            existing = ListingPromotion.objects.filter(
                listing=listing, is_active=True, expires_at__gt=now
            ).order_by("-expires_at").first()

            if existing:
                # Extend existing promotion
                existing.expires_at = existing.expires_at + timezone.timedelta(hours=hours)
                existing.hours += hours
                existing.total_cost += total_cost
                existing.save(update_fields=["expires_at", "hours", "total_cost"])
                promotion = existing
            else:
                promotion = ListingPromotion.objects.create(
                    listing=listing,
                    user=user,
                    hours=hours,
                    price_per_hour=cost_info["price_per_hour"],
                    discount_percent=cost_info["discount_percent"],
                    total_cost=total_cost,
                    starts_at=now,
                    expires_at=expires,
                    is_active=True,
                )

            # Deduct user balance
            user.balance = F("balance") - total_cost
            user.save(update_fields=["balance"])
            user.refresh_from_db()

            # Create transaction record
            Transaction.objects.create(
                user=user,
                amount=total_cost,
                type="promotion",
                status="completed",
                description=f"Arenda e'lon reklamasi: {listing.title} — {hours} soat",
                metadata={
                    "listing_id": str(listing.id),
                    "hours": hours,
                    "discount_percent": cost_info["discount_percent"],
                },
            )

        return Response({
            "success": True,
            "message": f"E'lon {hours} soatga reklama qilindi!",
            "promotion": ListingPromotionSerializer(promotion).data,
            "new_balance": float(user.balance),
        }, status=status.HTTP_201_CREATED)


@extend_schema(tags=["Rental Promotions"])
class RentalBrowseView(generics.ListAPIView):
    """GET /api/v1/rentals/ — Browse promoted rental listings grouped by game."""

    serializer_class = ListingListSerializer
    permission_classes = [permissions.AllowAny]
    filter_backends = [DjangoFilterBackend, filters.OrderingFilter]
    ordering_fields = ["created_at", "price"]
    ordering = ["-created_at"]

    def get_queryset(self):
        from django.utils import timezone
        now = timezone.now()

        qs = Listing.objects.filter(
            listing_type="rent",
            status="active",
            deleted_at__isnull=True,
        )

        # Filter by game
        game_slug = self.request.query_params.get("game")
        if game_slug:
            qs = qs.filter(game__slug=game_slug)

        # Search
        search = self.request.query_params.get("search")
        if search:
            qs = qs.filter(title__icontains=search)

        if not _listing_code_exists():
            qs = qs.defer("listing_code")

        # Annotate with active promotion status for ordering
        from django.db.models import Exists, OuterRef, Subquery, BooleanField, Value
        from django.db.models.functions import Coalesce

        active_promo = ListingPromotion.objects.filter(
            listing=OuterRef("pk"),
            is_active=True,
            expires_at__gt=now,
        )
        qs = qs.annotate(
            has_active_promo=Exists(active_promo),
        )

        # Promoted listings first, then by creation date
        qs = qs.order_by("-has_active_promo", "-created_at")

        return qs.select_related("game", "seller").prefetch_related("images")

    def list(self, request, *args, **kwargs):
        queryset = self.filter_queryset(self.get_queryset())

        # Paginate
        page = self.paginate_queryset(queryset)
        if page is not None:
            serializer = self.get_serializer(page, many=True)
            return self.get_paginated_response(serializer.data)

        serializer = self.get_serializer(queryset, many=True)
        return Response({
            "success": True,
            "results": serializer.data,
            "count": queryset.count(),
        })


@extend_schema(tags=["Rental Promotions"])
class MyRentalPromotionsView(APIView):
    """GET /api/v1/rentals/my-promotions/ — User's active promotions."""

    permission_classes = [permissions.IsAuthenticated]

    def get(self, request):
        from django.utils import timezone
        now = timezone.now()

        promotions = ListingPromotion.objects.filter(
            user=request.user,
            is_active=True,
            expires_at__gt=now,
        ).select_related("listing", "listing__game")

        data = []
        for p in promotions:
            data.append({
                "id": p.id,
                "listing_id": str(p.listing_id),
                "listing_title": p.listing.title,
                "game_name": p.listing.game.name if p.listing.game else "",
                "hours": p.hours,
                "total_cost": float(p.total_cost),
                "starts_at": p.starts_at.isoformat(),
                "expires_at": p.expires_at.isoformat(),
                "remaining_hours": max(0, int((p.expires_at - now).total_seconds() / 3600)),
            })

        return Response({"success": True, "promotions": data})
