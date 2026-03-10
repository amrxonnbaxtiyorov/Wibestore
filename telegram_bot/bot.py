"""
WibeStore Telegram Bot
- OTP orqali saytga ro'yxatdan o'tish
- To'lov paneli (Wallet Top-Up WebApp)
- Admin: to'lovlarni tasdiqlash/rad etish

O'rnatish:
    pip install python-telegram-bot[job-queue]==20.7 python-dotenv aiohttp redis

Ishga tushirish:
    python bot.py
"""

import asyncio
import io
import json
import logging
import os
import time as _time
import urllib.error
import urllib.request
import warnings
from pathlib import Path

try:
    import aiohttp as _aiohttp
    _AIOHTTP_AVAILABLE = True
except ImportError:
    _aiohttp = None  # type: ignore
    _AIOHTTP_AVAILABLE = False

try:
    import redis.asyncio as _aioredis
    _REDIS_AVAILABLE = True
except ImportError:
    _aioredis = None  # type: ignore
    _REDIS_AVAILABLE = False

# PTBUserWarning (per_message + CallbackQueryHandler) — ConversationHandler da kerakli sozlama
warnings.filterwarnings("ignore", message=".*per_message.*")
warnings.filterwarnings("ignore", message=".*CallbackQueryHandler.*")
warnings.filterwarnings("ignore", category=UserWarning, module="telegram")

try:
    from dotenv import load_dotenv
    load_dotenv(Path(__file__).resolve().parent / ".env")
except ImportError:
    pass

from telegram import Update, InlineKeyboardButton, InlineKeyboardMarkup, ReplyKeyboardMarkup, KeyboardButton, WebAppInfo
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

# ===== TO'LOV TIZIMI KONFIGURATSIYASI =====
# To'lov paneli WebApp URL (HTTPS bo'lishi shart, Telegram talab qiladi)
WEB_APP_URL = os.getenv('WEB_APP_URL', '').strip()
# To'lov backend URL (wallet_topup FastAPI servisi)
PAYMENT_BACKEND_URL = os.getenv('PAYMENT_BACKEND_URL', 'http://localhost:8001').rstrip('/')
# BOT_API_SECRET — bot ↔ payment backend sir kaliti (o'rnatilmasa BOT_TOKEN ishlatiladi)
PAYMENT_BOT_SECRET = os.getenv('PAYMENT_BOT_SECRET', '') or BOT_TOKEN
# Admin Telegram ID lari (vergul bilan ajratilgan): to'lovlarni tasdiqlash/rad etish
_admin_ids_raw = os.getenv('ADMIN_TELEGRAM_IDS', '')
ADMIN_IDS: set[int] = {int(x.strip()) for x in _admin_ids_raw.split(',') if x.strip().isdigit()}
# Guruh/kanal ID (o'rnatilsa, individual adminlarga emas shu chatga xabar ketadi)
_admin_chat_raw = os.getenv('ADMIN_CHAT_ID', '').strip()
ADMIN_CHAT_ID: int | None = int(_admin_chat_raw) if _admin_chat_raw.lstrip('-').isdigit() else None
# Redis URL (payment pending xabarlari uchun)
PAYMENT_REDIS_URL = os.getenv('REDIS_URL', 'redis://localhost:6379/3')
PAYMENT_REDIS_CHANNEL = 'wallet_topup:new_pending'
# To'lov tizimi yoqilganmi? WEB_APP_URL to'g'ri sozlangan bo'lsa
PAYMENT_ENABLED = bool(
    WEB_APP_URL
    and WEB_APP_URL.startswith('http')
    and 'your-domain' not in WEB_APP_URL
)

# Conversation states: telefon + yangi menyu oqimlari
WAITING_PHONE, CONFIRMING = range(2)
(
    WAITING_PREMIUM_SCREENSHOT,
    WAITING_TOPUP_SCREENSHOT,
    WAITING_WITHDRAW_AMOUNT,
    WITHDRAW_CONFIRM,
    WAITING_WITHDRAW_CARD,
) = range(2, 7)

# Yangi keyboard tugmalar matni
BTN_MY_ACCOUNT = "Mening saytdagi akkauntim"
BTN_PREMIUM = "Premium olish"
BTN_TOPUP = "Xisobni to'ldirish"
BTN_WITHDRAW = "Xisobdan pul yechish"

# Premium / to'ldirish / chiqarish uchun sozlamalar
ADMIN_CARD_NUMBER = os.getenv("ADMIN_CARD_NUMBER", "").strip()
PREMIUM_PRICE_UZS = os.getenv("PREMIUM_PRICE_UZS", "50000")
PRO_PRICE_UZS = os.getenv("PRO_PRICE_UZS", "30000")

# Countdown update interval (seconds) — har soniyada teskari sanoq
COUNTDOWN_INTERVAL = 1


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


async def get_telegram_profile_photo_url(bot, user_id: int) -> str | None:
    """Foydalanuvchi Telegram profil rasmi uchun to'liq URL olish."""
    try:
        photos = await bot.get_user_profile_photos(user_id, limit=1)
        if not photos or not photos.photos:
            return None
        # photos.photos[0] — birinchi rasmning o'lchamlari ro'yxati (kichikdan kattaga), oxirgisi eng katta
        file_id = photos.photos[0][-1].file_id
        tg_file = await bot.get_file(file_id)
        return f"https://api.telegram.org/file/bot{BOT_TOKEN}/{tg_file.file_path}"
    except Exception as e:
        logger.warning("Telegram profil rasmi olinmadi: %s", e)
        return None


