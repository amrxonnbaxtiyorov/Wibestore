"""
WibeStore Backend - Rate Limiting Throttles
Production-level rate limiting for critical endpoints.
"""

from rest_framework.throttling import AnonRateThrottle, UserRateThrottle


class AuthRateThrottle(AnonRateThrottle):
    """Login/register — 5 requests per minute."""
    rate = '5/minute'


class OTPRateThrottle(AnonRateThrottle):
    """OTP requests — 3 per minute."""
    rate = '3/minute'


class PasswordResetThrottle(AnonRateThrottle):
    """Password reset — 3 per hour."""
    rate = '3/hour'


class PaymentThrottle(UserRateThrottle):
    """Payment operations — 10 per minute."""
    rate = '10/minute'


class BalanceThrottle(UserRateThrottle):
    """Balance operations — 5 per minute."""
    rate = '5/minute'


class WithdrawalThrottle(UserRateThrottle):
    """Withdrawal — 3 per hour."""
    rate = '3/hour'
