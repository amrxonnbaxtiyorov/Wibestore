"""
WibeStore Backend - Accounts Views (API)
"""

import logging

from django.contrib.auth import get_user_model
from drf_spectacular.utils import extend_schema, extend_schema_view
from rest_framework import generics, permissions, status
from rest_framework.response import Response
from rest_framework.views import APIView
from rest_framework_simplejwt.tokens import RefreshToken
from rest_framework_simplejwt.views import TokenObtainPairView, TokenRefreshView

from .serializers import (
    ChangePasswordSerializer,
    CustomTokenObtainPairSerializer,
    EmailVerifySerializer,
    GoogleAuthSerializer,
    OTPRequestSerializer,
    OTPVerifySerializer,
    PasswordResetConfirmSerializer,
    PasswordResetRequestSerializer,
    UserProfileUpdateSerializer,
    UserPublicSerializer,
    UserRegisterSerializer,
    UserSerializer,
)
from .services import AuthService

logger = logging.getLogger("apps.accounts")
User = get_user_model()


@extend_schema(tags=["Authentication"])
class RegisterView(generics.CreateAPIView):
    """POST /api/v1/auth/register/ — Register a new user."""

    permission_classes = [permissions.AllowAny]
    serializer_class = UserRegisterSerializer
    throttle_scope = "auth"

    def create(self, request, *args, **kwargs):
        serializer = self.get_serializer(data=request.data)
        serializer.is_valid(raise_exception=True)

        user = AuthService.register_user(**serializer.validated_data)
        tokens = RefreshToken.for_user(user)

        return Response(
            {
                "success": True,
                "message": "Registration successful. Please verify your email.",
                "data": {
                    "user": UserSerializer(user).data,
                    "tokens": {
                        "access": str(tokens.access_token),
                        "refresh": str(tokens),
                    },
                },
            },
            status=status.HTTP_201_CREATED,
        )


@extend_schema(tags=["Authentication"])
class LoginView(TokenObtainPairView):
    """POST /api/v1/auth/login/ — Login and get JWT tokens."""

    serializer_class = CustomTokenObtainPairSerializer
    throttle_scope = "auth"


@extend_schema(tags=["Authentication"])
class LogoutView(APIView):
    """POST /api/v1/auth/logout/ — Blacklist refresh token."""

    permission_classes = [permissions.IsAuthenticated]

    def post(self, request):
        try:
            refresh_token = request.data.get("refresh")
            if refresh_token:
                token = RefreshToken(refresh_token)
                token.blacklist()
            logger.info("User logged out: %s", request.user.email)
            return Response(
                {"success": True, "message": "Logged out successfully."},
                status=status.HTTP_200_OK,
            )
        except Exception:
            return Response(
                {"success": False, "error": {"message": "Invalid token."}},
                status=status.HTTP_400_BAD_REQUEST,
            )


@extend_schema(tags=["Authentication"])
class RefreshTokenView(TokenRefreshView):
    """POST /api/v1/auth/refresh/ — Refresh JWT access token."""

    throttle_scope = "auth"


@extend_schema(tags=["Authentication"])
class GoogleAuthView(APIView):
    """POST /api/v1/auth/google/ — Google OAuth login/register."""

    permission_classes = [permissions.AllowAny]
    serializer_class = GoogleAuthSerializer
    throttle_scope = "auth"

    def post(self, request):
        serializer = GoogleAuthSerializer(data=request.data)
        serializer.is_valid(raise_exception=True)

        user = AuthService.google_authenticate(
            serializer.validated_data["access_token"]
        )
        tokens = RefreshToken.for_user(user)

        return Response(
            {
                "success": True,
                "data": {
                    "user": UserSerializer(user).data,
                    "tokens": {
                        "access": str(tokens.access_token),
                        "refresh": str(tokens),
                    },
                },
            },
            status=status.HTTP_200_OK,
        )


@extend_schema(tags=["Authentication"])
class PasswordResetRequestView(APIView):
    """POST /api/v1/auth/password/reset/ — Request password reset."""

    permission_classes = [permissions.AllowAny]
    serializer_class = PasswordResetRequestSerializer
    throttle_scope = "auth"

    def post(self, request):
        serializer = PasswordResetRequestSerializer(data=request.data)
        serializer.is_valid(raise_exception=True)

        AuthService.request_password_reset(serializer.validated_data["email"])

        return Response(
            {
                "success": True,
                "message": "If an account with this email exists, a reset link has been sent.",
            },
            status=status.HTTP_200_OK,
        )