def create_otp_via_api(telegram_id: int, phone: str, full_name: str = "", photo_url: str = "") -> dict:
    """Backend API orqali OTP kod yaratish (urllib — qo'shimcha paket kerak emas)."""
    if not BOT_SECRET_KEY:
        logger.error("BOT_SECRET_KEY yoki TELEGRAM_BOT_SECRET o'rnatilmagan")
        return None
    if "localhost" in WEBSITE_URL or "127.0.0.1" in WEBSITE_URL:
        logger.warning("WEBSITE_URL localhost — Railway'da backend manzilini (https://...) o'rnating!")
    url = f"{WEBSITE_URL.rstrip('/')}/api/v1/auth/telegram/otp/create/"
    payload = {
        "secret_key": BOT_SECRET_KEY,
        "telegram_id": telegram_id,
        "phone_number": phone,
        "full_name": full_name,
    }
    if photo_url:
        payload["photo_url"] = photo_url[:500]
    body = json.dumps(payload).encode("utf-8")
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


def get_telegram_profile_via_api(telegram_id: int) -> dict | None:
    """Backend API orqali foydalanuvchi profili: username, balance, sold_count."""
    if not BOT_SECRET_KEY:
        return None
    url = f"{WEBSITE_URL.rstrip('/')}/api/v1/auth/telegram/profile/"
    payload = {"secret_key": BOT_SECRET_KEY, "telegram_id": telegram_id}
    body = json.dumps(payload).encode("utf-8")
    req = urllib.request.Request(
        url,
        data=body,
        headers={"Content-Type": "application/json"},
        method="POST",
    )
    try:
        with urllib.request.urlopen(req, timeout=10) as resp:
            if resp.status == 200:
                return json.loads(resp.read().decode("utf-8"))
    except Exception as e:
        logger.warning("Profil API xato: %s", e)
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
    """OTP xabar formatlash — teskari sanoq har soniya, foiz orqaga qaytadi."""
    minutes = remaining // 60
    secs = remaining % 60
    time_str = f"{minutes}:{secs:02d}"
    progress = _make_progress_bar(remaining, total)
    percent = round((remaining / total) * 100) if total > 0 else 0

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
        f"⏱ <b>Qolgan vaqt:</b> {time_str} <b>({percent}%)</b>\n"
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


# ===== ASOSIY KLAVIATURA =====


def _get_main_keyboard():
    """Asosiy menyu: 4 ta yangi tugma + telefon + to'lov paneli."""
    keyboard = [
        [KeyboardButton(BTN_MY_ACCOUNT), KeyboardButton(BTN_PREMIUM)],
        [KeyboardButton(BTN_TOPUP), KeyboardButton(BTN_WITHDRAW)],
        [KeyboardButton("📱 Telefon raqamimni yuborish", request_contact=True)],
    ]
    if PAYMENT_ENABLED:
        keyboard.append([KeyboardButton("💰 To'lov paneli", web_app=WebAppInfo(url=WEB_APP_URL))])
    return ReplyKeyboardMarkup(keyboard, resize_keyboard=True)


# ===== HANDLERS =====

async def start(update: Update, context: ContextTypes.DEFAULT_TYPE) -> int:
    """Bot: /start — asosiy menyu (akkaunt, Premium, to'ldirish, chiqarish, telefon, to'lov paneli)"""
    user = update.effective_user
    reply_markup = _get_main_keyboard()

    payment_line = "\n💰 <b>To'lov paneli</b> — hisobni to'ldirish\n" if PAYMENT_ENABLED else ""

    welcome_text = (
        f"👋 Salom, <b>{user.first_name}</b>!\n\n"
        f"🌐 <b>WibeStore</b>\n"
        f"{payment_line}\n"
        f"📱 <b>Saytga ro'yxatdan o'tish:</b>\n"
        f"Bir martalik tasdiqlash kodi olish uchun <b>telefon raqamingizni</b> yuboring.\n\n"
        f"Format: <code>+998901234567</code> yoki quyidagi tugmani bosing.\n\n"
        f"❌ Bekor qilish: /cancel"
    )
    await update.message.reply_html(welcome_text, reply_markup=reply_markup)
    return WAITING_PHONE


async def _handle_menu_button(update: Update, context: ContextTypes.DEFAULT_TYPE, text: str) -> int | None:
    """Agar matn menyu tugmasi bo'lsa, tegishli handlerni chaqirib state qaytaradi; aks holda None."""
    if text == BTN_MY_ACCOUNT:
        return await _cmd_my_account(update, context)
    if text == BTN_PREMIUM:
        return await _cmd_premium(update, context)
    if text == BTN_TOPUP:
        return await _cmd_topup(update, context)
    if text == BTN_WITHDRAW:
        return await _cmd_withdraw_start(update, context)
    return None


