"""
Throttling middleware — spamdan himoya.
Har bir foydalanuvchi uchun so'rovlar orasida minimal interval (THROTTLE_RATE).
"""
import logging
import time
from collections import defaultdict
from typing import Any, Awaitable, Callable, Dict

from aiogram import BaseMiddleware
from aiogram.types import Message, TelegramObject

from bot.config import THROTTLE_RATE

logger = logging.getLogger(__name__)

# user_id → oxirgi so'rov vaqti
_last_request: dict[int, float] = defaultdict(float)


class ThrottlingMiddleware(BaseMiddleware):
    """
    Foydalanuvchi so'rovlari orasida THROTTLE_RATE soniya bo'lishini ta'minlaydi.
    Tez-tez so'rov yuborayotgan foydalanuvchi bitta ogohlantirish xabari oladi.
    """

    async def __call__(
        self,
        handler: Callable[[TelegramObject, Dict[str, Any]], Awaitable[Any]],
        event: TelegramObject,
        data: Dict[str, Any],
    ) -> Any:
        # Faqat Message eventlari uchun
        if not isinstance(event, Message):
            return await handler(event, data)

        user = event.from_user
        if not user:
            return await handler(event, data)

        user_id = user.id
        now = time.monotonic()
        last = _last_request[user_id]

        if now - last < THROTTLE_RATE:
            logger.debug("Throttle: user %s tez yubormoqda", user_id)
            try:
                await event.answer(
                    "Iltimos, biroz kutib turing...",
                    show_alert=False,
                )
            except Exception:
                pass
            return  # Handler ishlamasin

        _last_request[user_id] = now
        return await handler(event, data)
