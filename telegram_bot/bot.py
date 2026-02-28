"""
Telegram Bot - OTP orqali ro'yxatdan o'tish
Bu bot websitega ro'yxatdan o'tish uchun OTP kod beradi.

O'rnatish:
    pip install python-telegram-bot==20.7 python-dotenv

Ishga tushirish:
    python bot.py
"""

import asyncio
import json
import logging
import os
import time as _time
import urllib.error
import urllib.request
import warnings
from pathlib import Path

# PTBUserWarning (per_message + CallbackQueryHandler) — ConversationHandler da kerakli sozlama
warnings.filterwarnings("ignore", message=".*per_message.*")
warnings.filterwarnings("ignore", message=".*CallbackQueryHandler.*")
warnings.filterwarnings("ignore", category=UserWarning, module="telegram")

try:
    from dotenv import load_dotenv
    load_dotenv(Path(__file__).resolve().parent / ".env")
except ImportError:
    pass

from telegram import Update, InlineKeyboardButton, InlineKeyboardMarkup, ReplyKeyboardMarkup, KeyboardButton
from telegram.error import Conflict as TelegramConflict, BadRequest
from telegram.ext import (
    Application,
    CommandHandler,
    MessageHandler,
    CallbackQueryHandler,
    filters,
    ContextTypes,
    ConversationHandler,
)

logging.basicConfig(
    format='%(asctime)s - %(name)s - %(levelname)s - %(message)s',
    level=logging.INFO
)
logger = logging.getLogger(__name__)
# Conflict (409) va httpx logini kamaytirish — faqat bizning WARNING chiqadi
logging.getLogger("telegram.ext.Updater").setLevel(logging.CRITICAL)
logging.getLogger("httpx").setLevel(logging.WARNING)

# ===== KONFIGURATSIYA =====
BOT_TOKEN = os.getenv('BOT_TOKEN', 'YOUR_BOT_TOKEN_HERE')
# Backend API asosiy URL (masalan http://localhost:8000)
WEBSITE_URL = os.getenv('WEBSITE_URL', 'http://localhost:8000').rstrip('/')
BOT_SECRET_KEY = os.getenv('BOT_SECRET_KEY') or os.getenv('TELEGRAM_BOT_SECRET', '')
REGISTER_URL = os.getenv('REGISTER_URL', 'http://localhost:5173/register')  # Frontend ro'yxatdan o'tish sahifasi

# Conversation states: faqat telefon orqali kod olish
WAITING_PHONE, CONFIRMING = range(2)

# Countdown update interval (seconds)
COUNTDOWN_INTERVAL = 30


# ===== HELPER FUNCTIONS =====

def _normalize_phone(phone: str) -> str:
    """Telefonni +998XXXXXXXXX ko'rinishiga keltirish (backend bilan bir xil)."""
    cleaned = "".join(c for c in phone if c.isdigit())
    if not cleaned:
        return phone.strip()
    if cleaned.startswith("998") and len(cleaned) == 12:
        return "+" + cleaned
    if len(cleaned) == 9 and cleaned[0] == "9":
        return "+998" + cleaned
    return "+" + cleaned if not phone.strip().startswith("+") else phone.strip()


def create_otp_via_api(telegram_id: int, phone: str, full_name: str = "") -> dict:
    """Backend API orqali OTP kod yaratish (urllib — qo'shimcha paket kerak emas)."""
    if not BOT_SECRET_KEY:
        logger.error("BOT_SECRET_KEY yoki TELEGRAM_BOT_SECRET o'rnatilmagan")
        return None
    if "localhost" in WEBSITE_URL or "127.0.0.1" in WEBSITE_URL:
        logger.warning("WEBSITE_URL localhost — Railway'da backend manzilini (https://...) o'rnating!")
    url = f"{WEBSITE_URL.rstrip('/')}/api/v1/auth/telegram/otp/create/"
    body = json.dumps({
        "secret_key": BOT_SECRET_KEY,
        "telegram_id": telegram_id,
        "phone_number": phone,
        "full_name": full_name,
    }).encode("utf-8")
    req = urllib.request.Request(
        url,
        data=body,
        headers={"Content-Type": "application/json"},
        method="POST",
    )
    try:
        with urllib.request.urlopen(req, timeout=15) as resp:
            if resp.status == 200:
                return json.loads(resp.read().decode("utf-8"))
            raw = resp.read().decode()
            logger.error("API javob: %s - %s", resp.status, raw[:500])
            return None
    except urllib.error.HTTPError as e:
        raw = e.read().decode() if e.fp else ""
        logger.error("Backend HTTP %s: %s", e.code, raw[:500])
        if e.code == 403:
            logger.error("403: BOT_SECRET_KEY backend dagi TELEGRAM_BOT_SECRET bilan bir xil bo'lishi kerak.")
        return None
    except (urllib.error.URLError, OSError) as e:
        logger.error(
            "Backend ga ulanish xatosi: %s | WEBSITE_URL=%s | Backend ishlayotganini va URL to'g'riligini tekshiring (RAILWAY_VARIABLES.md)",
            e, WEBSITE_URL
        )
        return None


