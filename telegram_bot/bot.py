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
from telegram.request import HTTPXRequest
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
# Conflict (409), httpx va APScheduler INFO spamini kamaytirish
logging.getLogger("telegram.ext.Updater").setLevel(logging.CRITICAL)
logging.getLogger("httpx").setLevel(logging.WARNING)
logging.getLogger("apscheduler.executors.default").setLevel(logging.WARNING)
logging.getLogger("apscheduler.scheduler").setLevel(logging.WARNING)
logging.getLogger("apscheduler.jobstores.default").setLevel(logging.WARNING)

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
    and WEB_APP_URL.startswith('https://')
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
    WAITING_TOPUP_AMOUNT,
) = range(2, 9)

# Sotuvchi shaxs tasdiqlash bosqichlari
(
    VERIFY_PASSPORT_FRONT,
    VERIFY_PASSPORT_BACK,
    VERIFY_VIDEO,
    VERIFY_LOCATION,
) = range(30, 34)

# E'lon video yuklash
WAITING_LISTING_VIDEO = 40

# Yangi keyboard tugmalar matni
BTN_MY_ACCOUNT = "Mening saytdagi akkauntim"
BTN_PREMIUM = "Premium olish"
BTN_TOPUP = "Xisobni to'ldirish"
BTN_WITHDRAW = "Xisobdan pul yechish"
BTN_SUPPORT = "📩 Admin bilan bog'lanish"

# Premium / to'ldirish / chiqarish uchun sozlamalar
ADMIN_CARD_NUMBER = os.getenv("ADMIN_CARD_NUMBER", "").strip()
PREMIUM_PRICE_UZS = os.getenv("PREMIUM_PRICE_UZS", "50000")
PRO_PRICE_UZS = os.getenv("PRO_PRICE_UZS", "100000")

# Countdown update interval (seconds) — har soniyada teskari sanoq
COUNTDOWN_INTERVAL = 1

# Admin topup summa kutish holati (ConversationHandler uchun alohida)
ADMIN_TOPUP_AMOUNT = 10

# Support holatlari
WAITING_SUPPORT_MSG = 11
SUPPORT_CONFIRM = 12
WAITING_ADMIN_REPLY = 20

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


# ===== BLOCK 8.1: CALLBACK IDEMPOTENCY (Redis-based, 1h TTL) =====

async def is_callback_already_processed(callback_id: str) -> bool:
    """
    Tekshirish: bu callback allaqachon qayta ishlangan.
    Redis TTL: 1 soat. Agar Redis mavjud bo'lmasa — False qaytaradi (xavfsiz degradatsiya).
    """
    if not _REDIS_AVAILABLE or not callback_id:
        return False
    try:
        r = await _aioredis.from_url(PAYMENT_REDIS_URL, decode_responses=True)
        key = f"cb_processed:{callback_id}"
        already = await r.get(key)
        if already:
            await r.aclose()
            return True
        await r.set(key, "1", ex=3600)
        await r.aclose()
        return False
    except Exception as e:
        logger.warning("is_callback_already_processed Redis error: %s", e)
        return False


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


async def _deduct_user_balance_api(telegram_id: int, amount: int) -> tuple[int, dict]:
    """Backend API orqali foydalanuvchi balansidan summa ayirish (pul yechish)."""
    if not BOT_SECRET_KEY:
        return 500, {"error": "BOT_SECRET_KEY yo'q"}
    url = f"{WEBSITE_URL}/api/v1/auth/telegram/balance/deduct/"
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
            logger.error("Balance deduct API xato: %s", e)
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
    """Asosiy menyu: 4 ta tugma + admin + telefon + to'lov paneli."""
    keyboard = [
        [KeyboardButton(BTN_MY_ACCOUNT), KeyboardButton(BTN_PREMIUM)],
        [KeyboardButton(BTN_TOPUP), KeyboardButton(BTN_WITHDRAW)],
        [KeyboardButton(BTN_SUPPORT)],
        [KeyboardButton("📱 Telefon raqamimni yuborish", request_contact=True)],
    ]
    if PAYMENT_ENABLED:
        keyboard.append([KeyboardButton("💰 To'lov paneli", web_app=WebAppInfo(url=WEB_APP_URL))])
    return ReplyKeyboardMarkup(keyboard, resize_keyboard=True)


# ===== HANDLERS =====

async def start(update: Update, context: ContextTypes.DEFAULT_TYPE) -> int:
    """Bot: /start — asosiy menyu. /start topup parametri bilan hisobni to'ldirish oqimini boshlaydi."""
    user = update.effective_user
    _save_user(user.id)

    # /start topup — to'g'ridan to'g'ri hisobni to'ldirish oqimiga o'tish
    args = context.args
    if args and args[0] == "topup":
        return await _cmd_topup(update, context)

    # /start uploadvideo_{token} — e'lon uchun video yuklash
    if args and args[0].startswith("uploadvideo_"):
        token = args[0][len("uploadvideo_"):]
        return await _cmd_upload_video(update, context, token)

    # /start viewvideo_{listing_id} — e'lon videosini ko'rish
    if args and args[0].startswith("viewvideo_"):
        listing_id = args[0][len("viewvideo_"):]
        return await _cmd_view_video(update, context, listing_id)

    try:
        reply_markup = _get_main_keyboard()
    except Exception as e:
        logger.error("Keyboard yaratishda xato: %s", e)
        reply_markup = ReplyKeyboardMarkup(
            [
                [KeyboardButton(BTN_MY_ACCOUNT), KeyboardButton(BTN_PREMIUM)],
                [KeyboardButton(BTN_TOPUP), KeyboardButton(BTN_WITHDRAW)],
                [KeyboardButton(BTN_SUPPORT)],
                [KeyboardButton("📱 Telefon raqamimni yuborish", request_contact=True)],
            ],
            resize_keyboard=True,
        )
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


# ===== E'LON VIDEO YUKLASH / KO'RISH =====

async def _cmd_upload_video(update: Update, context: ContextTypes.DEFAULT_TYPE, token: str) -> int:
    """Sotuvchi video yuklash oqimini boshlaydi."""
    import aiohttp

    # Token orqali listingni tekshirish
    try:
        async with aiohttp.ClientSession() as session:
            url = f"{WEBSITE_URL}/api/v1/listings/video-webhook/"
            # Token mavjudligini tekshiramiz — oddiy GET emas, tokenni context'ga saqlaymiz
            pass
    except Exception:
        pass

    context.user_data['video_upload_token'] = token

    await update.message.reply_html(
        "🎬 <b>E'lon uchun video yuklash</b>\n\n"
        "Akkauntingiz haqida video yuboring.\n\n"
        "📋 <b>Talablar:</b>\n"
        "• Hajmi: <b>10 MB — 300 MB</b>\n"
        "• Format: MP4, MOV, AVI\n"
        "• Akkaunt ichidagi o'yinlar, skinlar, darajani ko'rsating\n\n"
        "📤 <b>Videoni hozir yuboring</b> yoki /cancel bosing.",
        reply_markup=ReplyKeyboardMarkup(
            [[KeyboardButton("❌ Bekor qilish")]],
            resize_keyboard=True,
        ),
    )
    return WAITING_LISTING_VIDEO


async def _handle_listing_video(update: Update, context: ContextTypes.DEFAULT_TYPE) -> int:
    """Sotuvchi video yuborganda — file_id ni backend'ga saqlash."""
    import aiohttp

    video = update.message.video or update.message.document
    if not video:
        await update.message.reply_html(
            "❌ Iltimos, <b>video fayl</b> yuboring.\n"
            "Matn yoki rasm emas, video kerak."
        )
        return WAITING_LISTING_VIDEO

    # Hajm tekshirish (10MB - 300MB)
    file_size = video.file_size or 0
    min_size = 10 * 1024 * 1024   # 10 MB
    max_size = 300 * 1024 * 1024  # 300 MB

    if file_size < min_size:
        size_mb = round(file_size / (1024 * 1024), 1)
        await update.message.reply_html(
            f"⚠️ Video hajmi juda kichik: <b>{size_mb} MB</b>\n"
            f"Minimal hajm: <b>10 MB</b>\n\n"
            f"Boshqa video yuboring yoki /cancel bosing."
        )
        return WAITING_LISTING_VIDEO

    if file_size > max_size:
        size_mb = round(file_size / (1024 * 1024), 1)
        await update.message.reply_html(
            f"⚠️ Video hajmi juda katta: <b>{size_mb} MB</b>\n"
            f"Maksimal hajm: <b>300 MB</b>\n\n"
            f"Kichikroq video yuboring yoki /cancel bosing."
        )
        return WAITING_LISTING_VIDEO

    token = context.user_data.get('video_upload_token', '')
    if not token:
        await update.message.reply_html("❌ Video yuklash sessiyasi tugagan. Saytdan qayta boshlang.")
        return WAITING_PHONE

    file_id = video.file_id
    size_mb = round(file_size / (1024 * 1024), 1)

    # Backend'ga file_id yuborish
    try:
        async with aiohttp.ClientSession() as session:
            url = f"{WEBSITE_URL}/api/v1/listings/video-webhook/"
            payload = {
                "secret": BOT_SECRET_KEY,
                "token": token,
                "file_id": file_id,
            }
            async with session.post(url, json=payload, timeout=aiohttp.ClientTimeout(total=15)) as resp:
                data = await resp.json()
                if resp.status == 200 and data.get("success"):
                    listing_title = data.get("listing_title", "")
                    listing_id = data.get("listing_id", "")
                    seller_name = data.get("seller_name", "")
                    game_name = data.get("game_name", "")
                    price = data.get("price", "0")
                    context.user_data.pop('video_upload_token', None)

                    reply_markup = _get_main_keyboard()
                    await update.message.reply_html(
                        f"✅ <b>Video muvaffaqiyatli yuklandi!</b>\n\n"
                        f"📦 E'lon: <b>{listing_title}</b>\n"
                        f"📁 Hajmi: <b>{size_mb} MB</b>\n\n"
                        f"⏳ Video admin tekshiruviga yuborildi.\n"
                        f"Tasdiqlangandan keyin haridorlarga ko'rinadi.",
                        reply_markup=reply_markup,
                    )

                    # Admin ga video + tugmalar yuborish
                    await _notify_admin_new_video(
                        context, file_id, listing_id, listing_title,
                        seller_name, game_name, price, size_mb,
                        update.effective_user.id,
                    )

                    return WAITING_PHONE
                else:
                    error_msg = data.get("error", "Noma'lum xato")
                    await update.message.reply_html(
                        f"❌ Xatolik: {error_msg}\n\n"
                        f"Qayta urinib ko'ring yoki saytdan yangi token oling."
                    )
                    return WAITING_PHONE
    except Exception as e:
        logger.error("Video webhook xatosi: %s", e)
        await update.message.reply_html(
            "❌ Serverga ulanib bo'lmadi. Keyinroq urinib ko'ring."
        )
        return WAITING_PHONE


async def _notify_admin_new_video(context, file_id, listing_id, title, seller_name, game_name, price, size_mb, seller_tg_id):
    """Yangi video yuklanganda admin/guruhga xabar + tasdiqlash tugmalari."""
    caption = (
        f"🎬 <b>Yangi video yuklandi!</b>\n\n"
        f"📦 <b>E'lon:</b> {title}\n"
        f"🎮 <b>O'yin:</b> {game_name}\n"
        f"💰 <b>Narxi:</b> {int(float(price)):,} UZS\n"
        f"👤 <b>Sotuvchi:</b> {seller_name} (TG: {seller_tg_id})\n"
        f"📁 <b>Hajmi:</b> {size_mb} MB\n\n"
        f"⏳ <b>Status:</b> Tekshiruvda\n"
        f"🔗 <a href='https://wibestore.net/account/{listing_id}'>E'lonni ko'rish</a>"
    )

    buttons = InlineKeyboardMarkup([
        [
            InlineKeyboardButton("✅ Tasdiqlash", callback_data=f"vidmod_approve:{listing_id}"),
            InlineKeyboardButton("❌ Rad etish", callback_data=f"vidmod_reject:{listing_id}"),
        ],
        [
            InlineKeyboardButton("💬 Sotuvchiga yozish", callback_data=f"vidmod_msg:{listing_id}:{seller_tg_id}"),
        ],
    ])

    targets = []
    if ADMIN_CHAT_ID:
        targets.append(ADMIN_CHAT_ID)
    else:
        targets.extend(ADMIN_IDS)

    for chat_id in targets:
        try:
            await context.bot.send_video(
                chat_id=chat_id,
                video=file_id,
                caption=caption,
                parse_mode='HTML',
                reply_markup=buttons,
                supports_streaming=True,
            )
        except Exception as e:
            logger.error("Admin video notification xatosi (chat=%s): %s", chat_id, e)


async def _cb_video_moderate_approve(update: Update, context: ContextTypes.DEFAULT_TYPE):
    """Admin video tasdiqlash callback."""
    import aiohttp

    query = update.callback_query
    await query.answer()

    listing_id = query.data.split(":")[1]

    try:
        async with aiohttp.ClientSession() as session:
            url = f"{WEBSITE_URL}/api/v1/listings/video-moderate/"
            payload = {"secret": BOT_SECRET_KEY, "listing_id": listing_id, "action": "approve"}
            async with session.post(url, json=payload, timeout=aiohttp.ClientTimeout(total=15)) as resp:
                data = await resp.json()

        if data.get("success"):
            listing_title = data.get("listing_title", "")
            seller_tg_id = data.get("seller_telegram_id")

            # Admin xabarini yangilash
            await query.edit_message_caption(
                caption=(
                    query.message.caption + "\n\n"
                    f"✅ <b>TASDIQLANDI</b> — {update.effective_user.first_name}"
                ),
                parse_mode='HTML',
            )

            # Sotuvchiga xabar
            if seller_tg_id:
                try:
                    await context.bot.send_message(
                        chat_id=seller_tg_id,
                        text=(
                            f"✅ <b>Videongiz tasdiqlandi!</b>\n\n"
                            f"📦 E'lon: <b>{listing_title}</b>\n\n"
                            f"Endi haridorlar videoni ko'rishlari mumkin."
                        ),
                        parse_mode='HTML',
                    )
                except Exception as e:
                    logger.error("Seller notify error: %s", e)
        else:
            await query.edit_message_caption(
                caption=query.message.caption + f"\n\n❌ Xatolik: {data.get('error', '?')}",
                parse_mode='HTML',
            )
    except Exception as e:
        logger.error("Video approve xatosi: %s", e)
        await query.answer("Xatolik yuz berdi", show_alert=True)


async def _cb_video_moderate_reject(update: Update, context: ContextTypes.DEFAULT_TYPE):
    """Admin video rad etish callback — sabab so'raydi."""
    query = update.callback_query
    await query.answer()

    listing_id = query.data.split(":")[1]
    context.user_data['video_reject_listing_id'] = listing_id
    context.user_data['video_reject_msg_id'] = query.message.message_id
    context.user_data['video_reject_caption'] = query.message.caption or ""

    await query.message.reply_html(
        f"📝 <b>Rad etish sababi:</b>\n\n"
        f"Listing ID: <code>{listing_id[:8]}...</code>\n\n"
        f"Sababni yozing (masalan: sifatsiz video, noto'g'ri akkaunt, spam...):"
    )


