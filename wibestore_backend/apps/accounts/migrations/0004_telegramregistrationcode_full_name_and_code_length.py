# TelegramRegistrationCode: full_name field va code max_length 10 ga oshirish

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
        migrations.AlterField(
            model_name="telegramregistrationcode",
            name="code",
            field=models.CharField(db_index=True, max_length=10),
        ),
    ]
