"""
WibeStore Backend - Core Filters
Shared filter backends for API views.
"""

from django_filters import rest_framework as filters


class BaseFilterSet(filters.FilterSet):
    """
    Base filter set with common filters for all models.
    Provides created_at range filtering.
    """

    created_after = filters.DateTimeFilter(
        field_name="created_at", lookup_expr="gte", label="Created after"
    )
    created_before = filters.DateTimeFilter(
        field_name="created_at", lookup_expr="lte", label="Created before"
    )

    class Meta:
        abstract = True
