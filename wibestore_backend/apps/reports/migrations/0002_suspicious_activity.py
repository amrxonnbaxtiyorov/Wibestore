# Generated manually for SuspiciousActivity

import django.db.models.deletion
from django.conf import settings
from django.db import migrations, models


class Migration(migrations.Migration):

    dependencies = [
        ("reports", "0001_initial"),
        migrations.swappable_dependency(settings.AUTH_USER_MODEL),
    ]

    operations = [
        migrations.CreateModel(
            name="SuspiciousActivity",
            fields=[
                ("id", models.BigAutoField(auto_created=True, primary_key=True, serialize=False, verbose_name="ID")),
                (
                    "activity_type",
                    models.CharField(
                        choices=[
                            ("many_purchases_same_ip", "Many purchases from same IP"),
                            ("new_user_high_value", "New user high-value purchase"),
                            ("many_accounts_same_ip", "Many accounts from same IP"),
                            ("other", "Other"),
                        ],
                        db_index=True,
                        max_length=30,
                    ),
                ),
                ("ip_address", models.GenericIPAddressField(blank=True, null=True)),
                ("details", models.JSONField(blank=True, default=dict)),
                ("resolved", models.BooleanField(db_index=True, default=False)),
                ("resolved_at", models.DateTimeField(blank=True, null=True)),
                ("created_at", models.DateTimeField(auto_now_add=True)),
                (
                    "resolved_by",
                    models.ForeignKey(
                        blank=True,
                        null=True,
                        on_delete=django.db.models.deletion.SET_NULL,
                        related_name="resolved_suspicious",
                        to=settings.AUTH_USER_MODEL,
                    ),
                ),
                (
                    "user",
                    models.ForeignKey(
                        blank=True,
                        null=True,
                        on_delete=django.db.models.deletion.CASCADE,
                        related_name="suspicious_activities",
                        to=settings.AUTH_USER_MODEL,
                    ),
                ),
            ],
            options={
                "verbose_name": "Suspicious Activity",
                "verbose_name_plural": "Suspicious Activities",
                "db_table": "suspicious_activities",
                "ordering": ["-created_at"],
            },
        ),
    ]
