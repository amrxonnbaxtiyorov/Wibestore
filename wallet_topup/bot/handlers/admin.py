"""
Admin: Confirm / Reject transaction callbacks; call backend API.
"""
import logging

import aiohttp
from aiogram import Bot, F, Router
from aiogram.types import CallbackQuery

from wallet_topup.bot.config import config

router = Router()
logger = logging.getLogger(__name__)


def _is_admin(user_id: int) -> bool:
    return user_id in config.admin_ids


async def _call_backend(
    method: str, path: str, json: dict | None = None
) -> tuple[int, dict]:
    """Make authenticated request to backend admin API."""
    url = f"{config.backend_url}/api/v1/admin{path}"
    headers = {"X-Bot-Secret": config.token}
    try:
        async with aiohttp.ClientSession() as session:
            async with session.request(
                method, url, json=json, headers=headers, timeout=aiohttp.ClientTimeout(total=15)
            ) as resp:
                try:
                    data = await resp.json()
                except Exception:
                    data = {}
                return resp.status, data
    except aiohttp.ClientError as e:
        logger.error("Backend request failed: %s %s -> %s", method, path, e)
        return 503, {"error": {"message": "Backend unavailable"}}


@router.callback_query(F.data.startswith("approve:"))
async def cb_approve(callback: CallbackQuery, bot: Bot) -> None:
    """Handle admin approve callback."""
    if not _is_admin(callback.from_user.id):
        await callback.answer("⛔ Not authorized.", show_alert=True)
        return

    transaction_uid = callback.data.replace("approve:", "")
    status, data = await _call_backend(
        "POST",
        "/approve",
        {
            "transaction_uid": transaction_uid,
            "admin_telegram_id": callback.from_user.id,
        },
    )

    if status != 200:
        error_msg = "Failed"
        if isinstance(data, dict):
            detail = data.get("detail", {})
            if isinstance(detail, dict):
                error_msg = detail.get("message", error_msg)
            elif isinstance(detail, str):
                error_msg = detail
        await callback.answer(f"❌ {error_msg}", show_alert=True)
        return

    payload = data.get("data", {})
    await callback.answer("✅ Approved!")

    # Update the admin message to show result
    try:
        await callback.message.edit_text(
            f"{callback.message.text}\n\n"
            f"━━━━━━━━━━━━━━━━━━━━\n"
            f"✅ <b>APPROVED</b> by admin {callback.from_user.id}\n"
            f"New balance: {payload.get('new_balance', '?')} {payload.get('currency', '')}",
            parse_mode="HTML",
        )
    except Exception:
        await callback.message.edit_reply_markup(reply_markup=None)

    # Notify user
    user_telegram_id = payload.get("telegram_id")
    if user_telegram_id:
        try:
            await bot.send_message(
                user_telegram_id,
                f"✅ <b>Payment Approved!</b>\n\n"
                f"💰 Amount: <b>{payload.get('amount')} {payload.get('currency')}</b>\n"
                f"💼 New balance: <b>{payload.get('new_balance')} {payload.get('currency')}</b>\n\n"
                f"Thank you for your top-up! 🎉",
                parse_mode="HTML",
            )
        except Exception as e:
            logger.warning("Failed to notify user %s: %s", user_telegram_id, e)


@router.callback_query(F.data.startswith("reject:"))
async def cb_reject(callback: CallbackQuery, bot: Bot) -> None:
    """Handle admin reject callback."""
    if not _is_admin(callback.from_user.id):
        await callback.answer("⛔ Not authorized.", show_alert=True)
        return

    transaction_uid = callback.data.replace("reject:", "")
    status, data = await _call_backend(
        "POST",
        "/reject",
        {
            "transaction_uid": transaction_uid,
            "admin_telegram_id": callback.from_user.id,
        },
    )

    if status != 200:
        error_msg = "Failed"
        if isinstance(data, dict):
            detail = data.get("detail", {})
            if isinstance(detail, dict):
                error_msg = detail.get("message", error_msg)
            elif isinstance(detail, str):
                error_msg = detail
        await callback.answer(f"❌ {error_msg}", show_alert=True)
        return

    payload = data.get("data", {})
    await callback.answer("❌ Rejected.")

    # Update the admin message
    try:
        await callback.message.edit_text(
            f"{callback.message.text}\n\n"
            f"━━━━━━━━━━━━━━━━━━━━\n"
            f"❌ <b>REJECTED</b> by admin {callback.from_user.id}",
            parse_mode="HTML",
        )
    except Exception:
        await callback.message.edit_reply_markup(reply_markup=None)

    # Notify user
    user_telegram_id = payload.get("telegram_id")
    if user_telegram_id:
        try:
            await bot.send_message(
                user_telegram_id,
                f"❌ <b>Payment Rejected</b>\n\n"
                f"Your top-up request for <b>{payload.get('amount', '?')} {payload.get('currency', '')}</b> "
                f"has been rejected.\n\n"
                f"If you believe this is a mistake, please contact support.",
                parse_mode="HTML",
            )
        except Exception as e:
            logger.warning("Failed to notify user %s: %s", user_telegram_id, e)
