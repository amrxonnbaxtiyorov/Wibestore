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
from typing import Set

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

from telegram import Update, InlineKeyboardButton, InlineKeyboardMarkup, ReplyKeyboardMarkup, ReplyKeyboardRemove, KeyboardButton, WebAppInfo
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
    WAITING_PREMIUM_PAY_METHOD,
) = range(2, 8)

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

# Admin topup summa kutish holati (ConversationHandler uchun alohida)
ADMIN_TOPUP_AMOUNT = 10

# Foydalanuvchilar ID larini saqlash fayli (broadcast uchun)
USERS_FILE = Path(__file__).resolve().parent / "users.json"

# Sayt URL — foydalanuvchilarga yuboriladi
SITE_URL = os.getenv('SITE_URL', os.getenv('REGISTER_URL', 'http://localhost:5173')).rstrip('/')


# ===== USER TRACKING =====

def _load_users() -> Set[int]:
    """Saqlangan foydalanuvchi IDlarini yuklash."""
    try:
        if USERS_FILE.exists():
            data = json.loads(USERS_FILE.read_text(encoding="utf-8"))
            return set(int(x) for x in data if str(x).isdigit())
    except Exception as e:
        logger.warning("users.json o'qib bo'lmadi: %s", e)
    return set()


def _save_user(telegram_id: int) -> None:
    """Yangi foydalanuvchi IDni faylga qo'shish."""
    try:
        users = _load_users()
        if telegram_id not in users:
            users.add(telegram_id)
            USERS_FILE.write_text(json.dumps(list(users)), encoding="utf-8")
    except Exception as e:
        logger.warning("Foydalanuvchi ID saqlanmadi: %s", e)


# ===== HELPER FUNCTIONS =====

def _normalize_phone(phone: str) -> str:
    """Telefonni +998XXXXXXXXX ko'rinishiga keltirish (O'zbekiston raqamlari)."""
    cleaned = "".join(c for c in phone if c.isdigit())
    if not cleaned:
        return phone.strip()
    # 998XXXXXXXXX (12 ta raqam) — to'liq O'zbekiston raqami
    if cleaned.startswith("998") and len(cleaned) == 12:
        return "+" + cleaned
    # 9XXXXXXXX (9 ta raqam) — qisqartirilgan O'zbekiston raqami
    if len(cleaned) == 9 and cleaned[0] == "9":
        return "+998" + cleaned
    # Boshqa holatda — noto'g'ri format
    if not phone.strip().startswith("+"):
        return "+" + cleaned
    return phone.strip()


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


async def create_otp_via_api(telegram_id: int, phone: str, full_name: str = "", photo_url: str = "") -> dict:
    """Backend API orqali OTP kod yaratish (aiohttp — asinxron, event loop bloklanmaydi)."""
    if not BOT_SECRET_KEY:
        logger.error("BOT_SECRET_KEY yoki TELEGRAM_BOT_SECRET o'rnatilmagan")
        return {}
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
    if _AIOHTTP_AVAILABLE:
        try:
            async with _aiohttp.ClientSession() as session:
                async with session.post(
                    url, json=payload,
                    timeout=_aiohttp.ClientTimeout(total=15),
                ) as resp:
                    if resp.status == 200:
                        return await resp.json()
                    raw = await resp.text()
                    logger.error("API javob: %s - %s", resp.status, raw[:500])
                    if resp.status == 403:
                        logger.error("403: BOT_SECRET_KEY backend dagi TELEGRAM_BOT_SECRET bilan bir xil bo'lishi kerak.")
                    return {}
        except Exception as e:
            logger.error(
                "Backend ga ulanish xatosi: %s | WEBSITE_URL=%s | Backend ishlayotganini va URL to'g'riligini tekshiring",
                e, WEBSITE_URL
            )
            return {}
    else:
        # Fallback: sinxron urllib (aiohttp o'rnatilmagan bo'lsa)
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
                return {}
        except urllib.error.HTTPError as e:
            raw = e.read().decode() if e.fp else ""
            logger.error("Backend HTTP %s: %s", e.code, raw[:500])
            if e.code == 403:
                logger.error("403: BOT_SECRET_KEY backend dagi TELEGRAM_BOT_SECRET bilan bir xil bo'lishi kerak.")
            return {}
        except (urllib.error.URLError, OSError) as e:
            logger.error(
                "Backend ga ulanish xatosi: %s | WEBSITE_URL=%s",
                e, WEBSITE_URL
            )
            return {}


async def get_telegram_profile_via_api(telegram_id: int) -> dict:
    """Backend API orqali foydalanuvchi profili: username, balance, sold_count."""
    if not BOT_SECRET_KEY:
        return {}
    url = f"{WEBSITE_URL.rstrip('/')}/api/v1/auth/telegram/profile/"
    payload = {"secret_key": BOT_SECRET_KEY, "telegram_id": telegram_id}
    if _AIOHTTP_AVAILABLE:
        try:
            async with _aiohttp.ClientSession() as session:
                async with session.post(
                    url, json=payload,
                    timeout=_aiohttp.ClientTimeout(total=10),
                ) as resp:
                    if resp.status == 200:
                        return await resp.json()
        except Exception as e:
            logger.warning("Profil API xato: %s", e)
        return {}
    else:
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
        return {}


async def _add_user_balance_api(telegram_id: int, amount: int) -> tuple[int, dict]:
    """Backend API orqali foydalanuvchi balansiga summa qo'shish."""
    if not BOT_SECRET_KEY:
        return 500, {"error": "BOT_SECRET_KEY yo'q"}
    url = f"{WEBSITE_URL}/api/v1/auth/telegram/balance/add/"
    payload = {"secret_key": BOT_SECRET_KEY, "telegram_id": telegram_id, "amount": amount}
    if _AIOHTTP_AVAILABLE:
        try:
            async with _aiohttp.ClientSession() as session:
                async with session.post(
                    url, json=payload, timeout=_aiohttp.ClientTimeout(total=15)
                ) as resp:
                    try:
                        data = await resp.json()
                    except Exception:
                        data = {}
                    return resp.status, data
        except Exception as e:
            logger.error("Balance add API xato: %s", e)
            return 503, {}
    return 503, {"error": "aiohttp yo'q"}


async def _sync_all_admin_msgs(
    bot,
    bot_data: dict,
    key: str,
    new_caption: str,
    acting_chat_id: int,
    acting_message_id: int,
) -> None:
    """Bir admin harakat qilganda — BARCHA adminlarga yuborilgan xabarlarni yangilash.

    Tugmalarni olib tashlaydi va status matni qo'shadi.
    acting_chat_id/acting_message_id — bu xabar allaqachon yangilangan, qolganlarini yangilaymiz.
    """
    msgs: list[tuple[int, int]] = bot_data.pop(key, [])
    for chat_id, msg_id in msgs:
        if chat_id == acting_chat_id and msg_id == acting_message_id:
            continue  # bu xabar allaqachon yangilangan
        try:
            # Telegram foto xabarlarda caption ni o'zgartirish mumkin emas to'g'ridan-to'g'ri,
            # shuning uchun faqat reply_markup ni olib tashlaymiz va alohida xabar yuboramiz
            await bot.edit_message_reply_markup(chat_id=chat_id, message_id=msg_id, reply_markup=None)
            await bot.send_message(
                chat_id,
                new_caption,
                parse_mode="HTML",
                reply_to_message_id=msg_id,
            )
        except Exception as e:
            logger.warning("Admin xabarini yangilashda xato (chat=%s, msg=%s): %s", chat_id, msg_id, e)


