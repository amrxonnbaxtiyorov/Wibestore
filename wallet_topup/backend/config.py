"""
Wallet Top-Up Backend - Configuration
Load from environment; production-ready.
"""
from __future__ import annotations

import os
from pathlib import Path

from pydantic_settings import BaseSettings, SettingsConfigDict


class Settings(BaseSettings):
    model_config = SettingsConfigDict(
        env_file=".env",
        env_file_encoding="utf-8",
        extra="ignore",
    )

    # App
    APP_NAME: str = "Wallet Top-Up API"
    DEBUG: bool = False
    LOG_LEVEL: str = "INFO"

    # Server
    HOST: str = "0.0.0.0"
    PORT: int = 8001

    # Database
    DATABASE_URL: str = "postgresql+asyncpg://postgres:postgres@localhost:5432/wallet_topup_db"

    # Redis
    REDIS_URL: str = "redis://localhost:6379/3"

    # Telegram Bot (for initData validation)
    TELEGRAM_BOT_TOKEN: str = ""

    # Web App URL (for CORS and WebAppInfo)
    WEB_APP_URL: str = "https://your-domain.com/wallet-app"

    # Limits
    RATE_LIMIT_SUBMISSIONS: int = 3
    RATE_LIMIT_WINDOW_SECONDS: int = 600  # 10 minutes
    MIN_AMOUNT_UZS: float = 1_000
    MIN_AMOUNT_USDT: float = 1.0
    MAX_RECEIPT_SIZE_BYTES: int = 10 * 1024 * 1024  # 10 MB
    ALLOWED_RECEIPT_MIMES: set[str] = {
        "image/jpeg",
        "image/png",
        "image/webp",
        "image/gif",
        "application/pdf",
    }

    # Storage
    UPLOAD_DIR: Path = Path("uploads/receipts")
    UPLOAD_DIR_STR: str = "uploads/receipts"

    # Admin Telegram IDs (comma-separated in env)
    ADMIN_TELEGRAM_IDS: str = ""

    def get_admin_ids(self) -> set[int]:
        if not self.ADMIN_TELEGRAM_IDS:
            return set()
        return {int(x.strip()) for x in self.ADMIN_TELEGRAM_IDS.split(",") if x.strip()}


def get_settings() -> Settings:
    return Settings()


settings = get_settings()
