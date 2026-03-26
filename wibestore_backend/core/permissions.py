"""
WibeStore Backend - Common Permissions
"""

import hmac
import hashlib
import time

from rest_framework import permissions


class IsTelegramBot(permissions.BasePermission):
    """
    Allow access only to requests from Telegram bot.
    Checks:
    1. X-Bot-Secret header matches TELEGRAM_BOT_SECRET
    2. X-Bot-Timestamp is not older than 60 seconds (replay protection)
    3. Falls back to body secret_key check for backward compatibility
    """

    def has_permission(self, request, view) -> bool:
        from django.conf import settings
        bot_secret = getattr(settings, 'TELEGRAM_BOT_SECRET', None)
        if not bot_secret:
            return False

        # Method 1: Header-based auth (preferred)
        request_secret = request.headers.get('X-Bot-Secret', '')
        if request_secret:
            if not hmac.compare_digest(request_secret, bot_secret):
                return False
            # Timestamp check (replay protection)
            timestamp = request.headers.get('X-Bot-Timestamp', '')
            if timestamp:
                try:
                    ts = int(timestamp)
                    if abs(time.time() - ts) > 60:
                        return False
                except (ValueError, TypeError):
                    return False
            return True

        # Method 2: Body secret_key (backward compatibility with existing bot)
        body_secret = ''
        if hasattr(request, 'data'):
            body_secret = request.data.get('secret_key', '')
        if body_secret and hmac.compare_digest(str(body_secret), bot_secret):
            return True

        return False


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
    """Allow access only to verified admin users (is_staff + phone check)."""

    def has_permission(self, request, view) -> bool:
        if not request.user or not request.user.is_staff:
            return False
        from django.conf import settings
        admin_phones = getattr(settings, 'ADMIN_PHONE_NUMBERS', [])
        if not admin_phones:
            return True  # Agar sozlanmagan bo'lsa — faqat is_staff tekshiriladi
        user_phone = (getattr(request.user, 'phone_number', '') or '').replace('+', '').replace(' ', '').replace('-', '')
        return any(user_phone and p.replace('+', '') in user_phone for p in admin_phones)


class IsSuperUser(permissions.BasePermission):
    """Allow access only to superusers."""

    def has_permission(self, request, view) -> bool:
        return bool(request.user and request.user.is_superuser)


class IsVerifiedUser(permissions.BasePermission):
    """Allow access only to verified users."""

    message = "Email or phone must be verified to perform this action."

    def has_permission(self, request, view) -> bool:
        return bool(request.user and request.user.is_verified)
