"""
WibeStore Backend - Create Superuser Script
Creates a superuser for the admin panel.

Usage:
    python scripts/create_superuser.py
"""

import os
import sys

import django

os.environ.setdefault("DJANGO_SETTINGS_MODULE", "config.settings.development")
sys.path.insert(0, os.path.dirname(os.path.dirname(os.path.abspath(__file__))))
django.setup()

from django.contrib.auth import get_user_model

User = get_user_model()

ADMIN_EMAIL = os.environ.get("ADMIN_EMAIL", "admin@wibestore.uz")
ADMIN_USERNAME = os.environ.get("ADMIN_USERNAME", "admin")
ADMIN_PASSWORD = os.environ.get("ADMIN_PASSWORD", "admin123456")


def create_superuser():
    """Create a superuser if one doesn't already exist."""
    if User.objects.filter(email=ADMIN_EMAIL).exists():
        print(f"⚠️  Superuser with email {ADMIN_EMAIL} already exists.")
        return

    user = User.objects.create_superuser(
        email=ADMIN_EMAIL,
        username=ADMIN_USERNAME,
        password=ADMIN_PASSWORD,
        full_name="WibeStore Admin",
    )
    user.is_verified = True
    user.save(update_fields=["is_verified"])

    print(f"✅ Superuser created: {ADMIN_EMAIL}")
    print(f"   Username: {ADMIN_USERNAME}")
    print(f"   Password: {ADMIN_PASSWORD}")
    print("   ⚠️  Change the password after first login!")


if __name__ == "__main__":
    create_superuser()
