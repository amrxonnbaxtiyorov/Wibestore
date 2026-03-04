"""
Admin approve/reject (called by bot with secret). Transaction fetch and receipt serving.
"""
import logging
from pathlib import Path

from fastapi import APIRouter, Depends, Header, HTTPException
from fastapi.responses import FileResponse
from pydantic import BaseModel
from sqlalchemy import select
from sqlalchemy.ext.asyncio import AsyncSession

from wallet_topup.backend.config import settings
from wallet_topup.backend.database import get_async_session
from wallet_topup.backend.models import Transaction, User
from wallet_topup.backend.schemas.common import ApiResponse, ErrorDetail
from wallet_topup.backend.services import approve_transaction, reject_transaction

router = APIRouter()
logger = logging.getLogger(__name__)

BOT_SECRET_HEADER = "X-Bot-Secret"


def _verify_bot_secret(
    x_bot_secret: str | None = Header(None, alias=BOT_SECRET_HEADER),
) -> None:
    """Verify the bot secret header for bot-to-backend communication."""
    expected = settings.get_bot_api_secret()
    if not expected:
        raise HTTPException(status_code=503, detail="Bot not configured.")
    if not x_bot_secret or x_bot_secret != expected:
        raise HTTPException(
            status_code=401,
            detail=ErrorDetail(
                code="UNAUTHORIZED",
                message="Invalid bot secret.",
            ).model_dump(),
        )


def _verify_admin(admin_telegram_id: int) -> None:
    """Verify the admin Telegram ID is in the allowed set."""
    admins = settings.get_admin_ids()
    if not admins or admin_telegram_id not in admins:
        raise HTTPException(
            status_code=403,
            detail=ErrorDetail(
                code="FORBIDDEN",
                message="Not an admin.",
            ).model_dump(),
        )


class ApproveRejectBody(BaseModel):
    transaction_uid: str
    admin_telegram_id: int


@router.get("/transactions/{transaction_uid}", response_model=ApiResponse[dict])
async def get_transaction_for_bot(
    transaction_uid: str,
    session: AsyncSession = Depends(get_async_session),
    _: None = Depends(_verify_bot_secret),
):
    """Get transaction details for the bot to display to admins."""
    result = await session.execute(
        select(Transaction).where(Transaction.transaction_uid == transaction_uid)
    )
    tx = result.scalar_one_or_none()
    if not tx:
        raise HTTPException(
            status_code=404,
            detail=ErrorDetail(
                code="NOT_FOUND",
                message="Transaction not found.",
            ).model_dump(),
        )

    # Get user details
    user_result = await session.execute(
        select(User).where(User.telegram_id == tx.telegram_id)
    )
    user = user_result.scalar_one_or_none()

    receipt_path = Path(tx.receipt_path)
    receipt_url = (
        f"/api/v1/admin/receipts/{transaction_uid}"
        if receipt_path.exists()
        else None
    )

    return ApiResponse(
        success=True,
        data={
            "transaction_uid": tx.transaction_uid,
            "telegram_id": tx.telegram_id,
            "username": user.username if user else None,
            "first_name": user.first_name if user else None,
            "currency": tx.currency,
            "payment_method": tx.payment_method,
            "amount": float(tx.amount),
            "status": tx.status,
            "created_at": tx.created_at.isoformat() if tx.created_at else None,
            "receipt_url": receipt_url,
        },
    )


@router.get("/receipts/{transaction_uid}")
async def get_receipt_file(
    transaction_uid: str,
    session: AsyncSession = Depends(get_async_session),
    _: None = Depends(_verify_bot_secret),
):
    """Serve the receipt file for admin review."""
    result = await session.execute(
        select(Transaction).where(Transaction.transaction_uid == transaction_uid)
    )
    tx = result.scalar_one_or_none()
    if not tx:
        raise HTTPException(status_code=404, detail="Transaction not found")
    path = Path(tx.receipt_path)
    if not path.exists():
        raise HTTPException(status_code=404, detail="Receipt file not found")
    return FileResponse(path, media_type="application/octet-stream")


@router.post("/approve", response_model=ApiResponse[dict])
async def admin_approve(
    body: ApproveRejectBody,
    session: AsyncSession = Depends(get_async_session),
    _: None = Depends(_verify_bot_secret),
):
    """Approve a pending transaction. Atomically updates wallet balance."""
    _verify_admin(body.admin_telegram_id)
    success, message, payload = await approve_transaction(
        session, body.transaction_uid, body.admin_telegram_id
    )
    if not success:
        raise HTTPException(
            status_code=400,
            detail=ErrorDetail(code="FAILED", message=message).model_dump(),
        )
    logger.info(
        "Transaction %s approved by admin %s",
        body.transaction_uid,
        body.admin_telegram_id,
    )
    return ApiResponse(success=True, data=payload or {})


@router.post("/reject", response_model=ApiResponse[dict])
async def admin_reject(
    body: ApproveRejectBody,
    session: AsyncSession = Depends(get_async_session),
    _: None = Depends(_verify_bot_secret),
):
    """Reject a pending transaction."""
    _verify_admin(body.admin_telegram_id)
    success, message, payload = await reject_transaction(
        session, body.transaction_uid, body.admin_telegram_id
    )
    if not success:
        raise HTTPException(
            status_code=400,
            detail=ErrorDetail(code="FAILED", message=message).model_dump(),
        )
    logger.info(
        "Transaction %s rejected by admin %s",
        body.transaction_uid,
        body.admin_telegram_id,
    )
    return ApiResponse(success=True, data=payload or {})
