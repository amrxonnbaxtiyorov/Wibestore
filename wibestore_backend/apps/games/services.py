"""
Games App - Services
"""

import logging
from django.db.models import Count, Q
from apps.games.models import Game, Category
from apps.marketplace.models import Listing

logger = logging.getLogger(__name__)


class GameService:
    """Service for game-related operations."""

    @staticmethod
    def get_game_with_stats(game_id):
        """Get game with listing count and other stats."""
        game = Game.objects.prefetch_related('categories').get(id=game_id)
        
        # Get active listing count
        listing_count = Listing.objects.filter(
            game=game,
            status='active'
        ).count()
        
        return {
            'game': game,
            'listing_count': listing_count,
        }

    @staticmethod
    def get_all_games_with_counts():
        """Get all games with their listing counts."""
        games = Game.objects.filter(is_active=True).annotate(
            listing_count=Count('listing', filter=Q(listing__status='active'))
        ).order_by('sort_order')
        
        return games

    @staticmethod
    def get_categories_for_game(game_id):
        """Get all categories for a specific game."""
        categories = Category.objects.filter(
            game_id=game_id
        ).order_by('sort_order')
        
        return categories
