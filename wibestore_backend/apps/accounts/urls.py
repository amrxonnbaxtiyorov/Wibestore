"""
WibeStore Backend - Accounts URL Configuration (Auth endpoints)
"""

from django.urls import path

from . import views

app_name = "accounts"

urlpatterns = [
    path("register/", views.RegisterView.as_view(), name="register"),
    path("login/", views.LoginView.as_view(), name="login"),
    path("logout/", views.LogoutView.as_view(), name="logout"),
    path("refresh/", views.RefreshTokenView.as_view(), name="token-refresh"),
    path("google/", views.GoogleAuthView.as_view(), name="google-auth"),
    path("password/reset/", views.PasswordResetRequestView.as_view(), name="password-reset"),
    path(
        "password/reset/confirm/",
        views.PasswordResetConfirmView.as_view(),
        name="password-reset-confirm",
    ),
    path("password/change/", views.ChangePasswordView.as_view(), name="password-change"),
    path("email/verify/", views.EmailVerifyView.as_view(), name="email-verify"),
    path("email/resend/", views.EmailResendView.as_view(), name="email-resend"),
    path("otp/request/", views.OTPRequestView.as_view(), name="otp-request"),
    path("otp/verify/", views.OTPVerifyView.as_view(), name="otp-verify"),
    path("me/", views.MeView.as_view(), name="me"),
    path("account/delete/", views.DeleteAccountView.as_view(), name="account-delete"),
    path("users/<uuid:pk>/", views.PublicUserProfileView.as_view(), name="public-profile"),
]

