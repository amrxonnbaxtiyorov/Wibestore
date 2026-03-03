from aiogram import Router

from wallet_topup.bot.handlers.user import router as user_router
from wallet_topup.bot.handlers.admin import router as admin_router


def setup_routers(root: Router) -> None:
    root.include_router(user_router)
    root.include_router(admin_router)
