"""
Botning asosiy kirish nuqtasi.

Ishga tushirish:
    cd payment_bot
    python -m bot.main
    yoki:
    python bot/main.py
"""
import asyncio
import logging
import logging.handlers
import sys

from aiogram import Bot, Dispatcher
from aiogram.client.default import DefaultBotProperties
from aiogram.enums import ParseMode
from aiogram.fsm.storage.memory import MemoryStorage

from bot.config import BOT_TOKEN, LOG_LEVEL, LOG_FILE
from bot.handlers import start_router, payment_router, admin_router
from bot.middlewares import ThrottlingMiddleware
from database.connection import init_db, close_db


def setup_logging() -> None:
    """Logging sozlash: console + fayl."""
    log_level = getattr(logging, LOG_LEVEL, logging.INFO)
    formatter = logging.Formatter(
        fmt="%(asctime)s | %(levelname)-8s | %(name)s | %(message)s",
        datefmt="%Y-%m-%d %H:%M:%S",
    )

    # Console handler
    console_handler = logging.StreamHandler(sys.stdout)
    console_handler.setFormatter(formatter)
    console_handler.setLevel(log_level)

    # Fayl handler (rotatsiya: 10MB × 5 ta fayl)
    file_handler = logging.handlers.RotatingFileHandler(
        LOG_FILE, maxBytes=10 * 1024 * 1024, backupCount=5, encoding="utf-8"
    )
    file_handler.setFormatter(formatter)
    file_handler.setLevel(log_level)

    root_logger = logging.getLogger()
    root_logger.setLevel(log_level)
    root_logger.addHandler(console_handler)
    root_logger.addHandler(file_handler)

    # Aiogram va aiohttp loglari faqat WARNING
    logging.getLogger("aiogram").setLevel(logging.WARNING)
    logging.getLogger("aiohttp").setLevel(logging.WARNING)
    logging.getLogger("asyncio").setLevel(logging.WARNING)


async def on_startup(bot: Bot) -> None:
    """Bot ishga tushganda: DB init."""
    logger = logging.getLogger(__name__)
    await init_db()

    # Bot ma'lumotlarini chiqarish
    bot_info = await bot.get_me()
    logger.info(
        "Bot ishga tushdi: @%s (ID: %s)",
        bot_info.username,
        bot_info.id,
    )

    from bot.config import ADMIN_IDS
    logger.info("Adminlar: %s", ADMIN_IDS)


async def on_shutdown(bot: Bot) -> None:
    """Bot to'xtaganda: DB yopish."""
    logger = logging.getLogger(__name__)
    await close_db()
    logger.info("Bot to'xtatildi.")


async def main() -> None:
    setup_logging()
    logger = logging.getLogger(__name__)

    # Bot va Dispatcher
    bot = Bot(
        token=BOT_TOKEN,
        default=DefaultBotProperties(parse_mode=ParseMode.HTML),
    )
    storage = MemoryStorage()  # Production uchun: RedisStorage yoki MongoStorage
    dp = Dispatcher(storage=storage)

    # Lifecycle hooks
    dp.startup.register(on_startup)
    dp.shutdown.register(on_shutdown)

    # Middlewares
    dp.message.middleware(ThrottlingMiddleware())

    # Routerlar (tartib muhim: admin → payment → start)
    dp.include_router(admin_router)
    dp.include_router(payment_router)
    dp.include_router(start_router)

    logger.info("Polling boshlanmoqda...")
    try:
        await dp.start_polling(
            bot,
            allowed_updates=["message", "callback_query"],
            drop_pending_updates=True,
        )
    finally:
        await bot.session.close()


if __name__ == "__main__":
    asyncio.run(main())
