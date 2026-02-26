# Generated manually - payment methods: Google Pay, Visa, Mastercard, Apple Pay

from django.db import migrations, models


class Migration(migrations.Migration):

    dependencies = [
        ("payments", "0001_initial"),
    ]

    operations = [
        migrations.AlterField(
            model_name="paymentmethod",
            name="code",
            field=models.CharField(
                choices=[
                    ("google_pay", "Google Pay"),
                    ("visa", "Visa Card"),
                    ("mastercard", "Mastercard"),
                    ("apple_pay", "Apple Pay"),
                ],
                max_length=20,
                unique=True,
            ),
        ),
    ]
