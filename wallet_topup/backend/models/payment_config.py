"""
Wallet Top-Up - Payment method config (card numbers / labels from backend).
"""
from sqlalchemy import String, Text
from sqlalchemy.orm import Mapped, mapped_column

from wallet_topup.backend.database.base import Base


class PaymentMethodConfig(Base):
    """Stores card numbers or labels for UZS/USDT methods. Fetched by Web App."""

    __tablename__ = "payment_method_configs"

    id: Mapped[int] = mapped_column(primary_key=True, autoincrement=True)
    currency: Mapped[str] = mapped_column(String(10), nullable=False)  # UZS, USDT
    method_code: Mapped[str] = mapped_column(String(50), nullable=False)  # HUMO, UZCARD, VISA, MasterCard
    display_name: Mapped[str] = mapped_column(String(100), nullable=False)
    card_number: Mapped[str] = mapped_column(Text, nullable=True)  # optional; can be "Card ending ****1234"
    is_active: Mapped[bool] = mapped_column(default=True)

    def __repr__(self) -> str:
        return f"PaymentMethodConfig({self.currency}/{self.method_code})"
