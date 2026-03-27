"""
WibeStore Backend - Marketplace Models
Listing, ListingImage, Favorite, View models.
"""

import logging

from django.conf import settings
from django.db import models

from core.constants import LISTING_STATUS_CHOICES, LISTING_TYPE_CHOICES, LOGIN_METHOD_CHOICES
from core.models import BaseModel, BaseSoftDeleteModel
from core.utils import encrypt_sensitive_data, decrypt_sensitive_data

logger = logging.getLogger("apps.marketplace")


class Listing(BaseSoftDeleteModel):
    """Game account listing for sale or rent."""

    listing_type = models.CharField(
        max_length=10,
        choices=LISTING_TYPE_CHOICES,
        default="sell",
        db_index=True,
        help_text="sell = sotish, rent = ijarada berish",
    )

    listing_code = models.CharField(
        max_length=10,
        unique=True,
        db_index=True,
        null=True,
        blank=True,
        help_text="Auto-generated unique listing code (e.g. WB-1001)",
    )

    seller = models.ForeignKey(
        settings.AUTH_USER_MODEL,
        on_delete=models.CASCADE,
        related_name="listings",
    )
    game = models.ForeignKey(
        "games.Game",
        on_delete=models.CASCADE,
        related_name="listings",
    )
    title = models.CharField(max_length=200)
    description = models.TextField()
    price = models.DecimalField(max_digits=15, decimal_places=2)
    original_price = models.DecimalField(
        max_digits=15, decimal_places=2, null=True, blank=True,
        help_text="Original price before discount",
    )
    status = models.CharField(
        max_length=20, choices=LISTING_STATUS_CHOICES, default="pending", db_index=True
    )
    is_premium = models.BooleanField(default=False, db_index=True)
    views_count = models.PositiveIntegerField(default=0)
    favorites_count = models.PositiveIntegerField(default=0)

    # Warranty (kafolat) — days seller guarantees account
    warranty_days = models.PositiveSmallIntegerField(
        default=0,
        blank=True,
        help_text="Kafolat muddati (kun); 0 = kafolat yo'q",
    )
    # Flash sale
    sale_percent = models.PositiveSmallIntegerField(
        null=True,
        blank=True,
        help_text="Chegirma foizi (flash sale); null = aksiya yo'q",
    )
    sale_ends_at = models.DateTimeField(
        null=True,
        blank=True,
        help_text="Aksiya tugash vaqti",
    )

    # Rental (arenda) fields
    rental_period_days = models.PositiveSmallIntegerField(
        null=True,
        blank=True,
        help_text="Ijara muddati (kun): 1, 3, 7, 14, 30",
    )
    rental_price_per_day = models.DecimalField(
        max_digits=15, decimal_places=2, null=True, blank=True,
        help_text="Kunlik ijara narxi",
    )
    rental_deposit = models.DecimalField(
        max_digits=15, decimal_places=2, null=True, blank=True,
        help_text="Kafolat depozit summasi (akkaunt qaytarilmasa ushlanadi)",
    )
    # Custom time slots: [{"label": "1 soat", "price": 10000}, {"label": "Kechdan tongacha", "price": 50000}]
    rental_time_slots = models.JSONField(
        default=list, blank=True,
        help_text="Foydalanuvchi belgilagan vaqt/narx variantlari (max 5 ta)",
    )

    # Account details
    login_method = models.CharField(
        max_length=20, choices=LOGIN_METHOD_CHOICES, default="email"
    )
    account_email = models.TextField(blank=True, default="", help_text="Encrypted")
    account_password = models.TextField(blank=True, default="", help_text="Encrypted")
    account_additional_info = models.JSONField(default=dict, blank=True)

    # Game-specific fields
    level = models.CharField(max_length=50, blank=True, default="")
    rank = models.CharField(max_length=50, blank=True, default="")
    skins_count = models.PositiveIntegerField(default=0)
    features = models.JSONField(default=list, blank=True)

    # Video (Telegram orqali yuklangan)
    VIDEO_STATUS_CHOICES = [
        ("none", "No video"),
        ("pending", "Pending review"),
        ("approved", "Approved"),
        ("rejected", "Rejected"),
    ]
    video_file_id = models.CharField(
        max_length=255, blank=True, default="",
        help_text="Telegram file_id for uploaded video",
    )
    video_upload_token = models.CharField(
        max_length=64, blank=True, default="",
        db_index=True,
        help_text="One-time token for video upload via Telegram bot",
    )
    video_status = models.CharField(
        max_length=20, choices=VIDEO_STATUS_CHOICES, default="none", db_index=True,
        help_text="Admin moderation status for video",
    )
    video_rejected_reason = models.TextField(
        blank=True, default="",
        help_text="Reason for video rejection (shown to seller)",
    )

    # Moderation
    moderated_by = models.ForeignKey(
        settings.AUTH_USER_MODEL,
        on_delete=models.SET_NULL,
        null=True,
        blank=True,
        related_name="moderated_listings",
    )
    moderated_at = models.DateTimeField(null=True, blank=True)
    approved_at = models.DateTimeField(null=True, blank=True)
    rejected_at = models.DateTimeField(null=True, blank=True)
    rejection_reason = models.TextField(blank=True, default="")
    sold_at = models.DateTimeField(null=True, blank=True)

    class Meta:
        db_table = "listings"
        ordering = ["-is_premium", "-created_at"]
        verbose_name = "Listing"
        verbose_name_plural = "Listings"
        indexes = [
            models.Index(fields=["seller", "status"]),
            models.Index(fields=["game", "status", "created_at"]),
            models.Index(fields=["status", "is_premium"]),
            models.Index(fields=["listing_type", "status"]),
            models.Index(fields=["price"]),
        ]

    def __str__(self) -> str:
        code = getattr(self, "listing_code", "") or ""
        prefix = f"[{code}] " if code else ""
        return f"{prefix}{self.title} ({self.game.name})"

    @staticmethod
    def _random_code():
        """Generate a random unique fallback code (works even if column is NOT NULL)."""
        import uuid
        return f"WB-{uuid.uuid4().hex[:6].upper()}"

    def save(self, *args, **kwargs):
        from django.db import IntegrityError, transaction

        # Generate listing_code if missing
        if not self.listing_code:
            try:
                self.listing_code = self._generate_listing_code()
            except Exception as e:
                logger.warning("Failed to generate listing_code: %s", e)
                self.listing_code = self._random_code()

        # Save with retry on IntegrityError.
        # Each attempt is wrapped in a savepoint so PostgreSQL can recover
        # from the aborted-transaction state after an IntegrityError.
        last_error = None
        for attempt in range(5):
            try:
                with transaction.atomic():
                    super().save(*args, **kwargs)
                return  # Success
            except IntegrityError as e:
                error_str = str(e).lower()
                if "listing_code" in error_str or "listings_listing_code" in error_str:
                    self.listing_code = self._random_code()
                    last_error = e
                    logger.warning("Listing save attempt %d failed (listing_code collision), retrying: %s",
                                   attempt + 1, e)
                    continue
                else:
                    logger.error("Listing save IntegrityError (non listing_code): %s", e)
                    raise

        # All retries exhausted — final attempt with random code
        self.listing_code = self._random_code()
        logger.warning("All listing_code retries exhausted, final attempt with %s", self.listing_code)
        with transaction.atomic():
            super().save(*args, **kwargs)

    @staticmethod
    def _generate_listing_code() -> str:
        """Generate next sequential listing code like WB-1001, WB-1002, ..."""
        max_num = 1000
        try:
            from django.db import connection
            with connection.cursor() as cursor:
                cursor.execute(
                    "SELECT listing_code FROM listings "
                    "WHERE listing_code LIKE 'WB-%%' AND listing_code IS NOT NULL"
                )
                rows = cursor.fetchall()
            for (code,) in rows:
                if not code:
                    continue
                suffix = code.replace("WB-", "")
                try:
                    num = int(suffix)
                    if num > max_num:
                        max_num = num
                except (ValueError, TypeError):
                    pass  # skip random hex codes like WB-A3F1BC
        except Exception as e:
            logger.warning("listing_code query failed (falling back to count): %s", e)
            try:
                max_num = 1000 + Listing.all_objects.count()
            except Exception:
                pass
        return f"WB-{max_num + 1}"

    def set_account_credentials(self, email: str, password: str) -> None:
        """Encrypt and store account credentials."""
        self.account_email = encrypt_sensitive_data(email)
        self.account_password = encrypt_sensitive_data(password)

    def get_account_credentials(self) -> dict:
        """Decrypt and return account credentials."""
        return {
            "email": decrypt_sensitive_data(self.account_email) if self.account_email else "",
            "password": decrypt_sensitive_data(self.account_password) if self.account_password else "",
        }

    @property
    def discount_percentage(self) -> int | None:
        if self.original_price and self.original_price > self.price:
            discount = ((self.original_price - self.price) / self.original_price) * 100
            return int(discount)
        return None


