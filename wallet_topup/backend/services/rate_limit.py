"""
Redis rate limiting for top-up submissions.
Uses a sliding window counter approach.
"""
import logging
from typing import Any

import redis.asyncio as redis

from wallet_topup.backend.config import settings

logger = logging.getLogger(__name__)

# Connection pool (reused across requests)
_pool: redis.ConnectionPool | None = None


def _get_pool() -> redis.ConnectionPool:
    global _pool
    if _pool is None:
        _pool = redis.ConnectionPool.from_url(
            settings.REDIS_URL,
            decode_responses=True,
            max_connections=20,
        )
    return _pool


async def rate_limit_submission(telegram_id: int) -> tuple[bool, str]:
    """
    Allow max RATE_LIMIT_SUBMISSIONS per RATE_LIMIT_WINDOW_SECONDS per user.
    Returns (allowed, message).
    Uses a Redis connection pool for efficiency.
    """
    key = f"wallet_topup:rate:{telegram_id}"
    try:
        r = redis.Redis(connection_pool=_get_pool())
        try:
            count = await r.incr(key)
            if count == 1:
                await r.expire(key, settings.RATE_LIMIT_WINDOW_SECONDS)
            if count > settings.RATE_LIMIT_SUBMISSIONS:
                ttl = await r.ttl(key)
                minutes = max(1, (ttl + 59) // 60) if ttl > 0 else settings.RATE_LIMIT_WINDOW_SECONDS // 60
                return False, f"Too many requests. Try again in {minutes} minute(s)."
            return True, ""
        finally:
            await r.aclose()
    except redis.ConnectionError as e:
        logger.error("Redis connection failed for rate limiting: %s", e)
        # Fail open: allow request but log warning
        return True, ""
    except Exception as e:
        logger.error("Rate limit check failed: %s", e)
        return True, ""
