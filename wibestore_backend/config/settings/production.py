"""
WibeStore Backend - Production Settings
"""

import sentry_sdk
from sentry_sdk.integrations.celery import CeleryIntegration
from sentry_sdk.integrations.django import DjangoIntegration
from sentry_sdk.integrations.redis import RedisIntegration

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
# STORAGE (S3)
# ============================================================
DEFAULT_FILE_STORAGE = "storages.backends.s3boto3.S3Boto3Storage"
AWS_ACCESS_KEY_ID = env("AWS_ACCESS_KEY_ID", default="")  # noqa: F405
AWS_SECRET_ACCESS_KEY = env("AWS_SECRET_ACCESS_KEY", default="")  # noqa: F405
AWS_STORAGE_BUCKET_NAME = env("AWS_STORAGE_BUCKET_NAME", default="wibestore-media")  # noqa: F405
AWS_S3_REGION_NAME = env("AWS_S3_REGION_NAME", default="ap-southeast-1")  # noqa: F405
AWS_S3_FILE_OVERWRITE = False
AWS_DEFAULT_ACL = None
AWS_S3_OBJECT_PARAMETERS = {
    "CacheControl": "max-age=86400",
}

# ============================================================
# SENTRY
# ============================================================
SENTRY_DSN = env("SENTRY_DSN", default="")  # noqa: F405

if SENTRY_DSN:
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

# ============================================================
# LOGGING (production — add Sentry handler)
# ============================================================
LOGGING["handlers"]["sentry"] = {  # noqa: F405
    "class": "sentry_sdk.integrations.logging.SentryHandler",
    "level": "ERROR",
}
LOGGING["loggers"]["django.request"]["handlers"].append("sentry")  # noqa: F405
LOGGING["loggers"]["apps"]["handlers"].append("sentry")  # noqa: F405