class ListingImage(BaseModel):
    """Images associated with a listing."""

    listing = models.ForeignKey(Listing, on_delete=models.CASCADE, related_name="images")
    image = models.ImageField(upload_to="listings/%Y/%m/")
    is_primary = models.BooleanField(default=False)
    sort_order = models.PositiveIntegerField(default=0)

    class Meta:
        db_table = "listing_images"
        ordering = ["sort_order"]
        verbose_name = "Listing Image"
        verbose_name_plural = "Listing Images"

    def __str__(self) -> str:
        return f"Image for {self.listing.title}"


class Favorite(models.Model):
    """User's favorite listing."""

    id = models.AutoField(primary_key=True)
    user = models.ForeignKey(
        settings.AUTH_USER_MODEL,
        on_delete=models.CASCADE,
        related_name="favorites",
    )
    listing = models.ForeignKey(Listing, on_delete=models.CASCADE, related_name="favorited_by")
    created_at = models.DateTimeField(auto_now_add=True)

    class Meta:
        db_table = "favorites"
        unique_together = ["user", "listing"]
        ordering = ["-created_at"]
        verbose_name = "Favorite"
        verbose_name_plural = "Favorites"

    def __str__(self) -> str:
        return f"{self.user.email} → {self.listing.title}"


class ListingView(models.Model):
    """Track listing views."""

    id = models.AutoField(primary_key=True)
    listing = models.ForeignKey(Listing, on_delete=models.CASCADE, related_name="listing_views")
    user = models.ForeignKey(
        settings.AUTH_USER_MODEL,
        on_delete=models.SET_NULL,
        null=True,
        blank=True,
    )
    ip_address = models.GenericIPAddressField(null=True, blank=True)
    viewed_at = models.DateTimeField(auto_now_add=True)

    class Meta:
        db_table = "listing_views"
        ordering = ["-viewed_at"]
        verbose_name = "Listing View"
        verbose_name_plural = "Listing Views"

    def __str__(self) -> str:
        return f"View: {self.listing.title} at {self.viewed_at}"


