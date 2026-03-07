"""
To'lov biznes-mantiqi — yaratish, tasdiqlash, rad etish.
"""
import logging

from database.connection import get_session
from database.models import PaymentStatus, PaymentType
from database.repositories.payment_repo import PaymentRepository
from database.repositories.user_repo import UserRepository

logger = logging.getLogger(__name__)


async def ensure_user(
    telegram_id: int,
    username: str | None = None,
    first_name: str | None = None,
    last_name: str | None = None,
) -> tuple:
    """Foydalanuvchini DB da yaratish yoki yangilash."""
    async with get_session() as session:
        repo = UserRepository(session)
        user, created = await repo.get_or_create(
            telegram_id=telegram_id,
            username=username,
            first_name=first_name,
            last_name=last_name,
        )
        return user.id, created


async def user_is_banned(telegram_id: int) -> bool:
    async with get_session() as session:
        repo = UserRepository(session)
        return await repo.is_banned(telegram_id)


async def user_has_pending_payment(telegram_id: int) -> bool:
    """Foydalanuvchida hali ko'rib chiqilmagan to'lov bormi?"""
    async with get_session() as session:
        user_repo = UserRepository(session)
        user = await user_repo.get_by_telegram_id(telegram_id)
        if not user:
            return False
        pay_repo = PaymentRepository(session)
        return await pay_repo.has_pending(user.id)


async def create_payment(
    telegram_id: int,
    payment_type: PaymentType,
    receipt_file_id: str,
    receipt_path: str,
) -> int:
    """
    Yangi to'lov yaratish.
    Qaytaradi: payment.id
    """
    async with get_session() as session:
        user_repo = UserRepository(session)
        user = await user_repo.get_by_telegram_id(telegram_id)
        if not user:
            raise ValueError(f"Foydalanuvchi topilmadi: telegram_id={telegram_id}")

        pay_repo = PaymentRepository(session)
        payment = await pay_repo.create(
            user_id=user.id,
            payment_type=payment_type,
            receipt_file_id=receipt_file_id,
            receipt_path=receipt_path,
        )
        logger.info(
            "Yangi to'lov yaratildi: payment_id=%s user=%s type=%s",
            payment.id, telegram_id, payment_type.value,
        )
        return payment.id


async def save_admin_message(payment_id: int, chat_id: int, message_id: int) -> None:
    """Admin xabar ID sini to'lovga bog'lash."""
    async with get_session() as session:
        repo = PaymentRepository(session)
        await repo.update_admin_message(payment_id, chat_id, message_id)


async def approve_payment(payment_id: int, admin_telegram_id: int) -> dict | None:
    """
    To'lovni tasdiqlash.
    Qaytaradi: {'payment': Payment, 'user_telegram_id': int} yoki None
    """
    async with get_session() as session:
        pay_repo = PaymentRepository(session)
        payment = await pay_repo.approve(payment_id, admin_telegram_id)
        if not payment:
            logger.warning(
                "approve_payment: payment_id=%s topilmadi yoki PENDING emas", payment_id
            )
            return None

        user_telegram_id = payment.user.telegram_id
        logger.info(
            "To'lov tasdiqlandi: payment_id=%s admin=%s user_tg=%s",
            payment_id, admin_telegram_id, user_telegram_id,
        )
        return {
            "payment_id": payment.id,
            "payment_type": payment.payment_type_label,
            "user_telegram_id": user_telegram_id,
            "admin_chat_id": payment.admin_chat_id,
            "admin_message_id": payment.admin_message_id,
        }


async def reject_payment(
    payment_id: int, admin_telegram_id: int, note: str = ""
) -> dict | None:
    """
    To'lovni rad etish.
    Qaytaradi: {'payment': Payment, 'user_telegram_id': int} yoki None
    """
    async with get_session() as session:
        pay_repo = PaymentRepository(session)
        payment = await pay_repo.reject(payment_id, admin_telegram_id, note)
        if not payment:
            logger.warning(
                "reject_payment: payment_id=%s topilmadi yoki PENDING emas", payment_id
            )
            return None

        user_telegram_id = payment.user.telegram_id
        logger.info(
            "To'lov rad etildi: payment_id=%s admin=%s user_tg=%s",
            payment_id, admin_telegram_id, user_telegram_id,
        )
        return {
            "payment_id": payment.id,
            "payment_type": payment.payment_type_label,
            "user_telegram_id": user_telegram_id,
            "admin_note": payment.admin_note or "",
            "admin_chat_id": payment.admin_chat_id,
            "admin_message_id": payment.admin_message_id,
        }


async def get_stats() -> dict:
    async with get_session() as session:
        repo = PaymentRepository(session)
        return await repo.get_stats()


async def get_all_pending() -> list:
    async with get_session() as session:
        repo = PaymentRepository(session)
        payments = await repo.get_all_pending(limit=50)
        return [
            {
                "id": p.id,
                "user_display": p.user.display_name,
                "user_tg_id": p.user.telegram_id,
                "payment_type": p.payment_type_label,
                "created_at": p.created_at,
            }
            for p in payments
        ]
