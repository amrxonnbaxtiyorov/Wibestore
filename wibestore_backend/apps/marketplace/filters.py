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
    
    # Category filter (via game's category)
    category = django_filters.CharFilter(
        field_name='game__category__slug',
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

    # Warranty: only listings with warranty_days > 0
    has_warranty = django_filters.BooleanFilter(
        method='filter_has_warranty',
        label='Has Warranty',
    )

    # Ordering
    ordering = django_filters.OrderingFilter(
        fields=(
            ('price', 'price'),
            ('created_at', 'created_at'),
            ('views_count', 'views_count'),
            ('favorites_count', 'favorites_count'),
        ),
        field_labels={
            'price': 'Price',
            'created_at': 'Newest',
            'views_count': 'Views',
            'favorites_count': 'Favorites',
        },
    )

    class Meta:
        model = Listing
        fields = [
            'search', 'min_price', 'max_price', 'game', 'category',
            'status', 'is_premium', 'seller', 'level', 'rank', 'has_warranty', 'ordering',
        ]

    def filter_has_warranty(self, queryset, name, value):
        if value is True:
            return queryset.filter(warranty_days__gt=0)
        return queryset
    
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
