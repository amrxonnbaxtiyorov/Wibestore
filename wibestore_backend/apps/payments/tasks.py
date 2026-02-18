"""
WibeStore Backend - Payments Celery Tasks
"""

import logging

from celery import shared_task
from django.utils import timezone

logger = logging.getLogger("apps.payments")


@shared_task(name="apps.payments.tasks.process_deposit")
def process_deposit(transaction_id: str) -> None:
    """Process a deposit transaction."""
    from .models import Transaction
    from .services import PaymentService

    try:
        txn = Transaction.objects.get(id=transaction_id, type="deposit", status="pending")
        PaymentService.complete_deposit(txn)
    except Exception as e:
        logger.error("Failed to process deposit %s: %s", transaction_id, e)


@shared_task(name="apps.payments.tasks.process_withdrawal")
def process_withdrawal(transaction_id: str) -> None:
    """Process a withdrawal transaction."""
    from .models import Transaction

    try:
        txn = Transaction.objects.get(id=transaction_id, type="withdrawal", status="pending")
        # TODO: Integrate with payment provider API for actual withdrawal
        txn.status = "processing"
        txn.save(update_fields=["status"])
        logger.info("Withdrawal processing: %s", transaction_id)
    except Exception as e:
        logger.error("Failed to process withdrawal %s: %s", transaction_id, e)


@shared_task(name="apps.payments.tasks.release_escrow_payment")
def release_escrow_payment(escrow_id: str) -> None:
    """Automatically release escrow payment after 24 hours if no disputes."""
    from .models import EscrowTransaction
    from .services import EscrowService

    try:
        escrow = EscrowTransaction.objects.get(id=escrow_id)
        if escrow.status in ("paid", "delivered"):
            EscrowService.release_payment(escrow)
            logger.info("Escrow auto-released: %s", escrow_id)
    except Exception as e:
        logger.error("Failed to release escrow %s: %s", escrow_id, e)


@shared_task(name="apps.payments.tasks.send_transaction_email")
def send_transaction_email(transaction_id: str, template: str) -> None:
    """Send email notification about a transaction."""
    from .models import Transaction
    from apps.accounts.tasks import send_notification_email

    try:
        txn = Transaction.objects.select_related("user").get(id=transaction_id)
        send_notification_email.delay(
            str(txn.user.id),
            f"Transaction {txn.type} - {txn.status}",
            f"Your {txn.type} of {txn.amount} {txn.currency} is {txn.status}."
        )
    except Exception as e:
        logger.error("Failed to send transaction email %s: %s", transaction_id, e)
