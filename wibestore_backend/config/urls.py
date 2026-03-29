"""
WibeStore Backend - Root URL Configuration
"""

import os

from django.conf import settings
from django.conf.urls.static import static
from django.contrib import admin
from django.http import JsonResponse
from django.urls import include, path, re_path
from django.views.static import serve
from drf_spectacular.views import SpectacularAPIView, SpectacularSwaggerView


def health_check(request):
    """Basic health check — returns 200 OK."""
    return JsonResponse({"status": "ok"})


def storage_check(request):
    """Storage diagnostics — shows which file storage backend is active."""
    from django.conf import settings as s
    storage_backend = getattr(s, "DEFAULT_FILE_STORAGE", "django.core.files.storage.FileSystemStorage")
    is_s3 = "s3" in storage_backend.lower() or "S3Boto3" in storage_backend
    info = {
        "storage_backend": storage_backend,
        "is_s3_active": is_s3,
        "media_url": getattr(s, "MEDIA_URL", "/media/"),
        "aws_key_set": bool(getattr(s, "AWS_ACCESS_KEY_ID", "")),
        "aws_secret_set": bool(getattr(s, "AWS_SECRET_ACCESS_KEY", "")),
        "aws_bucket": getattr(s, "AWS_STORAGE_BUCKET_NAME", ""),
        "aws_endpoint_set": bool(getattr(s, "AWS_S3_ENDPOINT_URL", "")),
        "aws_custom_domain": getattr(s, "AWS_S3_CUSTOM_DOMAIN", ""),
        "django_settings_module": os.environ.get("DJANGO_SETTINGS_MODULE", "NOT SET"),
    }
    if is_s3:
        try:
            from django.core.files.storage import default_storage
            from io import BytesIO
            from django.core.files.base import ContentFile
            test_name = default_storage.save("_test_write.txt", ContentFile(b"ok"))
            test_url = default_storage.url(test_name)
            default_storage.delete(test_name)
            info["can_write"] = True
            info["test_url_sample"] = test_url
        except Exception as e:
            info["can_write"] = False
            info["storage_error"] = f"{type(e).__name__}: {e}"
    return JsonResponse(info)


def health_check_detailed(request):
    """Detailed health check — tests DB, cache, and Celery connectivity."""
    checks = {"database": "ok", "cache": "ok", "celery": "ok"}
    status_code = 200

    # Database check
    try:
        from django.db import connection

        with connection.cursor() as cursor:
            cursor.execute("SELECT 1")
    except Exception as e:
        checks["database"] = f"error: {e}"
        status_code = 503

    # Cache check
    try:
        from django.core.cache import cache

        cache.set("health_check", "ok", 10)
        value = cache.get("health_check")
        if value != "ok":
            checks["cache"] = "error: cache get/set mismatch"
            status_code = 503
    except Exception as e:
        checks["cache"] = f"error: {e}"
        status_code = 503

    # Celery check
    try:
        from config.celery import app as celery_app

        result = celery_app.control.ping(timeout=3.0)
        if not result:
            checks["celery"] = "warning: no workers responding"
    except Exception as e:
        checks["celery"] = f"error: {e}"
        # Don't set 503 for celery — it's an async worker, not critical for API

    return JsonResponse({"status": "ok" if status_code == 200 else "degraded", "checks": checks}, status=status_code)


urlpatterns = [
    # Django Admin
    path("admin/", admin.site.urls),
    # API v1
    path("api/v1/auth/", include("apps.accounts.urls")),
    path("api/v1/games/", include("apps.games.urls")),
    path("api/v1/listings/", include("apps.marketplace.urls")),
    path("api/v1/payments/", include("apps.payments.urls")),
    path("api/v1/subscriptions/", include("apps.subscriptions.urls")),
    path("api/v1/chats/", include("apps.messaging.urls")),
    path("api/v1/notifications/", include("apps.notifications.urls")),
    path("api/v1/reviews/", include("apps.reviews.urls")),
    path("api/v1/reports/", include("apps.reports.urls")),
    path("api/v1/admin-panel/", include("apps.admin_panel.urls")),
    path("api/v1/profile/", include("apps.accounts.profile_urls")),
    path("api/v1/upload/", include("apps.marketplace.upload_urls")),
    # OpenAPI/Swagger Documentation
    path("api/v1/schema/", SpectacularAPIView.as_view(), name="schema"),
    path("api/v1/docs/", SpectacularSwaggerView.as_view(url_name="schema"), name="swagger-ui"),
    # Health Checks
    path("health/", health_check, name="health-check"),
    path("health/detailed/", health_check_detailed, name="health-check-detailed"),
    path("health/storage/", storage_check, name="storage-check"),
]

# Include social auth URLs if available
try:
    urlpatterns.append(
        path("auth/", include("social_django.urls", namespace="social")),
    )
except ImportError:
    pass

# Serve media files via Django when S3/R2 is NOT active (fallback for local storage)
_storage = getattr(settings, "DEFAULT_FILE_STORAGE", "")
_is_s3 = "s3" in _storage.lower() or "S3Boto3" in _storage
if not _is_s3:
    urlpatterns += [
        re_path(r"^media/(?P<path>.*)$", serve, {"document_root": settings.MEDIA_ROOT}),
    ]

if settings.DEBUG:
    urlpatterns += static(settings.MEDIA_URL, document_root=settings.MEDIA_ROOT)
    urlpatterns += static(settings.STATIC_URL, document_root=settings.STATIC_ROOT)

    # Debug toolbar
    try:
        import debug_toolbar

        urlpatterns = [
            path("__debug__/", include(debug_toolbar.urls)),
        ] + urlpatterns
    except ImportError:
        pass

# Customize admin site headers
admin.site.site_header = "WibeStore Admin"
admin.site.site_title = "WibeStore Administration"
admin.site.index_title = "Dashboard"

