# Telegram bot orqali ro'yxatdan o'tish: telegram_id va TelegramRegistrationCode

from django.db import migrations, models


class Migration(migrations.Migration):

    dependencies = [
        ("accounts", "0002_referral_code_and_referral"),
    ]

    operations = [
        migrations.AddField(
            model_name="user",
            name="telegram_id",
            field=models.BigIntegerField(blank=True, db_index=True, null=True, unique=True),
        ),
        migrations.CreateModel(
            name="TelegramRegistrationCode",
            fields=[
                ("id", models.BigAutoField(auto_created=True, primary_key=True, serialize=False, verbose_name="ID")),
                ("telegram_id", models.BigIntegerField(db_index=True)),
                ("phone_number", models.CharField(max_length=20)),
                ("code", models.CharField(db_index=True, max_length=6)),
                ("is_used", models.BooleanField(default=False)),
                ("created_at", models.DateTimeField(auto_now_add=True)),
                ("expires_at", models.DateTimeField()),
            ],
            options={
                "db_table": "telegram_registration_codes",
                "ordering": ["-created_at"],
            },
        ),
        migrations.RunSQL(
            sql='CREATE INDEX IF NOT EXISTS "telegram_re_code_8a0b0d_idx" ON "telegram_registration_codes" ("code", "is_used");',
            reverse_sql='DROP INDEX IF EXISTS "telegram_re_code_8a0b0d_idx";',
        ),
    ]
