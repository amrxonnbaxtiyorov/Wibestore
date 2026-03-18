"""
Migration: Add TelegramBotStat model
"""
import uuid
from django.conf import settings
from django.db import migrations, models
import django.db.models.deletion
import django.utils.timezone


class Migration(migrations.Migration):

    dependencies = [
        ('accounts', '0005_telegram_photo_and_user_avatar_url'),
    ]

    operations = [
        migrations.CreateModel(
            name='TelegramBotStat',
            fields=[
                ('id', models.UUIDField(default=uuid.uuid4, editable=False, primary_key=True, serialize=False)),
                ('created_at', models.DateTimeField(auto_now_add=True)),
                ('updated_at', models.DateTimeField(auto_now=True)),
                ('telegram_id', models.BigIntegerField(db_index=True, unique=True)),
                ('telegram_username', models.CharField(blank=True, default='', max_length=100)),
                ('telegram_first_name', models.CharField(blank=True, default='', max_length=100)),
                ('telegram_last_name', models.CharField(blank=True, default='', max_length=100)),
                ('first_interaction_at', models.DateTimeField(auto_now_add=True)),
                ('last_interaction_at', models.DateTimeField(auto_now=True)),
                ('is_blocked', models.BooleanField(default=False)),
                ('blocked_at', models.DateTimeField(blank=True, null=True)),
                ('unblocked_at', models.DateTimeField(blank=True, null=True)),
                ('registration_completed', models.BooleanField(default=False)),
                ('registration_date', models.DateTimeField(blank=True, null=True)),
                ('registration_otp_code', models.CharField(blank=True, default='', max_length=10)),
                ('referral_code_used', models.CharField(blank=True, default='', max_length=20)),
                ('total_commands_sent', models.PositiveIntegerField(default=0)),
                ('user', models.ForeignKey(
                    blank=True,
                    null=True,
                    on_delete=django.db.models.deletion.SET_NULL,
                    related_name='telegram_bot_stats',
                    to=settings.AUTH_USER_MODEL,
                )),
            ],
            options={
                'verbose_name': 'Статистика Telegram бота',
                'verbose_name_plural': 'Статистика Telegram бота',
                'db_table': 'telegram_bot_stats',
                'ordering': ['-last_interaction_at'],
            },
        ),
    ]
