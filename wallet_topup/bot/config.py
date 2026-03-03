"""
Wallet Top-Up Bot - Configuration
"""
import os
from dataclasses import dataclass


@dataclass
class BotConfig:
    token: str
    web_app_url: str
    backend_url: str
    admin_ids: set[int]
    redis_url: str

    @classmethod
    def from_env(cls) -> "BotConfig":
        token = os.getenv("TELEGRAM_BOT_TOKEN", "")
        web_app_url = os.getenv("WEB_APP_URL", "https://your-domain.com/wallet-app")
        backend_url = os.getenv("BACKEND_URL", "http://localhost:8001").rstrip("/")
        admin_ids_str = os.getenv("ADMIN_TELEGRAM_IDS", "")
        admin_ids = {int(x.strip()) for x in admin_ids_str.split(",") if x.strip()}
        redis_url = os.getenv("REDIS_URL", "redis://localhost:6379/3")
        return cls(
            token=token,
            web_app_url=web_app_url,
            backend_url=backend_url,
            admin_ids=admin_ids,
            redis_url=redis_url,
        )


config = BotConfig.from_env()
