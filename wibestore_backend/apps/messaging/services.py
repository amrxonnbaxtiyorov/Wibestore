"""
WibeStore Backend - Messaging Services
"""

import logging

from django.contrib.auth import get_user_model
from django.utils import timezone

from .models import ChatRoom, Message

User = get_user_model()
logger = logging.getLogger("apps.messaging")


def create_order_chat_for_escrow(escrow):
    """
    Create or get a chat room for an escrow (order) with buyer, seller and all site admins.
    Called after buyer pays (escrow created). Admin (is_staff) users are added so they can monitor.
    Posts an initial system message explaining the admin-mediated trade flow.
    """
    buyer = escrow.buyer
    seller = escrow.seller
    listing = escrow.listing

    # Find existing room for this listing with buyer and seller
    existing = (
        ChatRoom.objects.filter(listing=listing, is_active=True)
        .filter(participants=buyer)
        .filter(participants=seller)
    ).first()

    if existing:
        room = existing
        created = False
    else:
        room = ChatRoom.objects.create(listing=listing)
        room.participants.add(buyer, seller)
        created = True

    # Add all site administrators (is_staff) to the chat
    admins = User.objects.filter(is_staff=True, is_active=True).exclude(
        id__in=room.participants.values_list("id", flat=True)
    )
    if admins.exists():
        room.participants.add(*admins)
        logger.info(
            "Added %s admin(s) to order chat room %s (escrow %s)",
            admins.count(),
            room.id,
            escrow.id,
        )

    if created:
        # System message: explain the admin-mediated flow
        system_msg = (
            f"🛒 Xarid tasdiqlandi — «{listing.title}»\n\n"
            "📋 SAVDO TARTIBI:\n"
            "1️⃣ Sayt admini bu chatda nazoratchi sifatida mavjud\n"
            "2️⃣ Admin onlayn bo'lguncha login/parollar berilmaydi\n"
            "3️⃣ Admin javob bergandan so'ng akkaunt ma'lumotlari avtomatik yuboriladi\n"
            "4️⃣ Haridor akkauntni tekshirib, tasdiqlash tugmasini bosadi\n"
            "5️⃣ Mablag' faqat ikkala tomon tasdiqlagan so'ng sotuvchiga o'tkaziladi\n\n"
            "⚠️ Ogohlantirishlar:\n"
            "❌ Sayt chatidan tashqarida login/parol so'ramang yoki bermang\n"
            "❌ Telegram, WhatsApp yoki boshqa kanalda ma'lumot almashib bo'lmaydi\n"
            "✅ Mablag' escrow himoyasida saqlanmoqda — xavfsiz savdo kafolatlanadi"
        )
        system_sender = User.objects.filter(is_staff=True, is_active=True).first() or buyer
        Message.objects.create(
            room=room,
            sender=system_sender,
            content=system_msg,
            message_type="system",
        )
        room.last_message = "Xarid tasdiqlandi. Admin nazorat ostida savdo boshlanmoqda."
        room.last_message_at = timezone.now()
        room.save(update_fields=["last_message", "last_message_at"])
        logger.info(
            "Order chat created: room %s for escrow %s (buyer=%s, seller=%s)",
            room.id, escrow.id, buyer.email, seller.email,
        )

        # BLOCK 6: Notify admins about new trade chat
        try:
            notify_admin_new_trade_chat(room, escrow)
        except Exception as e:
            logger.warning("notify_admin_new_trade_chat call failed: %s", e)

    return room


