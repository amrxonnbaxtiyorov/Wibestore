"""
User repository — foydalanuvchilar bilan DB operatsiyalari.
"""
from sqlalchemy import select
from sqlalchemy.ext.asyncio import AsyncSession

from database.models import User


class UserRepository:
    def __init__(self, session: AsyncSession) -> None:
        self._session = session

    async def get_by_telegram_id(self, telegram_id: int) -> User | None:
        result = await self._session.execute(
            select(User).where(User.telegram_id == telegram_id)
        )
        return result.scalar_one_or_none()

    async def get_or_create(
        self,
        telegram_id: int,
        username: str | None = None,
        first_name: str | None = None,
        last_name: str | None = None,
    ) -> tuple[User, bool]:
        """Foydalanuvchini olish yoki yangi yaratish. (user, created) qaytaradi."""
        user = await self.get_by_telegram_id(telegram_id)
        if user:
            # Ma'lumotlarni yangilash
            changed = False
            if username is not None and user.username != username:
                user.username = username
                changed = True
            if first_name is not None and user.first_name != first_name:
                user.first_name = first_name
                changed = True
            if last_name is not None and user.last_name != last_name:
                user.last_name = last_name
                changed = True
            if changed:
                self._session.add(user)
            return user, False

        user = User(
            telegram_id=telegram_id,
            username=username,
            first_name=first_name,
            last_name=last_name,
        )
        self._session.add(user)
        await self._session.flush()  # ID olish uchun
        return user, True

    async def is_banned(self, telegram_id: int) -> bool:
        user = await self.get_by_telegram_id(telegram_id)
        return user.is_banned if user else False

    async def set_banned(self, telegram_id: int, banned: bool) -> bool:
        user = await self.get_by_telegram_id(telegram_id)
        if not user:
            return False
        user.is_banned = banned
        self._session.add(user)
        return True
