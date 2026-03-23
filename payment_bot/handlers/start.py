"""Payment Bot — /start command and main menu handlers."""

import logging

from aiogram import Router, F
from aiogram.filters import CommandStart
from aiogram.types import Message
from aiogram.fsm.context import FSMContext

from config import ADMIN_IDS, SITE_API_URL
from keyboards import main_menu_keyboard, admin_menu_keyboard

router = Router()
logger = logging.getLogger("bot.start")


@router.message(CommandStart())
async def cmd_start(message: Message, state: FSMContext):
    """Handle /start command. Check for deep link parameters."""
    await state.clear()
    args = message.text.split(maxsplit=1)
    deep_link = args[1] if len(args) > 1 else ""

    user_name = message.from_user.full_name or "Foydalanuvchi"
    tg_id = message.from_user.id

    if deep_link.startswith("premium_"):
        plan_slug = deep_link.replace("premium_", "")
        await message.answer(
            f"⭐ <b>Obuna sotib olish</b>\n\n"
            f"Siz <b>{plan_slug.upper()}</b> obunasini sotib olmoqchisiz.\n\n"
            f"Balansni to'ldiring va saytda obunani sotib oling:\n"
            f"🌐 wibestore.net/premium",
            parse_mode="HTML",
        )
        return

    if deep_link == "topup":
        await message.answer(
            "💰 <b>Balans to'ldirish</b>\n\n"
            "Balansni to'ldirish uchun quyidagi tugmani bosing 👇",
            parse_mode="HTML",
            reply_markup=main_menu_keyboard(),
        )
        return

    # Main welcome
    is_admin = tg_id in ADMIN_IDS
    kb = admin_menu_keyboard() if is_admin else main_menu_keyboard()

    await message.answer(
        f"👋 Salom, <b>{user_name}</b>!\n\n"
        f"🎮 <b>WibeStore</b> — O'yin akkauntlari marketplace\n\n"
        f"Bu bot orqali siz:\n"
        f"💰 Balans to'ldirishingiz\n"
        f"💸 Pul yechishingiz\n"
        f"⭐ Obuna sotib olishingiz\n"
        f"📦 Savdo jarayonlarini boshqarishingiz mumkin\n\n"
        f"🌐 wibestore.net",
        parse_mode="HTML",
        reply_markup=kb,
    )


@router.message(F.text == "🔙 Asosiy menyu")
async def back_to_main(message: Message, state: FSMContext):
    await state.clear()
    tg_id = message.from_user.id
    is_admin = tg_id in ADMIN_IDS
    kb = admin_menu_keyboard() if is_admin else main_menu_keyboard()
    await message.answer("🏠 Asosiy menyu", reply_markup=kb)


@router.message(F.text == "📞 Yordam")
async def help_handler(message: Message):
    await message.answer(
        "📞 <b>Yordam</b>\n\n"
        "Muammo bo'lsa adminga murojaat qiling:\n"
        "📱 Telegram: @wibestore_support\n"
        "🌐 wibestore.net\n\n"
        "Yoki 102 ga ariza tashlang.",
        parse_mode="HTML",
    )


@router.message(F.text == "📊 Mening hisobim")
async def my_account(message: Message):
    await message.answer(
        "📊 <b>Hisobingiz</b>\n\n"
        "Balans va savdolar haqida batafsil ma'lumot uchun saytga kiring:\n"
        "🌐 wibestore.net/profile",
        parse_mode="HTML",
    )


@router.message(F.text == "⭐ Obunalar")
async def subscriptions_info(message: Message):
    await message.answer(
        "⭐ <b>WibeStore Obunalari</b>\n\n"
        "🆓 <b>Free</b> — Bepul\n"
        "   • Oyiga 5 ta e'lon\n"
        "   • 10% komissiya\n\n"
        "⭐ <b>Premium</b> — 99 999 so'm/oy\n"
        "   • Oyiga 30 ta e'lon\n"
        "   • 8% komissiya\n"
        "   • Premium nishon\n"
        "   • Bosh sahifada ko'rinish\n\n"
        "💎 <b>Pro</b> — 249 999 so'm/oy\n"
        "   • Oyiga 70 ta e'lon\n"
        "   • 5% komissiya\n"
        "   • VIP oltin nishon\n"
        "   • Bosh sahifada birinchi\n"
        "   • Shaxsiy menejer\n\n"
        "Obuna sotib olish uchun:\n"
        "1️⃣ Balansni to'ldiring\n"
        "2️⃣ 🌐 wibestore.net/premium ga kiring",
        parse_mode="HTML",
    )
