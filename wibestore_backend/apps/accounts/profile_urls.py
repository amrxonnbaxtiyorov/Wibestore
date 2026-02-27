"""
WibeStore Backend - Profile URL Configuration
"""

from django.urls import path

from . import profile_views

app_name = "profile"

urlpatterns = [
    path("", profile_views.ProfileView.as_view(), name="profile"),
    path("dashboard/", profile_views.SellerDashboardView.as_view(), name="dashboard"),
    path("referral/", profile_views.ReferralView.as_view(), name="referral"),
    path("listings/", profile_views.MyListingsView.as_view(), name="my-listings"),
    path("favorites/", profile_views.MyFavoritesView.as_view(), name="my-favorites"),
    path("purchases/", profile_views.MyPurchasesView.as_view(), name="my-purchases"),
    path("sales/", profile_views.MySalesView.as_view(), name="my-sales"),
    path("saved-searches/", profile_views.SavedSearchListCreateView.as_view(), name="saved-search-list"),
    path("saved-searches/<int:pk>/", profile_views.SavedSearchDetailView.as_view(), name="saved-search-detail"),
    path("notifications/", profile_views.MyNotificationsView.as_view(), name="my-notifications"),
    path(
        "notifications/<uuid:pk>/read/",
        profile_views.MarkNotificationReadView.as_view(),
        name="mark-notification-read",
    ),
]