def send_credentials_to_chat(room, escrow, sent_by_user=None):
    """
    Send account credentials (login/password) as a system message to the chat room.
    Called automatically when admin posts their first message.
    Returns True if credentials were sent, False if already sent or no credentials.
    """
    if room.credentials_sent:
        return False

    listing = (escrow.listing if escrow else None) or room.listing
    if not listing:
        return False

    try:
        creds = listing.get_account_credentials()
    except Exception:
        return False

    email = creds.get("email", "").strip()
    password = creds.get("password", "").strip()
    additional = listing.account_additional_info or {}

    if not email and not password:
        return False

    lines = [
        "🔑 AKKAUNT MA'LUMOTLARI (Admin tasdiqladi):",
        "",
    ]
    if email:
        lines.append(f"📧 Login/Email: {email}")
    if password:
        lines.append(f"🔒 Parol: {password}")
    if additional:
        for key, val in additional.items():
            lines.append(f"ℹ️ {key}: {val}")
    lines += [
        "",
        "⚠️ Ushbu ma'lumotlarni boshqalarga bermang!",
        "✅ Akkauntga kiring va tekshiring, keyin tasdiqlash tugmasini bosing.",
        "❌ Muammo bo'lsa — «Muammo bor» tugmasini bosing.",
    ]

    content = "\n".join(lines)
    sender = sent_by_user or User.objects.filter(is_staff=True, is_active=True).first()
    if not sender:
        return False

    Message.objects.create(
        room=room,
        sender=sender,
        content=content,
        message_type="system",
    )
    room.credentials_sent = True
    room.last_message = "Akkaunt ma'lumotlari yuborildi."
    room.last_message_at = timezone.now()
    room.save(update_fields=["credentials_sent", "last_message", "last_message_at"])

    logger.info("Credentials sent to chat room %s for listing %s", room.id, listing.id)
    return True


def notify_admin_new_trade_chat(chat_room, escrow) -> None:
    """
    BLOCK 6: Notify all admins with telegram_id when a new trade chat is opened.
    """
    try:
        from apps.payments.telegram_notify import _send_message, _get_admin_telegram_ids, SITE_URL
        buyer = escrow.buyer
        seller = escrow.seller
        listing = escrow.listing
        escrow_id = str(escrow.id)
        chat_link = f"{SITE_URL}/amirxon/trade-chats"

        text = (
            f"💬 <b>Yangi savdo chati ochildi!</b>\n"
            f"━━━━━━━━━━━━━━━━━━━━\n\n"
            f"📦 Akkaunt: <b>{listing.title}</b>\n"
            f"🎮 O'yin: {listing.game.name if listing.game else '—'}\n\n"
            f"🛒 Haridor: @{getattr(buyer, 'username', '') or buyer.display_name}\n"
            f"   📞 {buyer.phone_number or '—'}\n\n"
            f"💼 Sotuvchi: @{getattr(seller, 'username', '') or seller.display_name}\n"
            f"   📞 {seller.phone_number or '—'}\n\n"
            f"🔑 Savdo: #{escrow_id[:8]}"
        )
        keyboard = {
            "inline_keyboard": [[
                {"text": "📋 Chatni panelda ochish", "url": chat_link},
            ]]
        }
        for admin_id in _get_admin_telegram_ids():
            if admin_id in (getattr(buyer, "telegram_id", None), getattr(seller, "telegram_id", None)):
                continue
            _send_message(admin_id, text, reply_markup=keyboard)
    except Exception as e:
        logger.warning("notify_admin_new_trade_chat failed: %s", e)


def post_system_message_to_order_chat(escrow, content: str):
    """Post a system message to the order's chat room (for escrow status updates)."""
    try:
        room = (
            ChatRoom.objects.filter(
                listing=escrow.listing, is_active=True
            )
            .filter(participants=escrow.buyer)
            .filter(participants=escrow.seller)
            .first()
        )
        if not room:
            return

        sender = (
            User.objects.filter(is_staff=True, is_active=True).first()
            or escrow.seller
        )
        Message.objects.create(
            room=room,
            sender=sender,
            content=content,
            message_type="system",
        )
        room.last_message = content[:200]
        room.last_message_at = timezone.now()
        room.save(update_fields=["last_message", "last_message_at"])
    except Exception as e:
        logger.warning("Could not post system message to order chat: %s", e)
