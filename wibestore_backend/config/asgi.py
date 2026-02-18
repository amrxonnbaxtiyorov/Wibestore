"""
WibeStore Backend - ASGI Configuration
Supports both HTTP and WebSocket protocols.
"""

import os

from channels.auth import AuthMiddlewareStack
from channels.routing import ProtocolTypeRouter, URLRouter
from django.core.asgi import get_asgi_application

os.environ.setdefault("DJANGO_SETTINGS_MODULE", "config.settings.development")

django_asgi_app = get_asgi_application()

from apps.messaging.routing import websocket_urlpatterns as chat_ws  # noqa: E402
from apps.notifications.routing import websocket_urlpatterns as notification_ws  # noqa: E402

application = ProtocolTypeRouter(
    {
        "http": django_asgi_app,
        "websocket": AuthMiddlewareStack(
            URLRouter(
                chat_ws + notification_ws,
            )
        ),
    }
)
