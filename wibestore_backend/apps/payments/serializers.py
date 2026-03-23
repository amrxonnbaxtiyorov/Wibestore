"""
WibeStore Backend - Payments Serializers
"""

from rest_framework import serializers

from .models import EscrowTransaction, PaymentMethod, Transaction, WithdrawalRequest


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
            # Ikki tomonlama tasdiqlash/bekor qilish
            "seller_confirmed",
            "seller_confirmed_at_trade",
            "seller_cancelled",
            "seller_cancelled_at",
            "seller_cancel_reason",
            "buyer_confirmed",
            "buyer_confirmed_at_trade",
            "buyer_cancelled",
            "buyer_cancelled_at",
            "buyer_cancel_reason",
            "created_at",
            "updated_at",
        ]
        read_only_fields = [
            "id", "commission_amount", "seller_earnings",
            "buyer_confirmed_at", "seller_paid_at", "admin_released_at",
            "seller_confirmed", "seller_confirmed_at_trade",
            "seller_cancelled", "seller_cancelled_at",
            "buyer_confirmed", "buyer_confirmed_at_trade",
            "buyer_cancelled", "buyer_cancelled_at",
            "created_at", "updated_at",
        ]


class TradeStatusSerializer(serializers.Serializer):
    """Savdo holatini ko'rsatish uchun serializer."""

    escrow_id = serializers.UUIDField(source="id")
    status = serializers.CharField()
    seller_confirmed = serializers.BooleanField()
    buyer_confirmed = serializers.BooleanField()
    seller_cancelled = serializers.BooleanField()
    buyer_cancelled = serializers.BooleanField()
    both_confirmed = serializers.SerializerMethodField()
    both_cancelled = serializers.SerializerMethodField()
    waiting_for = serializers.SerializerMethodField()

    def get_both_confirmed(self, obj):
        return obj.seller_confirmed and obj.buyer_confirmed

    def get_both_cancelled(self, obj):
        return obj.seller_cancelled and obj.buyer_cancelled

    def get_waiting_for(self, obj):
        if obj.seller_confirmed and obj.buyer_confirmed:
            return "none"
        if obj.seller_cancelled and obj.buyer_cancelled:
            return "none"
        if not obj.seller_confirmed and not obj.buyer_confirmed:
            return "both"
        if not obj.seller_confirmed:
            return "seller"
        return "buyer"


class WithdrawalRequestSerializer(serializers.ModelSerializer):
    """Pul yechish so'rovi serializer."""

    class Meta:
        model = WithdrawalRequest
        fields = [
            "id", "amount", "currency", "card_number", "card_holder_name",
            "card_type", "status", "admin_note", "rejection_reason",
            "created_at", "updated_at",
        ]
        read_only_fields = [
            "id", "status", "admin_note", "rejection_reason",
            "created_at", "updated_at",
        ]


class CreateWithdrawalSerializer(serializers.Serializer):
    """Pul yechish so'rovi yaratish uchun serializer."""

    amount = serializers.DecimalField(max_digits=12, decimal_places=2, min_value=10000)
    card_number = serializers.CharField(max_length=20)
    card_holder_name = serializers.CharField(max_length=200)
    card_type = serializers.ChoiceField(choices=["humo", "uzcard", "visa", "mastercard"])


class PurchaseListingSerializer(serializers.Serializer):
    """Serializer for purchasing a listing via escrow."""

    listing_id = serializers.UUIDField()
    payment_method = serializers.CharField(required=False, default="balance")
