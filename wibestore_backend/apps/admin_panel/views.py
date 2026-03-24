"""
WibeStore Backend - Admin Panel Views (Dashboard API)
"""

import logging
from datetime import timedelta

from django.contrib.auth import get_user_model
from django.db import models
from django.db.models import Count, Sum, Q
from django.utils import timezone
from drf_spectacular.utils import extend_schema
from rest_framework import generics, permissions, status
from rest_framework.response import Response
from rest_framework.views import APIView

from apps.marketplace.models import Listing
from apps.marketplace.serializers import ListingSerializer
from apps.marketplace.services import ListingService
from apps.payments.models import EscrowTransaction, Transaction, WithdrawalRequest
from apps.payments.serializers import WithdrawalRequestSerializer
from apps.payments.services import EscrowService, WithdrawalService
from apps.reports.models import Report, SuspiciousActivity
from apps.reports.serializers import ReportSerializer
from core.permissions import IsAdminUser
from .serializers import (
    TelegramBotStatSerializer,
    AdminDepositRequestSerializer,
    AdminSellerVerificationSerializer,
    AdminTradeSerializer,
)

User = get_user_model()
logger = logging.getLogger("apps.admin_panel")


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
class AdminFraudStatsView(APIView):
    """GET /api/v1/admin-panel/stats/fraud/ — Fraud & dispute statistics."""

    permission_classes = [IsAdminUser]

    def get(self, request):
        now = timezone.now()
        seven_days_ago = now - timedelta(days=7)
        suspicious_unresolved = SuspiciousActivity.objects.filter(resolved=False).count()
        suspicious_resolved_week = SuspiciousActivity.objects.filter(
            resolved=True, resolved_at__gte=seven_days_ago
        ).count()
        disputed = EscrowTransaction.objects.filter(status="disputed").count()
        reports_pending = Report.objects.filter(status="pending").count()
        return Response({
            "success": True,
            "data": {
                "suspicious_activities_unresolved": suspicious_unresolved,
                "suspicious_resolved_this_week": suspicious_resolved_week,
                "escrow_disputed": disputed,
                "reports_pending": reports_pending,
            },
        })


@extend_schema(tags=["Admin"])
class AdminPendingListingsView(generics.ListAPIView):
    """GET /api/v1/admin-panel/listings/pending/ — Pending listings for moderation."""

    serializer_class = ListingSerializer
    permission_classes = [IsAdminUser]

    def get_queryset(self):
        return Listing.objects.filter(status="pending").select_related(
            "game", "seller"
        ).prefetch_related("images").order_by("created_at")


@extend_schema(tags=["Admin"])
class AdminAllListingsView(generics.ListAPIView):
    """GET /api/v1/admin-panel/listings/ — All listings with optional status filter."""

    serializer_class = ListingSerializer
    permission_classes = [IsAdminUser]

    def get_queryset(self):
        qs = Listing.objects.filter(deleted_at__isnull=True).select_related(
            "game", "seller"
        ).prefetch_related("images").order_by("-created_at")
        status_filter = self.request.query_params.get("status", "").strip().lower()
        if status_filter and status_filter != "all":
            qs = qs.filter(status=status_filter)
        return qs


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
class AdminDeleteListingView(APIView):
    """DELETE /api/v1/admin-panel/listings/{id}/ — Admin delete (soft) a listing."""

    permission_classes = [IsAdminUser]

    def delete(self, request, pk):
        try:
            listing = Listing.objects.get(pk=pk, deleted_at__isnull=True)
        except Listing.DoesNotExist:
            return Response(
                {"success": False, "error": {"message": "Listing not found."}},
                status=status.HTTP_404_NOT_FOUND,
            )
        listing.soft_delete()
        return Response({"success": True, "message": "Listing deleted."})


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


