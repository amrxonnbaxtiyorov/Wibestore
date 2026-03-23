"""Payment Bot — Admin handlers.

Handles admin-only commands, deposit approval/rejection,
withdrawal approval/rejection, and verification document viewing.
"""

import logging

from aiogram import Router, F, Bot
from aiogram.types import Message, CallbackQuery
from aiogram.filters import Filter

from config import ADMIN_IDS
from keyboards import admin_menu_keyboard, main_menu_keyboard

router = Router()
logger = logging.getLogger("bot.admin")


class IsAdmin(Filter):
    """Filter that only allows admin users."""
    async def __call__(self, message: Message) -> bool:
        return message.from_user.id in ADMIN_IDS


# ── Admin menu buttons ────────────────────────────────────────────────

@router.message(IsAdmin(), F.text == "📥 Kutilayotgan depozitlar")
async def pending_deposits(message: Message):
    await message.answer(
        "📥 <b>Kutilayotgan depozitlar</b>\n\n"
        "Depozit so'rovlari foydalanuvchi yuborilganda avtomatik shu yerga keladi.\n"
        "Tasdiqlash/rad etish tugmalarini ishlating.\n\n"
        "🌐 Batafsil: wibestore.net/admin/deposits",
        parse_mode="HTML",
    )


@router.message(IsAdmin(), F.text == "📤 Kutilayotgan yechimlar")
async def pending_withdrawals(message: Message):
    await message.answer(
        "📤 <b>Kutilayotgan pul yechish so'rovlari</b>\n\n"
        "Pul yechish so'rovlari foydalanuvchi yuborilganda avtomatik shu yerga keladi.\n"
        "Kartaga pul o'tkazib, tasdiqlash tugmasini bosing.\n\n"
        "🌐 Batafsil: wibestore.net/admin",
        parse_mode="HTML",
    )


@router.message(IsAdmin(), F.text == "📋 Tekshiruvlar")
async def pending_verifications(message: Message):
    await message.answer(
        "📋 <b>Sotuvchi tekshiruvlari</b>\n\n"
        "Sotuvchi hujjatlari yuborilganda avtomatik shu yerga keladi.\n"
        "Hujjatlarni ko'rib tasdiqlang yoki rad eting.\n\n"
        "🌐 Batafsil: wibestore.net/admin",
        parse_mode="HTML",
    )


@router.message(IsAdmin(), F.text == "📊 Statistika")
async def admin_stats(message: Message):
    await message.answer(
        "📊 <b>Statistika</b>\n\n"
        "Batafsil statistika uchun admin panelga kiring:\n"
        "🌐 wibestore.net/admin",
        parse_mode="HTML",
    )


# ── Deposit approval/rejection ────────────────────────────────────────

@router.callback_query(F.data.startswith("deposit_approve:"))
async def approve_deposit(callback: CallbackQuery, bot: Bot):
    if callback.from_user.id not in ADMIN_IDS:
        await callback.answer("Faqat admin tasdiqlashi mumkin!", show_alert=True)
        return

    deposit_id = callback.data.split(":", 1)[1]

    # Update the message to show it's approved
    try:
        old_text = callback.message.caption or callback.message.text or ""
        new_text = old_text + "\n\n✅ <b>TASDIQLANDI</b> ✅"
        if callback.message.photo:
            await callback.message.edit_caption(caption=new_text, parse_mode="HTML")
        else:
            await callback.message.edit_text(text=new_text, parse_mode="HTML")
    except Exception:
        pass

    await callback.answer("✅ Depozit tasdiqlandi!", show_alert=True)
    logger.info("Deposit %s approved by admin %s", deposit_id, callback.from_user.id)


@router.callback_query(F.data.startswith("deposit_reject:"))
async def reject_deposit(callback: CallbackQuery, bot: Bot):
    if callback.from_user.id not in ADMIN_IDS:
        await callback.answer("Faqat admin rad etishi mumkin!", show_alert=True)
        return

    deposit_id = callback.data.split(":", 1)[1]

    try:
        old_text = callback.message.caption or callback.message.text or ""
        new_text = old_text + "\n\n❌ <b>RAD ETILDI</b> ❌"
        if callback.message.photo:
            await callback.message.edit_caption(caption=new_text, parse_mode="HTML")
        else:
            await callback.message.edit_text(text=new_text, parse_mode="HTML")
    except Exception:
        pass

    await callback.answer("❌ Depozit rad etildi!", show_alert=True)
    logger.info("Deposit %s rejected by admin %s", deposit_id, callback.from_user.id)


# ── Withdrawal approval/rejection ─────────────────────────────────────

@router.callback_query(F.data.startswith("withdraw_approve:"))
async def approve_withdrawal(callback: CallbackQuery, bot: Bot):
    if callback.from_user.id not in ADMIN_IDS:
        await callback.answer("Faqat admin tasdiqlashi mumkin!", show_alert=True)
        return

    withdrawal_id = callback.data.split(":", 1)[1]

    try:
        old_text = callback.message.text or ""
        new_text = old_text + "\n\n✅ <b>TASDIQLANDI — pul o'tkazildi</b> ✅"
        await callback.message.edit_text(text=new_text, parse_mode="HTML")
    except Exception:
        pass

    # Extract telegram_id from withdrawal_id (format: w_{tg_id}_{timestamp})
    parts = withdrawal_id.split("_")
    if len(parts) >= 2:
        try:
            user_tg_id = int(parts[1])
            await bot.send_message(
                chat_id=user_tg_id,
                text=(
                    "✅ <b>Pul yechish so'rovi tasdiqlandi!</b>\n\n"
                    "💸 Pul kartangizga o'tkazildi.\n"
                    "Agar 24 soat ichida kelmasa — adminga murojaat qiling.\n\n"
                    "🌐 wibestore.net"
                ),
                parse_mode="HTML",
            )
        except Exception as e:
            logger.warning("Failed to notify user about withdrawal approval: %s", e)

    await callback.answer("✅ Tasdiqlandi! Foydalanuvchiga xabar yuborildi.", show_alert=True)
    logger.info("Withdrawal %s approved by admin %s", withdrawal_id, callback.from_user.id)


@router.callback_query(F.data.startswith("withdraw_reject:"))
async def reject_withdrawal(callback: CallbackQuery, bot: Bot):
    if callback.from_user.id not in ADMIN_IDS:
        await callback.answer("Faqat admin rad etishi mumkin!", show_alert=True)
        return

    withdrawal_id = callback.data.split(":", 1)[1]

    try:
        old_text = callback.message.text or ""
        new_text = old_text + "\n\n❌ <b>RAD ETILDI</b> ❌"
        await callback.message.edit_text(text=new_text, parse_mode="HTML")
    except Exception:
        pass

    parts = withdrawal_id.split("_")
    if len(parts) >= 2:
        try:
            user_tg_id = int(parts[1])
            await bot.send_message(
                chat_id=user_tg_id,
                text=(
                    "❌ <b>Pul yechish so'rovi rad etildi.</b>\n\n"
                    "Sabab: admin tomonidan rad etildi.\n"
                    "Agar savollaringiz bo'lsa — adminga murojaat qiling.\n\n"
                    "🌐 wibestore.net"
                ),
                parse_mode="HTML",
            )
        except Exception as e:
            logger.warning("Failed to notify user about withdrawal rejection: %s", e)

    await callback.answer("❌ Rad etildi! Foydalanuvchiga xabar yuborildi.", show_alert=True)
    logger.info("Withdrawal %s rejected by admin %s", withdrawal_id, callback.from_user.id)
