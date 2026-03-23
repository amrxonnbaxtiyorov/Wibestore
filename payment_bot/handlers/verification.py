"""Payment Bot — Seller verification flow handlers.

Flow: start_verification callback → passport front (photo+caption) → passport back → circle video → location
Each step is submitted to the backend API.
"""

import logging

from aiogram import Router, F, Bot
from aiogram.types import Message, CallbackQuery
from aiogram.fsm.context import FSMContext

from states import VerificationStates
from keyboards import cancel_keyboard, location_keyboard, main_menu_keyboard
import api_client

router = Router()
logger = logging.getLogger("bot.verification")


@router.callback_query(F.data.startswith("start_verification:"))
async def start_verification(callback: CallbackQuery, state: FSMContext):
    """User clicks 'Start verification' button."""
    verification_id = callback.data.split(":", 1)[1]
    await state.clear()
    await state.update_data(verification_id=verification_id)
    await state.set_state(VerificationStates.waiting_passport_front)

    await callback.message.answer(
        "🔐 <b>SHAXSINGIZNI TASDIQLASH — 1/4</b>\n\n"
        "📸 <b>Pasport/ID karta OLDI tomoni</b> rasmini yuboring.\n\n"
        "⚠️ Rasm tagiga to'liq ismingizni (F.I.SH) yozing.\n"
        "Masalan: rasm + caption <i>Amirxon Baxtiyorov</i>\n\n"
        "Rasmni caption (tagiga yozuv) bilan yuboring!",
        parse_mode="HTML",
        reply_markup=cancel_keyboard(),
    )
    await callback.answer()


# ── Cancel at any step ────────────────────────────────────────────────

@router.message(VerificationStates.waiting_passport_front, F.text == "❌ Bekor qilish")
@router.message(VerificationStates.waiting_passport_back, F.text == "❌ Bekor qilish")
@router.message(VerificationStates.waiting_video, F.text == "❌ Bekor qilish")
@router.message(VerificationStates.waiting_location, F.text == "❌ Bekor qilish")
async def cancel_verification(message: Message, state: FSMContext):
    await state.clear()
    await message.answer(
        "❌ Tekshiruv bekor qilindi.\n"
        "Keyinroq qayta boshlashingiz mumkin.",
        reply_markup=main_menu_keyboard(),
    )


# ── Step 1: Passport front ───────────────────────────────────────────

@router.message(VerificationStates.waiting_passport_front, F.photo)
async def passport_front(message: Message, state: FSMContext):
    caption = (message.caption or "").strip()
    if not caption or len(caption) < 3:
        await message.answer(
            "⚠️ Rasm tagiga to'liq ismingizni (F.I.SH) yozing!\n"
            "Masalan: <i>Amirxon Baxtiyorov</i>\n\n"
            "Qayta yuboring — rasm + caption.",
            parse_mode="HTML",
        )
        return

    photo = message.photo[-1]
    data = await state.get_data()
    verification_id = data["verification_id"]

    # Submit to backend
    result = await api_client.submit_verification_step(
        verification_id=verification_id,
        step="passport_front",
        file_id=photo.file_id,
        full_name=caption,
    )

    if not result.get("success"):
        await message.answer(f"❌ Xatolik: {result.get('error', 'Noma'lum xatolik')}")
        return

    await state.set_state(VerificationStates.waiting_passport_back)
    await message.answer(
        "✅ Pasport oldi qabul qilindi!\n\n"
        "🔐 <b>QADAM 2/4</b>\n\n"
        "📸 Endi <b>Pasport/ID karta ORQA tomoni</b> rasmini yuboring.",
        parse_mode="HTML",
        reply_markup=cancel_keyboard(),
    )


@router.message(VerificationStates.waiting_passport_front)
async def passport_front_invalid(message: Message):
    await message.answer(
        "📸 Iltimos, <b>rasm</b> yuboring (pasport oldi tomoni) + tagiga F.I.SH yozing.",
        parse_mode="HTML",
    )


# ── Step 2: Passport back ────────────────────────────────────────────

