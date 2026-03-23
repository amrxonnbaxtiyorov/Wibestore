"""
WibeStore Payment Bot — Main Entry Point

Telegram bot for:
- Trade notifications & confirmations (buyer/seller)
- Seller identity verification (passport + video)
- Balance deposits with admin approval
- Withdrawal requests with admin approval
- Subscription info

Usage:
    python main.py
"""

import asyncio
import logging
import sys

from aiogram import Bot, Dispatcher
from aiogram.client.default import DefaultBotProperties
from aiogram.enums import ParseMode
from aiogram.fsm.storage.memory import MemoryStorage

from config import BOT_TOKEN, LOG_LEVEL
import api_client

# Handlers
from handlers.start import router as start_router
from handlers.deposit import router as deposit_router
from handlers.withdrawal import router as withdrawal_router
from handlers.verification import router as verification_router
from handlers.trade_callbacks import router as trade_router
from handlers.admin import router as admin_router


def setup_logging():
    logging.basicConfig(
        level=getattr(logging, LOG_LEVEL.upper(), logging.INFO),
        format="%(asctime)s | %(name)-20s | %(levelname)-7s | %(message)s",
        datefmt="%Y-%m-%d %H:%M:%S",
        stream=sys.stdout,
    )


async def main():
    setup_logging()
    logger = logging.getLogger("bot")

    if not BOT_TOKEN:
        logger.error("BOT_TOKEN is not set! Check your .env file.")
        sys.exit(1)

    bot = Bot(
        token=BOT_TOKEN,
        default=DefaultBotProperties(parse_mode=ParseMode.HTML),
    )

    dp = Dispatcher(storage=MemoryStorage())

    # Register routers (order matters — more specific first)
    dp.include_router(verification_router)
    dp.include_router(trade_router)
    dp.include_router(admin_router)
    dp.include_router(deposit_router)
    dp.include_router(withdrawal_router)
    dp.include_router(start_router)

    # Startup / shutdown hooks
    async def on_startup():
        me = await bot.get_me()
        logger.info("Bot started: @%s (%s)", me.username, me.full_name)

    async def on_shutdown():
        await api_client.close_session()
        logger.info("Bot stopped.")

    dp.startup.register(on_startup)
    dp.shutdown.register(on_shutdown)

    # Start polling
    logger.info("Starting bot polling...")
    await dp.start_polling(bot, allowed_updates=["message", "callback_query"])


if __name__ == "__main__":
    try:
        asyncio.run(main())
    except KeyboardInterrupt:
        pass
