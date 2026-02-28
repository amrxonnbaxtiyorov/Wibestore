# TelegramRegistrationCode: full_name field qo'shish

from django.db import migrations, models


class Migration(migrations.Migration):

    dependencies = [
        ("accounts", "0003_telegram_registration"),
    ]

    operations = [
        migrations.AddField(
            model_name="telegramregistrationcode",
            name="full_name",
            field=models.CharField(blank=True, default="", max_length=150),
        ),
    ]
