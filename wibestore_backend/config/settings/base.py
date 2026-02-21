"""
WibeStore Backend - Base Settings
Common settings shared across all environments.
"""

import os
from datetime import timedelta
from pathlib import Path

import environ

# ============================================================
# PATH CONFIGURATION
# ============================================================
BASE_DIR = Path(__file__).resolve().parent.parent.parent
APPS_DIR = BASE_DIR / "apps"

# ============================================================
# ENVIRONMENT CONFIGURATION
# ============================================================
env = environ.Env(
    DEBUG=(bool, False),
    ALLOWED_HOSTS=(list, ["localhost", "127.0.0.1"]),
)

env_file = BASE_DIR / ".env"
if env_file.exists():
    environ.Env.read_env(str(env_file))

# ============================================================
# CORE SETTINGS
# ============================================================
SECRET_KEY = env("SECRET_KEY", default="django-insecure-change-me-in-production")
DEBUG = env("DEBUG")
ALLOWED_HOSTS = env.list("ALLOWED_HOSTS")

# ============================================================
# APPLICATION DEFINITION
# ============================================================
DJANGO_APPS = [
    "django.contrib.admin",
    "django.contrib.auth",
    "django.contrib.contenttypes",
    "django.contrib.sessions",
    "django.contrib.messages",
    "django.contrib.staticfiles",
    "django.contrib.postgres",
]

THIRD_PARTY_APPS = [
    "rest_framework",
    "rest_framework_simplejwt",
    "rest_framework_simplejwt.token_blacklist",
    "corsheaders",
    "django_filters",
    "drf_spectacular",
    "channels",
    "django_celery_beat",
    "axes",
    "health_check",
    "health_check.db",
    "health_check.cache",
    "health_check.contrib.redis",
    "social_django",
]

LOCAL_APPS = [
    "core",
    "apps.accounts",
    "apps.games",
    "apps.marketplace",
    "apps.payments",
    "apps.subscriptions",
    "apps.messaging",
    "apps.notifications",
    "apps.reviews",
    "apps.reports",
    "apps.admin_panel",
]

INSTALLED_APPS = DJANGO_APPS + THIRD_PARTY_APPS + LOCAL_APPS

# ============================================================
# MIDDLEWARE
# ============================================================
MIDDLEWARE = [
    "django.middleware.security.SecurityMiddleware",
    "whitenoise.middleware.WhiteNoiseMiddleware",
    "corsheaders.middleware.CorsMiddleware",
    "django.contrib.sessions.middleware.SessionMiddleware",
    "django.middleware.locale.LocaleMiddleware",
    "django.middleware.common.CommonMiddleware",
    "django.middleware.csrf.CsrfViewMiddleware",
    "django.contrib.auth.middleware.AuthenticationMiddleware",
    "django.contrib.messages.middleware.MessageMiddleware",
    "django.middleware.clickjacking.XFrameOptionsMiddleware",
    "axes.middleware.AxesMiddleware",
    "core.middleware.RequestLoggingMiddleware",
]

ROOT_URLCONF = "config.urls"

# ============================================================
# TEMPLATES
# ============================================================
TEMPLATES = [
    {
        "BACKEND": "django.template.backends.django.DjangoTemplates",
        "DIRS": [BASE_DIR / "templates"],
        "APP_DIRS": True,
        "OPTIONS": {
            "context_processors": [
                "django.template.context_processors.debug",
                "django.template.context_processors.request",
                "django.contrib.auth.context_processors.auth",
                "django.contrib.messages.context_processors.messages",
            ],
        },
    },
]

WSGI_APPLICATION = "config.wsgi.application"
ASGI_APPLICATION = "config.asgi.application"

# ============================================================
# DATABASE
# ============================================================
DATABASES = {
    "default": env.db(
        "DATABASE_URL",
        default="postgresql://wibestore:wibestore_password@localhost:5432/wibestore_db",
    )
}