@extend_schema(tags=["Admin"])
class AdminGrantSubscriptionView(APIView):
    """POST /api/v1/admin-panel/users/{id}/subscription/ — Grant or revoke subscription."""

    permission_classes = [IsAdminUser]

    def post(self, request, pk):
        try:
            user = User.objects.get(pk=pk)
        except User.DoesNotExist:
            return Response(
                {"success": False, "error": {"message": "User not found."}},
                status=status.HTTP_404_NOT_FOUND,
            )

        plan_slug = request.data.get("plan_slug", "").strip().lower()
        months = int(request.data.get("months", 1))

        if plan_slug == "free":
            # Revoke: cancel active subscription
            from apps.subscriptions.models import UserSubscription
            cancelled = UserSubscription.objects.filter(
                user=user, status="active"
            ).update(status="cancelled", cancelled_at=timezone.now())
            if cancelled:
                from apps.subscriptions.services import SubscriptionService
                SubscriptionService._sync_seller_listings_premium(user)
            return Response({
                "success": True,
                "message": f"Subscription revoked for {user.email}.",
                "plan": "free",
            })

        if plan_slug not in ("premium", "pro"):
            return Response(
                {"success": False, "error": {"message": "Invalid plan. Use: premium, pro, or free."}},
                status=status.HTTP_400_BAD_REQUEST,
            )

        try:
            from apps.subscriptions.services import SubscriptionService
            subscription = SubscriptionService.grant_subscription(user, plan_slug, months)
            return Response({
                "success": True,
                "message": f"{plan_slug.capitalize()} granted to {user.email} for {months} month(s).",
                "plan": plan_slug,
            })
        except Exception as e:
            return Response(
                {"success": False, "error": {"message": str(e)}},
                status=status.HTTP_400_BAD_REQUEST,
            )


@extend_schema(tags=["Admin"])
class AdminTransactionsView(generics.ListAPIView):
    """GET /api/v1/admin-panel/transactions/ — All transactions."""

    permission_classes = [IsAdminUser]

    def get_queryset(self):
        return Transaction.objects.all().select_related("user").order_by("-created_at")

    def get_serializer_class(self):
        from .serializers import AdminTransactionSerializer
        return AdminTransactionSerializer


# ============= BLOCK 1: Telegram Bot Analytics =============

class AdminTelegramStatsView(APIView):
    """GET /api/v1/admin-panel/telegram/stats/"""
    permission_classes = [IsAdminUser]

    def get(self, request):
        from django.utils import timezone
        from datetime import timedelta
        from apps.accounts.models import TelegramBotStat
        today = timezone.now().date()
        week_ago = today - timedelta(days=7)
        month_ago = today - timedelta(days=30)
        qs = TelegramBotStat.objects.all()
        data = {
            "total_bot_users": qs.count(),
            "active_today": qs.filter(last_interaction_at__date=today).count(),
            "blocked_users": qs.filter(is_blocked=True).count(),
            "registered_users": qs.filter(registration_completed=True).count(),
            "pending_registration": qs.filter(registration_completed=False).count(),
            "new_today": qs.filter(first_interaction_at__date=today).count(),
            "new_this_week": qs.filter(first_interaction_at__date__gte=week_ago).count(),
            "new_this_month": qs.filter(first_interaction_at__date__gte=month_ago).count(),
        }
        return Response(data)


class AdminTelegramUsersView(generics.ListAPIView):
    """GET /api/v1/admin-panel/telegram/users/"""
    permission_classes = [IsAdminUser]
    serializer_class = TelegramBotStatSerializer

    def get_queryset(self):
        from apps.accounts.models import TelegramBotStat
        qs = TelegramBotStat.objects.select_related("user").all()
        search = self.request.query_params.get("search", "")
        status_filter = self.request.query_params.get("status", "all")
        date_from = self.request.query_params.get("date_from", "")
        date_to = self.request.query_params.get("date_to", "")
        if search:
            qs = qs.filter(
                models.Q(telegram_username__icontains=search) |
                models.Q(telegram_first_name__icontains=search) |
                models.Q(telegram_last_name__icontains=search) |
                models.Q(telegram_id__icontains=search)
            )
        if status_filter == "active":
            qs = qs.filter(is_blocked=False)
        elif status_filter == "blocked":
            qs = qs.filter(is_blocked=True)
        elif status_filter == "registered":
            qs = qs.filter(registration_completed=True)
        if date_from:
            qs = qs.filter(first_interaction_at__date__gte=date_from)
        if date_to:
            qs = qs.filter(first_interaction_at__date__lte=date_to)
        return qs


class AdminTelegramUserDetailView(generics.RetrieveUpdateAPIView):
    """GET/PATCH /api/v1/admin-panel/telegram/users/<telegram_id>/"""
    permission_classes = [IsAdminUser]
    serializer_class = TelegramBotStatSerializer
    lookup_field = "telegram_id"

    def get_queryset(self):
        from apps.accounts.models import TelegramBotStat
        return TelegramBotStat.objects.select_related("user").all()


