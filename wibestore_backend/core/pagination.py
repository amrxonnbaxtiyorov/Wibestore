"""
WibeStore Backend - Custom Pagination Classes
"""

from rest_framework.pagination import CursorPagination, LimitOffsetPagination


class StandardResultsSetPagination(LimitOffsetPagination):
    """Standard pagination with limit/offset."""

    default_limit = 20
    max_limit = 100
    limit_query_param = "limit"
    offset_query_param = "offset"


class LargeResultsSetPagination(CursorPagination):
    """Cursor-based pagination for large data sets (messages, notifications)."""

    page_size = 50
    ordering = "-created_at"
    cursor_query_param = "cursor"
