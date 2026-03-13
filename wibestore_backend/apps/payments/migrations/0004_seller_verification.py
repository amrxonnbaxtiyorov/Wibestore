"""
Migration: Add SellerVerification model
"""

import django.db.models.deletion
import uuid
from django.conf import settings
from django.db import migrations, models


class Migration(migrations.Migration):

    dependencies = [
        ("payments", "0003_add_deposit_request"),
        migrations.swappable_dependency(settings.AUTH_USER_MODEL),
    ]

    operations = [
        migrations.CreateModel(
            name="SellerVerification",
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
                    "status",
                    models.CharField(
                        choices=[
                            ("pending", "Kutilmoqda"),
                            ("passport_front_received", "Pasport old qismi qabul qilindi"),
                            ("passport_back_received", "Pasport orqa qismi qabul qilindi"),
                            ("video_received", "Doira video qabul qilindi"),
                            ("submitted", "Hujjatlar yuborildi — admin tekshiruvi kutilmoqda"),
                            ("approved", "Tasdiqlandi"),
                            ("rejected", "Rad etildi"),
                        ],
                        db_index=True,
                        default="pending",
                        max_length=30,
                    ),
                ),
                ("full_name", models.CharField(blank=True, default="", max_length=255)),
                ("passport_front_file_id", models.CharField(blank=True, default="", max_length=500)),
                ("passport_back_file_id", models.CharField(blank=True, default="", max_length=500)),
                ("circle_video_file_id", models.CharField(blank=True, default="", max_length=500)),
                ("location_latitude", models.FloatField(blank=True, null=True)),
                ("location_longitude", models.FloatField(blank=True, null=True)),
                ("submitted_at", models.DateTimeField(blank=True, null=True)),
                ("reviewed_at", models.DateTimeField(blank=True, null=True)),
                ("admin_note", models.TextField(blank=True, default="")),
                (
                    "escrow",
                    models.ForeignKey(
                        on_delete=django.db.models.deletion.CASCADE,
                        related_name="seller_verifications",
                        to="payments.escrowtransaction",
                    ),
                ),
                (
                    "seller",
                    models.ForeignKey(
                        on_delete=django.db.models.deletion.CASCADE,
                        related_name="seller_verifications",
                        to=settings.AUTH_USER_MODEL,
                    ),
                ),
                (
                    "reviewed_by",
                    models.ForeignKey(
                        blank=True,
                        null=True,
                        on_delete=django.db.models.deletion.SET_NULL,
                        related_name="reviewed_seller_verifications",
                        to=settings.AUTH_USER_MODEL,
                    ),
                ),
            ],
            options={
                "verbose_name": "Sotuvchi tekshiruvi",
                "verbose_name_plural": "Sotuvchi tekshiruvlari",
                "db_table": "seller_verifications",
                "ordering": ["-created_at"],
            },
        ),
    ]
