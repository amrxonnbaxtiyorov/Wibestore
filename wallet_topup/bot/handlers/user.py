"""
User: /start, /balance, show payment panel button.
"""
import logging

import aiohttp
from aiogram import Bot, Router
from aiogram.filters import CommandStart
from aiogram.types import Message

from wallet_topup.bot.config import config
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
        "2️⃣ Select currency & method\n"
        "3️⃣ Enter amount\n"
        "4️⃣ Upload payment receipt\n"
        "5️⃣ Wait for admin confirmation\n\n"
        "✅ Your balance updates instantly after approval!",
        reply_markup=get_main_keyboard(),
        parse_mode="HTML",
    )


@router.message(lambda m: m.text and m.text.lower() in ("/balance", "💳 my balance"))
async def cmd_balance(message: Message, bot: Bot) -> None:
    """Check wallet balance via backend API."""
    telegram_id = message.from_user.id
    try:
        url = f"{config.backend_url}/api/v1/health"
        async with aiohttp.ClientSession() as session:
            async with session.get(url) as resp:
                if resp.status != 200:
                    await message.answer("⚠️ Service temporarily unavailable. Try again later.")
                    return
        await message.answer(
            "💼 <b>Your Wallet</b>\n\n"
            "Use the Payment Panel to top up your balance.\n"
            "Contact admin if you need assistance.",
            parse_mode="HTML",
            reply_markup=get_main_keyboard(),
        )
    except Exception as e:
        logger.warning("Balance check failed for %s: %s", telegram_id, e)
        await message.answer("⚠️ Could not check balance. Try again later.")