class AdminTelegramRegistrationsByDateView(APIView):
    """GET /api/v1/admin-panel/telegram/registrations/by-date/"""
    permission_classes = [IsAdminUser]

    def get(self, request):
        from apps.accounts.models import TelegramBotStat
        from django.db.models.functions import TruncDate
        from django.db.models import Count
        date_from = request.query_params.get("date_from", "")
        date_to = request.query_params.get("date_to", "")
        qs = TelegramBotStat.objects.filter(registration_completed=True)
        if date_from:
            qs = qs.filter(registration_date__date__gte=date_from)
        if date_to:
            qs = qs.filter(registration_date__date__lte=date_to)
        data = (
            qs.annotate(date=TruncDate("registration_date"))
            .values("date")
            .annotate(count=Count("id"))
            .order_by("date")
        )
        return Response([{"date": str(r["date"]), "count": r["count"]} for r in data])


# ============= BLOCK 2: Deposit Management =============

class AdminDepositsView(generics.ListAPIView):
    """GET /api/v1/admin-panel/deposits/"""
    permission_classes = [IsAdminUser]
    serializer_class = AdminDepositRequestSerializer

    def get_queryset(self):
        from apps.payments.models import DepositRequest
        qs = DepositRequest.objects.select_related("user", "reviewed_by").all()
        status_filter = self.request.query_params.get("status", "all")
        search = self.request.query_params.get("search", "")
        date_from = self.request.query_params.get("date_from", "")
        date_to = self.request.query_params.get("date_to", "")
        if status_filter != "all":
            qs = qs.filter(status=status_filter)
        if search:
            qs = qs.filter(
                models.Q(telegram_username__icontains=search) |
                models.Q(telegram_id__icontains=search) |
                models.Q(user__email__icontains=search)
            )
        if date_from:
            qs = qs.filter(sent_at__date__gte=date_from)
        if date_to:
            qs = qs.filter(sent_at__date__lte=date_to)
        return qs.order_by("-sent_at")


class AdminDepositDetailView(generics.RetrieveUpdateAPIView):
    """GET/PATCH /api/v1/admin-panel/deposits/<uuid>/"""
    permission_classes = [IsAdminUser]
    serializer_class = AdminDepositRequestSerializer

    def get_queryset(self):
        from apps.payments.models import DepositRequest
        return DepositRequest.objects.select_related("user", "reviewed_by").all()

    def perform_update(self, serializer):
        from django.utils import timezone
        serializer.save(reviewed_by=self.request.user, reviewed_at=timezone.now())


class AdminDepositStatsView(APIView):
    """GET /api/v1/admin-panel/deposits/stats/"""
    permission_classes = [IsAdminUser]

    def get(self, request):
        from django.utils import timezone
        from django.db.models import Sum
        from apps.payments.models import DepositRequest
        today = timezone.now().date()
        qs = DepositRequest.objects.all()
        pending = qs.filter(status="pending")
        approved_today = qs.filter(status="approved", reviewed_at__date=today)
        rejected_today = qs.filter(status="rejected", reviewed_at__date=today)
        data = {
            "pending_count": pending.count(),
            "pending_total_amount": pending.aggregate(t=Sum("amount"))["t"] or 0,
            "approved_today_count": approved_today.count(),
            "approved_today_total": approved_today.aggregate(t=Sum("amount"))["t"] or 0,
            "rejected_today_count": rejected_today.count(),
        }
        return Response(data)


# ============= BLOCK 4: Seller Verifications =============

class AdminSellerVerificationsView(generics.ListAPIView):
    """GET /api/v1/admin-panel/seller-verifications/"""
    permission_classes = [IsAdminUser]
    serializer_class = AdminSellerVerificationSerializer

    def get_queryset(self):
        from apps.payments.models import SellerVerification
        qs = SellerVerification.objects.select_related(
            "seller", "escrow", "escrow__listing", "escrow__listing__game"
        ).all()
        status_filter = self.request.query_params.get("status", "")
        if status_filter:
            qs = qs.filter(status=status_filter)
        return qs.order_by("-created_at")


class AdminSellerVerificationDetailView(generics.RetrieveAPIView):
    """GET /api/v1/admin-panel/seller-verifications/<uuid>/"""
    permission_classes = [IsAdminUser]
    serializer_class = AdminSellerVerificationSerializer

    def get_queryset(self):
        from apps.payments.models import SellerVerification
        return SellerVerification.objects.select_related(
            "seller", "escrow", "escrow__listing", "escrow__listing__game"
        ).all()


