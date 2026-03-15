"""
Subscribe to Redis channel for new pending transactions; notify admins with receipt + Confirm/Reject.
"""
import asyncio
import json
import logging

import aiohttp
import redis.asyncio as redis
from aiogram.types import BufferedInputFile

from wallet_topup.bot.config import config
from wallet_topup.bot.keyboards.admin import get_confirm_reject_keyboard

logger = logging.getLogger(__name__)
CHANNEL = "wallet_topup:new_pending"


async def _fetch_transaction(transaction_uid: str) -> dict | None:
    """Fetch full transaction details from backend."""
    url = f"{config.backend_url}/api/v1/admin/transactions/{transaction_uid}"
    headers = {"X-Bot-Secret": config.token}
    try:
        async with aiohttp.ClientSession() as session:
            async with session.get(
                url, headers=headers, timeout=aiohttp.ClientTimeout(total=10)
            ) as resp:
                if resp.status != 200:
                    logger.warning(
                        "Fetch transaction %s returned %s", transaction_uid, resp.status
                    )
                    return None
                return await resp.json()
    except Exception as e:
        logger.warning("Fetch transaction %s failed: %s", transaction_uid, e)
        return None


async def _fetch_receipt(transaction_uid: str) -> tuple[bytes | None, str]:
    """
    Download receipt file from backend.
    Returns (bytes, content_type). content_type is used to pick photo vs document.
    """
    url = f"{config.backend_url}/api/v1/admin/receipts/{transaction_uid}"
    headers = {"X-Bot-Secret": config.token}
    try:
        async with aiohttp.ClientSession() as session:
            async with session.get(
                url, headers=headers, timeout=aiohttp.ClientTimeout(total=15)
            ) as resp:
                if resp.status != 200:
                    return None, ""
                content_type = resp.headers.get("Content-Type", "")
                data = await resp.read()
                return data, content_type
    except Exception as e:
        logger.warning("Fetch receipt %s failed: %s", transaction_uid, e)
        return None, ""


async def _notify_admins(bot, transaction_uid: str, data: dict) -> None:
    """Send formatted notification with receipt to all admins."""
    result = data.get("data", {})
    telegram_id = result.get("telegram_id")
    username = result.get("username")
    first_name = result.get("first_name")
    amount = result.get("amount")
    currency = result.get("currency")
    payment_method = result.get("payment_method")

    user_display = f"{telegram_id}"
    if username:
        user_display = f"@{username} ({telegram_id})"
    elif first_name:
        user_display = f"{first_name} ({telegram_id})"

    text = (
        f"🆕 <b>New Top-Up Request</b>\n"
        f"━━━━━━━━━━━━━━━━━━━━\n\n"
        f"🆔 ID: <code>{transaction_uid}</code>\n"
        f"👤 User: {user_display}\n"
        f"💰 Amount: <b>{float(amount or 0):,.2f} {currency}</b>\n"
        f"💳 Method: {payment_method}\n"
        f"⏰ Status: <b>PENDING</b>\n"
    )

    keyboard = get_confirm_reject_keyboard(transaction_uid)

    receipt_bytes, content_type = await _fetch_receipt(transaction_uid)
    is_pdf = "pdf" in content_type.lower()

    for admin_id in config.get_notification_targets():
        try:
            if receipt_bytes:
                if is_pdf:
                    doc = BufferedInputFile(
                        receipt_bytes,
                        filename=f"receipt_{transaction_uid[:8]}.pdf",
                    )
                    await bot.send_document(
                        admin_id,
                        document=doc,
                        caption=text,
                        reply_markup=keyboard,
                        parse_mode="HTML",
                    )
                else:
                    photo = BufferedInputFile(
                        receipt_bytes,
                        filename=f"receipt_{transaction_uid[:8]}.jpg",
                    )
                    await bot.send_photo(
                        admin_id,
                        photo=photo,
                        caption=text,
                        reply_markup=keyboard,
                        parse_mode="HTML",
                    )
            else:
                await bot.send_message(
                    admin_id,
                    text + "\n📎 <i>Receipt not available</i>",
                    reply_markup=keyboard,
                    parse_mode="HTML",
                )
        except Exception as e:
            logger.warning("Failed to notify admin %s: %s", admin_id, e)


async def _listener_loop(bot) -> None:
    """Main Redis pub/sub loop for pending transaction notifications."""
    while True:
        r = None
        pubsub = None
        try:
            r = redis.from_url(config.redis_url, decode_responses=True)
            pubsub = r.pubsub()
            await pubsub.subscribe(CHANNEL)
            logger.info("Subscribed to Redis channel: %s", CHANNEL)

            while True:
                message = await pubsub.get_message(
                    ignore_subscribe_messages=True, timeout=30.0
                )
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
                        logger.warning("Invalid Redis message: %s", e)

        except asyncio.CancelledError:
            logger.info("Pending listener cancelled")
            break
        except Exception as e:
            logger.error("Redis listener error: %s — reconnecting in 5s", e)
            await asyncio.sleep(5)
        finally:
            try:
                if pubsub:
                    await pubsub.unsubscribe(CHANNEL)
                if r:
                    await r.aclose()
            except Exception:
                pass


def run_pending_listener(bot) -> asyncio.Task:
    """Start the Redis listener in the background. Returns the task."""
    return asyncio.create_task(_listener_loop(bot))
