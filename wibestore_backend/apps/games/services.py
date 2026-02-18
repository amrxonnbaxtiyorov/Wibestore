"""
WibeStore Backend - Games Services
Business logic for game and category operations.
"""

import logging

from django.db.models import Count, Q, QuerySet

from .models import Category, Game

logger = logging.getLogger("apps.games")


class GameService:
    """Service layer for game operations."""

    @staticmethod
    def get_active_games() -> QuerySet:
        """Get all active games with their listing counts."""
        return (
            Game.objects.filter(is_active=True)
            .annotate(
                active_listings_count=Count(
                    "listings", filter=Q(listings__status="active")
                )
            )
            .order_by("sort_order", "name")
        )

    @staticmethod
    def get_game_by_slug(slug: str) -> Game:
        """Get a single game by slug."""
        return (
            Game.objects.filter(is_active=True, slug=slug)
            .annotate(
                active_listings_count=Count(
                    "listings", filter=Q(listings__status="active")
                )
            )
            .first()
        )

    @staticmethod
    def get_popular_games(limit: int = 10) -> QuerySet:
        """Get games sorted by number of active listings."""
        return (
            Game.objects.filter(is_active=True)
            .annotate(
                active_listings_count=Count(
                    "listings", filter=Q(listings__status="active")
                )
            )
            .order_by("-active_listings_count")[:limit]
        )

    @staticmethod
    def get_categories(game_slug: str | None = None) -> QuerySet:
        """Get categories, optionally filtered by game slug."""
        qs = Category.objects.filter(is_active=True)
        if game_slug:
            qs = qs.filter(game__slug=game_slug)
        return qs.order_by("name")

    @staticmethod
    def search_games(query: str) -> QuerySet:
        """Search games by name or description."""
        return Game.objects.filter(
            is_active=True,
        ).filter(
            Q(name__icontains=query) | Q(description__icontains=query)
        )
