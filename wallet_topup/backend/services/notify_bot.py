"""
Publish new pending transaction to Redis so the bot can notify admins.
"""
import json
import logging
from typing import Any

import redis.asyncio as redis

from wallet_topup.backend.config import settings

logger = logging.getLogger(__name__)
CHANNEL = "wallet_topup:new_pending"


async def publish_new_pending(transaction_uid: str, payload: dict[str, Any]) -> None:
    try:
        r = redis.from_url(settings.REDIS_URL, decode_responses=True)
        await r.publish(CHANNEL, json.dumps({"transaction_uid": transaction_uid, **payload}))
        await r.aclose()
    except Exception as e:
        logger.warning("Failed to publish new_pending: %s", e)
