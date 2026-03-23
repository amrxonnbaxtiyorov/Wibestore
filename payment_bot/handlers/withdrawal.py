"""Payment Bot — Withdrawal (pul yechish) handlers."""

import logging
import re

from aiogram import Router, F, Bot
from aiogram.types import Message
from aiogram.fsm.context import FSMContext

from config import ADMIN_IDS
from states import WithdrawalStates
from keyboards import (
    cancel_keyboard,
    confirm_withdrawal_keyboard,
    main_menu_keyboard,
    admin_withdrawal_keyboard,
)

router = Router()
logger = logging.getLogger("bot.withdrawal")


@router.message(F.text == "💸 Pul yechish")
async def start_withdrawal(message: Message, state: FSMContext):
    await state.clear()
    await state.set_state(WithdrawalStates.waiting_amount)
    await message.answer(
        "💸 <b>Pul yechish</b>\n\n"
        "Qancha summa yechmoqchisiz? (so'mda)\n\n"
        "Masalan: <code>100000</code>",
        parse_mode="HTML",
        reply_markup=cancel_keyboard(),
    )


@router.message(WithdrawalStates.waiting_amount, F.text == "❌ Bekor qilish")
@router.message(WithdrawalStates.waiting_card, F.text == "❌ Bekor qilish")
@router.message(WithdrawalStates.waiting_confirm, F.text == "❌ Bekor qilish")
async def cancel_withdrawal(message: Message, state: FSMContext):
    await state.clear()
    await message.answer("❌ Bekor qilindi.", reply_markup=main_menu_keyboard())


@router.message(WithdrawalStates.waiting_amount)
async def withdrawal_amount(message: Message, state: FSMContext):
    try:
        amount = int(message.text.replace(" ", "").replace(",", ""))
        if amount < 10000:
            await message.answer("❌ Minimal summa: 10 000 so'm")
            return
        if amount > 100_000_000:
            await message.answer("❌ Maksimal summa: 100 000 000 so'm")
            return
    except (ValueError, TypeError):
        await message.answer("❌ Noto'g'ri summa. Faqat raqam yozing.")
        return

    await state.update_data(amount=amount)
    await state.set_state(WithdrawalStates.waiting_card)
    await message.answer(
        "💳 <b>Karta raqamini kiriting</b>\n\n"
        "Masalan: <code>8600 1234 5678 9012</code>\n\n"
        "HUMO, UZCARD yoki Visa/Mastercard",
        parse_mode="HTML",
        reply_markup=cancel_keyboard(),
    )


@router.message(WithdrawalStates.waiting_card)
async def withdrawal_card(message: Message, state: FSMContext):
    card = message.text.replace(" ", "").replace("-", "")
    if not re.match(r"^\d{16}$", card):
        await message.answer("❌ Noto'g'ri karta raqami. 16 ta raqam bo'lishi kerak.")
        return

    # Format card nicely
    card_formatted = " ".join([card[i:i+4] for i in range(0, 16, 4)])
    await state.update_data(card=card_formatted)

    data = await state.get_data()
    amount = data["amount"]

    await state.set_state(WithdrawalStates.waiting_confirm)
    await message.answer(
        f"💸 <b>Pul yechish — tasdiqlang</b>\n\n"
        f"💰 Summa: <b>{amount:,} so'm</b>\n"
        f"💳 Karta: <b>{card_formatted}</b>\n\n"
        f"Tasdiqlaysizmi?",
        parse_mode="HTML",
        reply_markup=confirm_withdrawal_keyboard(),
    )


@router.message(WithdrawalStates.waiting_confirm, F.text == "✅ Tasdiqlash")
async def withdrawal_confirm(message: Message, state: FSMContext, bot: Bot):
    data = await state.get_data()
    amount = data["amount"]
    card = data["card"]
    await state.clear()

    tg_user = message.from_user
    tg_id = tg_user.id
    username = tg_user.username or ""
    full_name = tg_user.full_name or ""

    # Generate a withdrawal request ID (simple timestamp-based)
    import time
    withdrawal_id = f"w_{tg_id}_{int(time.time())}"

    await message.answer(
        "✅ <b>Pul yechish so'rovi qabul qilindi!</b>\n\n"
        f"💰 Summa: <b>{amount:,} so'm</b>\n"
        f"💳 Karta: <b>{card}</b>\n\n"
        "Admin tekshirgandan so'ng kartangizga o'tkaziladi.\n"
        "Kutib turing... ⏳",
        parse_mode="HTML",
        reply_markup=main_menu_keyboard(),
    )

    # Notify all admins
    for admin_id in ADMIN_IDS:
        try:
            admin_text = (
                f"📤 <b>YANGI PUL YECHISH SO'ROVI!</b>\n"
                f"━━━━━━━━━━━━━━━━━━━━\n\n"
                f"👤 <b>Foydalanuvchi:</b>\n"
                f"   📝 Ism: {full_name}\n"
                f"   🆔 Telegram ID: <code>{tg_id}</code>\n"
                f"   📱 Username: @{username}\n\n"
                f"💰 <b>Summa:</b> {amount:,} so'm\n"
                f"💳 <b>Karta:</b> <code>{card}</code>\n\n"
                f"━━━━━━━━━━━━━━━━━━━━\n"
                f"Tasdiqlash yoki rad etish:"
            )
            await bot.send_message(
                chat_id=admin_id,
                text=admin_text,
                parse_mode="HTML",
                reply_markup=admin_withdrawal_keyboard(withdrawal_id),
            )
        except Exception as e:
            logger.warning("Failed to notify admin %s about withdrawal: %s", admin_id, e)