@router.message(VerificationStates.waiting_passport_back, F.photo)
async def passport_back(message: Message, state: FSMContext):
    photo = message.photo[-1]
    data = await state.get_data()
    verification_id = data["verification_id"]

    result = await api_client.submit_verification_step(
        verification_id=verification_id,
        step="passport_back",
        file_id=photo.file_id,
    )

    if not result.get("success"):
        await message.answer(f"❌ Xatolik: {result.get('error', 'Noma'lum xatolik')}")
        return

    await state.set_state(VerificationStates.waiting_video)
    await message.answer(
        "✅ Pasport orqa tomoni qabul qilindi!\n\n"
        "🔐 <b>QADAM 3/4</b>\n\n"
        "🎥 Endi <b>doira video</b> (video xabar) yuboring.\n\n"
        "Telegramning doira video funksiyasidan foydalaning va quyidagini ayting:\n\n"
        "<i>«Men [ismingiz] wibestore.net da akkauntimni sotdim.\n"
        "Agar akkauntdan muammo chiqsa va savdodan keyin "
        "akkauntda muammo chiqsa, menga qonuniy jazo qo'llashlari "
        "va bergan ma'lumotlarimni wibestore.net ishlatishi uchun "
        "huquqni beraman, faqat shu sotilgan akkaunt bo'yicha "
        "muammo bo'lsa»</i>\n\n"
        "⚠️ Faqat <b>doira video</b> (video_note) qabul qilinadi!",
        parse_mode="HTML",
        reply_markup=cancel_keyboard(),
    )


@router.message(VerificationStates.waiting_passport_back)
async def passport_back_invalid(message: Message):
    await message.answer(
        "📸 Iltimos, <b>rasm</b> yuboring (pasport orqa tomoni).",
        parse_mode="HTML",
    )


# ── Step 3: Circle video (video_note) ────────────────────────────────

@router.message(VerificationStates.waiting_video, F.video_note)
async def circle_video(message: Message, state: FSMContext):
    video_note = message.video_note
    data = await state.get_data()
    verification_id = data["verification_id"]

    result = await api_client.submit_verification_step(
        verification_id=verification_id,
        step="video",
        file_id=video_note.file_id,
    )

    if not result.get("success"):
        await message.answer(f"❌ Xatolik: {result.get('error', 'Noma'lum xatolik')}")
        return

    await state.set_state(VerificationStates.waiting_location)
    await message.answer(
        "✅ Doira video qabul qilindi!\n\n"
        "🔐 <b>QADAM 4/4 — OXIRGI QADAM</b>\n\n"
        "📍 Endi <b>joriy joylashuvingizni</b> yuboring.\n\n"
        "Quyidagi tugmani bosing 👇",
        parse_mode="HTML",
        reply_markup=location_keyboard(),
    )


@router.message(VerificationStates.waiting_video, F.video)
async def video_not_circle(message: Message):
    await message.answer(
        "⚠️ Bu oddiy video. <b>Doira video</b> (video xabar) yuboring!\n\n"
        "Telegramda kamera tugmasini bosib ushlab turing — doira video yoziladi.",
        parse_mode="HTML",
    )


@router.message(VerificationStates.waiting_video)
async def video_invalid(message: Message):
    await message.answer(
        "🎥 Iltimos, <b>doira video</b> (video_note) yuboring.\n"
        "Telegramda kamera tugmasini bosib ushlab turing.",
        parse_mode="HTML",
    )


# ── Step 4: Location ─────────────────────────────────────────────────

@router.message(VerificationStates.waiting_location, F.location)
async def receive_location(message: Message, state: FSMContext):
    location = message.location
    data = await state.get_data()
    verification_id = data["verification_id"]

    result = await api_client.submit_verification_step(
        verification_id=verification_id,
        step="location",
        latitude=location.latitude,
        longitude=location.longitude,
    )

    await state.clear()

    if not result.get("success"):
        await message.answer(
            f"❌ Xatolik: {result.get('error', 'Noma'lum xatolik')}",
            reply_markup=main_menu_keyboard(),
        )
        return

    await message.answer(
        "✅ <b>Barcha hujjatlar yuborildi!</b>\n\n"
        "Admin hujjatlaringizni tekshiradi.\n"
        "Tasdiqlangandan so'ng pul hisobingizga o'tkaziladi.\n\n"
        "⏳ Odatda 1-24 soat ichida tekshiriladi.\n\n"
        "⚠️ <b>Eslatma:</b> Agar hujjatlar soxta bo'lsa, "
        "102 orqali qonuniy chora ko'rilishi mumkin.",
        parse_mode="HTML",
        reply_markup=main_menu_keyboard(),
    )


@router.message(VerificationStates.waiting_location)
async def location_invalid(message: Message):
    await message.answer(
        "📍 Iltimos, <b>joylashuvingizni</b> yuboring.\n"
        "Quyidagi tugmani bosing 👇",
        parse_mode="HTML",
        reply_markup=location_keyboard(),
    )
