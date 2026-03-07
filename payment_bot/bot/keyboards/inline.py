"""
Inline klaviaturalar — to'lov turi tanlash va admin panel.
"""
from aiogram.types import InlineKeyboardButton, InlineKeyboardMarkup
from aiogram.utils.keyboard import InlineKeyboardBuilder


# ── To'lov turi tanlash ───────────────────────────────────────────────────────
PAYMENT_TYPE_KB = InlineKeyboardMarkup(
    inline_keyboard=[
        [
            InlineKeyboardButton(text="💳 HUMO", callback_data="pay_type:HUMO"),
            InlineKeyboardButton(text="💳 VISA / MasterCard", callback_data="pay_type:VISA_MC"),
        ],
        [InlineKeyboardButton(text="❌ Bekor qilish", callback_data="pay_cancel")],
    ]
)


def admin_review_kb(payment_id: int) -> InlineKeyboardMarkup:
    """Admin uchun tasdiqlash/rad etish tugmalari."""
    builder = InlineKeyboardBuilder()
    builder.button(
        text="✅ Tasdiqlash",
        callback_data=f"admin:approve:{payment_id}",
    )
    builder.button(
        text="❌ Rad etish",
        callback_data=f"admin:reject:{payment_id}",
    )
    builder.adjust(2)
    return builder.as_markup()


def retry_payment_kb() -> InlineKeyboardMarkup:
    """Rad etilgandan so'ng qayta urinish tugmasi."""
    return InlineKeyboardMarkup(
        inline_keyboard=[
            [InlineKeyboardButton(text="🔄 Qayta yuborish", callback_data="pay_retry")],
        ]
    )