@extend_schema(tags=["Authentication"])
class PasswordResetConfirmView(APIView):
    """POST /api/v1/auth/password/reset/confirm/ — Confirm password reset."""

    permission_classes = [permissions.AllowAny]
    serializer_class = PasswordResetConfirmSerializer
    throttle_scope = "auth"

    def post(self, request):
        serializer = PasswordResetConfirmSerializer(data=request.data)
        serializer.is_valid(raise_exception=True)

        AuthService.reset_password(
            token=serializer.validated_data["token"],
            new_password=serializer.validated_data["password"],
        )

        return Response(
            {"success": True, "message": "Password reset successfully."},
            status=status.HTTP_200_OK,
        )


@extend_schema(tags=["Authentication"])
class EmailVerifyView(APIView):
    """POST /api/v1/auth/email/verify/ — Verify email."""

    permission_classes = [permissions.AllowAny]
    serializer_class = EmailVerifySerializer
    throttle_scope = "auth"

    def post(self, request):
        serializer = EmailVerifySerializer(data=request.data)
        serializer.is_valid(raise_exception=True)
        AuthService.verify_email(serializer.validated_data["token"])
        return Response(
            {"success": True, "message": "Email verified successfully."},
            status=status.HTTP_200_OK,
        )


@extend_schema(tags=["Authentication"])
class EmailResendView(APIView):
    """POST /api/v1/auth/email/resend/ — Resend verification email."""

    permission_classes = [permissions.IsAuthenticated]
    throttle_scope = "auth"

    def post(self, request):
        AuthService.send_email_verification(request.user)
        return Response(
            {"success": True, "message": "Verification email sent."},
            status=status.HTTP_200_OK,
        )


@extend_schema(tags=["Authentication"])
class OTPRequestView(APIView):
    """POST /api/v1/auth/otp/request/ — Request OTP."""

    permission_classes = [permissions.AllowAny]
    serializer_class = OTPRequestSerializer
    throttle_scope = "auth"

    def post(self, request):
        serializer = OTPRequestSerializer(data=request.data)
        serializer.is_valid(raise_exception=True)
        AuthService.request_otp(serializer.validated_data["phone_number"])
        return Response(
            {"success": True, "message": "OTP sent to your phone."},
            status=status.HTTP_200_OK,
        )


@extend_schema(tags=["Authentication"])
class OTPVerifyView(APIView):
    """POST /api/v1/auth/otp/verify/ — Verify OTP."""

    permission_classes = [permissions.AllowAny]
    serializer_class = OTPVerifySerializer
    throttle_scope = "auth"

    def post(self, request):
        serializer = OTPVerifySerializer(data=request.data)
        serializer.is_valid(raise_exception=True)
        AuthService.verify_otp(
            serializer.validated_data["phone_number"],
            serializer.validated_data["otp"],
        )
        return Response(
            {"success": True, "message": "OTP verified successfully."},
            status=status.HTTP_200_OK,
        )


@extend_schema(tags=["Profile"])
class MeView(generics.RetrieveUpdateAPIView):
    """GET/PATCH /api/v1/auth/me/ — Current user profile."""

    permission_classes = [permissions.IsAuthenticated]

    def get_serializer_class(self):
        if self.request.method == "PATCH":
            return UserProfileUpdateSerializer
        return UserSerializer

    def get_object(self):
        return self.request.user


@extend_schema(tags=["Authentication"])
class ChangePasswordView(APIView):
    """POST /api/v1/auth/password/change/ — Change password."""

    permission_classes = [permissions.IsAuthenticated]
    serializer_class = ChangePasswordSerializer
    throttle_scope = "auth"

    def post(self, request):
        serializer = ChangePasswordSerializer(data=request.data)
        serializer.is_valid(raise_exception=True)

        AuthService.change_password(
            user=request.user,
            old_password=serializer.validated_data["old_password"],
            new_password=serializer.validated_data["new_password"],
        )

        return Response(
            {"success": True, "message": "Password changed successfully."},
            status=status.HTTP_200_OK,
        )


@extend_schema(tags=["Authentication"])
class DeleteAccountView(APIView):
    """POST /api/v1/auth/account/delete/ — Soft delete account."""

    permission_classes = [permissions.IsAuthenticated]
    throttle_scope = "auth"

    def post(self, request):
        password = request.data.get("password", "")
        if not request.user.check_password(password):
            return Response(
                {"success": False, "error": {"message": "Invalid password."}},
                status=status.HTTP_400_BAD_REQUEST,
            )

        from .services import UserService

        UserService.soft_delete_user(request.user)

        return Response(
            {"success": True, "message": "Account deleted successfully."},
            status=status.HTTP_200_OK,
        )


@extend_schema(tags=["Users"])
class PublicUserProfileView(generics.RetrieveAPIView):
    """GET /api/v1/auth/users/{id}/ — Public user profile."""

    serializer_class = UserPublicSerializer
    permission_classes = [permissions.AllowAny]
    queryset = User.objects.filter(is_active=True, deleted_at__isnull=True)
    lookup_field = "pk"

