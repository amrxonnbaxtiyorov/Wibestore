"""
WibeStore Backend - Accounts Services (Business Logic)
"""

import logging
from datetime import timedelta

from django.conf import settings
from django.contrib.auth import get_user_model
from django.contrib.auth.hashers import check_password, make_password
from django.core.cache import cache
from django.utils import timezone

from core.exceptions import BusinessLogicError
from core.utils import generate_otp, generate_token

from .models import PasswordHistory

logger = logging.getLogger("apps.accounts")
User = get_user_model()


class AuthService:
    """Service layer for authentication operations."""

    @staticmethod
    def register_user(*, email: str, password: str, **kwargs) -> User:
        """Register a new user and queue welcome email."""
        user = User.objects.create_user(email=email, password=password, **kwargs)
        logger.info("New user registered: %s", user.email)

        # Queue welcome email
        from .tasks import send_welcome_email

        send_welcome_email.delay(str(user.id))

        # Queue email verification
        AuthService.send_email_verification(user)

        return user

    @staticmethod
    def send_email_verification(user: User) -> str:
        """Generate and send email verification token."""
        token = generate_token(32)
        cache.set(f"email_verify_{token}", str(user.id), timeout=86400)  # 24 hours
        logger.info("Email verification sent to: %s", user.email)

        from .tasks import send_email_verification_task

        send_email_verification_task.delay(str(user.id), token)

        return token

    @staticmethod
    def verify_email(token: str) -> User:
        """Verify user email with token."""
        user_id = cache.get(f"email_verify_{token}")
        if not user_id:
            raise BusinessLogicError("Invalid or expired verification token.")

        user = User.objects.get(id=user_id)
        user.is_verified = True
        user.save(update_fields=["is_verified"])
        cache.delete(f"email_verify_{token}")

        logger.info("Email verified for: %s", user.email)
        return user

    @staticmethod
    def request_password_reset(email: str) -> str | None:
        """Send password reset email."""
        try:
            user = User.objects.get(email=email, is_active=True)
        except User.DoesNotExist:
            return None  # Don't reveal if user exists

        token = generate_token(32)
        cache.set(f"password_reset_{token}", str(user.id), timeout=3600)  # 1 hour

        from .tasks import send_password_reset_email

        send_password_reset_email.delay(str(user.id), token)

        logger.info("Password reset requested for: %s", email)
        return token

    @staticmethod
    def reset_password(token: str, new_password: str) -> User:
        """Reset password using reset token."""
        user_id = cache.get(f"password_reset_{token}")
        if not user_id:
            raise BusinessLogicError("Invalid or expired reset token.")

        user = User.objects.get(id=user_id)

        # Check password history
        AuthService._check_password_history(user, new_password)

        # Save old password to history
        PasswordHistory.objects.create(user=user, password_hash=user.password)

        # Limit history to 5
        old_passwords = PasswordHistory.objects.filter(user=user).order_by("-created_at")
        if old_passwords.count() > 5:
            old_passwords[5:].delete()

        user.set_password(new_password)
        user.save(update_fields=["password"])
        cache.delete(f"password_reset_{token}")

        logger.info("Password reset completed for: %s", user.email)
        return user

    @staticmethod
    def change_password(user: User, old_password: str, new_password: str) -> None:
        """Change user password."""
        if not user.check_password(old_password):
            raise BusinessLogicError("Current password is incorrect.")

        AuthService._check_password_history(user, new_password)

        PasswordHistory.objects.create(user=user, password_hash=user.password)

        old_passwords = PasswordHistory.objects.filter(user=user).order_by("-created_at")
        if old_passwords.count() > 5:
            old_passwords[5:].delete()

        user.set_password(new_password)
        user.save(update_fields=["password"])

        logger.info("Password changed for: %s", user.email)

    @staticmethod
    def _check_password_history(user: User, new_password: str) -> None:
        """Check if password was recently used."""
        recent_passwords = PasswordHistory.objects.filter(user=user).order_by(
            "-created_at"
        )[:5]
        for ph in recent_passwords:
            if check_password(new_password, ph.password_hash):
                raise BusinessLogicError(
                    "This password was used recently. Please choose a different one."
                )

    @staticmethod
    def google_authenticate(access_token: str) -> User:
        """Authenticate or register user via Google OAuth."""
        import requests

        response = requests.get(
            "https://www.googleapis.com/oauth2/v3/userinfo",
            headers={"Authorization": f"Bearer {access_token}"},
            timeout=10,
        )

        if response.status_code != 200:
            raise BusinessLogicError("Invalid Google access token.")

        google_data = response.json()
        email = google_data.get("email")
        if not email:
            raise BusinessLogicError("Could not retrieve email from Google.")

        user, created = User.objects.get_or_create(
            email=email,
            defaults={
                "full_name": google_data.get("name", ""),
                "is_verified": True,
                "avatar": None,
            },
        )

        if created:
            logger.info("New user created via Google OAuth: %s", email)
        else:
            logger.info("User logged in via Google OAuth: %s", email)

        return user

    @staticmethod
    def request_otp(phone_number: str) -> str:
        """Generate and send OTP to phone number."""
        otp = generate_otp()
        cache.set(f"otp_{phone_number}", otp, timeout=300)  # 5 minutes
        logger.info("OTP sent to: %s", phone_number)
        # TODO: Integrate with SMS provider
        return otp

    @staticmethod
    def verify_otp(phone_number: str, otp: str) -> bool:
        """Verify OTP code."""
        stored_otp = cache.get(f"otp_{phone_number}")
        if not stored_otp or stored_otp != otp:
            raise BusinessLogicError("Invalid or expired OTP code.")
        cache.delete(f"otp_{phone_number}")
        return True


class UserService:
    """Service layer for user profile operations."""

    @staticmethod
    def update_profile(user: User, **kwargs) -> User:
        """Update user profile."""
        for key, value in kwargs.items():
            if hasattr(user, key):
                setattr(user, key, value)
        user.save()
        logger.info("Profile updated for: %s", user.email)
        return user

    @staticmethod
    def soft_delete_user(user: User) -> None:
        """Soft delete a user account."""
        user.soft_delete()
        logger.info("User soft deleted: %s", user.email)

    @staticmethod
    def calculate_user_rating(user: User) -> float:
        """Recalculate user rating from all reviews."""
        from django.db.models import Avg

        from apps.reviews.models import Review

        reviews = Review.objects.filter(reviewee=user, is_moderated=True)
        if not reviews.exists():
            return 5.0
        avg = reviews.aggregate(Avg("rating"))["rating__avg"]
        return round(avg, 2)
