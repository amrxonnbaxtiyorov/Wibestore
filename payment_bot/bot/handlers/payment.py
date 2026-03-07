"""
To'lov jarayoni handlerlari (FSM):
  1. Foydalanuvchi "To'lov qilish" bosadi
  2. To'lov turini tanlaydi
  3. Karta rekvizitlari ko'rsatiladi
  4. Foydalanuvchi chek rasmini yuboradi
  5. Admin xabardor qilinadi
"""
import logging

from aiogram import Router, F
from aiogram.exceptions import TelegramBadRequest
from aiogram.fsm.context import FSMContext
from aiogram.types import Message, CallbackQuery, PhotoSize

from bot.config import (
    HUMO_CARD_NUMBER, HUMO_CARD_HOLDER,
    VISA_CARD_NUMBER, VISA_CARD_HOLDER,
)
from bot.keyboards.inline import PAYMENT_TYPE_KB, retry_payment_kb
from bot.keyboards.reply import CANCEL_KB, MAIN_MENU
from bot.services.payment_service import (
    user_has_pending_payment, create_payment, save_admin_message, ensure_user,
)
from bot.services.notification_service import notify_admins_new_payment
from bot.states.payment import PaymentFlow
from bot.utils.helpers import download_receipt, format_datetime, utcnow
from database.models import PaymentType

logger = logging.getLogger(__name__)
router = Router(name="payment")

# To'lov turi → karta ma'lumotlari
CARD_INFO: dict[str, dict] = {
    "HUMO": {
        "label": "HUMO karta",
        "number": HUMO_CARD_NUMBER,
        "holder": HUMO_CARD_HOLDER,
        "emoji": "🟣",
    },
    "VISA_MC": {
        "label": "VISA / MasterCard",
        "number": VISA_CARD_NUMBER,
        "holder": VISA_CARD_HOLDER,
        "emoji": "💳",
    },
}


# ── 1. "To'lov qilish" tugmasi ────────────────────────────────────────────────

@router.message(F.text == "💳 To'lov qilish")
async def payment_start(message: Message, state: FSMContext) -> None:
    """To'lov jarayonini boshlash — to'lov turini tanlash."""
    user = message.from_user
    if not user:
        return

    # Kutilayotgan to'lov bormi?
    if await user_has_pending_payment(user.id):
        await message.answer(
            "⏳ <b>Sizda hali ko'rib chiqilmagan to'lov bor.</b>\n\n"
            "Administrator chekingizni tekshirib, javob berguncha kuting.\n"
            "Savol bo'lsa — /help yozing.",
            parse_mode="HTML",
            reply_markup=MAIN_MENU,
        )
        return

    await state.set_state(PaymentFlow.choosing_type)
    await message.answer(
        "💳 <b>To'lov turini tanlang:</b>\n\n"
        "🟣 <b>HUMO</b> — O'zbekiston ichki kartalari\n"
        "💳 <b>VISA / MasterCard</b> — Xalqaro kartalar",
        reply_markup=PAYMENT_TYPE_KB,
        parse_mode="HTML",
    )


# ── 2. To'lov turini tanlash (inline callback) ───────────────────────────────

@router.callback_query(PaymentFlow.choosing_type, F.data.startswith("pay_type:"))
async def payment_type_chosen(callback: CallbackQuery, state: FSMContext) -> None:
    """Foydalanuvchi to'lov turini tanladi — karta rekvizitlarini ko'rsatish."""
    pay_type_key = callback.data.split(":", 1)[1]  # "HUMO" yoki "VISA_MC"

    if pay_type_key not in CARD_INFO:
        await callback.answer("Noto'g'ri tanlov.", show_alert=True)
        return

    card = CARD_INFO[pay_type_key]
    await state.update_data(payment_type=pay_type_key)
    await state.set_state(PaymentFlow.waiting_receipt)

    await callback.message.edit_text(
        f"{card['emoji']} <b>{card['label']} orqali to'lov</b>\n\n"
        f"Quyidagi karta raqamiga pul o'tkazing:\n\n"
        f"<b>Karta raqami:</b>\n"
        f"<code>{card['number']}</code>\n\n"
        f"<b>Karta egasi:</b>\n"
        f"<code>{card['holder']}</code>\n\n"
        f"━━━━━━━━━━━━━━━━━━━━\n"
        f"✅ Pul o'tkazgandan so'ng <b>bank ilovangizdan chek (skrinshot)</b> yuboring.\n\n"
        f"⚠️ Faqat <b>rasm</b> (JPEG/PNG) qabul qilinadi.\n"
        f"📌 Chekni o'zgartirmang — asl ko'rinishda yuboring.",
        parse_mode="HTML",
    )
    await callback.message.answer(
        "📸 Endi chek rasmini yuboring (bank ilovasidan skrinshot):",
        reply_markup=CANCEL_KB,
    )
    await callback.answer()


