"""
WibeStore Backend - Accounts Views (API)
"""

import logging

from django.conf import settings
from django.contrib.auth import get_user_model
from django.utils import timezone
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
    TelegramBotProfileRequestSerializer,
    TelegramOTPCreateSerializer,
    TelegramRegisterSerializer,
    UserProfileUpdateSerializer,
    UserPublicSerializer,
    UserRegisterSerializer,
    UserSerializer,
)
from core.exceptions import BusinessLogicError
from core.permissions import IsTelegramBot
from core.throttles import AuthRateThrottle, OTPRateThrottle, PasswordResetThrottle
from .services import AuthService

logger = logging.getLogger("apps.accounts")
User = get_user_model()


@extend_schema(tags=["Authentication"])
class RegisterView(generics.CreateAPIView):
    """POST /api/v1/auth/register/ — Register a new user."""

    permission_classes = [permissions.AllowAny]
    serializer_class = UserRegisterSerializer
    throttle_classes = [AuthRateThrottle]

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
    throttle_classes = [AuthRateThrottle]

    def post(self, request, *args, **kwargs):
        response = super().post(request, *args, **kwargs)
        # Return same shape as Register/Google: { success, data: { user, tokens } }
        access = response.data.get("access")
        refresh = response.data.get("refresh")
        if access and refresh:
            from rest_framework_simplejwt.tokens import AccessToken
            payload = AccessToken(access).payload
            user_id = payload.get("user_id")
            if user_id:
                user = User.objects.filter(pk=user_id).first()
                if user:
                    response.data = {
                        "success": True,
                        "data": {
                            "user": UserSerializer(user).data,
                            "tokens": {"access": access, "refresh": refresh},
                        },
                    }
        return response


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
    throttle_classes = [PasswordResetThrottle]

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


@extend_schema(tags=["Authentication"])
class TelegramBotProfileView(APIView):
    """
    Bot uchun foydalanuvchi profili: sayt username, balans, sotilgan akkauntlar soni.
    POST /api/v1/auth/telegram/profile/
    Body: { "secret_key": "...", "telegram_id": 123456789 }
    """

    permission_classes = [IsTelegramBot]

    def post(self, request):
        serializer = TelegramBotProfileRequestSerializer(data=request.data)
        serializer.is_valid(raise_exception=True)
        data = serializer.validated_data

        user = User.objects.filter(
            telegram_id=data["telegram_id"],
            is_active=True,
            deleted_at__isnull=True,
        ).first()

        if not user:
            return Response(
                {
                    "success": True,
                    "has_account": False,
                    "message": "Saytda ro'yxatdan o'tmagan.",
                },
                status=status.HTTP_200_OK,
            )

        from django.utils import timezone

        from apps.payments.models import EscrowTransaction
        from apps.subscriptions.models import UserSubscription

        sold_count = EscrowTransaction.objects.filter(
            seller=user, status="confirmed"
        ).count()

        # Aktiv obuna ma'lumotlari
        active_sub = UserSubscription.objects.filter(
            user=user, status="active", end_date__gt=timezone.now()
        ).select_related("plan").order_by("-end_date").first()
        plan_slug = "free"
        sub_end_date = None
        sub_days_left = 0
        if active_sub and not active_sub.is_expired:
            plan_slug = active_sub.plan.slug
            sub_end_date = active_sub.end_date.strftime("%d.%m.%Y")
            sub_days_left = max(0, (active_sub.end_date - timezone.now()).days)

        return Response(
            {
                "success": True,
                "has_account": True,
                "data": {
                    "username": user.username or user.email or str(user.telegram_id),
                    "email": user.email or "",
                    "balance": str(user.balance),
                    "sold_count": sold_count,
                    "plan": plan_slug,
                    "sub_end_date": sub_end_date,
                    "sub_days_left": sub_days_left,
                },
            },
            status=status.HTTP_200_OK,
        )


