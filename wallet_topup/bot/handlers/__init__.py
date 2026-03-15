from aiogram import Router

from wallet_topup.bot.handlers.user import router as user_router
from wallet_topup.bot.handlers.admin import router as admin_router
from wallet_topup.bot.handlers.support import router as support_router


def setup_routers(root: Router) -> None:
    root.include_router(support_router)  # support first — has FSM states
    root.include_router(admin_router)    # admin before user — admin /balance takes priority
    root.include_router(user_router)
