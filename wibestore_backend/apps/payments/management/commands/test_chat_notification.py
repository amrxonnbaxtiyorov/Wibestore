"""
Test: Chat notification -> Telegram bot orqali xabar yuborish tekshiruvi.

Ishlatish:
    python manage.py test_chat_notification
    python manage.py test_chat_notification --dry-run
"""

import os

from django.core.management.base import BaseCommand


class Command(BaseCommand):
    help = "Chat notification tizimini test qiladi."

    def add_arguments(self, parser):
        parser.add_argument("--dry-run", action="store_true", help="Faqat tekshiruv.")

    def handle(self, *args, **options):
        dry_run = options["dry_run"]
        errors = []
        warnings = []

        self.stdout.write("\n" + "=" * 60)
        self.stdout.write("  CHAT -> TELEGRAM NOTIFICATION TEST")
        self.stdout.write("=" * 60 + "\n")

        # 1. BOT_TOKEN
        bot_token = os.getenv("BOT_TOKEN", "") or os.getenv("TELEGRAM_BOT_TOKEN", "")
        if bot_token:
            masked = bot_token[:8] + "..." + bot_token[-4:]
            self.stdout.write(self.style.SUCCESS("[1] BOT_TOKEN: %s  OK" % masked))
        else:
            errors.append("BOT_TOKEN not set")
            self.stdout.write(self.style.ERROR("[1] BOT_TOKEN: MISSING"))

        # 2. FRONTEND_URL
        from django.conf import settings as _settings
        frontend_url = getattr(_settings, "FRONTEND_URL", None)
        if frontend_url:
            self.stdout.write(self.style.SUCCESS("[2] FRONTEND_URL: %s  OK" % frontend_url))
        else:
            site_url = os.getenv("SITE_URL", "https://wibestore.net")
            warnings.append("FRONTEND_URL not set, fallback: %s" % site_url)
            self.stdout.write(self.style.WARNING("[2] FRONTEND_URL: not set (fallback: %s)" % site_url))

        # 3. Users with telegram_id
        from django.contrib.auth import get_user_model
        User = get_user_model()
        users_with_tg = User.objects.filter(telegram_id__isnull=False, is_active=True).count()
        total_users = User.objects.filter(is_active=True).count()
        if users_with_tg > 0:
            self.stdout.write(self.style.SUCCESS(
                "[3] Users with telegram_id: %d/%d  OK" % (users_with_tg, total_users)
            ))
        else:
            errors.append("No users have telegram_id")
            self.stdout.write(self.style.ERROR(
                "[3] Users with telegram_id: 0/%d  FAIL" % total_users
            ))

        # 4. Chat rooms and messages
        from apps.messaging.models import ChatRoom, Message
        total_rooms = ChatRoom.objects.filter(is_active=True).count()
        total_msgs = Message.objects.count()
        self.stdout.write("[4] Chat rooms: %d, Messages: %d" % (total_rooms, total_msgs))

        # 5. Last message details
        last_msg = (
            Message.objects
            .select_related("sender", "room", "room__listing")
            .order_by("-created_at")
            .first()
        )
        if last_msg:
            room = last_msg.room
            sender = last_msg.sender
            recipients = list(room.participants.exclude(id=sender.id))

            self.stdout.write("\n--- Last message ---")
            self.stdout.write("  Room: %s" % room.id)
            self.stdout.write("  Sender: %s (id=%s)" % (sender.display_name, sender.id))
            self.stdout.write("  Content: %s..." % last_msg.content[:60])
            self.stdout.write("  is_read: %s" % last_msg.is_read)
            self.stdout.write("  created_at: %s" % last_msg.created_at)

            if recipients:
                for r in recipients:
                    tg = getattr(r, "telegram_id", None)
                    st = "telegram_id=%s" % tg if tg else "NO telegram_id"
                    self.stdout.write("  Recipient: %s -> %s" % (r.display_name, st))
            else:
                warnings.append("No recipients for last message")
                self.stdout.write(self.style.WARNING("  Recipient: none found"))

            # 6. Antispam check
            unread = Message.objects.filter(room=room, sender=sender, is_read=False).count()
            self.stdout.write("  Unread from sender: %d" % unread)
            if unread > 1:
                self.stdout.write(self.style.WARNING(
                    "  ANTISPAM: %d unread msgs -> notification BLOCKED" % unread
                ))
        else:
            warnings.append("No messages in chat")
            self.stdout.write(self.style.WARNING("[5] No messages in chat"))

        # 7. Send test message
        if not dry_run and bot_token and users_with_tg > 0:
            self.stdout.write("\n--- Sending test message ---")
            test_user = User.objects.filter(
                telegram_id__isnull=False, is_active=True
            ).first()
            if test_user:
                from apps.payments.telegram_notify import _send_message
                test_text = (
                    "<b>WibeStore Test</b>\n\n"
                    "Bu test xabar -- chat notification tizimi tekshiruvi.\n"
                    "Agar ko'rsangiz, tizim ishlayapti!"
                )
                ok = _send_message(test_user.telegram_id, test_text)
                if ok:
                    self.stdout.write(self.style.SUCCESS(
                        "  SENT -> %s (tg=%s)" % (test_user.display_name, test_user.telegram_id)
                    ))
                else:
                    errors.append("Test message FAILED -> tg=%s" % test_user.telegram_id)
                    self.stdout.write(self.style.ERROR(
                        "  FAILED -> tg=%s" % test_user.telegram_id
                    ))
        elif dry_run:
            self.stdout.write(self.style.WARNING("\n[7] --dry-run: no test message sent"))

        # 8. Celery check
        self.stdout.write("\n--- Celery ---")
        try:
            from apps.payments.telegram_notify import notify_new_chat_message
            if hasattr(notify_new_chat_message, "apply_async"):
                self.stdout.write(self.style.SUCCESS("  [8] Celery task: OK"))
            else:
                warnings.append("Celery task exists but no apply_async")
                self.stdout.write(self.style.WARNING("  [8] Celery task: fallback (sync)"))
        except Exception as e:
            warnings.append("Celery import error: %s" % e)
            self.stdout.write(self.style.WARNING("  [8] Celery: %s" % e))

        # Result
        self.stdout.write("\n" + "=" * 60)
        if errors:
            self.stdout.write(self.style.ERROR("  ERRORS: %d" % len(errors)))
            for e in errors:
                self.stdout.write(self.style.ERROR("     - %s" % e))
        if warnings:
            self.stdout.write(self.style.WARNING("  WARNINGS: %d" % len(warnings)))
            for w in warnings:
                self.stdout.write(self.style.WARNING("     - %s" % w))
        if not errors and not warnings:
            self.stdout.write(self.style.SUCCESS("  ALL CHECKS PASSED!"))
        elif not errors:
            self.stdout.write(self.style.SUCCESS("  CORE CHECKS PASSED (warnings exist)"))
        self.stdout.write("=" * 60 + "\n")
