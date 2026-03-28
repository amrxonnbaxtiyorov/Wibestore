"""
WibeStore Backend - Payments Models
PaymentMethod, Transaction, EscrowTransaction, DepositRequest models.
"""

from django.conf import settings
from django.db import models

from core.constants import (
    ESCROW_STATUS_CHOICES,
    PAYMENT_METHOD_CHOICES,
    TRANSACTION_STATUS_CHOICES,
    TRANSACTION_TYPE_CHOICES,
)
from core.models import BaseModel


class PaymentMethod(BaseModel):
    """Available payment methods: Google Pay, Visa Card, Mastercard, Apple Pay."""

    name = models.CharField(max_length=50)
    code = models.CharField(max_length=20, unique=True, choices=PAYMENT_METHOD_CHOICES)
    icon = models.CharField(max_length=10, blank=True, default="💳")
    is_active = models.BooleanField(default=True)
    config = models.JSONField(default=dict, blank=True)

    class Meta:
        db_table = "payment_methods"
        ordering = ["name"]
        verbose_name = "Payment Method"
        verbose_name_plural = "Payment Methods"

    def __str__(self) -> str:
        return self.name


class Transaction(BaseModel):
    """Financial transaction record."""

    user = models.ForeignKey(
        settings.AUTH_USER_MODEL,
        on_delete=models.CASCADE,
        related_name="transactions",
    )
    amount = models.DecimalField(max_digits=15, decimal_places=2)
    currency = models.CharField(max_length=3, default="UZS")
    type = models.CharField(
        max_length=20, choices=TRANSACTION_TYPE_CHOICES, db_index=True
    )
    status = models.CharField(
        max_length=20, choices=TRANSACTION_STATUS_CHOICES, default="pending", db_index=True
    )
    payment_method = models.ForeignKey(
        PaymentMethod, on_delete=models.SET_NULL, null=True, blank=True
    )
    provider_transaction_id = models.CharField(
        max_length=255, blank=True, default=""
    )
    description = models.TextField(blank=True, default="")
    metadata = models.JSONField(default=dict, blank=True)
    processed_at = models.DateTimeField(null=True, blank=True)
    failed_at = models.DateTimeField(null=True, blank=True)

    class Meta:
        db_table = "transactions"
        ordering = ["-created_at"]
        verbose_name = "Transaction"
        verbose_name_plural = "Transactions"
        indexes = [
            models.Index(fields=["user", "type"]),
            models.Index(fields=["status", "created_at"]),
        ]

    def __str__(self) -> str:
        return f"{self.type} - {self.amount} {self.currency} ({self.status})"


class EscrowTransaction(BaseModel):
    """Escrow (safe deal) transaction between buyer and seller."""

    listing = models.ForeignKey(
        "marketplace.Listing",
        on_delete=models.CASCADE,
        related_name="escrow_transactions",
    )
    buyer = models.ForeignKey(
        settings.AUTH_USER_MODEL,
        on_delete=models.CASCADE,
        related_name="escrow_purchases",
    )
    seller = models.ForeignKey(
        settings.AUTH_USER_MODEL,
        on_delete=models.CASCADE,
        related_name="escrow_sales",
    )
    amount = models.DecimalField(max_digits=15, decimal_places=2)
    commission_amount = models.DecimalField(
        max_digits=15, decimal_places=2, default=0
    )
    seller_earnings = models.DecimalField(
        max_digits=15, decimal_places=2, default=0
    )
    status = models.CharField(
        max_length=20, choices=ESCROW_STATUS_CHOICES, default="pending_payment", db_index=True
    )
    buyer_confirmed_at = models.DateTimeField(null=True, blank=True)
    seller_paid_at = models.DateTimeField(null=True, blank=True)
    admin_released_at = models.DateTimeField(null=True, blank=True)
    dispute_reason = models.TextField(blank=True, default="")
    dispute_resolved_by = models.ForeignKey(
        settings.AUTH_USER_MODEL,
        on_delete=models.SET_NULL,
        null=True,
        blank=True,
        related_name="resolved_disputes",
    )
    dispute_resolution = models.TextField(blank=True, default="")

    # ── Ikki tomonlama tasdiqlash/bekor qilish (BLOK 1) ──
    seller_confirmed = models.BooleanField(default=False)
    seller_confirmed_at_trade = models.DateTimeField(null=True, blank=True)
    seller_cancelled = models.BooleanField(default=False)
    seller_cancelled_at = models.DateTimeField(null=True, blank=True)
    seller_cancel_reason = models.TextField(blank=True, default="")

    buyer_confirmed = models.BooleanField(default=False)
    buyer_confirmed_at_trade = models.DateTimeField(null=True, blank=True)
    buyer_cancelled = models.BooleanField(default=False)
    buyer_cancelled_at = models.DateTimeField(null=True, blank=True)
    buyer_cancel_reason = models.TextField(blank=True, default="")

    # Savdo kodi — admin tekshiruvi uchun (WB-TRD-XXXXX)
    trade_code = models.CharField(
        max_length=20, unique=True, blank=True, null=True, db_index=True,
        help_text="Unique trade verification code for admin tracking"
    )

    # Telegram xabar IDlari (tugmalarni keyinchalik o'chirish uchun)
    seller_telegram_message_id = models.BigIntegerField(null=True, blank=True)
    buyer_telegram_message_id = models.BigIntegerField(null=True, blank=True)

    class Meta:
        db_table = "escrow_transactions"
        ordering = ["-created_at"]
        verbose_name = "Escrow Transaction"
        verbose_name_plural = "Escrow Transactions"

    def save(self, *args, **kwargs):
        if not self.trade_code:
            self.trade_code = self._generate_trade_code()
        super().save(*args, **kwargs)

    @staticmethod
    def _generate_trade_code():
        """Generate unique trade code like WB-TRD-10001."""
        import secrets
        for _ in range(10):
            code = f"WB-TRD-{secrets.randbelow(90000) + 10000}"
            if not EscrowTransaction.objects.filter(trade_code=code).exists():
                return code
        # Fallback: use hex token (collision-proof)
        return f"WB-TRD-{secrets.token_hex(3).upper()}"

    def __str__(self) -> str:
        code = self.trade_code or "N/A"
        return f"Escrow {code}: {self.listing.title} ({self.status})"