@extend_schema(tags=["Authentication"])
class TelegramBotAddBalanceView(APIView):
    """
    Bot uchun foydalanuvchi balansini oshirish (admin screenshot tasdiqlash oqimi).
    POST /api/v1/auth/telegram/balance/add/
    Body: { "secret_key": "...", "telegram_id": 123456789, "amount": 50000 }
    """

    permission_classes = [IsTelegramBot]

    def post(self, request):
        from decimal import Decimal, InvalidOperation

        data = request.data
        telegram_id = data.get("telegram_id")
        amount_raw = data.get("amount")

        if not telegram_id or amount_raw is None:
            return Response(
                {"success": False, "error": "telegram_id va amount majburiy."},
                status=status.HTTP_400_BAD_REQUEST,
            )

        try:
            amount = Decimal(str(amount_raw))
        except (InvalidOperation, ValueError):
            return Response(
                {"success": False, "error": "amount noto'g'ri format."},
                status=status.HTTP_400_BAD_REQUEST,
            )

        if amount <= 0:
            return Response(
                {"success": False, "error": "amount musbat bo'lishi kerak."},
                status=status.HTTP_400_BAD_REQUEST,
            )

        user = User.objects.filter(
            telegram_id=telegram_id,
            is_active=True,
            deleted_at__isnull=True,
        ).first()

        if not user:
            return Response(
                {"success": False, "error": "Foydalanuvchi topilmadi."},
                status=status.HTTP_404_NOT_FOUND,
            )

        # Atomik yangilash — race condition oldini olish
        from django.db.models import F
        User.objects.filter(pk=user.pk).update(balance=F("balance") + amount)
        user.refresh_from_db(fields=["balance"])

        logger.info(
            "TelegramBot: %s (tg_id=%s) hisobiga %s UZS qo'shildi. Yangi balans: %s",
            user.email, telegram_id, amount, user.balance,
        )

        return Response(
            {
                "success": True,
                "telegram_id": telegram_id,
                "added": str(amount),
                "new_balance": str(user.balance),
                "username": user.username or user.email or str(telegram_id),
            },
            status=status.HTTP_200_OK,
        )


@extend_schema(tags=["Authentication"])
class TelegramBotDeductBalanceView(APIView):
    """
    Bot uchun foydalanuvchi balansini kamaytirish (admin pul yechish tasdiqlash oqimi).
    POST /api/v1/auth/telegram/balance/deduct/
    Body: { "secret_key": "...", "telegram_id": 123456789, "amount": 50000 }
    """

    permission_classes = [IsTelegramBot]

    def post(self, request):
        from decimal import Decimal, InvalidOperation

        from django.db.models import F

        data = request.data
        telegram_id = data.get("telegram_id")
        amount_raw = data.get("amount")

        if not telegram_id or amount_raw is None:
            return Response(
                {"success": False, "error": "telegram_id va amount majburiy."},
                status=status.HTTP_400_BAD_REQUEST,
            )

        try:
            amount = Decimal(str(amount_raw))
        except (InvalidOperation, ValueError):
            return Response(
                {"success": False, "error": "amount noto'g'ri format."},
                status=status.HTTP_400_BAD_REQUEST,
            )

        if amount <= 0:
            return Response(
                {"success": False, "error": "amount musbat bo'lishi kerak."},
                status=status.HTTP_400_BAD_REQUEST,
            )

        user = User.objects.filter(
            telegram_id=telegram_id,
            is_active=True,
            deleted_at__isnull=True,
        ).first()

        if not user:
            return Response(
                {"success": False, "error": "Foydalanuvchi topilmadi."},
                status=status.HTTP_404_NOT_FOUND,
            )

        if user.balance < amount:
            return Response(
                {"success": False, "error": "Balans yetarli emas."},
                status=status.HTTP_400_BAD_REQUEST,
            )

        User.objects.filter(pk=user.pk).update(balance=F("balance") - amount)
        user.refresh_from_db(fields=["balance"])

        logger.info(
            "TelegramBot: %s (tg_id=%s) hisobidan %s UZS yechildi. Yangi balans: %s",
            user.email, telegram_id, amount, user.balance,
        )

        return Response(
            {
                "success": True,
                "telegram_id": telegram_id,
                "deducted": str(amount),
                "new_balance": str(user.balance),
                "username": user.username or user.email or str(telegram_id),
            },
            status=status.HTTP_200_OK,
        )


