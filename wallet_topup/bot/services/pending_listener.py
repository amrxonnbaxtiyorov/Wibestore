"""
Subscribe to Redis channel for new pending transactions; notify admins with Confirm/Reject.
"""
import asyncio
import json
import logging

import aiohttp
import redis.asyncio as redis

from wallet_topup.bot.config import config
from wallet_topup.bot.keyboards.admin import get_confirm_reject_keyboard

logger = logging.getLogger(__name__)
CHANNEL = "wallet_topup:new_pending"


async def _fetch_transaction(transaction_uid: str) -> dict | None:
    url = f"{config.backend_url}/api/v1/admin/transactions/{transaction_uid}"
    headers = {"X-Bot-Secret": config.token}
    try:
        async with aiohttp.ClientSession() as session:
            async with session.get(url, headers=headers) as resp:
                if resp.status != 200:
                    return None
                return await resp.json()
    except Exception as e:
        logger.warning("Fetch transaction %s failed: %s", transaction_uid, e)
        return None


async def _notify_admins(bot, transaction_uid: str, data: dict) -> None:
    result = data.get("data", {})
    telegram_id = result.get("telegram_id")
    amount = result.get("amount")
    currency = result.get("currency")
    payment_method = result.get("payment_method")
    receipt_url = result.get("receipt_url")
    text = (
        f"🆕 New top-up request\n\n"
        f"ID: <code>{transaction_uid}</code>\n"
        f"User ID: {telegram_id}\n"
        f"Amount: {amount} {currency}\n"
        f"Method: {payment_method}\n"
    )
    if receipt_url:
        text += f"Receipt: {config.backend_url}{receipt_url}\n"
    keyboard = get_confirm_reject_keyboard(transaction_uid)
    for admin_id in config.admin_ids:
        try:
            await bot.send_message(
                admin_id,
                text,
                reply_markup=keyboard,
                parse_mode="HTML",
            )
        except Exception as e:
            logger.warning("Failed to notify admin %s: %s", admin_id, e)


async def _listener_loop(bot) -> None:
    r = redis.from_url(config.redis_url, decode_responses=True)
    pubsub = r.pubsub()
    await pubsub.subscribe(CHANNEL)
    logger.info("Subscribed to %s", CHANNEL)
    try:
        while True:
            message = await pubsub.get_message(ignore_subscribe_messages=True, timeout=30.0)
            if message and message.get("type") == "message":
                try:
                    payload = json.loads(message["data"])
                    transaction_uid = payload.get("transaction_uid")
                    if not transaction_uid:
                        continue
                    data = await _fetch_transaction(transaction_uid)
                    if data and data.get("success") and data.get("data"):
                        await _notify_admins(bot, transaction_uid, data)
                except (json.JSONDecodeError, KeyError) as e:
                    logger.warning("Invalid message: %s", e)
    except asyncio.CancelledError:
        pass
    finally:
        await pubsub.unsubscribe(CHANNEL)
        await r.aclose()


def run_pending_listener(bot) -> asyncio.Task:
    """Start the Redis listener in the background. Returns the task."""
    return asyncio.create_task(_listener_loop(bot))
