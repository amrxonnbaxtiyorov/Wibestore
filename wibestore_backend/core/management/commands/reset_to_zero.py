"""
WibeStore Backend - Reset site to zero (fresh launch).
Removes all listings, transactions, resets user sales stats; optionally chats/notifications.

Usage:
    python manage.py reset_to_zero --full --no-input
    python manage.py reset_to_zero --full                    # with confirmation
    python manage.py reset_to_zero --listings-only --no-input  # only listings (same as clear_all_listings)
"""

from django.core.management.base import BaseCommand
from django.db import transaction


class Command(BaseCommand):
    help = "Reset site to zero: remove all listings, transactions, reset user stats (fresh launch)."

    def add_arguments(self, parser):
        parser.add_argument(
            "--full",
            action="store_true",
            help="Full reset: listings + transactions + user stats (total_sales, total_purchases, balance, rating).",
        )
        parser.add_argument(
            "--listings-only",
            action="store_true",
            help="Only delete all listings (and cascade: images, favorites, views, escrow, reviews, reports).",
        )
        parser.add_argument(
            "--include-chats",
            action="store_true",
            help="[Full only] Also delete all chat rooms and messages.",
        )
        parser.add_argument(
            "--include-notifications",
            action="store_true",
            help="[Full only] Also delete all notifications.",
        )
        parser.add_argument(
            "--no-input",
            action="store_true",
            help="Skip confirmation prompt.",
        )

    @transaction.atomic
    def handle(self, *args, **options):
        from django.contrib.auth import get_user_model

        User = get_user_model()

        full = options["full"]
        listings_only = options["listings_only"]
        include_chats = options["include_chats"]
        include_notifications = options["include_notifications"]
        no_input = options["no_input"]

        if not full and not listings_only:
            self.stdout.write(
                self.style.WARNING("Specify --full or --listings-only. Use --full for complete fresh launch.")
            )
            return

        # Summary of what will happen
        if listings_only:
            from apps.marketplace.models import Listing

            total_listings = Listing.objects.count()
            msg = f"This will DELETE all {total_listings} listing(s) (and cascade: images, favorites, views, escrow, reviews, reports)."
        else:
            from apps.marketplace.models import Listing
            from apps.payments.models import Transaction

            total_listings = Listing.objects.count()
            total_tx = Transaction.objects.count()
            msg = (
                f"FULL RESET: Delete all {total_listings} listing(s), delete all {total_tx} transaction(s), "
                "and set every user's total_sales=0, total_purchases=0, balance=0, rating=5.00."
            )
            if include_chats:
                from apps.messaging.models import ChatRoom

                msg += f" Delete all {ChatRoom.objects.count()} chat room(s) and their messages."
            if include_notifications:
                try:
                    from apps.notifications.models import Notification

                    msg += f" Delete all {Notification.objects.count()} notification(s)."
                except Exception:
                    msg += " Clear notifications."
            msg += " This cannot be undone."

        if not no_input:
            confirm = input(f"{msg}\nType 'yes' to continue: ")
            if confirm.strip().lower() != "yes":
                self.stdout.write("Aborted.")
                return

        if listings_only or full:
            from apps.marketplace.models import Listing

            listing_count = Listing.objects.count()
            Listing.objects.all().delete()
            self.stdout.write(self.style.SUCCESS(f"Deleted {listing_count} listing(s) and related data (cascade)."))

        if full:
            from apps.payments.models import Transaction

            tx_count, _ = Transaction.objects.all().delete()
            self.stdout.write(self.style.SUCCESS(f"Deleted {tx_count} transaction(s)."))

            updated = User.objects.update(
                total_sales=0,
                total_purchases=0,
                balance=0,
                rating=5.00,
            )
            self.stdout.write(self.style.SUCCESS(f"Reset stats for {updated} user(s): total_sales=0, total_purchases=0, balance=0, rating=5.00."))

            if include_chats:
                from apps.messaging.models import ChatRoom, Message

                msg_count, _ = Message.objects.all().delete()
                room_count, _ = ChatRoom.objects.all().delete()
                self.stdout.write(self.style.SUCCESS(f"Deleted {room_count} chat room(s) and {msg_count} message(s)."))

            if include_notifications:
                try:
                    from apps.notifications.models import Notification

                    notif_count, _ = Notification.objects.all().delete()
                    self.stdout.write(self.style.SUCCESS(f"Deleted {notif_count} notification(s)."))
                except Exception as e:
                    self.stdout.write(self.style.WARNING(f"Notifications: {e}"))

        self.stdout.write(self.style.SUCCESS("Reset to zero complete. Site is ready for fresh launch."))
