"""
WibeStore Backend - Payments Views
"""

import logging

from drf_spectacular.utils import extend_schema
from rest_framework import generics, permissions, status
from rest_framework.response import Response
from rest_framework.views import APIView

from .models import EscrowTransaction, Transaction
from .serializers import (
    DepositSerializer,
    EscrowTransactionSerializer,
    PurchaseListingSerializer,
    TransactionSerializer,
    WithdrawSerializer,
)
from .services import EscrowService, PaymentService

logger = logging.getLogger("apps.payments")


@extend_schema(tags=["Payments"])
class DepositView(APIView):
    """POST /api/v1/payments/deposit/ — Create deposit."""

    permission_classes = [permissions.IsAuthenticated]
    serializer_class = DepositSerializer

    def post(self, request):
        serializer = DepositSerializer(data=request.data)
        serializer.is_valid(raise_exception=True)

        txn = PaymentService.create_deposit(
            user=request.user,
            amount=serializer.validated_data["amount"],
            payment_method_code=serializer.validated_data["payment_method"],
        )

        return Response(
            {
                "success": True,
                "message": "Deposit created. Awaiting payment.",
                "data": TransactionSerializer(txn).data,
            },
            status=status.HTTP_201_CREATED,
        )


@extend_schema(tags=["Payments"])
class WithdrawView(APIView):
    """POST /api/v1/payments/withdraw/ — Create withdrawal."""

    permission_classes = [permissions.IsAuthenticated]
    serializer_class = WithdrawSerializer

    def post(self, request):
        serializer = WithdrawSerializer(data=request.data)
        serializer.is_valid(raise_exception=True)

        txn = PaymentService.create_withdrawal(
            user=request.user,
            amount=serializer.validated_data["amount"],
            payment_method_code=serializer.validated_data["payment_method"],
        )

        return Response(
            {
                "success": True,
                "message": "Withdrawal request created.",
                "data": TransactionSerializer(txn).data,
            },
            status=status.HTTP_201_CREATED,
        )


@extend_schema(tags=["Payments"])
class TransactionListView(generics.ListAPIView):
    """GET /api/v1/payments/transactions/ — Transaction history."""

    serializer_class = TransactionSerializer
    permission_classes = [permissions.IsAuthenticated]

    def get_queryset(self):
        return Transaction.objects.filter(user=self.request.user).select_related(
            "payment_method"
        )


@extend_schema(tags=["Payments"])
class TransactionDetailView(generics.RetrieveAPIView):
    """GET /api/v1/payments/transactions/{id}/ — Transaction detail."""

    serializer_class = TransactionSerializer
    permission_classes = [permissions.IsAuthenticated]

    def get_queryset(self):
        return Transaction.objects.filter(user=self.request.user)


@extend_schema(tags=["Payments"])
class PurchaseListingView(APIView):
    """POST /api/v1/payments/purchase/ — Purchase a listing via escrow."""

    permission_classes = [permissions.IsAuthenticated]
    serializer_class = PurchaseListingSerializer

    def post(self, request):
        serializer = PurchaseListingSerializer(data=request.data)
        serializer.is_valid(raise_exception=True)

        from apps.marketplace.models import Listing

        try:
            listing = Listing.objects.get(
                id=serializer.validated_data["listing_id"], status="active"
            )
        except Listing.DoesNotExist:
            return Response(
                {"success": False, "error": {"message": "Listing not found."}},
                status=status.HTTP_404_NOT_FOUND,
            )

        escrow = EscrowService.create_escrow(buyer=request.user, listing=listing)

        return Response(
            {
                "success": True,
                "message": "Purchase created. Payment held in escrow.",
                "data": EscrowTransactionSerializer(escrow).data,
            },
            status=status.HTTP_201_CREATED,
        )


@extend_schema(tags=["Payments"])
class WebhookView(APIView):
    """POST /api/v1/payments/webhooks/{provider}/ — Handle payment webhook."""

    permission_classes = [permissions.AllowAny]

    def post(self, request, provider):
        from .webhooks import process_webhook

        try:
            result = process_webhook(provider, request.data)
            return Response(result, status=status.HTTP_200_OK)
        except Exception as e:
            logger.error("Webhook error for %s: %s", provider, e)
            return Response(
                {"error": str(e)}, status=status.HTTP_400_BAD_REQUEST
            )


@extend_schema(tags=["Payments"])
class EscrowConfirmDeliveryView(APIView):
    """POST /api/v1/payments/escrow/{id}/confirm/ — Buyer confirms delivery."""

    permission_classes = [permissions.IsAuthenticated]

    def post(self, request, pk):
        try:
            escrow = EscrowTransaction.objects.get(pk=pk, buyer=request.user)
        except EscrowTransaction.DoesNotExist:
            return Response(
                {"success": False, "error": {"message": "Escrow transaction not found."}},
                status=status.HTTP_404_NOT_FOUND,
            )

        escrow = EscrowService.confirm_delivery(escrow, request.user)
        return Response(
            {
                "success": True,
                "message": "Delivery confirmed. Payment will be released to seller.",
                "data": EscrowTransactionSerializer(escrow).data,
            },
            status=status.HTTP_200_OK,
        )


@extend_schema(tags=["Payments"])
class EscrowDisputeView(APIView):
    """POST /api/v1/payments/escrow/{id}/dispute/ — Buyer opens dispute."""

    permission_classes = [permissions.IsAuthenticated]

    def post(self, request, pk):
        try:
            escrow = EscrowTransaction.objects.get(pk=pk, buyer=request.user)
        except EscrowTransaction.DoesNotExist:
            return Response(
                {"success": False, "error": {"message": "Escrow transaction not found."}},
                status=status.HTTP_404_NOT_FOUND,
            )

        reason = request.data.get("reason", "")
        if not reason:
            return Response(
                {"success": False, "error": {"message": "Dispute reason is required."}},
                status=status.HTTP_400_BAD_REQUEST,
            )

        escrow = EscrowService.open_dispute(escrow, request.user, reason)
        return Response(
            {
                "success": True,
                "message": "Dispute opened. Our team will review it.",
                "data": EscrowTransactionSerializer(escrow).data,
            },
            status=status.HTTP_200_OK,
        )


@extend_schema(tags=["Payments"])
class PaymentMethodsListView(generics.ListAPIView):
    """GET /api/v1/payments/methods/ — List available payment methods."""

    from .serializers import PaymentMethodSerializer

    serializer_class = PaymentMethodSerializer
    permission_classes = [permissions.AllowAny]

    def get_queryset(self):
        from .models import PaymentMethod

        return PaymentMethod.objects.filter(is_active=True)


@extend_schema(tags=["Payments"])
class BalanceView(APIView):
    """GET /api/v1/payments/balance/ — Get current user balance."""

    permission_classes = [permissions.IsAuthenticated]

    def get(self, request):
        return Response(
            {
                "success": True,
                "data": {
                    "balance": str(request.user.balance),
                    "currency": "UZS",
                },
            },
            status=status.HTTP_200_OK,
        )

