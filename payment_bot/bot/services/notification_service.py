"""
Admin bildirishnoma servisi — adminlarga yangi to'lov haqida xabar yuborish.
"""
import logging

from aiogram import Bot
from aiogram.exceptions import TelegramForbiddenError, TelegramBadRequest

from bot.config import ADMIN_IDS
from bot.keyboards.inline import admin_review_kb
from bot.utils.helpers import format_datetime

logger = logging.getLogger(__name__)


def _build_admin_text(
    payment_id: int,
    telegram_id: int,
    username: str | None,
    first_name: str | None,
    payment_type_label: str,
    created_at,
) -> str:
    """Admin uchun chek xabari matni."""
    if username:
        user_display = f"@{username} (<code>{telegram_id}</code>)"
    elif first_name:
        user_display = f"{first_name} (<code>{telegram_id}</code>)"
    else:
        user_display = f"<code>{telegram_id}</code>"

    return (
        f"🆕 <b>Yangi to'lov so'rovi</b>\n"
        f"━━━━━━━━━━━━━━━━━━━━\n\n"
        f"🔢 <b>To'lov ID:</b> <code>#{payment_id}</code>\n"
        f"👤 <b>Foydalanuvchi:</b> {user_display}\n"
        f"💳 <b>To'lov turi:</b> {payment_type_label}\n"
        f"⏰ <b>Vaqt:</b> {format_datetime(created_at)}\n\n"
        f"⏳ <b>Holat: KUTILMOQDA</b>"
    )


async def notify_admins_new_payment(
    bot: Bot,
    payment_id: int,
    telegram_id: int,
    username: str | None,
    first_name: str | None,
    payment_type_label: str,
    created_at,
    receipt_file_id: str,
) -> list[tuple[int, int]]:
    """
    Barcha adminlarga chek rasmi bilan xabar yuborish.
    Qaytaradi: [(chat_id, message_id), ...] — yuborilgan xabarlar ro'yxati
    """
    text = _build_admin_text(
        payment_id, telegram_id, username, first_name, payment_type_label, created_at
    )
    keyboard = admin_review_kb(payment_id)
    sent_messages: list[tuple[int, int]] = []

    for admin_id in ADMIN_IDS:
        try:
            msg = await bot.send_photo(
                chat_id=admin_id,
                photo=receipt_file_id,
                caption=text,
                reply_markup=keyboard,
                parse_mode="HTML",
            )
            sent_messages.append((msg.chat.id, msg.message_id))
            logger.info("Admin %s ga xabar yuborildi: payment_id=%s", admin_id, payment_id)
        except TelegramForbiddenError:
            logger.warning(
                "Admin %s bilan chat yo'q — /start ni yuboring yoki bot bloklanmagan ekanini tekshiring.",
                admin_id,
            )
        except TelegramBadRequest as e:
            logger.warning("Admin %s ga xabar yuborishda BadRequest: %s", admin_id, e)
        except Exception as e:
            logger.error("Admin %s ga xabar yuborib bo'lmadi: %s", admin_id, e)

    if not sent_messages:
        logger.error(
            "Hech bir adminga xabar yuborib bo'lmadi! ADMIN_IDS=%s", ADMIN_IDS
        )
    return sent_messages
