"""
Redis rate limiting for top-up submissions.
"""
import asyncio
from typing import Any

import redis.asyncio as redis

from wallet_topup.backend.config import settings


async def _get_redis() -> redis.Redis[Any]:
    return redis.from_url(settings.REDIS_URL, decode_responses=True)


async def rate_limit_submission(telegram_id: int) -> tuple[bool, str]:
    """
    Allow max RATE_LIMIT_SUBMISSIONS per RATE_LIMIT_WINDOW_SECONDS per user.
    Returns (allowed, message).
    """
    key = f"wallet_topup:rate:{telegram_id}"
    try:
        r = await _get_redis()
        try:
            count = await r.incr(key)
            if count == 1:
                await r.expire(key, settings.RATE_LIMIT_WINDOW_SECONDS)
            if count > settings.RATE_LIMIT_SUBMISSIONS:
                return False, "Too many requests. Please try again later."
            return True, ""
        finally:
            await r.aclose()
    except Exception:
        return False, "Service temporarily unavailable."
