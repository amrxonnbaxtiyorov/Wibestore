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

    # Optional: add a short system-style first message (from buyer so it's a normal message)
    if created:
        welcome = (
            f"Xarid tasdiqlandi. «{listing.title}» uchun suhbat boshlandi. "
            "Savollar bo'lsa shu yerda yozing."
        )
        Message.objects.create(room=room, sender=buyer, content=welcome)
        room.last_message = welcome[:200]
        room.last_message_at = timezone.now()
        room.save(update_fields=["last_message", "last_message_at"])
        logger.info("Order chat created: room %s for escrow %s (buyer=%s, seller=%s)", room.id, escrow.id, buyer.email, seller.email)

    return room
