"""
Admin: Confirm / Reject transaction callbacks + admin panel commands.
"""
import logging
from datetime import datetime, timezone

import aiohttp
from aiogram import Bot, F, Router
from aiogram.filters import Command
from aiogram.types import CallbackQuery, Message

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


# ── Admin Panel Commands ─────────────────────────────────────────────────────

@router.message(Command("admin"))
async def cmd_admin(message: Message) -> None:
    """Show admin panel summary."""
    if not _is_admin(message.from_user.id):
        return

    status_200, data = await _call_backend("GET", "/transactions?status=PENDING&limit=100")
    pending_count = 0
    if status_200 == 200 and data.get("success"):
        pending_count = len(data.get("data", []))

    await message.answer(
        "🛠 <b>Admin Panel</b>\n"
        "━━━━━━━━━━━━━━━━━━━━\n\n"
        f"📋 Pending transactions: <b>{pending_count}</b>\n\n"
        "<b>Commands:</b>\n"
        "/pending — list pending transactions\n"
        "/stats — transaction statistics\n"
        "/balance &lt;telegram_id&gt; — check user balance\n"
        "/message_user &lt;telegram_id&gt; &lt;text&gt; — reply to user",
        parse_mode="HTML",
    )


@router.message(Command("pending"))
async def cmd_pending(message: Message) -> None:
    """List all pending transactions."""
    if not _is_admin(message.from_user.id):
        return

    status_code, data = await _call_backend("GET", "/transactions?status=PENDING&limit=20")
    if status_code != 200 or not data.get("success"):
        await message.answer("⚠️ Could not fetch pending transactions.")
        return

    transactions = data.get("data", [])
    if not transactions:
        await message.answer("✅ No pending transactions.")
        return

    lines = [f"📋 <b>Pending Transactions ({len(transactions)})</b>\n"]
    for tx in transactions:
        uid = tx.get("transaction_uid", "?")
        amount = tx.get("amount", 0)
        currency = tx.get("currency", "")
        method = tx.get("payment_method", "")
        username = tx.get("username") or tx.get("telegram_id", "?")
        lines.append(
            f"• <code>{uid[:12]}…</code>\n"
            f"  👤 {username} | 💰 {float(amount or 0):,.2f} {currency} | 💳 {method}"
        )

    await message.answer("\n".join(lines), parse_mode="HTML")


@router.message(Command("stats"))
async def cmd_stats(message: Message) -> None:
    """Show transaction statistics."""
    if not _is_admin(message.from_user.id):
        return

    _, pending_data = await _call_backend("GET", "/transactions?status=PENDING&limit=1000")
    _, approved_data = await _call_backend("GET", "/transactions?status=APPROVED&limit=1000")
    _, rejected_data = await _call_backend("GET", "/transactions?status=REJECTED&limit=1000")

    pending_list = pending_data.get("data", []) if pending_data.get("success") else []
    approved_list = approved_data.get("data", []) if approved_data.get("success") else []
    rejected_list = rejected_data.get("data", []) if rejected_data.get("success") else []

    total_approved_uzs = sum(
        float(tx.get("amount", 0)) for tx in approved_list if tx.get("currency") == "UZS"
    )
    total_approved_usdt = sum(
        float(tx.get("amount", 0)) for tx in approved_list if tx.get("currency") == "USDT"
    )

    await message.answer(
        "📊 <b>Transaction Statistics</b>\n"
        "━━━━━━━━━━━━━━━━━━━━\n\n"
        f"⏳ Pending:  <b>{len(pending_list)}</b>\n"
        f"✅ Approved: <b>{len(approved_list)}</b>\n"
        f"❌ Rejected: <b>{len(rejected_list)}</b>\n\n"
        f"💰 Total approved:\n"
        f"  UZS:  <b>{total_approved_uzs:,.0f}</b>\n"
        f"  USDT: <b>{total_approved_usdt:,.2f}</b>",
        parse_mode="HTML",
    )


