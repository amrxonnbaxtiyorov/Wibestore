"""
WibeStore Backend - Notifications Tests
"""

import pytest
from django.urls import reverse
from rest_framework import status

from tests.factories import NotificationFactory


@pytest.mark.django_db
class TestNotificationList:
    """Tests for notification list endpoint."""

    def test_list_notifications(self, auth_client, verified_user):
        NotificationFactory.create_batch(3, user=verified_user)
        url = reverse("notifications:notification-list")
        response = auth_client.get(url)
        assert response.status_code == status.HTTP_200_OK

    def test_list_notifications_unauthenticated(self, api_client):
        url = reverse("notifications:notification-list")
        response = api_client.get(url)
        assert response.status_code == status.HTTP_401_UNAUTHORIZED


@pytest.mark.django_db
class TestMarkRead:
    """Tests for marking notifications as read."""

    def test_mark_notification_read(self, auth_client, verified_user):
        notification = NotificationFactory(user=verified_user)
        url = reverse("notifications:mark-read", kwargs={"pk": notification.pk})
        response = auth_client.post(url)
        assert response.status_code == status.HTTP_200_OK
        assert response.data["success"] is True

    def test_mark_all_read(self, auth_client, verified_user):
        NotificationFactory.create_batch(5, user=verified_user)
        url = reverse("notifications:mark-all-read")
        response = auth_client.post(url)
        assert response.status_code == status.HTTP_200_OK
        assert response.data["success"] is True


@pytest.mark.django_db
class TestUnreadCount:
    """Tests for unread count endpoint."""

    def test_unread_count(self, auth_client, verified_user):
        NotificationFactory.create_batch(3, user=verified_user, is_read=False)
        NotificationFactory.create_batch(2, user=verified_user, is_read=True)
        url = reverse("notifications:unread-count")
        response = auth_client.get(url)
        assert response.status_code == status.HTTP_200_OK
        assert response.data["unread_count"] == 3
