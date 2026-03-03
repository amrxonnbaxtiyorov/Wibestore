"""
User: /start, show payment panel button.
"""
import logging

from aiogram import Bot, Router
from aiogram.types import Message

from wallet_topup.bot.keyboards import get_main_keyboard

router = Router()
logger = logging.getLogger(__name__)


@router.message(lambda m: m.text and m.text.startswith("/start"))
async def cmd_start(message: Message, bot: Bot) -> None:
    await message.answer(
        "Welcome to WibeStore Wallet Top-Up.\n\n"
        "Use the button below to open the Payment Panel and top up your balance.",
        reply_markup=get_main_keyboard(),
    )
