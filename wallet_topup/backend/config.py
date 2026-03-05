"""
Wallet Top-Up Backend — Configuration.
All settings loaded from environment / .env file.
Production-ready with strict validation.
"""
from __future__ import annotations

import logging
from pathlib import Path

from pydantic import field_validator
from pydantic_settings import BaseSettings, SettingsConfigDict

logger = logging.getLogger(__name__)


class Settings(BaseSettings):
    model_config = SettingsConfigDict(
        env_file=".env",
        env_file_encoding="utf-8",
        extra="ignore",
    )

    # ── App ──────────────────────────────────────────────
    APP_NAME: str = "Wallet Top-Up API"
    DEBUG: bool = False
    LOG_LEVEL: str = "INFO"

    # ── Server ───────────────────────────────────────────
    HOST: str = "0.0.0.0"
    PORT: int = 8001

    # ── Database (async) ─────────────────────────────────
    DATABASE_URL: str = "postgresql+asyncpg://postgres:postgres@localhost:5432/wallet_topup_db"

    # ── Redis ────────────────────────────────────────────
    REDIS_URL: str = "redis://localhost:6379/3"

    # ── Telegram ─────────────────────────────────────────
    TELEGRAM_BOT_TOKEN: str = ""

    # Separate secret for bot → backend API calls (defaults to bot token)
    BOT_API_SECRET: str = ""

    # Web App URL (must be HTTPS in production)
    WEB_APP_URL: str = "https://your-domain.com/wallet-app"

    # ── Rate Limits ──────────────────────────────────────
    RATE_LIMIT_SUBMISSIONS: int = 3
    RATE_LIMIT_WINDOW_SECONDS: int = 600  # 10 minutes

    # ── Amount Limits ────────────────────────────────────
    MIN_AMOUNT_UZS: float = 10_000
    MAX_AMOUNT_UZS: float = 50_000_000  # 50 million UZS
    MIN_AMOUNT_USDT: float = 1.0
    MAX_AMOUNT_USDT: float = 10_000.0

    # ── File Upload ──────────────────────────────────────
    MAX_RECEIPT_SIZE_BYTES: int = 10 * 1024 * 1024  # 10 MB
    ALLOWED_RECEIPT_MIMES: set[str] = {
        "image/jpeg",
        "image/png",
        "image/webp",
        "image/gif",
        "application/pdf",
    }

    # ── Storage ──────────────────────────────────────────
    UPLOAD_DIR: Path = Path("uploads/receipts")
    UPLOAD_DIR_STR: str = "uploads/receipts"

    # ── Admin Telegram IDs (comma-separated in env) ──────
    ADMIN_TELEGRAM_IDS: str = ""

    # ── initData expiry (seconds; default 5 minutes) ─────
    INIT_DATA_MAX_AGE_SECONDS: int = 300

    # ── CORS ─────────────────────────────────────────────
    CORS_ORIGINS: str = "*"

    @field_validator("LOG_LEVEL")
    @classmethod
    def validate_log_level(cls, v: str) -> str:
        v = v.upper()
        if v not in ("DEBUG", "INFO", "WARNING", "ERROR", "CRITICAL"):
            return "INFO"
        return v

    def get_admin_ids(self) -> set[int]:
        if not self.ADMIN_TELEGRAM_IDS:
            return set()
        ids: set[int] = set()
        for part in self.ADMIN_TELEGRAM_IDS.split(","):
            part = part.strip()
            if part.isdigit():
                ids.add(int(part))
        return ids

    def get_bot_api_secret(self) -> str:
        """Return the secret used for bot ↔ backend communication."""
        return self.BOT_API_SECRET or self.TELEGRAM_BOT_TOKEN

    def get_cors_origins(self) -> list[str]:
        """Parse CORS origins from comma-separated string."""
        if self.CORS_ORIGINS == "*":
            return ["*"]
        return [o.strip() for o in self.CORS_ORIGINS.split(",") if o.strip()]

    def ensure_upload_dir(self) -> None:
        """Create upload directory if it does not exist."""
        Path(self.UPLOAD_DIR_STR).mkdir(parents=True, exist_ok=True)


settings = Settings()
