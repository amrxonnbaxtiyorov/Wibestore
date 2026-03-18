"""
WibeStore Backend - Notifications Services
"""

import logging

from django.contrib.auth import get_user_model

from .models import Notification, NotificationType

logger = logging.getLogger("apps.notifications")
User = get_user_model()


class NotificationService:
    """Service for creating and managing notifications."""

    @staticmethod
    def create_notification(
        user,
        title: str,
        message: str,
        type_code: str | None = None,
        data: dict | None = None,
        link: str = "",
    ) -> Notification:
        """Create a notification for a user."""
        notification_type = None
        if type_code:
            notification_type = NotificationType.objects.filter(code=type_code).first()

        notification = Notification.objects.create(
            user=user,
            type=notification_type,
            title=title,
            message=message,
            data=data or {},
            link=link,
        )

        # Send via WebSocket
        NotificationService._send_ws_notification(user, notification)

        logger.info("Notification created for %s: %s", user.email, title)
        return notification

    @staticmethod
    def notify_admins(title: str, message: str, data: dict | None = None) -> int:
        """Send notification to all admin users."""
        admins = User.objects.filter(is_staff=True, is_active=True)
        count = 0
        for admin in admins:
            NotificationService.create_notification(
                user=admin,
                title=title,
                message=message,
                type_code="admin",
                data=data,
            )
            count += 1
        return count

    @staticmethod
    def mark_all_read(user) -> int:
        """Mark all notifications as read for a user."""
        from django.utils import timezone
        return Notification.objects.filter(user=user, is_read=False).update(
            is_read=True, read_at=timezone.now()
        )

    @staticmethod
    def notify_trade_status_change(escrow, status: str) -> None:
        """
        BLOCK 7.2: Create Notification records for both buyer and seller
        when escrow status changes.
        """
        listing_title = escrow.listing.title if escrow.listing else "—"
        buyer = escrow.buyer
        seller = escrow.seller
        trade_link = f"/trade/{escrow.id}"

        messages = {
            "paid": {
                "buyer": ("Xarid qayta ishlandi", f"«{listing_title}» xarid qilindi. Sotuvchi akkauntni topshirishi kutilmoqda."),
                "seller": ("Akkauntingiz sotildi!", f"«{listing_title}» xarid qilindi. Akkauntni topshiring."),
            },
            "delivered": {
                "buyer": ("Sotuvchi akkauntni topshirdi", f"«{listing_title}» akkauntini tekshiring va tasdiqlang."),
                "seller": ("Topshirish tasdiqlandi", f"Haridor «{listing_title}» akkauntini tekshirmoqda."),
            },
            "confirmed": {
                "buyer": ("Savdo yakunlandi", f"«{listing_title}» xaridi muvaffaqiyatli yakunlandi!"),
                "seller": ("Mablag' hisobingizga o'tkazildi!", f"«{listing_title}» savdosi uchun {escrow.seller_earnings} so'm hisobingizda."),
            },
            "disputed": {
                "buyer": ("Shikoyat ochildi", f"«{listing_title}» bo'yicha shikoyat qabul qilindi. Admin ko'rib chiqmoqda."),
                "seller": ("Shikoyat ochildi", f"Haridor «{listing_title}» bo'yicha shikoyat ochdi. Admin ko'rib chiqmoqda."),
            },
            "refunded": {
                "buyer": ("Pul qaytarildi", f"«{listing_title}» xaridi bekor qilindi. Pul hisobingizga qaytarildi."),
                "seller": ("Savdo bekor qilindi", f"«{listing_title}» savdosi bekor qilindi."),
            },
        }

        if status not in messages:
            return

        buyer_title, buyer_msg = messages[status]["buyer"]
        seller_title, seller_msg = messages[status]["seller"]

        try:
            NotificationService.create_notification(
                user=buyer, title=buyer_title, message=buyer_msg,
                type_code="trade", data={"escrow_id": str(escrow.id)}, link=trade_link,
            )
        except Exception as e:
            logger.warning("Trade notification for buyer failed: %s", e)

        try:
            NotificationService.create_notification(
                user=seller, title=seller_title, message=seller_msg,
                type_code="trade", data={"escrow_id": str(escrow.id)}, link=trade_link,
            )
        except Exception as e:
            logger.warning("Trade notification for seller failed: %s", e)

    @staticmethod
    def _send_ws_notification(user, notification: Notification) -> None:
        """Send notification via WebSocket."""
        try:
            from channels.layers import get_channel_layer
            from asgiref.sync import async_to_sync

            channel_layer = get_channel_layer()
            async_to_sync(channel_layer.group_send)(
                f"notifications_{user.id}",
                {
                    "type": "notification_message",
                    "notification": {
                        "id": str(notification.id),
                        "title": notification.title,
                        "message": notification.message,
                        "data": notification.data,
                        "created_at": notification.created_at.isoformat(),
                    },
                },
            )
        except Exception as e:
            logger.warning("Failed to send WS notification: %s", e)
