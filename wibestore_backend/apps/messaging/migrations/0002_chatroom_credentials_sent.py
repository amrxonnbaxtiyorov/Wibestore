from django.db import migrations, models


class Migration(migrations.Migration):

    dependencies = [
        ("messaging", "0001_initial"),
    ]

    operations = [
        migrations.AddField(
            model_name="chatroom",
            name="credentials_sent",
            field=models.BooleanField(default=False),
        ),
    ]
