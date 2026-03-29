"""
WibeStore Backend - Security Tests
Tests for bot endpoint protection, rate limiting, and input sanitization.
"""

import pytest
from django.test import TestCase, override_settings
from rest_framework.test import APIClient
from django.contrib.auth import get_user_model

User = get_user_model()


class BotEndpointSecurityTest(TestCase):
    """Test that bot endpoints are protected by IsTelegramBot permission."""

    def setUp(self):
        self.client = APIClient()

    def test_bot_otp_create_without_secret_returns_403(self):
        """Bot OTP endpoint without secret returns 403."""
        response = self.client.post('/api/v1/auth/telegram/otp/create/', {
            'telegram_id': '123456789',
            'phone_number': '+998901234567',
        }, format='json')
        self.assertEqual(response.status_code, 403)

    def test_bot_balance_add_without_secret_returns_403(self):
        """Bot balance add endpoint without secret returns 403."""
        response = self.client.post('/api/v1/auth/telegram/balance/add/', {
            'telegram_id': '123456789',
            'amount': '100000',
        }, format='json')
        self.assertEqual(response.status_code, 403)

    def test_bot_balance_deduct_without_secret_returns_403(self):
        """Bot balance deduct endpoint without secret returns 403."""
        response = self.client.post('/api/v1/auth/telegram/balance/deduct/', {
            'telegram_id': '123456789',
            'amount': '50000',
        }, format='json')
        self.assertEqual(response.status_code, 403)

    def test_bot_profile_without_secret_returns_403(self):
        """Bot profile endpoint without secret returns 403."""
        response = self.client.post('/api/v1/auth/telegram/profile/', {
            'telegram_id': '123456789',
        }, format='json')
        self.assertEqual(response.status_code, 403)

    def test_bot_premium_purchase_without_secret_returns_403(self):
        """Bot premium purchase without secret returns 403."""
        response = self.client.post('/api/v1/auth/telegram/premium/purchase/', {
            'telegram_id': '123456789',
            'plan': 'premium',
        }, format='json')
        self.assertEqual(response.status_code, 403)

    @override_settings(TELEGRAM_BOT_SECRET='test-secret-key')
    def test_bot_balance_add_with_correct_secret_passes(self):
        """Bot balance add with correct body secret passes permission check."""
        response = self.client.post('/api/v1/auth/telegram/balance/add/', {
            'secret_key': 'test-secret-key',
            'telegram_id': '123456789',
            'amount': '100000',
        }, format='json')
        # 404 because user doesn't exist, but not 403 — permission passed
        self.assertIn(response.status_code, [200, 400, 404])

    @override_settings(TELEGRAM_BOT_SECRET='test-secret-key')
    def test_bot_balance_add_with_header_secret_passes(self):
        """Bot balance add with correct header secret passes permission check."""
        import time
        response = self.client.post('/api/v1/auth/telegram/balance/add/', {
            'telegram_id': '123456789',
            'amount': '100000',
        }, format='json', HTTP_X_BOT_SECRET='test-secret-key',
           HTTP_X_BOT_TIMESTAMP=str(int(time.time())))
        self.assertIn(response.status_code, [200, 400, 404])


class AdminEndpointSecurityTest(TestCase):
    """Test that admin endpoints require staff user."""

    def setUp(self):
        self.client = APIClient()
        self.regular_user = User.objects.create_user(
            email='user@test.com',
            password='testpass123',
            username='testuser',
        )

    def test_admin_dashboard_unauthenticated_returns_401(self):
        """Admin dashboard without auth returns 401."""
        response = self.client.get('/api/v1/admin-panel/dashboard/')
        self.assertEqual(response.status_code, 401)

    def test_admin_dashboard_regular_user_returns_403(self):
        """Admin dashboard with regular user returns 403."""
        self.client.force_authenticate(self.regular_user)
        response = self.client.get('/api/v1/admin-panel/dashboard/')
        self.assertEqual(response.status_code, 403)

    def test_admin_audit_log_regular_user_returns_403(self):
        """Audit log with regular user returns 403."""
        self.client.force_authenticate(self.regular_user)
        response = self.client.get('/api/v1/admin-panel/audit-log/')
        self.assertEqual(response.status_code, 403)

    def test_admin_alerts_regular_user_returns_403(self):
        """Alerts with regular user returns 403."""
        self.client.force_authenticate(self.regular_user)
        response = self.client.get('/api/v1/admin-panel/alerts/')
        self.assertEqual(response.status_code, 403)

    def test_admin_export_regular_user_returns_403(self):
        """Export with regular user returns 403."""
        self.client.force_authenticate(self.regular_user)
        response = self.client.get('/api/v1/admin-panel/export/users/')
        self.assertEqual(response.status_code, 403)


