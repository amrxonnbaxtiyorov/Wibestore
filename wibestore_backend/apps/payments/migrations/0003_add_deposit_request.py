"""
Migration: Add DepositRequest model
"""

import django.db.models.deletion
import django.utils.timezone
import uuid
from django.conf import settings
from django.db import migrations, models


class Migration(migrations.Migration):

    dependencies = [
        ("payments", "0002_payment_method_choices"),
        migrations.swappable_dependency(settings.AUTH_USER_MODEL),
    ]

    operations = [
        migrations.CreateModel(
            name="DepositRequest",
            fields=[
                (
                    "id",
                    models.UUIDField(
                        default=uuid.uuid4,
                        editable=False,
                        primary_key=True,
                        serialize=False,
                    ),
                ),
                ("created_at", models.DateTimeField(auto_now_add=True)),
                ("updated_at", models.DateTimeField(auto_now=True)),
                (
                    "telegram_id",
                    models.BigIntegerField(db_index=True),
                ),
                (
                    "telegram_username",
                    models.CharField(blank=True, default="", max_length=100),
                ),
                (
                    "phone_number",
                    models.CharField(blank=True, default="", max_length=20),
                ),
                (
                    "amount",
                    models.DecimalField(
                        blank=True, decimal_places=2, max_digits=15, null=True
                    ),
                ),
                (
                    "screenshot",
                    models.ImageField(
                        blank=True,
                        null=True,
                        upload_to="deposit_screenshots/%Y/%m/",
                        verbose_name="Skrinshot",
                    ),
                ),
                (
                    "sent_at",
                    models.DateTimeField(verbose_name="Yuborilgan vaqt"),
                ),
                (
                    "status",
                    models.CharField(
                        choices=[
                            ("pending", "Kutilmoqda"),
                            ("approved", "Tasdiqlandi"),
                            ("rejected", "Rad etildi"),
                        ],
                        db_index=True,
                        default="pending",
                        max_length=20,
                        verbose_name="Holat",
                    ),
                ),
                (
                    "reviewed_at",
                    models.DateTimeField(
                        blank=True, null=True, verbose_name="Ko'rib chiqilgan vaqt"
                    ),
                ),
                (
                    "admin_note",
                    models.TextField(blank=True, default="", verbose_name="Admin izohi"),
                ),
                (
                    "reviewed_by",
                    models.ForeignKey(
                        blank=True,
                        null=True,
                        on_delete=django.db.models.deletion.SET_NULL,
                        related_name="reviewed_deposit_requests",
                        to=settings.AUTH_USER_MODEL,
                        verbose_name="Ko'rib chiqqan admin",
                    ),
                ),
                (
                    "transaction",
                    models.OneToOneField(
                        blank=True,
                        null=True,
                        on_delete=django.db.models.deletion.SET_NULL,
                        related_name="deposit_request",
                        to="payments.transaction",
                        verbose_name="Tranzaksiya",
                    ),
                ),
                (
                    "user",
                    models.ForeignKey(
                        blank=True,
                        null=True,
                        on_delete=django.db.models.deletion.SET_NULL,
                        related_name="deposit_requests",
                        to=settings.AUTH_USER_MODEL,
                    ),
                ),
            ],
            options={
                "verbose_name": "Hisob to'ldirish so'rovi",
                "verbose_name_plural": "Hisob to'ldirish so'rovlari",
                "db_table": "deposit_requests",
                "ordering": ["-sent_at"],
            },
        ),
    ]