async def _handle_video_reject_reason(update: Update, context: ContextTypes.DEFAULT_TYPE):
    """Admin rad etish sababini yozgandan keyin — backendga yuborish."""
    import aiohttp

    listing_id = context.user_data.pop('video_reject_listing_id', '')
    reject_msg_id = context.user_data.pop('video_reject_msg_id', None)
    original_caption = context.user_data.pop('video_reject_caption', '')

    if not listing_id:
        return  # Skip if not in reject flow

    reason = update.message.text.strip()

    try:
        async with aiohttp.ClientSession() as session:
            url = f"{WEBSITE_URL}/api/v1/listings/video-moderate/"
            payload = {"secret": BOT_SECRET_KEY, "listing_id": listing_id, "action": "reject", "reason": reason}
            async with session.post(url, json=payload, timeout=aiohttp.ClientTimeout(total=15)) as resp:
                data = await resp.json()

        if data.get("success"):
            listing_title = data.get("listing_title", "")
            seller_tg_id = data.get("seller_telegram_id")

            await update.message.reply_html(
                f"❌ <b>Video rad etildi</b>\n\n"
                f"📦 E'lon: {listing_title}\n"
                f"📝 Sabab: {reason}"
            )

            # Original admin xabarini yangilash
            if reject_msg_id:
                try:
                    await context.bot.edit_message_caption(
                        chat_id=update.effective_chat.id,
                        message_id=reject_msg_id,
                        caption=(
                            original_caption + "\n\n"
                            f"❌ <b>RAD ETILDI</b> — {update.effective_user.first_name}\n"
                            f"📝 Sabab: {reason}"
                        ),
                        parse_mode='HTML',
                    )
                except Exception:
                    pass

            # Sotuvchiga xabar
            if seller_tg_id:
                try:
                    await context.bot.send_message(
                        chat_id=seller_tg_id,
                        text=(
                            f"❌ <b>Videongiz rad etildi</b>\n\n"
                            f"📦 E'lon: <b>{listing_title}</b>\n"
                            f"📝 Sabab: {reason}\n\n"
                            f"Yangi video yuklash uchun saytda e'lonni tahrirlang."
                        ),
                        parse_mode='HTML',
                    )
                except Exception as e:
                    logger.error("Seller reject notify error: %s", e)
        else:
            await update.message.reply_html(f"❌ Xatolik: {data.get('error', '?')}")
    except Exception as e:
        logger.error("Video reject xatosi: %s", e)
        await update.message.reply_html("❌ Serverga ulanib bo'lmadi.")


async def _cb_video_moderate_msg(update: Update, context: ContextTypes.DEFAULT_TYPE):
    """Admin sotuvchiga xabar yozish callback."""
    query = update.callback_query
    await query.answer()

    parts = query.data.split(":")
    listing_id = parts[1]
    seller_tg_id = parts[2] if len(parts) > 2 else ""

    context.user_data['video_msg_seller_tg_id'] = seller_tg_id
    context.user_data['video_msg_listing_id'] = listing_id

    await query.message.reply_html(
        f"💬 <b>Sotuvchiga xabar yuborish</b>\n\n"
        f"Listing: <code>{listing_id[:8]}...</code>\n"
        f"Seller TG: <code>{seller_tg_id}</code>\n\n"
        f"Xabaringizni yozing:"
    )


async def _handle_video_msg_to_seller(update: Update, context: ContextTypes.DEFAULT_TYPE):
    """Admin sotuvchiga xabar yuborganda."""
    seller_tg_id = context.user_data.pop('video_msg_seller_tg_id', '')
    listing_id = context.user_data.pop('video_msg_listing_id', '')

    if not seller_tg_id:
        return

    msg_text = update.message.text.strip()

    try:
        await context.bot.send_message(
            chat_id=int(seller_tg_id),
            text=(
                f"📩 <b>Admin xabari</b>\n\n"
                f"E'loningiz videosi haqida:\n"
                f"🔗 <a href='https://wibestore.net/account/{listing_id}'>E'lonni ko'rish</a>\n\n"
                f"💬 {msg_text}"
            ),
            parse_mode='HTML',
        )
        await update.message.reply_html("✅ Xabar sotuvchiga yuborildi!")
    except Exception as e:
        logger.error("Admin msg to seller error: %s", e)
        await update.message.reply_html(f"❌ Xabar yuborib bo'lmadi: {e}")


async def _cmd_view_video(update: Update, context: ContextTypes.DEFAULT_TYPE, listing_id: str) -> int:
    """Haridor e'lon videosini ko'radi — bot video yuboradi."""
    import aiohttp

    # Listing ma'lumotlarini va video_file_id ni backend API orqali olish
    try:
        async with aiohttp.ClientSession() as session:
            # video-view endpointdan video_file_id olamiz
            url = f"{WEBSITE_URL}/api/v1/listings/{listing_id}/video-view/"
            headers = {"X-Bot-Secret": BOT_SECRET_KEY}
            async with session.get(url, headers=headers, timeout=aiohttp.ClientTimeout(total=15)) as resp:
                if resp.status != 200:
                    await update.message.reply_html("❌ E'lon topilmadi yoki video mavjud emas.")
                    return WAITING_PHONE
                video_data = await resp.json()

            # Listing tafsilotlarini olish
            listing_url = f"{WEBSITE_URL}/api/v1/listings/{listing_id}/"
            async with session.get(listing_url, timeout=aiohttp.ClientTimeout(total=15)) as resp2:
                listing_data = await resp2.json() if resp2.status == 200 else {}
    except Exception as e:
        logger.error("Video view xatosi: %s", e)
        await update.message.reply_html("❌ Serverga ulanib bo'lmadi.")
        return WAITING_PHONE

    file_id = video_data.get("file_id", "")
    if not file_id:
        await update.message.reply_html("❌ Bu e'lon uchun video mavjud emas.")
        return WAITING_PHONE

    # E'lon ma'lumotlari
    title = listing_data.get('title', '')
    description = listing_data.get('description', '')
    price = listing_data.get('price', 0)

    # Tavsifni qisqartirish (max 800 belgi)
    short_desc = description[:800] + ('...' if len(description) > 800 else '')

    caption = (
        f"🎬 <b>{title}</b>\n\n"
        f"💰 Narxi: <b>{int(float(price)):,} UZS</b>\n\n"
        f"📝 {short_desc}\n\n"
        f"🌐 <a href='https://wibestore.net/account/{listing_id}'>E'lonni ko'rish</a>"
    )

    try:
        await update.message.reply_video(
            video=file_id,
            caption=caption,
            parse_mode='HTML',
            supports_streaming=True,
        )
    except Exception as e:
        logger.error("Video yuborishda xato: %s", e)
        await update.message.reply_html("❌ Videoni yuborishda xatolik yuz berdi.")

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
    if text == BTN_SUPPORT:
        return await support_start(update, context)
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
    frontend_url = os.getenv("FRONTEND_URL", SITE_URL).rstrip("/")
    profile_url = f"{frontend_url}/profile"
    reply_markup = InlineKeyboardMarkup([[
        InlineKeyboardButton("🌐 Saytda profilimni ko'rish →", url=profile_url)
    ]])
    await update.message.reply_html(
        f"👤 <b>Saytdagi akkauntingiz</b>\n\n"
        f"🆔 Username: <b>{username}</b>\n"
        f"💰 Balans: <b>{balance} UZS</b>\n"
        f"📦 Sotilgan akkauntlar: <b>{sold_count}</b> ta",
        reply_markup=reply_markup,
    )
    return WAITING_PHONE


