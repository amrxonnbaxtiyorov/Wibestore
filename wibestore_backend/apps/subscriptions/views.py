"""
WibeStore Backend - Subscriptions Views
"""

from drf_spectacular.utils import extend_schema
from rest_framework import generics, permissions, status
from rest_framework.response import Response
from rest_framework.views import APIView

from .models import SubscriptionPlan, UserSubscription
from .serializers import (
    PurchaseSubscriptionSerializer,
    SubscriptionPlanSerializer,
    UserSubscriptionSerializer,
)
from .services import SubscriptionService


@extend_schema(tags=["Subscriptions"])
class SubscriptionPlanListView(generics.ListAPIView):
    """GET /api/v1/subscriptions/plans/ — List subscription plans."""

    serializer_class = SubscriptionPlanSerializer
    permission_classes = [permissions.AllowAny]
    queryset = SubscriptionPlan.objects.filter(is_active=True)


@extend_schema(tags=["Subscriptions"])
class PurchaseSubscriptionView(APIView):
    """POST /api/v1/subscriptions/purchase/ — Purchase subscription."""

    permission_classes = [permissions.IsAuthenticated]
    serializer_class = PurchaseSubscriptionSerializer

    def post(self, request):
        serializer = PurchaseSubscriptionSerializer(data=request.data)
        serializer.is_valid(raise_exception=True)

        subscription = SubscriptionService.purchase_subscription(
            user=request.user,
            plan_slug=serializer.validated_data["plan_slug"],
            billing_period=serializer.validated_data["billing_period"],
        )

        return Response(
            {
                "success": True,
                "message": "Subscription purchased successfully!",
                "data": UserSubscriptionSerializer(subscription).data,
            },
            status=status.HTTP_201_CREATED,
        )


@extend_schema(tags=["Subscriptions"])
class MySubscriptionView(generics.RetrieveAPIView):
    """GET /api/v1/subscriptions/my/ — Current user's subscription."""

    serializer_class = UserSubscriptionSerializer
    permission_classes = [permissions.IsAuthenticated]

    def get_object(self):
        return UserSubscription.objects.filter(
            user=self.request.user, status="active"
        ).select_related("plan").first()

    def retrieve(self, request, *args, **kwargs):
        obj = self.get_object()
        if not obj:
            return Response(
                {"success": True, "data": None, "plan": "free"},
                status=status.HTTP_200_OK,
            )
        return Response(
            {"success": True, "data": self.get_serializer(obj).data},
            status=status.HTTP_200_OK,
        )


@extend_schema(tags=["Subscriptions"])
class CancelSubscriptionView(APIView):
    """POST /api/v1/subscriptions/cancel/ — Cancel subscription."""

    permission_classes = [permissions.IsAuthenticated]

    def post(self, request):
        reason = request.data.get("reason", "")
        subscription = SubscriptionService.cancel_subscription(
            user=request.user, reason=reason
        )
        return Response(
            {
                "success": True,
                "message": "Subscription cancelled. You can still use it until the end date.",
                "data": UserSubscriptionSerializer(subscription).data,
            },
            status=status.HTTP_200_OK,
        )
