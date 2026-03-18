"""
Admin Panel initial migration
"""
import uuid
from django.conf import settings
from django.db import migrations, models
import django.db.models.deletion
import django.utils.timezone


class Migration(migrations.Migration):

    initial = True

    dependencies = [
        migrations.swappable_dependency(settings.AUTH_USER_MODEL),
    ]

    operations = [
        migrations.CreateModel(
            name='AdminAction',
            fields=[
                ('id', models.UUIDField(default=uuid.uuid4, editable=False, primary_key=True, serialize=False)),
                ('created_at', models.DateTimeField(auto_now_add=True)),
                ('updated_at', models.DateTimeField(auto_now=True)),
                ('action_type', models.CharField(max_length=50)),
                ('target_type', models.CharField(max_length=50)),
                ('target_id', models.CharField(max_length=36)),
                ('details', models.JSONField(default=dict)),
                ('ip_address', models.GenericIPAddressField(blank=True, null=True)),
                ('admin', models.ForeignKey(
                    on_delete=django.db.models.deletion.CASCADE,
                    related_name='admin_actions',
                    to=settings.AUTH_USER_MODEL,
                )),
            ],
            options={
                'verbose_name': 'Admin Action',
                'verbose_name_plural': 'Admin Actions',
                'db_table': 'admin_actions',
                'ordering': ['-created_at'],
            },
        ),
    ]
