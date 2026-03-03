from fastapi import APIRouter

from wallet_topup.backend.api.routes import admin, health, payment_methods, submit

api_router = APIRouter(prefix="/api/v1")
api_router.include_router(health.router, tags=["health"])
api_router.include_router(payment_methods.router, prefix="/payment-methods", tags=["payment-methods"])
api_router.include_router(submit.router, prefix="/submit", tags=["submit"])
api_router.include_router(admin.router, prefix="/admin", tags=["admin"])
