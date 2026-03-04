"""
Validate Telegram Web App initData (HMAC-SHA256).
https://core.telegram.org/bots/webapps#validating-data-received-via-the-mini-app

Implementation follows the official Telegram documentation exactly:
1. Parse initData as query string
2. Extract and remove 'hash' field
3. Sort remaining fields alphabetically
4. Build data-check-string with key=value\n format
5. Compute secret_key = HMAC_SHA256("WebAppData", bot_token)
6. Compute hash = HMAC_SHA256(secret_key, data_check_string)
7. Compare computed hash with received hash (constant-time)
8. Check auth_date is recent
"""
import hashlib
import hmac
import json
import logging
import time
from urllib.parse import parse_qsl

from wallet_topup.backend.config import settings

logger = logging.getLogger(__name__)


def validate_telegram_webapp_init_data(init_data: str) -> dict | None:
    """
    Validate initData from Telegram.WebApp.initData.
    Returns parsed payload (dict with user JSON string) if valid, else None.
    """
    if not init_data or not settings.TELEGRAM_BOT_TOKEN:
        logger.warning("Empty initData or missing bot token")
        return None

    try:
        parsed = dict(parse_qsl(init_data, strict_parsing=False))
    except Exception:
        logger.warning("Failed to parse initData query string")
        return None

    received_hash = parsed.pop("hash", None)
    if not received_hash:
        logger.warning("No hash in initData")
        return None

    # Data-check-string: all remaining fields sorted by key, key=value\n separated
    data_check_parts = sorted(f"{k}={v}" for k, v in parsed.items())
    data_check_string = "\n".join(data_check_parts)

    # CRITICAL: Correct argument order per Telegram docs
    # secret_key = HMAC_SHA256(key="WebAppData", msg=bot_token)
    secret_key = hmac.new(
        b"WebAppData",
        settings.TELEGRAM_BOT_TOKEN.encode("utf-8"),
        hashlib.sha256,
    ).digest()

    # computed_hash = HMAC_SHA256(key=secret_key, msg=data_check_string)
    computed_hash = hmac.new(
        secret_key,
        data_check_string.encode("utf-8"),
        hashlib.sha256,
    ).hexdigest()

    if not hmac.compare_digest(computed_hash, received_hash):
        logger.warning("HMAC verification failed — possible forged request")
        return None

    # Validate auth_date is not too old
    auth_date_str = parsed.get("auth_date")
    if auth_date_str:
        try:
            auth_date = int(auth_date_str)
            now = int(time.time())
            max_age = settings.INIT_DATA_MAX_AGE_SECONDS
            if auth_date < now - max_age:
                logger.warning(
                    "initData expired: auth_date=%d now=%d max_age=%d",
                    auth_date, now, max_age,
                )
                return None
        except (ValueError, TypeError):
            logger.warning("Invalid auth_date value: %s", auth_date_str)
            return None

    return parsed


def get_telegram_user_from_validated(validated: dict) -> dict | None:
    """Extract full telegram user dict from validated initData."""
    user_str = validated.get("user")
    if not user_str:
        return None
    try:
        return json.loads(user_str)
    except (json.JSONDecodeError, TypeError):
        return None


def get_telegram_id_from_validated(validated: dict) -> int | None:
    """Extract telegram user id from validated initData (user is JSON string)."""
    user = get_telegram_user_from_validated(validated)
    if not user:
        return None
    try:
        return int(user.get("id"))
    except (TypeError, ValueError):
        return None
