"""
Admin Panel App - Serializers
"""

from rest_framework import serializers
from django.contrib.auth import get_user_model
from django.db.models import Count, Sum, Avg
from apps.marketplace.models import Listing
from apps.payments.models import Transaction
from apps.reviews.models import Review

User = get_user_model()


class AdminDashboardSerializer(serializers.Serializer):
    """Serializer for admin dashboard statistics."""
    
    total_users = serializers.IntegerField()
    active_users = serializers.IntegerField()
    total_listings = serializers.IntegerField()
    active_listings = serializers.IntegerField()
    pending_listings = serializers.IntegerField()
    total_sales = serializers.DecimalField(max_digits=15, decimal_places=2)
    total_revenue = serializers.DecimalField(max_digits=15, decimal_places=2)
    total_commission = serializers.DecimalField(max_digits=15, decimal_places=2)
    avg_listing_price = serializers.DecimalField(max_digits=15, decimal_places=2)
    total_reviews = serializers.IntegerField()
    avg_rating = serializers.DecimalField(max_digits=3, decimal_places=2)


class AdminUserSerializer(serializers.ModelSerializer):
    """Serializer for admin user management."""
    
    total_listings = serializers.SerializerMethodField()
    total_sales = serializers.SerializerMethodField()
    
    class Meta:
        model = User
        fields = [
            'id', 'email', 'username', 'full_name', 'phone_number',
            'is_active', 'is_verified', 'is_staff', 'balance', 'rating',
            'date_joined', 'total_listings', 'total_sales',
        ]
        read_only_fields = fields
    
    def get_total_listings(self, obj) -> int:
        return Listing.objects.filter(seller=obj).count()
    
    def get_total_sales(self, obj) -> int:
        return Listing.objects.filter(seller=obj, status='sold').count()


class AdminListingSerializer(serializers.ModelSerializer):
    """Serializer for admin listing management."""
    
    seller_name = serializers.CharField(source='seller.full_name', read_only=True)
    seller_email = serializers.EmailField(source='seller.email', read_only=True)
    game_name = serializers.CharField(source='game.name', read_only=True)
    
    class Meta:
        model = Listing
        fields = [
            'id', 'title', 'price', 'status', 'game', 'game_name',
            'seller', 'seller_name', 'seller_email', 'is_premium',
            'created_at', 'updated_at', 'views_count',
        ]
        read_only_fields = fields


class AdminTransactionSerializer(serializers.ModelSerializer):
    """Serializer for admin transaction monitoring."""
    
    user_name = serializers.CharField(source='user.full_name', read_only=True)
    user_email = serializers.EmailField(source='user.email', read_only=True)
    
    class Meta:
        model = Transaction
        fields = [
            'id', 'user', 'user_name', 'user_email', 'amount', 'type',
            'status', 'payment_method', 'created_at', 'processed_at',
        ]
        read_only_fields = fields


class AdminReportSerializer(serializers.ModelSerializer):
    """Serializer for admin report management."""

    reporter_name = serializers.CharField(source='reporter.full_name', read_only=True)
    reported_user_name = serializers.CharField(
        source='reported_user.full_name', read_only=True, allow_null=True
    )

    class Meta:
        from apps.reports.models import Report
        model = Report
        fields = [
            'id', 'reporter', 'reporter_name', 'reported_user',
            'reported_user_name', 'reported_listing', 'reason',
            'description', 'status', 'resolution_note', 'resolved_at',
            'created_at',
        ]
        read_only_fields = fields


from apps.accounts.models import TelegramBotStat
from apps.payments.models import DepositRequest, EscrowTransaction, SellerVerification


class TelegramBotStatSerializer(serializers.ModelSerializer):
    user_email = serializers.SerializerMethodField()
    user_id = serializers.SerializerMethodField()

    class Meta:
        model = TelegramBotStat
        fields = [
            "id", "telegram_id", "telegram_username", "telegram_first_name",
            "telegram_last_name", "user_id", "user_email",
            "first_interaction_at", "last_interaction_at",
            "is_blocked", "registration_completed", "registration_date",
            "registration_otp_code", "total_commands_sent", "referral_code_used",
        ]

    def get_user_email(self, obj):
        return obj.user.email if obj.user else None

    def get_user_id(self, obj):
        return str(obj.user.id) if obj.user else None