class TelegramBotPlansView(APIView):
    """
    Bot uchun tarif narxlarini qaytarish.
    POST /api/v1/auth/telegram/plans/
    Body: { "secret_key": "..." }
    Response: { "plans": { "premium": {"price": "50000", "name": "Premium"}, "pro": {...} } }
    """

    permission_classes = [IsTelegramBot]

    def post(self, request):
        from apps.subscriptions.models import SubscriptionPlan

        plans = SubscriptionPlan.objects.filter(slug__in=("premium", "pro"), is_active=True).values(
            "slug", "name", "price_monthly"
        )
        result = {}
        for p in plans:
            result[p["slug"]] = {
                "name": p["name"],
                "price": str(p["price_monthly"]),
            }
        return Response({"success": True, "plans": result}, status=status.HTTP_200_OK)


class TelegramBotPremiumPurchaseView(APIView):
    """
    Bot uchun premium tarif sotib olish (balans orqali yoki admin tasdiqlagan so'ng).
    POST /api/v1/auth/telegram/premium/purchase/
    Body: { "secret_key": "...", "telegram_id": 123, "plan": "premium|pro", "use_balance": true }

    use_balance=True: balansdan ushlab, premium beradi (mablag' yetmasa xato qaytaradi)
    use_balance=False: faqat premium beradi (admin tasdiqlagan to'lov uchun)
    """

    permission_classes = [IsTelegramBot]

    def post(self, request):
        from decimal import Decimal

        from django.db import transaction
        from django.db.models import F
        from django.utils import timezone

        from apps.subscriptions.models import SubscriptionPlan, UserSubscription

        data = request.data
        telegram_id = data.get("telegram_id")
        plan_slug = str(data.get("plan", "")).lower().strip()
        use_balance = bool(data.get("use_balance", False))

        if not telegram_id or plan_slug not in ("premium", "pro"):
            return Response(
                {"success": False, "error": "telegram_id va plan (premium/pro) majburiy."},
                status=status.HTTP_400_BAD_REQUEST,
            )

        user = User.objects.filter(
            telegram_id=telegram_id,
            is_active=True,
            deleted_at__isnull=True,
        ).first()

        if not user:
            return Response(
                {"success": False, "error": "Foydalanuvchi topilmadi."},
                status=status.HTTP_404_NOT_FOUND,
            )

        # Allaqachon aktiv tarif borligini tekshirish (har qanday tarif)
        existing = UserSubscription.objects.filter(
            user=user,
            status="active",
            end_date__gt=timezone.now(),
        ).select_related("plan").first()
        if existing:
            current_slug = existing.plan.slug
            days_left = max(0, (existing.end_date - timezone.now()).days)
            # Block re-purchase of same plan
            if current_slug == plan_slug:
                return Response(
                    {
                        "success": False,
                        "error": "already_subscribed",
                        "plan": plan_slug,
                        "days_left": days_left,
                        "end_date": existing.end_date.strftime("%d.%m.%Y"),
                    },
                    status=status.HTTP_409_CONFLICT,
                )
            # Block Pro → Premium downgrade
            if current_slug == "pro" and plan_slug == "premium":
                return Response(
                    {
                        "success": False,
                        "error": "downgrade_not_allowed",
                        "plan": current_slug,
                        "days_left": days_left,
                        "end_date": existing.end_date.strftime("%d.%m.%Y"),
                    },
                    status=status.HTTP_409_CONFLICT,
                )
            # Premium → Pro upgrade: cancel existing, continue with purchase

        # Narxni DB dan olish (SubscriptionPlan.price_monthly)
        plan_obj = SubscriptionPlan.objects.filter(slug=plan_slug, is_active=True).first()
        if not plan_obj:
            return Response(
                {"success": False, "error": f"Tarif topilmadi: {plan_slug}"},
                status=status.HTTP_404_NOT_FOUND,
            )
        price = plan_obj.price_monthly or Decimal("0")

        if use_balance:
            # Balansni atomik tekshirish va ushlab qolish
            with transaction.atomic():
                user_locked = User.objects.select_for_update().get(pk=user.pk)
                current_balance = user_locked.balance or Decimal("0")
                if current_balance < price:
                    return Response(
                        {
                            "success": False,
                            "error": "insufficient_balance",
                            "balance": str(current_balance),
                            "required": str(price),
                        },
                        status=status.HTTP_402_PAYMENT_REQUIRED,
                    )
                User.objects.filter(pk=user.pk).update(balance=F("balance") - price)
                user_locked.refresh_from_db(fields=["balance"])
                new_balance = user_locked.balance

            logger.info(
                "TelegramBot balance purchase: %s (tg=%s) %s tarifi uchun %s UZS ushlab qolindi.",
                user.email, telegram_id, plan_slug, price,
            )
        else:
            new_balance = user.balance

        # Premium/Pro berish
        try:
            from apps.subscriptions.services import SubscriptionService
            SubscriptionService.grant_subscription(user, plan_slug, months=1)
        except Exception as e:
            # Agar balans allaqachon ushlab qolgan bo'lsa, qaytarib berish
            if use_balance:
                User.objects.filter(pk=user.pk).update(balance=F("balance") + price)
            logger.error("Premium grant xato (tg=%s): %s", telegram_id, e)
            return Response(
                {"success": False, "error": f"Tarif berishda xato: {e}"},
                status=status.HTTP_500_INTERNAL_SERVER_ERROR,
            )

        logger.info(
            "TelegramBot: %s (tg=%s) ga %s tarifi berildi (use_balance=%s).",
            user.email, telegram_id, plan_slug, use_balance,
        )
        return Response(
            {
                "success": True,
                "plan": plan_slug,
                "telegram_id": telegram_id,
                "new_balance": str(new_balance) if use_balance else None,
                "username": user.username or user.email or str(telegram_id),
            },
            status=status.HTTP_200_OK,
        )


