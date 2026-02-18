"""
WibeStore Backend - Common Permissions
"""

from rest_framework import permissions


class IsOwner(permissions.BasePermission):
    """Allow access only to object owner."""

    def has_object_permission(self, request, view, obj) -> bool:
        if hasattr(obj, "user"):
            return obj.user == request.user
        if hasattr(obj, "seller"):
            return obj.seller == request.user
        if hasattr(obj, "owner"):
            return obj.owner == request.user
        return False


class IsOwnerOrReadOnly(permissions.BasePermission):
    """Allow write access only to owner, read to anyone."""

    def has_object_permission(self, request, view, obj) -> bool:
        if request.method in permissions.SAFE_METHODS:
            return True
        if hasattr(obj, "user"):
            return obj.user == request.user
        if hasattr(obj, "seller"):
            return obj.seller == request.user
        return False


class IsAdminUser(permissions.BasePermission):
    """Allow access only to admin/staff users."""

    def has_permission(self, request, view) -> bool:
        return bool(request.user and request.user.is_staff)


class IsSuperUser(permissions.BasePermission):
    """Allow access only to superusers."""

    def has_permission(self, request, view) -> bool:
        return bool(request.user and request.user.is_superuser)


class IsVerifiedUser(permissions.BasePermission):
    """Allow access only to verified users."""

    message = "Email or phone must be verified to perform this action."

    def has_permission(self, request, view) -> bool:
        return bool(request.user and request.user.is_verified)
