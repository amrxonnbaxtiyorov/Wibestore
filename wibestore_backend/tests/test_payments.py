"""
WibeStore Backend - Payments Tests
"""

import pytest
from django.urls import reverse
from rest_framework import status


@pytest.mark.django_db
class TestBalance:
    """Tests for balance endpoint."""

    def test_get_balance(self, auth_client, verified_user):
        url = reverse("payments:balance")
        response = auth_client.get(url)
        assert response.status_code == status.HTTP_200_OK
        assert response.data["success"] is True
        assert "balance" in response.data["data"]

    def test_get_balance_unauthenticated(self, api_client):
        url = reverse("payments:balance")
        response = api_client.get(url)
        assert response.status_code == status.HTTP_401_UNAUTHORIZED


@pytest.mark.django_db
class TestPaymentMethods:
    """Tests for payment methods list endpoint."""

    def test_list_payment_methods(self, api_client, payment_method):
        url = reverse("payments:payment-methods")
        response = api_client.get(url)
        assert response.status_code == status.HTTP_200_OK


@pytest.mark.django_db
class TestTransactions:
    """Tests for transaction list endpoint."""

    def test_list_transactions(self, auth_client):
        url = reverse("payments:transaction-list")
        response = auth_client.get(url)
        assert response.status_code == status.HTTP_200_OK

    def test_list_transactions_unauthenticated(self, api_client):
        url = reverse("payments:transaction-list")
        response = api_client.get(url)
        assert response.status_code == status.HTTP_401_UNAUTHORIZED


@pytest.mark.django_db
class TestDeposit:
    """Tests for deposit endpoint."""

    def test_deposit(self, auth_client, payment_method):
        url = reverse("payments:deposit")
        data = {
            "amount": "100000.00",
            "payment_method_id": str(payment_method.id),
        }
        response = auth_client.post(url, data, format="json")
        assert response.status_code in [
            status.HTTP_200_OK,
            status.HTTP_201_CREATED,
        ]