@router.callback_query(PaymentFlow.choosing_type, F.data == "pay_cancel")
async def payment_cancel_inline(callback: CallbackQuery, state: FSMContext) -> None:
    """Inline orqali bekor qilish."""
    await state.clear()
    await callback.message.edit_text("❌ Bekor qilindi.")
    await callback.message.answer("Asosiy menyu:", reply_markup=MAIN_MENU)
    await callback.answer()


# ── 3. Chek rasmini qabul qilish ──────────────────────────────────────────────

@router.message(PaymentFlow.waiting_receipt, F.photo)
async def receipt_received(message: Message, state: FSMContext, bot) -> None:
    """Foydalanuvchi chek rasmini yubordi — tekshirish, saqlash, admin xabardor qilish."""
    user = message.from_user
    if not user:
        return

    # Eng yuqori sifatli rasm versiyasini olish
    best_photo: PhotoSize = message.photo[-1]
    file_id = best_photo.file_id

    state_data = await state.get_data()
    pay_type_key: str = state_data.get("payment_type", "HUMO")
    payment_type = PaymentType(pay_type_key)
    card = CARD_INFO[pay_type_key]

    # Foydalanuvchi ma'lumotlarini yangilash
    await ensure_user(
        telegram_id=user.id,
        username=user.username,
        first_name=user.first_name,
        last_name=user.last_name,
    )

    # Kutilayotgan to'lov bor-yo'qligini qayta tekshirish (race condition)
    if await user_has_pending_payment(user.id):
        await state.clear()
        await message.answer(
            "⏳ Sizda allaqachon kutilayotgan to'lov bor. Javobni kuting.",
            reply_markup=MAIN_MENU,
        )
        return

    # 1. To'lovni DB ga saqlash (receipt_path keyinroq yangilanadi)
    now = utcnow()
    payment_id = await create_payment(
        telegram_id=user.id,
        payment_type=payment_type,
        receipt_file_id=file_id,
        receipt_path="",  # Hali saqlanmagan
    )

    # 2. Rasm faylini serverga saqlash (asinxron)
    receipt_path = await download_receipt(bot=bot, file_id=file_id, payment_id=payment_id)

    # 3. Foydalanuvchiga tasdiqlash xabari
    await state.clear()
    await message.answer(
        f"✅ <b>Chek qabul qilindi!</b>\n\n"
        f"📋 <b>To'lov ma'lumotlari:</b>\n"
        f"  • ID: <code>#{payment_id}</code>\n"
        f"  • Tur: {card['label']}\n"
        f"  • Vaqt: {format_datetime(now)}\n\n"
        f"⏳ Chekingiz administrator tomonidan ko'rib chiqilmoqda.\n"
        f"Natija haqida xabardor qilinasiz.",
        parse_mode="HTML",
        reply_markup=MAIN_MENU,
    )

    # 4. Adminlarga xabar yuborish
    sent = await notify_admins_new_payment(
        bot=bot,
        payment_id=payment_id,
        telegram_id=user.id,
        username=user.username,
        first_name=user.first_name,
        payment_type_label=card["label"],
        created_at=now,
        receipt_file_id=file_id,
    )

    # 5. Birinchi admin xabar ID sini saqlash (keyinchalik tahrirlash uchun)
    if sent:
        admin_chat_id, admin_message_id = sent[0]
        await save_admin_message(payment_id, admin_chat_id, admin_message_id)

    logger.info(
        "To'lov #%s yaratildi: user=%s type=%s admin_notifications=%d",
        payment_id, user.id, pay_type_key, len(sent),
    )


@router.message(PaymentFlow.waiting_receipt, ~F.photo)
async def receipt_wrong_type(message: Message) -> None:
    """Foydalanuvchi rasm o'rniga boshqa narsa yubordi."""
    await message.answer(
        "❌ <b>Faqat rasm qabul qilinadi!</b>\n\n"
        "Bank ilovangizdan to'lov chekining <b>skrinshotini</b> yuboring.\n\n"
        "Bekor qilish uchun: ❌ Bekor qilish",
        parse_mode="HTML",
    )


# ── 4. "Qayta yuborish" (rad etilgandan so'ng) ───────────────────────────────

@router.callback_query(F.data == "pay_retry")
async def payment_retry(callback: CallbackQuery, state: FSMContext) -> None:
    """Rad etilgan to'lovdan keyin qayta urinish."""
    user = callback.from_user
    if not user:
        return

    # Yangi FSM boshlash
    await state.set_state(PaymentFlow.choosing_type)
    await callback.message.answer(
        "💳 <b>To'lov turini qayta tanlang:</b>",
        reply_markup=PAYMENT_TYPE_KB,
        parse_mode="HTML",
    )
    await callback.answer()
