"""Payment Bot — Trade callback handlers.

Forwards trade-related inline button callbacks to the backend API
which handles the actual business logic (confirm, cancel, dispute, etc.).
"""

import logging

from aiogram import Router, F, Bot
from aiogram.types import CallbackQuery

import api_client

router = Router()
logger = logging.getLogger("bot.trade")

# All trade-related callback prefixes that the backend handles
TRADE_PREFIXES = (
    "trade_seller_ok:",
    "trade_buyer_ok:",
    "trade_cancel:",
    "escrow_seller_ok:",
    "escrow_buyer_ok:",
    "escrow_buyer_no:",
    "verify_approve:",
    "verify_reject:",
)


@router.callback_query(lambda c: any(c.data.startswith(p) for p in TRADE_PREFIXES))
async def handle_trade_callback(callback: CallbackQuery):
    """Forward trade callbacks to backend TelegramCallbackView."""
    # Build the update structure that backend expects
    update_data = {
        "callback_query": {
            "id": callback.id,
            "data": callback.data,
            "from": {
                "id": callback.from_user.id,
                "first_name": callback.from_user.first_name or "",
                "username": callback.from_user.username or "",
            },
        }
    }

    result = await api_client.forward_callback(update_data)
    logger.info("Trade callback %s forwarded, result: %s", callback.data, result.get("ok"))

    # The backend's _answer_callback_query will handle answering,
    # but we answer here too as a fallback
    try:
        await callback.answer()
    except Exception:
        pass


# ── View seller documents (admin) ─────────────────────────────────────

@router.callback_query(F.data.startswith("view_doc_front:"))
async def view_doc_front(callback: CallbackQuery, bot: Bot):
    """Admin views seller's passport front."""
    verification_id = callback.data.split(":", 1)[1]
    await _send_doc(callback, bot, verification_id, "passport_front_file_id", "Pasport oldi")


@router.callback_query(F.data.startswith("view_doc_back:"))
async def view_doc_back(callback: CallbackQuery, bot: Bot):
    """Admin views seller's passport back."""
    verification_id = callback.data.split(":", 1)[1]
    await _send_doc(callback, bot, verification_id, "passport_back_file_id", "Pasport orqasi")


@router.callback_query(F.data.startswith("view_doc_video:"))
async def view_doc_video(callback: CallbackQuery, bot: Bot):
    """Admin views seller's circle video."""
    verification_id = callback.data.split(":", 1)[1]
    # For video, we need to send it as video_note
    await callback.answer("Video yuklanmoqda...")
    # We'll fetch the file_id from backend via a simple API call
    # For now, answer with info
    await callback.answer("Video — backenddan ko'ring.", show_alert=True)


async def _send_doc(callback: CallbackQuery, bot: Bot, verification_id: str, field: str, label: str):
    """Helper to send a document photo to the admin."""
    await callback.answer(f"{label} yuklanmoqda...")
    # Note: The file_ids are stored in backend DB. The bot can't directly access them
    # without an API call. The backend's admin panel or the notification messages
    # already contain these as forwarded files.
    await callback.answer(f"{label} — admin paneldan ko'ring.", show_alert=True)
