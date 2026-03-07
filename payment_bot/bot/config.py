"""
Konfiguratsiya — barcha sozlamalar .env faylidan o'qiladi.
"""
import os
from pathlib import Path
from dotenv import load_dotenv

# .env faylini yuklash (payment_bot/ papkasidan)
_ROOT = Path(__file__).resolve().parent.parent
load_dotenv(_ROOT / ".env")


def _require(key: str) -> str:
    val = os.getenv(key, "").strip()
    if not val:
        raise ValueError(f"[Config] '{key}' .env faylida o'rnatilmagan!")
    return val


def _int_list(raw: str) -> list[int]:
    return [int(x.strip()) for x in raw.split(",") if x.strip().isdigit()]


# ── Bot ──────────────────────────────────────────────────────────────────────
BOT_TOKEN: str = _require("BOT_TOKEN")

ADMIN_IDS: set[int] = set(_int_list(os.getenv("ADMIN_IDS", "")))
if not ADMIN_IDS:
    raise ValueError("[Config] ADMIN_IDS o'rnatilmagan! Kamida bitta admin ID kerak.")

# ── Karta rekvizitlari ───────────────────────────────────────────────────────
HUMO_CARD_NUMBER: str = os.getenv("HUMO_CARD_NUMBER", "9860 0803 0123 4567")
HUMO_CARD_HOLDER: str = os.getenv("HUMO_CARD_HOLDER", "Ism Familiya")

VISA_CARD_NUMBER: str = os.getenv("VISA_CARD_NUMBER", "4169 7388 1234 5678")
VISA_CARD_HOLDER: str = os.getenv("VISA_CARD_HOLDER", "Ism Familiya")

# ── Ma'lumotlar bazasi ────────────────────────────────────────────────────────
DATABASE_URL: str = os.getenv("DATABASE_URL", f"sqlite+aiosqlite:///{_ROOT}/payments.db")

# ── Fayl saqlash ─────────────────────────────────────────────────────────────
RECEIPTS_DIR: Path = _ROOT / os.getenv("RECEIPTS_DIR", "receipts")
RECEIPTS_DIR.mkdir(parents=True, exist_ok=True)

# ── Anti-spam ─────────────────────────────────────────────────────────────────
THROTTLE_RATE: float = float(os.getenv("THROTTLE_RATE", "1.5"))

# ── Sayt integratsiyasi (ixtiyoriy) ──────────────────────────────────────────
SITE_API_URL: str = os.getenv("SITE_API_URL", "").rstrip("/")
SITE_API_KEY: str = os.getenv("SITE_API_KEY", "")
SITE_INTEGRATION_ENABLED: bool = bool(SITE_API_URL and SITE_API_KEY)

# ── Logging ──────────────────────────────────────────────────────────────────
LOG_LEVEL: str = os.getenv("LOG_LEVEL", "INFO").upper()
LOG_FILE: str = str(_ROOT / os.getenv("LOG_FILE", "logs/bot.log"))

# Log faylini saqlash papkasini yaratish
Path(LOG_FILE).parent.mkdir(parents=True, exist_ok=True)
