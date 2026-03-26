"""
Management command: ADMIN_PHONE_NUMBERS dagi raqamlarni is_staff=True qiladi.
Deploy qilinganda yoki migrate dan keyin ishga tushiriladi.

Usage: python manage.py setup_admin
"""

from django.conf import settings
from django.core.management.base import BaseCommand


class Command(BaseCommand):
    help = "Set is_staff=True for phone numbers listed in ADMIN_PHONE_NUMBERS setting"

    def handle(self, *args, **options):
        from django.contrib.auth import get_user_model
        User = get_user_model()

        admin_phones = getattr(settings, "ADMIN_PHONE_NUMBERS", [])
        if not admin_phones:
            self.stdout.write(self.style.WARNING("ADMIN_PHONE_NUMBERS not configured"))
            return

        for phone in admin_phones:
            clean = phone.replace("+", "").replace(" ", "").replace("-", "")
            users = User.objects.filter(phone_number__contains=clean)
            if not users.exists():
                self.stdout.write(self.style.WARNING(f"  No user found with phone {phone}"))
                continue
            for user in users:
                if not user.is_staff:
                    user.is_staff = True
                    user.save(update_fields=["is_staff"])
                    self.stdout.write(self.style.SUCCESS(f"  GRANTED: {user.email} ({user.phone_number}) -> is_staff=True"))
                else:
                    self.stdout.write(f"  OK: {user.email} ({user.phone_number}) already is_staff=True")
