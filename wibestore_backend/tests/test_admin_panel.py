"""
WibeStore Backend - Admin Panel Tests
"""

import pytest
from django.urls import reverse
from rest_framework import status

from tests.factories import ListingFactory, ReportFactory


@pytest.mark.django_db
class TestAdminDashboard:
    """Tests for admin dashboard endpoint."""

    def test_dashboard_as_admin(self, admin_client):
        url = reverse("admin_panel:dashboard")
        response = admin_client.get(url)
        assert response.status_code == status.HTTP_200_OK
        assert response.data["success"] is True
        assert "users" in response.data["data"]
        assert "listings" in response.data["data"]

    def test_dashboard_as_regular_user(self, auth_client):
        url = reverse("admin_panel:dashboard")
        response = auth_client.get(url)
        assert response.status_code == status.HTTP_403_FORBIDDEN

    def test_dashboard_unauthenticated(self, api_client):
        url = reverse("admin_panel:dashboard")
        response = api_client.get(url)
        assert response.status_code == status.HTTP_401_UNAUTHORIZED


@pytest.mark.django_db
class TestAdminPendingListings:
    """Tests for admin pending listings endpoint."""

    def test_pending_listings(self, admin_client):
        ListingFactory.create_batch(3, status="pending")
        url = reverse("admin_panel:pending-listings")
        response = admin_client.get(url)
        assert response.status_code == status.HTTP_200_OK

    def test_approve_listing(self, admin_client):
        listing = ListingFactory(status="pending")
        url = reverse("admin_panel:approve-listing", kwargs={"pk": listing.pk})
        response = admin_client.post(url)
        assert response.status_code == status.HTTP_200_OK

    def test_reject_listing(self, admin_client):
        listing = ListingFactory(status="pending")
        url = reverse("admin_panel:reject-listing", kwargs={"pk": listing.pk})
        data = {"reason": "Inappropriate content"}
        response = admin_client.post(url, data, format="json")
        assert response.status_code == status.HTTP_200_OK


@pytest.mark.django_db
class TestAdminReports:
    """Tests for admin reports management."""

    def test_list_reports(self, admin_client):
        ReportFactory.create_batch(3)
        url = reverse("admin_panel:reports")
        response = admin_client.get(url)
        assert response.status_code == status.HTTP_200_OK

    def test_resolve_report(self, admin_client):
        report = ReportFactory()
        url = reverse("admin_panel:resolve-report", kwargs={"pk": report.pk})
        data = {"action": "resolve", "note": "Issue addressed."}
        response = admin_client.post(url, data, format="json")
        assert response.status_code == status.HTTP_200_OK


@pytest.mark.django_db
class TestAdminUsers:
    """Tests for admin user management."""

    def test_list_users(self, admin_client):
        url = reverse("admin_panel:users")
        response = admin_client.get(url)
        assert response.status_code == status.HTTP_200_OK

    def test_ban_user(self, admin_client, user):
        url = reverse("admin_panel:user-ban", kwargs={"pk": user.pk})
        data = {"action": "ban"}
        response = admin_client.post(url, data, format="json")
        assert response.status_code == status.HTTP_200_OK
        user.refresh_from_db()
        assert user.is_active is False

    def test_unban_user(self, admin_client, user):
        user.is_active = False
        user.save()
        url = reverse("admin_panel:user-ban", kwargs={"pk": user.pk})
        data = {"action": "unban"}
        response = admin_client.post(url, data, format="json")
        assert response.status_code == status.HTTP_200_OK
        user.refresh_from_db()
        assert user.is_active is True