@extend_schema(tags=["Authentication"])
class BotCreateOTPView(APIView):
    """
    Bot uchun bir martalik kod yaratish.
    POST /api/v1/auth/telegram/otp/create/
    Body: { "secret_key": "...", "telegram_id": 123, "phone_number": "+998901234567" }
    """

    permission_classes = [IsTelegramBot]
    throttle_classes = [OTPRateThrottle]

    def post(self, request):
        serializer = TelegramOTPCreateSerializer(data=request.data)
        serializer.is_valid(raise_exception=True)
        data = serializer.validated_data

        try:
            otp_record = AuthService.create_telegram_otp(
                telegram_id=data["telegram_id"],
                phone_number=data["phone_number"],
                full_name=data.get("full_name", ""),
                photo_url=data.get("photo_url") or None,
            )
        except BusinessLogicError as e:
            return Response(
                {"success": False, "error": str(e)},
                status=status.HTTP_400_BAD_REQUEST,
            )

        remaining = max(0, int((otp_record.expires_at - timezone.now()).total_seconds()))
        code_length = getattr(settings, "TELEGRAM_OTP_CODE_LENGTH", 6)
        expire_minutes = getattr(settings, "TELEGRAM_OTP_EXPIRE_MINUTES", 10)
        return Response(
            {
                "success": True,
                "code": otp_record.code,
                "expires_at": otp_record.expires_at.isoformat(),
                "remaining_seconds": remaining,
                "code_length": code_length,
                "expire_minutes": expire_minutes,
            },
            status=status.HTTP_200_OK,
        )


@extend_schema(tags=["Authentication"])
class TelegramRegisterView(APIView):
    """
    Telegram orqali ro'yxatdan o'tish: telefon + botdan olingan kod.
    POST /api/v1/auth/register/telegram/
    Body: { "phone": "+998901234567", "code": "123456" }
    JWT access token httpOnly cookie'da qaytariladi (XSS himoya).
    """

    permission_classes = [permissions.AllowAny]
    throttle_scope = "auth"

    def post(self, request):
        serializer = TelegramRegisterSerializer(data=request.data)
        serializer.is_valid(raise_exception=True)
        data = serializer.validated_data

        mode = request.data.get("mode", "register")
        try:
            user = AuthService.validate_telegram_code_and_register(
                phone_number=data["phone"],
                code=data["code"],
                mode=mode,
            )
        except BusinessLogicError as e:
            return Response(
                {"success": False, "error": str(e)},
                status=status.HTTP_400_BAD_REQUEST,
            )

        tokens = RefreshToken.for_user(user)
        access = str(tokens.access_token)
        refresh = str(tokens)

        response = Response(
            {
                "success": True,
                "message": "Muvaffaqiyatli ro'yxatdan o'tdingiz!",
                "data": {
                    "user": UserSerializer(user).data,
                    "tokens": {"access": access, "refresh": refresh},
                },
            },
            status=status.HTTP_201_CREATED,
        )

        # JWT ni httpOnly cookie'da berish (XSS himoya)
        max_age_access = 60 * 15  # 15 min (SIMPLE_JWT default)
        response.set_cookie(
            key="access_token",
            value=access,
            max_age=max_age_access,
            httponly=True,
            secure=not settings.DEBUG,
            samesite="Lax",
            path="/",
        )
        response.set_cookie(
            key="refresh_token",
            value=refresh,
            max_age=60 * 60 * 24 * 7,  # 7 kun
            httponly=True,
            secure=not settings.DEBUG,
            samesite="Lax",
            path="/api/v1/auth/refresh/",
        )
        return response


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


