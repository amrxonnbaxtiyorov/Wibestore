"""
Yordamchi funksiyalar.
"""
import hashlib
import logging
import os
from datetime import datetime, timezone
from pathlib import Path

import aiofiles
import aiohttp

from bot.config import RECEIPTS_DIR

logger = logging.getLogger(__name__)


def utcnow() -> datetime:
    return datetime.now(timezone.utc)


def format_datetime(dt: datetime | None) -> str:
    if not dt:
        return "—"
    # UTC → Toshkent (+5)
    offset = dt.utcoffset()
    if offset is None:
        # Timezone-naive, UTC deb qabul qilish
        local = dt.replace(tzinfo=timezone.utc)
    else:
        local = dt
    return local.strftime("%d.%m.%Y %H:%M:%S UTC")


def payment_type_label(ptype: str) -> str:
    return {"HUMO": "HUMO karta", "VISA_MC": "VISA / MasterCard"}.get(ptype, ptype)


async def download_receipt(bot, file_id: str, payment_id: int) -> str | None:
    """
    Telegram faylini yuklab, receipts/ papkasiga saqlash.
    Qaytaradi: saqlangan fayl yo'li yoki None (xatolik bo'lsa).
    """
    try:
        tg_file = await bot.get_file(file_id)
        # Kengaytmani aniqlash
        file_path: str = tg_file.file_path or ""
        ext = Path(file_path).suffix.lower() or ".jpg"
        allowed_ext = {".jpg", ".jpeg", ".png", ".webp", ".heic"}
        if ext not in allowed_ext:
            ext = ".jpg"

        # Fayl nomi: payment_id + file_id hash (unikal)
        name_hash = hashlib.md5(file_id.encode()).hexdigest()[:8]
        filename = f"receipt_{payment_id}_{name_hash}{ext}"
        save_path = RECEIPTS_DIR / filename

        # Yuklab olish
        file_url = f"https://api.telegram.org/file/bot{bot.token}/{tg_file.file_path}"
        async with aiohttp.ClientSession() as session:
            async with session.get(file_url) as resp:
                if resp.status != 200:
                    logger.error("Fayl yuklab bo'lmadi: HTTP %s", resp.status)
                    return None
                content = await resp.read()

        async with aiofiles.open(save_path, "wb") as f:
            await f.write(content)

        logger.info("Chek saqlandi: %s (%d bytes)", save_path, len(content))
        return str(save_path)

    except Exception as e:
        logger.error("download_receipt xatosi: %s", e)
        return None


async def notify_site_balance(telegram_id: int, payment_id: int) -> bool:
    """
    Sayt API orqali foydalanuvchi balansini to'ldirish (ixtiyoriy integratsiya).
    Qaytaradi: True — muvaffaqiyatli, False — xatolik.
    """
    from bot.config import SITE_API_URL, SITE_API_KEY, SITE_INTEGRATION_ENABLED
    if not SITE_INTEGRATION_ENABLED:
        return True  # Integratsiya o'chirilgan, muvaffaqiyat qaytarish

    url = f"{SITE_API_URL}/api/v1/bot/payment/approve/"
    payload = {"telegram_id": telegram_id, "payment_id": payment_id}
    headers = {"X-Bot-Secret": SITE_API_KEY, "Content-Type": "application/json"}
    try:
        async with aiohttp.ClientSession() as session:
            async with session.post(
                url, json=payload, headers=headers,
                timeout=aiohttp.ClientTimeout(total=15)
            ) as resp:
                data = {}
                try:
                    data = await resp.json()
                except Exception:
                    pass
                if resp.status == 200:
                    logger.info(
                        "Sayt API: payment_id=%s tasdiqlandi. Javob: %s", payment_id, data
                    )
                    return True
                logger.warning(
                    "Sayt API xato: HTTP %s — %s", resp.status, data
                )
                return False
    except Exception as e:
        logger.error("notify_site_balance xatosi: %s", e)
        return False
