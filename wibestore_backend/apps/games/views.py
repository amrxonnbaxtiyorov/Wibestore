"""
WibeStore Backend - Games Views
"""

from drf_spectacular.utils import extend_schema
from rest_framework import generics, permissions

from apps.marketplace.models import Listing
from apps.marketplace.serializers import ListingSerializer

from .models import Game
from .serializers import CategorySerializer, GameListSerializer, GameSerializer


@extend_schema(tags=["Games"])
class GameListView(generics.ListAPIView):
    """GET /api/v1/games/ — List all active games."""

    serializer_class = GameListSerializer
    permission_classes = [permissions.AllowAny]

    def get_queryset(self):
        return Game.objects.filter(is_active=True).order_by("sort_order", "name")


@extend_schema(tags=["Games"])
class GameDetailView(generics.RetrieveAPIView):
    """GET /api/v1/games/{slug}/ — Game details."""

    serializer_class = GameSerializer
    permission_classes = [permissions.AllowAny]
    lookup_field = "slug"

    def get_queryset(self):
        return Game.objects.filter(is_active=True)


@extend_schema(tags=["Games"])
class GameListingsView(generics.ListAPIView):
    """GET /api/v1/games/{slug}/listings/ — Listings for a specific game."""

    serializer_class = ListingSerializer
    permission_classes = [permissions.AllowAny]

    def get_queryset(self):
        slug = self.kwargs.get("slug")
        return (
            Listing.objects.filter(game__slug=slug, status="active")
            .select_related("game", "seller")
            .order_by("-is_premium", "-created_at")
        )


@extend_schema(tags=["Games"])
class CategoryListView(generics.ListAPIView):
    """GET /api/v1/games/categories/ — List all categories."""

    from .models import Category

    serializer_class = CategorySerializer
    permission_classes = [permissions.AllowAny]
    queryset = Category.objects.all().order_by("name")

