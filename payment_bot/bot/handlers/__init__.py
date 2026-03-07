from bot.handlers.start import router as start_router
from bot.handlers.payment import router as payment_router
from bot.handlers.admin import router as admin_router

__all__ = ["start_router", "payment_router", "admin_router"]
