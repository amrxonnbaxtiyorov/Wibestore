"""
WibeStore Backend - Payment Webhook Views
Handle webhooks from payment providers (Google Pay, Visa, Mastercard, Apple Pay).
"""

import json
import logging

from django.http import JsonResponse
from django.views.decorators.csrf import csrf_exempt
from django.views.decorators.http import require_http_methods

from apps.payments.models import Transaction
from apps.payments.providers import get_payment_provider, PaymentStatus

logger = logging.getLogger("apps.payments")


def _process_webhook_success(order_id: str, provider_transaction_id: str, provider_name: str) -> None:
    """
    Shared helper: complete a deposit transaction and update user balance.
    Uses PaymentService.complete_deposit() which has select_for_update + idempotency guard.
    """
    from apps.payments.services import PaymentService
    from apps.notifications.services import NotificationService

    try:
        transaction = Transaction.objects.select_related("user").get(order_id=order_id)
    except Transaction.DoesNotExist:
        logger.error("Webhook (%s): transaction not found for order_id=%s", provider_name, order_id)
        return

    # Set provider_transaction_id before completing (if not already set)
    if provider_transaction_id and not transaction.provider_transaction_id:
        transaction.provider_transaction_id = provider_transaction_id
        transaction.save(update_fields=["provider_transaction_id"])

    from core.exceptions import BusinessLogicError
    try:
        PaymentService.complete_deposit(transaction)
    except BusinessLogicError:
        logger.info("Webhook (%s): transaction %s already completed (duplicate webhook)", provider_name, transaction.id)
        return

    NotificationService.create_transaction_notification(
        user=transaction.user,
        transaction=transaction,
        status="success",
    )
    logger.info("Webhook (%s): deposit completed for user=%s, amount=%s", provider_name, transaction.user.email, transaction.amount)


@csrf_exempt
@require_http_methods(["POST"])
def card_webhook(request, provider):
    """Handle card payment webhooks (Google Pay, Visa, Mastercard, Apple Pay)."""
    try:
        payload = json.loads(request.body)
        signature = request.headers.get("X-Signature", "")

        provider_instance = get_payment_provider(provider)
        result = provider_instance.process_webhook(payload, signature)

        if result.status == PaymentStatus.SUCCESS:
            order_id = payload.get("order_id") or payload.get("transaction_id")
            if order_id:
                _process_webhook_success(order_id, result.transaction_id, provider)

        return JsonResponse({
            "status": result.status.value,
            "transaction_id": result.transaction_id,
        })

    except Exception as e:
        logger.error("%s webhook error: %s", provider, e, exc_info=True)
        return JsonResponse({"error": "webhook processing failed"}, status=500)
