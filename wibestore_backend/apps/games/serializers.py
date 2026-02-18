"""
WibeStore Backend - Games Serializers
"""

from rest_framework import serializers

from .models import Category, Game


class GameSerializer(serializers.ModelSerializer):
    """Serializer for Game model."""

    active_listings_count = serializers.IntegerField(read_only=True)

    class Meta:
        model = Game
        fields = [
            "id",
            "name",
            "slug",
            "description",
            "icon",
            "image",
            "color",
            "is_active",
            "sort_order",
            "active_listings_count",
            "created_at",
            "updated_at",
        ]
        read_only_fields = ["id", "slug", "created_at", "updated_at"]


class GameListSerializer(serializers.ModelSerializer):
    """Compact serializer for game listings."""

    active_listings_count = serializers.IntegerField(read_only=True)

    class Meta:
        model = Game
        fields = ["id", "name", "slug", "icon", "image", "color", "active_listings_count"]


class CategorySerializer(serializers.ModelSerializer):
    """Serializer for Category model."""

    children = serializers.SerializerMethodField()

    class Meta:
        model = Category
        fields = ["id", "name", "slug", "parent", "children"]

    def get_children(self, obj) -> list:
        children = obj.children.all()
        return CategorySerializer(children, many=True).data
