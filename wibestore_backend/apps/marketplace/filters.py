"""
Marketplace App - Filters
"""

import django_filters
from django.db.models import Q
from apps.marketplace.models import Listing


class ListingFilter(django_filters.FilterSet):
    """FilterSet for advanced listing filtering."""
    
    # Search filter
    search = django_filters.CharFilter(
        method='filter_search',
        label='Search'
    )
    
    # Price range filters
    min_price = django_filters.NumberFilter(
        field_name='price',
        lookup_expr='gte',
        label='Min Price'
    )
    max_price = django_filters.NumberFilter(
        field_name='price',
        lookup_expr='lte',
        label='Max Price'
    )
    
    # Game filter
    game = django_filters.CharFilter(
        field_name='game__slug',
        label='Game Slug'
    )
    
    # Category filter
    category = django_filters.CharFilter(
        field_name='categories__slug',
        label='Category Slug'
    )
    
    # Status filter
    status = django_filters.ChoiceFilter(
        choices=[
            ('active', 'Active'),
            ('pending', 'Pending'),
            ('sold', 'Sold'),
            ('reserved', 'Reserved'),
        ],
        label='Status'
    )
    
    # Premium filter
    is_premium = django_filters.BooleanFilter(
        field_name='is_premium',
        label='Premium Only'
    )
    
    # Seller filter
    seller = django_filters.UUIDFilter(
        field_name='seller__id',
        label='Seller ID'
    )
    
    # Level filter
    level = django_filters.CharFilter(
        field_name='level',
        lookup_expr='icontains',
        label='Level'
    )
    
    # Rank filter
    rank = django_filters.CharFilter(
        field_name='rank',
        lookup_expr='icontains',
        label='Rank'
    )
    
    class Meta:
        model = Listing
        fields = [
            'search', 'min_price', 'max_price', 'game', 'category',
            'status', 'is_premium', 'seller', 'level', 'rank',
        ]
    
    def filter_search(self, queryset, name, value):
        """Filter by search term across multiple fields."""
        if value:
            return queryset.filter(
                Q(title__icontains=value) |
                Q(description__icontains=value) |
                Q(game__name__icontains=value) |
                Q(seller__full_name__icontains=value)
            )
        return queryset


# Alias for views that expect ListingFilterSet
ListingFilterSet = ListingFilter


class ListingBackend(django_filters.rest_framework.backends.DjangoFilterBackend):
    """Custom filter backend for listings."""

    filterset_class = ListingFilter
