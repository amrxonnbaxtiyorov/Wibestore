"""
Support: User sends message/media to admin. Admin replies via /message_user.
"""
import logging

import aiohttp
from aiogram import Bot, F, Router
from aiogram.filters import Command
from aiogram.fsm.context import FSMContext
from aiogram.fsm.state import State, StatesGroup
from aiogram.types import Message

from wallet_topup.bot.config import config
from wallet_topup.bot.keyboards.main import get_main_keyboard

router = Router()
logger = logging.getLogger(__name__)


class SupportState(StatesGroup):
    waiting_for_message = State()


def _is_admin(user_id: int) -> bool:
    return user_id in config.admin_ids


async def _get_user_site_info(telegram_id: int) -> str:
    """Try to fetch site account info from backend."""
    try:
        url = f"{config.backend_url}/api/v1/admin/user-balance/{telegram_id}"
        headers = {"X-Bot-Secret": config.token}
        async with aiohttp.ClientSession() as session:
            async with session.get(
                url, headers=headers, timeout=aiohttp.ClientTimeout(total=5)
            ) as resp:
                if resp.status == 200:
                    data = await resp.json()
                    if data.get("success"):
                        u = data.get("data", {})
                        site_username = u.get("username") or "—"
                        balance = u.get("wallet_balance", "0.00")
                        return f"🌐 Sayt akkaunti: <b>{site_username}</b> | 💰 Balans: <b>{balance}</b>"
    except Exception:
        pass
    return "🌐 Sayt akkaunti: <i>topilmadi</i>"


# ── User: start support flow ──────────────────────────────────────────────────

@router.message(F.text == "📩 Adminga xabar")
async def support_start(message: Message, state: FSMContext) -> None:
    """User pressed 'Message Admin' button."""
    await state.set_state(SupportState.waiting_for_message)
    await message.answer(
        "✍️ <b>Adminga xabar yuborish</b>\n\n"
        "Xabaringizni yuboring.\n"
        "📝 Matn, 🖼 rasm, 🎬 video yoki 🎤 ovozli xabar yuborishingiz mumkin.\n\n"
        "❌ Bekor qilish uchun /cancel ni bosing.",
        parse_mode="HTML",
    )


@router.message(Command("cancel"), SupportState.waiting_for_message)
async def support_cancel(message: Message, state: FSMContext) -> None:
    await state.clear()
    await message.answer(
        "❌ Bekor qilindi.",
        reply_markup=get_main_keyboard(),
    )


@router.message(SupportState.waiting_for_message)
async def support_receive(message: Message, bot: Bot, state: FSMContext) -> None:
    """Forward user's message to all admins with full user info."""
    await state.clear()

    user = message.from_user
    tg_id = user.id
    username = f"@{user.username}" if user.username else "—"
    full_name = f"{user.first_name or ''} {user.last_name or ''}".strip() or "—"

    site_info = await _get_user_site_info(tg_id)

    header = (
        f"📩 <b>Yangi foydalanuvchi xabari</b>\n"
        f"━━━━━━━━━━━━━━━━━━━━\n"
        f"👤 Ism: <b>{full_name}</b>\n"
        f"🔗 Username: <b>{username}</b>\n"
        f"🆔 Telegram ID: <code>{tg_id}</code>\n"
        f"{site_info}\n"
        f"━━━━━━━━━━━━━━━━━━━━\n"
        f"💬 <b>Xabar quyida:</b>\n\n"
        f"↩️ Javob berish: /message_user {tg_id} &lt;xabar matni&gt;"
    )

    targets = config.get_notification_targets()
    if not targets:
        targets = list(config.admin_ids)

    for admin_id in targets:
        try:
            await bot.send_message(admin_id, header, parse_mode="HTML")
            await message.forward(admin_id)
        except Exception as e:
            logger.warning("Failed to forward support message to admin %s: %s", admin_id, e)

    await message.answer(
        "✅ <b>Xabaringiz adminga yuborildi!</b>\n\nTez orada javob berishadi.",
        reply_markup=get_main_keyboard(),
        parse_mode="HTML",
    )


# ── Admin: reply to user ──────────────────────────────────────────────────────

@router.message(Command("message_user"))
async def cmd_message_user(message: Message, bot: Bot) -> None:
    """Admin replies to a specific user: /message_user <telegram_id> <text>"""
    if not _is_admin(message.from_user.id):
        return

    parts = message.text.strip().split(maxsplit=2)
    if len(parts) < 3 or not parts[1].strip().lstrip("-").isdigit():
        await message.answer(
            "📤 <b>Foydalanuvchiga xabar yuborish</b>\n\n"
            "Foydalanish:\n"
            "<code>/message_user &lt;telegram_id&gt; &lt;xabar&gt;</code>\n\n"
            "Misol:\n"
            "<code>/message_user 123456789 Kechirasiz, xatolikni bartaraf etdik!</code>",
            parse_mode="HTML",
        )
        return

    user_id = int(parts[1].strip())
    text = parts[2].strip()
    admin_name = f"@{message.from_user.username}" if message.from_user.username else "Admin"

    try:
        await bot.send_message(
            user_id,
            f"📬 <b>Admin javobi</b>\n"
            f"━━━━━━━━━━━━━━━━━━━━\n\n"
            f"{text}",
            parse_mode="HTML",
        )
        await message.answer(
            f"✅ Xabar <code>{user_id}</code> ga muvaffaqiyatli yuborildi.",
            parse_mode="HTML",
        )
    except Exception as e:
        await message.answer(
            f"❌ Xabar yuborib bo'lmadi: <code>{e}</code>",
            parse_mode="HTML",
        )
