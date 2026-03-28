"""
WibeStore Backend - Marketplace Serializers
"""

import uuid

from django.contrib.auth import get_user_model
from rest_framework import serializers

from apps.accounts.serializers import UserPublicSerializer
from apps.games.models import Game
from apps.games.serializers import GameListSerializer

from .models import Favorite, Listing, ListingImage, ListingPromotion, ListingView, SavedSearch

User = get_user_model()


class SavedSearchSerializer(serializers.ModelSerializer):
    class Meta:
        model = SavedSearch
        fields = ["id", "name", "query_params", "notify_email", "is_active", "last_notified_at", "created_at"]
        read_only_fields = ["id", "last_notified_at", "created_at"]


class ListingImageSerializer(serializers.ModelSerializer):
    image = serializers.SerializerMethodField()

    class Meta:
        model = ListingImage
        fields = ["id", "image", "is_primary", "sort_order"]

    def get_image(self, obj):
        if not obj.image:
            return None
        request = self.context.get("request")
        url = obj.image.url
        if url and url.startswith("http"):
            return url
        if request:
            return request.build_absolute_uri(url)
        return url


class ListingSerializer(serializers.ModelSerializer):
    """Full listing serializer."""

    listing_code = serializers.SerializerMethodField()
    seller = UserPublicSerializer(read_only=True)
    game = GameListSerializer(read_only=True)
    images = ListingImageSerializer(many=True, read_only=True)
    discount_percentage = serializers.IntegerField(read_only=True)
    is_favorited = serializers.SerializerMethodField()
    has_video = serializers.SerializerMethodField()
    video_status = serializers.CharField(read_only=True)

    class Meta:
        model = Listing
        fields = [
            "id",
            "listing_code",
            "listing_type",
            "seller",
            "game",
            "title",
            "description",
            "price",
            "original_price",
            "discount_percentage",
            "status",
            "is_premium",
            "views_count",
            "favorites_count",
            "warranty_days",
            "sale_percent",
            "sale_ends_at",
            "rental_period_days",
            "rental_price_per_day",
            "rental_deposit", "rental_time_slots",
            "login_method",
            "level",
            "rank",
            "skins_count",
            "features",
            "images",
            "has_video",
            "video_status",
            "is_favorited",
            "created_at",
            "updated_at",
        ]
        read_only_fields = [
            "id",
            "listing_code",
            "seller",
            "status",
            "views_count",
            "favorites_count",
            "created_at",
            "updated_at",
        ]

    def get_listing_code(self, obj):
        return getattr(obj, "listing_code", None) or None

    def get_is_favorited(self, obj) -> bool:
        request = self.context.get("request")
        if request and request.user.is_authenticated:
            return Favorite.objects.filter(user=request.user, listing=obj).exists()
        return False

    def get_has_video(self, obj) -> bool:
        return bool(obj.video_file_id)


class ListingCreateSerializer(serializers.ModelSerializer):
    """Serializer for creating listings. game_id accepts UUID or game slug."""

    game_id = serializers.CharField(write_only=True, help_text="Game UUID or slug")
    account_email = serializers.CharField(write_only=True, required=False, default="")
    account_password = serializers.CharField(write_only=True, required=False, default="")

    class Meta:
        model = Listing
        fields = [
            "id",
            "listing_type",
            "game_id",
            "title",
            "description",
            "price",
            "original_price",
            "warranty_days",
            "sale_percent",
            "sale_ends_at",
            "rental_period_days",
            "rental_price_per_day",
            "rental_deposit", "rental_time_slots",
            "login_method",
            "account_email",
            "account_password",
            "account_additional_info",
            "level",
            "rank",
            "skins_count",
            "features",
        ]
        read_only_fields = ["id"]

    ALLOWED_RENTAL_PERIOD_DAYS = {1, 3, 7, 14, 30}

    def validate(self, data):
        listing_type = data.get("listing_type", "sell")
        if listing_type == "rent":
            rental_days = data.get("rental_period_days")
            if not rental_days:
                raise serializers.ValidationError({"rental_period_days": "Ijara muddatini kiriting."})
            if rental_days not in self.ALLOWED_RENTAL_PERIOD_DAYS:
                raise serializers.ValidationError({
                    "rental_period_days": f"Ijara muddati faqat {sorted(self.ALLOWED_RENTAL_PERIOD_DAYS)} kunlardan biri bo'lishi mumkin."
                })
            if not data.get("rental_price_per_day") and not data.get("price"):
                raise serializers.ValidationError({"price": "Narxni kiriting."})

        return data

    def validate_game_id(self, value):
        if not value or not str(value).strip():
            raise serializers.ValidationError("O'yin tanlanishi shart.")
        raw = str(value).strip()
        try:
            uuid.UUID(raw)
            game = Game.objects.filter(pk=raw, is_active=True).first()
            if not game:
                raise serializers.ValidationError("Bunday o'yin topilmadi yoki faol emas.")
            return raw
        except (ValueError, TypeError):
            game = Game.objects.filter(slug=raw, is_active=True).first()
            if not game:
                game = Game.objects.filter(slug__iexact=raw, is_active=True).first()
            if not game:
                raise serializers.ValidationError("Bunday o'yin topilmadi yoki faol emas.")
            return str(game.pk)

    def create(self, validated_data):
        import logging
        logger = logging.getLogger("apps.marketplace")

        game_id = validated_data.pop("game_id")
        account_email = validated_data.pop("account_email", "")
        account_password = validated_data.pop("account_password", "")
        seller = self.context["request"].user

        try:
            listing = Listing.objects.create(
                game_id=game_id,
                seller=seller,
                **validated_data,
            )
        except Exception as e:
            logger.error(
                "Listing.objects.create failed: %s — %s | game_id=%s, keys=%s",
                type(e).__name__, e, game_id, list(validated_data.keys()),
            )
            raise

        if account_email or account_password:
            listing.set_account_credentials(account_email, account_password)
            listing.save(update_fields=["account_email", "account_password"])

        # Notify admins about new listing (Telegram + in-app)
        try:
            from apps.notifications.services import NotificationService
            from apps.payments.telegram_notify import _send_message, _get_admin_telegram_ids
            NotificationService.notify_admins(
                title="Yangi akkaunt moderatsiya kutmoqda",
                message=f"{seller.display_name} '{listing.title}' ({listing.game.name}) akkauntini yubordi",
                data={"listing_id": str(listing.id)},
            )
            admin_text = (
                f"\U0001f195 <b>Yangi akkaunt moderatsiya kutmoqda!</b>\n\n"
                f"\U0001f4e6 {listing.title}\n"
                f"\U0001f3ae O'yin: {listing.game.name}\n"
                f"\U0001f4b0 Narx: {int(listing.price):,} so'm\n"
                f"\U0001f464 Sotuvchi: {seller.display_name or seller.email}\n\n"
                f"\U0001f310 <a href='https://wibestore.net/amirxon'>Admin panelga o'tish \u2192</a>"
            )
            for admin_tg_id in _get_admin_telegram_ids():
                _send_message(admin_tg_id, admin_text)
        except Exception as e:
            logger.warning("Failed to notify admins about new listing: %s", e)

        return listing


