from django.contrib.auth import get_user_model
import os

User = get_user_model()
username = 'admin'
email = 'admin@wibestore.uz'
password = 'Admin123!'

if not User.objects.filter(username=username).exists():
    print(f"User {username} not found, creating...")
    User.objects.create_superuser(username, email, password)
    print(f"Superuser created: {username} / {password}")
else:
    print(f"Superuser {username} already exists.")
