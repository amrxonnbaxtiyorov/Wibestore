# Generated manually for warranty, flash sale, promo, saved search

import django.db.models.deletion
from django.conf import settings
from django.db import migrations, models


class Migration(migrations.Migration):

    dependencies = [
        ("marketplace", "0001_initial"),
        ("games", "0001_initial"),
        migrations.swappable_dependency(settings.AUTH_USER_MODEL),
    ]

    operations = [
        migrations.AddField(
            model_name="listing",
            name="warranty_days",
            field=models.PositiveSmallIntegerField(
                blank=True,
                default=0,
                help_text="Kafolat muddati (kun); 0 = kafolat yo'q",
            ),
        ),
        migrations.AddField(
            model_name="listing",
            name="sale_percent",
            field=models.PositiveSmallIntegerField(
                blank=True,
                help_text="Chegirma foizi (flash sale); null = aksiya yo'q",
                null=True,
            ),
        ),
        migrations.AddField(
            model_name="listing",
            name="sale_ends_at",
            field=models.DateTimeField(
                blank=True,
                help_text="Aksiya tugash vaqti",
                null=True,
            ),
        ),
        migrations.CreateModel(
            name="PromoCode",
            fields=[
                ("id", models.BigAutoField(auto_created=True, primary_key=True, serialize=False, verbose_name="ID")),
                ("code", models.CharField(db_index=True, max_length=50, unique=True)),
                ("discount_percent", models.PositiveSmallIntegerField(default=0)),
                ("discount_fixed", models.DecimalField(blank=True, decimal_places=2, max_digits=15, null=True)),
                ("min_purchase", models.DecimalField(blank=True, decimal_places=2, max_digits=15, null=True)),
                ("max_uses_total", models.PositiveIntegerField(blank=True, null=True)),
                ("max_uses_per_user", models.PositiveIntegerField(default=1)),
                ("valid_from", models.DateTimeField(blank=True, null=True)),
                ("valid_until", models.DateTimeField(blank=True, null=True)),
                ("is_active", models.BooleanField(db_index=True, default=True)),
                ("created_at", models.DateTimeField(auto_now_add=True)),
                (
                    "game",
                    models.ForeignKey(
                        blank=True,
                        null=True,
                        on_delete=django.db.models.deletion.CASCADE,
                        related_name="promo_codes",
                        to="games.game",
                    ),
                ),
            ],
            options={
                "verbose_name": "Promo Code",
                "verbose_name_plural": "Promo Codes",
                "db_table": "promo_codes",
                "ordering": ["-created_at"],
            },
        ),
        migrations.CreateModel(
            name="SavedSearch",
            fields=[
                ("id", models.BigAutoField(auto_created=True, primary_key=True, serialize=False, verbose_name="ID")),
                ("name", models.CharField(max_length=100)),
                ("query_params", models.JSONField(default=dict)),
                ("notify_email", models.BooleanField(default=True)),
                ("is_active", models.BooleanField(default=True)),
                ("last_notified_at", models.DateTimeField(blank=True, null=True)),
                ("created_at", models.DateTimeField(auto_now_add=True)),
                (
                    "user",
                    models.ForeignKey(
                        on_delete=django.db.models.deletion.CASCADE,
                        related_name="saved_searches",
                        to=settings.AUTH_USER_MODEL,
                    ),
                ),
            ],
            options={
                "verbose_name": "Saved Search",
                "verbose_name_plural": "Saved Searches",
                "db_table": "saved_searches",
                "ordering": ["-created_at"],
            },
        ),
        migrations.CreateModel(
            name="PromoCodeUse",
            fields=[
                ("id", models.BigAutoField(auto_created=True, primary_key=True, serialize=False, verbose_name="ID")),
                ("used_at", models.DateTimeField(auto_now_add=True)),
                ("order_id", models.UUIDField(blank=True, null=True)),
                (
                    "promo",
                    models.ForeignKey(
                        on_delete=django.db.models.deletion.CASCADE,
                        related_name="uses",
                        to="marketplace.promocode",
                    ),
                ),
                (
                    "user",
                    models.ForeignKey(
                        on_delete=django.db.models.deletion.CASCADE,
                        related_name="promo_uses",
                        to=settings.AUTH_USER_MODEL,
                    ),
                ),
            ],
            options={
                "verbose_name": "Promo Code Use",
                "verbose_name_plural": "Promo Code Uses",
                "db_table": "promo_code_uses",
                "ordering": ["-used_at"],
            },
        ),
    ]
