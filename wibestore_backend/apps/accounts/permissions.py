"""
WibeStore Backend - Accounts Permissions
"""

from rest_framework import permissions


class IsAccountOwner(permissions.BasePermission):
    """Only allow users to modify their own account."""

    def has_object_permission(self, request, view, obj) -> bool:
        return obj == request.user


class IsAuthenticatedAndVerified(permissions.BasePermission):
    """Allow access only to authenticated and verified users."""

    message = "You must verify your email to perform this action."

    def has_permission(self, request, view) -> bool:
        return bool(
            request.user
            and request.user.is_authenticated
            and request.user.is_verified
        )
