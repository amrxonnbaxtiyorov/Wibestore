# TelegramRegistrationCode: photo_url; User: avatar_url (Telegram profil rasmi uchun)

from django.db import migrations, models


class Migration(migrations.Migration):

    dependencies = [
        ("accounts", "0004_telegramregistrationcode_full_name_and_code_length"),
    ]

    operations = [
        migrations.AddField(
            model_name="telegramregistrationcode",
            name="photo_url",
            field=models.URLField(blank=True, max_length=500, null=True),
        ),
        migrations.AddField(
            model_name="user",
            name="avatar_url",
            field=models.URLField(blank=True, max_length=500, null=True),
        ),
    ]