class AdminDepositRequestSerializer(serializers.ModelSerializer):
    user_email = serializers.SerializerMethodField()
    user_id = serializers.SerializerMethodField()
    reviewed_by_email = serializers.SerializerMethodField()

    class Meta:
        model = DepositRequest
        fields = [
            "id", "telegram_id", "telegram_username", "amount",
            "screenshot", "sent_at", "status",
            "reviewed_by_email", "reviewed_at", "admin_note",
            "user_id", "user_email",
        ]

    def get_user_email(self, obj):
        return obj.user.email if obj.user else None

    def get_user_id(self, obj):
        return str(obj.user.id) if obj.user else None

    def get_reviewed_by_email(self, obj):
        return obj.reviewed_by.email if obj.reviewed_by else None


class AdminSellerVerificationSerializer(serializers.ModelSerializer):
    seller_email = serializers.SerializerMethodField()
    seller_username = serializers.SerializerMethodField()
    listing_title = serializers.SerializerMethodField()
    escrow_id = serializers.SerializerMethodField()
    seller_earnings = serializers.SerializerMethodField()

    class Meta:
        model = SellerVerification
        fields = [
            "id", "status", "seller_email", "seller_username",
            "listing_title", "escrow_id", "seller_earnings",
            "passport_front_file_id", "passport_back_file_id", "circle_video_file_id",
            "location_latitude", "location_longitude", "full_name",
            "admin_note", "created_at", "updated_at",
        ]

    def get_seller_email(self, obj):
        return obj.seller.email if obj.seller else None

    def get_seller_username(self, obj):
        return obj.seller.username if obj.seller else None

    def get_listing_title(self, obj):
        if obj.escrow and obj.escrow.listing:
            return obj.escrow.listing.title
        return None

    def get_escrow_id(self, obj):
        return str(obj.escrow.id) if obj.escrow else None

    def get_seller_earnings(self, obj):
        return str(obj.escrow.seller_earnings) if obj.escrow else None


class AdminTradeSerializer(serializers.ModelSerializer):
    listing_title = serializers.SerializerMethodField()
    listing_game = serializers.SerializerMethodField()
    listing_price = serializers.SerializerMethodField()
    buyer_email = serializers.SerializerMethodField()
    buyer_username = serializers.SerializerMethodField()
    buyer_phone = serializers.SerializerMethodField()
    buyer_telegram = serializers.SerializerMethodField()
    seller_email = serializers.SerializerMethodField()
    seller_username = serializers.SerializerMethodField()
    seller_phone = serializers.SerializerMethodField()
    seller_telegram = serializers.SerializerMethodField()
    chat_room_id = serializers.SerializerMethodField()
    verification_status = serializers.SerializerMethodField()

    class Meta:
        model = EscrowTransaction
        fields = [
            "id", "status", "amount", "commission_amount", "seller_earnings",
            "created_at", "updated_at",
            "listing_title", "listing_game", "listing_price",
            "buyer_email", "buyer_username", "buyer_phone", "buyer_telegram",
            "seller_email", "seller_username", "seller_phone", "seller_telegram",
            "chat_room_id", "verification_status",
        ]

    def get_listing_title(self, obj):
        return obj.listing.title if obj.listing else None

    def get_listing_game(self, obj):
        if obj.listing and obj.listing.game:
            return obj.listing.game.name
        return None

    def get_listing_price(self, obj):
        return str(obj.listing.price) if obj.listing else None

    def get_buyer_email(self, obj):
        return obj.buyer.email if obj.buyer else None

    def get_buyer_username(self, obj):
        return obj.buyer.username if obj.buyer else None

    def get_buyer_phone(self, obj):
        return obj.buyer.phone_number if obj.buyer else None

    def get_buyer_telegram(self, obj):
        return getattr(obj.buyer, "telegram_username", None) if obj.buyer else None

    def get_seller_email(self, obj):
        return obj.seller.email if obj.seller else None

    def get_seller_username(self, obj):
        return obj.seller.username if obj.seller else None

    def get_seller_phone(self, obj):
        return obj.seller.phone_number if obj.seller else None

    def get_seller_telegram(self, obj):
        return getattr(obj.seller, "telegram_username", None) if obj.seller else None

    def get_chat_room_id(self, obj):
        try:
            from apps.messaging.models import ChatRoom
            room = ChatRoom.objects.filter(
                listing=obj.listing, is_active=True,
            ).filter(participants=obj.buyer).filter(participants=obj.seller).first()
            return str(room.id) if room else None
        except Exception:
            return None

    def get_verification_status(self, obj):
        try:
            v = obj.seller_verifications.order_by("-created_at").first()
            return v.status if v else None
        except Exception:
            return None
