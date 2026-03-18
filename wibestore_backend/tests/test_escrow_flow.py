"""
WibeStore Backend - Escrow Flow Tests (БЛОК 10)

Tests for the full EscrowTransaction lifecycle:
  pending_payment → paid → delivered → confirmed
  paid → disputed → refunded
  paid → cancelled
"""

from decimal import Decimal
from unittest.mock import patch

import pytest

from tests.factories import EscrowTransactionFactory, ListingFactory, UserFactory


# ---------------------------------------------------------------------------
# Helpers
# ---------------------------------------------------------------------------

def _make_approved_escrow(status="paid", seller_earnings=None):
    """Return an EscrowTransaction with an approved SellerVerification."""
    from apps.payments.models import SellerVerification

    escrow = EscrowTransactionFactory(
        status=status,
        seller_earnings=seller_earnings or Decimal("90000.00"),
        commission_amount=Decimal("10000.00"),
        amount=Decimal("100000.00"),
    )
    SellerVerification.objects.create(
        escrow=escrow,
        seller=escrow.seller,
        status=SellerVerification.STATUS_APPROVED,
    )
    return escrow


# ---------------------------------------------------------------------------
# create_escrow
# ---------------------------------------------------------------------------

@pytest.mark.django_db
class TestCreateEscrow:
    """Tests for EscrowService.create_escrow()."""

    def _funded_buyer(self, balance=Decimal("500000.00")):
        user = UserFactory(is_verified=True)
        user.balance = balance
        user.save(update_fields=["balance"])
        return user

    def test_create_escrow_success(self, db):
        from apps.payments.services import EscrowService

        listing = ListingFactory(status="active", price=Decimal("100000.00"))
        buyer = self._funded_buyer(balance=Decimal("200000.00"))

        with patch("apps.payments.services.notify_purchase_created"), \
             patch("apps.messaging.services.create_order_chat_for_escrow", return_value=None), \
             patch("apps.payments.tasks.release_escrow_payment.apply_async"):
            escrow = EscrowService.create_escrow(buyer=buyer, listing=listing)

        assert escrow.status == "paid"
        assert escrow.buyer == buyer
        assert escrow.seller == listing.seller
        buyer.refresh_from_db()
        assert buyer.balance == Decimal("100000.00")

    def test_create_escrow_insufficient_balance(self, db):
        from apps.payments.services import EscrowService
        from core.exceptions import InsufficientFundsError

        listing = ListingFactory(status="active", price=Decimal("100000.00"))
        buyer = self._funded_buyer(balance=Decimal("50000.00"))

        with pytest.raises(InsufficientFundsError):
            EscrowService.create_escrow(buyer=buyer, listing=listing)

    def test_create_escrow_cannot_buy_own_listing(self, db):
        from apps.payments.services import EscrowService
        from core.exceptions import BusinessLogicError

        listing = ListingFactory(status="active", price=Decimal("100000.00"))
        listing.seller.balance = Decimal("500000.00")
        listing.seller.save(update_fields=["balance"])

        with pytest.raises(BusinessLogicError, match="cannot buy your own"):
            EscrowService.create_escrow(buyer=listing.seller, listing=listing)

    def test_create_escrow_inactive_listing(self, db):
        from apps.payments.services import EscrowService
        from core.exceptions import BusinessLogicError

        listing = ListingFactory(status="sold", price=Decimal("100000.00"))
        buyer = self._funded_buyer()

        with pytest.raises(BusinessLogicError, match="not available"):
            EscrowService.create_escrow(buyer=buyer, listing=listing)


# ---------------------------------------------------------------------------
# seller_confirm_transfer
# ---------------------------------------------------------------------------

@pytest.mark.django_db
class TestSellerConfirmTransfer:
    """Tests for EscrowService.seller_confirm_transfer()."""

    def test_seller_confirm_transfer_success(self, db):
        from apps.payments.services import EscrowService

        escrow = EscrowTransactionFactory(status="paid")

        with patch("apps.payments.telegram_notify.notify_verification_request"), \
             patch("apps.payments.telegram_notify.notify_verification_submitted"):
            EscrowService.seller_confirm_transfer(escrow=escrow, seller=escrow.seller)

        escrow.refresh_from_db()
        # After confirm transfer the status stays 'paid'; a SellerVerification is created
        from apps.payments.models import SellerVerification
        assert SellerVerification.objects.filter(escrow=escrow).exists()

    def test_seller_confirm_transfer_wrong_seller(self, db):
        from apps.payments.services import EscrowService
        from core.exceptions import BusinessLogicError

        escrow = EscrowTransactionFactory(status="paid")
        other = UserFactory(is_verified=True)

        with pytest.raises(BusinessLogicError):
            EscrowService.seller_confirm_transfer(escrow=escrow, seller=other)

    def test_seller_confirm_transfer_wrong_status(self, db):
        from apps.payments.services import EscrowService
        from core.exceptions import BusinessLogicError

        escrow = EscrowTransactionFactory(status="delivered")

        with pytest.raises(BusinessLogicError, match="to'g'ri emas"):
            EscrowService.seller_confirm_transfer(escrow=escrow, seller=escrow.seller)


