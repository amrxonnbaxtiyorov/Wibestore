"""
WibeStore Backend - Payment Webhook Views
Handle webhooks from payment providers.
"""

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

    # complete_deposit handles balance update atomically + is idempotent
    from core.exceptions import BusinessLogicError
    try:
        PaymentService.complete_deposit(transaction)
    except BusinessLogicError:
        # Already processed — idempotent, log and continue
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
def payme_webhook(request):
    """Handle Payme webhooks."""
    try:
        import json
        payload = json.loads(request.body)
        signature = request.headers.get("X-Payme-Signature", "")

        provider = get_payment_provider("payme")
        result = provider.process_webhook(payload, signature)

        if result.status == PaymentStatus.SUCCESS:
            order_id = payload.get("account", {}).get("order_id")
            if order_id:
                _process_webhook_success(order_id, result.transaction_id, "payme")

        return JsonResponse({
            "status": result.status.value,
            "transaction_id": result.transaction_id,
        })

    except Exception as e:
        logger.error("Payme webhook error: %s", e, exc_info=True)
        return JsonResponse({"error": "webhook processing failed"}, status=500)


@csrf_exempt
@require_http_methods(["POST"])
def click_webhook(request):
    """Handle Click webhooks."""
    try:
        import json
        payload = json.loads(request.body)
        signature = request.headers.get("X-Click-Signature", "")

        provider = get_payment_provider("click")
        result = provider.process_webhook(payload, signature)

        if result.status == PaymentStatus.SUCCESS:
            order_id = payload.get("merchant_trans_id")
            if order_id:
                _process_webhook_success(order_id, result.transaction_id, "click")

        return JsonResponse({
            "status": result.status.value,
            "transaction_id": result.transaction_id,
        })

    except Exception as e:
        logger.error("Click webhook error: %s", e, exc_info=True)
        return JsonResponse({"error": "webhook processing failed"}, status=500)


@csrf_exempt
@require_http_methods(["POST"])
def paynet_webhook(request):
    """Handle Paynet webhooks."""
    try:
        import json
        payload = json.loads(request.body)
        signature = request.headers.get("X-Paynet-Signature", "")

        provider = get_payment_provider("paynet")
        result = provider.process_webhook(payload, signature)

        if result.status == PaymentStatus.SUCCESS:
            order_id = payload.get("order_id")
            if order_id:
                _process_webhook_success(order_id, result.transaction_id, "paynet")

        return JsonResponse({
            "status": result.status.value,
            "transaction_id": result.transaction_id,
        })

    except Exception as e:
        logger.error("Paynet webhook error: %s", e, exc_info=True)
        return JsonResponse({"error": "webhook processing failed"}, status=500)
