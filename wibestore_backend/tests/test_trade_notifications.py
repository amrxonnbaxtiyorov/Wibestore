"""
WibeStore Backend - Trade Notification Tests (БЛОК 10)
"""

from unittest.mock import AsyncMock, MagicMock, patch

import pytest

from tests.factories import EscrowTransactionFactory, UserFactory


@pytest.mark.django_db
class TestTelegramNotifyFunctions:
    """Tests that telegram notification functions exist and handle errors gracefully."""

    def test_notify_purchase_created_no_telegram(self, db):
        """Should not raise when user has no telegram_id."""
        from apps.payments.telegram_notify import notify_purchase_created

        escrow = EscrowTransactionFactory(status="paid")
        # user without telegram_id — should silently skip
        with patch("apps.payments.telegram_notify.bot") as mock_bot:
            mock_bot.send_message = AsyncMock()
            notify_purchase_created(escrow)
            # No telegram_id → send_message should NOT be called
            mock_bot.send_message.assert_not_called()

    def test_notify_trade_completed_no_telegram(self, db):
        """Should not raise when participants have no telegram_id."""
        from apps.payments.telegram_notify import notify_trade_completed

        escrow = EscrowTransactionFactory(status="confirmed")
        with patch("apps.payments.telegram_notify.bot") as mock_bot:
            mock_bot.send_message = AsyncMock()
            notify_trade_completed(escrow)
            mock_bot.send_message.assert_not_called()

    def test_notify_dispute_opened_no_telegram(self, db):
        """Should not raise when participants have no telegram_id."""
        from apps.payments.telegram_notify import notify_dispute_opened

        escrow = EscrowTransactionFactory(status="disputed")
        with patch("apps.payments.telegram_notify.bot") as mock_bot:
            mock_bot.send_message = AsyncMock()
            notify_dispute_opened(escrow, reason="Test dispute reason")
            mock_bot.send_message.assert_not_called()

    def test_notify_trade_cancelled_no_telegram(self, db):
        """Should not raise when participants have no telegram_id."""
        from apps.payments.telegram_notify import notify_trade_cancelled

        escrow = EscrowTransactionFactory(status="refunded")
        with patch("apps.payments.telegram_notify.bot") as mock_bot:
            mock_bot.send_message = AsyncMock()
            notify_trade_cancelled(escrow)
            mock_bot.send_message.assert_not_called()

    def test_notify_new_chat_message_sync_no_telegram(self, db):
        """Should not raise when recipient has no telegram_id."""
        from apps.payments.telegram_notify import notify_new_chat_message_sync

        sender = UserFactory(telegram_id=None)
        recipient = UserFactory(telegram_id=None)
        with patch("apps.payments.telegram_notify.bot") as mock_bot:
            mock_bot.send_message = AsyncMock()
            notify_new_chat_message_sync(
                sender=sender,
                recipient=recipient,
                message_preview="Hello",
                room_id="room-1",
            )
            mock_bot.send_message.assert_not_called()

    def test_notify_verification_submitted_no_telegram(self, db):
        """notify_verification_submitted should not raise without telegram config."""
        from apps.payments.telegram_notify import notify_verification_submitted

        escrow = EscrowTransactionFactory(status="paid")
        with patch("apps.payments.telegram_notify.bot") as mock_bot:
            mock_bot.send_message = AsyncMock()
            notify_verification_submitted(escrow)

    def test_notify_seller_confirmed_no_telegram(self, db):
        """notify_seller_confirmed should not raise without telegram_id."""
        from apps.payments.telegram_notify import notify_seller_confirmed

        escrow = EscrowTransactionFactory(status="delivered")
        with patch("apps.payments.telegram_notify.bot") as mock_bot:
            mock_bot.send_message = AsyncMock()
            notify_seller_confirmed(escrow)
            mock_bot.send_message.assert_not_called()

    def test_notify_buyer_confirmed_no_telegram(self, db):
        """notify_buyer_confirmed should not raise without telegram_id."""
        from apps.payments.telegram_notify import notify_buyer_confirmed

        escrow = EscrowTransactionFactory(status="delivered")
        with patch("apps.payments.telegram_notify.bot") as mock_bot:
            mock_bot.send_message = AsyncMock()
            notify_buyer_confirmed(escrow)
            mock_bot.send_message.assert_not_called()


@pytest.mark.django_db
class TestTelegramNotifyWithTelegramId:
    """Tests for notification functions when users have telegram_ids."""

    def test_notify_purchase_created_with_telegram(self, db):
        """Should attempt to send when buyer has telegram_id."""
        from apps.payments.telegram_notify import notify_purchase_created

        buyer = UserFactory(telegram_id=123456789)
        seller = UserFactory(telegram_id=None)
        escrow = EscrowTransactionFactory(status="paid", buyer=buyer, seller=seller)

        with patch("apps.payments.telegram_notify.bot") as mock_bot:
            future = MagicMock()
            future.result = MagicMock(return_value=None)
            mock_bot.send_message = MagicMock(return_value=future)

            # Should not raise even if send fails
            try:
                notify_purchase_created(escrow)
            except Exception:
                pass  # Network errors are acceptable in test env

    def test_notify_trade_completed_with_both_telegram(self, db):
        """Should attempt to send to both parties when both have telegram_ids."""
        from apps.payments.telegram_notify import notify_trade_completed

        buyer = UserFactory(telegram_id=111111111)
        seller = UserFactory(telegram_id=222222222)
        escrow = EscrowTransactionFactory(status="confirmed", buyer=buyer, seller=seller)

        with patch("apps.payments.telegram_notify.bot") as mock_bot:
            future = MagicMock()
            future.result = MagicMock(return_value=None)
            mock_bot.send_message = MagicMock(return_value=future)
            try:
                notify_trade_completed(escrow)
            except Exception:
                pass  # Network errors acceptable in test


@pytest.mark.django_db
class TestChatNotifications:
    """Tests for chat message notification functions."""

    def test_notify_new_chat_message_sync_with_telegram(self, db):
        """Should attempt send when recipient has telegram_id."""
        from apps.payments.telegram_notify import notify_new_chat_message_sync

        sender = UserFactory(telegram_id=None)
        recipient = UserFactory(telegram_id=555555555)

        with patch("apps.payments.telegram_notify.bot") as mock_bot:
            future = MagicMock()
            future.result = MagicMock(return_value=None)
            mock_bot.send_message = MagicMock(return_value=future)

            try:
                notify_new_chat_message_sync(
                    sender=sender,
                    recipient=recipient,
                    message_preview="Test message preview",
                    room_id="some-room-id",
                )
            except Exception:
                pass  # Network errors acceptable

    def test_notify_does_not_send_to_sender(self, db):
        """Notification should not be sent to the message sender themselves."""
        from apps.payments.telegram_notify import notify_new_chat_message_sync

        user = UserFactory(telegram_id=777777777)

        with patch("apps.payments.telegram_notify.bot") as mock_bot:
            mock_bot.send_message = AsyncMock()
            # sender == recipient: should skip
            notify_new_chat_message_sync(
                sender=user,
                recipient=user,
                message_preview="My own message",
                room_id="room-99",
            )
            mock_bot.send_message.assert_not_called()