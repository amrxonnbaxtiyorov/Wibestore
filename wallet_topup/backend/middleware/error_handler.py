"""
Global exception handling and standardized error responses.
"""
import logging

from fastapi import FastAPI, Request, status
from fastapi.responses import JSONResponse

from wallet_topup.backend.schemas.common import ApiResponse, ErrorDetail

logger = logging.getLogger(__name__)


async def generic_exception_handler(request: Request, exc: Exception) -> JSONResponse:
    logger.exception("Unhandled exception: %s", exc)
    return JSONResponse(
        status_code=status.HTTP_500_INTERNAL_SERVER_ERROR,
        content=ApiResponse(
            success=False,
            error=ErrorDetail(
                code="INTERNAL_ERROR",
                message="An unexpected error occurred.",
                detail=str(exc) if __debug__ else None,
            ),
        ).model_dump(),
    )


def setup_exception_handlers(app: FastAPI) -> None:
    app.add_exception_handler(Exception, generic_exception_handler)
