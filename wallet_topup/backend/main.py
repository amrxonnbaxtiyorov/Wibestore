"""
Wallet Top-Up Backend - FastAPI app.
Production-ready with proper lifecycle, CORS, and error handling.
"""
import logging
import sys

from contextlib import asynccontextmanager

from fastapi import FastAPI
from fastapi.middleware.cors import CORSMiddleware
from fastapi.staticfiles import StaticFiles

from wallet_topup.backend.api import api_router
from wallet_topup.backend.config import settings
from wallet_topup.backend.database import init_db
from wallet_topup.backend.middleware import setup_exception_handlers

logging.basicConfig(
    level=getattr(logging, settings.LOG_LEVEL.upper(), logging.INFO),
    format="%(asctime)s [%(levelname)s] %(name)s: %(message)s",
    stream=sys.stdout,
)
logger = logging.getLogger(__name__)


@asynccontextmanager
async def lifespan(app: FastAPI):
    """Application lifecycle: start DB, create upload dir."""
    logger.info("Starting %s ...", settings.APP_NAME)
    settings.ensure_upload_dir()
    await init_db()
    logger.info("Database initialized, upload dir ready.")
    yield
    logger.info("Shutting down %s ...", settings.APP_NAME)


app = FastAPI(
    title=settings.APP_NAME,
    version="1.0.0",
    lifespan=lifespan,
    docs_url="/docs" if settings.DEBUG else None,
    redoc_url="/redoc" if settings.DEBUG else None,
)

app.add_middleware(
    CORSMiddleware,
    allow_origins=settings.get_cors_origins(),
    allow_credentials=True,
    allow_methods=["GET", "POST", "OPTIONS"],
    allow_headers=["*"],
)

# Serve uploaded receipts statically (behind bot secret in admin routes)
app.include_router(api_router)
setup_exception_handlers(app)


if __name__ == "__main__":
    import uvicorn
    uvicorn.run(
        "wallet_topup.backend.main:app",
        host=settings.HOST,
        port=settings.PORT,
        reload=settings.DEBUG,
    )
