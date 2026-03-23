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
    # Escrow — mavjud
    path("escrow/<uuid:pk>/", views.EscrowDetailView.as_view(), name="escrow-detail"),
    path("escrow/<uuid:pk>/confirm/", views.EscrowConfirmDeliveryView.as_view(), name="escrow-confirm"),
    path("escrow/<uuid:pk>/seller-confirm/", views.EscrowSellerConfirmView.as_view(), name="escrow-seller-confirm"),
    path("escrow/<uuid:pk>/dispute/", views.EscrowDisputeView.as_view(), name="escrow-dispute"),
    # Ikki tomonlama tasdiqlash/bekor qilish (BLOK 2)
    path("escrow/<uuid:pk>/seller-confirm-trade/", views.SellerConfirmTradeView.as_view(), name="seller-confirm-trade"),
    path("escrow/<uuid:pk>/seller-cancel/", views.SellerCancelTradeView.as_view(), name="seller-cancel-trade"),
    path("escrow/<uuid:pk>/buyer-confirm/", views.BuyerConfirmTradeView.as_view(), name="buyer-confirm-trade"),
    path("escrow/<uuid:pk>/buyer-confirm-trade/", views.BuyerConfirmTradeView.as_view(), name="buyer-confirm-trade-alias"),
    path("escrow/<uuid:pk>/buyer-cancel/", views.BuyerCancelTradeView.as_view(), name="buyer-cancel-trade"),
    path("escrow/<uuid:pk>/trade-status/", views.TradeStatusView.as_view(), name="trade-status"),
    # Verifikatsiya (BLOK 3)
    path("verification/<uuid:pk>/approve/", views.VerificationApproveView.as_view(), name="verification-approve"),
    path("verification/<uuid:pk>/reject/", views.VerificationRejectView.as_view(), name="verification-reject"),
    # Pul yechish (BLOK 5)
    path("withdrawal/create/", views.CreateWithdrawalView.as_view(), name="withdrawal-create"),
    path("withdrawal/<uuid:pk>/approve/", views.WithdrawalApproveView.as_view(), name="withdrawal-approve"),
    path("withdrawal/<uuid:pk>/reject/", views.WithdrawalRejectView.as_view(), name="withdrawal-reject"),
    path("withdrawals/", views.WithdrawalListView.as_view(), name="withdrawal-list"),
    # Webhooks
    path("webhooks/<str:provider>/", views.WebhookView.as_view(), name="webhook"),
    # Telegram bot endpoints
    path("telegram/deposit-request/", views.TelegramDepositRequestView.as_view(), name="telegram-deposit-request"),
    path("telegram/callback/", views.TelegramCallbackView.as_view(), name="telegram-callback"),
    # Seller verification
    path("telegram/seller-verification/submit/", views.SellerVerificationSubmitView.as_view(), name="seller-verification-submit"),
]

# Stripe routes (optional: only if stripe package is installed)
try:
    from .stripe_views import StripeCreateCheckoutSessionView, StripeWebhookView
    urlpatterns += [
        path("stripe/create-checkout-session/", StripeCreateCheckoutSessionView.as_view(), name="stripe-checkout"),
        path("stripe/webhook/", StripeWebhookView.as_view(), name="stripe-webhook"),
    ]
except ImportError:
    pass
