"""
WibeStore Backend - Admin Panel URL Configuration
"""

from django.urls import path

from . import views

app_name = "admin_panel"

urlpatterns = [
    # Dashboard
    path("dashboard/", views.AdminDashboardView.as_view(), name="dashboard"),
    path("dashboard/enhanced/", views.AdminEnhancedDashboardView.as_view(), name="dashboard-enhanced"),
    path("stats/fraud/", views.AdminFraudStatsView.as_view(), name="fraud-stats"),
    # Alerts
    path("alerts/", views.AdminAlertsView.as_view(), name="admin-alerts"),
    # Audit Log
    path("audit-log/", views.AdminAuditLogView.as_view(), name="admin-audit-log"),
    # Listings
    path("listings/", views.AdminAllListingsView.as_view(), name="all-listings"),
    path("listings/pending/", views.AdminPendingListingsView.as_view(), name="pending-listings"),
    path("listings/<uuid:pk>/approve/", views.AdminApproveListingView.as_view(), name="approve-listing"),
    path("listings/<uuid:pk>/reject/", views.AdminRejectListingView.as_view(), name="reject-listing"),
    path("listings/<uuid:pk>/delete/", views.AdminDeleteListingView.as_view(), name="delete-listing"),
    path("listings/<uuid:pk>/detail/", views.AdminListingDetailView.as_view(), name="listing-detail"),
    # Disputes
    path("disputes/", views.AdminDisputesView.as_view(), name="disputes"),
    path("disputes/<uuid:pk>/resolve/", views.AdminResolveDisputeView.as_view(), name="resolve-dispute"),
    # Reports
    path("reports/", views.AdminReportsView.as_view(), name="reports"),
    path("reports/<uuid:pk>/resolve/", views.AdminResolveReportView.as_view(), name="resolve-report"),
    # Users
    path("users/", views.AdminUsersView.as_view(), name="users"),
    path("users/<uuid:pk>/", views.AdminUserDetailView.as_view(), name="user-detail"),
    path("users/<uuid:pk>/ban/", views.AdminUserBanView.as_view(), name="user-ban"),
    path("users/<uuid:pk>/subscription/", views.AdminGrantSubscriptionView.as_view(), name="user-subscription"),
    # Transactions
    path("transactions/", views.AdminTransactionsView.as_view(), name="transactions"),
    path("transactions/<uuid:pk>/", views.AdminTransactionDetailView.as_view(), name="transaction-detail"),
    # Telegram analytics
    path("telegram/stats/", views.AdminTelegramStatsView.as_view(), name="admin-telegram-stats"),
    path("telegram/users/", views.AdminTelegramUsersView.as_view(), name="admin-telegram-users"),
    path("telegram/users/<int:telegram_id>/", views.AdminTelegramUserDetailView.as_view(), name="admin-telegram-user-detail"),
    path("telegram/registrations/by-date/", views.AdminTelegramRegistrationsByDateView.as_view(), name="admin-telegram-registrations-by-date"),
    # Deposits
    path("deposits/", views.AdminDepositsView.as_view(), name="admin-deposits"),
    path("deposits/stats/", views.AdminDepositStatsView.as_view(), name="admin-deposit-stats"),
    path("deposits/<uuid:pk>/", views.AdminDepositDetailView.as_view(), name="admin-deposit-detail"),
    # Seller verifications
    path("seller-verifications/", views.AdminSellerVerificationsView.as_view(), name="admin-seller-verifications"),
    path("seller-verifications/<uuid:pk>/", views.AdminSellerVerificationDetailView.as_view(), name="admin-seller-verification-detail"),
    path("seller-verifications/<uuid:pk>/approve/", views.AdminApproveSellerVerificationView.as_view(), name="admin-approve-verification"),
    path("seller-verifications/<uuid:pk>/reject/", views.AdminRejectSellerVerificationView.as_view(), name="admin-reject-verification"),
    # Trades
    path("trades/", views.AdminTradesView.as_view(), name="admin-trades"),
    path("trades/stats/", views.AdminTradeStatsView.as_view(), name="admin-trade-stats"),
    path("trades/<uuid:pk>/", views.AdminTradeDetailView.as_view(), name="admin-trade-detail"),
    path("trades/<uuid:pk>/complete/", views.AdminTradeCompleteView.as_view(), name="admin-trade-complete"),
    path("trades/<uuid:pk>/refund/", views.AdminTradeRefundView.as_view(), name="admin-trade-refund"),
    path("trades/<uuid:pk>/resolve-dispute/", views.AdminTradeResolveDisputeView.as_view(), name="admin-trade-resolve-dispute"),
    # Withdrawals
    path("withdrawals/", views.AdminWithdrawalsView.as_view(), name="admin-withdrawals"),
    path("withdrawals/<uuid:pk>/approve/", views.AdminWithdrawalApproveView.as_view(), name="admin-withdrawal-approve"),
    path("withdrawals/<uuid:pk>/reject/", views.AdminWithdrawalRejectView.as_view(), name="admin-withdrawal-reject"),
    # Promo Codes
    path("promo-codes/", views.AdminPromoCodeListCreateView.as_view(), name="admin-promo-list"),
    path("promo-codes/<int:pk>/", views.AdminPromoCodeDetailView.as_view(), name="admin-promo-detail"),
    # Games
    path("games/", views.AdminGameListCreateView.as_view(), name="admin-game-list"),
    path("games/<slug:slug>/", views.AdminGameDetailView.as_view(), name="admin-game-detail"),
    # Export
    path("export/<str:export_type>/", views.AdminExportView.as_view(), name="admin-export"),
]