# ---------------------------------------------------------------------------
# release_payment
# ---------------------------------------------------------------------------

@pytest.mark.django_db
class TestReleasePayment:
    """Tests for EscrowService.release_payment()."""

    def test_release_payment_success(self, db):
        from apps.payments.services import EscrowService

        escrow = _make_approved_escrow(status="delivered")
        seller = escrow.seller
        initial_balance = seller.balance

        with patch("apps.payments.telegram_notify.notify_trade_completed"), \
             patch("apps.marketplace.services.ListingService.mark_as_sold"):
            EscrowService.release_payment(escrow)

        escrow.refresh_from_db()
        assert escrow.status == "confirmed"
        seller.refresh_from_db()
        assert seller.balance == initial_balance + Decimal("90000.00")

    def test_release_payment_requires_approved_verification(self, db):
        from apps.payments.services import EscrowService
        from core.exceptions import BusinessLogicError

        # No SellerVerification at all
        escrow = EscrowTransactionFactory(status="delivered")

        with pytest.raises(BusinessLogicError, match="tasdiqlanmagan"):
            EscrowService.release_payment(escrow)

    def test_release_payment_wrong_status(self, db):
        from apps.payments.services import EscrowService
        from core.exceptions import BusinessLogicError

        escrow = _make_approved_escrow(status="confirmed")

        with pytest.raises(BusinessLogicError, match="cannot be released"):
            EscrowService.release_payment(escrow)


# ---------------------------------------------------------------------------
# open_dispute
# ---------------------------------------------------------------------------

@pytest.mark.django_db
class TestOpenDispute:
    """Tests for EscrowService.open_dispute()."""

    def test_open_dispute_success(self, db):
        from apps.payments.services import EscrowService

        escrow = EscrowTransactionFactory(status="delivered")

        with patch("apps.payments.telegram_notify.notify_dispute_opened"):
            EscrowService.open_dispute(escrow=escrow, buyer=escrow.buyer, reason="Bad account")

        escrow.refresh_from_db()
        assert escrow.status == "disputed"

    def test_open_dispute_wrong_buyer(self, db):
        from apps.payments.services import EscrowService
        from core.exceptions import BusinessLogicError

        escrow = EscrowTransactionFactory(status="delivered")
        other = UserFactory(is_verified=True)

        with pytest.raises(BusinessLogicError):
            EscrowService.open_dispute(escrow=escrow, buyer=other, reason="Test")

    def test_open_dispute_wrong_status(self, db):
        from apps.payments.services import EscrowService
        from core.exceptions import BusinessLogicError

        escrow = EscrowTransactionFactory(status="paid")

        with pytest.raises(BusinessLogicError):
            EscrowService.open_dispute(escrow=escrow, buyer=escrow.buyer, reason="Test")


# ---------------------------------------------------------------------------
# refund_escrow
# ---------------------------------------------------------------------------

@pytest.mark.django_db
class TestRefundEscrow:
    """Tests for EscrowService.refund_escrow()."""

    def test_refund_escrow_success(self, db):
        from apps.payments.services import EscrowService

        escrow = EscrowTransactionFactory(
            status="disputed",
            amount=Decimal("100000.00"),
        )
        buyer = escrow.buyer
        initial_balance = buyer.balance
        admin = UserFactory(is_staff=True, is_verified=True)

        with patch("apps.payments.telegram_notify.notify_trade_cancelled"):
            EscrowService.refund_escrow(escrow=escrow, admin_user=admin, resolution="Test refund")

        escrow.refresh_from_db()
        assert escrow.status == "refunded"
        buyer.refresh_from_db()
        assert buyer.balance == initial_balance + Decimal("100000.00")

    def test_refund_requires_disputed_status(self, db):
        from apps.payments.services import EscrowService
        from core.exceptions import BusinessLogicError

        escrow = EscrowTransactionFactory(status="paid")
        admin = UserFactory(is_staff=True, is_verified=True)

        with pytest.raises(BusinessLogicError):
            EscrowService.refund_escrow(escrow=escrow, admin_user=admin, resolution="Forced")


# ---------------------------------------------------------------------------
# cancel_trade_by_party
# ---------------------------------------------------------------------------

