"""Payment Bot — Deposit (balans to'ldirish) handlers."""

import logging

from aiogram import Router, F, Bot
from aiogram.types import Message
from aiogram.fsm.context import FSMContext

from config import HUMO_CARD_NUMBER, HUMO_CARD_HOLDER, ADMIN_IDS
from states import DepositStates
from keyboards import cancel_keyboard, main_menu_keyboard, admin_deposit_keyboard
import api_client

router = Router()
logger = logging.getLogger("bot.deposit")


@router.message(F.text == "💰 Balans to'ldirish")
async def start_deposit(message: Message, state: FSMContext):
    await state.clear()
    await state.set_state(DepositStates.waiting_amount)
    await message.answer(
        "💰 <b>Balans to'ldirish</b>\n\n"
        "Qancha summa to'ldirmoqchisiz? (so'mda)\n\n"
        "Masalan: <code>50000</code>",
        parse_mode="HTML",
        reply_markup=cancel_keyboard(),
    )


@router.message(DepositStates.waiting_amount, F.text == "❌ Bekor qilish")
async def cancel_deposit(message: Message, state: FSMContext):
    await state.clear()
    await message.answer("❌ Bekor qilindi.", reply_markup=main_menu_keyboard())


@router.message(DepositStates.waiting_amount)
async def deposit_amount(message: Message, state: FSMContext):
    try:
        amount = int(message.text.replace(" ", "").replace(",", ""))
        if amount < 1000:
            await message.answer("❌ Minimal summa: 1 000 so'm")
            return
        if amount > 100_000_000:
            await message.answer("❌ Maksimal summa: 100 000 000 so'm")
            return
    except (ValueError, TypeError):
        await message.answer("❌ Noto'g'ri summa. Faqat raqam yozing. Masalan: <code>50000</code>", parse_mode="HTML")
        return

    await state.update_data(amount=amount)
    await state.set_state(DepositStates.waiting_screenshot)

    card_info = ""
    if HUMO_CARD_NUMBER:
        card_info = (
            f"💳 <b>HUMO:</b> <code>{HUMO_CARD_NUMBER}</code>\n"
            f"👤 {HUMO_CARD_HOLDER}\n\n"
        )

    await message.answer(
        f"💰 Summa: <b>{amount:,} so'm</b>\n\n"
        f"Quyidagi kartaga pul o'tkazing:\n\n"
        f"{card_info}"
        f"To'lovni amalga oshirgach, <b>to'lov cheki rasmini</b> (screenshot) yuboring 📸",
        parse_mode="HTML",
        reply_markup=cancel_keyboard(),
    )


@router.message(DepositStates.waiting_screenshot, F.text == "❌ Bekor qilish")
async def cancel_screenshot(message: Message, state: FSMContext):
    await state.clear()
    await message.answer("❌ Bekor qilindi.", reply_markup=main_menu_keyboard())


@router.message(DepositStates.waiting_screenshot, F.photo)
async def deposit_screenshot(message: Message, state: FSMContext, bot: Bot):
    data = await state.get_data()
    amount = data.get("amount")
    photo = message.photo[-1]  # highest resolution

    # Download photo
    file = await bot.get_file(photo.file_id)
    photo_bytes = await bot.download_file(file.file_path)

    # Send to backend
    username = message.from_user.username or ""
    result = await api_client.create_deposit_request(
        telegram_id=message.from_user.id,
        telegram_username=username,
        amount=amount,
        screenshot_bytes=photo_bytes.read() if photo_bytes else None,
    )

    await state.clear()

    if result.get("success"):
        deposit_id = result.get("id", "")
        await message.answer(
            "✅ <b>So'rov qabul qilindi!</b>\n\n"
            f"💰 Summa: <b>{amount:,} so'm</b>\n\n"
            "Admin tekshirgandan so'ng balansga qo'shiladi.\n"
            "Kutib turing... ⏳",
            parse_mode="HTML",
            reply_markup=main_menu_keyboard(),
        )

        # Notify admins
        for admin_id in ADMIN_IDS:
            try:
                await bot.send_photo(
                    chat_id=admin_id,
                    photo=photo.file_id,
                    caption=(
                        f"📥 <b>Yangi depozit so'rovi!</b>\n\n"
                        f"👤 {message.from_user.full_name}\n"
                        f"🆔 Telegram ID: <code>{message.from_user.id}</code>\n"
                        f"📱 @{username}\n"
                        f"💰 Summa: <b>{amount:,} so'm</b>\n\n"
                        f"Tasdiqlash yoki rad etish:"
                    ),
                    parse_mode="HTML",
                    reply_markup=admin_deposit_keyboard(deposit_id),
                )
            except Exception as e:
                logger.warning("Failed to notify admin %s: %s", admin_id, e)
    else:
        await message.answer(
            "❌ Xatolik yuz berdi. Qayta urinib ko'ring.",
            reply_markup=main_menu_keyboard(),
        )


@router.message(DepositStates.waiting_screenshot)
async def deposit_screenshot_invalid(message: Message):
    await message.answer(
        "📸 Iltimos, to'lov cheki <b>rasmini</b> yuboring (screenshot).",
        parse_mode="HTML",
    )