class AdminApproveSellerVerificationView(APIView):
    """POST /api/v1/admin-panel/seller-verifications/<uuid>/approve/"""
    permission_classes = [IsAdminUser]

    def post(self, request, pk):
        from apps.payments.models import SellerVerification, EscrowTransaction
        from django.utils import timezone
        try:
            verification = SellerVerification.objects.select_related(
                "seller", "escrow"
            ).get(pk=pk)
        except SellerVerification.DoesNotExist:
            return Response({"error": "Not found"}, status=404)

        if verification.status != "submitted":
            return Response({"error": "Verification is not in submitted state"}, status=400)

        verification.status = "approved"
        verification.admin_note = request.data.get("note", "")
        verification.reviewed_by = request.user
        verification.reviewed_at = timezone.now()
        verification.save()

        # Credit seller earnings
        escrow = verification.escrow
        if escrow and escrow.seller_earnings:
            seller = escrow.seller
            seller.balance = (seller.balance or 0) + escrow.seller_earnings
            seller.save(update_fields=["balance"])

            # Create transaction record
            try:
                from apps.payments.models import Transaction
                Transaction.objects.create(
                    user=seller,
                    type="purchase",
                    status="completed",
                    amount=escrow.seller_earnings,
                    description=f"Savdo #{str(escrow.id)[:8]} uchun to'lov",
                )
            except Exception as e:
                logger.warning("Could not create transaction: %s", e)

        # Telegram notification
        try:
            from apps.payments.telegram_notify import notify_verification_approved
            notify_verification_approved(escrow, verification)
        except Exception as e:
            logger.warning("Telegram notify_verification_approved failed: %s", e)

        # Log admin action
        _log_admin_action(request, "approve_verification", "SellerVerification", str(pk))

        return Response({"success": True, "message": "Verification approved"})


class AdminRejectSellerVerificationView(APIView):
    """POST /api/v1/admin-panel/seller-verifications/<uuid>/reject/"""
    permission_classes = [IsAdminUser]

    def post(self, request, pk):
        from apps.payments.models import SellerVerification
        from django.utils import timezone
        try:
            verification = SellerVerification.objects.select_related(
                "seller", "escrow"
            ).get(pk=pk)
        except SellerVerification.DoesNotExist:
            return Response({"error": "Not found"}, status=404)

        reason = request.data.get("reason", "")
        verification.status = "rejected"
        verification.admin_note = reason
        verification.reviewed_by = request.user
        verification.reviewed_at = timezone.now()
        verification.save()

        # Telegram notification
        try:
            from apps.payments.telegram_notify import notify_verification_rejected
            notify_verification_rejected(verification)
        except Exception as e:
            logger.warning("Telegram notify_verification_rejected failed: %s", e)

        _log_admin_action(request, "reject_verification", "SellerVerification", str(pk), {"reason": reason})
        return Response({"success": True, "message": "Verification rejected"})


# ============= BLOCK 5: Trade Management =============

class AdminTradesView(generics.ListAPIView):
    """GET /api/v1/admin-panel/trades/"""
    permission_classes = [IsAdminUser]
    serializer_class = AdminTradeSerializer

    def get_queryset(self):
        from apps.payments.models import EscrowTransaction
        qs = EscrowTransaction.objects.select_related(
            "listing", "listing__game", "buyer", "seller"
        ).all()
        status_filter = self.request.query_params.get("status", "all")
        search = self.request.query_params.get("search", "")
        if status_filter != "all":
            qs = qs.filter(status=status_filter)
        if search:
            qs = qs.filter(
                models.Q(listing__title__icontains=search) |
                models.Q(buyer__email__icontains=search) |
                models.Q(seller__email__icontains=search)
            )
        return qs.order_by("-created_at")


class AdminTradeDetailView(generics.RetrieveAPIView):
    """GET /api/v1/admin-panel/trades/<uuid>/"""
    permission_classes = [IsAdminUser]
    serializer_class = AdminTradeSerializer

    def get_queryset(self):
        from apps.payments.models import EscrowTransaction
        return EscrowTransaction.objects.select_related(
            "listing", "listing__game", "buyer", "seller"
        ).all()