async def _cmd_premium(update: Update, context: ContextTypes.DEFAULT_TYPE) -> int:
    """Premium olish: tarif tanlash (narxlarni DB dan olib ko'rsatish)."""
    telegram_id = update.effective_user.id

    # Joriy obunani tekshirish
    profile = await get_telegram_profile_via_api(telegram_id)
    cur_plan = "free"
    end_date = ""
    days_left = 0
    if profile and profile.get("has_account"):
        pdata = profile.get("data", {})
        cur_plan = pdata.get("plan", "free")
        end_date = pdata.get("sub_end_date", "")
        days_left = pdata.get("sub_days_left", 0)

    plans = await _get_plans_api()
    premium_price = plans.get("premium", {}).get("price", PREMIUM_PRICE_UZS)
    pro_price = plans.get("pro", {}).get("price", PRO_PRICE_UZS)
    # Narxlarni context ga saqlaymiz — keyinchalik qayta so'rovga hojat qolmasin
    context.user_data["plan_prices"] = {"Premium": premium_price, "Pro": pro_price}

    # Pro foydalanuvchi: downgrade yo'q, faqat ma'lumot berish
    if cur_plan == "pro":
        await update.message.reply_html(
            f"💎 <b>Sizda Pro tarifi bor!</b>\n\n"
            f"📅 Muddati: <b>{end_date}</b>\n"
            f"⏳ Qoldi: <b>{days_left} kun</b>\n\n"
            "Pro tarifdan pastga tushib bo'lmaydi.\n"
            "Muddati tugagach yangilash mumkin.",
            reply_markup=_get_main_keyboard(),
        )
        return WAITING_PHONE

    # Premium foydalanuvchi: faqat Pro ga o'tish taklifi
    if cur_plan == "premium":
        keyboard = [
            [InlineKeyboardButton("💎 Pro ga o'tish", callback_data="premium_plan:pro")],
            [InlineKeyboardButton("❌ Bekor qilish", callback_data="premium_plan:menu")],
        ]
        await update.message.reply_html(
            f"⭐ <b>Sizda Premium tarifi bor!</b>\n\n"
            f"📅 Muddati: <b>{end_date}</b>\n"
            f"⏳ Qoldi: <b>{days_left} kun</b>\n\n"
            f"💎 <b>Pro</b> ga yangilash uchun — {pro_price} UZS / oy\n\n"
            "Faqat Pro ga o'tish mumkin (Premium → Pro).",
            reply_markup=InlineKeyboardMarkup(keyboard),
        )
        return WAITING_PHONE

    # Free foydalanuvchi: barcha tariflar
    keyboard = [
        [
            InlineKeyboardButton(f"⭐ Premium — {premium_price} UZS", callback_data="premium_plan:premium"),
            InlineKeyboardButton(f"💎 Pro — {pro_price} UZS", callback_data="premium_plan:pro"),
        ],
        [InlineKeyboardButton("❌ Bekor qilish", callback_data="premium_plan:menu")],
    ]
    await update.message.reply_html(
        f"⭐ <b>Premium tarifini tanlang</b>\n\n"
        f"1️⃣ <b>Premium</b> — {premium_price} UZS / oy\n"
        f"   • Komissiya: 8%\n"
        f"   • 3x ko'rinish\n\n"
        f"2️⃣ <b>Pro</b> — {pro_price} UZS / oy\n"
        f"   • Komissiya: 5%\n"
        f"   • Top pozitsiya\n\n"
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
        elif result.get("error") == "downgrade_not_allowed":
            days_left = result.get("days_left", "?")
            end_date = result.get("end_date", "")
            await query.edit_message_text(
                f"⚠️ <b>Pro tarifdan Premium ga tushib bo'lmaydi!</b>\n\n"
                f"📅 Pro muddati: <b>{end_date}</b>\n"
                f"⏳ Qoldi: <b>{days_left} kun</b>\n\n"
                f"Muddati tugagach yangi tarif olishingiz mumkin.",
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
    """Xisobni to'ldirish: avval summa, keyin skrinshot so'rash."""
    telegram_id = update.effective_user.id
    result = await get_telegram_profile_via_api(telegram_id)
    balance = "0"
    if result and result.get("success") and result.get("has_account"):
        balance = result.get("data", {}).get("balance", "0")
    card_line = f"\n💳 To'lov kartasi: <code>{ADMIN_CARD_NUMBER}</code>" if ADMIN_CARD_NUMBER else ""
    await update.message.reply_html(
        f"💰 <b>Hisobni to'ldirish</b>\n\n"
        f"Joriy balans: <b>{balance} UZS</b>{card_line}\n\n"
        "Qancha summa to'lamoqchisiz? Raqamni kiriting (masalan: <code>50000</code>)\n\n"
        "❌ Bekor qilish: /cancel"
    )
    return WAITING_TOPUP_AMOUNT


async def _receive_topup_amount(update: Update, context: ContextTypes.DEFAULT_TYPE) -> int:
    """Topup summasi qabul qilinadi va skrinshot so'raladi."""
    text = (update.message.text or "").strip()
    # Menyu tugmalarini ushlash
    if text in (BTN_MY_ACCOUNT, BTN_PREMIUM, BTN_TOPUP, BTN_WITHDRAW):
        state = await _handle_menu_button(update, context, text)
        return state if state is not None else WAITING_PHONE

    cleaned = text.replace(" ", "").replace(",", "")
    if not cleaned.isdigit() or int(cleaned) <= 0:
        await update.message.reply_text(
            "❌ Summani faqat raqamda yozing (masalan: 50000)\n/cancel — bekor qilish"
        )
        return WAITING_TOPUP_AMOUNT

    amount = int(cleaned)
    context.user_data["topup_amount"] = amount
    card_line = f"\n💳 To'lov kartasi: <code>{ADMIN_CARD_NUMBER}</code>" if ADMIN_CARD_NUMBER else ""
    await update.message.reply_html(
        f"✅ Summa: <b>{amount:,} UZS</b>\n"
        f"{card_line}\n\n"
        "Kartaga pul o'tkazgach, to'lov <b>skrinshot</b>ini yuboring. Admin tekshiradi.\n\n"
        "❌ Bekor qilish: /cancel"
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
        if text in (BTN_MY_ACCOUNT, BTN_PREMIUM, BTN_TOPUP, BTN_WITHDRAW, BTN_SUPPORT):
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
            "✅ Yuqoridagi kodni saytda telefon raqam bilan birga kiriting.\n\n"
            "📱 Yangi kod olish uchun telefon raqamni yuboring.",
            reply_markup=_get_main_keyboard(),
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
    tg_user = update.effective_user
    tg_username = f"@{tg_user.username}" if tg_user.username else "—"
    phone_number = context.user_data.get("phone", "—")
    amount = context.user_data.get("topup_amount")
    amount_str = f"{amount:,} UZS" if amount else "Noma'lum"

    # Vaqt — O'zbekiston vaqti (UTC+5)
    import datetime as _dt
    sent_time = _dt.datetime.now(_dt.timezone.utc).strftime("%Y-%m-%d %H:%M UTC")

    result = await get_telegram_profile_via_api(telegram_id)
    site_username = ""
    if result and result.get("has_account"):
        site_username = result.get("data", {}).get("username", "")

    caption = (
        f"💰 <b>Hisobni to'ldirish so'rovi</b>\n"
        f"━━━━━━━━━━━━━━━━━━━━\n"
        f"👤 Sayt username: <b>{site_username or '—'}</b>\n"
        f"🆔 Telegram ID: <code>{telegram_id}</code>\n"
        f"📱 Telegram: <b>{tg_username}</b>\n"
        f"📞 Telefon: <b>{phone_number}</b>\n"
        f"💰 To'lov summasi: <b>{amount_str}</b>\n"
        f"⏰ Yuborilgan vaqt: {sent_time}"
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

    # Backend ga so'rovni saqlash (DepositRequest)
    if BOT_SECRET_KEY and _AIOHTTP_AVAILABLE:
        try:
            tg_file = await context.bot.get_file(file_id)
            file_bytes = await tg_file.download_as_bytearray()
            url = f"{WEBSITE_URL}/api/v1/payments/telegram/deposit-request/"
            form_data = _aiohttp.FormData()
            form_data.add_field("secret_key", BOT_SECRET_KEY)
            form_data.add_field("telegram_id", str(telegram_id))
            form_data.add_field("telegram_username", tg_user.username or "")
            form_data.add_field("phone_number", context.user_data.get("phone", ""))
            if amount:
                form_data.add_field("amount", str(amount))
            form_data.add_field(
                "screenshot",
                bytes(file_bytes),
                filename="screenshot.jpg",
                content_type="image/jpeg",
            )
            async with _aiohttp.ClientSession() as session:
                async with session.post(
                    url, data=form_data, timeout=_aiohttp.ClientTimeout(total=20)
                ) as resp:
                    if resp.status not in (200, 201):
                        raw = await resp.text()
                        logger.warning("DepositRequest saqlashda xato %s: %s", resp.status, raw[:200])
        except Exception as e:
            logger.warning("DepositRequest backend ga saqlanmadi: %s", e)

    context.user_data.pop("topup_amount", None)
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

    # Bot data da karta va summa saqlab qo'yamiz (callback uchun)
    context.bot_data[f"withdraw_{telegram_id}"] = {"card": card, "amount": amount}

    keyboard = InlineKeyboardMarkup([[
        InlineKeyboardButton("✅ Pul o'tkazildi", callback_data=f"withdraw_paid:{telegram_id}"),
        InlineKeyboardButton("❌ Rad etish", callback_data=f"withdraw_reject:{telegram_id}"),
    ]])

    sent_msgs = []
    for target in _notification_targets():
        try:
            msg = await context.bot.send_message(
                target,
                f"💸 <b>Hisobdan pul yechish so'rovi</b>\n\n"
                f"👤 Sayt username: <b>{username}</b>\n"
                f"🆔 Telegram ID: <code>{telegram_id}</code>\n"
                f"📊 <b>Hisobdagi balans: {balance} UZS</b>\n"
                f"💰 So'ralgan summa: <b>{amount} UZS</b>\n"
                f"💳 Karta raqami: <code>{card}</code>",
                parse_mode="HTML",
                reply_markup=keyboard,
            )
            sent_msgs.append((target, msg.message_id))
        except Exception as e:
            logger.warning("Admin %s ga xabar yuborilmadi: %s", target, e)

    # Barcha admin xabarlarini keyinchalik yangilash uchun saqlaymiz
    if sent_msgs:
        context.bot_data[f"admin_msgs_withdraw:{telegram_id}"] = sent_msgs
    await update.message.reply_html(
        "✅ So'rovingiz qabul qilindi. Admin tekshiradi va pul o'tkazilgach xabar beramiz.",
        reply_markup=_get_main_keyboard(),
    )
    return WAITING_PHONE


async def _cb_withdraw_paid(update: Update, context: ContextTypes.DEFAULT_TYPE) -> None:
    """Admin: pul o'tkazilganligini tasdiqlash — balans ayiriladi, foydalanuvchiga xabar."""
    query = update.callback_query
    if not _is_admin(query.from_user.id):
        await query.answer("⛔ Ruxsat yo'q.", show_alert=True)
        return
    await query.answer()

    telegram_id = int(query.data.replace("withdraw_paid:", "", 1))
    info = context.bot_data.pop(f"withdraw_{telegram_id}", {})
    card = info.get("card", "—")
    amount_str = info.get("amount", "?")
    admin_tag = f"@{query.from_user.username}" if query.from_user.username else str(query.from_user.id)

    # Admin xabarini yangilash
    orig_text = query.message.text or ""
    new_text = (
        orig_text
        + f"\n\n━━━━━━━━━━━━━━━━━━━━\n"
        f"✅ <b>PUL O'TKAZILDI</b> ({admin_tag})\n"
        f"💳 Karta: <code>{card}</code> ga <b>{amount_str} UZS</b> o'tkazildi."
    )
    try:
        await query.edit_message_text(new_text, parse_mode="HTML", reply_markup=None)
    except Exception:
        pass

    # Boshqa adminlarga yuborilgan xabarlarni ham yangilash
    sent_msgs: list = context.bot_data.pop(f"admin_msgs_withdraw:{telegram_id}", [])
    for chat_id, msg_id in sent_msgs:
        if chat_id == query.message.chat_id and msg_id == query.message.message_id:
            continue
        try:
            await context.bot.edit_message_text(
                chat_id=chat_id,
                message_id=msg_id,
                text=new_text,
                parse_mode="HTML",
                reply_markup=None,
            )
        except Exception:
            pass

    # Balansdan ayirish
    try:
        amount_int = int(float(amount_str.replace(" ", "").replace(",", "")))
    except (ValueError, AttributeError):
        amount_int = 0

    if amount_int > 0:
        status_code, data = await _deduct_user_balance_api(telegram_id, amount_int)
        new_balance = data.get("new_balance", "?") if status_code == 200 else None
    else:
        new_balance = None

    # Foydalanuvchiga xabar
    balance_line = f"📊 Yangi balans: <b>{new_balance} UZS</b>\n" if new_balance else ""
    try:
        await context.bot.send_message(
            telegram_id,
            f"✅ <b>Pul muvaffaqiyatli o'tkazildi!</b>\n\n"
            f"💰 Summa: <b>{amount_str} UZS</b>\n"
            f"💳 Karta: <code>{card}</code>\n"
            f"{balance_line}\n"
            f"Agar pul tushmagan bo'lsa, admin bilan bog'laning.",
            parse_mode="HTML",
        )
    except Exception as e:
        logger.warning("Foydalanuvchi %s ga xabar yuborilmadi: %s", telegram_id, e)


async def _cb_withdraw_reject(update: Update, context: ContextTypes.DEFAULT_TYPE) -> None:
    """Admin: pul yechish so'rovini rad etish va foydalanuvchiga xabar."""
    query = update.callback_query
    if not _is_admin(query.from_user.id):
        await query.answer("⛔ Ruxsat yo'q.", show_alert=True)
        return
    await query.answer("❌ Rad etildi.")

    telegram_id = int(query.data.replace("withdraw_reject:", "", 1))
    info = context.bot_data.pop(f"withdraw_{telegram_id}", {})
    card = info.get("card", "—")
    amount_str = info.get("amount", "?")
    admin_tag = f"@{query.from_user.username}" if query.from_user.username else str(query.from_user.id)

    orig_text = query.message.text or ""
    new_text = (
        orig_text
        + f"\n\n━━━━━━━━━━━━━━━━━━━━\n"
        f"❌ <b>RAD ETILDI</b> ({admin_tag})"
    )
    try:
        await query.edit_message_text(new_text, parse_mode="HTML", reply_markup=None)
    except Exception:
        pass

    # Boshqa adminlarga
    sent_msgs: list = context.bot_data.pop(f"admin_msgs_withdraw:{telegram_id}", [])
    for chat_id, msg_id in sent_msgs:
        if chat_id == query.message.chat_id and msg_id == query.message.message_id:
            continue
        try:
            await context.bot.edit_message_text(
                chat_id=chat_id,
                message_id=msg_id,
                text=new_text,
                parse_mode="HTML",
                reply_markup=None,
            )
        except Exception:
            pass

    # Foydalanuvchiga xabar
    try:
        await context.bot.send_message(
            telegram_id,
            f"❌ <b>Pul yechish so'rovi rad etildi.</b>\n\n"
            f"💰 Summa: <b>{amount_str} UZS</b>\n"
            f"💳 Karta: <code>{card}</code>\n\n"
            f"Batafsil ma'lumot uchun admin bilan bog'laning.",
            parse_mode="HTML",
        )
    except Exception as e:
        logger.warning("Foydalanuvchi %s ga xabar yuborilmadi: %s", telegram_id, e)


async def _cancel_to_menu(update: Update, context: ContextTypes.DEFAULT_TYPE) -> int:
    """Joriy oqimni bekor qilib asosiy menyuga qaytish."""
    context.user_data.pop("premium_plan", None)
    context.user_data.pop("withdraw_amount", None)
    await update.message.reply_html("⬅️ Bekor qilindi.", reply_markup=_get_main_keyboard())
    return WAITING_PHONE


async def _fallback_menu_buttons(update: Update, context: ContextTypes.DEFAULT_TYPE) -> int:
    """Har qanday holatda menyu tugmalarini ushlash (fallback)."""
    text = (update.message.text or "").strip()
    if text in (BTN_MY_ACCOUNT, BTN_PREMIUM, BTN_TOPUP, BTN_WITHDRAW, BTN_SUPPORT):
        context.user_data.pop("premium_plan", None)
        context.user_data.pop("withdraw_amount", None)
        context.user_data.pop("support_chat_id", None)
        context.user_data.pop("support_msg_id", None)
        state = await _handle_menu_button(update, context, text)
        return state if state is not None else WAITING_PHONE
    return WAITING_PHONE


async def _confirming_text_fallback(update: Update, context: ContextTypes.DEFAULT_TYPE) -> int:
    """CONFIRMING holatida foydalanuvchi matn yozsa — eslatma berish."""
    text = (update.message.text or "").strip()
    # Menyu tugmalarini ushlash
    if text in (BTN_MY_ACCOUNT, BTN_PREMIUM, BTN_TOPUP, BTN_WITHDRAW, BTN_SUPPORT):
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
    payment_line = "\n💰 <b>To'lov paneli</b> �� hisobni to'ldirish (WebApp)\n" if PAYMENT_ENABLED else ""
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
        f"4. <a href='{REGISTER_URL}'>Saytda</a> telefon + kodni kiriting"
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


async def _admin_panel_text_and_kb():
    """Admin panel uchun matn va klaviatura tayyorlash."""
    import django
    try:
        django.setup()
    except Exception:
        pass
    from django.contrib.auth import get_user_model
    from apps.payments.models import EscrowTransaction, WithdrawalRequest, SellerVerification
    User = get_user_model()

    total_users = User.objects.filter(is_active=True).count()
    tg_users = User.objects.filter(telegram_id__isnull=False, is_active=True).count()
    active_trades = EscrowTransaction.objects.filter(status__in=['paid', 'delivered']).count()
    pending_withdrawals = WithdrawalRequest.objects.filter(status='pending').count()
    pending_verifications = SellerVerification.objects.filter(
        status__in=['submitted', 'pending', 'passport_front_received', 'passport_back_received', 'video_received']
    ).count()
    completed_trades = EscrowTransaction.objects.filter(status='confirmed').count()
    bot_users = len(_load_users())

    # Bugungi start
    from django.utils import timezone
    today_start = timezone.now().replace(hour=0, minute=0, second=0, microsecond=0)
    today_new = User.objects.filter(date_joined__gte=today_start).count()

    text = (
        "🛠 <b>ADMIN PANEL</b>\n"
        "━━━━━━━━━━━━━━━━━━━━\n\n"
        f"👥 Jami foydalanuvchilar: <b>{total_users}</b>\n"
        f"📱 Telegram ulangan: <b>{tg_users}</b>\n"
        f"🤖 Bot foydalanuvchilari: <b>{bot_users}</b>\n"
        f"🆕 Bugungi yangi: <b>{today_new}</b>\n\n"
        f"📦 Aktiv savdolar: <b>{active_trades}</b>\n"
        f"✅ Yakunlangan savdolar: <b>{completed_trades}</b>\n"
        f"💳 Pul yechish so'rovlari: <b>{pending_withdrawals}</b>\n"
        f"🔐 Verifikatsiya so'rovlari: <b>{pending_verifications}</b>\n"
    )
    keyboard = {
        "inline_keyboard": [
            [
                {"text": f"📦 Savdolar ({active_trades})", "callback_data": "admpanel:trades"},
                {"text": f"💳 Pul yechish ({pending_withdrawals})", "callback_data": "admpanel:withdrawals"},
            ],
            [
                {"text": f"🔐 Verifikatsiya ({pending_verifications})", "callback_data": "admpanel:verifications"},
                {"text": "👤 Foydalanuvchi qidirish", "callback_data": "admpanel:usersearch"},
            ],
            [
                {"text": "📊 Statistika", "callback_data": "admpanel:stats"},
                {"text": "🤖 Bot statistikasi", "callback_data": "admpanel:botstats"},
            ],
            [
                {"text": "📢 Broadcast xabar", "callback_data": "admpanel:broadcast"},
            ],
        ]
    }
    return text, keyboard


async def cmd_admin_panel(update: Update, context: ContextTypes.DEFAULT_TYPE) -> None:
    """Admin: interaktiv panel (/admin)."""
    if not _is_admin(update.effective_user.id):
        return
    text, keyboard = await _admin_panel_text_and_kb()
    await update.message.reply_html(text, reply_markup=InlineKeyboardMarkup(
        keyboard["inline_keyboard"]
    ))


async def _cb_admin_panel_back(update: Update, context: ContextTypes.DEFAULT_TYPE) -> None:
    """Admin panelga qaytish."""
    query = update.callback_query
    await query.answer()
    text, keyboard = await _admin_panel_text_and_kb()
    await query.edit_message_text(text, parse_mode="HTML", reply_markup=InlineKeyboardMarkup(
        keyboard["inline_keyboard"]
    ))


async def _cb_admin_trades(update: Update, context: ContextTypes.DEFAULT_TYPE) -> None:
    """Aktiv savdolar ro'yxati."""
    query = update.callback_query
    await query.answer()
    from apps.payments.models import EscrowTransaction
    trades = (
        EscrowTransaction.objects
        .filter(status__in=['paid', 'delivered', 'disputed'])
        .select_related('listing', 'buyer', 'seller')
        .order_by('-created_at')[:10]
    )
    if not trades:
        text = "📦 <b>Aktiv savdolar</b>\n\n✅ Hozircha aktiv savdo yo'q."
    else:
        lines = ["📦 <b>Aktiv savdolar</b> (oxirgi 10 ta)\n━━━━━━━━━━━━━━━━━━━━\n"]
        status_emoji = {'paid': '💰', 'delivered': '📬', 'disputed': '⚠️'}
        for t in trades:
            emoji = status_emoji.get(t.status, '❓')
            buyer_name = t.buyer.display_name if t.buyer else '?'
            seller_name = t.seller.display_name if t.seller else '?'
            title = t.listing.title[:25] if t.listing else '?'
            amount = f"{int(t.amount):,}".replace(",", " ")
            lines.append(
                f"{emoji} <b>{title}</b>\n"
                f"   💰 {amount} | {t.status}\n"
                f"   👤 {buyer_name} → {seller_name}\n"
            )
        text = "\n".join(lines)
    kb = InlineKeyboardMarkup([[
        {"text": "🔙 Orqaga", "callback_data": "admpanel:back"},
    ]])
    await query.edit_message_text(text, parse_mode="HTML", reply_markup=kb)


async def _cb_admin_withdrawals(update: Update, context: ContextTypes.DEFAULT_TYPE) -> None:
    """Pul yechish so'rovlari."""
    query = update.callback_query
    await query.answer()
    from apps.payments.models import WithdrawalRequest
    pending = (
        WithdrawalRequest.objects
        .filter(status='pending')
        .select_related('user')
        .order_by('-created_at')[:10]
    )
    if not pending:
        text = "💳 <b>Pul yechish so'rovlari</b>\n\n✅ Kutilayotgan so'rov yo'q."
        kb = InlineKeyboardMarkup([[{"text": "🔙 Orqaga", "callback_data": "admpanel:back"}]])
    else:
        lines = [f"💳 <b>Pul yechish so'rovlari</b> ({pending.count()} ta)\n━━━━━━━━━━━━━━━━━━━━\n"]
        buttons = []
        for w in pending:
            uname = w.user.display_name if w.user else '?'
            amount = f"{int(w.amount):,}".replace(",", " ")
            card = w.card_number[-4:] if w.card_number else '****'
            tg_id = w.user.telegram_id if w.user else '?'
            lines.append(
                f"👤 <b>{uname}</b> (TG: <code>{tg_id}</code>)\n"
                f"   💰 {amount} so'm → {w.card_type} ****{card}\n"
                f"   📛 {w.card_holder_name}\n"
            )
            wid = str(w.id)[:8]
            buttons.append([
                {"text": f"✅ {uname} — {amount}", "callback_data": f"adm_w_detail:{w.id}"},
            ])
        text = "\n".join(lines)
        buttons.append([{"text": "🔙 Orqaga", "callback_data": "admpanel:back"}])
        kb = InlineKeyboardMarkup(buttons)
    await query.edit_message_text(text, parse_mode="HTML", reply_markup=kb)


async def _cb_admin_withdrawal_detail(update: Update, context: ContextTypes.DEFAULT_TYPE) -> None:
    """Bitta pul yechish so'rovi tafsilotlari."""
    query = update.callback_query
    await query.answer()
    wid = query.data.split(":", 1)[1]
    from apps.payments.models import WithdrawalRequest
    from apps.payments.models import EscrowTransaction
    try:
        w = WithdrawalRequest.objects.select_related('user').get(pk=wid)
    except WithdrawalRequest.DoesNotExist:
        await query.edit_message_text("❌ So'rov topilmadi.", reply_markup=InlineKeyboardMarkup(
            [[{"text": "🔙 Orqaga", "callback_data": "admpanel:withdrawals"}]]
        ))
        return

    user = w.user
    total_sales = EscrowTransaction.objects.filter(seller=user, status='confirmed').count()
    total_earned = EscrowTransaction.objects.filter(seller=user, status='confirmed').aggregate(
        total=__import__('django').db.models.Sum('seller_earnings')
    )['total'] or 0
    balance = f"{int(user.balance):,}".replace(",", " ") if hasattr(user, 'balance') else '?'
    amount = f"{int(w.amount):,}".replace(",", " ")

    text = (
        f"💳 <b>Pul yechish so'rovi</b>\n"
        f"━━━━━━━━━━━━━━━━━━━━\n\n"
        f"👤 <b>{user.display_name}</b>\n"
        f"🆔 Telegram: <code>{user.telegram_id or '—'}</code>\n"
        f"📧 Email: {user.email}\n"
        f"📱 Telefon: {user.phone_number or '—'}\n\n"
        f"💰 So'rov: <b>{amount} so'm</b>\n"
        f"💳 Karta: {w.card_type} <code>{w.card_number}</code>\n"
        f"📛 Karta egasi: {w.card_holder_name}\n\n"
        f"📊 <b>Foydalanuvchi statistikasi:</b>\n"
        f"   💼 Joriy balans: {balance} so'm\n"
        f"   📦 Sotilgan akkauntlar: {total_sales} ta\n"
        f"   💵 Jami daromad: {int(total_earned):,} so'm\n".replace(",", " ")
    )
    kb = InlineKeyboardMarkup([
        [
            {"text": "✅ Tasdiqlash", "callback_data": f"withdraw_paid:{w.id}"},
            {"text": "❌ Rad etish", "callback_data": f"withdraw_reject:{w.id}"},
        ],
        [{"text": "🔙 So'rovlar ro'yxati", "callback_data": "admpanel:withdrawals"}],
    ])
    await query.edit_message_text(text, parse_mode="HTML", reply_markup=kb)


async def _cb_admin_verifications(update: Update, context: ContextTypes.DEFAULT_TYPE) -> None:
    """Verifikatsiya so'rovlari."""
    query = update.callback_query
    await query.answer()
    from apps.payments.models import SellerVerification
    pending = (
        SellerVerification.objects
        .filter(status__in=['submitted', 'pending', 'passport_front_received', 'passport_back_received', 'video_received'])
        .select_related('seller', 'escrow', 'escrow__listing')
        .order_by('-created_at')[:10]
    )
    if not pending:
        text = "🔐 <b>Verifikatsiya so'rovlari</b>\n\n✅ Kutilayotgan so'rov yo'q."
        kb = InlineKeyboardMarkup([[{"text": "🔙 Orqaga", "callback_data": "admpanel:back"}]])
    else:
        lines = [f"🔐 <b>Verifikatsiya so'rovlari</b> ({pending.count()} ta)\n━━━━━━━━━━━━━━━━━━━━\n"]
        buttons = []
        for v in pending:
            sname = v.seller.display_name if v.seller else '?'
            listing_title = v.escrow.listing.title[:20] if v.escrow and v.escrow.listing else '?'
            status_label = {
                'submitted': '📨 Yuborildi',
                'pending': '⏳ Kutilmoqda',
                'passport_front_received': '📸 Old qism',
                'passport_back_received': '📸 Orqa qism',
                'video_received': '🎥 Video',
            }.get(v.status, v.status)
            lines.append(
                f"👤 <b>{sname}</b> — {listing_title}\n"
                f"   {status_label} | F.I.SH: {v.full_name or '—'}\n"
            )
            buttons.append([
                {"text": f"📋 {sname} — {listing_title}", "callback_data": f"adm_v_detail:{v.id}"},
            ])
        text = "\n".join(lines)
        buttons.append([{"text": "🔙 Orqaga", "callback_data": "admpanel:back"}])
        kb = InlineKeyboardMarkup(buttons)
    await query.edit_message_text(text, parse_mode="HTML", reply_markup=kb)


async def _cb_admin_verification_detail(update: Update, context: ContextTypes.DEFAULT_TYPE) -> None:
    """Bitta verifikatsiya tafsilotlari — hujjatlarni ko'rish."""
    query = update.callback_query
    await query.answer()
    vid = query.data.split(":", 1)[1]
    from apps.payments.models import SellerVerification
    try:
        v = SellerVerification.objects.select_related('seller', 'escrow', 'escrow__listing').get(pk=vid)
    except SellerVerification.DoesNotExist:
        await query.edit_message_text("❌ Topilmadi.", reply_markup=InlineKeyboardMarkup(
            [[{"text": "🔙 Orqaga", "callback_data": "admpanel:verifications"}]]
        ))
        return

    seller = v.seller
    listing = v.escrow.listing if v.escrow else None
    lat = v.location_latitude
    lng = v.location_longitude
    loc_str = f"{lat:.5f}, {lng:.5f}" if lat and lng else "—"
    maps_url = f"https://maps.google.com/?q={lat},{lng}" if lat and lng else ""

    text = (
        f"🔐 <b>Verifikatsiya tafsilotlari</b>\n"
        f"━━━━━━━━━━━━━━━━━━━━\n\n"
        f"👤 Sotuvchi: <b>{seller.display_name}</b>\n"
        f"📝 F.I.SH: <b>{v.full_name or '—'}</b>\n"
        f"🆔 Telegram: <code>{seller.telegram_id or '—'}</code>\n"
        f"📧 Email: {seller.email}\n\n"
        f"📦 Akkaunt: <b>{listing.title if listing else '—'}</b>\n"
        f"📍 Joylashuv: {loc_str}\n"
    )
    if maps_url:
        text += f"🗺 <a href='{maps_url}'>Xaritada ko'rish</a>\n"
    text += (
        f"\n📸 Pasport old: {'✅ bor' if v.passport_front_file_id else '❌ yo`q'}\n"
        f"📸 Pasport orqa: {'✅ bor' if v.passport_back_file_id else '❌ yo`q'}\n"
        f"🎥 Video: {'✅ bor' if v.circle_video_file_id else '❌ yo`q'}\n"
        f"📍 Joylashuv: {'✅ bor' if lat else '❌ yo`q'}\n"
    )
    buttons = []
    if v.passport_front_file_id:
        buttons.append([{"text": "📸 Pasport old tomonini ko'rish", "callback_data": f"adm_v_doc:front:{v.id}"}])
    if v.passport_back_file_id:
        buttons.append([{"text": "📸 Pasport orqa tomonini ko'rish", "callback_data": f"adm_v_doc:back:{v.id}"}])
    if v.circle_video_file_id:
        buttons.append([{"text": "🎥 Videoni ko'rish", "callback_data": f"adm_v_doc:video:{v.id}"}])
    buttons.append([
        {"text": "✅ Tasdiqlash", "callback_data": f"verify_approve:{v.id}"},
        {"text": "❌ Rad etish", "callback_data": f"verify_reject:{v.id}"},
    ])
    buttons.append([{"text": "🔙 Verifikatsiyalar", "callback_data": "admpanel:verifications"}])
    kb = InlineKeyboardMarkup(buttons)
    await query.edit_message_text(text, parse_mode="HTML", reply_markup=kb, disable_web_page_preview=True)


async def _cb_admin_view_doc(update: Update, context: ContextTypes.DEFAULT_TYPE) -> None:
    """Verifikatsiya hujjatini ko'rsatish (rasm/video)."""
    query = update.callback_query
    await query.answer()
    parts = query.data.split(":")  # adm_v_doc:front:uuid
    if len(parts) < 3:
        return
    doc_type = parts[1]
    vid = parts[2]
    from apps.payments.models import SellerVerification
    try:
        v = SellerVerification.objects.get(pk=vid)
    except SellerVerification.DoesNotExist:
        return

    back_kb = InlineKeyboardMarkup([[{"text": "🔙 Orqaga", "callback_data": f"adm_v_detail:{vid}"}]])
    bot = context.bot
    chat_id = query.message.chat_id

    if doc_type == "front" and v.passport_front_file_id:
        await bot.send_photo(chat_id, v.passport_front_file_id, caption=f"📸 Pasport OLD tomoni\n👤 {v.full_name or '—'}", reply_markup=back_kb)
    elif doc_type == "back" and v.passport_back_file_id:
        await bot.send_photo(chat_id, v.passport_back_file_id, caption="📸 Pasport ORQA tomoni", reply_markup=back_kb)
    elif doc_type == "video" and v.circle_video_file_id:
        try:
            await bot.send_video_note(chat_id, v.circle_video_file_id)
        except Exception:
            await bot.send_video(chat_id, v.circle_video_file_id, caption="🎥 Verifikatsiya video")
        await bot.send_message(chat_id, "🔙 Orqaga qaytish:", reply_markup=back_kb)
    else:
        await bot.send_message(chat_id, "❌ Fayl topilmadi.", reply_markup=back_kb)


async def _cb_admin_usersearch(update: Update, context: ContextTypes.DEFAULT_TYPE) -> None:
    """Foydalanuvchi qidirish — telegram_id so'rash."""
    query = update.callback_query
    await query.answer()
    context.user_data["admin_awaiting_user_search"] = True
    await query.edit_message_text(
        "👤 <b>Foydalanuvchi qidirish</b>\n\n"
        "Foydalanuvchining <b>Telegram ID</b> raqamini yuboring:\n\n"
        "Misol: <code>7947969825</code>",
        parse_mode="HTML",
        reply_markup=InlineKeyboardMarkup([[{"text": "🔙 Orqaga", "callback_data": "admpanel:back"}]]),
    )


async def _admin_user_search_handler(update: Update, context: ContextTypes.DEFAULT_TYPE) -> None:
    """Admin foydalanuvchi qidirish — matn orqali telegram_id qabul qilish."""
    if not _is_admin(update.effective_user.id):
        return
    if not context.user_data.get("admin_awaiting_user_search"):
        return
    context.user_data["admin_awaiting_user_search"] = False

    text_input = (update.message.text or "").strip()
    if not text_input.isdigit():
        await update.message.reply_html(
            "⚠️ Faqat raqam kiriting (Telegram ID).\n\nQayta urinib ko'ring yoki /admin bosing."
        )
        return

    tg_id = int(text_input)
    await _show_user_profile(update.message, tg_id)


async def _show_user_profile(message, tg_id: int) -> None:
    """Foydalanuvchi profilini ko'rsatish."""
    from django.contrib.auth import get_user_model
    from apps.payments.models import EscrowTransaction, WithdrawalRequest, SellerVerification
    from django.db.models import Sum

    User = get_user_model()
    try:
        user = User.objects.get(telegram_id=tg_id)
    except User.DoesNotExist:
        await message.reply_html(
            f"❌ Telegram ID <code>{tg_id}</code> bilan foydalanuvchi topilmadi.",
            reply_markup=InlineKeyboardMarkup([[{"text": "🔙 Admin panel", "callback_data": "admpanel:back"}]]),
        )
        return

    # Statistikalar
    total_purchases = EscrowTransaction.objects.filter(buyer=user, status='confirmed').count()
    total_sales = EscrowTransaction.objects.filter(seller=user, status='confirmed').count()
    total_earned = EscrowTransaction.objects.filter(seller=user, status='confirmed').aggregate(
        t=Sum('seller_earnings'))['t'] or 0
    total_spent = EscrowTransaction.objects.filter(buyer=user, status='confirmed').aggregate(
        t=Sum('amount'))['t'] or 0
    active_trades = EscrowTransaction.objects.filter(
        seller=user, status__in=['paid', 'delivered']
    ).count() + EscrowTransaction.objects.filter(
        buyer=user, status__in=['paid', 'delivered']
    ).count()
    withdrawals = WithdrawalRequest.objects.filter(user=user).count()
    pending_withdrawals = WithdrawalRequest.objects.filter(user=user, status='pending').count()
    verifications = SellerVerification.objects.filter(seller=user).count()
    balance = f"{int(user.balance):,}".replace(",", " ") if hasattr(user, 'balance') else '?'
    earned_str = f"{int(total_earned):,}".replace(",", " ")
    spent_str = f"{int(total_spent):,}".replace(",", " ")

    text = (
        f"👤 <b>Foydalanuvchi profili</b>\n"
        f"━━━━━━━━━━━━━━━━━━━━\n\n"
        f"📛 Ism: <b>{user.display_name}</b>\n"
        f"📧 Email: {user.email}\n"
        f"📱 Telefon: {user.phone_number or '—'}\n"
        f"🆔 Telegram: <code>{tg_id}</code>\n"
        f"📅 Ro'yxatdan o'tgan: {user.date_joined.strftime('%d.%m.%Y')}\n"
        f"{'🟢' if user.is_active else '🔴'} Status: {'Aktiv' if user.is_active else 'Bloklangan'}\n"
        f"{'👑' if user.is_staff else '👤'} Rol: {'Admin' if user.is_staff else 'Foydalanuvchi'}\n\n"
        f"━━━ <b>Moliyaviy</b> ━━━\n"
        f"💼 Balans: <b>{balance} so'm</b>\n"
        f"💵 Jami daromad: {earned_str} so'm\n"
        f"🛒 Jami xarajat: {spent_str} so'm\n\n"
        f"━━━ <b>Savdo tarixi</b> ━━━\n"
        f"📦 Sotilgan: <b>{total_sales}</b> ta akkaunt\n"
        f"🛒 Sotib olingan: <b>{total_purchases}</b> ta\n"
        f"⏳ Aktiv savdolar: {active_trades} ta\n\n"
        f"━━━ <b>Boshqa</b> ━━━\n"
        f"💳 Pul yechish so'rovlari: {withdrawals} ta ({pending_withdrawals} kutilmoqda)\n"
        f"🔐 Verifikatsiyalar: {verifications} ta\n"
    )
    kb = InlineKeyboardMarkup([
        [{"text": "🔙 Admin panel", "callback_data": "admpanel:back"}],
    ])
    await message.reply_html(text, reply_markup=kb)


async def _cb_admin_stats(update: Update, context: ContextTypes.DEFAULT_TYPE) -> None:
    """Moliyaviy statistika."""
    query = update.callback_query
    await query.answer()
    from apps.payments.models import EscrowTransaction, Transaction, WithdrawalRequest
    from django.db.models import Sum, Count
    from django.utils import timezone

    total_volume = EscrowTransaction.objects.filter(status='confirmed').aggregate(t=Sum('amount'))['t'] or 0
    total_commission = EscrowTransaction.objects.filter(status='confirmed').aggregate(t=Sum('commission_amount'))['t'] or 0
    total_trades = EscrowTransaction.objects.count()
    confirmed_trades = EscrowTransaction.objects.filter(status='confirmed').count()
    disputed_trades = EscrowTransaction.objects.filter(status='disputed').count()
    refunded_trades = EscrowTransaction.objects.filter(status='refunded').count()
    total_withdrawn = WithdrawalRequest.objects.filter(status='completed').aggregate(t=Sum('amount'))['t'] or 0
    pending_withdrawn = WithdrawalRequest.objects.filter(status='pending').aggregate(t=Sum('amount'))['t'] or 0

    # Bugungi
    today = timezone.now().replace(hour=0, minute=0, second=0, microsecond=0)
    today_trades = EscrowTransaction.objects.filter(created_at__gte=today).count()
    today_volume = EscrowTransaction.objects.filter(created_at__gte=today, status='confirmed').aggregate(t=Sum('amount'))['t'] or 0

    def fmt(n):
        return f"{int(n):,}".replace(",", " ")

    text = (
        f"📊 <b>MOLIYAVIY STATISTIKA</b>\n"
        f"━━━━━━━━━━━━━━━━━━━━\n\n"
        f"💰 Jami savdo hajmi: <b>{fmt(total_volume)} so'm</b>\n"
        f"🏦 Jami komissiya: <b>{fmt(total_commission)} so'm</b>\n\n"
        f"📦 Jami savdolar: {total_trades}\n"
        f"   ✅ Yakunlangan: {confirmed_trades}\n"
        f"   ⚠️ Nizoli: {disputed_trades}\n"
        f"   ↩️ Qaytarilgan: {refunded_trades}\n\n"
        f"💳 Yechilgan: {fmt(total_withdrawn)} so'm\n"
        f"⏳ Kutilmoqda: {fmt(pending_withdrawn)} so'm\n\n"
        f"━━━ <b>Bugun</b> ━━━\n"
        f"📦 Savdolar: {today_trades}\n"
        f"💰 Hajm: {fmt(today_volume)} so'm\n"
    )
    kb = InlineKeyboardMarkup([[{"text": "🔙 Orqaga", "callback_data": "admpanel:back"}]])
    await query.edit_message_text(text, parse_mode="HTML", reply_markup=kb)


async def _cb_admin_botstats(update: Update, context: ContextTypes.DEFAULT_TYPE) -> None:
    """Bot statistikasi — kunlik start, OTP kodlari."""
    query = update.callback_query
    await query.answer()
    from django.contrib.auth import get_user_model
    from django.utils import timezone
    User = get_user_model()

    today = timezone.now().replace(hour=0, minute=0, second=0, microsecond=0)
    week_ago = timezone.now() - __import__('datetime').timedelta(days=7)
    month_ago = timezone.now() - __import__('datetime').timedelta(days=30)

    bot_users = _load_users()
    total_bot = len(bot_users)
    today_new = User.objects.filter(date_joined__gte=today).count()
    week_new = User.objects.filter(date_joined__gte=week_ago).count()
    month_new = User.objects.filter(date_joined__gte=month_ago).count()

    # OTP kodlari (verification_codes.json dan)
    codes_file = Path(__file__).parent / "verification_codes.json"
    total_codes = 0
    today_codes = 0
    if codes_file.exists():
        try:
            codes_data = json.loads(codes_file.read_text())
            total_codes = len(codes_data)
            # Bugungilarni sanash
            for _k, v in codes_data.items():
                if isinstance(v, dict) and v.get("created"):
                    try:
                        from datetime import datetime
                        ct = datetime.fromisoformat(v["created"])
                        if ct.date() == timezone.now().date():
                            today_codes += 1
                    except Exception:
                        pass
        except Exception:
            pass

    tg_linked = User.objects.filter(telegram_id__isnull=False, is_active=True).count()

    text = (
        f"🤖 <b>BOT STATISTIKASI</b>\n"
        f"━━━━━━━━━━━━━━━━━━━━\n\n"
        f"👥 Bot foydalanuvchilari: <b>{total_bot}</b>\n"
        f"📱 Telegram ulangan: <b>{tg_linked}</b>\n\n"
        f"━━━ <b>Yangi foydalanuvchilar</b> ━━━\n"
        f"🆕 Bugun: <b>{today_new}</b>\n"
        f"📅 Shu hafta: <b>{week_new}</b>\n"
        f"📆 Shu oy: <b>{month_new}</b>\n\n"
        f"━━━ <b>OTP kodlari</b> ━━━\n"
        f"🔑 Jami kodlar: <b>{total_codes}</b>\n"
        f"📅 Bugungi kodlar: <b>{today_codes}</b>\n"
    )
    kb = InlineKeyboardMarkup([[{"text": "🔙 Orqaga", "callback_data": "admpanel:back"}]])
    await query.edit_message_text(text, parse_mode="HTML", reply_markup=kb)


async def _cb_admin_broadcast_prompt(update: Update, context: ContextTypes.DEFAULT_TYPE) -> None:
    """Broadcast xabar yuborish — matn so'rash."""
    query = update.callback_query
    await query.answer()
    context.user_data["admin_awaiting_broadcast"] = True
    await query.edit_message_text(
        "📢 <b>Broadcast xabar</b>\n\n"
        "Barcha bot foydalanuvchilariga yuboriladigan xabarni yozing:\n\n"
        "⚠️ Xabar HTML formatida yuboriladi.",
        parse_mode="HTML",
        reply_markup=InlineKeyboardMarkup([[{"text": "🔙 Bekor qilish", "callback_data": "admpanel:back"}]]),
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



# ===== ESCROW (XARID TASDIQLASH) HANDLERLARI =====

async def _call_escrow_action_api(
    telegram_id: int, escrow_id: str, action: str, reason: str = ""
) -> tuple[bool, str]:
    """Backend API orqali escrow action yuborish."""
    if not BOT_SECRET_KEY:
        return False, "BOT_SECRET_KEY o'rnatilmagan"

    url = f"{WEBSITE_URL}/api/v1/auth/telegram/escrow/action/"
    payload: dict = {
        "secret_key": BOT_SECRET_KEY,
        "telegram_id": telegram_id,
        "escrow_id": escrow_id,
        "action": action,
    }
    if reason:
        payload["reason"] = reason

    if _AIOHTTP_AVAILABLE:
        try:
            async with _aiohttp.ClientSession() as session:
                async with session.post(
                    url, json=payload,
                    timeout=_aiohttp.ClientTimeout(total=15),
                ) as resp:
                    try:
                        data = await resp.json()
                    except Exception:
                        data = {}
                    ok = resp.status == 200 and data.get("success", False)
                    msg = data.get("message") or data.get("error") or ""
                    return ok, msg
        except Exception as e:
            logger.error("Escrow action API xato: %s", e)
            return False, f"Ulanish xatosi: {e}"
    return False, "aiohttp o'rnatilmagan"


async def _cb_escrow_seller_ok(update: Update, context: ContextTypes.DEFAULT_TYPE) -> None:
    """Sotuvchi: Akkauntni topshirdim ✅"""
    query = update.callback_query
    await query.answer()

    parts = query.data.split(":", 1)
    if len(parts) != 2:
        return
    escrow_id = parts[1]
    telegram_id = query.from_user.id

    await query.edit_message_reply_markup(reply_markup=None)
    wait_msg = await query.message.reply_text("⏳ Tekshirilmoqda...")

    ok, msg = await _call_escrow_action_api(telegram_id, escrow_id, "seller_confirm")

    await wait_msg.delete()
    if ok:
        await query.message.reply_text(
            "✅ <b>Tasdiqlandi!</b>\n\n"
            "Akkaunt topshirilganligi qayd etildi.\n"
            "Haridor akkauntni qabul qilishi bilanoq pul hisobingizga o'tkaziladi.\n\n"
            f"🌐 Saytga kiring: <a href='{SITE_URL}'>{SITE_URL}</a>",
            parse_mode="HTML",
            disable_web_page_preview=True,
        )
    else:
        err_text = msg or "Noma'lum xato"
        await query.message.reply_text(
            f"❌ <b>Xatolik yuz berdi</b>\n\n{err_text}\n\n"
            "Qayta urinib ko'ring yoki admin bilan bog'laning.",
            parse_mode="HTML",
        )


async def _cb_escrow_buyer_ok(update: Update, context: ContextTypes.DEFAULT_TYPE) -> None:
    """Haridor: Akkauntni to'liq oldim ✅"""
    query = update.callback_query
    await query.answer()

    parts = query.data.split(":", 1)
    if len(parts) != 2:
        return
    escrow_id = parts[1]
    telegram_id = query.from_user.id

    await query.edit_message_reply_markup(reply_markup=None)
    wait_msg = await query.message.reply_text("⏳ Tekshirilmoqda...")

    ok, msg = await _call_escrow_action_api(telegram_id, escrow_id, "buyer_confirm")

    await wait_msg.delete()
    if ok:
        await query.message.reply_text(
            "✅ <b>Xarid tasdiqlandi!</b>\n\n"
            "Akkaunt qabul qilinganligingiz qayd etildi.\n"
            "Pul sotuvchiga o'tkazish jarayoni boshlandi.\n\n"
            "⭐ Iltimos, sotuvchini baholang:\n"
            f"🌐 <a href='{SITE_URL}'>Saytga kiring</a>",
            parse_mode="HTML",
            disable_web_page_preview=True,
        )
    else:
        err_text = msg or "Noma'lum xato"
        await query.message.reply_text(
            f"❌ <b>Xatolik:</b> {err_text}\n\n"
            "Qayta urinib ko'ring.",
            parse_mode="HTML",
        )


async def _cb_escrow_buyer_no(update: Update, context: ContextTypes.DEFAULT_TYPE) -> None:
    """Haridor: Muammo bor ❌ — shikoyat ochish."""
    query = update.callback_query
    await query.answer()

    parts = query.data.split(":", 1)
    if len(parts) != 2:
        return
    escrow_id = parts[1]
    telegram_id = query.from_user.id

    await query.edit_message_reply_markup(reply_markup=None)
    wait_msg = await query.message.reply_text("⏳ Shikoyat yuborilmoqda...")

    ok, msg = await _call_escrow_action_api(
        telegram_id, escrow_id, "buyer_dispute",
        reason="Haridor akkauntni qabul qilishda muammo bo'ldi (bot orqali)"
    )

    await wait_msg.delete()
    if ok:
        await query.message.reply_text(
            "⚠️ <b>Shikoyat qabul qilindi!</b>\n\n"
            "Admin jamoamiz holatni tekshirib, tez orada javob beradi.\n"
            "Saytdagi chat orqali ham muloqot qilishingiz mumkin.\n\n"
            f"🌐 <a href='{SITE_URL}/chat'>Chatga kirish</a>",
            parse_mode="HTML",
            disable_web_page_preview=True,
        )
    else:
        err_text = msg or "Noma'lum xato"
        await query.message.reply_text(
            f"❌ <b>Xatolik:</b> {err_text}\n\n"
            "Sayt orqali murojaat qiling.",
            parse_mode="HTML",
        )


# ============================================================
# ===== SOTUVCHI SHAXS TASDIQLASH OQIMI =======================
# ============================================================

async def _verification_submit_api(verification_id: str, step: str, telegram_id: int = None, **kwargs) -> tuple[bool, str]:
    """Backend API ga tasdiqlash qadamini yuborish."""
    if not BOT_SECRET_KEY or not _AIOHTTP_AVAILABLE:
        return False, "Konfiguratsiya xatosi"
    url = f"{WEBSITE_URL}/api/v1/payments/telegram/seller-verification/submit/"
    payload = {"secret_key": BOT_SECRET_KEY, "verification_id": verification_id, "step": step}
    if telegram_id:
        payload["telegram_id"] = telegram_id
    payload.update(kwargs)
    try:
        async with _aiohttp.ClientSession() as session:
            async with session.post(
                url, json=payload, timeout=_aiohttp.ClientTimeout(total=15)
            ) as resp:
                try:
                    data = await resp.json()
                except Exception:
                    data = {}
                ok = resp.status in (200, 201) and data.get("success", False)
                err = data.get("error", "") if not ok else ""
                return ok, err
    except Exception as e:
        logger.error("Verification submit API xato: %s", e)
        return False, str(e)[:200]


async def _cb_start_verification(update: Update, context: ContextTypes.DEFAULT_TYPE) -> int:
    """Sotuvchi 'Hujjat taqdim etishni boshlash' tugmasini bosdi."""
    query = update.callback_query
    await query.answer()

    parts = query.data.split(":", 1)
    if len(parts) != 2:
        await query.message.reply_text("❌ Xatolik: noto'g'ri havola.")
        return ConversationHandler.END

    verification_id = parts[1]
    context.user_data["verification_id"] = verification_id
    context.user_data["verify_passport_front_file_id"] = ""
    context.user_data["verify_passport_back_file_id"] = ""
    context.user_data["verify_video_file_id"] = ""

    await query.message.reply_html(
        "📋 <b>1-QADAM: Pasport / ID karta OLDI tomoni</b>\n\n"
        "Pasportingiz yoki ID kartangizning <b>OLD tomonini</b> rasmi sifatida yuboring.\n\n"
        "⚠️ <b>Muhim:</b> Rasm tagiga (caption) <b>to'liq ismingizni</b> (F.I.SH) yozing.\n"
        "Misol: <i>Toshmatov Sardor Alijonovich</i>\n\n"
        "Rasm orginal bo'lishi shart. Skrinshot yoki nusxa qabul qilinmaydi.\n\n"
        "/cancel — bekor qilish"
    )
    return VERIFY_PASSPORT_FRONT


async def _verify_receive_passport_front(update: Update, context: ContextTypes.DEFAULT_TYPE) -> int:
    """Pasport OLD tomoni rasmini qabul qilish."""
    if not update.message.photo:
        await update.message.reply_html(
            "📸 Iltimos, pasportingiz yoki ID kartangizning <b>OLD tomonini rasm</b> sifatida yuboring.\n"
            "Rasm tagiga (caption) to'liq ismingizni yozing."
        )
        return VERIFY_PASSPORT_FRONT

    caption = (update.message.caption or "").strip()
    if len(caption) < 5:
        await update.message.reply_html(
            "⚠️ Rasm tagiga (caption) <b>to'liq ismingizni (F.I.SH)</b> yozing!\n\n"
            "Misol: <i>Toshmatov Sardor Alijonovich</i>\n\n"
            "Iltimos, yana bir bor to'liq ism bilan yuboring."
        )
        return VERIFY_PASSPORT_FRONT

    file_id = update.message.photo[-1].file_id
    verification_id = context.user_data.get("verification_id", "")
    tg_id = update.effective_user.id

    ok, err = await _verification_submit_api(
        verification_id, "passport_front", telegram_id=tg_id, file_id=file_id, full_name=caption
    )
    if not ok:
        await update.message.reply_html(
            f"❌ Xatolik yuz berdi: {err}\n\nQayta urinib ko'ring."
        )
        return VERIFY_PASSPORT_FRONT

    context.user_data["verify_passport_front_file_id"] = file_id
    context.user_data["verify_full_name"] = caption

    await update.message.reply_html(
        "✅ Pasport old qismi qabul qilindi!\n\n"
        "━━━━━━━━━━━━━━━━━━━━\n"
        "📋 <b>2-QADAM: Pasport / ID karta ORQA tomoni</b>\n\n"
        "Pasportingiz yoki ID kartangizning <b>ORQA tomonini</b> rasm sifatida yuboring.\n\n"
        "⚠️ Rasm orginal bo'lishi shart.\n\n"
        "/cancel — bekor qilish"
    )
    return VERIFY_PASSPORT_BACK


async def _verify_receive_passport_back(update: Update, context: ContextTypes.DEFAULT_TYPE) -> int:
    """Pasport ORQA tomoni rasmini qabul qilish."""
    if not update.message.photo:
        await update.message.reply_html(
            "📸 Iltimos, pasportingiz yoki ID kartangizning <b>ORQA tomonini rasm</b> sifatida yuboring."
        )
        return VERIFY_PASSPORT_BACK

    file_id = update.message.photo[-1].file_id
    verification_id = context.user_data.get("verification_id", "")
    tg_id = update.effective_user.id

    ok, err = await _verification_submit_api(verification_id, "passport_back", telegram_id=tg_id, file_id=file_id)
    if not ok:
        await update.message.reply_html(f"❌ Xatolik: {err}\n\nQayta urinib ko'ring.")
        return VERIFY_PASSPORT_BACK

    context.user_data["verify_passport_back_file_id"] = file_id
    full_name = context.user_data.get("verify_full_name", "")

    await update.message.reply_html(
        "✅ Pasport orqa qismi qabul qilindi!\n\n"
        "━━━━━━━━━━━━━━━━━━━━\n"
        "🎥 <b>3-QADAM: Doira video (video xabar)</b>\n\n"
        "Telegram'da <b>doira video</b> (video note/message) yuboring.\n\n"
        "Videoda quyidagilarni aytib yuboring:\n\n"
        f"<i>«Men <b>{full_name}</b> akkauntimni Wibe Store web saytida sotdim. "
        "Akkauntni sotganimdan so'ng muammo bo'lsa yoki akkauntni qaytib olsam, "
        "(o'yin yordamiga yozib) agar shunday muammolar bo'lsa, "
        "men tashlagan hujjat va ma'lumotlarim orqali qonuniy chora ko'rishlari mumkin.»</i>\n\n"
        "⚠️ <b>Eslatma:</b>\n"
        "• Doira video (Telegram'ning yumaloq video xabari) bo'lishi shart\n"
        "• Video ravshan, yuz ko'rinadigan bo'lsin\n"
        "• Matn aniq va to'liq aytilsin\n\n"
        "/cancel — bekor qilish"
    )
    return VERIFY_VIDEO


async def _verify_receive_video(update: Update, context: ContextTypes.DEFAULT_TYPE) -> int:
    """Doira video (video_note) yoki oddiy video qabul qilish."""
    msg = update.message
    if msg.video_note:
        file_id = msg.video_note.file_id
    elif msg.video:
        file_id = msg.video.file_id
    elif msg.document and msg.document.mime_type and msg.document.mime_type.startswith("video/"):
        file_id = msg.document.file_id
    else:
        await msg.reply_html(
            "🎥 Iltimos, <b>video</b> yuboring.\n\n"
            "Doira video (video_note) yoki oddiy video qabul qilinadi.\n"
            "Matn yoki rasm qabul qilinmaydi.\n\n"
            "/cancel — bekor qilish"
        )
        return VERIFY_VIDEO

    verification_id = context.user_data.get("verification_id", "")
    tg_id = update.effective_user.id

    ok, err = await _verification_submit_api(verification_id, "video", telegram_id=tg_id, file_id=file_id)
    if not ok:
        await update.message.reply_html(f"❌ Xatolik: {err}\n\nQayta urinib ko'ring.")
        return VERIFY_VIDEO

    context.user_data["verify_video_file_id"] = file_id

    await update.message.reply_html(
        "✅ Doira video qabul qilindi!\n\n"
        "━━━━━━━━━━━━━━━━━━━━\n"
        "📍 <b>4-QADAM: Joriy joylashuvingiz</b>\n\n"
        "Joriy joylashuvingizni <b>live location</b> sifatida yuboring.\n\n"
        "Qanday yuborish:\n"
        "1. 📎 (qo'shimcha) tugmasini bosing\n"
        "2. <b>Location / Joylashuv</b> ni tanlang\n"
        "3. <b>Share My Live Location</b> ni bosing\n\n"
        "⚠️ Faqat live location (jonli joylashuv) qabul qilinadi.\n\n"
        "/cancel — bekor qilish"
    )
    return VERIFY_LOCATION


async def _verify_receive_location(update: Update, context: ContextTypes.DEFAULT_TYPE) -> int:
    """Joylashuvni qabul qilish va hujjatlarni adminlarga yuborish."""
    if not update.message.location:
        await update.message.reply_html(
            "📍 Iltimos, <b>joylashuvingizni</b> yuboring.\n\n"
            "📎 → Location → Share My Live Location\n\n"
            "Matn yoki boshqa fayl qabul qilinmaydi."
        )
        return VERIFY_LOCATION

    location = update.message.location
    lat = location.latitude
    lng = location.longitude
    verification_id = context.user_data.get("verification_id", "")
    tg_id = update.effective_user.id

    ok, err = await _verification_submit_api(
        verification_id, "location", telegram_id=tg_id, latitude=lat, longitude=lng
    )
    if not ok:
        await update.message.reply_html(f"❌ Xatolik: {err}\n\nQayta urinib ko'ring.")
        return VERIFY_LOCATION

    full_name = context.user_data.get("verify_full_name", "—")
    passport_front_id = context.user_data.get("verify_passport_front_file_id", "")
    passport_back_id = context.user_data.get("verify_passport_back_file_id", "")
    video_id = context.user_data.get("verify_video_file_id", "")
    telegram_id = update.effective_user.id

    # Adminlarga hujjatlarni yuborish
    maps_link = f"https://maps.google.com/?q={lat},{lng}"
    admin_caption = (
        f"🔐 <b>Sotuvchi hujjatlari</b>\n"
        f"━━━━━━━━━━━━━━━━━━━━\n"
        f"👤 F.I.SH: <b>{full_name}</b>\n"
        f"🆔 Telegram ID: <code>{telegram_id}</code>\n"
        f"📍 Joylashuv: <a href='{maps_link}'>{lat:.4f}, {lng:.4f}</a>\n"
        f"🔑 Verification ID: <code>{verification_id}</code>\n\n"
        f"Pasport old/orqa va doira video alohida yuboriladi.\n"
        f"Tasdiqlash uchun quyidagi tugmalardan foydalaning:"
    )
    approve_reject_keyboard = InlineKeyboardMarkup([[
        InlineKeyboardButton("✅ Tasdiqlash", callback_data=f"verify_approve:{verification_id}"),
        InlineKeyboardButton("❌ Rad etish", callback_data=f"verify_reject:{verification_id}"),
    ]])

    for target in _notification_targets():
        try:
            # Pasport old tomoni
            if passport_front_id:
                await context.bot.send_photo(
                    target, photo=passport_front_id,
                    caption=f"📄 Pasport OLDI tomoni\n👤 F.I.SH: {full_name}\n🆔 TG: {telegram_id}",
                    parse_mode="HTML",
                )
            # Pasport orqa tomoni
            if passport_back_id:
                await context.bot.send_photo(
                    target, photo=passport_back_id,
                    caption=f"📄 Pasport ORQA tomoni\n👤 F.I.SH: {full_name}\n🆔 TG: {telegram_id}",
                    parse_mode="HTML",
                )
            # Doira video
            if video_id:
                await context.bot.send_video_note(target, video_note=video_id)
            # Joylashuv
            await context.bot.send_location(target, latitude=lat, longitude=lng)
            # Tasdiq/rad tugmalari bilan xabar
            await context.bot.send_message(
                target, admin_caption,
                parse_mode="HTML",
                reply_markup=approve_reject_keyboard,
                disable_web_page_preview=True,
            )
        except Exception as e:
            logger.warning("Admin %s ga hujjatlar yuborilmadi: %s", target, e)

    # Sotuvchiga tasdiqlash xabari
    await update.message.reply_html(
        "✅ <b>Barcha hujjatlar muvaffaqiyatli yuborildi!</b>\n\n"
        "📋 Yuborilgan hujjatlar:\n"
        "✔️ Pasport old tomoni\n"
        "✔️ Pasport orqa tomoni\n"
        "✔️ Doira video\n"
        "✔️ Joylashuv\n\n"
        "⏳ Admin hujjatlaringizni tekshirmoqda.\n"
        "Tasdiqlangach, savdo summasi hisobingizga o'tkaziladi.\n\n"
        "🔒 Barcha ma'lumotlar maxfiy saqlanadi va faqat "
        "akkaunt bilan muammo bo'lganda ishlatiladi.",
        reply_markup=_get_main_keyboard(),
    )

    # user_data ni tozalash
    for key in ["verification_id", "verify_passport_front_file_id",
                "verify_passport_back_file_id", "verify_video_file_id", "verify_full_name"]:
        context.user_data.pop(key, None)

    return ConversationHandler.END


async def _verify_cancel(update: Update, context: ContextTypes.DEFAULT_TYPE) -> int:
    """Tasdiqlash jarayonini bekor qilish."""
    for key in ["verification_id", "verify_passport_front_file_id",
                "verify_passport_back_file_id", "verify_video_file_id", "verify_full_name"]:
        context.user_data.pop(key, None)
    await update.message.reply_html(
        "❌ Hujjat taqdim etish bekor qilindi.\n\n"
        "⚠️ Eslatma: Pul hujjatlar tasdiqlanguncha ushlab turiladi.\n"
        "Qayta boshlash uchun avvalgi xabardagi tugmani bosing.",
        reply_markup=_get_main_keyboard(),
    )
    return ConversationHandler.END


# ---- Admin: verify approve/reject callback ----

async def _cb_verify_approve(update: Update, _context: ContextTypes.DEFAULT_TYPE) -> None:
    """Admin: sotuvchi hujjatlarini tasdiqlash va to'lovni chiqarish."""
    query = update.callback_query
    if not _is_admin(query.from_user.id):
        await query.answer("⛔ Ruxsat yo'q.", show_alert=True)
        return
    await query.answer("⏳ Tasdiqlanmoqda...")

    verification_id = query.data.replace("verify_approve:", "", 1)

    # Backend API orqali tasdiqlash
    url = f"{WEBSITE_URL}/api/v1/payments/telegram/callback/"
    payload = {
        "callback_query": {
            "id": "bot_internal",
            "data": f"verify_approve:{verification_id}",
            "from": {"id": query.from_user.id},
        }
    }
    status_code = 500
    if _AIOHTTP_AVAILABLE:
        try:
            async with _aiohttp.ClientSession() as session:
                async with session.post(
                    url, json=payload, timeout=_aiohttp.ClientTimeout(total=15)
                ) as resp:
                    status_code = resp.status
        except Exception as e:
            logger.error("Verify approve API xato: %s", e)

    admin_tag = f"@{query.from_user.username}" if query.from_user.username else str(query.from_user.id)

    if status_code == 200:
        suffix = f"\n\n━━━━━━━━━━━━━━━━━━━━\n✅ <b>TASDIQLANDI</b> ({admin_tag})\nTo'lov sotuvchiga o'tkazildi."
    else:
        suffix = f"\n\n━━━━━━━━━━━━━━━━━━━━\n⚠️ Xatolik: {status_code}. Manual tekshiring."

    orig = query.message.text or query.message.caption or ""
    try:
        if query.message.caption is not None:
            await query.message.edit_caption(caption=orig + suffix, parse_mode="HTML")
        else:
            await query.message.edit_text(text=orig + suffix, parse_mode="HTML", disable_web_page_preview=True)
    except Exception:
        try:
            await query.message.edit_reply_markup(reply_markup=None)
        except Exception:
            pass


async def _cb_verify_reject(update: Update, _context: ContextTypes.DEFAULT_TYPE) -> None:
    """Admin: sotuvchi hujjatlarini rad etish."""
    query = update.callback_query
    if not _is_admin(query.from_user.id):
        await query.answer("⛔ Ruxsat yo'q.", show_alert=True)
        return
    await query.answer("❌ Rad etildi.")

    verification_id = query.data.replace("verify_reject:", "", 1)

    url = f"{WEBSITE_URL}/api/v1/payments/telegram/callback/"
    payload = {
        "callback_query": {
            "id": "bot_internal",
            "data": f"verify_reject:{verification_id}",
            "from": {"id": query.from_user.id},
        }
    }
    if _AIOHTTP_AVAILABLE:
        try:
            async with _aiohttp.ClientSession() as session:
                await session.post(url, json=payload, timeout=_aiohttp.ClientTimeout(total=15))
        except Exception as e:
            logger.error("Verify reject API xato: %s", e)

    admin_tag = f"@{query.from_user.username}" if query.from_user.username else str(query.from_user.id)
    suffix = f"\n\n━━━━━━━━━━━━━━━━━━━━\n❌ <b>RAD ETILDI</b> ({admin_tag})\nSotuvchiga qayta yuborish so'rovi yuborildi."

    orig = query.message.text or query.message.caption or ""
    try:
        if query.message.caption is not None:
            await query.message.edit_caption(caption=orig + suffix, parse_mode="HTML")
        else:
            await query.message.edit_text(text=orig + suffix, parse_mode="HTML", disable_web_page_preview=True)
    except Exception:
        try:
            await query.message.edit_reply_markup(reply_markup=None)
        except Exception:
            pass


# ============================================================
# ===== SUPPORT (FOYDALANUVCHI → ADMIN XABAR) =================
# ============================================================

async def support_start(update: Update, context: ContextTypes.DEFAULT_TYPE) -> int:
    """Foydalanuvchi 'Admin bilan bog'lanish' tugmasini bosdi."""
    if _is_admin(update.effective_user.id):
        await update.message.reply_html(
            "ℹ️ Siz adminsiz. Foydalanuvchiga javob: "
            "<code>/user_support &lt;telegram_id&gt; &lt;xabar&gt;</code>"
        )
        return WAITING_PHONE
    await update.message.reply_html(
        "📩 <b>Adminga xabar yuborish</b>\n\n"
        "Xabaringizni yuboring:\n"
        "📝 Matn, 🖼 Rasm, 🎬 Video yoki 🎤 Ovozli xabar\n\n"
        "❌ Bekor qilish: /cancel",
        reply_markup=ReplyKeyboardRemove(),
    )
    return WAITING_SUPPORT_MSG


async def support_receive(update: Update, context: ContextTypes.DEFAULT_TYPE) -> int:
    """Foydalanuvchi xabarini saqlash va tasdiqlash tugmalarini ko'rsatish."""
    context.user_data["support_chat_id"] = update.message.chat_id
    context.user_data["support_msg_id"] = update.message.message_id
    keyboard = InlineKeyboardMarkup([
        [InlineKeyboardButton("🟢 Jo'natish", callback_data="support_send")],
        [InlineKeyboardButton("🔴 Bekor qilish", callback_data="support_cancel")],
    ])
    await update.message.reply_html(
        "Yuqoridagi xabar adminga yuborilsinmi?\n\n"
        "✅ <b>Jo'natish</b> — adminga yuborish\n"
        "❌ <b>Bekor qilish</b> — bekor qilish",
        reply_markup=keyboard,
    )
    return SUPPORT_CONFIRM


async def support_send_cb(update: Update, context: ContextTypes.DEFAULT_TYPE) -> int:
    """Foydalanuvchi 'Jo'natish' bosdi — adminga yuborish."""
    query = update.callback_query
    await query.answer("✅ Yuborilmoqda...")

    user = query.from_user
    tg_id = user.id
    username = f"@{user.username}" if user.username else "—"
    full_name = f"{user.first_name or ''} {user.last_name or ''}".strip() or "—"
    phone = context.user_data.get("phone", "—")

    site_info = "🌐 Sayt akkaunti: <i>topilmadi</i>"
    try:
        result = await get_telegram_profile_via_api(tg_id)
        if result and result.get("has_account"):
            d = result.get("data", {})
            site_username = d.get("username") or "—"
            balance = d.get("balance", "0")
            site_info = f"🌐 Sayt akkaunti: <b>{site_username}</b> | 💰 Balans: <b>{balance} UZS</b>"
    except Exception:
        pass

    header = (
        f"📩 <b>Yangi foydalanuvchi xabari</b>\n"
        f"━━━━━━━━━━━━━━━━━━━━\n"
        f"👤 Ism: <b>{full_name}</b>\n"
        f"🔗 Username: {username}\n"
        f"🆔 Telegram ID: <code>{tg_id}</code>\n"
        f"📱 Telefon: <b>{phone}</b>\n"
        f"{site_info}\n"
        f"━━━━━━━━━━━━━━━━━━━━\n"
        f"💬 <b>Xabar quyida:</b>\n\n"
        f"↩️ Javob: /user_support {tg_id} &lt;xabar matni&gt;"
    )

    chat_id = context.user_data.pop("support_chat_id", None)
    msg_id = context.user_data.pop("support_msg_id", None)

    reply_btn = InlineKeyboardMarkup([[
        InlineKeyboardButton("↩️ Javob yozish", callback_data=f"support_reply:{tg_id}")
    ]])
    for target in _notification_targets():
        try:
            await context.bot.send_message(target, header, parse_mode="HTML")
            if chat_id and msg_id:
                await context.bot.forward_message(
                    chat_id=target,
                    from_chat_id=chat_id,
                    message_id=msg_id,
                )
            # "Javob yozish" inline tugmasini alohida yuborish
            await context.bot.send_message(
                target,
                f"👤 Foydalanuvchi ID: <code>{tg_id}</code>",
                parse_mode="HTML",
                reply_markup=reply_btn,
            )
        except Exception as e:
            logger.warning("Admin %s ga support xabari yuborib bo'lmadi: %s", target, e)

    try:
        await query.edit_message_text("✅ <b>Xabaringiz adminga yuborildi!</b>", parse_mode="HTML")
    except Exception:
        pass

    await context.bot.send_message(
        query.message.chat_id,
        "✅ <b>Xabaringiz adminga yuborildi!</b>\n\nTez orada javob berishadi.",
        parse_mode="HTML",
        reply_markup=_get_main_keyboard(),
    )
    return WAITING_PHONE


async def support_cancel_cb(update: Update, context: ContextTypes.DEFAULT_TYPE) -> int:
    """Foydalanuvchi 'Bekor qilish' bosdi."""
    query = update.callback_query
    await query.answer("❌ Bekor qilindi.")
    context.user_data.pop("support_chat_id", None)
    context.user_data.pop("support_msg_id", None)
    try:
        await query.edit_message_text("❌ Xabar bekor qilindi.")
    except Exception:
        pass
    await context.bot.send_message(
        query.message.chat_id,
        "❌ Xabar bekor qilindi.",
        reply_markup=_get_main_keyboard(),
    )
    return WAITING_PHONE


async def support_reply_callback(update: Update, context: ContextTypes.DEFAULT_TYPE) -> int:
    """Admin 'Javob yozish' tugmasini bosdi — javob kiritish rejimiga o'tish."""
    query = update.callback_query
    await query.answer()

    if not _is_admin(query.from_user.id):
        return ConversationHandler.END

    _, user_tg_id = query.data.split(":", 1)
    context.user_data["reply_to_user"] = int(user_tg_id)

    await query.message.reply_text(
        "✏️ <b>Javobingizni yozing:</b>\n"
        "<i>Xabaringiz foydalanuvchiga «Admin javobi» sifatida yuboriladi.</i>\n\n"
        "/cancel — bekor qilish",
        parse_mode="HTML",
    )
    return WAITING_ADMIN_REPLY


async def admin_reply_message_handler(update: Update, context: ContextTypes.DEFAULT_TYPE) -> int:
    """Admin javobini foydalanuvchiga yuborish."""
    reply_text = update.message.text
    target_user_id = context.user_data.get("reply_to_user")

    if not target_user_id:
        await update.message.reply_text("❌ Xatolik: foydalanuvchi topilmadi.")
        return ConversationHandler.END

    try:
        await context.bot.send_message(
            chat_id=target_user_id,
            text=(
                f"📬 <b>Admin javobi:</b>\n\n"
                f"{reply_text}\n\n"
                f"<i>— WibeStore qo'llab-quvvatlash jamoasi</i>"
            ),
            parse_mode="HTML",
        )
        await update.message.reply_text("✅ Javob muvaffaqiyatli yuborildi!")
    except Exception as e:
        await update.message.reply_text(f"❌ Yuborishda xatolik: {e}")

    context.user_data.pop("reply_to_user", None)
    return ConversationHandler.END


async def _admin_reply_cancel(update: Update, context: ContextTypes.DEFAULT_TYPE) -> int:
    """Admin reply jarayonini bekor qilish."""
    context.user_data.pop("reply_to_user", None)
    await update.message.reply_text("❌ Javob bekor qilindi.", reply_markup=_get_main_keyboard())
    return ConversationHandler.END


async def cmd_user_support(update: Update, context: ContextTypes.DEFAULT_TYPE) -> None:
    """/user_support <telegram_id> <xabar> — admin foydalanuvchiga javob beradi."""
    if not _is_admin(update.effective_user.id):
        return
    parts = (update.message.text or "").strip().split(maxsplit=2)
    if len(parts) < 3 or not parts[1].strip().lstrip("-").isdigit():
        await update.message.reply_html(
            "📤 Ishlatish:\n"
            "<code>/user_support &lt;telegram_id&gt; &lt;xabar&gt;</code>\n\n"
            "Misol:\n"
            "<code>/user_support 123456789 Xatolikni bartaraf qilamiz!</code>"
        )
        return
    user_id = int(parts[1].strip())
    text = parts[2].strip()
    try:
        await context.bot.send_message(
            user_id,
            f"📬 <b>Admin javobi</b>\n━━━━━━━━━━━━━━━━━━━━\n\n{text}",
            parse_mode="HTML",
        )
        await update.message.reply_html(f"✅ Xabar <code>{user_id}</code> ga yuborildi.")
    except Exception as e:
        await update.message.reply_html(f"❌ Yuborib bo'lmadi: <code>{e}</code>")


async def trade_confirm_callback(update: Update, context: ContextTypes.DEFAULT_TYPE) -> None:
    """Savdo tasdiqlash: trade_seller_ok / trade_buyer_ok / trade_cancel.

    Ikki tomon ham tasdiqlagandan so'ng avtomatik verifikatsiyaga o'tadi.
    Kim birinchi tasdiqlashi muhim emas — ikkalasi ham tasdiqlashi kerak.
    """
    query = update.callback_query
    await query.answer()

    if await is_callback_already_processed(query.id):
        return

    try:
        action, escrow_id = query.data.split(":", 1)
    except ValueError:
        return

    telegram_id = query.from_user.id

    try:
        from apps.payments.models import EscrowTransaction
        from apps.payments.services import EscrowService

        escrow = EscrowTransaction.objects.select_related(
            "buyer", "seller", "listing"
        ).filter(id=escrow_id).first()

        if not escrow:
            await query.edit_message_text("❌ Savdo topilmadi.")
            return

        if escrow.status not in ("paid", "delivered"):
            await query.edit_message_text("ℹ️ Bu savdo allaqachon yakunlangan yoki bekor qilingan.")
            return

        listing_title = escrow.listing.title if escrow.listing else "—"

        if action == "trade_seller_ok":
            # Sotuvchi faqat o'z savdosini tasdiqlay oladi
            if escrow.seller.telegram_id != telegram_id:
                await query.answer("❌ Siz bu savdoning sotuvchisi emassiz!", show_alert=True)
                return
            if escrow.seller_confirmed:
                await query.answer("ℹ️ Siz allaqachon tasdiqlagansiz.", show_alert=True)
                return

            escrow_obj, both = EscrowService.process_trade_confirmation(escrow, "seller")

            if both:
                await query.edit_message_text(
                    f"🎉 <b>Savdo tasdiqlandi!</b>\n\n"
                    f"📦 {listing_title}\n\n"
                    f"✅ Ikkala tomon ham tasdiqladi!\n"
                    f"📋 Keyingi qadam: Verifikatsiya — hujjatlaringizni taqdim eting.\n\n"
                    f"Bot sizga verifikatsiya so'rovini yuboradi.",
                    parse_mode="HTML",
                )
                # Ikkinchi tomonga xabar
                try:
                    from apps.payments.telegram_notify import notify_trade_both_confirmed
                    notify_trade_both_confirmed(escrow_obj)
                except Exception as e:
                    logger.warning("notify_trade_both_confirmed: %s", e)
            else:
                await query.edit_message_text(
                    f"✅ <b>Siz savdoni tasdiqladingiz!</b>\n\n"
                    f"📦 {listing_title}\n\n"
                    f"⏳ Haridor tasdiqini kutmoqda...\n"
                    f"Haridor ham tasdiqlagandan so'ng keyingi bosqichga o'tiladi.",
                    parse_mode="HTML",
                )
                # Haridorga xabar
                try:
                    from apps.payments.telegram_notify import notify_trade_party_confirmed
                    notify_trade_party_confirmed(escrow_obj, confirmed_by="seller")
                except Exception as e:
                    logger.warning("notify_trade_party_confirmed: %s", e)

        elif action == "trade_buyer_ok":
            # Haridor faqat o'z savdosini tasdiqlay oladi
            if escrow.buyer.telegram_id != telegram_id:
                await query.answer("❌ Siz bu savdoning haridori emassiz!", show_alert=True)
                return
            if escrow.buyer_confirmed:
                await query.answer("ℹ️ Siz allaqachon tasdiqlagansiz.", show_alert=True)
                return

            escrow_obj, both = EscrowService.process_trade_confirmation(escrow, "buyer")

            if both:
                await query.edit_message_text(
                    f"🎉 <b>Savdo tasdiqlandi!</b>\n\n"
                    f"📦 {listing_title}\n\n"
                    f"✅ Ikkala tomon ham tasdiqladi!\n"
                    f"📋 Sotuvchi verifikatsiyadan o'tishi kerak.\n"
                    f"Tasdiqlangandan so'ng pul sotuvchiga o'tkaziladi.",
                    parse_mode="HTML",
                )
                try:
                    from apps.payments.telegram_notify import notify_trade_both_confirmed
                    notify_trade_both_confirmed(escrow_obj)
                except Exception as e:
                    logger.warning("notify_trade_both_confirmed: %s", e)
            else:
                await query.edit_message_text(
                    f"✅ <b>Siz savdoni tasdiqladingiz!</b>\n\n"
                    f"📦 {listing_title}\n\n"
                    f"⏳ Sotuvchi tasdiqini kutmoqda...\n"
                    f"Sotuvchi ham tasdiqlagandan so'ng keyingi bosqichga o'tiladi.",
                    parse_mode="HTML",
                )
                try:
                    from apps.payments.telegram_notify import notify_trade_party_confirmed
                    notify_trade_party_confirmed(escrow_obj, confirmed_by="buyer")
                except Exception as e:
                    logger.warning("notify_trade_party_confirmed: %s", e)

        elif action == "trade_cancel":
            # Kim bosganligi aniqlanadi
            if escrow.seller.telegram_id == telegram_id:
                side = "seller"
            elif escrow.buyer.telegram_id == telegram_id:
                side = "buyer"
            else:
                await query.answer("❌ Siz bu savdoning ishtirokchisi emassiz!", show_alert=True)
                return

            escrow_obj = EscrowService.cancel_trade_by_party(escrow, side, reason="Telegram orqali bekor qilindi")

            if escrow_obj.status == "refunded":
                await query.edit_message_text(
                    f"❌ <b>Savdo bekor qilindi</b>\n\n"
                    f"📦 {listing_title}\n\n"
                    f"Ikkala tomon ham bekor qildi.\n"
                    f"💰 Pul haridorga qaytarildi.",
                    parse_mode="HTML",
                )
            elif escrow_obj.status == "disputed":
                await query.edit_message_text(
                    f"⚠️ <b>Nizo ochildi</b>\n\n"
                    f"📦 {listing_title}\n\n"
                    f"Bir tomon tasdiqladi, biri bekor qildi.\n"
                    f"Admin tez orada hal qiladi.",
                    parse_mode="HTML",
                )
            else:
                other = "haridor" if side == "seller" else "sotuvchi"
                await query.edit_message_text(
                    f"❌ <b>Siz savdoni bekor qildingiz</b>\n\n"
                    f"📦 {listing_title}\n\n"
                    f"⏳ {other.capitalize()} javobini kutmoqda...",
                    parse_mode="HTML",
                )

            try:
                from apps.payments.telegram_notify import notify_trade_cancelled
                notify_trade_cancelled(escrow_obj, cancelled_by=side)
            except Exception as e:
                logger.warning("notify_trade_cancelled: %s", e)

    except Exception as e:
        logger.error("trade_confirm_callback error: %s", e, exc_info=True)
        await query.edit_message_text(f"❌ Xatolik yuz berdi. Qayta urinib ko'ring.")


# =================== BLOCK 2.3: Trade callback handlers ===================

async def seller_confirm_transfer_callback(update: Update, context: ContextTypes.DEFAULT_TYPE) -> None:
    """callback_data: seller_confirm_transfer_{escrow_id}"""
    query = update.callback_query
    await query.answer()

    # BLOCK 8.1: idempotency check
    if await is_callback_already_processed(query.id):
        return

    callback_data = query.data
    escrow_id = callback_data.replace("seller_confirm_transfer_", "")

    try:
        import django
        import os
        os.environ.setdefault("DJANGO_SETTINGS_MODULE", "config.settings.development")

        from apps.payments.models import EscrowTransaction
        from apps.payments.services import EscrowService

        escrow = EscrowTransaction.objects.select_related("buyer", "seller", "listing").filter(
            id=escrow_id, status="paid"
        ).first()

        if not escrow:
            await query.edit_message_text("❌ Savdo topilmadi yoki holati o'zgardi.")
            return

        # Check sender is seller
        telegram_id = query.from_user.id
        if escrow.seller.telegram_id != telegram_id:
            await query.edit_message_text("❌ Siz bu savdoning sotuvchisi emassiz.")
            return

        # Update escrow — seller confirms transfer (triggers verification flow)
        EscrowService.seller_confirm_transfer(escrow, escrow.seller)

        # Notify buyer
        try:
            from apps.payments.telegram_notify import notify_buyer_confirm_received
            notify_buyer_confirm_received(escrow)
        except Exception as e:
            logger.warning("notify_buyer_confirm_received in callback: %s", e)

        await query.edit_message_text(
            "✅ Ajoyib! Харidor akkauntni tekshirmoqda.\n"
            "Tasdiqlangandan so'ng mablag' hisobingizga o'tkaziladi."
        )
    except Exception as e:
        logger.error("seller_confirm_transfer_callback error: %s", e)
        await query.edit_message_text("❌ Xatolik yuz berdi. Iltimos, keyinroq urinib ko'ring.")


async def seller_cancel_trade_callback(update: Update, context: ContextTypes.DEFAULT_TYPE) -> None:
    """callback_data: seller_cancel_trade_{escrow_id}"""
    query = update.callback_query
    await query.answer()

    # BLOCK 8.1: idempotency check
    if await is_callback_already_processed(query.id):
        return

    callback_data = query.data
    escrow_id = callback_data.replace("seller_cancel_trade_", "")

    try:
        from apps.payments.models import EscrowTransaction
        from apps.payments.services import EscrowService

        escrow = EscrowTransaction.objects.filter(id=escrow_id, status__in=["paid", "delivered"]).first()
        if not escrow:
            await query.edit_message_text("❌ Savdo topilmadi yoki holati o'zgardi.")
            return

        telegram_id = query.from_user.id
        if escrow.seller.telegram_id != telegram_id:
            await query.edit_message_text("❌ Siz bu savdoning sotuvchisi emassiz.")
            return

        EscrowService.cancel_trade_by_party(escrow, "seller")

        await query.edit_message_text(
            "Savdo bekor qilindi. Харidor pulini qaytarib oldi.\n"
            "Akkauntingiz yana saytda faol bo'ldi."
        )
    except Exception as e:
        logger.error("seller_cancel_trade_callback error: %s", e)
        await query.edit_message_text("❌ Xatolik yuz berdi.")


async def buyer_confirm_received_callback(update: Update, context: ContextTypes.DEFAULT_TYPE) -> None:
    """callback_data: buyer_confirm_received_{escrow_id}"""
    query = update.callback_query
    await query.answer()

    # BLOCK 8.1: idempotency check
    if await is_callback_already_processed(query.id):
        return

    callback_data = query.data
    escrow_id = callback_data.replace("buyer_confirm_received_", "")

    try:
        from apps.payments.models import EscrowTransaction
        from apps.payments.services import EscrowService

        escrow = EscrowTransaction.objects.filter(id=escrow_id, status="delivered").first()
        if not escrow:
            await query.edit_message_text("❌ Savdo topilmadi yoki holati o'zgardi.")
            return

        telegram_id = query.from_user.id
        if escrow.buyer.telegram_id != telegram_id:
            await query.edit_message_text("❌ Siz bu savdoning харidori emassiz.")
            return

        # Buyer confirms receipt → process confirmation (marks as confirmed if both parties confirm)
        EscrowService.process_trade_confirmation(escrow, "buyer")

        await query.edit_message_text(
            "✅ Savdo muvaffaqiyatli yakunlandi!\n\n"
            "Akkaunt sizniki. Xaridingizdan rohat qiling! 🎮"
        )
    except Exception as e:
        logger.error("buyer_confirm_received_callback error: %s", e)
        await query.edit_message_text("❌ Xatolik yuz berdi.")


async def buyer_open_dispute_callback(update: Update, context: ContextTypes.DEFAULT_TYPE) -> None:
    """callback_data: buyer_open_dispute_{escrow_id}"""
    query = update.callback_query
    await query.answer()

    callback_data = query.data
    escrow_id = callback_data.replace("buyer_open_dispute_", "")

    # Store escrow_id in context for next message
    context.user_data["dispute_escrow_id"] = escrow_id

    await query.edit_message_text(
        "⚠️ Nizo sababi nima?\n\n"
        "Muammoni qisqacha tushuntiring (keyingi xabaringizda):"
    )


async def buyer_cancel_trade_callback(update: Update, context: ContextTypes.DEFAULT_TYPE) -> None:
    """callback_data: buyer_cancel_trade_{escrow_id}"""
    query = update.callback_query
    await query.answer()

    # BLOCK 8.1: idempotency check
    if await is_callback_already_processed(query.id):
        return

    callback_data = query.data
    escrow_id = callback_data.replace("buyer_cancel_trade_", "")

    try:
        from apps.payments.models import EscrowTransaction
        from apps.payments.services import EscrowService

        escrow = EscrowTransaction.objects.filter(id=escrow_id, status__in=["paid", "delivered"]).first()
        if not escrow:
            await query.edit_message_text("❌ Savdo topilmadi yoki holati o'zgardi.")
            return

        telegram_id = query.from_user.id
        if escrow.buyer.telegram_id != telegram_id:
            await query.edit_message_text("❌ Siz bu savdoning харidori emassiz.")
            return

        EscrowService.cancel_trade_by_party(escrow, "buyer")

        await query.edit_message_text(
            "Savdo bekor qilindi. Pulingiz hisobingizga qaytarildi."
        )
    except Exception as e:
        logger.error("buyer_cancel_trade_callback error: %s", e)
        await query.edit_message_text("❌ Xatolik yuz berdi.")


# =================== BLOCK 5.4: Admin callback handlers ===================

async def admin_complete_trade_callback(update: Update, context: ContextTypes.DEFAULT_TYPE) -> None:
    """callback_data: admin_complete_trade_{escrow_id}"""
    query = update.callback_query
    await query.answer()

    callback_data = query.data
    escrow_id = callback_data.replace("admin_complete_trade_", "")

    try:
        from apps.payments.models import EscrowTransaction, SellerVerification
        from apps.payments.services import EscrowService
        from django.utils import timezone as _tz

        escrow = EscrowTransaction.objects.select_related("seller", "listing").filter(
            id=escrow_id
        ).first()
        if not escrow:
            await query.edit_message_text("❌ Savdo topilmadi.")
            return

        # Force-approve verification so release_payment succeeds
        verif = SellerVerification.objects.filter(escrow=escrow).order_by("-created_at").first()
        if not verif or verif.status != SellerVerification.STATUS_APPROVED:
            if not verif:
                SellerVerification.objects.create(
                    escrow=escrow, seller=escrow.seller,
                    status=SellerVerification.STATUS_APPROVED,
                )
            else:
                verif.status = SellerVerification.STATUS_APPROVED
                verif.reviewed_at = _tz.now()
                verif.save(update_fields=["status", "reviewed_at"])

        EscrowService.release_payment(escrow)
        await query.edit_message_text(f"✅ Savdo #{escrow_id[:8]} yakunlandi. Pul sotuvchiga o'tkazildi.")
    except Exception as e:
        logger.error("admin_complete_trade_callback error: %s", e)
        await query.edit_message_text(f"❌ Xatolik: {str(e)[:200]}")


async def admin_refund_trade_callback(update: Update, context: ContextTypes.DEFAULT_TYPE) -> None:
    """callback_data: admin_refund_trade_{escrow_id}"""
    query = update.callback_query
    await query.answer()

    callback_data = query.data
    escrow_id = callback_data.replace("admin_refund_trade_", "")

    try:
        from apps.payments.models import EscrowTransaction
        from apps.payments.services import EscrowService
        escrow = EscrowTransaction.objects.filter(id=escrow_id).first()
        if not escrow:
            await query.edit_message_text("❌ Savdo topilmadi.")
            return
        if escrow.status not in ("paid", "delivered", "disputed"):
            await query.edit_message_text("❌ Savdo qaytarib bo'lmaydi.")
            return
        if escrow.status != "disputed":
            escrow.status = "disputed"
            escrow.dispute_reason = "Admin forced refund via bot"
            escrow.save(update_fields=["status", "dispute_reason"])
        EscrowService.refund_escrow(escrow, None, "Admin forced refund via bot")
        await query.edit_message_text(f"↩️ Savdo #{escrow_id[:8]} bekor qilindi. Pul харidorga qaytarildi.")
    except Exception as e:
        logger.error("admin_refund_trade_callback error: %s", e)
        await query.edit_message_text(f"❌ Xatolik: {str(e)[:200]}")


async def admin_approve_verification_callback(update: Update, context: ContextTypes.DEFAULT_TYPE) -> None:
    """callback_data: admin_approve_verification_{verification_id}"""
    query = update.callback_query
    await query.answer()

    callback_data = query.data
    verification_id = callback_data.replace("admin_approve_verification_", "")

    try:
        from apps.payments.models import SellerVerification, EscrowTransaction
        from apps.payments.models import Transaction
        from django.utils import timezone

        verification = SellerVerification.objects.select_related("seller", "escrow").filter(
            id=verification_id, status="submitted"
        ).first()

        if not verification:
            await query.edit_message_text("❌ Tasdiqlash topilmadi yoki allaqachon ko'rib chiqilgan.")
            return

        verification.status = "approved"
        verification.save()

        escrow = verification.escrow
        if escrow and escrow.seller_earnings:
            seller = escrow.seller
            seller.balance = (seller.balance or 0) + escrow.seller_earnings
            seller.save(update_fields=["balance"])

            try:
                Transaction.objects.create(
                    user=seller,
                    type="purchase",
                    status="completed",
                    amount=escrow.seller_earnings,
                    description=f"Savdo #{str(escrow.id)[:8]} uchun to'lov",
                )
            except Exception:
                pass

        try:
            from apps.payments.telegram_notify import notify_verification_approved
            notify_verification_approved(escrow, verification)
        except Exception as e:
            logger.warning("notify_verification_approved in callback: %s", e)

        await query.edit_message_text(f"✅ Tasdiqlash #{verification_id[:8]} tasdiqlandi. Pul sotuvchiga o'tkazildi.")
    except Exception as e:
        logger.error("admin_approve_verification_callback error: %s", e)
        await query.edit_message_text(f"❌ Xatolik: {str(e)[:200]}")


async def admin_reject_verification_callback(update: Update, context: ContextTypes.DEFAULT_TYPE) -> None:
    """callback_data: admin_reject_verification_{verification_id}"""
    query = update.callback_query
    await query.answer()

    callback_data = query.data
    verification_id = callback_data.replace("admin_reject_verification_", "")

    context.user_data["reject_verification_id"] = verification_id

    await query.edit_message_text(
        f"❌ Tasdiqlash #{verification_id[:8]} rad etildi.\n\n"
        "Rad etish sababini kiriting (keyingi xabaringizda):"
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

    # Railway yoki boshqa muhitlarda proxy talab qilinishi mumkin
    _proxy_url = os.environ.get("HTTPS_PROXY") or os.environ.get("https_proxy") or None
    _request = HTTPXRequest(
        connection_pool_size=8,
        connect_timeout=30.0,
        read_timeout=30.0,
        write_timeout=30.0,
        pool_timeout=30.0,
        proxy_url=_proxy_url,
    )

    app = (
        Application.builder()
        .token(BOT_TOKEN)
        .request(_request)
        .post_init(_post_init)
        .post_stop(_post_stop)
        .build()
    )

    # Menyu tugmalari uchun filter
    _menu_buttons_filter = filters.Text([BTN_MY_ACCOUNT, BTN_PREMIUM, BTN_TOPUP, BTN_WITHDRAW, BTN_SUPPORT])

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
            WAITING_TOPUP_AMOUNT: [
                MessageHandler(_menu_buttons_filter, _fallback_menu_buttons),
                MessageHandler(filters.TEXT & ~filters.COMMAND, _receive_topup_amount),
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
            WAITING_SUPPORT_MSG: [
                MessageHandler(_menu_buttons_filter, _fallback_menu_buttons),
                MessageHandler(filters.PHOTO, support_receive),
                MessageHandler(filters.VIDEO, support_receive),
                MessageHandler(filters.VOICE, support_receive),
                MessageHandler(filters.AUDIO, support_receive),
                MessageHandler(filters.Document.ALL, support_receive),
                MessageHandler(filters.TEXT & ~filters.COMMAND, support_receive),
                CommandHandler('cancel', _cancel_to_menu),
            ],
            SUPPORT_CONFIRM: [
                CallbackQueryHandler(support_send_cb, pattern="^support_send$"),
                CallbackQueryHandler(support_cancel_cb, pattern="^support_cancel$"),
                MessageHandler(_menu_buttons_filter, _fallback_menu_buttons),
                CommandHandler('cancel', _cancel_to_menu),
            ],
            WAITING_LISTING_VIDEO: [
                MessageHandler(filters.VIDEO | filters.Document.VIDEO, _handle_listing_video),
                MessageHandler(_menu_buttons_filter, _fallback_menu_buttons),
                MessageHandler(filters.TEXT & ~filters.COMMAND, lambda u, c: u.message.reply_html("📹 Iltimos, <b>video fayl</b> yuboring.")),
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

    # ---- Sotuvchi shaxs tasdiqlash ConversationHandler ----
    verification_conv = ConversationHandler(
        entry_points=[
            CallbackQueryHandler(_cb_start_verification, pattern=r"^start_verification:"),
        ],
        states={
            VERIFY_PASSPORT_FRONT: [
                MessageHandler(filters.PHOTO, _verify_receive_passport_front),
                CommandHandler("cancel", _verify_cancel),
            ],
            VERIFY_PASSPORT_BACK: [
                MessageHandler(filters.PHOTO, _verify_receive_passport_back),
                CommandHandler("cancel", _verify_cancel),
            ],
            VERIFY_VIDEO: [
                MessageHandler(filters.VIDEO_NOTE | filters.VIDEO | filters.Document.VIDEO, _verify_receive_video),
                CommandHandler("cancel", _verify_cancel),
            ],
            VERIFY_LOCATION: [
                MessageHandler(filters.LOCATION, _verify_receive_location),
                CommandHandler("cancel", _verify_cancel),
            ],
        },
        fallbacks=[CommandHandler("cancel", _verify_cancel)],
        per_message=False,
        per_user=True,
        per_chat=True,
        allow_reentry=True,
    )
    app.add_handler(verification_conv)

    app.add_handler(conv_handler)

    # ---- To'lov tizimi handlerlari ----
    # Wallet TopUp: Approve/Reject callback — barcha foydalanuvchilar uchun (admin tekshiruvi ichida)
    # ---- Admin support reply ConversationHandler ----
    # Bu BARCHA holatlardan ishlaydi chunki alohida ConversationHandler
    admin_reply_conv = ConversationHandler(
        entry_points=[
            CallbackQueryHandler(support_reply_callback, pattern=r'^support_reply:'),
        ],
        states={
            WAITING_ADMIN_REPLY: [
                MessageHandler(filters.TEXT & ~filters.COMMAND, admin_reply_message_handler),
                CommandHandler('cancel', _admin_reply_cancel),
            ],
        },
        fallbacks=[CommandHandler('cancel', _admin_reply_cancel)],
        per_message=False,
        per_user=True,
        per_chat=True,
        allow_reentry=True,
    )
    app.add_handler(admin_reply_conv)

    app.add_handler(CallbackQueryHandler(cb_approve, pattern=r'^approve:'))
    app.add_handler(CallbackQueryHandler(cb_reject, pattern=r'^reject:'))

    # Screenshot topup: rad etish
    app.add_handler(CallbackQueryHandler(_cb_topup_reject, pattern=r'^topup_reject:\d+$'))

    # Pul yechish: tasdiqlash va rad etish
    app.add_handler(CallbackQueryHandler(_cb_withdraw_paid, pattern=r'^withdraw_paid:\d+$'))
    app.add_handler(CallbackQueryHandler(_cb_withdraw_reject, pattern=r'^withdraw_reject:\d+$'))

    # Premium admin: tasdiqlash va rad etish
    app.add_handler(CallbackQueryHandler(_cb_premium_admin_approve, pattern=r'^premium_adm_ok:'))
    app.add_handler(CallbackQueryHandler(_cb_premium_admin_reject, pattern=r'^premium_adm_no:\d+$'))

    # ---- Escrow (xarid tasdiqlash) handlerlari ----
    app.add_handler(CallbackQueryHandler(_cb_escrow_seller_ok, pattern=r'^escrow_seller_ok:'))
    app.add_handler(CallbackQueryHandler(_cb_escrow_buyer_ok,  pattern=r'^escrow_buyer_ok:'))
    app.add_handler(CallbackQueryHandler(_cb_escrow_buyer_no,  pattern=r'^escrow_buyer_no:'))
    # Trade confirm (savdo tasdiqlash)
    app.add_handler(CallbackQueryHandler(trade_confirm_callback, pattern=r'^trade_(seller_ok|buyer_ok|cancel):'))

    # ---- Sotuvchi shaxs tasdiqlash: admin approve/reject ----
    app.add_handler(CallbackQueryHandler(_cb_verify_approve, pattern=r'^verify_approve:'))
    app.add_handler(CallbackQueryHandler(_cb_verify_reject,  pattern=r'^verify_reject:'))

    # ---- Block 2.3: Trade callback handlers ----
    app.add_handler(CallbackQueryHandler(seller_confirm_transfer_callback, pattern=r"^seller_confirm_transfer_"))
    app.add_handler(CallbackQueryHandler(seller_cancel_trade_callback, pattern=r"^seller_cancel_trade_"))
    app.add_handler(CallbackQueryHandler(buyer_confirm_received_callback, pattern=r"^buyer_confirm_received_"))
    app.add_handler(CallbackQueryHandler(buyer_open_dispute_callback, pattern=r"^buyer_open_dispute_"))
    app.add_handler(CallbackQueryHandler(buyer_cancel_trade_callback, pattern=r"^buyer_cancel_trade_"))

    # ---- Block 5.4: Admin callback handlers ----
    app.add_handler(CallbackQueryHandler(admin_complete_trade_callback, pattern=r"^admin_complete_trade_"))
    app.add_handler(CallbackQueryHandler(admin_refund_trade_callback, pattern=r"^admin_refund_trade_"))
    app.add_handler(CallbackQueryHandler(admin_approve_verification_callback, pattern=r"^admin_approve_verification_"))
    app.add_handler(CallbackQueryHandler(admin_reject_verification_callback, pattern=r"^admin_reject_verification_"))

    # ---- Video moderatsiya callback handlerlari ----
    app.add_handler(CallbackQueryHandler(_cb_video_moderate_approve, pattern=r"^vidmod_approve:"))
    app.add_handler(CallbackQueryHandler(_cb_video_moderate_reject, pattern=r"^vidmod_reject:"))
    app.add_handler(CallbackQueryHandler(_cb_video_moderate_msg, pattern=r"^vidmod_msg:"))

    # ---- Admin panel interaktiv handlerlari ----
    app.add_handler(CallbackQueryHandler(_cb_admin_panel_back, pattern=r"^admpanel:back$"))
    app.add_handler(CallbackQueryHandler(_cb_admin_trades, pattern=r"^admpanel:trades$"))
    app.add_handler(CallbackQueryHandler(_cb_admin_withdrawals, pattern=r"^admpanel:withdrawals$"))
    app.add_handler(CallbackQueryHandler(_cb_admin_withdrawal_detail, pattern=r"^adm_w_detail:"))
    app.add_handler(CallbackQueryHandler(_cb_admin_verifications, pattern=r"^admpanel:verifications$"))
    app.add_handler(CallbackQueryHandler(_cb_admin_verification_detail, pattern=r"^adm_v_detail:"))
    app.add_handler(CallbackQueryHandler(_cb_admin_view_doc, pattern=r"^adm_v_doc:"))
    app.add_handler(CallbackQueryHandler(_cb_admin_usersearch, pattern=r"^admpanel:usersearch$"))
    app.add_handler(CallbackQueryHandler(_cb_admin_stats, pattern=r"^admpanel:stats$"))
    app.add_handler(CallbackQueryHandler(_cb_admin_botstats, pattern=r"^admpanel:botstats$"))
    app.add_handler(CallbackQueryHandler(_cb_admin_broadcast_prompt, pattern=r"^admpanel:broadcast$"))

    # Admin buyruqlari
    app.add_handler(CommandHandler('admin', cmd_admin_panel))
    app.add_handler(CommandHandler('pending', cmd_pending))
    app.add_handler(CommandHandler('stats', cmd_stats))
    app.add_handler(CommandHandler('balance', cmd_balance))
    app.add_handler(CommandHandler('broadcast', cmd_broadcast))
    app.add_handler(CommandHandler('user_support', cmd_user_support))

    # Video moderatsiya: admin reject sababi yoki sotuvchiga xabar
    async def _admin_video_text_handler(update: Update, context: ContextTypes.DEFAULT_TYPE):
        """Admin video reject sababi yoki sotuvchiga xabar yozganda."""
        if context.user_data.get('video_reject_listing_id'):
            await _handle_video_reject_reason(update, context)
            return
        if context.user_data.get('video_msg_seller_tg_id'):
            await _handle_video_msg_to_seller(update, context)
            return
        # Boshqa matn — admin user search ga o'tkazish
        await _admin_user_search_handler(update, context)

    # Admin matn handler (video moderate + user search) — boshqa handlerlardan KEYIN
    app.add_handler(MessageHandler(
        filters.TEXT & ~filters.COMMAND,
        _admin_video_text_handler,
    ), group=1)

    # ---- Umumiy buyruqlar ----
    app.add_handler(CommandHandler('help', help_command))
    app.add_handler(MessageHandler(filters.COMMAND, unknown))

    async def error_handler(_update, context):
        if isinstance(context.error, TelegramConflict):
            logger.warning(
                "Conflict (409): Boshqa instance mavjud. "
                "Railway rolling deployment — 15s kutib qayta ulaniladi..."
            )
            await asyncio.sleep(15)
            return
        logger.exception("Kutilmagan xato: %s", context.error)

    app.add_error_handler(error_handler)

    logger.info("Bot ishga tushdi...")
    app.run_polling(
        allowed_updates=Update.ALL_TYPES,
        drop_pending_updates=True,
        stop_signals=None,
    )


if __name__ == '__main__':
    main()
