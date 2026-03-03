"""
Submit top-up: validate initData, rate limit, no pending, save receipt, create transaction.
"""
import logging
import uuid
from pathlib import Path

from fastapi import APIRouter, Depends, File, Form, HTTPException, UploadFile
from sqlalchemy.ext.asyncio import AsyncSession

from wallet_topup.backend.config import settings
from wallet_topup.backend.database import get_async_session
from wallet_topup.backend.schemas.common import ApiResponse, ErrorDetail, TransactionOut
from wallet_topup.backend.security.telegram import (
    get_telegram_id_from_validated,
    validate_telegram_webapp_init_data,
)
from wallet_topup.backend.services import (
    create_pending_transaction,
    get_or_create_user,
    has_pending_transaction,
    rate_limit_submission,
    publish_new_pending,
)

router = APIRouter()
logger = logging.getLogger(__name__)


def _validate_amount(currency: str, amount: float) -> None:
    if currency == "UZS" and amount < settings.MIN_AMOUNT_UZS:
        raise HTTPException(
            status_code=400,
            detail=ErrorDetail(
                code="AMOUNT_TOO_LOW",
                message=f"Minimum amount for UZS is {settings.MIN_AMOUNT_UZS}",
            ),
        )
    if currency == "USDT" and amount < settings.MIN_AMOUNT_USDT:
        raise HTTPException(
            status_code=400,
            detail=ErrorDetail(
                code="AMOUNT_TOO_LOW",
                message=f"Minimum amount for USDT is {settings.MIN_AMOUNT_USDT}",
            ),
        )


async def _save_receipt(file: UploadFile, transaction_uid: str) -> str:
    ext = Path(file.filename or "bin").suffix or ".bin"
    if ext.lower() not in (".jpg", ".jpeg", ".png", ".webp", ".gif", ".pdf"):
        ext = ".bin"
    safe_uid = transaction_uid.replace("-", "_")
    filename = f"{safe_uid}{ext}"
    upload_dir = Path(settings.UPLOAD_DIR_STR)
    upload_dir.mkdir(parents=True, exist_ok=True)
    path = upload_dir / filename
    content = await file.read()
    if len(content) > settings.MAX_RECEIPT_SIZE_BYTES:
        raise HTTPException(
            status_code=400,
            detail=ErrorDetail(
                code="FILE_TOO_LARGE",
                message=f"Max file size is {settings.MAX_RECEIPT_SIZE_BYTES // (1024*1024)} MB",
            ),
        )
    mime = file.content_type or ""
    if mime and mime not in settings.ALLOWED_RECEIPT_MIMES:
        raise HTTPException(
            status_code=400,
            detail=ErrorDetail(
                code="INVALID_FILE_TYPE",
                message="Allowed: image (jpeg, png, webp, gif) or PDF",
            ),
        )
    with open(path, "wb") as f:
        f.write(content)
    return str(path)


@router.post("", response_model=ApiResponse[TransactionOut])
async def submit_topup(
    session: AsyncSession = Depends(get_async_session),
    init_data: str = Form(..., alias="initData"),
    currency: str = Form(..., pattern="^(UZS|USDT)$"),
    payment_method: str = Form(..., min_length=1, max_length=50),
    amount: float = Form(..., gt=0),
    receipt: UploadFile = File(...),
):
    validated = validate_telegram_webapp_init_data(init_data)
    if not validated:
        raise HTTPException(
            status_code=401,
            detail=ErrorDetail(
                code="INVALID_INIT_DATA",
                message="Invalid or expired Telegram session.",
            ),
        )
    telegram_id = get_telegram_id_from_validated(validated)
    if not telegram_id:
        raise HTTPException(
            status_code=401,
            detail=ErrorDetail(code="INVALID_USER", message="User data missing."),
        )

    _validate_amount(currency, amount)

    allowed, msg = await rate_limit_submission(telegram_id)
    if not allowed:
        raise HTTPException(status_code=429, detail=ErrorDetail(code="RATE_LIMIT", message=msg))

    transaction_uid = str(uuid.uuid4())
    receipt_path = await _save_receipt(receipt, transaction_uid)

    await get_or_create_user(session, telegram_id)
    if await has_pending_transaction(session, telegram_id):
        raise HTTPException(
            status_code=400,
            detail=ErrorDetail(
                code="PENDING_EXISTS",
                message="You already have a pending top-up. Wait for admin review.",
            ),
        )

    tx = await create_pending_transaction(
        session,
        telegram_id=telegram_id,
        currency=currency,
        payment_method=payment_method,
        amount=amount,
        receipt_path=receipt_path,
        transaction_uid=transaction_uid,
    )
    await session.commit()
    logger.info(
        "Top-up submitted: uid=%s telegram_id=%s amount=%s %s",
        transaction_uid,
        telegram_id,
        amount,
        currency,
    )
    await publish_new_pending(
        tx.transaction_uid,
        {"telegram_id": telegram_id, "amount": amount, "currency": currency},
    )
    return ApiResponse(
        success=True,
        data=TransactionOut(
            transaction_uid=tx.transaction_uid,
            status=tx.status,
            amount=float(tx.amount),
            currency=tx.currency,
            payment_method=tx.payment_method,
            created_at=tx.created_at,
        ),
    )
