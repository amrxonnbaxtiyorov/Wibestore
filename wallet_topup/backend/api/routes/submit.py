"""
Submit top-up: validate initData, rate limit, no pending, save receipt, create transaction.
"""
import logging
import secrets
from pathlib import Path

from fastapi import APIRouter, Depends, File, Form, HTTPException, Request, UploadFile
from sqlalchemy.ext.asyncio import AsyncSession

from wallet_topup.backend.config import settings
from wallet_topup.backend.database import get_async_session
from wallet_topup.backend.schemas.common import ApiResponse, ErrorDetail, TransactionOut
from wallet_topup.backend.security.telegram import (
    get_telegram_id_from_validated,
    get_telegram_user_from_validated,
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

# Magic bytes for file type validation
MAGIC_BYTES: list[tuple[bytes, int, bytes, str]] = [
    # (prefix, offset_of_sub, sub_signature, mime)
    (b"\xff\xd8\xff", 0, b"", "image/jpeg"),
    (b"\x89PNG\r\n\x1a\n", 0, b"", "image/png"),
    # WebP: starts with RIFF, then 4 bytes file size, then WEBP
    (b"RIFF", 8, b"WEBP", "image/webp"),
    (b"GIF87a", 0, b"", "image/gif"),
    (b"GIF89a", 0, b"", "image/gif"),
    (b"%PDF", 0, b"", "application/pdf"),
]


def _detect_mime(content: bytes) -> str | None:
    """Detect MIME type from magic bytes."""
    for prefix, sub_offset, sub_sig, mime in MAGIC_BYTES:
        if content[:len(prefix)] == prefix:
            if sub_sig:
                # Verify secondary signature (e.g., WEBP at bytes 8-11)
                if content[sub_offset:sub_offset + len(sub_sig)] == sub_sig:
                    return mime
            else:
                return mime
    return None


def _validate_amount(currency: str, amount: float) -> None:
    """Validate amount against configured min/max limits."""
    if amount <= 0:
        raise HTTPException(
            status_code=400,
            detail=ErrorDetail(
                code="INVALID_AMOUNT",
                message="Amount must be positive.",
            ).model_dump(),
        )
    if currency == "UZS":
        if amount < settings.MIN_AMOUNT_UZS:
            raise HTTPException(
                status_code=400,
                detail=ErrorDetail(
                    code="AMOUNT_TOO_LOW",
                    message=f"Minimum amount for UZS is {int(settings.MIN_AMOUNT_UZS):,}",
                ).model_dump(),
            )
        if amount > settings.MAX_AMOUNT_UZS:
            raise HTTPException(
                status_code=400,
                detail=ErrorDetail(
                    code="AMOUNT_TOO_HIGH",
                    message=f"Maximum amount for UZS is {int(settings.MAX_AMOUNT_UZS):,}",
                ).model_dump(),
            )
    elif currency == "USDT":
        if amount < settings.MIN_AMOUNT_USDT:
            raise HTTPException(
                status_code=400,
                detail=ErrorDetail(
                    code="AMOUNT_TOO_LOW",
                    message=f"Minimum amount for USDT is {settings.MIN_AMOUNT_USDT}",
                ).model_dump(),
            )
        if amount > settings.MAX_AMOUNT_USDT:
            raise HTTPException(
                status_code=400,
                detail=ErrorDetail(
                    code="AMOUNT_TOO_HIGH",
                    message=f"Maximum amount for USDT is {settings.MAX_AMOUNT_USDT:,}",
                ).model_dump(),
            )


async def _save_receipt(file: UploadFile, transaction_uid: str) -> tuple[str, str]:
    """Save uploaded receipt file with validation."""
    content = await file.read()

    # Validate file size
    if len(content) > settings.MAX_RECEIPT_SIZE_BYTES:
        raise HTTPException(
            status_code=400,
            detail=ErrorDetail(
                code="FILE_TOO_LARGE",
                message=f"Max file size is {settings.MAX_RECEIPT_SIZE_BYTES // (1024*1024)} MB",
            ).model_dump(),
        )

    # Validate file is not empty
    if len(content) == 0:
        raise HTTPException(
            status_code=400,
            detail=ErrorDetail(
                code="EMPTY_FILE",
                message="Receipt file is empty.",
            ).model_dump(),
        )

    # Validate MIME type via magic bytes (do NOT trust Content-Type header)
    detected_mime = _detect_mime(content)
    if detected_mime is None:
        # Fallback to Content-Type header
        mime = file.content_type or ""
        if mime not in settings.ALLOWED_RECEIPT_MIMES:
            raise HTTPException(
                status_code=400,
                detail=ErrorDetail(
                    code="INVALID_FILE_TYPE",
                    message="Allowed: image (jpeg, png, webp, gif) or PDF",
                ).model_dump(),
            )
    elif detected_mime not in settings.ALLOWED_RECEIPT_MIMES:
        raise HTTPException(
            status_code=400,
            detail=ErrorDetail(
                code="INVALID_FILE_TYPE",
                message="Allowed: image (jpeg, png, webp, gif) or PDF",
            ).model_dump(),
        )

    # Determine file extension from detected MIME or original filename
    mime_to_ext = {
        "image/jpeg": ".jpg",
        "image/png": ".png",
        "image/webp": ".webp",
        "image/gif": ".gif",
        "application/pdf": ".pdf",
    }
    ext = mime_to_ext.get(detected_mime or "", "")
    if not ext:
        ext = Path(file.filename or "receipt.bin").suffix or ".bin"
        if ext.lower() not in (".jpg", ".jpeg", ".png", ".webp", ".gif", ".pdf"):
            ext = ".bin"

    safe_uid = transaction_uid.replace("-", "_")
    filename = f"{safe_uid}{ext}"
    upload_dir = Path(settings.UPLOAD_DIR_STR)
    upload_dir.mkdir(parents=True, exist_ok=True)
    path = upload_dir / filename

    with open(path, "wb") as f:
        f.write(content)

    return str(path), detected_mime or (file.content_type or "")


@router.post("", response_model=ApiResponse[TransactionOut])
async def submit_topup(
    request: Request,
    session: AsyncSession = Depends(get_async_session),
    init_data: str = Form(..., alias="initData"),
    currency: str = Form(..., pattern="^(UZS|USDT)$"),
    payment_method: str = Form(..., min_length=1, max_length=50),
    amount: float = Form(..., gt=0),
    receipt: UploadFile = File(...),
):
    """Submit a wallet top-up request."""
    # 1) Validate Telegram session
    validated = validate_telegram_webapp_init_data(init_data)
    if not validated:
        raise HTTPException(
            status_code=401,
            detail=ErrorDetail(
                code="INVALID_INIT_DATA",
                message="Invalid or expired Telegram session.",
            ).model_dump(),
        )
    telegram_id = get_telegram_id_from_validated(validated)
    if not telegram_id:
        raise HTTPException(
            status_code=401,
            detail=ErrorDetail(
                code="INVALID_USER",
                message="User data missing.",
            ).model_dump(),
        )

    # Extract user info for storage
    tg_user = get_telegram_user_from_validated(validated)
    username = tg_user.get("username") if tg_user else None
    first_name = tg_user.get("first_name") if tg_user else None

    # Capture client IP address (X-Forwarded-For for proxy setups, else direct)
    forwarded_for = request.headers.get("X-Forwarded-For")
    ip_address = forwarded_for.split(",")[0].strip() if forwarded_for else (
        request.client.host if request.client else None
    )

    # 2) Validate amount
    _validate_amount(currency, amount)

    # 3) Check rate limit
    allowed, msg = await rate_limit_submission(telegram_id)
    if not allowed:
        raise HTTPException(
            status_code=429,
            detail=ErrorDetail(code="RATE_LIMIT", message=msg).model_dump(),
        )

    # 4) Get/create user, check banned, check no pending transaction
    user = await get_or_create_user(session, telegram_id, username=username, first_name=first_name)
    if user.is_banned:
        raise HTTPException(
            status_code=403,
            detail=ErrorDetail(
                code="BANNED",
                message="Your account has been restricted. Please contact support.",
            ).model_dump(),
        )
    if await has_pending_transaction(session, telegram_id):
        raise HTTPException(
            status_code=400,
            detail=ErrorDetail(
                code="PENDING_EXISTS",
                message="You already have a pending top-up. Wait for admin review.",
            ).model_dump(),
        )

    # 5) Save receipt
    transaction_uid = "TXN-" + secrets.token_hex(6).upper()
    receipt_path, receipt_mime = await _save_receipt(receipt, transaction_uid)

    # 6) Create transaction
    tx = await create_pending_transaction(
        session,
        telegram_id=telegram_id,
        currency=currency,
        payment_method=payment_method,
        amount=amount,
        receipt_path=receipt_path,
        receipt_mime=receipt_mime,
        username=username,
        transaction_uid=transaction_uid,
        ip_address=ip_address,
    )

    # Session auto-commits via dependency — no explicit commit needed

    logger.info(
        "Top-up submitted: uid=%s telegram_id=%s amount=%s %s",
        transaction_uid,
        telegram_id,
        amount,
        currency,
    )

    # 7) Notify admin via Redis pub/sub
    await publish_new_pending(
        tx.transaction_uid,
        {
            "telegram_id": telegram_id,
            "username": username or "",
            "first_name": first_name or "",
            "amount": amount,
            "currency": currency,
            "payment_method": payment_method,
        },
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
