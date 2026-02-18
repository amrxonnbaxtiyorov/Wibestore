"""
WibeStore Backend - Payments URL Configuration
"""

from django.urls import path

from . import views

app_name = "payments"

urlpatterns = [
    path("deposit/", views.DepositView.as_view(), name="deposit"),
    path("withdraw/", views.WithdrawView.as_view(), name="withdraw"),
    path("purchase/", views.PurchaseListingView.as_view(), name="purchase"),
    path("balance/", views.BalanceView.as_view(), name="balance"),
    path("methods/", views.PaymentMethodsListView.as_view(), name="payment-methods"),
    path("transactions/", views.TransactionListView.as_view(), name="transaction-list"),
    path("transactions/<uuid:pk>/", views.TransactionDetailView.as_view(), name="transaction-detail"),
    path("escrow/<uuid:pk>/confirm/", views.EscrowConfirmDeliveryView.as_view(), name="escrow-confirm"),
    path("escrow/<uuid:pk>/dispute/", views.EscrowDisputeView.as_view(), name="escrow-dispute"),
    path("webhooks/<str:provider>/", views.WebhookView.as_view(), name="webhook"),
]

