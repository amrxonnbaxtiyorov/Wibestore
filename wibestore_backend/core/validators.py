"""
WibeStore Backend - Custom Validators
"""

import re

from django.core.exceptions import ValidationError
from django.utils.translation import gettext_lazy as _


def validate_uzbek_phone_number(value: str) -> None:
    """
    Validate phone numbers for Uzbekistan (+998XXXXXXXXX).
    Accepts formats: +998901234567, 998901234567, 901234567
    """
    cleaned = re.sub(r"[\s\-\(\)]", "", value)
    pattern = r"^(\+?998)?(9[0-9]|6[1-9]|7[0-9]|3[0-9])\d{7}$"
    if not re.match(pattern, cleaned):
        raise ValidationError(
            _("Enter a valid Uzbekistan phone number (e.g., +998901234567)."),
            code="invalid_phone_number",
        )


def validate_password_strength(value: str) -> None:
    """Validate password complexity requirements."""
    if len(value) < 8:
        raise ValidationError(
            _("Password must be at least 8 characters long."),
            code="password_too_short",
        )
    if not re.search(r"[A-Za-z]", value):
        raise ValidationError(
            _("Password must contain at least one letter."),
            code="password_no_letter",
        )
    if not re.search(r"\d", value):
        raise ValidationError(
            _("Password must contain at least one digit."),
            code="password_no_digit",
        )


def validate_image_file_size(value) -> None:
    """Validate image file size (max 5MB)."""
    max_size = 5 * 1024 * 1024  # 5MB
    if value.size > max_size:
        raise ValidationError(
            _("Image file size must not exceed 5MB."),
            code="file_too_large",
        )


def validate_hex_color(value: str) -> None:
    """Validate hex color format (#RRGGBB)."""
    if not re.match(r"^#[0-9A-Fa-f]{6}$", value):
        raise ValidationError(
            _("Enter a valid hex color code (e.g., #FF5733)."),
            code="invalid_hex_color",
        )