def _make_progress_bar(remaining: int, total: int) -> str:
    """Progress bar yaratish: ████████░░ 80%"""
    if total <= 0:
        return "░░░░░░░░░░ 0%"
    ratio = max(0.0, min(1.0, remaining / total))
    filled = round(ratio * 10)
    empty = 10 - filled
    percent = round(ratio * 100)
    return f"{'█' * filled}{'░' * empty} {percent}%"


def format_otp_message(code: str, remaining: int, total: int, register_url: str) -> str:
    """OTP xabar formatlash (countdown + progress bar)"""
    minutes = remaining // 60
    secs = remaining % 60
    time_str = f"{minutes}:{secs:02d}"
    progress = _make_progress_bar(remaining, total)

    if remaining <= 0:
        return (
            f"🔐 <b>Tasdiqlash kodi</b>\n\n"
            f"<code>┌─────────────┐\n"
            f"│  {code}  │\n"
            f"└─────────────┘</code>\n\n"
            f"❌ <b>Kod muddati tugadi!</b>\n"
            f"Yangi kod olish uchun 🔄 tugmasini bosing."
        )

    return (
        f"🔐 <b>Tasdiqlash kodi</b>\n\n"
        f"Sizning bir martalik kodingiz:\n\n"
        f"<code>┌─────────────┐\n"
        f"│  {code}  │\n"
        f"└─────────────┘</code>\n\n"
        f"⏱ <b>Qolgan vaqt:</b> {time_str}\n"
        f"<code>{progress}</code>\n\n"
        f"📌 Ushbu kodni saytda ro'yxatdan o'tishda <b>telefon raqam</b> bilan birga kiriting:\n"
        f"🔗 <a href='{register_url}'>{register_url}</a>\n\n"
        f"⚠️ Kodni hech kimga bermang! Bir marta ishlatiladi."
    )


# ===== COUNTDOWN TASK =====

async def _countdown_updater(context: ContextTypes.DEFAULT_TYPE):
    """Har COUNTDOWN_INTERVAL sekundda OTP xabarni yangilash (countdown + progress bar)."""
    job_data = context.job.data
    chat_id = job_data["chat_id"]
    message_id = job_data["message_id"]
    code = job_data["code"]
    total_seconds = job_data["total_seconds"]
    started_at = job_data["started_at"]
    register_url = job_data["register_url"]
    reply_markup = job_data.get("reply_markup")

    elapsed = _time.time() - started_at
    remaining = max(0, int(total_seconds - elapsed))

    new_text = format_otp_message(code, remaining, total_seconds, register_url)

    try:
        await context.bot.edit_message_text(
            chat_id=chat_id,
            message_id=message_id,
            text=new_text,
            parse_mode="HTML",
            reply_markup=reply_markup if remaining > 0 else None,
            disable_web_page_preview=True,
        )
    except BadRequest:
        # Xabar o'zgartirilmagan (matn bir xil) yoki topilmagan
        pass

    if remaining <= 0:
        context.job.schedule_removal()


def _schedule_countdown(context: ContextTypes.DEFAULT_TYPE, chat_id: int, message_id: int,
                        code: str, total_seconds: int, reply_markup=None):
    """Countdown job'larni rejalashtirish."""
    # Oldingi countdown joblarini tozalash
    current_jobs = context.job_queue.get_jobs_by_name(f"countdown_{chat_id}")
    for job in current_jobs:
        job.schedule_removal()

    job_data = {
        "chat_id": chat_id,
        "message_id": message_id,
        "code": code,
        "total_seconds": total_seconds,
        "started_at": _time.time(),
        "register_url": REGISTER_URL,
        "reply_markup": reply_markup,
    }

    # Har COUNTDOWN_INTERVAL sekundda yangilash
    intervals = list(range(COUNTDOWN_INTERVAL, total_seconds + COUNTDOWN_INTERVAL, COUNTDOWN_INTERVAL))
    for sec in intervals:
        context.job_queue.run_once(
            _countdown_updater,
            when=sec,
            data=job_data,
            name=f"countdown_{chat_id}",
        )


