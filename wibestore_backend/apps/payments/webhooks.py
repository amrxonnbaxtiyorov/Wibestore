"""
WibeStore Backend - Payment Webhooks
Process incoming webhooks from payment providers (Google Pay, Visa, Mastercard, Apple Pay).
"""

import logging

from .models import Transaction
from .services import PaymentService

logger = logging.getLogger("apps.payments")

CARD_PROVIDERS = ("google_pay", "visa", "mastercard", "apple_pay")


def process_webhook(provider: str, data: dict) -> dict:
    """Route webhook to the appropriate handler."""
    if provider in CARD_PROVIDERS:
        return _handle_card_webhook(provider, data)
    raise ValueError(f"Unknown payment provider: {provider}")


def _handle_card_webhook(provider: str, data: dict) -> dict:
    """Handle webhook for Google Pay, Visa, Mastercard, Apple Pay."""
    logger.info("%s webhook received: %s", provider, data)
    transaction_id = data.get("transaction_id") or data.get("order_id") or data.get("id")
    if transaction_id:
        try:
            txn = Transaction.objects.get(id=transaction_id, status="pending")
            PaymentService.complete_deposit(txn)
            txn.provider_transaction_id = str(data.get("provider_transaction_id", ""))
            txn.save(update_fields=["provider_transaction_id"])
            return {"status": "ok", "message": "Payment completed"}
        except Transaction.DoesNotExist:
            return {"status": "error", "message": "Transaction not found"}
    return {"status": "ok"}
