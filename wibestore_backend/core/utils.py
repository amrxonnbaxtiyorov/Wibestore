"""
WibeStore Backend - Utility Functions
"""

import secrets
import string
from decimal import Decimal

from cryptography.fernet import Fernet
from django.conf import settings


def generate_otp(length: int = 6) -> str:
    """Generate a random OTP code."""
    return "".join(secrets.choice(string.digits) for _ in range(length))


def generate_token(length: int = 64) -> str:
    """Generate a secure random token."""
    return secrets.token_urlsafe(length)


def encrypt_sensitive_data(data: str) -> str:
    """Encrypt sensitive data using Fernet encryption."""
    if not settings.FERNET_KEY:
        return data
    fernet = Fernet(settings.FERNET_KEY.encode())
    return fernet.encrypt(data.encode()).decode()


def decrypt_sensitive_data(encrypted_data: str) -> str:
    """Decrypt sensitive data using Fernet encryption."""
    if not settings.FERNET_KEY:
        return encrypted_data
    fernet = Fernet(settings.FERNET_KEY.encode())
    return fernet.decrypt(encrypted_data.encode()).decode()


def calculate_commission(amount: Decimal, plan_type: str = "free") -> Decimal:
    """Calculate commission based on subscription plan."""
    rates = settings.COMMISSION_RATES
    rate = Decimal(str(rates.get(plan_type, rates["free"])))
    return (amount * rate).quantize(Decimal("0.01"))


def calculate_seller_earnings(amount: Decimal, plan_type: str = "free") -> Decimal:
    """Calculate seller earnings after commission."""
    commission = calculate_commission(amount, plan_type)
    return amount - commission


def format_price_uzs(amount: Decimal | int) -> str:
    """Format price in UZS currency."""
    return f"{int(amount):,} so'm".replace(",", " ")