# ===== HANDLERS =====

async def start(update: Update, context: ContextTypes.DEFAULT_TYPE) -> int:
    """Bot: /start — telefon so'rash, keyin 4–6 xonali kod berish"""
    user = update.effective_user
    keyboard = [[KeyboardButton("📱 Telefon raqamimni yuborish", request_contact=True)]]
    reply_markup = ReplyKeyboardMarkup(keyboard, one_time_keyboard=True, resize_keyboard=True)
    welcome_text = (
        f"👋 Salom, <b>{user.first_name}</b>!\n\n"
        f"🌐 <b>Saytga ro'yxatdan o'tish</b>\n\n"
        f"Bir martalik tasdiqlash kodi olish uchun <b>telefon raqamingizni</b> yuboring.\n\n"
        f"Format: <code>+998901234567</code> yoki quyidagi tugmani bosing.\n\n"
        f"❌ Bekor qilish: /cancel"
    )
    await update.message.reply_html(welcome_text, reply_markup=reply_markup)
    return WAITING_PHONE


async def receive_phone(update: Update, context: ContextTypes.DEFAULT_TYPE) -> int:
    """Telefon qabul qilish va OTP yuborish"""
    # Contact yoki matn orqali
    if update.message.contact:
        phone = update.message.contact.phone_number
        if not phone.startswith('+'):
            phone = '+' + phone
    else:
        phone = update.message.text.strip()
        # Validatsiya
        if not phone.startswith('+') or len(phone) < 10:
            await update.message.reply_text(
                "❌ Noto'g'ri telefon raqam.\n\n"
                "Format: +998901234567"
            )
            return WAITING_PHONE

    user = update.effective_user
    telegram_id = user.id
    full_name = user.full_name or ""
    phone_normalized = _normalize_phone(phone)

    wait_msg = await update.message.reply_html("⏳ Kod tayyorlanmoqda...")

    result = create_otp_via_api(
        telegram_id=telegram_id,
        phone=phone_normalized,
        full_name=full_name,
    )

    await wait_msg.delete()

    if result and result.get("success"):
        code = result["code"]
        total_seconds = result.get("remaining_seconds", 600)

        otp_msg = format_otp_message(code, total_seconds, total_seconds, REGISTER_URL)
        keyboard = [
            [InlineKeyboardButton("🔄 Yangi kod olish", callback_data='new_code')],
            [InlineKeyboardButton("🌐 Saytga o'tish", url=REGISTER_URL)],
        ]
        reply_markup = InlineKeyboardMarkup(keyboard)
        context.user_data["phone"] = phone_normalized

        from telegram import ReplyKeyboardRemove
        sent_msg = await update.message.reply_html(
            otp_msg,
            reply_markup=reply_markup,
            disable_web_page_preview=True,
        )
        await update.effective_chat.send_message(
            "✅ Yuqoridagi kodni saytda telefon raqam bilan birga kiriting.",
            reply_markup=ReplyKeyboardRemove(),
        )

        # Countdown boshlash
        _schedule_countdown(context, sent_msg.chat_id, sent_msg.message_id,
                            code, total_seconds, reply_markup)

        return CONFIRMING
    await update.message.reply_html(
        "❌ <b>Backend bilan bog'lanib bo'lmadi.</b>\n\n"
        "Bir necha soniyadan keyin /start ni qayta yuboring. Agar takrorlansa, administrator "
        "WEBSITE_URL va BOT_SECRET_KEY ni tekshirsin (RAILWAY_VARIABLES.md)."
    )
    return ConversationHandler.END


async def new_code_callback(update: Update, context: ContextTypes.DEFAULT_TYPE) -> int:
    """Yangi kod so'rash (oldingi telefon bilan)"""
    query = update.callback_query
    await query.answer("Yangi kod tayyorlanmoqda...")
    phone = context.user_data.get('phone')
    if not phone:
        await query.edit_message_text("❌ Telefon raqam yo'q. /start dan qayta boshlang.")
        return ConversationHandler.END

    user = update.effective_user
    full_name = user.full_name or ""

    result = create_otp_via_api(
        telegram_id=user.id,
        phone=phone,
        full_name=full_name,
    )
    if result and result.get('success'):
        total_seconds = result.get('remaining_seconds', 600)
        code = result['code']
        otp_msg = format_otp_message(code, total_seconds, total_seconds, REGISTER_URL)
        keyboard = [
            [InlineKeyboardButton("🔄 Yangi kod olish", callback_data='new_code')],
            [InlineKeyboardButton("🌐 Saytga o'tish", url=REGISTER_URL)],
        ]
        reply_markup = InlineKeyboardMarkup(keyboard)
        await query.edit_message_text(otp_msg, parse_mode='HTML', reply_markup=reply_markup,
                                      disable_web_page_preview=True)

        # Countdown boshlash
        _schedule_countdown(context, query.message.chat_id, query.message.message_id,
                            code, total_seconds, reply_markup)
    else:
        await query.edit_message_text("❌ Xatolik. /start yozing.")
    return CONFIRMING


