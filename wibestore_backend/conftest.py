"""
WibeStore Backend - Pytest Configuration and Fixtures
"""

import pytest
from rest_framework.test import APIClient


@pytest.fixture
def api_client():
    """Return an unauthenticated DRF API client."""
    return APIClient()


@pytest.fixture
def user_factory(db):
    """Return a factory function to create users."""
    from tests.factories import UserFactory

    return UserFactory


@pytest.fixture
def user(db):
    """Create and return a regular user."""
    from tests.factories import UserFactory

    return UserFactory()


@pytest.fixture
def verified_user(db):
    """Create and return a verified user."""
    from tests.factories import UserFactory

    return UserFactory(is_verified=True)


@pytest.fixture
def admin_user(db):
    """Create and return an admin user."""
    from tests.factories import UserFactory

    return UserFactory(is_staff=True, is_verified=True)


@pytest.fixture
def superuser(db):
    """Create and return a superuser."""
    from tests.factories import UserFactory

    return UserFactory(is_staff=True, is_superuser=True, is_verified=True)


@pytest.fixture
def auth_client(verified_user, api_client):
    """Return an authenticated API client for a verified user."""
    api_client.force_authenticate(user=verified_user)
    return api_client


@pytest.fixture
def admin_client(admin_user, api_client):
    """Return an authenticated API client for an admin user."""
    api_client.force_authenticate(user=admin_user)
    return api_client


@pytest.fixture
def game(db):
    """Create and return a game."""
    from tests.factories import GameFactory

    return GameFactory()


@pytest.fixture
def category(db):
    """Create and return a category."""
    from tests.factories import CategoryFactory

    return CategoryFactory()


@pytest.fixture
def listing(db, verified_user, game):
    """Create and return a listing."""
    from tests.factories import ListingFactory

    return ListingFactory(seller=verified_user, game=game)


@pytest.fixture
def subscription_plan(db):
    """Create and return a free subscription plan."""
    from tests.factories import SubscriptionPlanFactory

    return SubscriptionPlanFactory()


@pytest.fixture
def payment_method(db):
    """Create and return a payment method."""
    from tests.factories import PaymentMethodFactory

    return PaymentMethodFactory()
