"""
Reply klaviaturalar — asosiy menyu va navigatsiya.
"""
from aiogram.types import KeyboardButton, ReplyKeyboardMarkup, ReplyKeyboardRemove

# ── Asosiy menyu ──────────────────────────────────────────────────────────────
MAIN_MENU = ReplyKeyboardMarkup(
    keyboard=[
        [KeyboardButton(text="💳 To'lov qilish")],
        [KeyboardButton(text="ℹ️ Yordam")],
    ],
    resize_keyboard=True,
    input_field_placeholder="Menyudan tanlang...",
)

# ── Bekor qilish tugmasi ──────────────────────────────────────────────────────
CANCEL_KB = ReplyKeyboardMarkup(
    keyboard=[[KeyboardButton(text="❌ Bekor qilish")]],
    resize_keyboard=True,
)

# ── Klaviaturani o'chirish ────────────────────────────────────────────────────
REMOVE_KB = ReplyKeyboardRemove()