class SellerVerification(BaseModel):
    """Sotuvchi shaxsini tasdiqlash jarayoni — har bir escrow savdosi uchun."""

    STATUS_PENDING = "pending"
    STATUS_PASSPORT_FRONT = "passport_front_received"
    STATUS_PASSPORT_BACK = "passport_back_received"
    STATUS_VIDEO = "video_received"
    STATUS_SUBMITTED = "submitted"
    STATUS_APPROVED = "approved"
    STATUS_REJECTED = "rejected"

    STATUS_CHOICES = [
        (STATUS_PENDING, "Kutilmoqda"),
        (STATUS_PASSPORT_FRONT, "Pasport old qismi qabul qilindi"),
        (STATUS_PASSPORT_BACK, "Pasport orqa qismi qabul qilindi"),
        (STATUS_VIDEO, "Doira video qabul qilindi"),
        (STATUS_SUBMITTED, "Hujjatlar yuborildi — admin tekshiruvi kutilmoqda"),
        (STATUS_APPROVED, "Tasdiqlandi"),
        (STATUS_REJECTED, "Rad etildi"),
    ]

    escrow = models.ForeignKey(
        "EscrowTransaction",
        on_delete=models.CASCADE,
        related_name="seller_verifications",
    )
    seller = models.ForeignKey(
        settings.AUTH_USER_MODEL,
        on_delete=models.CASCADE,
        related_name="seller_verifications",
    )
    status = models.CharField(
        max_length=30,
        choices=STATUS_CHOICES,
        default=STATUS_PENDING,
        db_index=True,
    )
    # F.I.SH — pasport old qismining caption sifatida yoziladi
    full_name = models.CharField(max_length=255, blank=True, default="")
    # Telegram file_id lari (fayl Telegramda saqlanadi)
    passport_front_file_id = models.CharField(max_length=500, blank=True, default="")
    passport_back_file_id = models.CharField(max_length=500, blank=True, default="")
    circle_video_file_id = models.CharField(max_length=500, blank=True, default="")
    # Joylashuv
    location_latitude = models.FloatField(null=True, blank=True)
    location_longitude = models.FloatField(null=True, blank=True)
    # Admin
    submitted_at = models.DateTimeField(null=True, blank=True)
    reviewed_at = models.DateTimeField(null=True, blank=True)
    reviewed_by = models.ForeignKey(
        settings.AUTH_USER_MODEL,
        on_delete=models.SET_NULL,
        null=True,
        blank=True,
        related_name="reviewed_seller_verifications",
    )
    admin_note = models.TextField(blank=True, default="")

    class Meta:
        db_table = "seller_verifications"
        ordering = ["-created_at"]
        verbose_name = "Sotuvchi tekshiruvi"
        verbose_name_plural = "Sotuvchi tekshiruvlari"

    def __str__(self) -> str:
        return f"SellerVerification: {self.seller} — {self.get_status_display()}"

    def reset_for_resubmission(self):
        """Rad etilgandan so'ng qayta yuborish uchun sıfırlash."""
        self.status = self.STATUS_PENDING
        self.full_name = ""
        self.passport_front_file_id = ""
        self.passport_back_file_id = ""
        self.circle_video_file_id = ""
        self.location_latitude = None
        self.location_longitude = None
        self.submitted_at = None
        self.reviewed_at = None
        self.reviewed_by = None
        self.admin_note = ""
        self.save()