class AdminTradeCompleteView(APIView):
    """POST /api/v1/admin-panel/trades/<uuid>/complete/"""
    permission_classes = [IsAdminUser]

    def post(self, request, pk):
        from apps.payments.models import EscrowTransaction
        try:
            escrow = EscrowTransaction.objects.select_related("buyer", "seller", "listing").get(pk=pk)
        except EscrowTransaction.DoesNotExist:
            return Response({"error": "Not found"}, status=404)

        if escrow.status not in ("paid", "delivered", "disputed"):
            return Response({"error": "Cannot complete trade in current status"}, status=400)

        try:
            from apps.payments.services import EscrowService
            # Force-approve verification if not yet done, then release payment
            from apps.payments.models import SellerVerification
            verif = SellerVerification.objects.filter(escrow=escrow).order_by("-created_at").first()
            if not verif or verif.status != SellerVerification.STATUS_APPROVED:
                if not verif:
                    verif = SellerVerification.objects.create(
                        escrow=escrow, seller=escrow.seller,
                        status=SellerVerification.STATUS_APPROVED,
                        reviewed_by=request.user,
                    )
                else:
                    from django.utils import timezone as _tz
                    verif.status = SellerVerification.STATUS_APPROVED
                    verif.reviewed_by = request.user
                    verif.reviewed_at = _tz.now()
                    verif.save(update_fields=["status", "reviewed_by", "reviewed_at"])
            EscrowService.release_payment(escrow)
        except Exception as e:
            return Response({"error": str(e)}, status=400)

        _log_admin_action(request, "complete_trade", "EscrowTransaction", str(pk))
        return Response({"success": True, "message": "Trade completed"})


class AdminTradeRefundView(APIView):
    """POST /api/v1/admin-panel/trades/<uuid>/refund/"""
    permission_classes = [IsAdminUser]

    def post(self, request, pk):
        from apps.payments.models import EscrowTransaction
        try:
            escrow = EscrowTransaction.objects.select_related("buyer", "seller", "listing").get(pk=pk)
        except EscrowTransaction.DoesNotExist:
            return Response({"error": "Not found"}, status=404)

        if escrow.status not in ("paid", "delivered", "disputed"):
            return Response({"error": "Cannot refund trade in current status"}, status=400)

        try:
            from apps.payments.services import EscrowService
            # Mark as disputed first if not already, so refund_escrow accepts it
            if escrow.status != "disputed":
                escrow.status = "disputed"
                escrow.dispute_reason = "Admin forced refund"
                escrow.save(update_fields=["status", "dispute_reason"])
            EscrowService.refund_escrow(escrow, request.user, "Admin forced refund")
        except Exception as e:
            return Response({"error": str(e)}, status=400)

        _log_admin_action(request, "refund_trade", "EscrowTransaction", str(pk))
        return Response({"success": True, "message": "Trade refunded"})


class AdminTradeResolveDisputeView(APIView):
    """POST /api/v1/admin-panel/trades/<uuid>/resolve-dispute/"""
    permission_classes = [IsAdminUser]

    def post(self, request, pk):
        from apps.payments.models import EscrowTransaction
        try:
            escrow = EscrowTransaction.objects.select_related("buyer", "seller", "listing").get(pk=pk)
        except EscrowTransaction.DoesNotExist:
            return Response({"error": "Not found"}, status=404)

        winner = request.data.get("winner", "")
        note = request.data.get("note", "")

        if winner not in ("buyer", "seller"):
            return Response({"error": "winner must be buyer or seller"}, status=400)

        if escrow.status != "disputed":
            return Response({"error": "Trade is not in disputed status"}, status=400)

        try:
            from apps.payments.services import EscrowService
            if winner == "seller":
                from apps.payments.models import SellerVerification
                verif = SellerVerification.objects.filter(escrow=escrow).order_by("-created_at").first()
                if not verif or verif.status != SellerVerification.STATUS_APPROVED:
                    if not verif:
                        verif = SellerVerification.objects.create(
                            escrow=escrow, seller=escrow.seller,
                            status=SellerVerification.STATUS_APPROVED,
                            reviewed_by=request.user,
                        )
                    else:
                        from django.utils import timezone as _tz
                        verif.status = SellerVerification.STATUS_APPROVED
                        verif.reviewed_by = request.user
                        verif.reviewed_at = _tz.now()
                        verif.save(update_fields=["status", "reviewed_by", "reviewed_at"])
                EscrowService.release_payment(escrow)
            else:
                EscrowService.refund_escrow(escrow, request.user, note or "Admin resolved dispute in favor of buyer")
        except Exception as e:
            return Response({"error": str(e)}, status=400)

        _log_admin_action(request, "resolve_dispute", "EscrowTransaction", str(pk), {"winner": winner, "note": note})
        return Response({"success": True, "message": f"Dispute resolved in favor of {winner}"})


