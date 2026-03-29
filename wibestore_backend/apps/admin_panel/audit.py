"""
WibeStore Backend - Admin Audit Log
Decorator for automatic admin action logging.
"""

import functools
import logging

logger = logging.getLogger("apps.admin_panel")


def get_client_ip(request):
    """Extract client IP from request."""
    x_forwarded = request.META.get('HTTP_X_FORWARDED_FOR')
    if x_forwarded:
        return x_forwarded.split(',')[0].strip()
    return request.META.get('REMOTE_ADDR')


def log_admin_action(action_type, target_type):
    """
    Decorator for automatic admin action logging.
    Usage:
        @log_admin_action('approve_listing', 'Listing')
        def post(self, request, pk):
            ...
    """
    def decorator(view_func):
        @functools.wraps(view_func)
        def wrapper(self, request, *args, **kwargs):
            target_id = str(
                kwargs.get('pk') or kwargs.get('uuid') or kwargs.get('id') or
                kwargs.get('slug') or kwargs.get('export_type') or ''
            )

            response = view_func(self, request, *args, **kwargs)

            # Log only successful actions
            if response.status_code in (200, 201, 204):
                try:
                    from .models import AdminAction
                    AdminAction.objects.create(
                        admin=request.user,
                        action_type=action_type,
                        target_type=target_type,
                        target_id=target_id,
                        details={
                            'request_data': _safe_request_data(request),
                            'response_status': response.status_code,
                            'user_agent': request.META.get('HTTP_USER_AGENT', '')[:200],
                        },
                        ip_address=get_client_ip(request),
                    )
                except Exception as e:
                    logger.warning("Could not log admin action: %s", e)

            return response
        return wrapper
    return decorator


def _safe_request_data(request):
    """Extract request data, excluding sensitive fields."""
    if not hasattr(request, 'data'):
        return {}
    data = dict(request.data)
    # Remove sensitive fields
    for key in ('password', 'secret_key', 'token', 'secret'):
        data.pop(key, None)
    # Truncate large values
    for key, value in data.items():
        if isinstance(value, str) and len(value) > 500:
            data[key] = value[:500] + '...'
    return data
