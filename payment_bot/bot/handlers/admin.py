"""
Admin handlerlari:
  - /admin — panel
  - /pending — kutilayotgan to'lovlar
  - /stats — statistika
  - /ban /unban — foydalanuvchi boshqaruvi
  - Inline: approve / reject tugmalari
"""
import logging

from aiogram import Router, F
from aiogram.exceptions import TelegramBadRequest
from aiogram.filters import Command
from aiogram.fsm.context import FSMContext
from aiogram.types import Message, CallbackQuery

from bot.config import ADMIN_IDS
from bot.keyboards.inline import retry_payment_kb
from bot.keyboards.reply import MAIN_MENU
from bot.services.payment_service import (
    approve_payment, reject_payment, get_stats, get_all_pending,
)
from bot.utils.helpers import format_datetime, notify_site_balance

logger = logging.getLogger(__name__)
router = Router(name="admin")


def _is_admin(user_id: int) -> bool:
    return user_id in ADMIN_IDS


# ── Admin filteri ─────────────────────────────────────────────────────────────

async def _check_admin(message: Message) -> bool:
    """Admin emasligini tekshirish va xabar."""
    if not _is_admin(message.from_user.id):
        await message.answer("⛔ Bu buyruq faqat adminlar uchun.")
        return False
    return True


# ── /admin — Asosiy panel ─────────────────────────────────────────────────────

@router.message(Command("admin"))
async def cmd_admin(message: Message) -> None:
    if not await _check_admin(message):
        return

    stats = await get_stats()
    pending = stats.get("PENDING", 0)
    approved = stats.get("APPROVED", 0)
    rejected = stats.get("REJECTED", 0)

    await message.answer(
        "🛠 <b>Admin Panel</b>\n"
        "━━━━━━━━━━━━━━━━━━━━\n\n"
        f"📊 <b>Statistika:</b>\n"
        f"  ⏳ Kutilmoqda:  <b>{pending}</b>\n"
        f"  ✅ Tasdiqlandi: <b>{approved}</b>\n"
        f"  ❌ Rad etildi:  <b>{rejected}</b>\n\n"
        f"<b>Buyruqlar:</b>\n"
        f"  /pending — Kutilayotgan to'lovlar\n"
        f"  /stats — Batafsil statistika\n"
        f"  /ban &lt;user_id&gt; — Foydalanuvchini bloklash\n"
        f"  /unban &lt;user_id&gt; — Blokdan chiqarish",
        parse_mode="HTML",
    )


# ── /pending — Kutilayotgan to'lovlar ─────────────────────────────────────────

@router.message(Command("pending"))
async def cmd_pending(message: Message) -> None:
    if not await _check_admin(message):
        return

    payments = await get_all_pending()
    if not payments:
        await message.answer("✅ Kutilayotgan to'lovlar yo'q.")
        return

    lines = [f"📋 <b>Kutilayotgan to'lovlar ({len(payments)}):</b>\n"]
    for p in payments:
        lines.append(
            f"• <b>#{p['id']}</b> | {p['user_display']} "
            f"(<code>{p['user_tg_id']}</code>)\n"
            f"  💳 {p['payment_type']} | "
            f"⏰ {format_datetime(p['created_at'])}"
        )

    await message.answer("\n".join(lines), parse_mode="HTML")


# ── /stats — Statistika ───────────────────────────────────────────────────────

@router.message(Command("stats"))
async def cmd_stats(message: Message) -> None:
    if not await _check_admin(message):
        return

    stats = await get_stats()
    total = sum(stats.values())
    await message.answer(
        "📊 <b>To'lovlar statistikasi</b>\n"
        "━━━━━━━━━━━━━━━━━━━━\n\n"
        f"⏳ Kutilmoqda:  <b>{stats.get('PENDING', 0)}</b>\n"
        f"✅ Tasdiqlandi: <b>{stats.get('APPROVED', 0)}</b>\n"
        f"❌ Rad etildi:  <b>{stats.get('REJECTED', 0)}</b>\n"
        f"━━━━━━━━━━━━━━━━━━━━\n"
        f"📦 Jami: <b>{total}</b>",
        parse_mode="HTML",
    )


# ── /ban /unban ───────────────────────────────────────────────────────────────

@router.message(Command("ban"))
async def cmd_ban(message: Message) -> None:
    if not await _check_admin(message):
        return
    parts = (message.text or "").split(maxsplit=1)
    if len(parts) < 2 or not parts[1].strip().lstrip("-").isdigit():
        await message.answer("Ishlatish: /ban &lt;telegram_id&gt;", parse_mode="HTML")
        return

    from database.connection import get_session
    from database.repositories.user_repo import UserRepository
    tid = int(parts[1].strip())
    async with get_session() as session:
        repo = UserRepository(session)
        ok = await repo.set_banned(tid, True)
    if ok:
        await message.answer(f"🚫 Foydalanuvchi <code>{tid}</code> bloklandi.", parse_mode="HTML")
    else:
        await message.answer(f"⚠️ Foydalanuvchi <code>{tid}</code> topilmadi.", parse_mode="HTML")


