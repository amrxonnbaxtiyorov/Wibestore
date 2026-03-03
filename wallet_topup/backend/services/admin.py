"""
Admin approve/reject with DB lock and balance update.
"""
from decimal import Decimal
from typing import Any

from sqlalchemy import select
from sqlalchemy.ext.asyncio import AsyncSession

from wallet_topup.backend.models import AdminActionLog, Transaction, User


async def approve_transaction(
    session: AsyncSession,
    transaction_uid: str,
    admin_telegram_id: int,
) -> tuple[bool, str, dict[str, Any] | None]:
    """
    Lock row, set APPROVED, add balance, log. Prevent double approval.
    Returns (success, message, payload for user notification).
    """
    result = await session.execute(
        select(Transaction)
        .where(Transaction.transaction_uid == transaction_uid)
        .with_for_update()
    )
    tx = result.scalar_one_or_none()
    if not tx:
        return False, "Transaction not found.", None
    if tx.status != "PENDING":
        return False, "Transaction already processed.", None

    tx.status = "APPROVED"
    tx.admin_id = admin_telegram_id

    # Get user and add balance
    user_result = await session.execute(
        select(User).where(User.telegram_id == tx.telegram_id).with_for_update()
    )
    user = user_result.scalar_one_or_none()
    if not user:
        user = User(telegram_id=tx.telegram_id, wallet_balance=Decimal("0"))
        session.add(user)
        await session.flush()
    user.wallet_balance = (user.wallet_balance or Decimal("0")) + Decimal(str(tx.amount))

    session.add(
        AdminActionLog(
            admin_telegram_id=admin_telegram_id,
            transaction_uid=transaction_uid,
            action="APPROVE",
            details=f"Amount: {tx.amount} {tx.currency}",
        )
    )
    await session.flush()

    payload = {
        "transaction_uid": tx.transaction_uid,
        "telegram_id": tx.telegram_id,
        "amount": float(tx.amount),
        "currency": tx.currency,
        "new_balance": float(user.wallet_balance),
    }
    return True, "Approved.", payload


async def reject_transaction(
    session: AsyncSession,
    transaction_uid: str,
    admin_telegram_id: int,
) -> tuple[bool, str, int | None]:
    result = await session.execute(
        select(Transaction)
        .where(Transaction.transaction_uid == transaction_uid)
        .with_for_update()
    )
    tx = result.scalar_one_or_none()
    if not tx:
        return False, "Transaction not found.", None
    if tx.status != "PENDING":
        return False, "Transaction already processed.", None

    tx.status = "REJECTED"
    tx.admin_id = admin_telegram_id
    session.add(
        AdminActionLog(
            admin_telegram_id=admin_telegram_id,
            transaction_uid=transaction_uid,
            action="REJECT",
        )
    )
    await session.flush()
    return True, "Rejected.", tx.telegram_id