class AdminTradeStatsView(APIView):
    """GET /api/v1/admin-panel/trades/stats/"""
    permission_classes = [IsAdminUser]

    def get(self, request):
        from django.utils import timezone
        from django.db.models import Sum, Avg
        from apps.payments.models import EscrowTransaction
        today = timezone.now().date()
        qs = EscrowTransaction.objects.all()
        data = {
            "active_trades": qs.filter(status__in=["paid", "delivered"]).count(),
            "pending_delivery": qs.filter(status="paid").count(),
            "disputed": qs.filter(status="disputed").count(),
            "completed_today": qs.filter(status="confirmed", updated_at__date=today).count(),
            "total_volume_today": qs.filter(
                status="confirmed", updated_at__date=today
            ).aggregate(t=Sum("amount"))["t"] or 0,
        }
        return Response(data)


def _log_admin_action(request, action_type: str, target_type: str, target_id: str, details: dict = None):
    """Helper to log admin actions."""
    try:
        from .models import AdminAction
        ip = request.META.get("REMOTE_ADDR", "")
        AdminAction.objects.create(
            admin=request.user,
            action_type=action_type,
            target_type=target_type,
            target_id=target_id,
            details=details or {},
            ip_address=ip or None,
        )
    except Exception as e:
        logger.warning("Could not log admin action: %s", e)


# ── Withdrawal Admin Views (BLOK 5 / BLOK 10) ──


@extend_schema(tags=["Admin - Withdrawals"])
class AdminWithdrawalsView(generics.ListAPIView):
    """GET /api/v1/admin-panel/withdrawals/ — Barcha pul yechish so'rovlari."""

    serializer_class = WithdrawalRequestSerializer
    permission_classes = [IsAdminUser]

    def get_queryset(self):
        qs = WithdrawalRequest.objects.select_related("user", "reviewed_by").all()
        status_filter = self.request.query_params.get("status")
        if status_filter:
            qs = qs.filter(status=status_filter)
        search = self.request.query_params.get("search")
        if search:
            qs = qs.filter(
                Q(user__email__icontains=search)
                | Q(user__username__icontains=search)
                | Q(card_number__icontains=search)
            )
        date_from = self.request.query_params.get("date_from")
        if date_from:
            qs = qs.filter(created_at__date__gte=date_from)
        date_to = self.request.query_params.get("date_to")
        if date_to:
            qs = qs.filter(created_at__date__lte=date_to)
        return qs


@extend_schema(tags=["Admin - Withdrawals"])
class AdminWithdrawalApproveView(APIView):
    """POST /api/v1/admin-panel/withdrawals/{id}/approve/ — Pul yechishni tasdiqlash."""

    permission_classes = [IsAdminUser]

    def post(self, request, pk):
        from core.exceptions import BusinessLogicError

        try:
            withdrawal = WithdrawalService.approve_withdrawal(pk, request.user)
        except WithdrawalRequest.DoesNotExist:
            return Response(
                {"success": False, "error": {"message": "So'rov topilmadi."}},
                status=status.HTTP_404_NOT_FOUND,
            )
        except BusinessLogicError as e:
            return Response(
                {"success": False, "error": {"message": str(e)}},
                status=status.HTTP_400_BAD_REQUEST,
            )

        _log_admin_action(request, "withdrawal_approve", "withdrawal", str(pk))
        return Response({"success": True, "data": {"status": "completed"}})


@extend_schema(tags=["Admin - Withdrawals"])
class AdminWithdrawalRejectView(APIView):
    """POST /api/v1/admin-panel/withdrawals/{id}/reject/ — Pul yechishni rad etish."""

    permission_classes = [IsAdminUser]

    def post(self, request, pk):
        from core.exceptions import BusinessLogicError

        reason = request.data.get("reason", "")
        try:
            withdrawal = WithdrawalService.reject_withdrawal(pk, request.user, reason)
        except WithdrawalRequest.DoesNotExist:
            return Response(
                {"success": False, "error": {"message": "So'rov topilmadi."}},
                status=status.HTTP_404_NOT_FOUND,
            )
        except BusinessLogicError as e:
            return Response(
                {"success": False, "error": {"message": str(e)}},
                status=status.HTTP_400_BAD_REQUEST,
            )

        _log_admin_action(
            request, "withdrawal_reject", "withdrawal", str(pk),
            details={"reason": reason},
        )
        return Response({"success": True, "data": {"status": "rejected"}})
