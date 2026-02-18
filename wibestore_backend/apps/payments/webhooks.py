"""
WibeStore Backend - Payment Webhooks
Process incoming webhooks from payment providers (Payme, Click, Paynet).
"""

import hashlib
import hmac
import logging

from django.conf import settings

from .models import Transaction
from .services import PaymentService

logger = logging.getLogger("apps.payments")


def process_webhook(provider: str, data: dict) -> dict:
    """Route webhook to the appropriate handler."""
    handlers = {
        "payme": _handle_payme_webhook,
        "click": _handle_click_webhook,
        "paynet": _handle_paynet_webhook,
    }

    handler = handlers.get(provider)
    if not handler:
        raise ValueError(f"Unknown payment provider: {provider}")

    return handler(data)


def _handle_payme_webhook(data: dict) -> dict:
    """Handle Payme webhook."""
    logger.info("Payme webhook received: %s", data)

    method = data.get("method")
    params = data.get("params", {})

    if method == "CheckPerformTransaction":
        # Validate transaction
        transaction_id = params.get("account", {}).get("transaction_id")
        try:
            txn = Transaction.objects.get(id=transaction_id, status="pending")
            return {
                "result": {
                    "allow": True,
                    "additional": {"transaction_id": str(txn.id)},
                }
            }
        except Transaction.DoesNotExist:
            return {"error": {"code": -31050, "message": "Transaction not found"}}

    elif method == "PerformTransaction":
        transaction_id = params.get("account", {}).get("transaction_id")
        try:
            txn = Transaction.objects.get(id=transaction_id)
            PaymentService.complete_deposit(txn)
            return {"result": {"transaction": str(txn.id), "state": 2}}
        except Transaction.DoesNotExist:
            return {"error": {"code": -31050, "message": "Transaction not found"}}

    elif method == "CancelTransaction":
        transaction_id = params.get("id")
        try:
            txn = Transaction.objects.get(provider_transaction_id=transaction_id)
            txn.status = "cancelled"
            txn.save(update_fields=["status"])
            return {"result": {"transaction": str(txn.id), "state": -2}}
        except Transaction.DoesNotExist:
            return {"error": {"code": -31050, "message": "Transaction not found"}}

    return {"result": {}}


def _handle_click_webhook(data: dict) -> dict:
    """Handle Click webhook."""
    logger.info("Click webhook received: %s", data)

    action = data.get("action")
    merchant_trans_id = data.get("merchant_trans_id")

    if action == 0:  # Prepare
        try:
            txn = Transaction.objects.get(id=merchant_trans_id, status="pending")
            return {"error": 0, "error_note": "Success", "click_trans_id": data.get("click_trans_id")}
        except Transaction.DoesNotExist:
            return {"error": -5, "error_note": "Transaction not found"}

    elif action == 1:  # Complete
        try:
            txn = Transaction.objects.get(id=merchant_trans_id)
            txn.provider_transaction_id = str(data.get("click_trans_id", ""))
            txn.save(update_fields=["provider_transaction_id"])
            PaymentService.complete_deposit(txn)
            return {"error": 0, "error_note": "Success"}
        except Transaction.DoesNotExist:
            return {"error": -5, "error_note": "Transaction not found"}

    return {"error": -3, "error_note": "Unknown action"}


def _handle_paynet_webhook(data: dict) -> dict:
    """Handle Paynet webhook."""
    logger.info("Paynet webhook received: %s", data)

    transaction_id = data.get("transaction_id")
    event_type = data.get("event")

    if event_type == "payment.completed":
        try:
            txn = Transaction.objects.get(id=transaction_id)
            PaymentService.complete_deposit(txn)
            return {"status": "ok"}
        except Transaction.DoesNotExist:
            return {"status": "error", "message": "Transaction not found"}

    return {"status": "ok"}