DEFAULT_AUTO_FIELD = "django.db.models.BigAutoField"

# ============================================================
# AUTHENTICATION
# ============================================================
AUTH_USER_MODEL = "accounts.User"

AUTHENTICATION_BACKENDS = [
    "axes.backends.AxesStandaloneBackend",
    "django.contrib.auth.backends.ModelBackend",
    "social_core.backends.google.GoogleOAuth2",
]

AUTH_PASSWORD_VALIDATORS = [
    {"NAME": "django.contrib.auth.password_validation.UserAttributeSimilarityValidator"},
    {"NAME": "django.contrib.auth.password_validation.MinimumLengthValidator", "OPTIONS": {"min_length": 8}},
    {"NAME": "django.contrib.auth.password_validation.CommonPasswordValidator"},
    {"NAME": "django.contrib.auth.password_validation.NumericPasswordValidator"},
]

PASSWORD_HASHERS = [
    "django.contrib.auth.hashers.Argon2PasswordHasher",
    "django.contrib.auth.hashers.PBKDF2PasswordHasher",
    "django.contrib.auth.hashers.PBKDF2SHA1PasswordHasher",
    "django.contrib.auth.hashers.BCryptSHA256PasswordHasher",
]

# ============================================================
# INTERNATIONALIZATION
# ============================================================
LANGUAGE_CODE = "ru"
TIME_ZONE = "Asia/Tashkent"
USE_I18N = True
USE_TZ = True

LANGUAGES = [
    ("uz", "O'zbekcha"),
    ("ru", "Русский"),
    ("en", "English"),
]

LOCALE_PATHS = [BASE_DIR / "locale"]

# ============================================================
# STATIC & MEDIA FILES
# ============================================================
STATIC_URL = "/static/"
STATIC_ROOT = BASE_DIR / "staticfiles"
STATICFILES_DIRS = [BASE_DIR / "static"]

MEDIA_URL = "/media/"
MEDIA_ROOT = BASE_DIR / "media"

# ============================================================
# REST FRAMEWORK
# ============================================================
REST_FRAMEWORK = {
    "DEFAULT_AUTHENTICATION_CLASSES": [
        "rest_framework_simplejwt.authentication.JWTAuthentication",
    ],
    "DEFAULT_PERMISSION_CLASSES": [
        "rest_framework.permissions.IsAuthenticated",
    ],
    "DEFAULT_PAGINATION_CLASS": "core.pagination.StandardResultsSetPagination",
    "PAGE_SIZE": 20,
    "DEFAULT_FILTER_BACKENDS": [
        "django_filters.rest_framework.DjangoFilterBackend",
        "rest_framework.filters.SearchFilter",
        "rest_framework.filters.OrderingFilter",
    ],
    "DEFAULT_THROTTLE_CLASSES": [
        "rest_framework.throttling.AnonRateThrottle",
        "rest_framework.throttling.UserRateThrottle",
    ],
    "DEFAULT_THROTTLE_RATES": {
        "anon": "30/minute",
        "user": "100/minute",
        "auth": "10/minute",
    },
    "DEFAULT_SCHEMA_CLASS": "drf_spectacular.openapi.AutoSchema",
    "DEFAULT_RENDERER_CLASSES": [
        "rest_framework.renderers.JSONRenderer",
    ],
    "EXCEPTION_HANDLER": "core.exceptions.custom_exception_handler",
    "DEFAULT_VERSIONING_CLASS": "rest_framework.versioning.URLPathVersioning",
    "ALLOWED_VERSIONS": ["v1"],
    "DEFAULT_VERSION": "v1",
}

