"""
Wallet Top-Up - User model (telegram_id, wallet_balance).
"""
from datetime import datetime

from sqlalchemy import BigInteger, DateTime, Numeric, func
from sqlalchemy.orm import Mapped, mapped_column, relationship

from wallet_topup.backend.database.base import Base


class User(Base):
    __tablename__ = "users"

    id: Mapped[int] = mapped_column(primary_key=True, autoincrement=True)
    telegram_id: Mapped[int] = mapped_column(BigInteger, unique=True, index=True, nullable=False)
    wallet_balance: Mapped[float] = mapped_column(Numeric(18, 2), default=0, nullable=False)
    created_at: Mapped[datetime] = mapped_column(DateTime(timezone=True), server_default=func.now())

    transactions: Mapped[list["Transaction"]] = relationship(
        "Transaction",
        back_populates="user",
        foreign_keys="Transaction.telegram_id",
        primaryjoin="User.telegram_id == Transaction.telegram_id",
        lazy="selectin",
    )

    def __repr__(self) -> str:
        return f"User(telegram_id={self.telegram_id}, balance={self.wallet_balance})"
