"""
WibeStore Backend - Accounts Celery Tasks
"""

import logging
from datetime import timedelta

from celery import shared_task
from django.conf import settings
from django.core.mail import send_mail
from django.template.loader import render_to_string
from django.utils import timezone

logger = logging.getLogger("apps.accounts")


@shared_task(name="apps.accounts.tasks.send_welcome_email")
def send_welcome_email(user_id: str) -> None:
    """Send welcome email to new user."""
    from django.contrib.auth import get_user_model

    User = get_user_model()

    try:
        user = User.objects.get(id=user_id)
        html_message = render_to_string("emails/welcome.html", {"user": user})

        send_mail(
            subject="Welcome to WibeStore! 🎮",
            message=f"Welcome to WibeStore, {user.display_name}!",
            from_email=settings.DEFAULT_FROM_EMAIL,
            recipient_list=[user.email],
            html_message=html_message,
            fail_silently=True,
        )
        logger.info("Welcome email sent to: %s", user.email)
    except Exception as e:
        logger.error("Failed to send welcome email to %s: %s", user_id, e)


@shared_task(name="apps.accounts.tasks.send_email_verification_task")
def send_email_verification_task(user_id: str, token: str) -> None:
    """Send email verification link."""
    from django.contrib.auth import get_user_model

    User = get_user_model()

    try:
        user = User.objects.get(id=user_id)
        verification_url = f"https://wibestore.uz/verify-email?token={token}"

        send_mail(
            subject="Verify your WibeStore email",
            message=f"Click to verify: {verification_url}",
            from_email=settings.DEFAULT_FROM_EMAIL,
            recipient_list=[user.email],
            fail_silently=True,
        )
        logger.info("Verification email sent to: %s", user.email)
    except Exception as e:
        logger.error("Failed to send verification email: %s", e)


@shared_task(name="apps.accounts.tasks.send_password_reset_email")
def send_password_reset_email(user_id: str, token: str) -> None:
    """Send password reset email."""
    from django.contrib.auth import get_user_model

    User = get_user_model()

    try:
        user = User.objects.get(id=user_id)
        reset_url = f"https://wibestore.uz/reset-password?token={token}"

        html_message = render_to_string(
            "emails/password_reset.html",
            {"user": user, "reset_url": reset_url},
        )

        send_mail(
            subject="WibeStore - Password Reset",
            message=f"Reset your password: {reset_url}",
            from_email=settings.DEFAULT_FROM_EMAIL,
            recipient_list=[user.email],
            html_message=html_message,
            fail_silently=True,
        )
        logger.info("Password reset email sent to: %s", user.email)
    except Exception as e:
        logger.error("Failed to send password reset email: %s", e)


@shared_task(name="apps.accounts.tasks.send_notification_email")
def send_notification_email(user_id: str, subject: str, message: str) -> None:
    """Send generic notification email."""
    from django.contrib.auth import get_user_model

    User = get_user_model()

    try:
        user = User.objects.get(id=user_id)
        html_message = render_to_string(
            "emails/notification.html",
            {"user": user, "subject": subject, "message": message},
        )

        send_mail(
            subject=subject,
            message=message,
            from_email=settings.DEFAULT_FROM_EMAIL,
            recipient_list=[user.email],
            html_message=html_message,
            fail_silently=True,
        )
    except Exception as e:
        logger.error("Failed to send notification email: %s", e)


@shared_task(name="apps.accounts.tasks.cleanup_unverified_users")
def cleanup_unverified_users() -> int:
    """
    Remove users who haven't verified their email within 7 days.
    Runs daily via Celery Beat.
    """
    from django.contrib.auth import get_user_model

    User = get_user_model()

    cutoff = timezone.now() - timedelta(days=7)
    unverified = User.objects.filter(
        is_verified=False,
        is_staff=False,
        is_superuser=False,
        created_at__lt=cutoff,
    )
    count = unverified.count()
    unverified.delete()

    logger.info("Cleaned up %d unverified users", count)
    return count
