"""
WibeStore Backend - Marketplace Models
Listing, ListingImage, Favorite, View models.
"""

from django.conf import settings
from django.db import models

from core.constants import LISTING_STATUS_CHOICES, LOGIN_METHOD_CHOICES
from core.models import BaseModel, BaseSoftDeleteModel
from core.utils import encrypt_sensitive_data, decrypt_sensitive_data


class Listing(BaseSoftDeleteModel):
    """Game account listing for sale."""

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
            models.Index(fields=["price"]),
        ]

    def __str__(self) -> str:
        return f"{self.title} ({self.game.name})"

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
