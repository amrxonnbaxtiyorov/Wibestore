"""
Transaction and user services.
"""
import uuid
from typing import Sequence

from sqlalchemy import select
from sqlalchemy.ext.asyncio import AsyncSession

from wallet_topup.backend.models import PaymentMethodConfig, Transaction, User
from wallet_topup.backend.schemas.common import PaymentMethodOut


async def get_or_create_user(
    session: AsyncSession,
    telegram_id: int,
    username: str | None = None,
    first_name: str | None = None,
) -> User:
    """Get existing user or create a new one. Updates username/first_name if changed."""
    result = await session.execute(
        select(User).where(User.telegram_id == telegram_id)
    )
    user = result.scalar_one_or_none()
    if user is None:
        user = User(
            telegram_id=telegram_id,
            username=username,
            first_name=first_name,
        )
        session.add(user)
        await session.flush()
    else:
        # Update username/first_name if they changed
        changed = False
        if username and user.username != username:
            user.username = username
            changed = True
        if first_name and user.first_name != first_name:
            user.first_name = first_name
            changed = True
        if changed:
            await session.flush()
    return user


async def get_payment_methods(
    session: AsyncSession, currency: str
) -> Sequence[PaymentMethodOut]:
    result = await session.execute(
        select(PaymentMethodConfig)
        .where(
            PaymentMethodConfig.currency == currency,
            PaymentMethodConfig.is_active == True,  # noqa: E712
        )
        .order_by(PaymentMethodConfig.method_code)
    )
    rows = result.scalars().all()
    return [
        PaymentMethodOut(
            code=r.method_code,
            display_name=r.display_name,
            card_number=r.card_number,
        )
        for r in rows
    ]


async def has_pending_transaction(session: AsyncSession, telegram_id: int) -> bool:
    result = await session.execute(
        select(Transaction)
        .where(
            Transaction.telegram_id == telegram_id,
            Transaction.status == "PENDING",
        )
        .limit(1)
    )
    return result.scalar_one_or_none() is not None


async def create_pending_transaction(
    session: AsyncSession,
    telegram_id: int,
    currency: str,
    payment_method: str,
    amount: float,
    receipt_path: str,
    username: str | None = None,
    transaction_uid: str | None = None,
) -> Transaction:
    transaction_uid = transaction_uid or str(uuid.uuid4())
    tx = Transaction(
        transaction_uid=transaction_uid,
        telegram_id=telegram_id,
        currency=currency,
        payment_method=payment_method,
        amount=amount,
        receipt_path=receipt_path,
        status="PENDING",
    )
    session.add(tx)
    await session.flush()
    return tx
