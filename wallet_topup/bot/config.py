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
    admin_chat_id: int | None  # group/channel for admin notifications (optional)

    @classmethod
    def from_env(cls) -> "BotConfig":
        token = os.getenv("TELEGRAM_BOT_TOKEN", "")
        web_app_url = os.getenv("WEB_APP_URL", "https://your-domain.com/wallet-app")
        backend_url = os.getenv("BACKEND_URL", "http://localhost:8001").rstrip("/")
        admin_ids_str = os.getenv("ADMIN_TELEGRAM_IDS", "")
        admin_ids: set[int] = set()
        for x in admin_ids_str.split(","):
            x = x.strip()
            if x.isdigit():
                admin_ids.add(int(x))
        redis_url = os.getenv("REDIS_URL", "redis://localhost:6379/3")
        # ADMIN_CHAT_ID: optional group/channel ID for admin notifications
        admin_chat_id_str = os.getenv("ADMIN_CHAT_ID", "").strip()
        admin_chat_id: int | None = None
        if admin_chat_id_str and admin_chat_id_str.lstrip("-").isdigit():
            admin_chat_id = int(admin_chat_id_str)
        return cls(
            token=token,
            web_app_url=web_app_url,
            backend_url=backend_url,
            admin_ids=admin_ids,
            redis_url=redis_url,
            admin_chat_id=admin_chat_id,
        )

    def get_notification_targets(self) -> list[int]:
        """
        Returns chat IDs to send new transaction notifications to.
        If ADMIN_CHAT_ID is configured, use that group/channel.
        Otherwise, notify all individual admin IDs.
        """
        if self.admin_chat_id:
            return [self.admin_chat_id]
        return list(self.admin_ids)


config = BotConfig.from_env()
