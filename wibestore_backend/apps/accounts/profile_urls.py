"""
WibeStore Backend - Profile URL Configuration
"""

from django.urls import path

from . import profile_views

app_name = "profile"

urlpatterns = [
    path("", profile_views.ProfileView.as_view(), name="profile"),
    path("listings/", profile_views.MyListingsView.as_view(), name="my-listings"),
    path("favorites/", profile_views.MyFavoritesView.as_view(), name="my-favorites"),
    path("purchases/", profile_views.MyPurchasesView.as_view(), name="my-purchases"),
    path("sales/", profile_views.MySalesView.as_view(), name="my-sales"),
    path("notifications/", profile_views.MyNotificationsView.as_view(), name="my-notifications"),
    path(
        "notifications/<uuid:pk>/read/",
        profile_views.MarkNotificationReadView.as_view(),
        name="mark-notification-read",
    ),
]
