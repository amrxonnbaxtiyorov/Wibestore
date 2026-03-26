"""
WibeStore Backend - Safe Celery Task Base
Automatic retry, error logging, and admin notification on failure.
"""

import logging

from celery import Task

logger = logging.getLogger("celery")


class SafeTask(Task):
    """
    Base class for safe Celery tasks.
    Features:
    - Auto-retry with exponential backoff
    - Error logging
    - Admin notification on final failure
    """
    autoretry_for = (Exception,)
    retry_backoff = True
    retry_backoff_max = 300  # max 5 minutes between retries
    max_retries = 3
    retry_jitter = True

    def on_failure(self, exc, task_id, args, kwargs, einfo):
        """Called on final task failure."""
        logger.error("Task %s failed permanently: %s", self.name, exc, exc_info=True)

        # Notify admin via Telegram
        try:
            from apps.payments.telegram_notify import _send_message
            from django.conf import settings

            admin_ids = getattr(settings, 'ADMIN_TELEGRAM_IDS', [])
            for admin_id in admin_ids:
                if admin_id:
                    try:
                        _send_message(
                            int(admin_id),
                            f"⚠️ Celery task failed!\n\n"
                            f"Task: {self.name}\n"
                            f"Error: {str(exc)[:500]}\n"
                            f"Task ID: {task_id}\n"
                            f"Args: {str(args)[:200]}"
                        )
                    except Exception:
                        pass
        except Exception:
            pass