@router.message(Command("unban"))
async def cmd_unban(message: Message) -> None:
    if not await _check_admin(message):
        return
    parts = (message.text or "").split(maxsplit=1)
    if len(parts) < 2 or not parts[1].strip().lstrip("-").isdigit():
        await message.answer("Ishlatish: /unban &lt;telegram_id&gt;", parse_mode="HTML")
        return

    from database.connection import get_session
    from database.repositories.user_repo import UserRepository
    tid = int(parts[1].strip())
    async with get_session() as session:
        repo = UserRepository(session)
        ok = await repo.set_banned(tid, False)
    if ok:
        await message.answer(f"✅ Foydalanuvchi <code>{tid}</code> blokdan chiqarildi.", parse_mode="HTML")
    else:
        await message.answer(f"⚠️ Foydalanuvchi <code>{tid}</code> topilmadi.", parse_mode="HTML")


# ── Inline: ✅ Tasdiqlash ──────────────────────────────────────────────────────

@router.callback_query(F.data.startswith("admin:approve:"))
async def cb_approve(callback: CallbackQuery) -> None:
    """Admin to'lovni tasdiqladi."""
    if not _is_admin(callback.from_user.id):
        await callback.answer("⛔ Ruxsat yo'q.", show_alert=True)
        return

    payment_id = int(callback.data.split(":")[-1])
    result = await approve_payment(payment_id, callback.from_user.id)

    if not result:
        await callback.answer(
            "❌ To'lov topilmadi yoki allaqachon ko'rib chiqilgan.", show_alert=True
        )
        return

    admin_tag = f"@{callback.from_user.username}" if callback.from_user.username else "Admin"

    # Admin xabarini yangilash
    try:
        old_caption = callback.message.caption or ""
        new_caption = (
            old_caption
            + f"\n\n━━━━━━━━━━━━━━━━━━━━\n"
            f"✅ <b>TASDIQLANDI</b> ({admin_tag})"
        )
        await callback.message.edit_caption(
            caption=new_caption,
            parse_mode="HTML",
            reply_markup=None,
        )
    except TelegramBadRequest as e:
        logger.debug("Caption o'zgartirishda xato: %s", e)
        try:
            await callback.message.edit_reply_markup(reply_markup=None)
        except Exception:
            pass

    await callback.answer("✅ Tasdiqlandi!")

    # Foydalanuvchiga xabar
    user_tg_id = result["user_telegram_id"]
    try:
        await callback.bot.send_message(
            chat_id=user_tg_id,
            text=(
                f"✅ <b>To'lovingiz tasdiqlandi!</b>\n\n"
                f"💳 To'lov turi: {result['payment_type']}\n"
                f"🔢 To'lov ID: <code>#{payment_id}</code>\n\n"
                f"🎉 Rahmat! Hisobingiz to'ldirildi."
            ),
            parse_mode="HTML",
            reply_markup=MAIN_MENU,
        )
    except Exception as e:
        logger.warning("Foydalanuvchi %s ga xabar yuborib bo'lmadi: %s", user_tg_id, e)

    # Sayt balansini yangilash (ixtiyoriy)
    ok = await notify_site_balance(user_tg_id, payment_id)
    if not ok:
        logger.warning(
            "Sayt API: payment_id=%s uchun balans yangilanmadi (tekshiring)", payment_id
        )


# ── Inline: ❌ Rad etish ───────────────────────────────────────────────────────

@router.callback_query(F.data.startswith("admin:reject:"))
async def cb_reject(callback: CallbackQuery) -> None:
    """Admin to'lovni rad etdi."""
    if not _is_admin(callback.from_user.id):
        await callback.answer("⛔ Ruxsat yo'q.", show_alert=True)
        return

    payment_id = int(callback.data.split(":")[-1])
    result = await reject_payment(payment_id, callback.from_user.id)

    if not result:
        await callback.answer(
            "❌ To'lov topilmadi yoki allaqachon ko'rib chiqilgan.", show_alert=True
        )
        return

    admin_tag = f"@{callback.from_user.username}" if callback.from_user.username else "Admin"

    # Admin xabarini yangilash
    try:
        old_caption = callback.message.caption or ""
        new_caption = (
            old_caption
            + f"\n\n━━━━━━━━━━━━━━━━━━━━\n"
            f"❌ <b>RAD ETILDI</b> ({admin_tag})"
        )
        await callback.message.edit_caption(
            caption=new_caption,
            parse_mode="HTML",
            reply_markup=None,
        )
    except TelegramBadRequest as e:
        logger.debug("Caption o'zgartirishda xato: %s", e)
        try:
            await callback.message.edit_reply_markup(reply_markup=None)
        except Exception:
            pass

    await callback.answer("❌ Rad etildi.")

    # Foydalanuvchiga xabar (qayta urinish tugmasi bilan)
    user_tg_id = result["user_telegram_id"]
    try:
        await callback.bot.send_message(
            chat_id=user_tg_id,
            text=(
                f"❌ <b>To'lovingiz rad etildi.</b>\n\n"
                f"💳 To'lov turi: {result['payment_type']}\n"
                f"🔢 To'lov ID: <code>#{payment_id}</code>\n\n"
                f"Chek noto'g'ri yoki to'lov tasdiqlanmadi.\n\n"
                f"🔄 Qayta urinib ko'rmoqchisizmi?"
            ),
            parse_mode="HTML",
            reply_markup=retry_payment_kb(),
        )
    except Exception as e:
        logger.warning("Foydalanuvchi %s ga xabar yuborib bo'lmadi: %s", user_tg_id, e)
