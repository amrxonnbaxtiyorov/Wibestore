"""
WibeStore Backend - Graceful Degradation Utilities
Safe wrappers for Redis cache and Celery when services are unavailable.
"""

import logging

logger = logging.getLogger("apps")


def safe_cache_get(key, default=None):
    """Safe cache read. Returns default if Redis is unavailable."""
    try:
        from django.core.cache import cache
        return cache.get(key, default)
    except Exception as e:
        logger.warning("Cache read failed for key=%s: %s", key, e)
        return default


def safe_cache_set(key, value, timeout=300):
    """Safe cache write. Silently fails if Redis is unavailable."""
    try:
        from django.core.cache import cache
        cache.set(key, value, timeout)
    except Exception as e:
        logger.warning("Cache write failed for key=%s: %s", key, e)


def safe_cache_delete(key):
    """Safe cache delete."""
    try:
        from django.core.cache import cache
        cache.delete(key)
    except Exception as e:
        logger.warning("Cache delete failed for key=%s: %s", key, e)


def safe_send_task(task_name, args=None, kwargs=None):
    """Safe Celery task dispatch. Logs error if Celery is unavailable."""
    try:
        from celery import current_app
        current_app.send_task(task_name, args=args, kwargs=kwargs)
    except Exception as e:
        logger.error("Failed to send task %s: %s", task_name, e)
