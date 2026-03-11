"""
WibeStore Backend - Accounts Serializers
"""

from django.contrib.auth import get_user_model
from django.contrib.auth.password_validation import validate_password
from rest_framework import serializers
from rest_framework_simplejwt.serializers import TokenObtainPairSerializer

User = get_user_model()

def _get_user_plan_slug(user) -> str:
    """
    Returns: 'free' | 'premium' | 'pro'
    Uses subscriptions service; safe fallback to 'free' if not available.
    """
    try:
        from apps.subscriptions.services import SubscriptionService
        return SubscriptionService.get_user_plan(user)
    except Exception:
        return "free"

def _plan_flags(plan_slug: str) -> tuple[bool, bool]:
    is_pro = plan_slug == "pro"
    is_premium = plan_slug in ("premium", "pro")
    return is_premium, is_pro


class CustomTokenObtainPairSerializer(TokenObtainPairSerializer):
    """Custom JWT token serializer with additional claims."""

    @classmethod
    def get_token(cls, user):
        token = super().get_token(user)
        token["email"] = user.email
        token["username"] = user.username or ""
        token["full_name"] = user.full_name
        token["is_verified"] = user.is_verified
        token["is_staff"] = user.is_staff
        return token


class UserRegisterSerializer(serializers.ModelSerializer):
    """Serializer for user registration."""

    password = serializers.CharField(
        write_only=True, min_length=8, validators=[validate_password]
    )
    password_confirm = serializers.CharField(write_only=True)

    class Meta:
        model = User
        fields = [
            "email",
            "username",
            "full_name",
            "phone_number",
            "password",
            "password_confirm",
            "language",
        ]
        extra_kwargs = {
            "username": {"required": False},
            "full_name": {"required": False},
            "phone_number": {"required": False},
            "language": {"required": False},
        }

    def validate(self, attrs: dict) -> dict:
        if attrs["password"] != attrs.pop("password_confirm"):
            raise serializers.ValidationError(
                {"password_confirm": "Passwords do not match."}
            )
        return attrs

    def create(self, validated_data: dict) -> User:
        return User.objects.create_user(**validated_data)


class UserSerializer(serializers.ModelSerializer):
    """Full user serializer for profile views."""

    display_name = serializers.CharField(read_only=True)
    avatar = serializers.SerializerMethodField()
    plan = serializers.SerializerMethodField()
    is_premium = serializers.SerializerMethodField()
    is_pro = serializers.SerializerMethodField()

    class Meta:
        model = User
        fields = [
            "id",
            "email",
            "username",
            "full_name",
            "display_name",
            "phone_number",
            "telegram_id",
            "avatar",
            "plan",
            "is_premium",
            "is_pro",
            "is_verified",
            "is_staff",
            "rating",
            "total_sales",
            "total_purchases",
            "balance",
            "language",
            "timezone",
            "created_at",
            "last_login",
        ]
        read_only_fields = [
            "id",
            "email",
            "telegram_id",
            "is_verified",
            "is_staff",
            "rating",
            "total_sales",
            "total_purchases",
            "balance",
            "created_at",
            "last_login",
        ]

    def get_avatar(self, obj):
        request = self.context.get("request")
        if obj.avatar:
            if request:
                return request.build_absolute_uri(obj.avatar.url)
            return obj.avatar.url
        if obj.avatar_url:
            return obj.avatar_url
        return None

    def get_plan(self, obj) -> str:
        return _get_user_plan_slug(obj)

    def get_is_premium(self, obj) -> bool:
        plan = _get_user_plan_slug(obj)
        is_premium, _is_pro = _plan_flags(plan)
        return is_premium

    def get_is_pro(self, obj) -> bool:
        plan = _get_user_plan_slug(obj)
        _is_premium, is_pro = _plan_flags(plan)
        return is_pro


