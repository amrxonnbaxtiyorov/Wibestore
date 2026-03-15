"""
Main menu: Open Payment Panel (Web App).
"""
from aiogram.types import KeyboardButton, ReplyKeyboardMarkup, WebAppInfo

from wallet_topup.bot.config import config


def get_main_keyboard() -> ReplyKeyboardMarkup:
    return ReplyKeyboardMarkup(
        keyboard=[
            [
                KeyboardButton(
                    text="💰 Open Payment Panel",
                    web_app=WebAppInfo(url=config.web_app_url),
                )
            ],
            [
                KeyboardButton(text="📩 Adminga xabar"),
            ],
        ],
        resize_keyboard=True,
    )
