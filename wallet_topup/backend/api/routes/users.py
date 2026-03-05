"""
Users: GET /me — return current user wallet balance (requires valid initData).
"""
import logging

from fastapi import APIRouter, Depends, Header, HTTPException
from sqlalchemy import select
from sqlalchemy.ext.asyncio import AsyncSession

from wallet_topup.backend.database import get_async_session
from wallet_topup.backend.models import User
from wallet_topup.backend.schemas.common import ApiResponse, ErrorDetail
from wallet_topup.backend.security.telegram import (
    get_telegram_id_from_validated,
    get_telegram_user_from_validated,
    validate_telegram_webapp_init_data,
)
from wallet_topup.backend.services import get_or_create_user

router = APIRouter()
logger = logging.getLogger(__name__)


@router.get("/me", response_model=ApiResponse[dict])
async def get_me(
    x_telegram_init_data: str | None = Header(None, alias="X-Telegram-Init-Data"),
    session: AsyncSession = Depends(get_async_session),
):
    """Return wallet balance for the authenticated Telegram user."""
    if not x_telegram_init_data:
        raise HTTPException(
            status_code=401,
            detail=ErrorDetail(
                code="MISSING_INIT_DATA",
                message="X-Telegram-Init-Data header is required.",
            ).model_dump(),
        )

    validated = validate_telegram_webapp_init_data(x_telegram_init_data)
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
                message="User data missing from session.",
            ).model_dump(),
        )

    tg_user = get_telegram_user_from_validated(validated)
    username = tg_user.get("username") if tg_user else None
    first_name = tg_user.get("first_name") if tg_user else None

    user = await get_or_create_user(
        session, telegram_id, username=username, first_name=first_name
    )

    return ApiResponse(
        success=True,
        data={
            "telegram_id": user.telegram_id,
            "username": user.username,
            "first_name": user.first_name,
            "wallet_balance": str(user.wallet_balance),
        },
    )
