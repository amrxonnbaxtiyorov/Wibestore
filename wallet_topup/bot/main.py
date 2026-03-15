"""
Wallet Top-Up Bot - aiogram 3, Web App button, admin Confirm/Reject.
"""
import asyncio
import logging
import sys

from aiogram import Bot, Dispatcher
from aiogram.enums import ParseMode
from aiogram.fsm.storage.memory import MemoryStorage

from wallet_topup.bot.config import config
from wallet_topup.bot.handlers import setup_routers
from wallet_topup.bot.services import run_pending_listener

logging.basicConfig(
    level=logging.INFO,
    format="%(asctime)s [%(levelname)s] %(name)s: %(message)s",
    stream=sys.stdout,
)
logger = logging.getLogger(__name__)


async def main() -> None:
    if not config.token:
        logger.error("TELEGRAM_BOT_TOKEN is not set!")
        sys.exit(1)

    if not config.admin_ids:
        logger.warning("No ADMIN_TELEGRAM_IDS configured — admin features disabled")

    if not config.web_app_url or "your-domain" in config.web_app_url:
        logger.warning("WEB_APP_URL not properly configured: %s", config.web_app_url)

    bot = Bot(token=config.token, parse_mode=ParseMode.HTML)
    dp = Dispatcher(storage=MemoryStorage())
    setup_routers(dp.router)

    # Start Redis listener for pending transaction notifications
    listener_task = run_pending_listener(bot)

    logger.info(
        "Bot starting — admins: %s, web_app: %s",
        config.admin_ids or "none",
        config.web_app_url,
    )

    try:
        await dp.start_polling(bot, allowed_updates=["message", "callback_query"])
    finally:
        logger.info("Bot shutting down...")
        listener_task.cancel()
        try:
            await listener_task
        except asyncio.CancelledError:
            pass
        await bot.session.close()
        logger.info("Bot shutdown complete.")


if __name__ == "__main__":
    asyncio.run(main())
