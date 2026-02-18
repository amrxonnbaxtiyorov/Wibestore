"""
WibeStore Backend - Accounts Tests
"""

import pytest
from django.urls import reverse
from rest_framework import status


@pytest.mark.django_db
class TestRegistration:
    """Tests for user registration endpoint."""

    def test_register_success(self, api_client):
        url = reverse("accounts:register")
        data = {
            "email": "newuser@test.com",
            "username": "newuser",
            "password": "StrongPass123!",
            "password_confirm": "StrongPass123!",
            "full_name": "New User",
        }
        response = api_client.post(url, data, format="json")
        assert response.status_code == status.HTTP_201_CREATED
        assert response.data["success"] is True

    def test_register_duplicate_email(self, api_client, user):
        url = reverse("accounts:register")
        data = {
            "email": user.email,
            "username": "different",
            "password": "StrongPass123!",
            "password_confirm": "StrongPass123!",
        }
        response = api_client.post(url, data, format="json")
        assert response.status_code == status.HTTP_400_BAD_REQUEST

    def test_register_weak_password(self, api_client):
        url = reverse("accounts:register")
        data = {
            "email": "weak@test.com",
            "username": "weakuser",
            "password": "123",
            "password_confirm": "123",
        }
        response = api_client.post(url, data, format="json")
        assert response.status_code == status.HTTP_400_BAD_REQUEST

    def test_register_password_mismatch(self, api_client):
        url = reverse("accounts:register")
        data = {
            "email": "mismatch@test.com",
            "username": "mismatch",
            "password": "StrongPass123!",
            "password_confirm": "DifferentPass123!",
        }
        response = api_client.post(url, data, format="json")
        assert response.status_code == status.HTTP_400_BAD_REQUEST


@pytest.mark.django_db
class TestLogin:
    """Tests for user login endpoint."""

    def test_login_success(self, api_client, user):
        url = reverse("accounts:login")
        data = {
            "email": user.email,
            "password": "TestPass123!",
        }
        response = api_client.post(url, data, format="json")
        assert response.status_code == status.HTTP_200_OK
        assert "access" in response.data.get("data", {}).get("tokens", {})
        assert "refresh" in response.data.get("data", {}).get("tokens", {})

    def test_login_wrong_password(self, api_client, user):
        url = reverse("accounts:login")
        data = {
            "email": user.email,
            "password": "WrongPass123!",
        }
        response = api_client.post(url, data, format="json")
        assert response.status_code in [
            status.HTTP_400_BAD_REQUEST,
            status.HTTP_401_UNAUTHORIZED,
        ]

    def test_login_nonexistent_email(self, api_client):
        url = reverse("accounts:login")
        data = {
            "email": "nonexistent@test.com",
            "password": "TestPass123!",
        }
        response = api_client.post(url, data, format="json")
        assert response.status_code in [
            status.HTTP_400_BAD_REQUEST,
            status.HTTP_401_UNAUTHORIZED,
        ]


@pytest.mark.django_db
class TestMe:
    """Tests for the /auth/me/ endpoint."""

    def test_get_me(self, auth_client, verified_user):
        url = reverse("accounts:me")
        response = auth_client.get(url)
        assert response.status_code == status.HTTP_200_OK
        assert response.data["email"] == verified_user.email

    def test_get_me_unauthenticated(self, api_client):
        url = reverse("accounts:me")
        response = api_client.get(url)
        assert response.status_code == status.HTTP_401_UNAUTHORIZED

    def test_update_me(self, auth_client):
        url = reverse("accounts:me")
        data = {"full_name": "Updated Name"}
        response = auth_client.patch(url, data, format="json")
        assert response.status_code == status.HTTP_200_OK


@pytest.mark.django_db
class TestChangePassword:
    """Tests for the password change endpoint."""

    def test_change_password_success(self, auth_client, verified_user):
        url = reverse("accounts:password-change")
        data = {
            "old_password": "TestPass123!",
            "new_password": "NewStrongPass456!",
        }
        response = auth_client.post(url, data, format="json")
        assert response.status_code == status.HTTP_200_OK
        verified_user.refresh_from_db()
        assert verified_user.check_password("NewStrongPass456!")

    def test_change_password_wrong_old(self, auth_client):
        url = reverse("accounts:password-change")
        data = {
            "old_password": "WrongOldPass!",
            "new_password": "NewPass456!",
        }
        response = auth_client.post(url, data, format="json")
        assert response.status_code in [
            status.HTTP_400_BAD_REQUEST,
            status.HTTP_403_FORBIDDEN,
        ]


@pytest.mark.django_db
class TestPublicProfile:
    """Tests for the public user profile endpoint."""

    def test_get_public_profile(self, api_client, user):
        url = reverse("accounts:public-profile", kwargs={"pk": user.pk})
        response = api_client.get(url)
        assert response.status_code == status.HTTP_200_OK

    def test_get_nonexistent_profile(self, api_client):
        import uuid

        url = reverse("accounts:public-profile", kwargs={"pk": uuid.uuid4()})
        response = api_client.get(url)
        assert response.status_code == status.HTTP_404_NOT_FOUND
