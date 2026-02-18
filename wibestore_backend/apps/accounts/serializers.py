"""
WibeStore Backend - Accounts Serializers
"""

from django.contrib.auth import get_user_model
from django.contrib.auth.password_validation import validate_password
from rest_framework import serializers
from rest_framework_simplejwt.serializers import TokenObtainPairSerializer

User = get_user_model()


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

    class Meta:
        model = User
        fields = [
            "id",
            "email",
            "username",
            "full_name",
            "display_name",
            "phone_number",
            "avatar",
            "is_verified",
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
            "is_verified",
            "rating",
            "total_sales",
            "total_purchases",
            "balance",
            "created_at",
            "last_login",
        ]


class UserPublicSerializer(serializers.ModelSerializer):
    """Public user info (visible to other users)."""

    display_name = serializers.CharField(read_only=True)

    class Meta:
        model = User
        fields = [
            "id",
            "username",
            "display_name",
            "avatar",
            "rating",
            "total_sales",
            "created_at",
        ]


class UserProfileUpdateSerializer(serializers.ModelSerializer):
    """Serializer for profile updates."""

    class Meta:
        model = User
        fields = [
            "username",
            "full_name",
            "phone_number",
            "avatar",
            "language",
            "timezone",
        ]

    def validate_username(self, value: str) -> str:
        user = self.context.get("request").user
        if User.objects.exclude(pk=user.pk).filter(username=value).exists():
            raise serializers.ValidationError("This username is already taken.")
        return value


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