async def cancel(update: Update, context: ContextTypes.DEFAULT_TYPE) -> int:
    """Bekor qilish"""
    await update.message.reply_html(
        "❌ <b>Bekor qilindi.</b>\n\n"
        "Qaytadan boshlash uchun /start yozing."
    )
    context.user_data.clear()
    return ConversationHandler.END


async def help_command(update: Update, context: ContextTypes.DEFAULT_TYPE) -> None:
    """Yordam"""
    await update.message.reply_html(
        "📚 <b>Yordam</b>\n\n"
        "/start — Ro'yxatdan o'tish uchun kod olish\n"
        "/cancel — Bekor qilish\n\n"
        "❓ <b>Qanday ishlaydi?</b>\n"
        "1. /start yozing\n"
        "2. Telefon raqamingizni yuboring\n"
        "3. Tasdiqlash kodi olasiz (vaqt chegarasi bilan)\n"
        f"4. <a href='{REGISTER_URL}'>Saytda</a> telefon + kodni kiriting va ro'yxatdan o'ting"
    )


async def unknown(update: Update, context: ContextTypes.DEFAULT_TYPE) -> None:
    """Noma'lum buyruq"""
    await update.message.reply_html(
        "❓ Tushunmadim.\n/start yozing."
    )


def main():
    """Botni ishga tushirish"""
    if BOT_TOKEN == 'YOUR_BOT_TOKEN_HERE':
        logger.error("BOT_TOKEN o'rnatilmagan! .env faylni tekshiring.")
        return
    if not BOT_SECRET_KEY:
        logger.error(
            "BOT_SECRET_KEY yoki TELEGRAM_BOT_SECRET o'rnatilmagan! "
            "Railway: Bot servisida Variable qo'shing (Backend dagi TELEGRAM_BOT_SECRET bilan bir xil)."
        )
        return
    # Railway'da WEBSITE_URL = backend manzili (https://...). Localhost bo'lmasin.
    if "localhost" in WEBSITE_URL or "127.0.0.1" in WEBSITE_URL:
        logger.error(
            "WEBSITE_URL localhost/127.0.0.1 — Backend ga ulanmaydi! "
            "Railway Bot servisida WEBSITE_URL = Backend URL (masalan https://exemplary-fascination-production-9514.up.railway.app) qo'ying. RAILWAY_VARIABLES.md"
        )
        return

    app = Application.builder().token(BOT_TOKEN).build()

    conv_handler = ConversationHandler(
        entry_points=[CommandHandler('start', start)],
        states={
            WAITING_PHONE: [
                MessageHandler(filters.CONTACT, receive_phone),
                MessageHandler(filters.TEXT & ~filters.COMMAND, receive_phone),
            ],
            CONFIRMING: [
                CallbackQueryHandler(new_code_callback, pattern='^new_code$'),
            ],
        },
        fallbacks=[CommandHandler('cancel', cancel)],
        per_message=False,
    )

    app.add_handler(conv_handler)
    app.add_handler(CommandHandler('help', help_command))
    app.add_handler(MessageHandler(filters.COMMAND, unknown))

    # Conflict (409): logni to'ldirmaslik uchun 5 daqiqada bir marta xabar
    _last_conflict_log = [0.0]  # [timestamp]

    async def error_handler(update, context):
        if isinstance(context.error, TelegramConflict):
            import time
            now = time.time()
            if now - _last_conflict_log[0] >= 300:  # 5 daqiqa
                _last_conflict_log[0] = now
                logger.warning(
                    "Conflict: Bot boshqa joyda ham ishlayapti. Faqat bitta instance (Railway yoki kompyuter)."
                )
            return
        logger.exception("Kutilmagan xato: %s", context.error)

    app.add_error_handler(error_handler)

    logger.info("Bot ishga tushdi...")
    try:
        app.run_polling(allowed_updates=Update.ALL_TYPES, drop_pending_updates=True)
    except TelegramConflict:
        logger.warning(
            "Bot Conflict: Faqat BITTA bot instance ishlashi kerak. "
            "Boshqa joyda (kompyuter yoki ikkinchi Railway replica) botni to'xtating."
        )
        raise


if __name__ == '__main__':
    main()
