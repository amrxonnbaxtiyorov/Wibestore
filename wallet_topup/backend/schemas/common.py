"""
Standard API response and common DTOs.
"""
from datetime import datetime
from typing import Any, Generic, TypeVar

from pydantic import BaseModel, Field

T = TypeVar("T")


class ErrorDetail(BaseModel):
    code: str
    message: str
    detail: str | None = None


class ApiResponse(BaseModel, Generic[T]):
    success: bool = True
    data: T | None = None
    error: ErrorDetail | None = None


class PaymentMethodOut(BaseModel):
    code: str
    display_name: str
    card_number: str | None = None


class TransactionOut(BaseModel):
    transaction_uid: str
    status: str
    amount: float
    currency: str
    payment_method: str
    created_at: datetime

    class Config:
        from_attributes = True
