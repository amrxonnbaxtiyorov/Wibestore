"""
WibeStore Backend - Development Settings
"""

from .base import *  # noqa: F401,F403

# ============================================================
# DEBUG
# ============================================================
DEBUG = True

# ============================================================
# DATABASE (SQLite for development)
# ============================================================
DATABASES = {
    "default": {
        "ENGINE": "django.db.backends.sqlite3",
        "NAME": BASE_DIR / "db.sqlite3",  # noqa: F405
    }
}

# Remove PostgreSQL-specific apps for SQLite
if "django.contrib.postgres" in INSTALLED_APPS:  # noqa: F405
    INSTALLED_APPS.remove("django.contrib.postgres")  # noqa: F405
for _app in ["health_check.contrib.redis", "health_check.db", "health_check.cache", "health_check"]:  # noqa: F405
    if _app in INSTALLED_APPS:  # noqa: F405
        INSTALLED_APPS.remove(_app)  # noqa: F405

# ============================================================
# INSTALLED APPS (dev only)
# ============================================================
INSTALLED_APPS += ["debug_toolbar"]  # noqa: F405

# ============================================================
# MIDDLEWARE (dev only)
# ============================================================
MIDDLEWARE.insert(0, "debug_toolbar.middleware.DebugToolbarMiddleware")  # noqa: F405

# ============================================================
# DEBUG TOOLBAR
# ============================================================
INTERNAL_IPS = ["127.0.0.1", "localhost"]

# ============================================================
# EMAIL (console backend for development)
# ============================================================
EMAIL_BACKEND = "django.core.mail.backends.console.EmailBackend"

# ============================================================
# CORS (allow all in development)
# ============================================================
CORS_ALLOW_ALL_ORIGINS = True

# ============================================================
# LOGGING (verbose in development)
# ============================================================
LOGGING["loggers"]["django.db.backends"] = {  # noqa: F405
    "handlers": ["console"],
    "level": "WARNING",
    "propagate": False,
}
LOGGING["loggers"]["apps"]["level"] = "DEBUG"  # noqa: F405

# ============================================================
# REST FRAMEWORK (add browsable API)
# ============================================================
REST_FRAMEWORK["DEFAULT_RENDERER_CLASSES"] += [  # noqa: F405
    "rest_framework.renderers.BrowsableAPIRenderer",
]

# ============================================================
# CACHE (local memory in development)
# ============================================================
CACHES = {
    "default": {
        "BACKEND": "django.core.cache.backends.locmem.LocMemCache",
    }
}

# ============================================================
# CHANNEL LAYERS (in-memory for development)
# ============================================================
CHANNEL_LAYERS = {
    "default": {
        "BACKEND": "channels.layers.InMemoryChannelLayer",
    },
}