async def _cmd_my_account(update: Update, context: ContextTypes.DEFAULT_TYPE) -> int:
    """Mening saytdagi akkauntim: username, balans, sotilgan akkauntlar soni."""
    telegram_id = update.effective_user.id
    result = get_telegram_profile_via_api(telegram_id)
    if not result or not result.get("success"):
        await update.message.reply_html(
            "❌ Ma'lumotlarni olish mumkin emas. Keyinroq urinib ko'ring yoki /start bosing."
        )
        return WAITING_PHONE
    if not result.get("has_account"):
        await update.message.reply_html(
            "📌 <b>Saytda akkauntingiz yo'q.</b>\n\n"
            "Avval saytda ro'yxatdan o'ting: telefon raqamingizni yuboring va tasdiqlash kodini oling, "
            f"keyin <a href='{REGISTER_URL}'>saytda</a> kiriting."
        )
        return WAITING_PHONE
    d = result.get("data", {})
    username = d.get("username", "—")
    balance = d.get("balance", "0")
    sold_count = d.get("sold_count", 0)
    await update.message.reply_html(
        f"👤 <b>Saytdagi akkauntingiz</b>\n\n"
        f"🆔 Username: <b>{username}</b>\n"
        f"💰 Balans: <b>{balance} UZS</b>\n"
        f"📦 Sotilgan akkauntlar: <b>{sold_count}</b> ta"
    )
    return WAITING_PHONE


async def _cmd_premium(update: Update, context: ContextTypes.DEFAULT_TYPE) -> int:
    """Premium olish: tarif tanlash (Premium / Pro / Menu)."""
    keyboard = [
        [
            InlineKeyboardButton("Premium", callback_data="premium_plan:premium"),
            InlineKeyboardButton("Pro", callback_data="premium_plan:pro"),
        ],
        [InlineKeyboardButton("Menu", callback_data="premium_plan:menu")],
    ]
    await update.message.reply_html(
        "⭐ <b>Premium tarifini tanlang</b>\n\n"
        "1️⃣ <b>Premium</b>\n"
        "2️⃣ <b>Pro</b>\n\n"
        "Quyidagi tugmalardan birini bosing:",
        reply_markup=InlineKeyboardMarkup(keyboard),
    )
    return WAITING_PHONE


async def _cb_premium_plan(update: Update, context: ContextTypes.DEFAULT_TYPE) -> int:
    """Premium yoki Pro tanlanganida: narx + karta + screenshot so'rash."""
    query = update.callback_query
    await query.answer()
    data = query.data
    if data == "premium_plan:menu":
        await query.edit_message_text("⬅️ Asosiy menyuga qayttingiz.")
        return WAITING_PHONE
    if data == "premium_plan:pro":
        plan_name, price = "Pro", PRO_PRICE_UZS
    else:
        plan_name, price = "Premium", PREMIUM_PRICE_UZS
    context.user_data["premium_plan"] = plan_name
    card_line = f"\n💳 To'lov kartasi: <code>{ADMIN_CARD_NUMBER}</code>" if ADMIN_CARD_NUMBER else ""
    await query.edit_message_text(
        f"✅ Tarif: <b>{plan_name}</b>\n\n"
        f"💰 Narx: <b>{price} UZS</b>{card_line}\n\n"
        "📸 To'lov qilganingizdan keyin <b>screenshot</b> (skrinshot) yuboring. "
        "Admin tekshirib tasdiqlaydi.",
        parse_mode="HTML",
    )
    return WAITING_PREMIUM_SCREENSHOT


async def _cmd_topup(update: Update, context: ContextTypes.DEFAULT_TYPE) -> int:
    """Xisobni to'ldirish: balans + karta, screenshot so'rash."""
    telegram_id = update.effective_user.id
    result = get_telegram_profile_via_api(telegram_id)
    balance = "0"
    if result and result.get("success") and result.get("has_account"):
        balance = result.get("data", {}).get("balance", "0")
    card_line = f"\n💳 To'lov kartasi: <code>{ADMIN_CARD_NUMBER}</code>" if ADMIN_CARD_NUMBER else ""
    await update.message.reply_html(
        f"💰 <b>Hisobni to'ldirish</b>\n\n"
        f"Joriy balans: <b>{balance} UZS</b>{card_line}\n\n"
        "Kartaga pul o'tkazgach, to'lov <b>screenshot</b>ini (skrinshot) yuboring. Admin tekshiradi."
    )
    return WAITING_TOPUP_SCREENSHOT


async def _cmd_withdraw_start(update: Update, context: ContextTypes.DEFAULT_TYPE) -> int:
    """Xisobdan pul yechish: balans ko'rsatib, summa so'rash."""
    telegram_id = update.effective_user.id
    result = get_telegram_profile_via_api(telegram_id)
    if not result or not result.get("success") or not result.get("has_account"):
        await update.message.reply_html(
            "❌ Saytda akkauntingiz yo'q yoki ma'lumot olinmadi. Avval ro'yxatdan o'ting."
        )
        return WAITING_PHONE
    balance = result.get("data", {}).get("balance", "0")
    await update.message.reply_html(
        f"💸 <b>Hisobdan pul yechish</b>\n\n"
        f"Joriy balans: <b>{balance} UZS</b>\n\n"
        "Qancha summani chiqarmoqchisiz? Raqamni yozing (masalan: 50000)"
    )
    return WAITING_WITHDRAW_AMOUNT


