"""
WibeStore Backend - Custom Exception Handler
"""

import logging

from django.core.exceptions import PermissionDenied, ValidationError
from django.http import Http404
from rest_framework import status
from rest_framework.exceptions import APIException
from rest_framework.response import Response
from rest_framework.views import exception_handler

logger = logging.getLogger("apps")


def custom_exception_handler(exc, context) -> Response | None:
    """
    Custom exception handler that returns consistent error responses.

    Response format:
    {
        "success": false,
        "error": {
            "code": "ERROR_CODE",
            "message": "Human-readable message",
            "details": {}  // optional
        }
    }
    """
    response = exception_handler(exc, context)

    if response is not None:
        error_data = {
            "success": False,
            "error": {
                "code": _get_error_code(exc),
                "message": _get_error_message(exc, response),
                "details": _get_error_details(response),
            },
        }
        response.data = error_data
        return response

    # Handle Django's built-in exceptions
    if isinstance(exc, Http404):
        return Response(
            {
                "success": False,
                "error": {
                    "code": "NOT_FOUND",
                    "message": "Requested resource not found.",
                    "details": {},
                },
            },
            status=status.HTTP_404_NOT_FOUND,
        )

    if isinstance(exc, PermissionDenied):
        return Response(
            {
                "success": False,
                "error": {
                    "code": "PERMISSION_DENIED",
                    "message": "You do not have permission to perform this action.",
                    "details": {},
                },
            },
            status=status.HTTP_403_FORBIDDEN,
        )

    if isinstance(exc, ValidationError):
        return Response(
            {
                "success": False,
                "error": {
                    "code": "VALIDATION_ERROR",
                    "message": str(exc),
                    "details": exc.message_dict if hasattr(exc, "message_dict") else {},
                },
            },
            status=status.HTTP_400_BAD_REQUEST,
        )

    # Log unhandled exceptions
    logger.exception("Unhandled exception", exc_info=exc)
    return None


def _get_error_code(exc) -> str:
    """Get a machine-readable error code."""
    if isinstance(exc, APIException):
        code = getattr(exc, "default_code", "error")
        return str(code).upper().replace(" ", "_")
    return "INTERNAL_ERROR"


def _get_error_message(exc, response) -> str:
    """Get a human-readable error message."""
    if hasattr(exc, "detail"):
        if isinstance(exc.detail, str):
            return exc.detail
        if isinstance(exc.detail, list):
            return exc.detail[0] if exc.detail else "An error occurred."
    return "An error occurred."


def _get_error_details(response) -> dict:
    """Get error details (field-level errors)."""
    if isinstance(response.data, dict):
        details = {}
        for key, value in response.data.items():
            if key in ("detail", "non_field_errors"):
                continue
            if isinstance(value, list):
                details[key] = [str(v) for v in value]
            else:
                details[key] = str(value)
        return details
    return {}


class BusinessLogicError(APIException):
    """Custom exception for business logic errors."""

    status_code = status.HTTP_400_BAD_REQUEST
    default_detail = "A business logic error occurred."
    default_code = "BUSINESS_LOGIC_ERROR"


class InsufficientFundsError(APIException):
    """Exception for insufficient balance."""

    status_code = status.HTTP_402_PAYMENT_REQUIRED
    default_detail = "Insufficient funds."
    default_code = "INSUFFICIENT_FUNDS"


class ResourceConflictError(APIException):
    """Exception for resource conflicts."""

    status_code = status.HTTP_409_CONFLICT
    default_detail = "Resource conflict."
    default_code = "RESOURCE_CONFLICT"
