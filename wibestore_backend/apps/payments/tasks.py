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
    """Automatically release escrow payment after 24 hours if no disputes.

    If seller verification is not yet approved, reschedules itself every hour
    until approved (max 7 days), then cancels.
    """
    from django.conf import settings as _settings
    from .models import EscrowTransaction, SellerVerification
    from .services import EscrowService
    from core.exceptions import BusinessLogicError

    try:
        escrow = EscrowTransaction.objects.get(id=escrow_id)
    except EscrowTransaction.DoesNotExist:
        logger.warning("Escrow not found for auto-release: %s", escrow_id)
        return

    if escrow.status not in ("paid", "delivered"):
        logger.info("Escrow %s not releasable (status=%s), skipping.", escrow_id, escrow.status)
        return

    # Sotuvchi tekshiruvini tekshirish
    verification = (
        SellerVerification.objects.filter(escrow=escrow)
        .order_by("-created_at")
        .first()
    )

    if verification and verification.status == SellerVerification.STATUS_APPROVED:
        # Tasdiqlangan — to'lovni chiqar
        try:
            EscrowService.release_payment(escrow)
            logger.info("Escrow auto-released after verification approval: %s", escrow_id)
        except BusinessLogicError as e:
            logger.warning("Could not auto-release escrow %s: %s", escrow_id, e)
        except Exception as e:
            logger.error("Failed to release escrow %s: %s", escrow_id, e)
        return

    # Tekshiruv hali tasdiqlanmagan — 1 soatdan keyin qayta urinish
    # Max 7 kun (168 soat) kutish
    from django.utils import timezone as _tz
    created = escrow.created_at
    elapsed_hours = ((_tz.now() - created).total_seconds()) / 3600

    max_hold_hours = getattr(_settings, "VERIFICATION_MAX_HOLD_HOURS", 168)  # 7 kun

    if elapsed_hours >= max_hold_hours:
        logger.warning(
            "Escrow %s: verification not approved after %d hours. "
            "Manual admin action required.",
            escrow_id, int(elapsed_hours),
        )
        # Adminlarga ogohlantirish
        try:
            from .telegram_notify import _get_admin_telegram_ids, _send_message
            msg = (
                f"⚠️ <b>Escrow to'lov muddati o'tdi!</b>\n\n"
                f"Sotuvchi {max_hold_hours} soat ichida hujjat taqdim etmadi.\n"
                f"Escrow ID: <code>{escrow_id}</code>\n"
                f"Admin tomonidan qo'lda hal etilishi kerak."
            )
            for tid in _get_admin_telegram_ids():
                _send_message(tid, msg)
        except Exception:
            pass
        return

    # 1 soatdan keyin qayta urinish
    try:
        release_escrow_payment.apply_async(
            args=[escrow_id],
            countdown=3600,
        )
        logger.info(
            "Escrow %s: verification pending, rescheduled auto-release in 1 hour "
            "(elapsed %.1fh / max %dh).",
            escrow_id, elapsed_hours, max_hold_hours,
        )
    except Exception as retry_err:
        logger.warning("Could not reschedule auto-release for escrow %s: %s", escrow_id, retry_err)


@shared_task
def remind_pending_deliveries():
    """
    Every hour: find escrows in 'paid' status older than DELIVERY_REMINDER_HOURS.
    Send reminder to seller via Telegram.
    If older than 12 hours — notify admin.
    """
    from django.conf import settings as _settings
    from django.utils import timezone
    from datetime import timedelta
    from apps.payments.models import EscrowTransaction

    reminder_hours = getattr(_settings, "DELIVERY_REMINDER_HOURS", 2)
    threshold = timezone.now() - timedelta(hours=reminder_hours)
    admin_threshold = timezone.now() - timedelta(hours=12)

    pending = EscrowTransaction.objects.filter(
        status="paid",
        created_at__lte=threshold,
    ).select_related("seller", "buyer", "listing")

    for escrow in pending:
        try:
            from apps.payments.telegram_notify import notify_seller_deliver_account
            notify_seller_deliver_account(escrow)
        except Exception as e:
            logger.warning("remind_pending_deliveries: %s", e)

        if escrow.created_at <= admin_threshold:
            try:
                from apps.payments.telegram_notify import _send_message, _get_admin_telegram_ids
                msg = (
                    f"⚠️ Сделка #{str(escrow.id)[:8]} уже 12+ часов без передачи!\n"
                    f"Продавец: {escrow.seller.email}\n"
                    f"Аккаунт: {escrow.listing.title if escrow.listing else '—'}"
                )
                for admin_id in _get_admin_telegram_ids():
                    _send_message(admin_id, msg)
            except Exception as e:
                logger.warning("Admin notify for stale escrow: %s", e)

    logger.info("remind_pending_deliveries: processed %d escrows", pending.count())


@shared_task
def auto_release_escrow_after_timeout():
    """
    Every hour: if buyer hasn't confirmed within ESCROW_AUTO_RELEASE_HOURS
    after transition to 'delivered' — auto-complete the trade.
    """
    from django.conf import settings as _settings
    from django.utils import timezone
    from datetime import timedelta
    from apps.payments.models import EscrowTransaction

    auto_hours = getattr(_settings, "ESCROW_AUTO_RELEASE_HOURS", 48)
    threshold = timezone.now() - timedelta(hours=auto_hours)

    stale = EscrowTransaction.objects.filter(
        status="delivered",
        updated_at__lte=threshold,
    ).select_related("buyer", "seller", "listing")

    count = 0
    for escrow in stale:
        try:
            from apps.payments.services import EscrowService
            EscrowService.release_payment(escrow)
            count += 1
        except Exception as e:
            logger.warning("auto_release_escrow: escrow %s: %s", escrow.id, e)

    logger.info("auto_release_escrow_after_timeout: released %d escrows", count)


def _transaction_status_display(status: str) -> tuple[str, str]:
    """Return (status_class, status_text) for receipt template."""
    mapping = {
        "completed": ("success", "Completed"),
        "pending": ("pending", "Pending"),
        "processing": ("pending", "Processing"),
        "failed": ("failed", "Failed"),
        "cancelled": ("failed", "Cancelled"),
    }
    return mapping.get(status, ("pending", status))


@shared_task(name="apps.payments.tasks.send_transaction_email")
def send_transaction_email(transaction_id: str, template: str = "default") -> None:
    """Send email notification about a transaction. Use template='transaction_receipt' for HTML receipt."""
    from .models import Transaction

    try:
        txn = Transaction.objects.select_related("user", "payment_method").get(id=transaction_id)
        user = txn.user
        frontend_url = getattr(settings, "FRONTEND_URL", "https://wibestore.net").rstrip("/")
        transactions_url = f"{frontend_url}/profile/transactions"

        if template in ("transaction_receipt", "emails/transaction_receipt.html"):
            status_class, status_text = _transaction_status_display(txn.status)
            ctx = {
                "user_name": getattr(user, "display_name", None) or user.email or "User",
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
            subject = f"Transaction Receipt — WibeStore ({txn.type})"
            plain = f"Transaction {txn.type}: {txn.amount} {txn.currency}, status: {status_text}."
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
