"""
WibeStore Backend - Custom Middleware
"""

import logging
import time

from django.http import HttpRequest, HttpResponse

logger = logging.getLogger("apps")


class RequestLoggingMiddleware:
    """Log all incoming HTTP requests with timing."""

    def __init__(self, get_response):
        self.get_response = get_response

    def __call__(self, request: HttpRequest) -> HttpResponse:
        start_time = time.monotonic()

        response = self.get_response(request)

        duration = time.monotonic() - start_time
        logger.info(
            "%s %s %s %.3fs",
            request.method,
            request.get_full_path(),
            response.status_code,
            duration,
        )

        return response


class ContentSecurityPolicyMiddleware:
    """Add security headers to all responses."""

    def __init__(self, get_response):
        self.get_response = get_response

    def __call__(self, request: HttpRequest) -> HttpResponse:
        response = self.get_response(request)
        response["X-Content-Type-Options"] = "nosniff"
        response["X-Frame-Options"] = "DENY"
        response["X-XSS-Protection"] = "1; mode=block"
        response["Referrer-Policy"] = "strict-origin-when-cross-origin"
        return response