@router.message(Command("balance"))
async def cmd_balance_admin(message: Message) -> None:
    """Check a user's wallet balance: /balance <telegram_id>"""
    if not _is_admin(message.from_user.id):
        return

    parts = message.text.strip().split(maxsplit=1)
    if len(parts) < 2 or not parts[1].strip().isdigit():
        await message.answer(
            "Usage: /balance &lt;telegram_id&gt;\n"
            "Example: /balance 123456789",
            parse_mode="HTML",
        )
        return

    telegram_id = int(parts[1].strip())
    status_code, data = await _call_backend("GET", f"/user-balance/{telegram_id}")
    if status_code != 200 or not data.get("success"):
        detail = data.get("detail", {})
        msg = detail.get("message", "User not found.") if isinstance(detail, dict) else str(detail)
        await message.answer(f"⚠️ {msg}")
        return

    user = data.get("data", {})
    username = user.get("username")
    first_name = user.get("first_name")
    balance = user.get("wallet_balance", "0.00")
    display = f"@{username}" if username else (first_name or str(telegram_id))

    await message.answer(
        f"👤 <b>{display}</b> (<code>{telegram_id}</code>)\n"
        f"💰 Wallet balance: <b>{balance}</b>",
        parse_mode="HTML",
    )


# ── Approve / Reject Callbacks ───────────────────────────────────────────────

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

    admin_username = callback.from_user.username or str(callback.from_user.id)
    new_caption = (
        f"{callback.message.caption or callback.message.text or ''}\n\n"
        f"━━━━━━━━━━━━━━━━━━━━\n"
        f"✅ <b>APPROVED</b> by @{admin_username}\n"
        f"New balance: {payload.get('new_balance', '?')} {payload.get('currency', '')}"
    )
    try:
        if callback.message.caption is not None:
            await callback.message.edit_caption(caption=new_caption, parse_mode="HTML")
        else:
            await callback.message.edit_text(text=new_caption, parse_mode="HTML")
    except Exception:
        try:
            await callback.message.edit_reply_markup(reply_markup=None)
        except Exception:
            pass

    user_telegram_id = payload.get("telegram_id")
    if user_telegram_id:
        try:
            amount = payload.get("amount", "?")
            currency = payload.get("currency", "")
            new_balance = payload.get("new_balance", "?")
            await bot.send_message(
                user_telegram_id,
                f"✅ <b>Payment Approved!</b>\n\n"
                f"Your wallet has been topped up:\n"
                f"💰 +<b>{amount} {currency}</b>\n\n"
                f"Transaction ID: <code>{transaction_uid}</code>\n"
                f"New Balance: <b>{new_balance} {currency}</b>\n\n"
                f"Thank you! 🎉",
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

    admin_username = callback.from_user.username or str(callback.from_user.id)
    new_caption = (
        f"{callback.message.caption or callback.message.text or ''}\n\n"
        f"━━━━━━━━━━━━━━━━━━━━\n"
        f"❌ <b>REJECTED</b> by @{admin_username}"
    )
    try:
        if callback.message.caption is not None:
            await callback.message.edit_caption(caption=new_caption, parse_mode="HTML")
        else:
            await callback.message.edit_text(text=new_caption, parse_mode="HTML")
    except Exception:
        try:
            await callback.message.edit_reply_markup(reply_markup=None)
        except Exception:
            pass

    user_telegram_id = payload.get("telegram_id")
    if user_telegram_id:
        try:
            amount = payload.get("amount", "?")
            currency = payload.get("currency", "")
            await bot.send_message(
                user_telegram_id,
                f"❌ <b>Payment Rejected</b>\n\n"
                f"Transaction ID: <code>{transaction_uid}</code>\n"
                f"Amount: <b>{amount} {currency}</b>\n\n"
                f"If you believe this is an error, please contact support.",
                parse_mode="HTML",
            )
        except Exception as e:
            logger.warning("Failed to notify user %s: %s", user_telegram_id, e)
