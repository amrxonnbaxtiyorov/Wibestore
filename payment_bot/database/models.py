"""
SQLAlchemy modellari: User va Payment.
"""
import enum
from datetime import datetime

from sqlalchemy import (
    BigInteger, Boolean, DateTime, Enum, ForeignKey,
    Integer, String, Text, func,
)
from sqlalchemy.orm import DeclarativeBase, Mapped, mapped_column, relationship


class Base(DeclarativeBase):
    pass


class PaymentType(str, enum.Enum):
    HUMO = "HUMO"
    VISA_MC = "VISA_MC"


class PaymentStatus(str, enum.Enum):
    PENDING = "PENDING"
    APPROVED = "APPROVED"
    REJECTED = "REJECTED"


class User(Base):
    __tablename__ = "users"

    id: Mapped[int] = mapped_column(Integer, primary_key=True, autoincrement=True)
    telegram_id: Mapped[int] = mapped_column(BigInteger, unique=True, nullable=False, index=True)
    username: Mapped[str | None] = mapped_column(String(64), nullable=True)
    first_name: Mapped[str | None] = mapped_column(String(128), nullable=True)
    last_name: Mapped[str | None] = mapped_column(String(128), nullable=True)
    is_banned: Mapped[bool] = mapped_column(Boolean, default=False, nullable=False)
    created_at: Mapped[datetime] = mapped_column(
        DateTime(timezone=True), server_default=func.now(), nullable=False
    )

    payments: Mapped[list["Payment"]] = relationship(
        "Payment", back_populates="user", cascade="all, delete-orphan"
    )

    @property
    def display_name(self) -> str:
        if self.username:
            return f"@{self.username}"
        parts = filter(None, [self.first_name, self.last_name])
        name = " ".join(parts)
        return name or f"user#{self.telegram_id}"

    def __repr__(self) -> str:
        return f"<User id={self.id} tg={self.telegram_id} {self.display_name}>"


class Payment(Base):
    __tablename__ = "payments"

    id: Mapped[int] = mapped_column(Integer, primary_key=True, autoincrement=True)
    user_id: Mapped[int] = mapped_column(
        Integer, ForeignKey("users.id", ondelete="CASCADE"), nullable=False, index=True
    )
    payment_type: Mapped[PaymentType] = mapped_column(
        Enum(PaymentType), nullable=False
    )
    receipt_file_id: Mapped[str | None] = mapped_column(String(256), nullable=True)
    receipt_path: Mapped[str | None] = mapped_column(String(512), nullable=True)
    status: Mapped[PaymentStatus] = mapped_column(
        Enum(PaymentStatus), default=PaymentStatus.PENDING, nullable=False, index=True
    )
    # Admin xabar ID — keyinchalik tahrirlab "Tasdiqlandi/Rad etildi" yozish uchun
    admin_message_id: Mapped[int | None] = mapped_column(BigInteger, nullable=True)
    admin_chat_id: Mapped[int | None] = mapped_column(BigInteger, nullable=True)
    admin_note: Mapped[str | None] = mapped_column(Text, nullable=True)
    reviewed_by: Mapped[int | None] = mapped_column(BigInteger, nullable=True)
    created_at: Mapped[datetime] = mapped_column(
        DateTime(timezone=True), server_default=func.now(), nullable=False
    )
    reviewed_at: Mapped[datetime | None] = mapped_column(DateTime(timezone=True), nullable=True)

    user: Mapped["User"] = relationship("User", back_populates="payments")

    @property
    def payment_type_label(self) -> str:
        labels = {
            PaymentType.HUMO: "HUMO karta",
            PaymentType.VISA_MC: "VISA / MasterCard",
        }
        return labels.get(self.payment_type, self.payment_type.value)

    def __repr__(self) -> str:
        return f"<Payment id={self.id} status={self.status.value} type={self.payment_type.value}>"
