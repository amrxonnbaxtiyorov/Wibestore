from rest_framework import status
from rest_framework.views import APIView
from rest_framework.response import Response
from rest_framework.permissions import AllowAny, IsAuthenticated
from rest_framework_simplejwt.tokens import RefreshToken
from django.contrib.auth import authenticate, get_user_model
from django.utils import timezone

from .models import OTPCode, TelegramSession
from .serializers import (
    UserRegisterSerializer,
    UserLoginSerializer,
    UserProfileSerializer,
    OTPVerifySerializer,
)

User = get_user_model()


def get_tokens_for_user(user):
    refresh = RefreshToken.for_user(user)
    return {
        'refresh': str(refresh),
        'access': str(refresh.access_token),
    }


class RegisterWithOTPView(APIView):
    """
    OTP kod orqali ro'yxatdan o'tish
    POST /api/auth/register/
    {
        "username": "john",
        "email": "john@example.com",
        "password": "<parol>",
        "password2": "<parol>",
        "otp_code": "123456"
    }
    """
    permission_classes = [AllowAny]

    def post(self, request):
        serializer = UserRegisterSerializer(data=request.data)
        if serializer.is_valid():
            user = serializer.save()
            tokens = get_tokens_for_user(user)
            return Response({
                'success': True,
                'message': 'Muvaffaqiyatli ro\'yxatdan o\'tdingiz!',
                'user': UserProfileSerializer(user).data,
                'tokens': tokens,
            }, status=status.HTTP_201_CREATED)

        return Response({
            'success': False,
            'errors': serializer.errors
        }, status=status.HTTP_400_BAD_REQUEST)


class VerifyOTPView(APIView):
    """
    Faqat OTP kodni tekshirish (ro'yxatdan o'tishdan oldin validatsiya)
    POST /api/auth/verify-otp/
    {"code": "123456"}
    """
    permission_classes = [AllowAny]

    def post(self, request):
        serializer = OTPVerifySerializer(data=request.data)
        if serializer.is_valid():
            otp = serializer.validated_data['otp']
            return Response({
                'success': True,
                'valid': True,
                'message': 'Kod tasdiqlandi! Ro\'yxatdan o\'tishingiz mumkin.',
                'telegram_id': otp.telegram_id,
                'remaining_seconds': otp.remaining_seconds,
            })

        return Response({
            'success': False,
            'valid': False,
            'errors': serializer.errors
        }, status=status.HTTP_400_BAD_REQUEST)


class LoginView(APIView):
    """
    Login
    POST /api/auth/login/
    {"username": "john", "password": "<parol>"}
    """
    permission_classes = [AllowAny]

    def post(self, request):
        serializer = UserLoginSerializer(data=request.data)
        if not serializer.is_valid():
            return Response({'success': False, 'errors': serializer.errors},
                            status=status.HTTP_400_BAD_REQUEST)

        user = authenticate(
            username=serializer.validated_data['username'],
            password=serializer.validated_data['password']
        )

        if not user:
            return Response({
                'success': False,
                'error': 'Username yoki parol noto\'g\'ri.'
            }, status=status.HTTP_401_UNAUTHORIZED)

        tokens = get_tokens_for_user(user)
        return Response({
            'success': True,
            'message': 'Muvaffaqiyatli kirdingiz!',
            'user': UserProfileSerializer(user).data,
            'tokens': tokens,
        })


class ProfileView(APIView):
    """Foydalanuvchi profili"""
    permission_classes = [IsAuthenticated]

    def get(self, request):
        serializer = UserProfileSerializer(request.user)
        return Response({'success': True, 'user': serializer.data})


class OTPStatusView(APIView):
    """
    Telegram bot webhook uchun - OTP yaratish
    Bu endpoint faqat internal yoki bot tomonidan chaqiriladi
    POST /api/bot/create-otp/
    {"telegram_id": 123456789, "secret_key": "BOT_SECRET"}
    """
    permission_classes = [AllowAny]

    def post(self, request):
        from django.conf import settings
        secret = request.data.get('secret_key')

        if secret != settings.BOT_SECRET_KEY:
            return Response({'error': 'Unauthorized'}, status=status.HTTP_403_FORBIDDEN)

        telegram_id = request.data.get('telegram_id')
        email = request.data.get('email')
        phone = request.data.get('phone_number') or request.data.get('phone')

        if not telegram_id:
            return Response({'error': 'telegram_id required'},
                            status=status.HTTP_400_BAD_REQUEST)

        otp = OTPCode.create_otp(telegram_id=telegram_id, email=email, phone=phone)

        return Response({
            'success': True,
            'code': otp.code,
            'expires_at': otp.expires_at.isoformat(),
            'remaining_seconds': otp.remaining_seconds,
        })
