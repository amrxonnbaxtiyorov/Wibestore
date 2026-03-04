"""
Async SQLAlchemy engine + session factory.
Production pool settings with pre-ping, overflow, and recycle.
"""
from collections.abc import AsyncGenerator

from sqlalchemy.ext.asyncio import (
    AsyncSession,
    async_sessionmaker,
    create_async_engine,
)

from wallet_topup.backend.config import settings
from wallet_topup.backend.database.base import Base

engine = create_async_engine(
    settings.DATABASE_URL,
    echo=settings.DEBUG,
    pool_pre_ping=True,
    pool_size=20,
    max_overflow=30,
    pool_recycle=1800,  # recycle connections every 30 min
)

async_session_maker = async_sessionmaker(
    engine,
    class_=AsyncSession,
    expire_on_commit=False,
    autocommit=False,
    autoflush=False,
)


async def get_async_session() -> AsyncGenerator[AsyncSession, None]:
    """FastAPI dependency — yields a session that auto-commits on success."""
    async with async_session_maker() as session:
        try:
            yield session
            await session.commit()
        except Exception:
            await session.rollback()
            raise
        finally:
            await session.close()


async def init_db() -> None:
    """Create all tables (use Alembic in production instead)."""
    async with engine.begin() as conn:
        await conn.run_sync(Base.metadata.create_all)