class ListingListSerializer(serializers.ModelSerializer):
    """Compact listing serializer for lists."""

    listing_code = serializers.SerializerMethodField()
    seller = UserPublicSerializer(read_only=True)
    game_name = serializers.CharField(source="game.name", read_only=True)
    game_slug = serializers.CharField(source="game.slug", read_only=True)
    game_icon = serializers.CharField(source="game.icon", read_only=True)
    primary_image = serializers.SerializerMethodField()
    is_favorited = serializers.SerializerMethodField()
    has_video = serializers.SerializerMethodField()
    video_status = serializers.CharField(read_only=True)

    class Meta:
        model = Listing
        fields = [
            "id",
            "listing_code",
            "listing_type",
            "title",
            "price",
            "original_price",
            "game_name",
            "game_slug",
            "game_icon",
            "seller",
            "is_premium",
            "is_favorited",
            "has_video",
            "video_status",
            "views_count",
            "favorites_count",
            "warranty_days",
            "sale_percent",
            "sale_ends_at",
            "rental_period_days",
            "rental_price_per_day",
            "rental_deposit", "rental_time_slots",
            "status",
            "primary_image",
            "created_at",
        ]

    def get_listing_code(self, obj):
        return getattr(obj, "listing_code", None) or None

    def get_is_favorited(self, obj) -> bool:
        request = self.context.get("request")
        if request and request.user.is_authenticated:
            return Favorite.objects.filter(user=request.user, listing=obj).exists()
        return False

    def get_has_video(self, obj) -> bool:
        return bool(obj.video_file_id)

    def get_primary_image(self, obj) -> str | None:
        primary = obj.images.filter(is_primary=True).first()
        if not primary:
            primary = obj.images.first()
        if not primary:
            return None
        request = self.context.get("request")
        if request:
            return request.build_absolute_uri(primary.image.url)
        return primary.image.url


class FavoriteListSerializer(serializers.ModelSerializer):
    """Serializer for favorite listings."""

    listing = ListingListSerializer(read_only=True)

    class Meta:
        model = Favorite
        fields = ["id", "listing", "created_at"]


class PromotionCalculateSerializer(serializers.Serializer):
    """Calculate promotion cost with discounts."""

    hours = serializers.IntegerField(min_value=1, max_value=720)

    def validate_hours(self, value):
        if value < 1:
            raise serializers.ValidationError("Kamida 1 soat bo'lishi kerak.")
        return value


class PromotionCreateSerializer(serializers.Serializer):
    """Create a promotion for a rental listing."""

    listing_id = serializers.UUIDField()
    hours = serializers.IntegerField(min_value=1, max_value=720)

    def validate_listing_id(self, value):
        try:
            listing = Listing.objects.get(pk=value, listing_type="rent", status="active")
        except Listing.DoesNotExist:
            raise serializers.ValidationError("Arenda e'loni topilmadi.")
        self.listing = listing
        return value

    def validate(self, data):
        request = self.context.get("request")
        if request and self.listing.seller != request.user:
            raise serializers.ValidationError(
                {"listing_id": "Faqat o'zingizning e'loningizni reklama qilishingiz mumkin."}
            )
        return data


class ListingPromotionSerializer(serializers.ModelSerializer):
    class Meta:
        model = ListingPromotion
        fields = [
            "id", "listing_id", "hours", "price_per_hour",
            "discount_percent", "total_cost", "starts_at", "expires_at",
            "is_active", "created_at",
        ]
