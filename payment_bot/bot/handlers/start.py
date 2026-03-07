"""
/start va asosiy menyu handlerlari.
"""
import logging

from aiogram import Router, F
from aiogram.filters import CommandStart, Command
from aiogram.fsm.context import FSMContext
from aiogram.types import Message

from bot.keyboards.reply import MAIN_MENU
from bot.services.payment_service import ensure_user, user_is_banned

logger = logging.getLogger(__name__)
router = Router(name="start")


@router.message(CommandStart())
async def cmd_start(message: Message, state: FSMContext) -> None:
    """Botni ishga tushirish — foydalanuvchini ro'yxatdan o'tkazish va menyu ko'rsatish."""
    user = message.from_user
    if not user:
        return

    # Eski FSM holatini tozalash
    await state.clear()

    # Foydalanuvchini DB ga saqlash
    await ensure_user(
        telegram_id=user.id,
        username=user.username,
        first_name=user.first_name,
        last_name=user.last_name,
    )

    # Ban tekshiruvi
    if await user_is_banned(user.id):
        await message.answer("⛔ Siz bloklangansiz. Murojaat uchun adminga yozing.")
        return

    await message.answer(
        f"👋 Salom, <b>{user.first_name or 'Foydalanuvchi'}</b>!\n\n"
        f"🌐 <b>WibeStore To'lov Boti</b>\n\n"
        f"Bu bot orqali siz bank kartasi yordamida to'lov qilishingiz mumkin.\n\n"
        f"💳 <b>Qabul qilinadigan kartalar:</b>\n"
        f"  • HUMO\n"
        f"  • VISA / MasterCard\n\n"
        f"Menyudan kerakli bo'limni tanlang:",
        reply_markup=MAIN_MENU,
        parse_mode="HTML",
    )


@router.message(Command("cancel"))
@router.message(F.text == "❌ Bekor qilish")
async def cmd_cancel(message: Message, state: FSMContext) -> None:
    """To'lov jarayonini bekor qilish."""
    current_state = await state.get_state()
    if current_state is None:
        await message.answer(
            "Faol jarayon yo'q.\n/start — asosiy menyuga qaytish.",
            reply_markup=MAIN_MENU,
        )
        return

    await state.clear()
    await message.answer(
        "❌ Bekor qilindi.\n\nAsosiy menyuga qaytish uchun /start yozing.",
        reply_markup=MAIN_MENU,
    )


@router.message(Command("help"))
@router.message(F.text == "ℹ️ Yordam")
async def cmd_help(message: Message) -> None:
    """Yordam xabari."""
    await message.answer(
        "📚 <b>Yordam</b>\n\n"
        "<b>Qanday to'lov qilish kerak?</b>\n\n"
        "1. <b>💳 To'lov qilish</b> tugmasini bosing\n"
        "2. To'lov turini tanlang (HUMO yoki VISA/MC)\n"
        "3. Ko'rsatilgan karta raqamiga pul o'tkazing\n"
        "4. Bank ilovasidan chekni (skrinshotni) yuboring\n"
        "5. Administrator chekni ko'rib chiqadi va tasdiqlanadi\n\n"
        "<b>Buyruqlar:</b>\n"
        "/start — Asosiy menyu\n"
        "/cancel — Jarayonni bekor qilish\n"
        "/help — Yordam\n\n"
        "❓ Savol bo'lsa — adminlarga murojaat qiling.",
        parse_mode="HTML",
        reply_markup=MAIN_MENU,
    )
