"""
WibeStore Backend - Payments Celery Tasks
"""

import logging

from celery import shared_task
from django.conf import settings
from django.core.mail import send_mail
from django.template.loader import render_to_string
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
        txn.status = "processing"
        txn.save(update_fields=["status"])
        logger.info(
            "Withdrawal marked processing: %s. Integrate payment provider API for actual payout.",
            transaction_id,
        )
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


def _transaction_status_display(status: str) -> tuple[str, str]:
    """Return (status_class, status_text) for receipt template."""
    mapping = {
        "completed": ("success", "Завершена"),
        "pending": ("pending", "В ожидании"),
        "processing": ("pending", "В обработке"),
        "failed": ("failed", "Ошибка"),
        "cancelled": ("failed", "Отменена"),
    }
    return mapping.get(status, ("pending", status))


@shared_task(name="apps.payments.tasks.send_transaction_email")
def send_transaction_email(transaction_id: str, template: str = "default") -> None:
    """Send email notification about a transaction. Use template='transaction_receipt' for HTML receipt."""
    from .models import Transaction

    try:
        txn = Transaction.objects.select_related("user", "payment_method").get(id=transaction_id)
        user = txn.user
        frontend_url = getattr(settings, "FRONTEND_URL", "https://wibestore.uz").rstrip("/")
        transactions_url = f"{frontend_url}/profile/transactions"

        if template in ("transaction_receipt", "emails/transaction_receipt.html"):
            status_class, status_text = _transaction_status_display(txn.status)
            ctx = {
                "user_name": getattr(user, "display_name", None) or user.email or "Пользователь",
                "status_class": status_class,
                "status_text": status_text,
                "transaction_type": txn.get_type_display() if hasattr(txn, "get_type_display") else txn.type,
                "amount": f"{txn.amount:,.0f} {txn.currency}",
                "payment_method": txn.payment_method.name if txn.payment_method else "—",
                "date": txn.created_at.strftime("%d.%m.%Y %H:%M") if txn.created_at else "—",
                "transaction_id": str(txn.id),
                "transactions_url": transactions_url,
            }
            html_message = render_to_string("emails/transaction_receipt.html", ctx)
            subject = f"Чек транзакции — WibeStore ({txn.type})"
            plain = f"Транзакция {txn.type}: {txn.amount} {txn.currency}, статус: {status_text}."
            send_mail(
                subject=subject,
                message=plain,
                from_email=settings.DEFAULT_FROM_EMAIL,
                recipient_list=[user.email],
                html_message=html_message,
                fail_silently=True,
            )
            logger.info("Transaction receipt email sent for %s to %s", transaction_id, user.email)
        else:
            from apps.accounts.tasks import send_notification_email

            send_notification_email.delay(
                str(user.id),
                f"Transaction {txn.type} - {txn.status}",
                f"Your {txn.type} of {txn.amount} {txn.currency} is {txn.status}.",
            )
    except Exception as e:
        logger.error("Failed to send transaction email %s: %s", transaction_id, e)
