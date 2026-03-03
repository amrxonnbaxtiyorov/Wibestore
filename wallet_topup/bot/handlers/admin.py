"""
Admin: Confirm / Reject transaction callbacks; call backend API.
"""
import logging

import aiohttp
from aiogram import Bot, F, Router
from aiogram.types import CallbackQuery

from wallet_topup.bot.config import config
from wallet_topup.bot.keyboards.admin import get_confirm_reject_keyboard

router = Router()
logger = logging.getLogger(__name__)


def _is_admin(user_id: int) -> bool:
    return user_id in config.admin_ids


async def _call_backend(method: str, path: str, json: dict | None = None) -> tuple[int, dict]:
    url = f"{config.backend_url}/api/v1/admin{path}"
    headers = {"X-Bot-Secret": config.token}
    async with aiohttp.ClientSession() as session:
        async with session.request(method, url, json=json, headers=headers) as resp:
            try:
                data = await resp.json()
            except Exception:
                data = {}
            return resp.status, data


@router.callback_query(F.data.startswith("approve:"))
async def cb_approve(callback: CallbackQuery, bot: Bot) -> None:
    if not _is_admin(callback.from_user.id):
        await callback.answer("Not allowed.", show_alert=True)
        return
    transaction_uid = callback.data.replace("approve:", "")
    status, data = await _call_backend("POST", "/approve", {"transaction_uid": transaction_uid, "admin_telegram_id": callback.from_user.id})
    if status != 200:
        await callback.answer(data.get("error", {}).get("message", "Failed"), show_alert=True)
        return
    payload = data.get("data", {})
    await callback.answer("Approved.")
    await callback.message.edit_reply_markup(reply_markup=None)
    await callback.message.answer(f"✅ Transaction {transaction_uid} approved. Balance updated.")
    # Notify user
    user_telegram_id = payload.get("telegram_id")
    if user_telegram_id:
        try:
            await bot.send_message(
                user_telegram_id,
                f"✅ Your top-up of {payload.get('amount')} {payload.get('currency')} has been approved.\n"
                f"New balance: {payload.get('new_balance')} {payload.get('currency')}.",
            )
        except Exception as e:
            logger.warning("Failed to notify user %s: %s", user_telegram_id, e)


@router.callback_query(F.data.startswith("reject:"))
async def cb_reject(callback: CallbackQuery, bot: Bot) -> None:
    if not _is_admin(callback.from_user.id):
        await callback.answer("Not allowed.", show_alert=True)
        return
    transaction_uid = callback.data.replace("reject:", "")
    status, data = await _call_backend("POST", "/reject", {"transaction_uid": transaction_uid, "admin_telegram_id": callback.from_user.id})
    if status != 200:
        await callback.answer(data.get("error", {}).get("message", "Failed"), show_alert=True)
        return
    payload = data.get("data", {})
    await callback.answer("Rejected.")
    await callback.message.edit_reply_markup(reply_markup=None)
    await callback.message.answer(f"❌ Transaction {transaction_uid} rejected.")
    user_telegram_id = payload.get("telegram_id")
    if user_telegram_id:
        try:
            await bot.send_message(
                user_telegram_id,
                f"❌ Your top-up request (ID: {transaction_uid[:8]}...) has been rejected. Please contact support if you have questions.",
            )
        except Exception as e:
            logger.warning("Failed to notify user %s: %s", user_telegram_id, e)
