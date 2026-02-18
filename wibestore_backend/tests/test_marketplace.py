"""
WibeStore Backend - Marketplace Tests
"""

import pytest
from django.urls import reverse
from rest_framework import status


@pytest.mark.django_db
class TestListingList:
    """Tests for listing list endpoint."""

    def test_list_active_listings(self, api_client, listing):
        url = reverse("marketplace:listing-list-create")
        response = api_client.get(url)
        assert response.status_code == status.HTTP_200_OK

    def test_list_listings_unauthenticated(self, api_client):
        url = reverse("marketplace:listing-list-create")
        response = api_client.get(url)
        assert response.status_code == status.HTTP_200_OK


@pytest.mark.django_db
class TestListingCreate:
    """Tests for creating a listing."""

    def test_create_listing_authenticated(self, auth_client, game):
        url = reverse("marketplace:listing-list-create")
        data = {
            "game_id": str(game.id),
            "title": "My Game Account",
            "description": "Level 99 account with rare items",
            "price": "500000.00",
            "level": "99",
            "rank": "Diamond",
        }
        response = auth_client.post(url, data, format="json")
        assert response.status_code == status.HTTP_201_CREATED

    def test_create_listing_unauthenticated(self, api_client, game):
        url = reverse("marketplace:listing-list-create")
        data = {
            "game_id": str(game.id),
            "title": "My Game Account",
            "description": "Level 99 account",
            "price": "500000.00",
        }
        response = api_client.post(url, data, format="json")
        assert response.status_code == status.HTTP_401_UNAUTHORIZED


@pytest.mark.django_db
class TestListingDetail:
    """Tests for listing detail endpoint."""

    def test_get_listing(self, api_client, listing):
        url = reverse("marketplace:listing-detail", kwargs={"pk": listing.pk})
        response = api_client.get(url)
        assert response.status_code == status.HTTP_200_OK
        assert response.data["title"] == listing.title

    def test_get_nonexistent_listing(self, api_client):
        import uuid

        url = reverse("marketplace:listing-detail", kwargs={"pk": uuid.uuid4()})
        response = api_client.get(url)
        assert response.status_code == status.HTTP_404_NOT_FOUND


@pytest.mark.django_db
class TestFavorite:
    """Tests for favorite toggle endpoint."""

    def test_toggle_favorite(self, auth_client, listing):
        url = reverse("marketplace:listing-favorite", kwargs={"pk": listing.pk})
        # Add favorite
        response = auth_client.post(url)
        assert response.status_code == status.HTTP_200_OK
        # Remove favorite
        response = auth_client.post(url)
        assert response.status_code == status.HTTP_200_OK