async def receive_phone(update: Update, context: ContextTypes.DEFAULT_TYPE) -> int:
    """Telefon qabul qilish yoki menyu tugmalarini boshqarish."""
    if update.message.contact:
        phone = update.message.contact.phone_number
        if not phone.startswith('+'):
            phone = '+' + phone
    else:
        text = (update.message.text or "").strip()
        # Avval menyu tugmalarini tekshirish
        if text in (BTN_MY_ACCOUNT, BTN_PREMIUM, BTN_TOPUP, BTN_WITHDRAW):
            state = await _handle_menu_button(update, context, text)
            return state if state is not None else WAITING_PHONE
        phone = text
        # Telefon validatsiyasi
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
    photo_url = await get_telegram_profile_photo_url(context.bot, user.id) or ""

    wait_msg = await update.message.reply_html("⏳ Kod tayyorlanmoqda...")

    result = create_otp_via_api(
        telegram_id=telegram_id,
        phone=phone_normalized,
        full_name=full_name,
        photo_url=photo_url,
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
    photo_url = await get_telegram_profile_photo_url(context.bot, user.id) or ""

    result = create_otp_via_api(
        telegram_id=user.id,
        phone=phone,
        full_name=full_name,
        photo_url=photo_url,
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


async def _receive_premium_screenshot(update: Update, context: ContextTypes.DEFAULT_TYPE) -> int:
    """Premium to'lov screenshot qabul qilish va adminga yuborish."""
    if not update.message.photo:
        await update.message.reply_text("📸 Iltimos, to'lov skrinshotini (rasm) yuboring.")
        return WAITING_PREMIUM_SCREENSHOT
    plan = context.user_data.get("premium_plan", "Premium")
    telegram_id = update.effective_user.id
    result = get_telegram_profile_via_api(telegram_id)
    username = result.get("data", {}).get("username", "") if result and result.get("has_account") else str(telegram_id)
    if not username and result and result.get("has_account"):
        username = result.get("data", {}).get("email", str(telegram_id))
    caption = (
        f"⭐ <b>Premium to'lov (skrinshot)</b>\n"
        f"👤 Sayt username: <b>{username}</b>\n"
        f"📋 Tarif: <b>{plan}</b>\n"
        f"🆔 Telegram ID: <code>{telegram_id}</code>"
    )
    file_id = update.message.photo[-1].file_id
    await _send_to_admins_photo(context.bot, caption, file_id)
    context.user_data.pop("premium_plan", None)
    await update.message.reply_html(
        "✅ Skrinshot qabul qilindi. Admin tekshiradi va tasdiqlagach xabar beramiz.",
        reply_markup=_get_main_keyboard(),
    )
    return WAITING_PHONE


async def _receive_topup_screenshot(update: Update, context: ContextTypes.DEFAULT_TYPE) -> int:
    """Hisobni to'ldirish screenshot qabul qilish va adminga yuborish."""
    if not update.message.photo:
        await update.message.reply_text("📸 Iltimos, to'lov skrinshotini (rasm) yuboring.")
        return WAITING_TOPUP_SCREENSHOT
    telegram_id = update.effective_user.id
    result = get_telegram_profile_via_api(telegram_id)
    username = result.get("data", {}).get("username", "") if result and result.get("has_account") else str(telegram_id)
    caption = (
        f"💰 <b>Hisobni to'ldirish (skrinshot)</b>\n"
        f"👤 Sayt username: <b>{username}</b>\n"
        f"🆔 Telegram ID: <code>{telegram_id}</code>"
    )
    file_id = update.message.photo[-1].file_id
    await _send_to_admins_photo(context.bot, caption, file_id)
    await update.message.reply_html(
        "✅ Skrinshot qabul qilindi. Admin tekshiradi va balans yangilanadi.",
        reply_markup=_get_main_keyboard(),
    )
    return WAITING_PHONE


async def _receive_withdraw_amount(update: Update, context: ContextTypes.DEFAULT_TYPE) -> int:
    """Chiqarish summasini qabul qilish va tasdiqlash so'rash."""
    text = (update.message.text or "").strip().replace(" ", "").replace(",", "")
    if not text or not text.isdigit():
        await update.message.reply_text("❌ Summani faqat raqamda yuboring (masalan: 50000)")
        return WAITING_WITHDRAW_AMOUNT
    amount = text
    context.user_data["withdraw_amount"] = amount
    keyboard = [
        [
            InlineKeyboardButton("Ha", callback_data="withdraw_confirm:yes"),
            InlineKeyboardButton("Yo'q", callback_data="withdraw_confirm:no"),
        ],
    ]
    await update.message.reply_html(
        f"❓ <b>{amount} UZS</b> summani hisobdan chiqarishga rozimisiz?",
        reply_markup=InlineKeyboardMarkup(keyboard),
    )
    return WITHDRAW_CONFIRM


async def _cb_withdraw_confirm(update: Update, context: ContextTypes.DEFAULT_TYPE) -> int:
    """Chiqarish tasdiqlash: Ha -> karta so'ra, Yo'q -> menyu."""
    query = update.callback_query
    await query.answer()
    if query.data == "withdraw_confirm:no":
        context.user_data.pop("withdraw_amount", None)
        await query.edit_message_text("⬅️ Bekor qilindi. Asosiy menyuga qayting.")
        return WAITING_PHONE
    await query.edit_message_text("💳 Karta raqamingizni yuboring (faqat raqamlar yoki to'liq formati).")
    return WAITING_WITHDRAW_CARD


async def _receive_withdraw_card(update: Update, context: ContextTypes.DEFAULT_TYPE) -> int:
    """Chiqarish uchun karta raqamini qabul qilish va adminga yuborish."""
    card = (update.message.text or "").strip()
    if not card or len(card) < 4:
        await update.message.reply_text("❌ Karta raqamini to'g'ri kiriting.")
        return WAITING_WITHDRAW_CARD
    amount = context.user_data.pop("withdraw_amount", "?")
    telegram_id = update.effective_user.id
    result = get_telegram_profile_via_api(telegram_id)
    username = result.get("data", {}).get("username", "") if result and result.get("has_account") else str(telegram_id)
    for target in _notification_targets():
        try:
            await context.bot.send_message(
                target,
                f"💸 <b>Hisobdan pul yechish so'rovi</b>\n\n"
                f"👤 Sayt username: <b>{username}</b>\n"
                f"🆔 Telegram ID: <code>{telegram_id}</code>\n"
                f"💰 Summa: <b>{amount} UZS</b>\n"
                f"💳 Karta raqami: <code>{card}</code>",
                parse_mode="HTML",
            )
        except Exception as e:
            logger.warning("Admin %s ga xabar yuborilmadi: %s", target, e)
    await update.message.reply_html(
        "✅ So'rovingiz qabul qilindi. Admin tekshiradi va pul o'tkazilgach xabar beramiz.",
        reply_markup=_get_main_keyboard(),
    )
    return WAITING_PHONE


async def _cancel_to_menu(update: Update, context: ContextTypes.DEFAULT_TYPE) -> int:
    """Joriy oqimni bekor qilib asosiy menyuga qaytish."""
    context.user_data.pop("premium_plan", None)
    context.user_data.pop("withdraw_amount", None)
    await update.message.reply_html("⬅️ Bekor qilindi.", reply_markup=_get_main_keyboard())
    return WAITING_PHONE


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


# ============================================================
# ===== TO'LOV TIZIMI (WALLET TOP-UP) =========================
# ============================================================

def _is_admin(user_id: int) -> bool:
    return user_id in ADMIN_IDS


def _notification_targets() -> list[int]:
    """Admin xabar manzillari: guruh bo'lsa guruh, bo'lmasa individual adminlar."""
    if ADMIN_CHAT_ID:
        return [ADMIN_CHAT_ID]
    return list(ADMIN_IDS)


async def _send_to_admins_photo(bot, caption: str, photo_file_id: str) -> None:
    """Adminlarga rasm + caption yuborish (screenshot va h.k.)."""
    for target in _notification_targets():
        try:
            await bot.send_photo(target, photo=photo_file_id, caption=caption, parse_mode="HTML")
        except Exception as e:
            logger.warning("Admin %s ga rasm yuborilmadi: %s", target, e)


async def _payment_api(method: str, path: str, json_body: dict | None = None) -> tuple[int, dict]:
    """Payment backend ga autentifikatsiyalangan so'rov yuborish."""
    if not _AIOHTTP_AVAILABLE:
        logger.error("aiohttp o'rnatilmagan. pip install aiohttp")
        return 503, {}
    url = f"{PAYMENT_BACKEND_URL}/api/v1/admin{path}"
    headers = {"X-Bot-Secret": PAYMENT_BOT_SECRET}
    try:
        async with _aiohttp.ClientSession() as session:
            async with session.request(
                method, url, json=json_body, headers=headers,
                timeout=_aiohttp.ClientTimeout(total=15),
            ) as resp:
                try:
                    data = await resp.json()
                except Exception:
                    data = {}
                return resp.status, data
    except Exception as e:
        logger.error("Payment API xato: %s %s → %s", method, path, e)
        return 503, {}


async def _fetch_receipt(tx_uid: str) -> tuple[bytes | None, str]:
    """Chek faylini payment backenddan yuklab olish."""
    if not _AIOHTTP_AVAILABLE:
        return None, ""
    url = f"{PAYMENT_BACKEND_URL}/api/v1/admin/receipts/{tx_uid}"
    headers = {"X-Bot-Secret": PAYMENT_BOT_SECRET}
    try:
        async with _aiohttp.ClientSession() as session:
            async with session.get(url, headers=headers, timeout=_aiohttp.ClientTimeout(total=15)) as resp:
                if resp.status != 200:
                    return None, ""
                ct = resp.headers.get("Content-Type", "")
                data = await resp.read()
                return data, ct
    except Exception as e:
        logger.warning("Chek %s yuklab bo'lmadi: %s", tx_uid, e)
        return None, ""


def _confirm_reject_keyboard(tx_uid: str) -> InlineKeyboardMarkup:
    return InlineKeyboardMarkup([[
        InlineKeyboardButton("✅ Tasdiqlash", callback_data=f"approve:{tx_uid}"),
        InlineKeyboardButton("❌ Rad etish", callback_data=f"reject:{tx_uid}"),
    ]])


async def _notify_admins_new_tx(bot, tx_uid: str, tx_data: dict) -> None:
    """Yangi kutilayotgan tranzaksiya haqida adminlarga xabar yuborish."""
    r = tx_data.get("data", {})
    telegram_id = r.get("telegram_id")
    username = r.get("username")
    first_name = r.get("first_name")
    amount = r.get("amount", 0)
    currency = r.get("currency", "")
    payment_method = r.get("payment_method", "")

    if username:
        user_display = f"@{username} ({telegram_id})"
    elif first_name:
        user_display = f"{first_name} ({telegram_id})"
    else:
        user_display = str(telegram_id)

    text = (
        f"🆕 <b>Yangi to'lov so'rovi</b>\n"
        f"━━━━━━━━━━━━━━━━━━━━\n\n"
        f"🆔 ID: <code>{tx_uid}</code>\n"
        f"👤 Foydalanuvchi: {user_display}\n"
        f"💰 Miqdor: <b>{amount:,.2f} {currency}</b>\n"
        f"💳 Usul: {payment_method}\n"
        f"⏰ Holat: <b>KUTILMOQDA</b>\n"
    )
    keyboard = _confirm_reject_keyboard(tx_uid)
    receipt_bytes, content_type = await _fetch_receipt(tx_uid)
    is_pdf = "pdf" in (content_type or "").lower()

    for target in _notification_targets():
        try:
            if receipt_bytes:
                if is_pdf:
                    await bot.send_document(
                        target,
                        document=io.BytesIO(receipt_bytes),
                        filename=f"chek_{tx_uid[:8]}.pdf",
                        caption=text, reply_markup=keyboard, parse_mode="HTML",
                    )
                else:
                    await bot.send_photo(
                        target,
                        photo=io.BytesIO(receipt_bytes),
                        caption=text, reply_markup=keyboard, parse_mode="HTML",
                    )
            else:
                await bot.send_message(
                    target,
                    text + "\n📎 <i>Chek topilmadi</i>",
                    reply_markup=keyboard, parse_mode="HTML",
                )
        except Exception as e:
            logger.warning("%s ga xabar yuborib bo'lmadi: %s", target, e)


async def _payment_listener_loop(bot) -> None:
    """Redis pub/sub: yangi kutilayotgan tranzaksiyalarni kuzatish."""
    if not _REDIS_AVAILABLE:
        logger.warning("redis kutubxonasi o'rnatilmagan — payment listener ishlamaydi.")
        return
    while True:
        r = None
        pubsub = None
        try:
            r = _aioredis.from_url(PAYMENT_REDIS_URL, decode_responses=True)
            pubsub = r.pubsub()
            await pubsub.subscribe(PAYMENT_REDIS_CHANNEL)
            logger.info("Redis kanalga ulandi: %s", PAYMENT_REDIS_CHANNEL)
            while True:
                message = await pubsub.get_message(ignore_subscribe_messages=True, timeout=30.0)
                if message and message.get("type") == "message":
                    try:
                        payload = json.loads(message["data"])
                        tx_uid = payload.get("transaction_uid")
                        if not tx_uid:
                            continue
                        # Tranzaksiya ma'lumotlarini backenddan olish
                        _, tx_data = await _payment_api("GET", f"/transactions/{tx_uid}")
                        if tx_data.get("success") and tx_data.get("data"):
                            await _notify_admins_new_tx(bot, tx_uid, tx_data)
                    except (json.JSONDecodeError, KeyError) as e:
                        logger.warning("Redis xabar xatosi: %s", e)
        except asyncio.CancelledError:
            logger.info("Payment listener to'xtatildi.")
            break
        except Exception as e:
            logger.error("Redis ulanish xatosi: %s — 5s kutilmoqda", e)
            await asyncio.sleep(5)
        finally:
            try:
                if pubsub:
                    await pubsub.unsubscribe(PAYMENT_REDIS_CHANNEL)
                if r:
                    await r.aclose()
            except Exception:
                pass


async def _post_init(application) -> None:
    """Fon vazifalarini ishga tushirish: payment Redis listener."""
    if PAYMENT_ENABLED and _REDIS_AVAILABLE:
        application.bot_data["payment_listener"] = asyncio.create_task(
            _payment_listener_loop(application.bot)
        )
        logger.info("Payment listener ishga tushdi.")
    elif PAYMENT_ENABLED and not _REDIS_AVAILABLE:
        logger.warning("PAYMENT_ENABLED lekin redis o'rnatilmagan — listener ishlamaydi.")


async def _post_stop(application) -> None:
    """Fon vazifalarini to'xtatish."""
    task = application.bot_data.get("payment_listener")
    if task:
        task.cancel()
        try:
            await task
        except asyncio.CancelledError:
            pass


# ---- PAYMENT HANDLERS ----

async def cb_approve(update: Update, context: ContextTypes.DEFAULT_TYPE) -> None:
    """Admin: to'lovni tasdiqlash."""
    query = update.callback_query
    if not _is_admin(query.from_user.id):
        await query.answer("⛔ Ruxsat yo'q.", show_alert=True)
        return

    tx_uid = query.data.replace("approve:", "", 1)
    status, data = await _payment_api("POST", "/approve", {
        "transaction_uid": tx_uid,
        "admin_telegram_id": query.from_user.id,
    })

    if status != 200:
        detail = data.get("detail", {})
        msg = detail.get("message", "Xatolik") if isinstance(detail, dict) else str(detail)
        await query.answer(f"❌ {msg}", show_alert=True)
        return

    payload = data.get("data", {})
    await query.answer("✅ Tasdiqlandi!")

    admin_tag = f"@{query.from_user.username}" if query.from_user.username else str(query.from_user.id)
    suffix = (
        f"\n\n━━━━━━━━━━━━━━━━━━━━\n"
        f"✅ <b>TASDIQLANDI</b> ({admin_tag})\n"
        f"Yangi balans: {payload.get('new_balance', '?')} {payload.get('currency', '')}"
    )
    orig = query.message.caption or query.message.text or ""
    new_text = orig + suffix
    try:
        if query.message.caption is not None:
            await query.message.edit_caption(caption=new_text, parse_mode="HTML")
        else:
            await query.message.edit_text(text=new_text, parse_mode="HTML")
    except Exception:
        try:
            await query.message.edit_reply_markup(reply_markup=None)
        except Exception:
            pass

    user_id = payload.get("telegram_id")
    if user_id:
        try:
            await context.bot.send_message(
                user_id,
                f"✅ <b>To'lov tasdiqlandi!</b>\n\n"
                f"Hisobingiz to'ldirildi:\n"
                f"💰 +<b>{payload.get('amount', '?')} {payload.get('currency', '')}</b>\n\n"
                f"Tranzaksiya ID: <code>{tx_uid}</code>\n"
                f"Yangi balans: <b>{payload.get('new_balance', '?')} {payload.get('currency', '')}</b>\n\n"
                f"Rahmat! 🎉",
                parse_mode="HTML",
            )
        except Exception as e:
            logger.warning("Foydalanuvchi %s ga xabar yuborib bo'lmadi: %s", user_id, e)


async def cb_reject(update: Update, context: ContextTypes.DEFAULT_TYPE) -> None:
    """Admin: to'lovni rad etish."""
    query = update.callback_query
    if not _is_admin(query.from_user.id):
        await query.answer("⛔ Ruxsat yo'q.", show_alert=True)
        return

    tx_uid = query.data.replace("reject:", "", 1)
    status, data = await _payment_api("POST", "/reject", {
        "transaction_uid": tx_uid,
        "admin_telegram_id": query.from_user.id,
    })

    if status != 200:
        detail = data.get("detail", {})
        msg = detail.get("message", "Xatolik") if isinstance(detail, dict) else str(detail)
        await query.answer(f"❌ {msg}", show_alert=True)
        return

    payload = data.get("data", {})
    await query.answer("❌ Rad etildi.")

    admin_tag = f"@{query.from_user.username}" if query.from_user.username else str(query.from_user.id)
    suffix = (
        f"\n\n━━━━━━━━━━━━━━━━━━━━\n"
        f"❌ <b>RAD ETILDI</b> ({admin_tag})"
    )
    orig = query.message.caption or query.message.text or ""
    new_text = orig + suffix
    try:
        if query.message.caption is not None:
            await query.message.edit_caption(caption=new_text, parse_mode="HTML")
        else:
            await query.message.edit_text(text=new_text, parse_mode="HTML")
    except Exception:
        try:
            await query.message.edit_reply_markup(reply_markup=None)
        except Exception:
            pass

    user_id = payload.get("telegram_id")
    if user_id:
        try:
            await context.bot.send_message(
                user_id,
                f"❌ <b>To'lov rad etildi</b>\n\n"
                f"Tranzaksiya ID: <code>{tx_uid}</code>\n"
                f"Miqdor: <b>{payload.get('amount', '?')} {payload.get('currency', '')}</b>\n\n"
                f"Xato deb hisoblasangiz, admin bilan bog'laning.",
                parse_mode="HTML",
            )
        except Exception as e:
            logger.warning("Foydalanuvchi %s ga xabar yuborib bo'lmadi: %s", user_id, e)


async def cmd_admin_panel(update: Update, context: ContextTypes.DEFAULT_TYPE) -> None:
    """Admin: umumiy panel (/admin)."""
    if not _is_admin(update.effective_user.id):
        return
    _, data = await _payment_api("GET", "/transactions?status=PENDING&limit=100")
    count = len(data.get("data", [])) if data.get("success") else "?"
    await update.message.reply_html(
        "🛠 <b>Admin Panel</b>\n"
        "━━━━━━━━━━━━━━━━━━━━\n\n"
        f"📋 Kutilayotgan to'lovlar: <b>{count}</b>\n\n"
        "<b>Buyruqlar:</b>\n"
        "/pending — kutilayotgan to'lovlar ro'yxati\n"
        "/stats — statistika\n"
        "/balance &lt;telegram_id&gt; — foydalanuvchi balansi",
    )


async def cmd_pending(update: Update, context: ContextTypes.DEFAULT_TYPE) -> None:
    """Admin: kutilayotgan to'lovlar ro'yxati (/pending)."""
    if not _is_admin(update.effective_user.id):
        return
    _, data = await _payment_api("GET", "/transactions?status=PENDING&limit=20")
    txs = data.get("data", []) if data.get("success") else []
    if not txs:
        await update.message.reply_text("✅ Kutilayotgan to'lovlar yo'q.")
        return
    lines = [f"📋 <b>Kutilayotgan ({len(txs)})</b>\n"]
    for tx in txs:
        uid = tx.get("transaction_uid", "?")
        amount = tx.get("amount", 0)
        currency = tx.get("currency", "")
        method = tx.get("payment_method", "")
        uname = tx.get("username")
        disp = f"@{uname}" if uname else str(tx.get("telegram_id", "?"))
        lines.append(
            f"• <code>{uid[:12]}…</code>\n"
            f"  👤 {disp} | 💰 {amount:,.2f} {currency} | 💳 {method}"
        )
    await update.message.reply_html("\n".join(lines))


async def cmd_stats(update: Update, context: ContextTypes.DEFAULT_TYPE) -> None:
    """Admin: tranzaksiyalar statistikasi (/stats)."""
    if not _is_admin(update.effective_user.id):
        return
    _, pd = await _payment_api("GET", "/transactions?status=PENDING&limit=1000")
    _, ad = await _payment_api("GET", "/transactions?status=APPROVED&limit=1000")
    _, rd = await _payment_api("GET", "/transactions?status=REJECTED&limit=1000")
    p = pd.get("data", []) if pd.get("success") else []
    a = ad.get("data", []) if ad.get("success") else []
    r = rd.get("data", []) if rd.get("success") else []
    uzs = sum(float(tx.get("amount", 0)) for tx in a if tx.get("currency") == "UZS")
    usdt = sum(float(tx.get("amount", 0)) for tx in a if tx.get("currency") == "USDT")
    await update.message.reply_html(
        "📊 <b>Statistika</b>\n"
        "━━━━━━━━━━━━━━━━━━━━\n\n"
        f"⏳ Kutilmoqda:  <b>{len(p)}</b>\n"
        f"✅ Tasdiqlandi: <b>{len(a)}</b>\n"
        f"❌ Rad etildi:  <b>{len(r)}</b>\n\n"
        f"💰 Tasdiqlangan jami:\n"
        f"  UZS:  <b>{uzs:,.0f}</b>\n"
        f"  USDT: <b>{usdt:,.2f}</b>",
    )


async def cmd_balance(update: Update, context: ContextTypes.DEFAULT_TYPE) -> None:
    """/balance — admin: boshqa foydalanuvchi balansi; user: o'z balansini ko'rish."""
    user_id = update.effective_user.id

    if _is_admin(user_id):
        # Admin: /balance <telegram_id>
        parts = (update.message.text or "").strip().split(maxsplit=1)
        if len(parts) < 2 or not parts[1].strip().isdigit():
            await update.message.reply_html(
                "Ishlatish: /balance &lt;telegram_id&gt;\n"
                "Misol: /balance 123456789"
            )
            return
        tid = int(parts[1].strip())
        status, data = await _payment_api("GET", f"/user-balance/{tid}")
        if status != 200 or not data.get("success"):
            detail = data.get("detail", {})
            msg = detail.get("message", "Foydalanuvchi topilmadi.") if isinstance(detail, dict) else str(detail)
            await update.message.reply_text(f"⚠️ {msg}")
            return
        u = data.get("data", {})
        uname = u.get("username")
        fname = u.get("first_name")
        bal = u.get("wallet_balance", "0.00")
        disp = f"@{uname}" if uname else (fname or str(tid))
        await update.message.reply_html(
            f"👤 <b>{disp}</b> (<code>{tid}</code>)\n"
            f"💰 Balans: <b>{bal}</b>"
        )
    else:
        # Oddiy foydalanuvchi: to'lov paneliga yo'naltirish
        if PAYMENT_ENABLED:
            kb = [[KeyboardButton("💰 To'lov paneli", web_app=WebAppInfo(url=WEB_APP_URL))]]
            await update.message.reply_html(
                "💼 <b>Hisobingiz</b>\n\n"
                "Joriy balans va to'ldirish uchun to'lov panelini oching:",
                reply_markup=ReplyKeyboardMarkup(kb, resize_keyboard=True),
            )
        else:
            await update.message.reply_text("To'lov tizimi hali sozlanmagan.")


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
    # Railway'da WEBSITE_URL = backend manzili (https://...). Localhost local dev uchun ruxsat.
    if "localhost" in WEBSITE_URL or "127.0.0.1" in WEBSITE_URL:
        logger.warning(
            "WEBSITE_URL localhost/127.0.0.1 — lokal ishlab chiqish rejimi. "
            "Railway deploy uchun WEBSITE_URL = Backend URL (masalan https://your-app.up.railway.app) qo'ying."
        )

    app = (
        Application.builder()
        .token(BOT_TOKEN)
        .post_init(_post_init)
        .post_stop(_post_stop)
        .build()
    )

    # ---- OTP + menyu (akkaunt, Premium, to'ldirish, chiqarish) ----
    conv_handler = ConversationHandler(
        entry_points=[CommandHandler('start', start)],
        states={
            WAITING_PHONE: [
                MessageHandler(filters.CONTACT, receive_phone),
                MessageHandler(filters.TEXT & ~filters.COMMAND, receive_phone),
                CallbackQueryHandler(_cb_premium_plan, pattern="^premium_plan:"),
            ],
            CONFIRMING: [
                CallbackQueryHandler(new_code_callback, pattern='^new_code$'),
            ],
            WAITING_PREMIUM_SCREENSHOT: [
                MessageHandler(filters.PHOTO, _receive_premium_screenshot),
                CommandHandler('cancel', _cancel_to_menu),
            ],
            WAITING_TOPUP_SCREENSHOT: [
                MessageHandler(filters.PHOTO, _receive_topup_screenshot),
                CommandHandler('cancel', _cancel_to_menu),
            ],
            WAITING_WITHDRAW_AMOUNT: [
                MessageHandler(filters.TEXT & ~filters.COMMAND, _receive_withdraw_amount),
                CommandHandler('cancel', _cancel_to_menu),
            ],
            WITHDRAW_CONFIRM: [
                CallbackQueryHandler(_cb_withdraw_confirm, pattern="^withdraw_confirm:"),
            ],
            WAITING_WITHDRAW_CARD: [
                MessageHandler(filters.TEXT & ~filters.COMMAND, _receive_withdraw_card),
                CommandHandler('cancel', _cancel_to_menu),
            ],
        },
        fallbacks=[CommandHandler('cancel', cancel)],
        per_message=False,
    )
    app.add_handler(conv_handler)

    # ---- To'lov tizimi handlerlari ----
    # Approve/Reject callback — barcha foydalanuvchilar uchun (admin tekshiruvi ichida)
    app.add_handler(CallbackQueryHandler(cb_approve, pattern=r'^approve:'))
    app.add_handler(CallbackQueryHandler(cb_reject, pattern=r'^reject:'))

    # Admin buyruqlari (faqat adminlar uchun, lekin global — conversation tashqarida)
    app.add_handler(CommandHandler('admin', cmd_admin_panel))
    app.add_handler(CommandHandler('pending', cmd_pending))
    app.add_handler(CommandHandler('stats', cmd_stats))
    app.add_handler(CommandHandler('balance', cmd_balance))

    # ---- Umumiy buyruqlar ----
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
