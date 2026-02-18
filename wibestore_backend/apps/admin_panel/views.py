"""
WibeStore Backend - Admin Panel Views (Dashboard API)
"""

from datetime import timedelta

from django.contrib.auth import get_user_model
from django.db.models import Count, Sum, Q
from django.utils import timezone
from drf_spectacular.utils import extend_schema
from rest_framework import generics, permissions, status
from rest_framework.response import Response
from rest_framework.views import APIView

from apps.marketplace.models import Listing
from apps.marketplace.serializers import ListingSerializer
from apps.marketplace.services import ListingService
from apps.payments.models import EscrowTransaction, Transaction
from apps.payments.services import EscrowService
from apps.reports.models import Report
from apps.reports.serializers import ReportSerializer
from core.permissions import IsAdminUser

User = get_user_model()


@extend_schema(tags=["Admin"])
class AdminDashboardView(APIView):
    """GET /api/v1/admin/dashboard/ — Admin dashboard statistics."""

    permission_classes = [IsAdminUser]

    def get(self, request):
        now = timezone.now()
        thirty_days_ago = now - timedelta(days=30)
        seven_days_ago = now - timedelta(days=7)

        stats = {
            "users": {
                "total": User.objects.filter(is_active=True).count(),
                "new_this_month": User.objects.filter(created_at__gte=thirty_days_ago).count(),
                "new_this_week": User.objects.filter(created_at__gte=seven_days_ago).count(),
                "verified": User.objects.filter(is_verified=True).count(),
            },
            "listings": {
                "total": Listing.objects.count(),
                "active": Listing.objects.filter(status="active").count(),
                "pending": Listing.objects.filter(status="pending").count(),
                "sold": Listing.objects.filter(status="sold").count(),
            },
            "transactions": {
                "total_volume": Transaction.objects.filter(
                    status="completed"
                ).aggregate(total=Sum("amount"))["total"] or 0,
                "month_volume": Transaction.objects.filter(
                    status="completed",
                    created_at__gte=thirty_days_ago,
                ).aggregate(total=Sum("amount"))["total"] or 0,
            },
            "escrow": {
                "active": EscrowTransaction.objects.filter(
                    status__in=["pending_payment", "paid", "delivered"]
                ).count(),
                "disputed": EscrowTransaction.objects.filter(status="disputed").count(),
                "completed": EscrowTransaction.objects.filter(status="confirmed").count(),
                "total_commission": EscrowTransaction.objects.filter(
                    status="confirmed"
                ).aggregate(total=Sum("commission_amount"))["total"] or 0,
            },
            "reports": {
                "pending": Report.objects.filter(status="pending").count(),
                "total": Report.objects.count(),
            },
        }

        return Response({"success": True, "data": stats})


@extend_schema(tags=["Admin"])
class AdminPendingListingsView(generics.ListAPIView):
    """GET /api/v1/admin/listings/pending/ — Pending listings for moderation."""

    serializer_class = ListingSerializer
    permission_classes = [IsAdminUser]

    def get_queryset(self):
        return Listing.objects.filter(status="pending").select_related(
            "game", "seller"
        ).order_by("created_at")


@extend_schema(tags=["Admin"])
class AdminApproveListingView(APIView):
    """POST /api/v1/admin/listings/{id}/approve/ — Approve a listing."""

    permission_classes = [IsAdminUser]

    def post(self, request, pk):
        try:
            listing = Listing.objects.get(pk=pk)
        except Listing.DoesNotExist:
            return Response(
                {"success": False, "error": {"message": "Listing not found."}},
                status=status.HTTP_404_NOT_FOUND,
            )

        ListingService.approve_listing(listing, request.user)
        return Response({"success": True, "message": "Listing approved."})


@extend_schema(tags=["Admin"])
class AdminRejectListingView(APIView):
    """POST /api/v1/admin/listings/{id}/reject/ — Reject a listing."""

    permission_classes = [IsAdminUser]

    def post(self, request, pk):
        try:
            listing = Listing.objects.get(pk=pk)
        except Listing.DoesNotExist:
            return Response(
                {"success": False, "error": {"message": "Listing not found."}},
                status=status.HTTP_404_NOT_FOUND,
            )

        reason = request.data.get("reason", "")
        ListingService.reject_listing(listing, request.user, reason)
        return Response({"success": True, "message": "Listing rejected."})


