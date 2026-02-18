"""
WibeStore Backend - Admin Panel Serializers
Serializers for admin dashboard and management API.
"""

from django.contrib.auth import get_user_model
from rest_framework import serializers

from apps.marketplace.models import Listing
from apps.payments.models import EscrowTransaction, Transaction
from apps.reports.models import Report

User = get_user_model()


class AdminDashboardSerializer(serializers.Serializer):
    """Serializer for the admin dashboard statistics."""

    total_users = serializers.IntegerField()
    active_users = serializers.IntegerField()
    total_listings = serializers.IntegerField()
    active_listings = serializers.IntegerField()
    pending_listings = serializers.IntegerField()
    total_transactions = serializers.IntegerField()
    total_revenue = serializers.DecimalField(max_digits=14, decimal_places=2)
    today_new_users = serializers.IntegerField()
    today_new_listings = serializers.IntegerField()
    pending_reports = serializers.IntegerField()
    active_disputes = serializers.IntegerField()


class AdminListingSerializer(serializers.ModelSerializer):
    """Serializer for admin listing management."""

    seller_email = serializers.CharField(source="seller.email", read_only=True)
    seller_username = serializers.CharField(source="seller.username", read_only=True)
    game_name = serializers.CharField(source="game.name", read_only=True)

    class Meta:
        model = Listing
        fields = [
            "id",
            "title",
            "price",
            "status",
            "seller_email",
            "seller_username",
            "game_name",
            "is_premium",
            "views_count",
            "favorites_count",
            "created_at",
            "moderated_by",
            "moderated_at",
            "rejection_reason",
        ]
        read_only_fields = fields


class AdminUserSerializer(serializers.ModelSerializer):
    """Serializer for admin user management."""

    class Meta:
        model = User
        fields = [
            "id",
            "email",
            "username",
            "full_name",
            "phone_number",
            "is_active",
            "is_verified",
            "is_staff",
            "rating",
            "total_sales",
            "total_purchases",
            "balance",
            "created_at",
            "last_login",
            "deleted_at",
        ]
        read_only_fields = fields


class AdminReportSerializer(serializers.ModelSerializer):
    """Serializer for admin report management."""

    reporter_email = serializers.CharField(source="reporter.email", read_only=True)

    class Meta:
        model = Report
        fields = [
            "id",
            "reporter_email",
            "listing",
            "reported_user",
            "reason",
            "description",
            "status",
            "resolved_by",
            "resolution_notes",
            "created_at",
            "resolved_at",
        ]
        read_only_fields = [
            "id",
            "reporter_email",
            "listing",
            "reported_user",
            "reason",
            "description",
            "created_at",
        ]


class AdminEscrowSerializer(serializers.ModelSerializer):
    """Serializer for admin escrow dispute management."""

    buyer_email = serializers.CharField(source="buyer.email", read_only=True)
    seller_email = serializers.CharField(source="seller.email", read_only=True)
    listing_title = serializers.CharField(source="listing.title", read_only=True)

    class Meta:
        model = EscrowTransaction
        fields = [
            "id",
            "listing_title",
            "buyer_email",
            "seller_email",
            "amount",
            "commission_amount",
            "seller_earnings",
            "status",
            "dispute_reason",
            "dispute_resolved_by",
            "dispute_resolution",
            "created_at",
        ]
        read_only_fields = fields