class UserPublicSerializer(serializers.ModelSerializer):
    """Public user info (visible to other users)."""

    display_name = serializers.CharField(read_only=True)
    avatar = serializers.SerializerMethodField()
    plan = serializers.SerializerMethodField()
    is_premium = serializers.SerializerMethodField()
    is_pro = serializers.SerializerMethodField()

    class Meta:
        model = User
        fields = [
            "id",
            "display_name",
            "avatar",
            "plan",
            "is_premium",
            "is_pro",
            "rating",
            "total_sales",
            "created_at",
        ]

    def get_avatar(self, obj):
        request = self.context.get("request")
        if obj.avatar:
            if request:
                return request.build_absolute_uri(obj.avatar.url)
            return obj.avatar.url
        if obj.avatar_url:
            return obj.avatar_url
        return None

    def get_plan(self, obj) -> str:
        return _get_user_plan_slug(obj)

    def get_is_premium(self, obj) -> bool:
        plan = _get_user_plan_slug(obj)
        is_premium, _is_pro = _plan_flags(plan)
        return is_premium

    def get_is_pro(self, obj) -> bool:
        plan = _get_user_plan_slug(obj)
        _is_premium, is_pro = _plan_flags(plan)
        return is_pro


class UserProfileUpdateSerializer(serializers.ModelSerializer):
    """Serializer for profile updates."""

    class Meta:
        model = User
        fields = [
            "username",
            "full_name",
            "phone_number",
            "avatar",
            "avatar_url",
            "language",
            "timezone",
        ]

    def validate_username(self, value: str) -> str:
        user = self.context.get("request").user
        if User.objects.exclude(pk=user.pk).filter(username=value).exists():
            raise serializers.ValidationError("This username is already taken.")
        return value

    def update(self, instance, validated_data):
        # Agar foydalanuvchi yangi avatar fayl yuklasa — eski avatar_url (Telegram/Google) ni tozalaymiz.
        # Aks holda serializer avatar_url'ni ustun qo'yib, vaqtinchalik URL sabab avatar yo'qolib qolishi mumkin.
        if "avatar" in validated_data and validated_data.get("avatar") is not None:
            validated_data["avatar_url"] = None
        return super().update(instance, validated_data)


class PasswordResetRequestSerializer(serializers.Serializer):
    """Serializer for password reset request."""

    email = serializers.EmailField()


class PasswordResetConfirmSerializer(serializers.Serializer):
    """Serializer for password reset confirmation."""

    token = serializers.CharField()
    password = serializers.CharField(min_length=8, validators=[validate_password])
    password_confirm = serializers.CharField()

    def validate(self, attrs: dict) -> dict:
        if attrs["password"] != attrs["password_confirm"]:
            raise serializers.ValidationError(
                {"password_confirm": "Passwords do not match."}
            )
        return attrs


class ChangePasswordSerializer(serializers.Serializer):
    """Serializer for password change."""

    old_password = serializers.CharField()
    new_password = serializers.CharField(min_length=8, validators=[validate_password])
    new_password_confirm = serializers.CharField()

    def validate(self, attrs: dict) -> dict:
        if attrs["new_password"] != attrs["new_password_confirm"]:
            raise serializers.ValidationError(
                {"new_password_confirm": "Passwords do not match."}
            )
        return attrs


class EmailVerifySerializer(serializers.Serializer):
    """Serializer for email verification."""

    token = serializers.CharField()


class GoogleAuthSerializer(serializers.Serializer):
    """Serializer for Google OAuth login."""

    access_token = serializers.CharField()


class OTPRequestSerializer(serializers.Serializer):
    """Serializer for OTP request."""

    phone_number = serializers.CharField()


class OTPVerifySerializer(serializers.Serializer):
    """Serializer for OTP verification."""

    phone_number = serializers.CharField()
    otp = serializers.CharField(max_length=6)


# ----- Telegram bot orqali ro'yxatdan o'tish -----


class TelegramOTPCreateSerializer(serializers.Serializer):
    """Bot uchun OTP kod yaratish (secret_key, telegram_id, phone_number, full_name, photo_url)."""

    secret_key = serializers.CharField(write_only=True)
    telegram_id = serializers.IntegerField(min_value=1)
    phone_number = serializers.CharField(max_length=20)
    full_name = serializers.CharField(max_length=150, required=False, default="")
    photo_url = serializers.URLField(max_length=500, required=False, allow_blank=True)


class TelegramRegisterSerializer(serializers.Serializer):
    """Saytda telefon + kod orqali ro'yxatdan o'tish."""

    phone = serializers.CharField(max_length=20)
    code = serializers.CharField(min_length=4, max_length=6)


class TelegramBotProfileRequestSerializer(serializers.Serializer):
    """Bot uchun profil so'rovi: secret_key + telegram_id."""

    secret_key = serializers.CharField(write_only=True)
    telegram_id = serializers.IntegerField(min_value=1)
