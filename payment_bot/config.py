"""Payment Bot — Configuration."""

import os
from pathlib import Path

from dotenv import load_dotenv

BASE_DIR = Path(__file__).resolve().parent
load_dotenv(BASE_DIR / ".env")

BOT_TOKEN: str = os.getenv("BOT_TOKEN", "")
ADMIN_IDS: list[int] = [
    int(x.strip()) for x in os.getenv("ADMIN_IDS", "").split(",") if x.strip().isdigit()
]

# Backend API
SITE_API_URL: str = os.getenv("SITE_API_URL", "http://localhost:8000").rstrip("/")
SITE_API_KEY: str = os.getenv("SITE_API_KEY", "")
BOT_SECRET_KEY: str = os.getenv("BOT_SECRET_KEY", SITE_API_KEY)

# Card details for deposits
HUMO_CARD_NUMBER: str = os.getenv("HUMO_CARD_NUMBER", "")
HUMO_CARD_HOLDER: str = os.getenv("HUMO_CARD_HOLDER", "")
VISA_CARD_NUMBER: str = os.getenv("VISA_CARD_NUMBER", "")
VISA_CARD_HOLDER: str = os.getenv("VISA_CARD_HOLDER", "")

# Anti-spam
THROTTLE_RATE: float = float(os.getenv("THROTTLE_RATE", "1.5"))

# Logging
LOG_LEVEL: str = os.getenv("LOG_LEVEL", "INFO")
