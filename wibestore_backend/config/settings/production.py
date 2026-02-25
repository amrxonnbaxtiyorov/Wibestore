"""
WibeStore Backend - Production Settings
"""

import socket

from .base import *  # noqa: F401,F403

# ============================================================
# DEBUG (must be False in production)
# ============================================================
DEBUG = False

# ============================================================
# SECURITY
# ============================================================
SECURE_SSL_REDIRECT = True
SECURE_HSTS_SECONDS = 31536000  # 1 year
SECURE_HSTS_INCLUDE_SUBDOMAINS = True
SECURE_HSTS_PRELOAD = True
SECURE_PROXY_SSL_HEADER = ("HTTP_X_FORWARDED_PROTO", "https")
SESSION_COOKIE_SECURE = True
CSRF_COOKIE_SECURE = True
SECURE_BROWSER_XSS_FILTER = True
SECURE_CONTENT_TYPE_NOSNIFF = True
X_FRAME_OPTIONS = "DENY"

# ============================================================
# CSRF
# ============================================================
CSRF_TRUSTED_ORIGINS = env.list(  # noqa: F405
    "CSRF_TRUSTED_ORIGINS",
    default=["https://wibestore.uz", "https://api.wibestore.uz"],
)

# ============================================================
# STORAGE (S3 — only if AWS credentials are configured)
# ============================================================
AWS_ACCESS_KEY_ID = env("AWS_ACCESS_KEY_ID", default="")  # noqa: F405
AWS_SECRET_ACCESS_KEY = env("AWS_SECRET_ACCESS_KEY", default="")  # noqa: F405
AWS_STORAGE_BUCKET_NAME = env("AWS_STORAGE_BUCKET_NAME", default="wibestore-media")  # noqa: F405
AWS_S3_REGION_NAME = env("AWS_S3_REGION_NAME", default="ap-southeast-1")  # noqa: F405

if AWS_ACCESS_KEY_ID and AWS_SECRET_ACCESS_KEY:
    DEFAULT_FILE_STORAGE = "storages.backends.s3boto3.S3Boto3Storage"
    AWS_S3_FILE_OVERWRITE = False
    AWS_DEFAULT_ACL = None
    AWS_S3_OBJECT_PARAMETERS = {
        "CacheControl": "max-age=86400",
    }

# ============================================================
# STATIC FILES (WhiteNoise)
# ============================================================
STATICFILES_STORAGE = "whitenoise.storage.CompressedManifestStaticFilesStorage"

# ============================================================
# REDIS / CACHE — fallback to local memory if Redis unavailable
# ============================================================
REDIS_URL = env("REDIS_URL", default="")  # noqa: F405


def _redis_available(url):
    """Check if Redis is reachable."""
    if not url:
        return False
    try:
        from urllib.parse import urlparse
        parsed = urlparse(url)
        host = parsed.hostname or "localhost"
        port = parsed.port or 6379
        s = socket.socket(socket.AF_INET, socket.SOCK_STREAM)
        s.settimeout(2)
        s.connect((host, port))
        s.close()
        return True
    except (OSError, Exception):
        return False


if not _redis_available(REDIS_URL):
    # No Redis — use local memory cache and disable Redis-dependent features
    CACHES = {  # noqa: F811
        "default": {
            "BACKEND": "django.core.cache.backends.locmem.LocMemCache",
        }
    }
    CHANNEL_LAYERS = {  # noqa: F811
        "default": {
            "BACKEND": "channels.layers.InMemoryChannelLayer",
        }
    }
    # Axes: use database handler instead of cache when Redis unavailable
    AXES_HANDLER = "axes.handlers.database.AxesDatabaseHandler"  # noqa: F811
    # Remove Redis health check
    INSTALLED_APPS = [app for app in INSTALLED_APPS if app != "health_check.contrib.redis"]  # noqa: F811

# ============================================================
# SENTRY (optional — only if SENTRY_DSN is configured)
# ============================================================
SENTRY_DSN = env("SENTRY_DSN", default="")  # noqa: F405

if SENTRY_DSN:
    try:
        import sentry_sdk
        from sentry_sdk.integrations.celery import CeleryIntegration
        from sentry_sdk.integrations.django import DjangoIntegration
        from sentry_sdk.integrations.redis import RedisIntegration

        sentry_sdk.init(
            dsn=SENTRY_DSN,
            integrations=[
                DjangoIntegration(),
                CeleryIntegration(),
                RedisIntegration(),
            ],
            traces_sample_rate=0.1,
            send_default_pii=True,
            environment="production",
        )

        LOGGING["handlers"]["sentry"] = {  # noqa: F405
            "class": "sentry_sdk.integrations.logging.SentryHandler",
            "level": "ERROR",
        }
        LOGGING["loggers"]["django.request"]["handlers"].append("sentry")  # noqa: F405
        LOGGING["loggers"]["apps"]["handlers"].append("sentry")  # noqa: F405
    except ImportError:
        pass