class PromoCode(models.Model):
    """Promo / coupon code for discount on listing or cart."""

    code = models.CharField(max_length=50, unique=True, db_index=True)
    discount_percent = models.PositiveSmallIntegerField(default=0)
    discount_fixed = models.DecimalField(
        max_digits=15, decimal_places=2, default=0, null=True, blank=True
    )
    min_purchase = models.DecimalField(
        max_digits=15, decimal_places=2, default=0, null=True, blank=True
    )
    max_uses_total = models.PositiveIntegerField(null=True, blank=True)
    max_uses_per_user = models.PositiveIntegerField(default=1)
    valid_from = models.DateTimeField(null=True, blank=True)
    valid_until = models.DateTimeField(null=True, blank=True)
    is_active = models.BooleanField(default=True, db_index=True)
    game = models.ForeignKey(
        "games.Game",
        on_delete=models.CASCADE,
        null=True,
        blank=True,
        related_name="promo_codes",
    )
    created_at = models.DateTimeField(auto_now_add=True)

    class Meta:
        db_table = "promo_codes"
        ordering = ["-created_at"]
        verbose_name = "Promo Code"
        verbose_name_plural = "Promo Codes"

    def __str__(self) -> str:
        return self.code


class PromoCodeUse(models.Model):
    """Track promo code usage per user."""

    promo = models.ForeignKey(
        PromoCode, on_delete=models.CASCADE, related_name="uses"
    )
    user = models.ForeignKey(
        settings.AUTH_USER_MODEL, on_delete=models.CASCADE, related_name="promo_uses"
    )
    used_at = models.DateTimeField(auto_now_add=True)
    order_id = models.UUIDField(null=True, blank=True)

    class Meta:
        db_table = "promo_code_uses"
        ordering = ["-used_at"]
        verbose_name = "Promo Code Use"
        verbose_name_plural = "Promo Code Uses"

    def __str__(self) -> str:
        return f"{self.promo.code} by {self.user.email}"


class ListingPromotion(models.Model):
    """Track paid promotions for rental listings (ad placement)."""

    id = models.AutoField(primary_key=True)
    listing = models.ForeignKey(
        Listing, on_delete=models.CASCADE, related_name="promotions"
    )
    user = models.ForeignKey(
        settings.AUTH_USER_MODEL, on_delete=models.CASCADE, related_name="promotions"
    )
    hours = models.PositiveIntegerField(help_text="Promotion duration in hours")
    price_per_hour = models.DecimalField(
        max_digits=15, decimal_places=2,
        help_text="Price per hour at time of purchase",
    )
    discount_percent = models.PositiveSmallIntegerField(
        default=0, help_text="Discount applied (e.g. 10, 20, 30)",
    )
    total_cost = models.DecimalField(
        max_digits=15, decimal_places=2, help_text="Total amount charged",
    )
    starts_at = models.DateTimeField(help_text="When promotion starts")
    expires_at = models.DateTimeField(db_index=True, help_text="When promotion expires")
    is_active = models.BooleanField(default=True, db_index=True)
    created_at = models.DateTimeField(auto_now_add=True)

    class Meta:
        db_table = "listing_promotions"
        ordering = ["-created_at"]
        indexes = [
            models.Index(fields=["listing", "is_active", "expires_at"]),
        ]

    def __str__(self):
        return f"Promo: {self.listing.title} — {self.hours}h ({self.total_cost} so'm)"


class SavedSearch(models.Model):
    """User's saved search (alert when new listings match)."""

    user = models.ForeignKey(
        settings.AUTH_USER_MODEL,
        on_delete=models.CASCADE,
        related_name="saved_searches",
    )
    name = models.CharField(max_length=100)
    query_params = models.JSONField(default=dict)
    notify_email = models.BooleanField(default=True)
    is_active = models.BooleanField(default=True)
    last_notified_at = models.DateTimeField(null=True, blank=True)
    created_at = models.DateTimeField(auto_now_add=True)

    class Meta:
        db_table = "saved_searches"
        ordering = ["-created_at"]
        verbose_name = "Saved Search"
        verbose_name_plural = "Saved Searches"

    def __str__(self) -> str:
        return f"{self.name} ({self.user.email})"
