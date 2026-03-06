"""
WibeStore Backend - Management Command: Clear all listings (remove all accounts from sale).

Usage:
    python manage.py clear_all_listings
    python manage.py clear_all_listings --no-input  # skip confirmation
"""

from django.core.management.base import BaseCommand
from django.db import transaction


class Command(BaseCommand):
    help = "Delete all listings (accounts on sale) from the database."

    def add_arguments(self, parser):
        parser.add_argument(
            "--no-input",
            action="store_true",
            help="Skip confirmation prompt.",
        )

    @transaction.atomic
    def handle(self, *args, **options):
        from apps.marketplace.models import Listing

        total = Listing.objects.count()
        if total == 0:
            self.stdout.write(self.style.SUCCESS("No listings found. Database is already empty."))
            return

        if not options["no_input"]:
            confirm = input(
                f"Are you sure you want to delete ALL {total} listing(s)? This cannot be undone. [y/N]: "
            )
            if confirm.lower() not in ("y", "yes"):
                self.stdout.write("Aborted.")
                return

        deleted, _ = Listing.objects.all().delete()
        self.stdout.write(self.style.SUCCESS(f"Successfully deleted {deleted} listing(s). All accounts have been removed from sale."))
