"""
WibeStore Backend - Marketplace Serializers
"""

from django.contrib.auth import get_user_model
from rest_framework import serializers

from apps.accounts.serializers import UserPublicSerializer
from apps.games.serializers import GameListSerializer

from .models import Favorite, Listing, ListingImage, ListingView

User = get_user_model()


class ListingImageSerializer(serializers.ModelSerializer):
    class Meta:
        model = ListingImage
        fields = ["id", "image", "is_primary", "sort_order"]


class ListingSerializer(serializers.ModelSerializer):
    """Full listing serializer."""

    seller = UserPublicSerializer(read_only=True)
    game = GameListSerializer(read_only=True)
    images = ListingImageSerializer(many=True, read_only=True)
    discount_percentage = serializers.IntegerField(read_only=True)
    is_favorited = serializers.SerializerMethodField()

    class Meta:
        model = Listing
        fields = [
            "id",
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
            "login_method",
            "level",
            "rank",
            "skins_count",
            "features",
            "images",
            "is_favorited",
            "created_at",
            "updated_at",
        ]
        read_only_fields = [
            "id",
            "seller",
            "status",
            "views_count",
            "favorites_count",
            "created_at",
            "updated_at",
        ]

    def get_is_favorited(self, obj) -> bool:
        request = self.context.get("request")
        if request and request.user.is_authenticated:
            return Favorite.objects.filter(user=request.user, listing=obj).exists()
        return False


class ListingCreateSerializer(serializers.ModelSerializer):
    """Serializer for creating listings."""

    game_id = serializers.UUIDField(write_only=True)
    account_email = serializers.CharField(write_only=True, required=False, default="")
    account_password = serializers.CharField(write_only=True, required=False, default="")

    class Meta:
        model = Listing
        fields = [
            "game_id",
            "title",
            "description",
            "price",
            "original_price",
            "login_method",
            "account_email",
            "account_password",
            "account_additional_info",
            "level",
            "rank",
            "skins_count",
            "features",
        ]

    def create(self, validated_data):
        game_id = validated_data.pop("game_id")
        account_email = validated_data.pop("account_email", "")
        account_password = validated_data.pop("account_password", "")

        listing = Listing.objects.create(
            game_id=game_id,
            seller=self.context["request"].user,
            **validated_data,
        )

        if account_email or account_password:
            listing.set_account_credentials(account_email, account_password)
            listing.save(update_fields=["account_email", "account_password"])

        return listing


class ListingListSerializer(serializers.ModelSerializer):
    """Compact listing serializer for lists."""

    seller = UserPublicSerializer(read_only=True)
    game_name = serializers.CharField(source="game.name", read_only=True)
    game_icon = serializers.CharField(source="game.icon", read_only=True)
    primary_image = serializers.SerializerMethodField()

    class Meta:
        model = Listing
        fields = [
            "id",
            "title",
            "price",
            "original_price",
            "game_name",
            "game_icon",
            "seller",
            "is_premium",
            "views_count",
            "favorites_count",
            "status",
            "primary_image",
            "created_at",
        ]

    def get_primary_image(self, obj) -> str | None:
        primary = obj.images.filter(is_primary=True).first()
        if primary:
            return primary.image.url
        first = obj.images.first()
        return first.image.url if first else None


class FavoriteListSerializer(serializers.ModelSerializer):
    """Serializer for favorite listings."""

    listing = ListingListSerializer(read_only=True)

    class Meta:
        model = Favorite
        fields = ["id", "listing", "created_at"]
