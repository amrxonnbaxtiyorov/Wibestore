"""
WibeStore Backend - Accounts Models
Custom User model with UUID, phone, balance, rating, and soft delete.
"""

import uuid

from django.conf import settings
from django.contrib.auth.models import AbstractBaseUser, BaseUserManager, PermissionsMixin
from django.db import models
from django.utils import timezone

from core.constants import LANGUAGE_CHOICES
from core.models import BaseModel
from core.validators import validate_uzbek_phone_number


class UserManager(BaseUserManager):
    """Custom user manager supporting email as the unique identifier."""

    def create_user(
        self, email: str, password: str | None = None, **extra_fields
    ) -> "User":
        if not email:
            raise ValueError("Email is required.")
        email = self.normalize_email(email)
        user = self.model(email=email, **extra_fields)
        user.set_password(password)
        user.save(using=self._db)
        return user

    def create_superuser(self, email: str, password: str, **extra_fields) -> "User":
        extra_fields.setdefault("is_staff", True)
        extra_fields.setdefault("is_superuser", True)
        extra_fields.setdefault("is_active", True)
        extra_fields.setdefault("is_verified", True)

        if extra_fields.get("is_staff") is not True:
            raise ValueError("Superuser must have is_staff=True.")
        if extra_fields.get("is_superuser") is not True:
            raise ValueError("Superuser must have is_superuser=True.")

        return self.create_user(email, password, **extra_fields)


class User(AbstractBaseUser, PermissionsMixin):
    """Custom User model for WibeStore."""

    id = models.UUIDField(primary_key=True, default=uuid.uuid4, editable=False)
    email = models.EmailField(unique=True, db_index=True)
    username = models.CharField(max_length=50, unique=True, blank=True, null=True)
    # Telegram: bot orqali ro'yxatdan o'tganda to'ldiriladi
    telegram_id = models.BigIntegerField(null=True, blank=True, unique=True, db_index=True)
    phone_number = models.CharField(
        max_length=20,
        unique=True,
        blank=True,
        null=True,
        validators=[validate_uzbek_phone_number],
    )
    full_name = models.CharField(max_length=150, blank=True, default="")
    avatar = models.ImageField(upload_to="avatars/%Y/%m/", blank=True, null=True)
    # Telegram va boshqa tashqi profildan keladigan avatar URL (rasm fayl emas)
    avatar_url = models.URLField(max_length=500, blank=True, null=True)

    # Status flags
    is_active = models.BooleanField(default=True)
    is_staff = models.BooleanField(default=False)
    is_verified = models.BooleanField(default=False)

    # Marketplace metrics
    rating = models.DecimalField(max_digits=3, decimal_places=2, default=5.00)
    total_sales = models.PositiveIntegerField(default=0)
    total_purchases = models.PositiveIntegerField(default=0)
    balance = models.DecimalField(max_digits=15, decimal_places=2, default=0)
    # Referral: unique code for this user (invite friends)
    referral_code = models.CharField(
        max_length=20, unique=True, blank=True, null=True, db_index=True
    )

    # Preferences
    language = models.CharField(max_length=2, choices=LANGUAGE_CHOICES, default="ru")
    timezone = models.CharField(max_length=50, default="Asia/Tashkent")

    # Timestamps
    created_at = models.DateTimeField(auto_now_add=True)
    updated_at = models.DateTimeField(auto_now=True)
    last_login = models.DateTimeField(null=True, blank=True)
    deleted_at = models.DateTimeField(null=True, blank=True, default=None)

    # Password history (JSON list of hashed passwords)
    password_history = models.JSONField(default=list, blank=True)

    objects = UserManager()

    USERNAME_FIELD = "email"
    REQUIRED_FIELDS = []

    class Meta:
        db_table = "users"
        verbose_name = "User"
        verbose_name_plural = "Users"
        ordering = ["-created_at"]
        indexes = [
            models.Index(fields=["email"]),
            models.Index(fields=["username"]),
            models.Index(fields=["phone_number"]),
            models.Index(fields=["telegram_id"]),
            models.Index(fields=["created_at"]),
        ]

    def __str__(self) -> str:
        return self.email

    @property
    def display_name(self) -> str:
        return self.full_name or self.username or self.email.split("@")[0]

    @property
    def is_deleted(self) -> bool:
        return self.deleted_at is not None

    def soft_delete(self) -> None:
        """Soft delete user."""
        self.deleted_at = timezone.now()
        self.is_active = False
        self.save(update_fields=["deleted_at", "is_active"])

    def update_rating(self, new_rating: float = None) -> None:
        """
        Update user rating based on all reviews.
        If new_rating is provided, it will be used directly.
        Otherwise, calculates average from all reviews.
        """
        from apps.reviews.models import Review
        from django.db.models import Avg
        
        if new_rating is not None:
            # Use provided rating directly (for backward compatibility)
            self.rating = round(new_rating, 2)
        else:
            # Calculate average from all reviews
            avg_rating = Review.objects.filter(
                reviewee=self,
            ).aggregate(avg=Avg('rating'))['avg']
            
            self.rating = round(avg_rating, 2) if avg_rating is not None else 5.0
        
        self.save(update_fields=["rating"])