# ============================================================
# JWT CONFIGURATION
# ============================================================
SIMPLE_JWT = {
    "ACCESS_TOKEN_LIFETIME": timedelta(
        minutes=env.int("JWT_ACCESS_TOKEN_LIFETIME", default=15)
    ),
    "REFRESH_TOKEN_LIFETIME": timedelta(
        minutes=env.int("JWT_REFRESH_TOKEN_LIFETIME", default=10080)
    ),
    "ROTATE_REFRESH_TOKENS": True,
    "BLACKLIST_AFTER_ROTATION": True,
    "UPDATE_LAST_LOGIN": True,
    "ALGORITHM": "HS256",
    "SIGNING_KEY": env("JWT_SECRET_KEY", default=SECRET_KEY),
    "AUTH_HEADER_TYPES": ("Bearer",),
    "AUTH_HEADER_NAME": "HTTP_AUTHORIZATION",
    "USER_ID_FIELD": "id",
    "USER_ID_CLAIM": "user_id",
    "TOKEN_OBTAIN_SERIALIZER": "apps.accounts.serializers.CustomTokenObtainPairSerializer",
}

# ============================================================
# SPECTACULAR (OpenAPI/Swagger)
# ============================================================
SPECTACULAR_SETTINGS = {
    "TITLE": "WibeStore API",
    "DESCRIPTION": "Professional API for WibeStore — Gaming Accounts Marketplace",
    "VERSION": "1.0.0",
    "SERVE_INCLUDE_SCHEMA": False,
    "SWAGGER_UI_SETTINGS": {
        "deepLinking": True,
        "persistAuthorization": True,
        "filter": True,
    },
    "COMPONENT_SPLIT_REQUEST": True,
    "SCHEMA_PATH_PREFIX": r"/api/v[0-9]",
}

# ============================================================
# CORS
# ============================================================
CORS_ALLOWED_ORIGINS = env.list(
    "CORS_ALLOWED_ORIGINS",
    default=["http://localhost:5173", "http://localhost:3000"],
)
CORS_ALLOW_CREDENTIALS = True

# ============================================================
# CHANNEL LAYERS (WebSocket)
# ============================================================
CHANNEL_LAYERS = {
    "default": {
        "BACKEND": "channels_redis.core.RedisChannelLayer",
        "CONFIG": {
            "hosts": [env("REDIS_URL", default="redis://localhost:6379/0")],
        },
    },
}

# ============================================================
# CELERY
# ============================================================
CELERY_BROKER_URL = env("CELERY_BROKER_URL", default="redis://localhost:6379/1")
CELERY_RESULT_BACKEND = env("CELERY_RESULT_BACKEND", default="redis://localhost:6379/1")
CELERY_ACCEPT_CONTENT = ["json"]
CELERY_TASK_SERIALIZER = "json"
CELERY_RESULT_SERIALIZER = "json"
CELERY_TIMEZONE = TIME_ZONE
CELERY_TASK_TRACK_STARTED = True
CELERY_TASK_TIME_LIMIT = 30 * 60  # 30 minutes
CELERY_BEAT_SCHEDULER = "django_celery_beat.schedulers:DatabaseScheduler"

# ============================================================
# CACHES
# ============================================================
CACHES = {
    "default": {
        "BACKEND": "django.core.cache.backends.redis.RedisCache",
        "LOCATION": env("CACHE_REDIS_URL", default="redis://localhost:6379/2"),
    }
}

# ============================================================
# EMAIL
# ============================================================
EMAIL_BACKEND = "django.core.mail.backends.smtp.EmailBackend"
EMAIL_HOST = env("EMAIL_HOST", default="smtp.gmail.com")
EMAIL_PORT = env.int("EMAIL_PORT", default=587)
EMAIL_USE_TLS = env.bool("EMAIL_USE_TLS", default=True)
EMAIL_HOST_USER = env("EMAIL_HOST_USER", default="")
EMAIL_HOST_PASSWORD = env("EMAIL_HOST_PASSWORD", default="")
DEFAULT_FROM_EMAIL = env("DEFAULT_FROM_EMAIL", default="noreply@wibestore.uz")

