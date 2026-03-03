"""
Validate Telegram Web App initData (HMAC-SHA256).
https://core.telegram.org/bots/webapps#validating-data-received-via-the-mini-app
"""
import hashlib
import hmac
import json
from urllib.parse import parse_qsl

from wallet_topup.backend.config import settings


def validate_telegram_webapp_init_data(init_data: str) -> dict | None:
    """
    Validate initData from Telegram.WebApp.initData.
    Returns parsed user payload (with user dict) if valid, else None.
    """
    if not init_data or not settings.TELEGRAM_BOT_TOKEN:
        return None

    try:
        parsed = dict(parse_qsl(init_data))
    except Exception:
        return None

    received_hash = parsed.pop("hash", None)
    if not received_hash:
        return None

    # Data-check-string: all fields except hash, sorted by key, key=value\n
    data_check_parts = sorted(f"{k}={v}" for k, v in parsed.items())
    data_check_string = "\n".join(data_check_parts)

    # secret_key = HMAC_SHA256(bot_token, "WebAppData")
    secret_key = hmac.new(
        settings.TELEGRAM_BOT_TOKEN.encode(),
        b"WebAppData",
        hashlib.sha256,
    ).digest()

    # computed_hash = HMAC_SHA256(secret_key, data_check_string)
    computed_hash = hmac.new(
        secret_key,
        data_check_string.encode(),
        hashlib.sha256,
    ).hexdigest()

    if not hmac.compare_digest(computed_hash, received_hash):
        return None

    # Optional: check auth_date is not too old (e.g. 24h)
    auth_date = parsed.get("auth_date")
    if auth_date:
        try:
            from time import time
            if int(auth_date) < int(time()) - 86400:
                return None
        except (ValueError, TypeError):
            return None

    return parsed


def get_telegram_id_from_validated(validated: dict) -> int | None:
    """Extract telegram user id from validated initData (user is JSON string)."""
    user_str = validated.get("user")
    if not user_str:
        return None
    try:
        user = json.loads(user_str)
        return int(user.get("id"))
    except (json.JSONDecodeError, TypeError, ValueError):
        return None
