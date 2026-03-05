"""
User: /start, /balance, show payment panel button.
"""
import logging

from aiogram import Bot, Router
from aiogram.filters import CommandStart, Command
from aiogram.types import Message

from wallet_topup.bot.keyboards import get_main_keyboard

router = Router()
logger = logging.getLogger(__name__)


@router.message(CommandStart())
async def cmd_start(message: Message, bot: Bot) -> None:
    """Welcome message with Payment Panel button."""
    await message.answer(
        "👋 <b>Welcome to WibeStore Wallet</b>\n\n"
        "💰 Use the button below to top up your balance.\n"
        "Your payments are reviewed and confirmed by our admin team.\n\n"
        "📌 <b>How it works:</b>\n"
        "1️⃣ Open Payment Panel\n"
        "2️⃣ Select currency &amp; method\n"
        "3️⃣ Enter amount\n"
        "4️⃣ Upload payment receipt\n"
        "5️⃣ Wait for admin confirmation\n\n"
        "✅ Your balance updates instantly after approval!",
        reply_markup=get_main_keyboard(),
        parse_mode="HTML",
    )


@router.message(Command("balance"))
async def cmd_balance(message: Message) -> None:
    """Tell user to open the Payment Panel to see their balance."""
    await message.answer(
        "💼 <b>Your Wallet</b>\n\n"
        "Open the <b>Payment Panel</b> to view your current balance and make a top-up.\n\n"
        "👇 Tap the button below:",
        parse_mode="HTML",
        reply_markup=get_main_keyboard(),
    )
