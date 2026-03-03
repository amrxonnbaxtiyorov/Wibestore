"""
Admin inline: Confirm / Reject transaction.
"""
from aiogram.types import InlineKeyboardButton, InlineKeyboardMarkup


def get_confirm_reject_keyboard(transaction_uid: str) -> InlineKeyboardMarkup:
    return InlineKeyboardMarkup(inline_keyboard=[
        [
            InlineKeyboardButton(text="✅ Confirm", callback_data=f"approve:{transaction_uid}"),
            InlineKeyboardButton(text="❌ Reject", callback_data=f"reject:{transaction_uid}"),
        ]
    ])
