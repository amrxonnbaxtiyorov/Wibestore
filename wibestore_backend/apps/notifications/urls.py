"""
WibeStore Backend - Notifications URL Configuration
"""

from django.urls import path

from . import views

app_name = "notifications"

urlpatterns = [
    path("", views.NotificationListView.as_view(), name="notification-list"),
    path("<uuid:pk>/read/", views.NotificationMarkReadView.as_view(), name="mark-read"),
    path("read-all/", views.NotificationMarkAllReadView.as_view(), name="mark-all-read"),
    path("unread-count/", views.UnreadCountView.as_view(), name="unread-count"),
]
