"""
WibeStore Backend - Admin Panel URL Configuration
"""

from django.urls import path

from . import views

app_name = "admin_panel"

urlpatterns = [
    path("dashboard/", views.AdminDashboardView.as_view(), name="dashboard"),
    path("listings/pending/", views.AdminPendingListingsView.as_view(), name="pending-listings"),
    path("listings/<uuid:pk>/approve/", views.AdminApproveListingView.as_view(), name="approve-listing"),
    path("listings/<uuid:pk>/reject/", views.AdminRejectListingView.as_view(), name="reject-listing"),
    path("disputes/", views.AdminDisputesView.as_view(), name="disputes"),
    path("disputes/<uuid:pk>/resolve/", views.AdminResolveDisputeView.as_view(), name="resolve-dispute"),
    path("reports/", views.AdminReportsView.as_view(), name="reports"),
    path("reports/<uuid:pk>/resolve/", views.AdminResolveReportView.as_view(), name="resolve-report"),
    path("users/", views.AdminUsersView.as_view(), name="users"),
    path("users/<uuid:pk>/ban/", views.AdminUserBanView.as_view(), name="user-ban"),
]
