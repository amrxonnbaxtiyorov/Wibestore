"""
WibeStore Backend - Marketplace Permissions
"""

from rest_framework import permissions


class IsListingOwner(permissions.BasePermission):
    """Allow only listing owner to modify."""

    def has_object_permission(self, request, view, obj) -> bool:
        if request.method in permissions.SAFE_METHODS:
            return True
        return obj.seller == request.user
