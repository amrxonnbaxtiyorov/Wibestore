"""
WibeStore Backend - Subscriptions Serializers
"""

from rest_framework import serializers

from .models import SubscriptionPlan, UserSubscription


class SubscriptionPlanSerializer(serializers.ModelSerializer):
    class Meta:
        model = SubscriptionPlan
        fields = [
            "id",
            "name",
            "slug",
            "price_monthly",
            "price_yearly",
            "commission_rate",
            "features",
            "is_premium",
            "is_pro",
            "sort_order",
        ]


class UserSubscriptionSerializer(serializers.ModelSerializer):
    plan = SubscriptionPlanSerializer(read_only=True)
    is_expired = serializers.BooleanField(read_only=True)

    class Meta:
        model = UserSubscription
        fields = [
            "id",
            "plan",
            "status",
            "start_date",
            "end_date",
            "auto_renew",
            "is_expired",
            "cancelled_at",
            "created_at",
        ]


class PurchaseSubscriptionSerializer(serializers.Serializer):
    plan_slug = serializers.SlugField()
    billing_period = serializers.ChoiceField(choices=["monthly", "yearly"], default="monthly")