async def _get_plans_api() -> dict:
    """Backend API dan tarif narxlarini olish. {'premium': {'name': 'Premium', 'price': '50000'}, ...}"""
    if not BOT_SECRET_KEY or not _AIOHTTP_AVAILABLE:
        return {}
    url = f"{WEBSITE_URL}/api/v1/auth/telegram/plans/"
    payload = {"secret_key": BOT_SECRET_KEY}
    try:
        async with _aiohttp.ClientSession() as session:
            async with session.post(url, json=payload, timeout=_aiohttp.ClientTimeout(total=10)) as resp:
                if resp.status == 200:
                    data = await resp.json()
                    return data.get("plans", {})
    except Exception as e:
        logger.warning("Plans API xato: %s", e)
    return {}


async def _activate_premium_api(telegram_id: int, plan: str, use_balance: bool = False) -> tuple[int, dict]:
    """Backend API orqali foydalanuvchiga Premium/Pro tarif berish.

    use_balance=True: balansdan ushlab, premium beradi.
    use_balance=False: faqat premium beradi (admin tasdiqlagandan keyin).
    """
    if not BOT_SECRET_KEY:
        return 500, {"error": "BOT_SECRET_KEY yo'q"}
    url = f"{WEBSITE_URL}/api/v1/auth/telegram/premium/purchase/"
    payload = {
        "secret_key": BOT_SECRET_KEY,
        "telegram_id": telegram_id,
        "plan": plan.lower(),
        "use_balance": use_balance,
    }
    if _AIOHTTP_AVAILABLE:
        try:
            async with _aiohttp.ClientSession() as session:
                async with session.post(
                    url, json=payload, timeout=_aiohttp.ClientTimeout(total=15)
                ) as resp:
                    try:
                        data = await resp.json()
                    except Exception:
                        data = {}
                    return resp.status, data
        except Exception as e:
            logger.error("Premium activate API xato: %s", e)
            return 503, {}
    return 503, {"error": "aiohttp yo'q"}


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
    """Countdown job'ni rejalashtirish (bitta run_repeating — xotira tejash)."""
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

    # Bitta takrorlanuvchi job — har COUNTDOWN_INTERVAL sekundda
    context.job_queue.run_repeating(
        _countdown_updater,
        interval=COUNTDOWN_INTERVAL,
        first=COUNTDOWN_INTERVAL,
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
    _save_user(user.id)
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
    result = await get_telegram_profile_via_api(telegram_id)
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
    """Premium olish: tarif tanlash (narxlarni DB dan olib ko'rsatish)."""
    plans = await _get_plans_api()
    premium_price = plans.get("premium", {}).get("price", PREMIUM_PRICE_UZS)
    pro_price = plans.get("pro", {}).get("price", PRO_PRICE_UZS)
    # Narxlarni context ga saqlaymiz — keyinchalik qayta so'rovga hojat qolmasin
    context.user_data["plan_prices"] = {"Premium": premium_price, "Pro": pro_price}
    keyboard = [
        [
            InlineKeyboardButton("Premium", callback_data="premium_plan:premium"),
            InlineKeyboardButton("Pro", callback_data="premium_plan:pro"),
        ],
        [InlineKeyboardButton("Menu", callback_data="premium_plan:menu")],
    ]
    await update.message.reply_html(
        f"⭐ <b>Premium tarifini tanlang</b>\n\n"
        f"1️⃣ <b>Premium</b> — {premium_price} UZS / oy\n"
        f"2️⃣ <b>Pro</b> — {pro_price} UZS / oy\n\n"
        "Quyidagi tugmalardan birini bosing:",
        reply_markup=InlineKeyboardMarkup(keyboard),
    )
    return WAITING_PHONE


async def _cb_premium_plan(update: Update, context: ContextTypes.DEFAULT_TYPE) -> int:
    """Premium yoki Pro tanlanganida: to'lov usulini tanlash."""
    query = update.callback_query
    await query.answer()
    data = query.data
    if data == "premium_plan:menu":
        await query.edit_message_text("⬅️ Asosiy menyuga qayttingiz.")
        await context.bot.send_message(
            query.message.chat_id,
            "Quyidagi tugmalardan birini tanlang:",
            reply_markup=_get_main_keyboard(),
        )
        return WAITING_PHONE
    if data == "premium_plan:pro":
        plan_name = "Pro"
        plan_slug = "pro"
    else:
        plan_name = "Premium"
        plan_slug = "premium"

    # Saqlangan narxlardan foydalanish (yoki API dan yangi olish)
    cached_prices = context.user_data.get("plan_prices", {})
    price = cached_prices.get(plan_name)
    if not price:
        plans = await _get_plans_api()
        price = plans.get(plan_slug, {}).get("price", PREMIUM_PRICE_UZS if plan_slug == "premium" else PRO_PRICE_UZS)

    context.user_data["premium_plan"] = plan_name
    context.user_data["premium_price"] = price
    keyboard = InlineKeyboardMarkup([
        [
            InlineKeyboardButton("💳 Sayt hisobim orqali", callback_data=f"premium_pay:balance:{plan_name}"),
            InlineKeyboardButton("🏦 Kartaga to'lov", callback_data=f"premium_pay:card:{plan_name}"),
        ],
        [InlineKeyboardButton("⬅️ Orqaga", callback_data="premium_pay:back")],
    ])
    await query.edit_message_text(
        f"⭐ <b>{plan_name}</b> tarifi — <b>{price} UZS</b> / oy\n\n"
        "To'lov usulini tanlang:",
        parse_mode="HTML",
        reply_markup=keyboard,
    )
    return WAITING_PREMIUM_PAY_METHOD


async def _cb_premium_payment_method(update: Update, context: ContextTypes.DEFAULT_TYPE) -> int:
    """To'lov usuli tanlanganda: balans yoki karta orqali to'lash."""
    query = update.callback_query
    await query.answer()
    data = query.data  # "premium_pay:balance:Premium" | "premium_pay:card:Pro" | "premium_pay:back"

    if data == "premium_pay:back":
        # Orqaga — tarif tanlash ekraniga qaytish
        keyboard = InlineKeyboardMarkup([
            [
                InlineKeyboardButton("Premium", callback_data="premium_plan:premium"),
                InlineKeyboardButton("Pro", callback_data="premium_plan:pro"),
            ],
            [InlineKeyboardButton("Menu", callback_data="premium_plan:menu")],
        ])
        await query.edit_message_text(
            "⭐ <b>Premium tarifini tanlang</b>\n\n"
            "1️⃣ <b>Premium</b>\n"
            "2️⃣ <b>Pro</b>\n\n"
            "Quyidagi tugmalardan birini bosing:",
            parse_mode="HTML",
            reply_markup=keyboard,
        )
        return WAITING_PHONE

    parts = data.split(":", 2)
    if len(parts) < 3:
        await query.edit_message_text("❌ Noma'lum xato. Qayta urinib ko'ring.")
        return WAITING_PHONE

    _, pay_method, plan_name = parts
    price = context.user_data.get("premium_price", PREMIUM_PRICE_UZS if plan_name == "Premium" else PRO_PRICE_UZS)
    telegram_id = query.from_user.id
    plan_slug = plan_name.lower()

    # Allaqachon aktiv tarif borligini tekshirish (har qanday to'lov usuli uchun)
    profile = await get_telegram_profile_via_api(telegram_id)
    if profile and profile.get("has_account"):
        cur_plan = profile.get("data", {}).get("plan", "free")
        if cur_plan == plan_slug:
            end_date = profile.get("data", {}).get("sub_end_date", "")
            days_left = profile.get("data", {}).get("sub_days_left", 0)
            await query.edit_message_text(
                f"ℹ️ <b>Sizda allaqachon {plan_name} tarifi bor!</b>\n\n"
                f"📅 Muddati: <b>{end_date}</b>\n"
                f"⏳ Qoldi: <b>{days_left} kun</b>\n\n"
                f"Muddati tugagach yangilay olasiz.",
                parse_mode="HTML",
            )
            await context.bot.send_message(
                query.message.chat_id,
                "Quyidagi tugmalardan birini tanlang:",
                reply_markup=_get_main_keyboard(),
            )
            context.user_data.pop("premium_plan", None)
            context.user_data.pop("premium_price", None)
            return WAITING_PHONE

    if pay_method == "balance":
        # Sayt hisobidan to'lash: balans tekshirish + premium berish
        await query.edit_message_text(
            f"⏳ <b>{plan_name}</b> tarifi uchun hisobingiz tekshirilmoqda...",
            parse_mode="HTML",
        )
        status_code, result = await _activate_premium_api(telegram_id, plan_name, use_balance=True)
        if status_code == 200 and result.get("success"):
            new_balance = result.get("new_balance", "—")
            await query.edit_message_text(
                f"✅ <b>{plan_name}</b> tarifi faollashtirildi!\n\n"
                f"💰 Qolgan balans: <b>{new_balance} UZS</b>\n\n"
                f"Saytga kiring va imkoniyatlardan foydalaning: {SITE_URL}",
                parse_mode="HTML",
            )
            await context.bot.send_message(
                query.message.chat_id,
                "Quyidagi tugmalardan birini tanlang:",
                reply_markup=_get_main_keyboard(),
            )
        elif status_code == 409 or result.get("error") == "already_subscribed":
            days_left = result.get("days_left", "?")
            end_date = result.get("end_date", "")
            await query.edit_message_text(
                f"ℹ️ <b>Sizda allaqachon {plan_name} tarifi bor!</b>\n\n"
                f"📅 Muddati: <b>{end_date}</b>\n"
                f"⏳ Qoldi: <b>{days_left} kun</b>\n\n"
                f"Muddati tugagach yangilay olasiz.",
                parse_mode="HTML",
            )
            await context.bot.send_message(
                query.message.chat_id,
                "Quyidagi tugmalardan birini tanlang:",
                reply_markup=_get_main_keyboard(),
            )
        elif status_code == 402 or result.get("error") == "insufficient_balance":
            balance = result.get("balance", "0")
            required = result.get("required", price)
            await query.edit_message_text(
                f"❌ <b>Hisobingizda yetarli mablag' yo'q!</b>\n\n"
                f"💰 Joriy balans: <b>{balance} UZS</b>\n"
                f"💳 Kerakli summa: <b>{required} UZS</b>\n\n"
                f"Hisobingizni to'ldiring va qayta urining.",
                parse_mode="HTML",
            )
            await context.bot.send_message(
                query.message.chat_id,
                "Quyidagi tugmalardan birini tanlang:",
                reply_markup=_get_main_keyboard(),
            )
        else:
            err = result.get("error", "Noma'lum xato")
            await query.edit_message_text(
                f"❌ <b>Xato yuz berdi:</b> {err}\n\nQayta urinib ko'ring yoki admin bilan bog'laning.",
                parse_mode="HTML",
            )
            await context.bot.send_message(
                query.message.chat_id,
                "Quyidagi tugmalardan birini tanlang:",
                reply_markup=_get_main_keyboard(),
            )
        context.user_data.pop("premium_plan", None)
        context.user_data.pop("premium_price", None)
        return WAITING_PHONE

    elif pay_method == "card":
        # Kartaga to'lov: karta raqam ko'rsatib, screenshot so'rash
        card_line = f"\n💳 To'lov kartasi: <code>{ADMIN_CARD_NUMBER}</code>" if ADMIN_CARD_NUMBER else ""
        await query.edit_message_text(
            f"🏦 <b>Kartaga to'lov</b> — {plan_name} ({price} UZS)\n"
            f"{card_line}\n\n"
            "Kartaga pul o'tkazgach, to'lov <b>screenshot</b>ini (skrinshot) yuboring.\n"
            "Admin tekshirib, tarifingizni faollashtiradi.",
            parse_mode="HTML",
        )
        return WAITING_PREMIUM_SCREENSHOT

    # Noma'lum holat
    await query.edit_message_text("❌ Noma'lum xato. Qayta urinib ko'ring.")
    return WAITING_PHONE


async def _cmd_topup(update: Update, context: ContextTypes.DEFAULT_TYPE) -> int:
    """Xisobni to'ldirish: balans + karta, screenshot so'rash."""
    telegram_id = update.effective_user.id
    result = await get_telegram_profile_via_api(telegram_id)
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
    result = await get_telegram_profile_via_api(telegram_id)
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
    _save_user(telegram_id)
    full_name = user.full_name or ""
    phone_normalized = _normalize_phone(phone)
    photo_url = await get_telegram_profile_photo_url(context.bot, user.id) or ""

    wait_msg = await update.message.reply_html("⏳ Kod tayyorlanmoqda...")

    result = await create_otp_via_api(
        telegram_id=telegram_id,
        phone=phone_normalized,
        full_name=full_name,
        photo_url=photo_url,
    )

    await wait_msg.delete()

    if result and result.get("success"):
        code = result["code"]
        total_seconds = result.get("remaining_seconds", 60)

        otp_msg = format_otp_message(code, total_seconds, total_seconds, REGISTER_URL)
        keyboard = [
            [InlineKeyboardButton("🔄 Yangi kod olish", callback_data='new_code')],
            [InlineKeyboardButton("🌐 Saytga o'tish", url=REGISTER_URL)],
        ]
        reply_markup = InlineKeyboardMarkup(keyboard)
        context.user_data["phone"] = phone_normalized


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

    result = await create_otp_via_api(
        telegram_id=user.id,
        phone=phone,
        full_name=full_name,
        photo_url=photo_url,
    )
    if result and result.get('success'):
        total_seconds = result.get('remaining_seconds', 60)
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
    """Premium to'lov screenshot qabul qilish va adminga Tasdiqlash/Rad etish tugmalari bilan yuborish."""
    if not update.message.photo:
        await update.message.reply_text("📸 Iltimos, to'lov skrinshotini (rasm) yuboring.")
        return WAITING_PREMIUM_SCREENSHOT
    plan = context.user_data.get("premium_plan", "Premium")
    telegram_id = update.effective_user.id

    result = await get_telegram_profile_via_api(telegram_id)
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
    keyboard = InlineKeyboardMarkup([[
        InlineKeyboardButton("✅ Tasdiqlash", callback_data=f"premium_adm_ok:{telegram_id}:{plan}"),
        InlineKeyboardButton("❌ Rad etish", callback_data=f"premium_adm_no:{telegram_id}"),
    ]])
    sent_msgs = []
    for target in _notification_targets():
        try:
            msg = await context.bot.send_photo(
                target, photo=file_id, caption=caption,
                parse_mode="HTML", reply_markup=keyboard
            )
            sent_msgs.append((msg.chat_id, msg.message_id))
        except Exception as e:
            logger.warning("Admin %s ga rasm yuborilmadi: %s", target, e)
    # Barcha yuborilgan xabarlarni bot_data ga saqlash — boshqa adminlar ham ko'rishi uchun
    if sent_msgs:
        context.bot_data[f"admin_msgs_premium:{telegram_id}"] = sent_msgs
    context.user_data.pop("premium_plan", None)
    await update.message.reply_html(
        "✅ Skrinshot qabul qilindi. Admin tekshiradi va tasdiqlagach xabar beramiz.",
        reply_markup=_get_main_keyboard(),
    )
    return WAITING_PHONE


async def _receive_topup_screenshot(update: Update, context: ContextTypes.DEFAULT_TYPE) -> int:
    """Hisobni to'ldirish screenshot qabul qilish va adminga Tasdiqlash/Rad etish tugmalari bilan yuborish."""
    if not update.message.photo:
        await update.message.reply_text("📸 Iltimos, to'lov skrinshotini (rasm) yuboring.")
        return WAITING_TOPUP_SCREENSHOT
    telegram_id = update.effective_user.id
    result = await get_telegram_profile_via_api(telegram_id)
    username = result.get("data", {}).get("username", "") if result and result.get("has_account") else str(telegram_id)
    caption = (
        f"💰 <b>Hisobni to'ldirish (skrinshot)</b>\n"
        f"👤 Sayt username: <b>{username}</b>\n"
        f"🆔 Telegram ID: <code>{telegram_id}</code>"
    )
    file_id = update.message.photo[-1].file_id
    keyboard = InlineKeyboardMarkup([[
        InlineKeyboardButton("✅ Tasdiqlash", callback_data=f"topup_approve:{telegram_id}"),
        InlineKeyboardButton("❌ Rad etish", callback_data=f"topup_reject:{telegram_id}"),
    ]])
    sent_msgs = []
    for target in _notification_targets():
        try:
            msg = await context.bot.send_photo(
                target, photo=file_id, caption=caption,
                parse_mode="HTML", reply_markup=keyboard
            )
            sent_msgs.append((msg.chat_id, msg.message_id))
        except Exception as e:
            logger.warning("Admin %s ga rasm yuborilmadi: %s", target, e)
    if sent_msgs:
        context.bot_data[f"admin_msgs_topup:{telegram_id}"] = sent_msgs
    await update.message.reply_html(
        "✅ Skrinshot qabul qilindi. Admin tekshiradi va balans yangilanadi.",
        reply_markup=_get_main_keyboard(),
    )
    return WAITING_PHONE


async def _receive_withdraw_amount(update: Update, context: ContextTypes.DEFAULT_TYPE) -> int:
    """Chiqarish summasini qabul qilish, balansni tekshirish va tasdiqlash so'rash."""
    text = (update.message.text or "").strip().replace(" ", "").replace(",", "")
    if not text or not text.isdigit():
        await update.message.reply_text("❌ Summani faqat raqamda yuboring (masalan: 50000)")
        return WAITING_WITHDRAW_AMOUNT
    amount_str = text
    amount_float = float(amount_str)
    if amount_float <= 0:
        await update.message.reply_text("❌ Summa 0 dan katta bo'lishi kerak.")
        return WAITING_WITHDRAW_AMOUNT

    telegram_id = update.effective_user.id
    result = await get_telegram_profile_via_api(telegram_id)
    if not result or not result.get("success") or not result.get("has_account"):
        await update.message.reply_html("❌ Balansni tekshirib bo'lmadi. Qayta urinib ko'ring.")
        return WAITING_PHONE
    balance_str = result.get("data", {}).get("balance", "0")
    try:
        balance_float = float(balance_str)
    except (ValueError, TypeError):
        balance_float = 0.0

    if amount_float > balance_float:
        await update.message.reply_html(
            f"❌ <b>Hisobingizda buncha mablag' yo'q.</b>\n\n"
            f"Joriy balans: <b>{balance_str} UZS</b>\n"
            f"Siz kiritgan summa: <b>{amount_str} UZS</b>\n\n"
            "Kamroq summa kiriting yoki /cancel bosing."
        )
        return WAITING_WITHDRAW_AMOUNT

    context.user_data["withdraw_amount"] = amount_str
    keyboard = [
        [
            InlineKeyboardButton("Ha", callback_data="withdraw_confirm:yes"),
            InlineKeyboardButton("Yo'q", callback_data="withdraw_confirm:no"),
        ],
    ]
    await update.message.reply_html(
        f"❓ <b>{amount_str} UZS</b> summani hisobdan chiqarishga rozimisiz?",
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
    """Chiqarish uchun karta raqamini qabul qilish va adminga yuborish (balans bilan)."""
    card = (update.message.text or "").strip()
    if not card or len(card) < 4:
        await update.message.reply_text("❌ Karta raqamini to'g'ri kiriting.")
        return WAITING_WITHDRAW_CARD
    amount = context.user_data.pop("withdraw_amount", "?")
    telegram_id = update.effective_user.id
    result = await get_telegram_profile_via_api(telegram_id)
    username = result.get("data", {}).get("username", "") if result and result.get("has_account") else str(telegram_id)
    balance = result.get("data", {}).get("balance", "0") if result and result.get("has_account") else "0"
    for target in _notification_targets():
        try:
            await context.bot.send_message(
                target,
                f"💸 <b>Hisobdan pul yechish so'rovi</b>\n\n"
                f"👤 Sayt username: <b>{username}</b>\n"
                f"🆔 Telegram ID: <code>{telegram_id}</code>\n"
                f"📊 <b>Hisobdagi balans: {balance} UZS</b>\n"
                f"💰 So'ralgan summa: <b>{amount} UZS</b>\n"
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


async def _fallback_menu_buttons(update: Update, context: ContextTypes.DEFAULT_TYPE) -> int:
    """Har qanday holatda menyu tugmalarini ushlash (fallback)."""
    text = (update.message.text or "").strip()
    if text in (BTN_MY_ACCOUNT, BTN_PREMIUM, BTN_TOPUP, BTN_WITHDRAW):
        # Oldingi oqimni tozalash
        context.user_data.pop("premium_plan", None)
        context.user_data.pop("withdraw_amount", None)
        state = await _handle_menu_button(update, context, text)
        return state if state is not None else WAITING_PHONE
    return WAITING_PHONE


async def _confirming_text_fallback(update: Update, context: ContextTypes.DEFAULT_TYPE) -> int:
    """CONFIRMING holatida foydalanuvchi matn yozsa — eslatma berish."""
    text = (update.message.text or "").strip()
    # Menyu tugmalarini ushlash
    if text in (BTN_MY_ACCOUNT, BTN_PREMIUM, BTN_TOPUP, BTN_WITHDRAW):
        context.user_data.pop("premium_plan", None)
        context.user_data.pop("withdraw_amount", None)
        state = await _handle_menu_button(update, context, text)
        return state if state is not None else WAITING_PHONE
    await update.message.reply_html(
        "⏳ Tasdiqlash kodingiz yuqorida ko'rsatilgan.\n\n"
        "Yangi kod olish uchun yuqoridagi xabardagi <b>🔄 Yangi kod olish</b> tugmasini bosing.\n"
        "Boshqa amalni bajarish uchun quyidagi tugmalardan foydalaning.",
        reply_markup=_get_main_keyboard(),
    )
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
    payment_line = "\n💰 <b>To'lov paneli</b> — hisobni to'ldirish (WebApp)\n" if PAYMENT_ENABLED else ""
    await update.message.reply_html(
        "📚 <b>Yordam — WibeStore Bot</b>\n"
        "━━━━━━━━━━━━━━━━━━━━\n\n"
        "🔘 <b>Menyu tugmalari:</b>\n"
        f"• <b>Mening saytdagi akkauntim</b> — balans, username\n"
        f"• <b>Premium olish</b> — Premium yoki Pro tarif xaridi\n"
        f"• <b>Xisobni to'ldirish</b> — balansni oshirish\n"
        f"• <b>Xisobdan pul yechish</b> — hisobdan pul chiqarish\n"
        f"• <b>📱 Telefon raqamimni yuborish</b> — ro'yxatdan o'tish kodi olish\n"
        f"{payment_line}\n"
        "📋 <b>Buyruqlar:</b>\n"
        "/start — Boshqatdan boshlash\n"
        "/help — Ushbu yordam xabari\n"
        "/cancel — Joriy amalni bekor qilish\n\n"
        "❓ <b>Qanday ro'yxatdan o'tish?</b>\n"
        "1. /start yozing\n"
        "2. Telefon raqamingizni yuboring\n"
        "3. Bir martalik tasdiqlash kodi olasiz\n"
        f"4. <a href='{REGISTER_URL}'>Saytda</a> telefon + kodni kiriting\n\n"
        "🆕 <b>Soatlik yangilanish:</b> Har soatda yangi akkauntlar haqida xabar olasiz!"
    )


async def unknown(update: Update, context: ContextTypes.DEFAULT_TYPE) -> None:
    """Noma'lum buyruq"""
    await update.message.reply_html(
        "❓ Noma'lum buyruq.\n\n"
        "/start — Boshlash\n"
        "/help — Yordam\n"
        "/cancel — Bekor qilish",
        reply_markup=_get_main_keyboard(),
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


async def _hourly_notify_job(context: ContextTypes.DEFAULT_TYPE) -> None:
    """Har 1 soatda barcha foydalanuvchilarga yangi akkaunt haqida xabar yuborish."""
    users = _load_users()
    if not users:
        logger.info("Soatlik xabar: foydalanuvchilar yo'q.")
        return

    # Saytdagi eng so'nggi akkauntlar sonini olishga harakat qilamiz
    new_count = None
    if BOT_SECRET_KEY and "localhost" not in WEBSITE_URL:
        try:
            url = f"{WEBSITE_URL}/api/v1/auth/telegram/stats/"
            payload = {"secret_key": BOT_SECRET_KEY}
            if _AIOHTTP_AVAILABLE:
                async with _aiohttp.ClientSession() as session:
                    async with session.post(
                        url, json=payload, timeout=_aiohttp.ClientTimeout(total=8)
                    ) as resp:
                        if resp.status == 200:
                            data = await resp.json()
                            new_count = data.get("new_accounts_last_hour")
        except Exception:
            pass

    if new_count is not None and new_count == 0:
        logger.info("Soatlik xabar: oxirgi soatda yangi akkaunt yo'q, xabar yuborilmaydi.")
        return

    count_text = f" (+<b>{new_count}</b> ta)" if new_count else ""
    text = (
        f"🆕 <b>Yangi akkauntlar saytga joylandi!</b>{count_text}\n\n"
        f"🌐 WibeStore'da yangi sotilayotgan akkauntlar mavjud.\n"
        f"Hoziroq ko'rish uchun saytga kiring:\n"
        f"🔗 <a href='{SITE_URL}'>{SITE_URL}</a>"
    )
    sent = 0
    failed = 0
    for uid in list(users):
        try:
            await context.bot.send_message(
                uid, text, parse_mode="HTML",
                disable_web_page_preview=True,
            )
            sent += 1
            # Rate limiting: Telegram — 30 msg/s, biz sekin yuboramiz
            await asyncio.sleep(0.05)
        except Exception as e:
            err_str = str(e).lower()
            if "blocked" in err_str or "deactivated" in err_str or "not found" in err_str:
                failed += 1
            else:
                logger.debug("Soatlik xabar yuborilmadi %s: %s", uid, e)
    logger.info("Soatlik xabar: %d yuborildi, %d muvaffaqiyatsiz.", sent, failed)


async def _post_init(application) -> None:
    """Fon vazifalarini ishga tushirish: payment Redis listener + soatlik xabar."""
    # Soatlik foydalanuvchi xabari (har 3600 soniyada)
    application.job_queue.run_repeating(
        _hourly_notify_job,
        interval=3600,
        first=3600,
        name="hourly_notify",
    )
    logger.info("Soatlik xabar job ishga tushdi (har 1 soatda).")

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
    users_count = len(_load_users())
    await update.message.reply_html(
        "🛠 <b>Admin Panel</b>\n"
        "━━━━━━━━━━━━━━━━━━━━\n\n"
        f"📋 Kutilayotgan to'lovlar: <b>{count}</b>\n"
        f"👥 Bot foydalanuvchilari: <b>{users_count}</b>\n\n"
        "<b>Buyruqlar:</b>\n"
        "/pending — kutilayotgan to'lovlar ro'yxati\n"
        "/stats — to'lov statistikasi\n"
        "/balance &lt;telegram_id&gt; — foydalanuvchi balansi\n"
        "/broadcast &lt;matn&gt; — barcha userlarga xabar\n"
        "/notify — soatlik xabarni hozir yuborish",
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
    # Paralel API chaqiruvlar — tezroq
    (_, pd), (_, ad), (_, rd) = await asyncio.gather(
        _payment_api("GET", "/transactions?status=PENDING&limit=1000"),
        _payment_api("GET", "/transactions?status=APPROVED&limit=1000"),
        _payment_api("GET", "/transactions?status=REJECTED&limit=1000"),
    )
    p = pd.get("data", []) if pd.get("success") else []
    a = ad.get("data", []) if ad.get("success") else []
    r = rd.get("data", []) if rd.get("success") else []
    uzs = sum(float(tx.get("amount", 0)) for tx in a if tx.get("currency") == "UZS")
    usdt = sum(float(tx.get("amount", 0)) for tx in a if tx.get("currency") == "USDT")
    users_count = len(_load_users())
    await update.message.reply_html(
        "📊 <b>Statistika</b>\n"
        "━━━━━━━━━━━━━━━━━━━━\n\n"
        f"⏳ Kutilmoqda:  <b>{len(p)}</b>\n"
        f"✅ Tasdiqlandi: <b>{len(a)}</b>\n"
        f"❌ Rad etildi:  <b>{len(r)}</b>\n\n"
        f"💰 Tasdiqlangan jami:\n"
        f"  UZS:  <b>{uzs:,.0f}</b>\n"
        f"  USDT: <b>{usdt:,.2f}</b>\n\n"
        f"👥 Bot foydalanuvchilari: <b>{users_count}</b>",
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


# ============================================================
# ===== ADMIN TOPUP TASDIQLASH OQIMI ==========================
# ============================================================

async def _cb_topup_approve(update: Update, context: ContextTypes.DEFAULT_TYPE) -> int:
    """Admin: to'ldirish tasdiqlash — summa so'rash."""
    query = update.callback_query
    if not _is_admin(query.from_user.id):
        await query.answer("⛔ Ruxsat yo'q.", show_alert=True)
        return ConversationHandler.END
    await query.answer()
    user_id = int(query.data.replace("topup_approve:", "", 1))
    context.user_data["pending_topup_user_id"] = user_id
    admin_tag = f"@{query.from_user.username}" if query.from_user.username else str(query.from_user.id)

    # Shu admin xabarining tugmalarini olib tashlash
    try:
        await query.edit_message_reply_markup(reply_markup=None)
    except Exception:
        pass

    # Boshqa adminlarga: "Tasdiqlash jarayonida" deb xabar yuborish
    await _sync_all_admin_msgs(
        context.bot, context.bot_data,
        key=f"admin_msgs_topup:{user_id}",
        new_caption=f"⏳ <b>Tasdiqlash jarayonida</b> ({admin_tag})\nSumma kiritilmoqda...",
        acting_chat_id=query.message.chat_id,
        acting_message_id=query.message.message_id,
    )

    await context.bot.send_message(
        query.message.chat_id,
        f"💰 Foydalanuvchi <code>{user_id}</code> hisobiga qancha <b>UZS</b> qo'shilsin?\n\n"
        f"Raqamni yozing (masalan: <code>50000</code>)\n"
        f"Bekor qilish: /cancel",
        parse_mode="HTML",
    )
    return ADMIN_TOPUP_AMOUNT


async def _admin_receive_topup_amount(update: Update, context: ContextTypes.DEFAULT_TYPE) -> int:
    """Admin: topup summasi qabul qilinib balans qo'shiladi va foydalanuvchi xabardor qilinadi."""
    user_id = context.user_data.get("pending_topup_user_id")
    if not user_id:
        await update.message.reply_text("❌ Xatolik: foydalanuvchi ID topilmadi. Qayta urinib ko'ring.")
        return ConversationHandler.END

    text = (update.message.text or "").strip().replace(" ", "").replace(",", "")
    if not text.isdigit() or int(text) <= 0:
        await update.message.reply_text(
            "❌ Summani faqat raqamda yozing (masalan: 50000)\n/cancel — bekor qilish"
        )
        return ADMIN_TOPUP_AMOUNT

    amount = int(text)
    context.user_data.pop("pending_topup_user_id", None)

    await update.message.reply_text("⏳ Balans qo'shilmoqda...")

    status, data = await _add_user_balance_api(user_id, amount)

    if status != 200:
        err_msg = data.get("error") or data.get("detail") or str(data)[:200]
        await update.message.reply_html(
            f"❌ <b>Balans qo'shilmadi!</b>\n\n"
            f"Backend javobi: <code>{status}</code>\n"
            f"{err_msg}\n\n"
            f"<i>Backend'da <code>/api/v1/auth/telegram/balance/add/</code> endpointi borligini tekshiring.</i>"
        )
        return ConversationHandler.END

    new_balance = data.get("new_balance") or data.get("balance") or "?"

    # Foydalanuvchiga xabar
    try:
        await context.bot.send_message(
            user_id,
            f"✅ <b>To'lovingiz tasdiqlandi!</b>\n\n"
            f"💰 Hisobingizga <b>{amount:,} UZS</b> qo'shildi.\n"
            f"📊 Yangi balans: <b>{new_balance} UZS</b>\n\n"
            f"Saytga kirib balansni ko'ring! 🎉",
            parse_mode="HTML",
        )
    except Exception as e:
        logger.warning("Foydalanuvchi %s ga xabar yuborib bo'lmadi: %s", user_id, e)

    await update.message.reply_html(
        f"✅ Foydalanuvchi <code>{user_id}</code> hisobiga <b>{amount:,} UZS</b> qo'shildi.\n"
        f"📊 Yangi balans: <b>{new_balance} UZS</b>"
    )
    return ConversationHandler.END


async def _admin_topup_cancel(update: Update, context: ContextTypes.DEFAULT_TYPE) -> int:
    """Admin: topup tasdiqlashni bekor qilish."""
    context.user_data.pop("pending_topup_user_id", None)
    await update.message.reply_text("❌ Bekor qilindi.", reply_markup=ReplyKeyboardRemove())
    return ConversationHandler.END


async def _cb_topup_reject(update: Update, context: ContextTypes.DEFAULT_TYPE) -> None:
    """Admin: to'ldirish so'rovini rad etish va foydalanuvchiga xabar."""
    query = update.callback_query
    if not _is_admin(query.from_user.id):
        await query.answer("⛔ Ruxsat yo'q.", show_alert=True)
        return
    await query.answer("❌ Rad etildi.")
    user_id = int(query.data.replace("topup_reject:", "", 1))

    orig = query.message.caption or query.message.text or ""
    admin_tag = f"@{query.from_user.username}" if query.from_user.username else str(query.from_user.id)
    suffix = f"\n\n━━━━━━━━━━━━━━━━━━━━\n❌ <b>RAD ETILDI</b> ({admin_tag})"

    # Shu admin xabarini yangilash
    try:
        if query.message.caption is not None:
            await query.message.edit_caption(caption=orig + suffix, parse_mode="HTML")
        else:
            await query.message.edit_text(text=orig + suffix, parse_mode="HTML")
    except Exception:
        try:
            await query.message.edit_reply_markup(reply_markup=None)
        except Exception:
            pass

    # Boshqa adminlar xabarlarini ham yangilash
    await _sync_all_admin_msgs(
        context.bot, context.bot_data,
        key=f"admin_msgs_topup:{user_id}",
        new_caption=f"❌ <b>RAD ETILDI</b> ({admin_tag})",
        acting_chat_id=query.message.chat_id,
        acting_message_id=query.message.message_id,
    )

    try:
        await context.bot.send_message(
            user_id,
            "❌ <b>To'lovingiz rad etildi.</b>\n\n"
            "Siz to'lov qilmagansiz yoki chek ma'lumotingiz xato.\n\n"
            "Qayta to'lov qilmoqchi bo'lsangiz, yana skrinshot yuboring.",
            parse_mode="HTML",
        )
    except Exception as e:
        logger.warning("Foydalanuvchi %s ga xabar yuborib bo'lmadi: %s", user_id, e)


# ============================================================
# ===== ADMIN PREMIUM TASDIQLASH OQIMI ========================
# ============================================================

async def _cb_premium_admin_approve(update: Update, context: ContextTypes.DEFAULT_TYPE) -> None:
    """Admin: premium to'lovini tasdiqlash va foydalanuvchiga Premium berish."""
    query = update.callback_query
    if not _is_admin(query.from_user.id):
        await query.answer("⛔ Ruxsat yo'q.", show_alert=True)
        return
    await query.answer("⏳ Tasdiqlanmoqda...")

    # callback_data: "premium_adm_ok:{user_id}:{plan}"
    parts = query.data.replace("premium_adm_ok:", "", 1).split(":", 1)
    user_id = int(parts[0])
    plan = parts[1] if len(parts) > 1 else "Premium"

    status, data = await _activate_premium_api(user_id, plan)

    orig = query.message.caption or query.message.text or ""
    admin_tag = f"@{query.from_user.username}" if query.from_user.username else str(query.from_user.id)

    if status != 200:
        err_msg = data.get("error") or data.get("detail") or str(data)[:200]
        suffix = (
            f"\n\n━━━━━━━━━━━━━━━━━━━━\n"
            f"⚠️ <b>API XATOLIK</b> ({admin_tag})\n"
            f"<code>{status}</code>: {err_msg}\n"
            f"<i>Backend'da premium/activate endpointi borligini tekshiring.</i>"
        )
        try:
            if query.message.caption is not None:
                await query.message.edit_caption(caption=orig + suffix, parse_mode="HTML")
            else:
                await query.message.edit_text(text=orig + suffix, parse_mode="HTML")
        except Exception:
            pass
        # API xato bo'lsa ham foydalanuvchiga xabar beramiz (manual tasdiqlash)
        try:
            await context.bot.send_message(
                user_id,
                f"✅ <b>{plan} tarifingiz tasdiqlandi!</b>\n\n"
                f"Saytga kirib Premium imkoniyatlardan foydalaning! 🎉",
                parse_mode="HTML",
            )
        except Exception as e:
            logger.warning("Foydalanuvchi %s ga xabar yuborib bo'lmadi: %s", user_id, e)
        return

    suffix = (
        f"\n\n━━━━━━━━━━━━━━━━━━━━\n"
        f"✅ <b>TASDIQLANDI</b> ({admin_tag})\n"
        f"Tarif: <b>{plan}</b>"
    )

    # Shu admin xabarini yangilash
    try:
        if query.message.caption is not None:
            await query.message.edit_caption(caption=orig + suffix, parse_mode="HTML")
        else:
            await query.message.edit_text(text=orig + suffix, parse_mode="HTML")
    except Exception:
        try:
            await query.message.edit_reply_markup(reply_markup=None)
        except Exception:
            pass

    # Boshqa adminlar xabarlarini ham yangilash
    await _sync_all_admin_msgs(
        context.bot, context.bot_data,
        key=f"admin_msgs_premium:{user_id}",
        new_caption=f"✅ <b>TASDIQLANDI</b> ({admin_tag})\nTarif: <b>{plan}</b>",
        acting_chat_id=query.message.chat_id,
        acting_message_id=query.message.message_id,
    )

    try:
        await context.bot.send_message(
            user_id,
            f"✅ <b>{plan} tarifingiz tasdiqlandi!</b>\n\n"
            f"🎉 Siz endi <b>{plan}</b> foydalanuvchisiz!\n"
            f"Saytga kirib barcha imkoniyatlardan foydalaning.",
            parse_mode="HTML",
        )
    except Exception as e:
        logger.warning("Foydalanuvchi %s ga xabar yuborib bo'lmadi: %s", user_id, e)


async def _cb_premium_admin_reject(update: Update, context: ContextTypes.DEFAULT_TYPE) -> None:
    """Admin: premium to'lovini rad etish."""
    query = update.callback_query
    if not _is_admin(query.from_user.id):
        await query.answer("⛔ Ruxsat yo'q.", show_alert=True)
        return
    await query.answer("❌ Rad etildi.")
    user_id = int(query.data.replace("premium_adm_no:", "", 1))

    orig = query.message.caption or query.message.text or ""
    admin_tag = f"@{query.from_user.username}" if query.from_user.username else str(query.from_user.id)
    suffix = f"\n\n━━━━━━━━━━━━━━━━━━━━\n❌ <b>RAD ETILDI</b> ({admin_tag})"

    # Shu admin xabarini yangilash
    try:
        if query.message.caption is not None:
            await query.message.edit_caption(caption=orig + suffix, parse_mode="HTML")
        else:
            await query.message.edit_text(text=orig + suffix, parse_mode="HTML")
    except Exception:
        try:
            await query.message.edit_reply_markup(reply_markup=None)
        except Exception:
            pass

    # Boshqa adminlar xabarlarini ham yangilash
    await _sync_all_admin_msgs(
        context.bot, context.bot_data,
        key=f"admin_msgs_premium:{user_id}",
        new_caption=f"❌ <b>RAD ETILDI</b> ({admin_tag})",
        acting_chat_id=query.message.chat_id,
        acting_message_id=query.message.message_id,
    )

    try:
        await context.bot.send_message(
            user_id,
            "❌ <b>Premium to'lovingiz rad etildi.</b>\n\n"
            "Siz to'lov qilmagansiz yoki chek ma'lumotingiz xato.\n\n"
            "Qayta to'lov qilmoqchi bo'lsangiz, yana skrinshot yuboring.",
            parse_mode="HTML",
        )
    except Exception as e:
        logger.warning("Foydalanuvchi %s ga xabar yuborib bo'lmadi: %s", user_id, e)


async def cmd_broadcast(update: Update, context: ContextTypes.DEFAULT_TYPE) -> None:
    """/broadcast <matn> — admin: barcha foydalanuvchilarga xabar yuborish."""
    if not _is_admin(update.effective_user.id):
        return
    parts = (update.message.text or "").strip().split(maxsplit=1)
    if len(parts) < 2 or not parts[1].strip():
        await update.message.reply_html(
            "Ishlatish: /broadcast &lt;xabar matni&gt;\n"
            "Misol: /broadcast Saytda yangi mahsulotlar qo'shildi!"
        )
        return
    text = parts[1].strip()
    users = _load_users()
    if not users:
        await update.message.reply_text("Foydalanuvchilar yo'q.")
        return
    await update.message.reply_text(f"📤 {len(users)} ta foydalanuvchiga yuborilmoqda...")
    sent = failed = 0
    for uid in list(users):
        try:
            await context.bot.send_message(uid, text, parse_mode="HTML")
            sent += 1
            await asyncio.sleep(0.05)
        except Exception:
            failed += 1
    await update.message.reply_html(
        f"✅ Yuborildi: <b>{sent}</b>\n❌ Yuborilmadi: <b>{failed}</b>"
    )


async def cmd_notify_now(update: Update, context: ContextTypes.DEFAULT_TYPE) -> None:
    """/notify — admin: soatlik xabarni hoziroq yuborish."""
    if not _is_admin(update.effective_user.id):
        return
    await update.message.reply_text("📤 Soatlik xabar yuborilmoqda...")
    await _hourly_notify_job(context)
    await update.message.reply_text("✅ Xabar yuborildi!")


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
    if not ADMIN_IDS and not ADMIN_CHAT_ID:
        logger.warning(
            "ADMIN_TELEGRAM_IDS va ADMIN_CHAT_ID o'rnatilmagan! "
            "Screenshot va pul yechish so'rovlari hech kimga yetmaydi."
        )

    app = (
        Application.builder()
        .token(BOT_TOKEN)
        .post_init(_post_init)
        .post_stop(_post_stop)
        .build()
    )

    # Menyu tugmalari uchun filter
    _menu_buttons_filter = filters.Text([BTN_MY_ACCOUNT, BTN_PREMIUM, BTN_TOPUP, BTN_WITHDRAW])

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
                MessageHandler(_menu_buttons_filter, _fallback_menu_buttons),
                MessageHandler(filters.TEXT & ~filters.COMMAND, _confirming_text_fallback),
            ],
            WAITING_PREMIUM_SCREENSHOT: [
                MessageHandler(filters.PHOTO, _receive_premium_screenshot),
                MessageHandler(_menu_buttons_filter, _fallback_menu_buttons),
                CommandHandler('cancel', _cancel_to_menu),
            ],
            WAITING_TOPUP_SCREENSHOT: [
                MessageHandler(filters.PHOTO, _receive_topup_screenshot),
                MessageHandler(_menu_buttons_filter, _fallback_menu_buttons),
                CommandHandler('cancel', _cancel_to_menu),
            ],
            WAITING_WITHDRAW_AMOUNT: [
                MessageHandler(_menu_buttons_filter, _fallback_menu_buttons),
                MessageHandler(filters.TEXT & ~filters.COMMAND, _receive_withdraw_amount),
                CommandHandler('cancel', _cancel_to_menu),
            ],
            WITHDRAW_CONFIRM: [
                CallbackQueryHandler(_cb_withdraw_confirm, pattern="^withdraw_confirm:"),
                MessageHandler(_menu_buttons_filter, _fallback_menu_buttons),
            ],
            WAITING_WITHDRAW_CARD: [
                MessageHandler(_menu_buttons_filter, _fallback_menu_buttons),
                MessageHandler(filters.TEXT & ~filters.COMMAND, _receive_withdraw_card),
                CommandHandler('cancel', _cancel_to_menu),
            ],
            WAITING_PREMIUM_PAY_METHOD: [
                CallbackQueryHandler(_cb_premium_payment_method, pattern="^premium_pay:"),
                MessageHandler(_menu_buttons_filter, _fallback_menu_buttons),
                CommandHandler('cancel', _cancel_to_menu),
            ],
        },
        fallbacks=[
            CommandHandler('start', start),
            CommandHandler('cancel', cancel),
            MessageHandler(_menu_buttons_filter, _fallback_menu_buttons),
        ],
        per_message=False,
        allow_reentry=True,
    )
    # ---- Admin topup tasdiqlash ConversationHandler (asosiy conv_handler DAN OLDIN) ----
    # Bu ConversationHandler faqat admin uchun: screenshot tasdiqlanganida summa so'raladi
    admin_topup_conv = ConversationHandler(
        entry_points=[
            CallbackQueryHandler(_cb_topup_approve, pattern=r'^topup_approve:\d+$'),
        ],
        states={
            ADMIN_TOPUP_AMOUNT: [
                CommandHandler('cancel', _admin_topup_cancel),
                MessageHandler(filters.TEXT & ~filters.COMMAND, _admin_receive_topup_amount),
            ],
        },
        fallbacks=[CommandHandler('cancel', _admin_topup_cancel)],
        per_message=False,
        per_user=True,
        per_chat=True,
        allow_reentry=True,
    )
    app.add_handler(admin_topup_conv)

    app.add_handler(conv_handler)

    # ---- To'lov tizimi handlerlari ----
    # Wallet TopUp: Approve/Reject callback — barcha foydalanuvchilar uchun (admin tekshiruvi ichida)
    app.add_handler(CallbackQueryHandler(cb_approve, pattern=r'^approve:'))
    app.add_handler(CallbackQueryHandler(cb_reject, pattern=r'^reject:'))

    # Screenshot topup: rad etish
    app.add_handler(CallbackQueryHandler(_cb_topup_reject, pattern=r'^topup_reject:\d+$'))

    # Premium admin: tasdiqlash va rad etish
    app.add_handler(CallbackQueryHandler(_cb_premium_admin_approve, pattern=r'^premium_adm_ok:'))
    app.add_handler(CallbackQueryHandler(_cb_premium_admin_reject, pattern=r'^premium_adm_no:\d+$'))

    # Admin buyruqlari (faqat adminlar uchun, lekin global — conversation tashqarida)
    app.add_handler(CommandHandler('admin', cmd_admin_panel))
    app.add_handler(CommandHandler('pending', cmd_pending))
    app.add_handler(CommandHandler('stats', cmd_stats))
    app.add_handler(CommandHandler('balance', cmd_balance))
    app.add_handler(CommandHandler('broadcast', cmd_broadcast))
    app.add_handler(CommandHandler('notify', cmd_notify_now))

    # ---- Umumiy buyruqlar ----
    app.add_handler(CommandHandler('help', help_command))
    app.add_handler(MessageHandler(filters.COMMAND, unknown))

    async def error_handler(update, context):
        if isinstance(context.error, TelegramConflict):
            now = _time.time()
            last_log = getattr(error_handler, '_last_conflict_log', 0.0)
            if now - last_log >= 300:  # 5 daqiqa
                error_handler._last_conflict_log = now
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