class SanitizationTest(TestCase):
    """Test input sanitization utilities."""

    def test_sanitize_text_removes_script_tags(self):
        """XSS script tags are removed."""
        from core.sanitizers import sanitize_text
        result = sanitize_text('<script>alert("xss")</script>Hello')
        self.assertNotIn('<script>', result)
        self.assertIn('Hello', result)

    def test_sanitize_text_removes_onerror(self):
        """On-event handlers are removed."""
        from core.sanitizers import sanitize_text
        result = sanitize_text('<img onerror="alert(1)" src="x">')
        self.assertNotIn('onerror', result)

    def test_sanitize_text_removes_javascript_urls(self):
        """JavaScript: URLs are removed."""
        from core.sanitizers import sanitize_text
        result = sanitize_text('javascript:alert(1)')
        self.assertNotIn('javascript:', result)

    def test_sanitize_json_recursive(self):
        """JSON sanitization works recursively."""
        from core.sanitizers import sanitize_json
        data = {
            'name': '<script>alert(1)</script>John',
            'items': ['<img onerror="x" src="y">', 'normal'],
            'nested': {'key': 'javascript:void(0)'},
        }
        result = sanitize_json(data)
        self.assertNotIn('<script>', result['name'])
        self.assertNotIn('onerror', result['items'][0])
        self.assertNotIn('javascript:', result['nested']['key'])

    def test_sanitize_text_preserves_normal_text(self):
        """Normal text is preserved."""
        from core.sanitizers import sanitize_text
        result = sanitize_text('Hello, this is a normal text with numbers 12345!')
        self.assertEqual(result, 'Hello, this is a normal text with numbers 12345!')


class ThrottleTest(TestCase):
    """Test that throttle classes exist and are properly configured."""

    def test_auth_throttle_exists(self):
        from core.throttles import AuthRateThrottle
        throttle = AuthRateThrottle()
        self.assertEqual(throttle.rate, '5/minute')

    def test_otp_throttle_exists(self):
        from core.throttles import OTPRateThrottle
        throttle = OTPRateThrottle()
        self.assertEqual(throttle.rate, '3/minute')

    def test_password_reset_throttle_exists(self):
        from core.throttles import PasswordResetThrottle
        throttle = PasswordResetThrottle()
        self.assertEqual(throttle.rate, '3/hour')

    def test_payment_throttle_exists(self):
        from core.throttles import PaymentThrottle
        throttle = PaymentThrottle()
        self.assertEqual(throttle.rate, '10/minute')

    def test_withdrawal_throttle_exists(self):
        from core.throttles import WithdrawalThrottle
        throttle = WithdrawalThrottle()
        self.assertEqual(throttle.rate, '3/hour')


class PermissionsTest(TestCase):
    """Test permission classes."""

    def test_is_telegram_bot_without_secret_fails(self):
        """IsTelegramBot denies when no secret configured."""
        from core.permissions import IsTelegramBot
        from rest_framework.test import APIRequestFactory

        factory = APIRequestFactory()
        request = factory.post('/test/', {}, format='json')
        perm = IsTelegramBot()

        with self.settings(TELEGRAM_BOT_SECRET=''):
            self.assertFalse(perm.has_permission(request, None))

    def test_is_admin_user_requires_staff(self):
        """IsAdminUser requires is_staff flag."""
        from core.permissions import IsAdminUser
        from rest_framework.test import APIRequestFactory

        factory = APIRequestFactory()
        request = factory.get('/test/')
        user = User.objects.create_user(email='test@test.com', password='test', username='test')
        request.user = user
        perm = IsAdminUser()
        self.assertFalse(perm.has_permission(request, None))
