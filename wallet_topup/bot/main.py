"""
Wallet Top-Up Bot - aiogram 3, Web App button, admin Confirm/Reject.
"""
import asyncio
import logging
import sys

from aiogram import Bot, Dispatcher
from aiogram.enums import ParseMode

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
        logger.error("TELEGRAM_BOT_TOKEN is not set")
        sys.exit(1)

    bot = Bot(token=config.token, parse_mode=ParseMode.HTML)
    dp = Dispatcher()
    setup_routers(dp.router)

    # Notify admins on new pending (Redis subscriber)
    listener_task = run_pending_listener(bot)

    try:
        logger.info("Bot starting...")
        await dp.start_polling(bot)
    finally:
        listener_task.cancel()
        try:
            await listener_task
        except asyncio.CancelledError:
            pass
        await bot.session.close()


if __name__ == "__main__":
    asyncio.run(main())