class DepositRequest(BaseModel):
    """Telegram bot orqali yuborilgan hisob to'ldirish so'rovi (screenshot bilan)."""

    STATUS_PENDING = "pending"
    STATUS_APPROVED = "approved"
    STATUS_REJECTED = "rejected"

    STATUS_CHOICES = [
        (STATUS_PENDING, "Kutilmoqda"),
        (STATUS_APPROVED, "Tasdiqlandi"),
        (STATUS_REJECTED, "Rad etildi"),
    ]

    user = models.ForeignKey(
        settings.AUTH_USER_MODEL,
        on_delete=models.SET_NULL,
        related_name="deposit_requests",
        null=True,
        blank=True,
    )
    telegram_id = models.BigIntegerField(db_index=True)
    telegram_username = models.CharField(max_length=100, blank=True, default="")
    phone_number = models.CharField(max_length=20, blank=True, default="")
    amount = models.DecimalField(max_digits=15, decimal_places=2, null=True, blank=True)
    screenshot = models.ImageField(
        upload_to="deposit_screenshots/%Y/%m/",
        null=True,
        blank=True,
        verbose_name="Skrinshot",
    )
    sent_at = models.DateTimeField(verbose_name="Yuborilgan vaqt")
    status = models.CharField(
        max_length=20,
        choices=STATUS_CHOICES,
        default=STATUS_PENDING,
        db_index=True,
        verbose_name="Holat",
    )
    reviewed_by = models.ForeignKey(
        settings.AUTH_USER_MODEL,
        on_delete=models.SET_NULL,
        null=True,
        blank=True,
        related_name="reviewed_deposit_requests",
        verbose_name="Ko'rib chiqqan admin",
    )
    reviewed_at = models.DateTimeField(null=True, blank=True, verbose_name="Ko'rib chiqilgan vaqt")
    admin_note = models.TextField(blank=True, default="", verbose_name="Admin izohi")
    transaction = models.OneToOneField(
        Transaction,
        on_delete=models.SET_NULL,
        null=True,
        blank=True,
        related_name="deposit_request",
        verbose_name="Tranzaksiya",
    )

    class Meta:
        db_table = "deposit_requests"
        ordering = ["-sent_at"]
        verbose_name = "Hisob to'ldirish so'rovi"
        verbose_name_plural = "Hisob to'ldirish so'rovlari"

    def __str__(self) -> str:
        amount_str = f"{int(self.amount):,} UZS" if self.amount else "Noma'lum summa"
        return f"DepositRequest #{str(self.id)[:8]} — {amount_str} ({self.get_status_display()})"


class WithdrawalRequest(BaseModel):
    """Pul yechish so'rovi — foydalanuvchi Telegram bot orqali yuboradi."""

    STATUS_PENDING = "pending"
    STATUS_PROCESSING = "processing"
    STATUS_COMPLETED = "completed"
    STATUS_REJECTED = "rejected"

    STATUS_CHOICES = [
        (STATUS_PENDING, "Kutilmoqda"),
        (STATUS_PROCESSING, "Jarayonda"),
        (STATUS_COMPLETED, "Bajarildi"),
        (STATUS_REJECTED, "Rad etildi"),
    ]

    CARD_TYPE_CHOICES = [
        ("humo", "HUMO"),
        ("uzcard", "UZCARD"),
        ("visa", "VISA"),
        ("mastercard", "MasterCard"),
    ]

    user = models.ForeignKey(
        settings.AUTH_USER_MODEL,
        on_delete=models.CASCADE,
        related_name="withdrawal_requests",
    )
    amount = models.DecimalField(max_digits=12, decimal_places=2)
    currency = models.CharField(max_length=10, default="UZS")

    # Karta ma'lumotlari
    card_number = models.CharField(max_length=20)
    card_holder_name = models.CharField(max_length=200, blank=True, default="")
    card_type = models.CharField(max_length=20, choices=CARD_TYPE_CHOICES, default="humo")

    # Holat
    status = models.CharField(
        max_length=20,
        choices=STATUS_CHOICES,
        default=STATUS_PENDING,
        db_index=True,
    )

    # Admin
    reviewed_by = models.ForeignKey(
        settings.AUTH_USER_MODEL,
        on_delete=models.SET_NULL,
        null=True,
        blank=True,
        related_name="reviewed_withdrawals",
    )
    reviewed_at = models.DateTimeField(null=True, blank=True)
    admin_note = models.TextField(blank=True, default="")
    rejection_reason = models.TextField(blank=True, default="")

    # Telegram
    user_telegram_id = models.BigIntegerField(null=True, blank=True)
    admin_message_id = models.BigIntegerField(null=True, blank=True)

    class Meta:
        db_table = "withdrawal_requests"
        ordering = ["-created_at"]
        verbose_name = "Pul yechish so'rovi"
        verbose_name_plural = "Pul yechish so'rovlari"

    def __str__(self) -> str:
        return f"WithdrawalRequest #{str(self.id)[:8]} — {int(self.amount):,} UZS ({self.get_status_display()})"
