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
