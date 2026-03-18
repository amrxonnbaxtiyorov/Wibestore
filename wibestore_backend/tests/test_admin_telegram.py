"""
WibeStore Backend - Admin Telegram Analytics Tests (БЛОК 10)
"""

import pytest
from django.urls import reverse
from rest_framework import status

from tests.factories import UserFactory, EscrowTransactionFactory, TransactionFactory


@pytest.mark.django_db
class TestAdminTelegramStats:
    """Tests for admin telegram stats endpoint."""

    def test_stats_as_admin(self, admin_client):
        url = reverse("admin_panel:admin-telegram-stats")
        response = admin_client.get(url)
        assert response.status_code == status.HTTP_200_OK
        assert response.data["success"] is True
        data = response.data["data"]
        assert "total_users" in data
        assert "active_users" in data

    def test_stats_as_regular_user(self, auth_client):
        url = reverse("admin_panel:admin-telegram-stats")
        response = auth_client.get(url)
        assert response.status_code == status.HTTP_403_FORBIDDEN

    def test_stats_unauthenticated(self, api_client):
        url = reverse("admin_panel:admin-telegram-stats")
        response = api_client.get(url)
        assert response.status_code == status.HTTP_401_UNAUTHORIZED


@pytest.mark.django_db
class TestAdminTelegramUsers:
    """Tests for admin telegram users list endpoint."""

    def test_list_telegram_users(self, admin_client):
        # Create users with telegram IDs
        UserFactory.create_batch(3, telegram_id=None)
        UserFactory(telegram_id=111111)
        UserFactory(telegram_id=222222)
        url = reverse("admin_panel:admin-telegram-users")
        response = admin_client.get(url)
        assert response.status_code == status.HTTP_200_OK
        assert response.data["success"] is True

    def test_filter_telegram_users_by_telegram_id(self, admin_client):
        UserFactory(telegram_id=999999)
        url = reverse("admin_panel:admin-telegram-users")
        response = admin_client.get(url, {"telegram_id": "999999"})
        assert response.status_code == status.HTTP_200_OK

    def test_list_forbidden_for_non_admin(self, auth_client):
        url = reverse("admin_panel:admin-telegram-users")
        response = auth_client.get(url)
        assert response.status_code == status.HTTP_403_FORBIDDEN


@pytest.mark.django_db
class TestAdminTelegramUserDetail:
    """Tests for admin telegram user detail endpoint."""

    def test_get_user_with_telegram(self, admin_client):
        user = UserFactory(telegram_id=777777)
        url = reverse("admin_panel:admin-telegram-user-detail", kwargs={"telegram_id": 777777})
        response = admin_client.get(url)
        assert response.status_code == status.HTTP_200_OK
        assert response.data["success"] is True

    def test_get_nonexistent_telegram_user(self, admin_client):
        url = reverse("admin_panel:admin-telegram-user-detail", kwargs={"telegram_id": 999000})
        response = admin_client.get(url)
        assert response.status_code == status.HTTP_404_NOT_FOUND

    def test_detail_forbidden_for_non_admin(self, auth_client):
        UserFactory(telegram_id=888888)
        url = reverse("admin_panel:admin-telegram-user-detail", kwargs={"telegram_id": 888888})
        response = auth_client.get(url)
        assert response.status_code == status.HTTP_403_FORBIDDEN


@pytest.mark.django_db
class TestAdminTelegramRegistrationsByDate:
    """Tests for telegram registrations by date endpoint."""

    def test_registrations_by_date(self, admin_client):
        url = reverse("admin_panel:admin-telegram-registrations-by-date")
        response = admin_client.get(url)
        assert response.status_code == status.HTTP_200_OK
        assert response.data["success"] is True

    def test_registrations_forbidden_for_non_admin(self, auth_client):
        url = reverse("admin_panel:admin-telegram-registrations-by-date")
        response = auth_client.get(url)
        assert response.status_code == status.HTTP_403_FORBIDDEN


@pytest.mark.django_db
class TestAdminDeposits:
    """Tests for admin deposits endpoints."""

    def test_list_deposits(self, admin_client):
        url = reverse("admin_panel:admin-deposits")
        response = admin_client.get(url)
        assert response.status_code == status.HTTP_200_OK
        assert response.data["success"] is True

    def test_deposit_stats(self, admin_client):
        url = reverse("admin_panel:admin-deposit-stats")
        response = admin_client.get(url)
        assert response.status_code == status.HTTP_200_OK
        assert response.data["success"] is True

    def test_deposits_forbidden_for_non_admin(self, auth_client):
        url = reverse("admin_panel:admin-deposits")
        response = auth_client.get(url)
        assert response.status_code == status.HTTP_403_FORBIDDEN


@pytest.mark.django_db
class TestAdminTrades:
    """Tests for admin trades endpoints."""

    def test_list_trades(self, admin_client):
        url = reverse("admin_panel:admin-trades")
        response = admin_client.get(url)
        assert response.status_code == status.HTTP_200_OK
        assert response.data["success"] is True

    def test_trade_stats(self, admin_client):
        url = reverse("admin_panel:admin-trade-stats")
        response = admin_client.get(url)
        assert response.status_code == status.HTTP_200_OK
        assert response.data["success"] is True

    def test_trade_detail(self, admin_client, db):
        escrow = EscrowTransactionFactory()
        url = reverse("admin_panel:admin-trade-detail", kwargs={"pk": escrow.pk})
        response = admin_client.get(url)
        assert response.status_code == status.HTTP_200_OK
        assert response.data["success"] is True

    def test_trade_detail_forbidden_for_non_admin(self, auth_client, db):
        escrow = EscrowTransactionFactory()
        url = reverse("admin_panel:admin-trade-detail", kwargs={"pk": escrow.pk})
        response = auth_client.get(url)
        assert response.status_code == status.HTTP_403_FORBIDDEN

    def test_admin_trade_complete_requires_paid_status(self, admin_client, db):
        # pending_payment status — should fail
        escrow = EscrowTransactionFactory(status="pending_payment")
        url = reverse("admin_panel:admin-trade-complete", kwargs={"pk": escrow.pk})
        response = admin_client.post(url)
        assert response.status_code in [
            status.HTTP_400_BAD_REQUEST,
            status.HTTP_422_UNPROCESSABLE_ENTITY,
        ]

    def test_admin_trade_refund_requires_disputed_or_paid_status(self, admin_client, db):
        # pending_payment status — should fail
        escrow = EscrowTransactionFactory(status="pending_payment")
        url = reverse("admin_panel:admin-trade-refund", kwargs={"pk": escrow.pk})
        response = admin_client.post(url)
        assert response.status_code in [
            status.HTTP_400_BAD_REQUEST,
            status.HTTP_422_UNPROCESSABLE_ENTITY,
        ]