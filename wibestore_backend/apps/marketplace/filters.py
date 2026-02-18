"""
WibeStore Backend - Marketplace Filters
Advanced filtering for listing queries.
"""

from django_filters import rest_framework as filters

from core.filters import BaseFilterSet

from .models import Listing


class ListingFilterSet(BaseFilterSet):
    """
    FilterSet for Listing model.
    Supports filtering by game, price range, status, premium, and search.
    """

    game = filters.CharFilter(field_name="game__slug", lookup_expr="exact")
    status = filters.CharFilter(field_name="status", lookup_expr="exact")
    min_price = filters.NumberFilter(field_name="price", lookup_expr="gte")
    max_price = filters.NumberFilter(field_name="price", lookup_expr="lte")
    is_premium = filters.BooleanFilter(field_name="is_premium")
    seller = filters.CharFilter(field_name="seller__username", lookup_expr="exact")
    has_images = filters.BooleanFilter(method="filter_has_images")
    search = filters.CharFilter(method="filter_search")

    class Meta:
        model = Listing
        fields = [
            "game",
            "status",
            "min_price",
            "max_price",
            "is_premium",
            "seller",
        ]

    def filter_has_images(self, queryset, name, value):
        if value:
            return queryset.filter(images__isnull=False).distinct()
        return queryset.filter(images__isnull=True)

    def filter_search(self, queryset, name, value):
        from django.db.models import Q

        return queryset.filter(
            Q(title__icontains=value)
            | Q(description__icontains=value)
            | Q(game__name__icontains=value)
        )