@extend_schema(tags=["Telegram Bot"])
class TelegramEscrowActionView(APIView):
    """
    Bot uchun: xarid escrow tasdiqlash/rad etish.
    POST /api/v1/auth/telegram/escrow/action/
    Body: {
        "secret_key": "...",
        "telegram_id": 123456789,
        "escrow_id": "uuid",
        "action": "seller_confirm" | "buyer_confirm" | "buyer_dispute",
        "reason": "..."  (only for buyer_dispute)
    }
    """

    permission_classes = [IsTelegramBot]

    def post(self, request):
        from apps.payments.models import EscrowTransaction
        from apps.payments.services import EscrowService
        from core.exceptions import BusinessLogicError

        telegram_id = request.data.get("telegram_id")
        escrow_id = request.data.get("escrow_id")
        action = request.data.get("action")
        reason = request.data.get("reason", "")

        if not all([telegram_id, escrow_id, action]):
            return Response(
                {"success": False, "error": "telegram_id, escrow_id, action majburiy"},
                status=status.HTTP_400_BAD_REQUEST,
            )

        user = User.objects.filter(
            telegram_id=telegram_id, is_active=True, deleted_at__isnull=True
        ).first()
        if not user:
            return Response(
                {"success": False, "error": "Foydalanuvchi topilmadi"},
                status=status.HTTP_404_NOT_FOUND,
            )

        try:
            escrow = EscrowTransaction.objects.select_related("buyer", "seller", "listing").get(
                id=escrow_id
            )
        except (EscrowTransaction.DoesNotExist, Exception):
            return Response(
                {"success": False, "error": "Escrow topilmadi"},
                status=status.HTTP_404_NOT_FOUND,
            )

        try:
            if action == "seller_confirm":
                EscrowService.seller_confirm_transfer(escrow, user)
                return Response(
                    {"success": True, "message": "Sotuvchi akkaunt topshirilganini tasdiqladi."},
                    status=status.HTTP_200_OK,
                )

            elif action == "buyer_confirm":
                EscrowService.confirm_delivery(escrow, user)
                try:
                    from apps.payments.telegram_notify import notify_buyer_confirmed
                    notify_buyer_confirmed(escrow)
                except Exception as e:
                    logger.warning("Telegram notify_buyer_confirmed failed: %s", e)
                return Response(
                    {"success": True, "message": "Haridor akkaunt qabul qilganini tasdiqladi."},
                    status=status.HTTP_200_OK,
                )

            elif action == "buyer_dispute":
                dispute_reason = reason or "Haridor shikoyat ochdi (bot orqali)"
                EscrowService.open_dispute(escrow, user, dispute_reason)
                return Response(
                    {"success": True, "message": "Shikoyat qabul qilindi."},
                    status=status.HTTP_200_OK,
                )

            else:
                return Response(
                    {"success": False, "error": f"Noto'g'ri action: {action}"},
                    status=status.HTTP_400_BAD_REQUEST,
                )

        except BusinessLogicError as e:
            return Response(
                {"success": False, "error": str(e)},
                status=status.HTTP_400_BAD_REQUEST,
            )
        except Exception as e:
            logger.error("TelegramEscrowActionView xato: %s", e)
            return Response(
                {"success": False, "error": "Ichki xato yuz berdi"},
                status=status.HTTP_500_INTERNAL_SERVER_ERROR,
            )


@extend_schema(tags=["Users"])
class PublicUserProfileView(generics.RetrieveAPIView):
    """GET /api/v1/auth/users/{id}/ — Public user profile."""

    serializer_class = UserPublicSerializer
    permission_classes = [permissions.AllowAny]
    queryset = User.objects.filter(is_active=True, deleted_at__isnull=True)
    lookup_field = "pk"

