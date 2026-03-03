"""
Payment methods by currency (card numbers from backend).
"""
from fastapi import APIRouter, Depends, Query
from sqlalchemy.ext.asyncio import AsyncSession

from wallet_topup.backend.database import get_async_session
from wallet_topup.backend.schemas.common import ApiResponse, PaymentMethodOut
from wallet_topup.backend.services import get_payment_methods

router = APIRouter()


@router.get("", response_model=ApiResponse[list[PaymentMethodOut]])
async def list_payment_methods(
    currency: str = Query(..., pattern="^(UZS|USDT)$"),
    session: AsyncSession = Depends(get_async_session),
):
    methods = await get_payment_methods(session, currency)
    return ApiResponse(success=True, data=list(methods))
