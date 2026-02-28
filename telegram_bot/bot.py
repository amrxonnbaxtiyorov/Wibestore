"""
Telegram Bot - OTP orqali ro'yxatdan o'tish
Bu bot websitega ro'yxatdan o'tish uchun OTP kod beradi.

O'rnatish:
    pip install python-telegram-bot==20.7 python-dotenv

Ishga tushirish:
    python bot.py
"""

import json
import logging
import os
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
from telegram.error import Conflict as TelegramConflict
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


def create_otp_via_api(telegram_id: int, phone: str) -> dict:
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
        logger.error("Backend ga ulanish xatosi: %s (WEBSITE_URL=%s)", e, WEBSITE_URL)
        return None


def format_otp_message(code: str, seconds: int, register_url: str) -> str:
    """OTP xabar formatlash (kod 10 daqiqa amal qiladi)"""
    minutes = seconds // 60
    secs = seconds % 60
    time_str = f"{minutes}:{secs:02d}"
    return (
        f"🔐 <b>Tasdiqlash kodi</b>\n\n"
        f"Sizning bir martalik kodingiz:\n\n"
        f"<code>┌─────────────┐\n"
        f"│  {code}  │\n"
        f"└─────────────┘</code>\n\n"
        f"⏱ <b>Muddati:</b> {time_str} (10 daqiqa)\n\n"
        f"📌 Ushbu kodni saytda ro'yxatdan o'tishda <b>telefon raqam</b> bilan birga kiriting:\n"
        f"🔗 <a href='{register_url}'>{register_url}</a>\n\n"
        f"⚠️ Kodni hech kimga bermang! Bir marta ishlatiladi."
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
    phone_normalized = _normalize_phone(phone)

    wait_msg = await update.message.reply_html("⏳ Kod tayyorlanmoqda...")

    result = create_otp_via_api(telegram_id=telegram_id, phone=phone_normalized)

    await wait_msg.delete()

    if result and result.get("success"):
        code = result["code"]
        remaining = result.get("remaining_seconds", 600)

        otp_msg = format_otp_message(code, remaining, REGISTER_URL)
        keyboard = [
            [InlineKeyboardButton("🔄 Yangi kod olish", callback_data='new_code')],
            [InlineKeyboardButton("🌐 Saytga o'tish", url=REGISTER_URL)],
        ]
        reply_markup = InlineKeyboardMarkup(keyboard)
        context.user_data["phone"] = phone_normalized

        from telegram import ReplyKeyboardRemove
        await update.message.reply_html(otp_msg, reply_markup=reply_markup)
        await update.effective_chat.send_message(
            "✅ Yuqoridagi kodni saytda telefon raqam bilan birga kiriting.",
            reply_markup=ReplyKeyboardRemove(),
        )
        return CONFIRMING
    await update.message.reply_html(
        "❌ <b>Backend bilan bog'lanib bo'lmadi.</b>\n\n"
        "Bir necha soniyadan keyin /start ni qayta yuboring. Agar takrorlansa, sayt administratoriga murojaat qiling."
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
    result = create_otp_via_api(telegram_id=update.effective_user.id, phone=phone)
    if result and result.get('success'):
        remaining = result.get('remaining_seconds', 600)
        otp_msg = format_otp_message(result['code'], remaining, REGISTER_URL)
        keyboard = [
            [InlineKeyboardButton("🔄 Yangi kod olish", callback_data='new_code')],
            [InlineKeyboardButton("🌐 Saytga o'tish", url=REGISTER_URL)],
        ]
        await query.edit_message_text(otp_msg, parse_mode='HTML', reply_markup=InlineKeyboardMarkup(keyboard))
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
        "3. 6 xonali kod olasiz (10 daqiqa)\n"
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
