"""
WibeStore Backend - Accounts Models
Custom User model with UUID, phone, balance, rating, and soft delete.
"""

import uuid

from django.contrib.auth.models import AbstractBaseUser, BaseUserManager, PermissionsMixin
from django.db import models
from django.utils import timezone

from core.constants import LANGUAGE_CHOICES
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
    phone_number = models.CharField(
        max_length=20,
        unique=True,
        blank=True,
        null=True,
        validators=[validate_uzbek_phone_number],
    )
    full_name = models.CharField(max_length=150, blank=True, default="")
    avatar = models.ImageField(upload_to="avatars/%Y/%m/", blank=True, null=True)

    # Status flags
    is_active = models.BooleanField(default=True)
    is_staff = models.BooleanField(default=False)
    is_verified = models.BooleanField(default=False)

    # Marketplace metrics
    rating = models.DecimalField(max_digits=3, decimal_places=2, default=5.00)
    total_sales = models.PositiveIntegerField(default=0)
    total_purchases = models.PositiveIntegerField(default=0)
    balance = models.DecimalField(max_digits=15, decimal_places=2, default=0)

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
