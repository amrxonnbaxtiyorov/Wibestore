"""
WibeStore Backend - Reports Tests
"""

import pytest
from django.urls import reverse
from rest_framework import status

from tests.factories import UserFactory


@pytest.mark.django_db
class TestCreateReport:
    """Tests for creating a report."""

    def test_create_report_user(self, auth_client):
        reported_user = UserFactory()
        url = reverse("reports:create-report")
        data = {
            "reported_user_id": str(reported_user.id),
            "reason": "fraud",
            "description": "This user is a scammer.",
        }
        response = auth_client.post(url, data, format="json")
        assert response.status_code == status.HTTP_201_CREATED

    def test_create_report_unauthenticated(self, api_client):
        url = reverse("reports:create-report")
        response = api_client.post(url, {}, format="json")
        assert response.status_code == status.HTTP_401_UNAUTHORIZED


@pytest.mark.django_db
class TestMyReports:
    """Tests for viewing own reports."""

    def test_list_my_reports(self, auth_client):
        url = reverse("reports:my-reports")
        response = auth_client.get(url)
        assert response.status_code == status.HTTP_200_OK

    def test_list_my_reports_unauthenticated(self, api_client):
        url = reverse("reports:my-reports")
        response = api_client.get(url)
        assert response.status_code == status.HTTP_401_UNAUTHORIZED
