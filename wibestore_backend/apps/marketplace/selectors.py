"""
WibeStore Backend - Marketplace Selectors
"""

from django.db.models import Q, QuerySet

from .models import Listing


def get_active_listings(game_slug: str | None = None) -> QuerySet:
    """Get active listings, optionally filtered by game."""
    qs = Listing.objects.filter(status="active").select_related("game", "seller")
    if game_slug:
        qs = qs.filter(game__slug=game_slug)
    return qs.order_by("-is_premium", "-created_at")


def get_premium_listings(limit: int = 10) -> QuerySet:
    """Get premium listings."""
    return (
        Listing.objects.filter(status="active", is_premium=True)
        .select_related("game", "seller")
        .order_by("-created_at")[:limit]
    )


def search_listings(query: str) -> QuerySet:
    """Full-text search across listings."""
    return (
        Listing.objects.filter(
            status="active",
        )
        .filter(
            Q(title__icontains=query)
            | Q(description__icontains=query)
            | Q(game__name__icontains=query)
        )
        .select_related("game", "seller")
        .order_by("-is_premium", "-created_at")
    )
