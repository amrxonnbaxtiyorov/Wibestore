import os
import sys
import django

os.environ.setdefault('DJANGO_SETTINGS_MODULE', 'config.settings.production')
django.setup()

from django.contrib.auth import get_user_model

User = get_user_model()

email = os.environ.get('ADMIN_EMAIL', 'admin@wibestore.uz')
username = os.environ.get('ADMIN_USERNAME', 'wibeadmin')
password = os.environ.get('ADMIN_PASSWORD', 'WibeStore2026!')

try:
    # Clean up any broken superuser records from old deployments
    # (old script incorrectly passed username as email)
    broken_users = User.objects.filter(email='admin')
    if broken_users.exists():
        print("Cleaning up broken superuser records...")
        broken_users.delete()

    user, created = User.objects.get_or_create(
        email=email,
        defaults={
            'username': username,
            'full_name': 'WibeStore Admin',
            'is_staff': True,
            'is_superuser': True,
            'is_active': True,
            'is_verified': True,
        }
    )

    # Always reset password + ensure superuser flags are correct
    user.set_password(password)
    user.is_staff = True
    user.is_superuser = True
    user.is_active = True
    user.is_verified = True
    user.username = username
    user.save()

    if created:
        print(f"Superuser created: {email}")
    else:
        print(f"Superuser updated: {email}")

except Exception as e:
    print(f"Warning: Could not create superuser: {e}")
    # Don't crash the entrypoint — server should still start