# ============================================================
# GOOGLE OAUTH
# ============================================================
SOCIAL_AUTH_GOOGLE_OAUTH2_KEY = env("GOOGLE_CLIENT_ID", default="")
SOCIAL_AUTH_GOOGLE_OAUTH2_SECRET = env("GOOGLE_CLIENT_SECRET", default="")
SOCIAL_AUTH_GOOGLE_OAUTH2_SCOPE = [
    "https://www.googleapis.com/auth/userinfo.email",
    "https://www.googleapis.com/auth/userinfo.profile",
]

# ============================================================
# DJANGO AXES (Brute Force Protection)
# ============================================================
AXES_ENABLED = False  # TEMPORARILY DISABLED
AXES_FAILURE_LIMIT = 100
AXES_COOLOFF_TIME = timedelta(minutes=5)
AXES_LOCKOUT_PARAMETERS = ["ip_address", "username"]
AXES_RESET_ON_SUCCESS = True

# ============================================================
# ENCRYPTION (for sensitive data like account credentials)
# ============================================================
FERNET_KEY = env("FERNET_KEY", default="")

# ============================================================
# PAYMENTS
# ============================================================
PAYME_MERCHANT_ID = env("PAYME_MERCHANT_ID", default="")
PAYME_SECRET_KEY = env("PAYME_SECRET_KEY", default="")
CLICK_SERVICE_ID = env("CLICK_SERVICE_ID", default="")
CLICK_MERCHANT_ID = env("CLICK_MERCHANT_ID", default="")
CLICK_SECRET_KEY = env("CLICK_SECRET_KEY", default="")
PAYNET_MERCHANT_ID = env("PAYNET_MERCHANT_ID", default="")
PAYNET_SECRET_KEY = env("PAYNET_SECRET_KEY", default="")

# ============================================================
# LOGGING
# ============================================================
LOG_DIR = BASE_DIR / "logs"
LOG_DIR.mkdir(exist_ok=True)

LOGGING = {
    "version": 1,
    "disable_existing_loggers": False,
    "formatters": {
        "verbose": {
            "format": "%(asctime)s [%(levelname)s] %(name)s: %(message)s",
        },
        "simple": {
            "format": "[%(levelname)s] %(message)s",
        },
    },
    "handlers": {
        "console": {
            "class": "logging.StreamHandler",
            "formatter": "verbose",
        },
        "file": {
            "class": "logging.handlers.RotatingFileHandler",
            "filename": str(LOG_DIR / "wibestore.log"),
            "maxBytes": 10 * 1024 * 1024,  # 10MB
            "backupCount": 5,
            "formatter": "verbose",
        },
        "error_file": {
            "class": "logging.handlers.RotatingFileHandler",
            "filename": str(LOG_DIR / "errors.log"),
            "maxBytes": 10 * 1024 * 1024,
            "backupCount": 5,
            "formatter": "verbose",
            "level": "ERROR",
        },
    },
    "loggers": {
        "django": {
            "handlers": ["console", "file"],
            "level": "INFO",
            "propagate": True,
        },
        "django.request": {
            "handlers": ["console", "error_file"],
            "level": "ERROR",
            "propagate": False,
        },
        "apps": {
            "handlers": ["console", "file", "error_file"],
            "level": "INFO",
            "propagate": False,
        },
        "celery": {
            "handlers": ["console", "file"],
            "level": "INFO",
            "propagate": False,
        },
    },
}

# ============================================================
# COMMISSION RATES
# ============================================================
COMMISSION_RATES = {
    "free": 0.10,
    "premium": 0.08,
    "pro": 0.05,
}

# ============================================================
# ESCROW SETTINGS
# ============================================================
ESCROW_AUTO_RELEASE_HOURS = 24
ESCROW_DISPUTE_WINDOW_HOURS = 48

# ============================================================
# SUBSCRIPTION SETTINGS
# ============================================================
SUBSCRIPTION_EXPIRY_WARNING_DAYS = 3
