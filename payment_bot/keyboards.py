"""Payment Bot — Keyboards."""

from aiogram.types import (
    InlineKeyboardButton,
    InlineKeyboardMarkup,
    ReplyKeyboardMarkup,
    KeyboardButton,
)


# ── Reply keyboards ───────────────────────────────────────────────────

def main_menu_keyboard() -> ReplyKeyboardMarkup:
    return ReplyKeyboardMarkup(
        keyboard=[
            [KeyboardButton(text="💰 Balans to'ldirish"), KeyboardButton(text="💸 Pul yechish")],
            [KeyboardButton(text="⭐ Obunalar"), KeyboardButton(text="📊 Mening hisobim")],
            [KeyboardButton(text="📞 Yordam")],
        ],
        resize_keyboard=True,
    )


def admin_menu_keyboard() -> ReplyKeyboardMarkup:
    return ReplyKeyboardMarkup(
        keyboard=[
            [KeyboardButton(text="📥 Kutilayotgan depozitlar"), KeyboardButton(text="📤 Kutilayotgan yechimlar")],
            [KeyboardButton(text="📋 Tekshiruvlar"), KeyboardButton(text="📊 Statistika")],
            [KeyboardButton(text="🔙 Asosiy menyu")],
        ],
        resize_keyboard=True,
    )


def cancel_keyboard() -> ReplyKeyboardMarkup:
    return ReplyKeyboardMarkup(
        keyboard=[[KeyboardButton(text="❌ Bekor qilish")]],
        resize_keyboard=True,
    )


def skip_keyboard() -> ReplyKeyboardMarkup:
    return ReplyKeyboardMarkup(
        keyboard=[[KeyboardButton(text="❌ Bekor qilish")]],
        resize_keyboard=True,
    )


def location_keyboard() -> ReplyKeyboardMarkup:
    return ReplyKeyboardMarkup(
        keyboard=[
            [KeyboardButton(text="📍 Joylashuvni yuborish", request_location=True)],
            [KeyboardButton(text="❌ Bekor qilish")],
        ],
        resize_keyboard=True,
    )


def confirm_withdrawal_keyboard() -> ReplyKeyboardMarkup:
    return ReplyKeyboardMarkup(
        keyboard=[
            [KeyboardButton(text="✅ Tasdiqlash"), KeyboardButton(text="❌ Bekor qilish")],
        ],
        resize_keyboard=True,
    )


# ── Inline keyboards ─────────────────────────────────────────────────

def trade_confirm_keyboard(escrow_id: str, side: str) -> InlineKeyboardMarkup:
    """Savdo tasdiqlash/bekor qilish tugmalari."""
    if side == "seller":
        return InlineKeyboardMarkup(inline_keyboard=[[
            InlineKeyboardButton(text="✅ Tasdiqlash", callback_data=f"trade_seller_ok:{escrow_id}"),
            InlineKeyboardButton(text="❌ Bekor qilish", callback_data=f"trade_cancel:{escrow_id}"),
        ]])
    else:
        return InlineKeyboardMarkup(inline_keyboard=[[
            InlineKeyboardButton(text="✅ Tasdiqlash", callback_data=f"trade_buyer_ok:{escrow_id}"),
            InlineKeyboardButton(text="❌ Bekor qilish", callback_data=f"trade_cancel:{escrow_id}"),
        ]])


def buyer_check_keyboard(escrow_id: str) -> InlineKeyboardMarkup:
    """Haridor akkauntni tekshirish tugmalari."""
    return InlineKeyboardMarkup(inline_keyboard=[[
        InlineKeyboardButton(text="✅ Akkauntni to'liq oldim", callback_data=f"escrow_buyer_ok:{escrow_id}"),
        InlineKeyboardButton(text="❌ Muammo bor", callback_data=f"escrow_buyer_no:{escrow_id}"),
    ]])


def start_verification_keyboard(verification_id: str) -> InlineKeyboardMarkup:
    """Hujjat taqdim etishni boshlash tugmasi."""
    return InlineKeyboardMarkup(inline_keyboard=[[
        InlineKeyboardButton(
            text="▶️ Hujjat taqdim etishni boshlash",
            callback_data=f"start_verification:{verification_id}",
        ),
    ]])


def admin_verify_keyboard(verification_id: str) -> InlineKeyboardMarkup:
    """Admin tasdiqlash/rad etish tugmalari."""
    return InlineKeyboardMarkup(inline_keyboard=[[
        InlineKeyboardButton(text="✅ Tasdiqlash", callback_data=f"verify_approve:{verification_id}"),
        InlineKeyboardButton(text="❌ Rad etish", callback_data=f"verify_reject:{verification_id}"),
    ]])


def admin_withdrawal_keyboard(withdrawal_id: str) -> InlineKeyboardMarkup:
    """Admin pul yechish so'rovini tasdiqlash/rad etish tugmalari."""
    return InlineKeyboardMarkup(inline_keyboard=[[
        InlineKeyboardButton(text="✅ Tasdiqlash", callback_data=f"withdraw_approve:{withdrawal_id}"),
        InlineKeyboardButton(text="❌ Rad etish", callback_data=f"withdraw_reject:{withdrawal_id}"),
    ]])


def admin_deposit_keyboard(deposit_id: str) -> InlineKeyboardMarkup:
    """Admin depozit tasdiqlash/rad etish tugmalari."""
    return InlineKeyboardMarkup(inline_keyboard=[[
        InlineKeyboardButton(text="✅ Tasdiqlash", callback_data=f"deposit_approve:{deposit_id}"),
        InlineKeyboardButton(text="❌ Rad etish", callback_data=f"deposit_reject:{deposit_id}"),
    ]])


def view_seller_docs_keyboard(verification_id: str) -> InlineKeyboardMarkup:
    """Sotuvchi hujjatlarini ko'rish tugmalari."""
    return InlineKeyboardMarkup(inline_keyboard=[
        [InlineKeyboardButton(text="🪪 Pasport (old)", callback_data=f"view_doc_front:{verification_id}")],
        [InlineKeyboardButton(text="🪪 Pasport (orqa)", callback_data=f"view_doc_back:{verification_id}")],
        [InlineKeyboardButton(text="🎥 Video", callback_data=f"view_doc_video:{verification_id}")],
        [
            InlineKeyboardButton(text="✅ Tasdiqlash", callback_data=f"verify_approve:{verification_id}"),
            InlineKeyboardButton(text="❌ Rad etish", callback_data=f"verify_reject:{verification_id}"),
        ],
    ])
