"""Payment Bot — Backend API Client.

Calls WibeStore backend REST endpoints for trade actions,
seller verification steps, deposit requests, and withdrawal management.
"""

import logging
from typing import Any

import aiohttp

from config import SITE_API_URL, BOT_SECRET_KEY

logger = logging.getLogger("bot.api")

_session: aiohttp.ClientSession | None = None


async def _get_session() -> aiohttp.ClientSession:
    global _session
    if _session is None or _session.closed:
        _session = aiohttp.ClientSession(
            timeout=aiohttp.ClientTimeout(total=15),
        )
    return _session


async def close_session() -> None:
    global _session
    if _session and not _session.closed:
        await _session.close()
        _session = None


async def _post(path: str, data: dict | None = None, **kwargs) -> dict[str, Any]:
    """POST to backend API with bot secret key."""
    session = await _get_session()
    url = f"{SITE_API_URL}{path}"
    payload = {**(data or {}), "secret_key": BOT_SECRET_KEY}
    try:
        async with session.post(url, json=payload, **kwargs) as resp:
            result = await resp.json()
            if resp.status >= 400:
                logger.warning("API %s returned %s: %s", path, resp.status, result)
            return result
    except Exception as e:
        logger.error("API call failed %s: %s", path, e)
        return {"success": False, "error": str(e)}


async def _post_form(path: str, data: aiohttp.FormData) -> dict[str, Any]:
    """POST multipart form to backend API."""
    session = await _get_session()
    url = f"{SITE_API_URL}{path}"
    try:
        async with session.post(url, data=data) as resp:
            result = await resp.json()
            return result
    except Exception as e:
        logger.error("API form call failed %s: %s", path, e)
        return {"success": False, "error": str(e)}


# ── Trade actions ──────────────────────────────────────────────────────

async def forward_callback(update_data: dict) -> dict:
    """Forward a Telegram callback_query update to the backend handler."""
    return await _post("/api/v1/payments/telegram/callback/", data=update_data)


# ── Seller verification steps ─────────────────────────────────────────

async def submit_verification_step(
    verification_id: str,
    step: str,
    file_id: str = "",
    full_name: str = "",
    latitude: float | None = None,
    longitude: float | None = None,
) -> dict:
    """Submit a seller verification step to the backend."""
    payload: dict = {
        "verification_id": verification_id,
        "step": step,
        "secret_key": BOT_SECRET_KEY,
    }
    if file_id:
        payload["file_id"] = file_id
    if full_name:
        payload["full_name"] = full_name
    if latitude is not None:
        payload["latitude"] = latitude
    if longitude is not None:
        payload["longitude"] = longitude
    return await _post("/api/v1/payments/telegram/seller-verification/submit/", data=payload)


# ── Deposit request ───────────────────────────────────────────────────

async def create_deposit_request(
    telegram_id: int,
    telegram_username: str = "",
    phone_number: str = "",
    amount: float | None = None,
    screenshot_bytes: bytes | None = None,
    screenshot_filename: str = "screenshot.jpg",
) -> dict:
    """Create a deposit request via backend API (multipart form)."""
    form = aiohttp.FormData()
    form.add_field("secret_key", BOT_SECRET_KEY)
    form.add_field("telegram_id", str(telegram_id))
    if telegram_username:
        form.add_field("telegram_username", telegram_username)
    if phone_number:
        form.add_field("phone_number", phone_number)
    if amount is not None:
        form.add_field("amount", str(amount))
    if screenshot_bytes:
        form.add_field(
            "screenshot", screenshot_bytes,
            filename=screenshot_filename,
            content_type="image/jpeg",
        )
    return await _post_form("/api/v1/payments/telegram/deposit-request/", data=form)


# ── Withdrawal management ────────────────────────────────────────────

async def create_withdrawal_request(
    telegram_id: int,
    amount: float,
    card_number: str,
    card_holder_name: str,
    card_type: str = "humo",
) -> dict:
    """Create a withdrawal request via backend API."""
    return await _post("/api/v1/payments/withdrawal/create/", data={
        "telegram_id": telegram_id,
        "amount": amount,
        "card_number": card_number,
        "card_holder_name": card_holder_name,
        "card_type": card_type,
    })


async def approve_withdrawal(withdrawal_id: str, admin_telegram_id: int) -> dict:
    """Admin approves a withdrawal request."""
    return await _post(f"/api/v1/payments/withdrawal/{withdrawal_id}/approve/", data={
        "admin_telegram_id": admin_telegram_id,
    })


async def reject_withdrawal(withdrawal_id: str, admin_telegram_id: int, reason: str = "") -> dict:
    """Admin rejects a withdrawal request."""
    return await _post(f"/api/v1/payments/withdrawal/{withdrawal_id}/reject/", data={
        "admin_telegram_id": admin_telegram_id,
        "reason": reason,
    })
