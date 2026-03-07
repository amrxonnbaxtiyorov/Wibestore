"""
Payment repository — to'lovlar bilan DB operatsiyalari.
"""
from datetime import datetime, timezone

from sqlalchemy import select, func, and_
from sqlalchemy.ext.asyncio import AsyncSession
from sqlalchemy.orm import selectinload

from database.models import Payment, PaymentStatus, PaymentType, User


class PaymentRepository:
    def __init__(self, session: AsyncSession) -> None:
        self._session = session

    async def create(
        self,
        user_id: int,
        payment_type: PaymentType,
        receipt_file_id: str,
        receipt_path: str,
    ) -> Payment:
        payment = Payment(
            user_id=user_id,
            payment_type=payment_type,
            receipt_file_id=receipt_file_id,
            receipt_path=receipt_path,
            status=PaymentStatus.PENDING,
        )
        self._session.add(payment)
        await self._session.flush()
        return payment

    async def get_by_id(self, payment_id: int) -> Payment | None:
        result = await self._session.execute(
            select(Payment)
            .options(selectinload(Payment.user))
            .where(Payment.id == payment_id)
        )
        return result.scalar_one_or_none()

    async def has_pending(self, user_id: int) -> bool:
        """Foydalanuvchida kutilayotgan to'lov bormi?"""
        result = await self._session.execute(
            select(func.count()).where(
                and_(
                    Payment.user_id == user_id,
                    Payment.status == PaymentStatus.PENDING,
                )
            )
        )
        return result.scalar_one() > 0

    async def get_pending_for_user(self, user_id: int) -> Payment | None:
        result = await self._session.execute(
            select(Payment).where(
                and_(
                    Payment.user_id == user_id,
                    Payment.status == PaymentStatus.PENDING,
                )
            ).order_by(Payment.created_at.desc()).limit(1)
        )
        return result.scalar_one_or_none()

    async def update_admin_message(
        self, payment_id: int, admin_chat_id: int, admin_message_id: int
    ) -> None:
        payment = await self.get_by_id(payment_id)
        if payment:
            payment.admin_chat_id = admin_chat_id
            payment.admin_message_id = admin_message_id
            self._session.add(payment)

    async def approve(self, payment_id: int, admin_telegram_id: int) -> Payment | None:
        payment = await self.get_by_id(payment_id)
        if not payment or payment.status != PaymentStatus.PENDING:
            return None
        payment.status = PaymentStatus.APPROVED
        payment.reviewed_by = admin_telegram_id
        payment.reviewed_at = datetime.now(timezone.utc)
        self._session.add(payment)
        return payment

    async def reject(
        self, payment_id: int, admin_telegram_id: int, note: str = ""
    ) -> Payment | None:
        payment = await self.get_by_id(payment_id)
        if not payment or payment.status != PaymentStatus.PENDING:
            return None
        payment.status = PaymentStatus.REJECTED
        payment.reviewed_by = admin_telegram_id
        payment.reviewed_at = datetime.now(timezone.utc)
        payment.admin_note = note or None
        self._session.add(payment)
        return payment

    async def get_stats(self) -> dict:
        """Statistika: PENDING, APPROVED, REJECTED soni."""
        rows = await self._session.execute(
            select(Payment.status, func.count().label("cnt"))
            .group_by(Payment.status)
        )
        stats = {s.value: 0 for s in PaymentStatus}
        for row in rows:
            stats[row.status.value] = row.cnt
        return stats

    async def get_all_pending(self, limit: int = 50) -> list[Payment]:
        result = await self._session.execute(
            select(Payment)
            .options(selectinload(Payment.user))
            .where(Payment.status == PaymentStatus.PENDING)
            .order_by(Payment.created_at.asc())
            .limit(limit)
        )
        return list(result.scalars().all())
