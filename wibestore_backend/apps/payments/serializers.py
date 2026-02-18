"""
WibeStore Backend - Payments Serializers
"""

from rest_framework import serializers

from .models import EscrowTransaction, PaymentMethod, Transaction


class PaymentMethodSerializer(serializers.ModelSerializer):
    class Meta:
        model = PaymentMethod
        fields = ["id", "name", "code", "icon", "is_active"]


class TransactionSerializer(serializers.ModelSerializer):
    payment_method = PaymentMethodSerializer(read_only=True)

    class Meta:
        model = Transaction
        fields = [
            "id",
            "amount",
            "currency",
            "type",
            "status",
            "payment_method",
            "provider_transaction_id",
            "description",
            "metadata",
            "processed_at",
            "failed_at",
            "created_at",
        ]
        read_only_fields = [
            "id", "status", "provider_transaction_id",
            "processed_at", "failed_at", "created_at",
        ]


class DepositSerializer(serializers.Serializer):
    """Serializer for deposit request."""

    amount = serializers.DecimalField(max_digits=15, decimal_places=2, min_value=1000)
    payment_method = serializers.CharField()


class WithdrawSerializer(serializers.Serializer):
    """Serializer for withdrawal request."""

    amount = serializers.DecimalField(max_digits=15, decimal_places=2, min_value=10000)
    payment_method = serializers.CharField()


class EscrowTransactionSerializer(serializers.ModelSerializer):
    """Serializer for escrow transactions."""

    listing_title = serializers.CharField(source="listing.title", read_only=True)
    buyer_name = serializers.CharField(source="buyer.display_name", read_only=True)
    seller_name = serializers.CharField(source="seller.display_name", read_only=True)

    class Meta:
        model = EscrowTransaction
        fields = [
            "id",
            "listing",
            "listing_title",
            "buyer",
            "buyer_name",
            "seller",
            "seller_name",
            "amount",
            "commission_amount",
            "seller_earnings",
            "status",
            "buyer_confirmed_at",
            "seller_paid_at",
            "admin_released_at",
            "dispute_reason",
            "dispute_resolution",
            "created_at",
            "updated_at",
        ]
        read_only_fields = [
            "id", "commission_amount", "seller_earnings",
            "buyer_confirmed_at", "seller_paid_at", "admin_released_at",
            "created_at", "updated_at",
        ]


class PurchaseListingSerializer(serializers.Serializer):
    """Serializer for purchasing a listing via escrow."""

    listing_id = serializers.UUIDField()
    payment_method = serializers.CharField(required=False, default="balance")
