"""
Wallet Top-Up - Transaction model (top-up requests with receipt).
"""
from datetime import datetime
from typing import TYPE_CHECKING

from sqlalchemy import BigInteger, DateTime, Numeric, String, Text, func
from sqlalchemy.orm import Mapped, mapped_column, relationship

from wallet_topup.backend.database.base import Base

if TYPE_CHECKING:
    from wallet_topup.backend.models.user import User


class Transaction(Base):
    __tablename__ = "transactions"

    id: Mapped[int] = mapped_column(primary_key=True, autoincrement=True)
    transaction_uid: Mapped[str] = mapped_column(String(36), unique=True, index=True, nullable=False)
    telegram_id: Mapped[int] = mapped_column(BigInteger, index=True, nullable=False)
    currency: Mapped[str] = mapped_column(String(10), nullable=False)  # UZS, USDT
    payment_method: Mapped[str] = mapped_column(String(50), nullable=False)  # HUMO, UZCARD, VISA, MasterCard
    amount: Mapped[float] = mapped_column(Numeric(18, 2), nullable=False)
    receipt_path: Mapped[str] = mapped_column(Text, nullable=False)
    status: Mapped[str] = mapped_column(String(20), default="PENDING", index=True)  # PENDING, APPROVED, REJECTED
    admin_id: Mapped[int | None] = mapped_column(BigInteger, nullable=True)
    created_at: Mapped[datetime] = mapped_column(DateTime(timezone=True), server_default=func.now())
    updated_at: Mapped[datetime] = mapped_column(
        DateTime(timezone=True), server_default=func.now(), onupdate=func.now()
    )

    user: Mapped["User"] = relationship(
        "User",
        back_populates="transactions",
        foreign_keys=[telegram_id],
        primaryjoin="Transaction.telegram_id == User.telegram_id",
        lazy="joined",
    )

    def __repr__(self) -> str:
        return f"Transaction(uid={self.transaction_uid}, status={self.status})"