@extend_schema(tags=["Admin"])
class AdminDisputesView(generics.ListAPIView):
    """GET /api/v1/admin/disputes/ — Active disputes."""

    permission_classes = [IsAdminUser]

    def get_queryset(self):
        from apps.payments.serializers import EscrowTransactionSerializer
        return EscrowTransaction.objects.filter(
            status="disputed"
        ).select_related("listing", "buyer", "seller")

    def get_serializer_class(self):
        from apps.payments.serializers import EscrowTransactionSerializer
        return EscrowTransactionSerializer


@extend_schema(tags=["Admin"])
class AdminResolveDisputeView(APIView):
    """POST /api/v1/admin/disputes/{id}/resolve/ — Resolve a dispute."""

    permission_classes = [IsAdminUser]

    def post(self, request, pk):
        try:
            escrow = EscrowTransaction.objects.get(pk=pk, status="disputed")
        except EscrowTransaction.DoesNotExist:
            return Response(
                {"success": False, "error": {"message": "Dispute not found."}},
                status=status.HTTP_404_NOT_FOUND,
            )

        action = request.data.get("action")  # "release" or "refund"
        resolution = request.data.get("resolution", "")

        if action == "release":
            EscrowService.release_payment(escrow)
        elif action == "refund":
            EscrowService.refund_escrow(escrow, request.user, resolution)
        else:
            return Response(
                {"success": False, "error": {"message": "Invalid action."}},
                status=status.HTTP_400_BAD_REQUEST,
            )

        return Response({"success": True, "message": f"Dispute {action}d."})


@extend_schema(tags=["Admin"])
class AdminReportsView(generics.ListAPIView):
    """GET /api/v1/admin/reports/ — Pending reports."""

    serializer_class = ReportSerializer
    permission_classes = [IsAdminUser]

    def get_queryset(self):
        return Report.objects.filter(status="pending").order_by("created_at")


@extend_schema(tags=["Admin"])
class AdminResolveReportView(APIView):
    """POST /api/v1/admin/reports/{id}/resolve/ — Resolve a report."""

    permission_classes = [IsAdminUser]

    def post(self, request, pk):
        try:
            report = Report.objects.get(pk=pk)
        except Report.DoesNotExist:
            return Response(
                {"success": False, "error": {"message": "Report not found."}},
                status=status.HTTP_404_NOT_FOUND,
            )

        action = request.data.get("action")  # "resolve" or "dismiss"
        note = request.data.get("note", "")

        report.status = "resolved" if action == "resolve" else "dismissed"
        report.resolved_by = request.user
        report.resolution_note = note
        report.resolved_at = timezone.now()
        report.save(
            update_fields=["status", "resolved_by", "resolution_note", "resolved_at"]
        )

        return Response({"success": True, "message": f"Report {report.status}."})


@extend_schema(tags=["Admin"])
class AdminUsersView(generics.ListAPIView):
    """GET /api/v1/admin/users/ — All users."""

    permission_classes = [IsAdminUser]

    def get_queryset(self):
        from apps.accounts.serializers import UserSerializer
        return User.objects.all().order_by("-created_at")

    def get_serializer_class(self):
        from apps.accounts.serializers import UserSerializer
        return UserSerializer


@extend_schema(tags=["Admin"])
class AdminUserBanView(APIView):
    """POST /api/v1/admin/users/{id}/ban/ — Ban/Unban a user."""

    permission_classes = [IsAdminUser]

    def post(self, request, pk):
        try:
            user = User.objects.get(pk=pk)
        except User.DoesNotExist:
            return Response(
                {"success": False, "error": {"message": "User not found."}},
                status=status.HTTP_404_NOT_FOUND,
            )

        action = request.data.get("action")  # "ban" or "unban"
        if action == "ban":
            user.is_active = False
            user.save(update_fields=["is_active"])
            return Response({"success": True, "message": "User banned."})
        elif action == "unban":
            user.is_active = True
            user.save(update_fields=["is_active"])
            return Response({"success": True, "message": "User unbanned."})
        else:
            return Response(
                {"success": False, "error": {"message": "Invalid action."}},
                status=status.HTTP_400_BAD_REQUEST,
            )
