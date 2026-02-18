"""
WibeStore Backend - Accounts Selectors
"""

from django.contrib.auth import get_user_model
from django.db.models import QuerySet

User = get_user_model()


def get_active_users() -> QuerySet:
    """Get all active users."""
    return User.objects.filter(is_active=True, deleted_at__isnull=True)


def get_user_by_email(email: str) -> User | None:
    """Get user by email."""
    try:
        return User.objects.get(email=email, is_active=True)
    except User.DoesNotExist:
        return None


def get_top_sellers(limit: int = 10) -> QuerySet:
    """Get top sellers by rating and sales count."""
    return (
        User.objects.filter(
            is_active=True,
            total_sales__gt=0,
            deleted_at__isnull=True,
        )
        .order_by("-rating", "-total_sales")[:limit]
    )
