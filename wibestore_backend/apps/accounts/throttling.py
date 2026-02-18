"""
WibeStore Backend - Accounts Throttling
"""

from rest_framework.throttling import SimpleRateThrottle


class AuthRateThrottle(SimpleRateThrottle):
    """Rate limiting for authentication endpoints."""

    scope = "auth"

    def get_cache_key(self, request, view):
        if request.user and request.user.is_authenticated:
            return self.cache_format % {
                "scope": self.scope,
                "ident": request.user.pk,
            }
        return self.cache_format % {
            "scope": self.scope,
            "ident": self.get_ident(request),
        }
