"""
Seed payment method configs (UZS: HUMO, UZCARD; USDT: VISA, MasterCard).
Run after migrations. Edit card numbers in DB or via env for production.
"""
import asyncio
import os
import sys

# Add repo root so wallet_topup.backend is importable
sys.path.insert(0, os.path.dirname(os.path.dirname(os.path.dirname(os.path.dirname(os.path.abspath(__file__))))))

from sqlalchemy import select

from wallet_topup.backend.database.session import async_session_maker
from wallet_topup.backend.models import PaymentMethodConfig


async def seed():
    async with async_session_maker() as session:
        result = await session.execute(select(PaymentMethodConfig).limit(1))
        if result.scalar_one_or_none():
            print("Payment methods already seeded.")
            return
        for row in [
            ("UZS", "HUMO", "HUMO", "8600 **** **** 1234"),
            ("UZS", "UZCARD", "UZCARD", "9860 **** **** 5678"),
            ("USDT", "VISA", "VISA", "Card ending **** 1234"),
            ("USDT", "MasterCard", "MasterCard", "Card ending **** 5678"),
        ]:
            session.add(
                PaymentMethodConfig(
                    currency=row[0],
                    method_code=row[1],
                    display_name=row[2],
                    card_number=row[3],
                    is_active=True,
                )
            )
        await session.commit()
        print("Seeded 4 payment methods.")


if __name__ == "__main__":
    asyncio.run(seed())
