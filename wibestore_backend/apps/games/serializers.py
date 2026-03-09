"""
WibeStore Backend - Games Serializers
"""

from rest_framework import serializers

from .models import Category, Game


def _get_file_url(serializer, field):
    """Return full URL for an ImageField value."""
    if not field:
        return None
    request = serializer.context.get("request")
    if request:
        return request.build_absolute_uri(field.url)
    return field.url


class GameSerializer(serializers.ModelSerializer):
    """Serializer for Game model."""

    active_listings_count = serializers.SerializerMethodField()
    image = serializers.SerializerMethodField()
    logo = serializers.SerializerMethodField()

    class Meta:
        model = Game
        fields = [
            "id",
            "name",
            "slug",
            "description",
            "icon",
            "image",
            "logo",
            "color",
            "is_active",
            "sort_order",
            "active_listings_count",
            "created_at",
            "updated_at",
        ]
        read_only_fields = ["id", "slug", "active_listings_count", "created_at", "updated_at"]

    def get_image(self, obj):
        return _get_file_url(self, obj.image)

    def get_logo(self, obj):
        return _get_file_url(self, obj.logo)

    def get_active_listings_count(self, obj) -> int:
        return obj.get_active_listings_count()


class GameListSerializer(serializers.ModelSerializer):
    """Compact serializer for game listings. image = full URL for frontend."""

    active_listings_count = serializers.SerializerMethodField()
    image = serializers.SerializerMethodField()
    logo = serializers.SerializerMethodField()

    class Meta:
        model = Game
        fields = ["id", "name", "slug", "icon", "image", "logo", "color", "active_listings_count"]
        read_only_fields = ["active_listings_count"]

    def get_image(self, obj):
        return _get_file_url(self, obj.image)

    def get_logo(self, obj):
        return _get_file_url(self, obj.logo)

    def get_active_listings_count(self, obj) -> int:
        return obj.get_active_listings_count()


class CategorySerializer(serializers.ModelSerializer):
    """Serializer for Category model."""

    children = serializers.SerializerMethodField()

    class Meta:
        model = Category
        fields = ["id", "name", "slug", "parent", "children"]

    def get_children(self, obj) -> list:
        children = obj.children.all()
        return CategorySerializer(children, many=True).data