@pytest.mark.django_db
class TestCancelTradeByParty:
    """Tests for EscrowService.cancel_trade_by_party()."""

    def test_buyer_cancel_paid_trade(self, db):
        from apps.payments.services import EscrowService

        escrow = EscrowTransactionFactory(
            status="paid",
            amount=Decimal("100000.00"),
        )
        buyer = escrow.buyer
        initial_balance = buyer.balance

        with patch("apps.payments.telegram_notify.notify_trade_cancelled"):
            EscrowService.cancel_trade_by_party(escrow=escrow, side="buyer")

        escrow.refresh_from_db()
        assert escrow.status == "refunded"
        buyer.refresh_from_db()
        assert buyer.balance == initial_balance + Decimal("100000.00")

    def test_seller_cancel_paid_trade(self, db):
        from apps.payments.services import EscrowService

        escrow = EscrowTransactionFactory(
            status="paid",
            amount=Decimal("100000.00"),
        )
        buyer = escrow.buyer
        initial_balance = buyer.balance

        with patch("apps.payments.telegram_notify.notify_trade_cancelled"):
            EscrowService.cancel_trade_by_party(escrow=escrow, side="seller")

        escrow.refresh_from_db()
        assert escrow.status == "refunded"
        buyer.refresh_from_db()
        assert buyer.balance == initial_balance + Decimal("100000.00")

    def test_cancel_already_confirmed_trade_raises(self, db):
        from apps.payments.services import EscrowService
        from core.exceptions import BusinessLogicError

        escrow = EscrowTransactionFactory(status="confirmed")

        with pytest.raises(BusinessLogicError):
            EscrowService.cancel_trade_by_party(escrow=escrow, side="buyer")


# ---------------------------------------------------------------------------
# process_trade_confirmation
# ---------------------------------------------------------------------------

@pytest.mark.django_db
class TestProcessTradeConfirmation:
    """Tests for EscrowService.process_trade_confirmation()."""

    def test_buyer_confirm_releases_payment(self, db):
        from apps.payments.services import EscrowService

        escrow = _make_approved_escrow(status="delivered")

        with patch("apps.payments.telegram_notify.notify_trade_completed"), \
             patch("apps.marketplace.services.ListingService.mark_as_sold"), \
             patch("apps.payments.telegram_notify.notify_buyer_confirmed"):
            result, msg = EscrowService.process_trade_confirmation(escrow=escrow, side="buyer")

        escrow.refresh_from_db()
        assert escrow.status == "confirmed"

    def test_seller_confirm_creates_verification(self, db):
        from apps.payments.services import EscrowService
        from apps.payments.models import SellerVerification

        escrow = EscrowTransactionFactory(status="paid")

        with patch("apps.payments.telegram_notify.notify_verification_request"), \
             patch("apps.payments.telegram_notify.notify_verification_submitted"):
            EscrowService.process_trade_confirmation(escrow=escrow, side="seller")

        assert SellerVerification.objects.filter(escrow=escrow).exists()


# ---------------------------------------------------------------------------
# API endpoint smoke tests
# ---------------------------------------------------------------------------

@pytest.mark.django_db
class TestEscrowAPIEndpoints:
    """Smoke tests for escrow-related API endpoints."""

    def test_escrow_seller_confirm_unauthenticated(self, api_client, db):
        from django.urls import reverse

        escrow = EscrowTransactionFactory(status="paid")
        url = reverse("payments:escrow-seller-confirm", kwargs={"pk": escrow.pk})
        response = api_client.post(url)
        assert response.status_code == 401

    def test_escrow_confirm_delivery_unauthenticated(self, api_client, db):
        from django.urls import reverse

        escrow = EscrowTransactionFactory(status="delivered")
        url = reverse("payments:escrow-confirm", kwargs={"pk": escrow.pk})
        response = api_client.post(url)
        assert response.status_code == 401

    def test_escrow_dispute_unauthenticated(self, api_client, db):
        from django.urls import reverse

        escrow = EscrowTransactionFactory(status="delivered")
        url = reverse("payments:escrow-dispute", kwargs={"pk": escrow.pk})
        response = api_client.post(url, {"reason": "test"}, format="json")
        assert response.status_code == 401

    def test_escrow_seller_confirm_as_wrong_user(self, auth_client, db):
        from django.urls import reverse

        # auth_client is a different user than the seller
        escrow = EscrowTransactionFactory(status="paid")
        url = reverse("payments:escrow-seller-confirm", kwargs={"pk": escrow.pk})
        response = auth_client.post(url)
        # Should return 403 or 400 (not the seller)
        assert response.status_code in [400, 403, 404]

    def test_escrow_confirm_delivery_as_wrong_user(self, auth_client, db):
        from django.urls import reverse

        escrow = EscrowTransactionFactory(status="delivered")
        url = reverse("payments:escrow-confirm", kwargs={"pk": escrow.pk})
        response = auth_client.post(url)
        assert response.status_code in [400, 403, 404]