class PasswordHistory(models.Model):
    """Track password history to prevent reuse."""

    id = models.UUIDField(primary_key=True, default=uuid.uuid4, editable=False)
    user = models.ForeignKey(User, on_delete=models.CASCADE, related_name="past_passwords")
    password_hash = models.CharField(max_length=256)
    created_at = models.DateTimeField(auto_now_add=True)

    class Meta:
        db_table = "password_history"
        ordering = ["-created_at"]

    def __str__(self) -> str:
        return f"PasswordHistory({self.user.email}, {self.created_at})"


class Referral(models.Model):
    """Referral: referrer (who shared) and referred (who used code)."""

    referrer = models.ForeignKey(
        User,
        on_delete=models.CASCADE,
        related_name="referrals_made",
    )
    referred = models.OneToOneField(
        User,
        on_delete=models.CASCADE,
        related_name="referred_by",
    )
    referral_code_used = models.CharField(max_length=20)
    bonus_given_to_referrer = models.BooleanField(default=False)
    created_at = models.DateTimeField(auto_now_add=True)

    class Meta:
        db_table = "referrals"
        ordering = ["-created_at"]
        verbose_name = "Referral"
        verbose_name_plural = "Referrals"

    def __str__(self) -> str:
        return f"{self.referrer.email} → {self.referred.email}"


class TelegramRegistrationCode(models.Model):
    """
    Bot orqali ro'yxatdan o'tish uchun bir martalik kod.
    Kod 10 daqiqa amal qiladi, bir marta ishlatiladi.
    """

    telegram_id = models.BigIntegerField(db_index=True)
    phone_number = models.CharField(max_length=20)
    full_name = models.CharField(max_length=150, default="", blank=True)
    photo_url = models.URLField(max_length=500, blank=True, null=True)
    code = models.CharField(max_length=6, db_index=True)
    is_used = models.BooleanField(default=False)
    created_at = models.DateTimeField(auto_now_add=True)
    expires_at = models.DateTimeField()

    class Meta:
        db_table = "telegram_registration_codes"
        ordering = ["-created_at"]
        # Index (code, is_used) managed via RunSQL in migration 0003

    def __str__(self) -> str:
        return f"Code {self.code} for telegram_id={self.telegram_id}"

    @property
    def is_valid(self) -> bool:
        return not self.is_used and timezone.now() < self.expires_at


class TelegramBotStat(BaseModel):
    """Статистика взаимодействия пользователей с Telegram ботом."""
    telegram_id = models.BigIntegerField(db_index=True, unique=True)
    telegram_username = models.CharField(max_length=100, blank=True, default="")
    telegram_first_name = models.CharField(max_length=100, blank=True, default="")
    telegram_last_name = models.CharField(max_length=100, blank=True, default="")
    user = models.ForeignKey(
        settings.AUTH_USER_MODEL,
        on_delete=models.SET_NULL,
        null=True, blank=True,
        related_name="telegram_bot_stats"
    )
    first_interaction_at = models.DateTimeField(auto_now_add=True)
    last_interaction_at = models.DateTimeField(auto_now=True)
    is_blocked = models.BooleanField(default=False)
    blocked_at = models.DateTimeField(null=True, blank=True)
    unblocked_at = models.DateTimeField(null=True, blank=True)
    registration_completed = models.BooleanField(default=False)
    registration_date = models.DateTimeField(null=True, blank=True)
    registration_otp_code = models.CharField(max_length=10, blank=True, default="")
    referral_code_used = models.CharField(max_length=20, blank=True, default="")
    total_commands_sent = models.PositiveIntegerField(default=0)

    class Meta:
        db_table = "telegram_bot_stats"
        ordering = ["-last_interaction_at"]
        verbose_name = "Статистика Telegram бота"
        verbose_name_plural = "Статистика Telegram бота"

    def __str__(self) -> str:
        return f"TelegramBotStat({self.telegram_id}, @{self.telegram_username})"
