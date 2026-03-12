"""
WibeStore Backend - Payments Views
"""

import logging
from decimal import Decimal, InvalidOperation

from django.conf import settings
from django.utils import timezone
from drf_spectacular.utils import extend_schema
from rest_framework import generics, permissions, status
from rest_framework.parsers import FormParser, MultiPartParser
from rest_framework.response import Response
from rest_framework.views import APIView

from .models import DepositRequest, EscrowTransaction, Transaction
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

        from core.exceptions import BusinessLogicError, InsufficientFundsError

        try:
            escrow = EscrowService.create_escrow(buyer=request.user, listing=listing)
        except InsufficientFundsError as e:
            return Response(
                {"success": False, "error": {"message": str(e) or "Balans yetarli emas."}},
                status=status.HTTP_402_PAYMENT_REQUIRED,
            )
        except BusinessLogicError as e:
            return Response(
                {"success": False, "error": {"message": str(e)}},
                status=status.HTTP_400_BAD_REQUEST,
            )
        except Exception as e:
            logger.error("Unexpected error creating escrow for listing %s: %s", listing.id, e, exc_info=True)
            return Response(
                {"success": False, "error": {"message": "Xarid yaratishda xatolik. Qayta urinib ko'ring."}},
                status=status.HTTP_500_INTERNAL_SERVER_ERROR,
            )

        # Open chat between buyer, seller and site admin(s) after payment
        chat_room_id = None
        try:
            from apps.messaging.services import create_order_chat_for_escrow
            chat_room = create_order_chat_for_escrow(escrow)
            chat_room_id = str(chat_room.id)
        except Exception as chat_err:
            logger.warning("Could not create order chat for escrow %s: %s", escrow.id, chat_err)

        escrow_data = EscrowTransactionSerializer(escrow).data
        if chat_room_id:
            escrow_data["chat_room_id"] = chat_room_id

        return Response(
            {
                "success": True,
                "message": "Purchase created. Payment held in escrow.",
                "data": escrow_data,
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

        # Post system message to order chat
        try:
            from apps.messaging.services import post_system_message_to_order_chat
            post_system_message_to_order_chat(
                escrow,
                "✅ Haridor akkauntni to'liq qabul qilganini tasdiqladi.\n"
                "💰 Mablag' sotuvchiga o'tkazilmoqda. Xarid yakunlandi!"
            )
        except Exception:
            pass

        # Notify all parties via Telegram
        try:
            from .telegram_notify import notify_buyer_confirmed, notify_both_parties_confirmation
            notify_buyer_confirmed(escrow)
            notify_both_parties_confirmation(escrow, confirmed_by="buyer")
        except Exception as tg_err:
            logger.warning("Telegram buyer-confirm notification failed: %s", tg_err)

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


@extend_schema(tags=["Payments"])
class TelegramDepositRequestView(APIView):
    """
    POST /api/v1/payments/telegram/deposit-request/
    Telegram bot tomonidan hisob to'ldirish so'rovini saqlash.
    Multipart form: secret_key, telegram_id, phone_number, telegram_username, amount (ixtiyoriy), screenshot (fayl)
    """

    permission_classes = [permissions.AllowAny]
    parser_classes = [MultiPartParser, FormParser]

    def post(self, request):
        # Secret key tekshirish
        secret = getattr(settings, "TELEGRAM_BOT_SECRET", "") or ""
        if not secret or request.data.get("secret_key") != secret:
            return Response(
                {"success": False, "error": "Unauthorized"},
                status=status.HTTP_403_FORBIDDEN,
            )

        telegram_id_raw = request.data.get("telegram_id")
        if not telegram_id_raw:
            return Response(
                {"success": False, "error": "telegram_id majburiy"},
                status=status.HTTP_400_BAD_REQUEST,
            )

        try:
            telegram_id = int(telegram_id_raw)
        except (ValueError, TypeError):
            return Response(
                {"success": False, "error": "telegram_id noto'g'ri"},
                status=status.HTTP_400_BAD_REQUEST,
            )

        # Foydalanuvchini topish (ixtiyoriy)
        from apps.accounts.models import User

        user = None
        try:
            user = User.objects.get(telegram_id=telegram_id)
        except User.DoesNotExist:
            pass

        # Summa (ixtiyoriy)
        amount = None
        amount_raw = request.data.get("amount")
        if amount_raw:
            try:
                amount = Decimal(str(amount_raw))
                if amount <= 0:
                    amount = None
            except (InvalidOperation, ValueError):
                amount = None

        dr = DepositRequest.objects.create(
            user=user,
            telegram_id=telegram_id,
            telegram_username=request.data.get("telegram_username", ""),
            phone_number=request.data.get("phone_number", ""),
            amount=amount,
            screenshot=request.FILES.get("screenshot"),
            sent_at=timezone.now(),
        )

        return Response(
            {"success": True, "id": str(dr.id)},
            status=status.HTTP_201_CREATED,
        )


@extend_schema(tags=["Payments"])
class EscrowSellerConfirmView(APIView):
    """POST /api/v1/payments/escrow/{id}/seller-confirm/ - Seller confirms account transfer."""

    permission_classes = [permissions.IsAuthenticated]

    def post(self, request, pk):
        try:
            escrow = EscrowTransaction.objects.get(pk=pk, seller=request.user)
        except EscrowTransaction.DoesNotExist:
            return Response(
                {"success": False, "error": {"message": "Escrow transaction not found."}},
                status=status.HTTP_404_NOT_FOUND,
            )

        from core.exceptions import BusinessLogicError
        try:
            escrow = EscrowService.seller_confirm_transfer(escrow, request.user)
        except BusinessLogicError as e:
            return Response(
                {"success": False, "error": {"message": str(e)}},
                status=status.HTTP_400_BAD_REQUEST,
            )

        try:
            from apps.messaging.services import post_system_message_to_order_chat
            post_system_message_to_order_chat(
                escrow,
                "Sotuvchi akkauntni topshirganini tasdiqladi. "
                "Haridor endi akkauntni tekshirib, tasdiqlashi kerak."
            )
        except Exception:
            pass

        try:
            from .telegram_notify import notify_seller_confirmed, notify_both_parties_confirmation
            notify_seller_confirmed(escrow)
            notify_both_parties_confirmation(escrow, confirmed_by="seller")
        except Exception as tg_err:
            logger.warning("Telegram seller-confirm notification failed: %s", tg_err)

        return Response(
            {
                "success": True,
                "message": "Akkaunt topshirilganingiz tasdiqlandi. Haridor tekshiradi.",
                "data": EscrowTransactionSerializer(escrow).data,
            },
            status=status.HTTP_200_OK,
        )


@extend_schema(tags=["Payments"])
class TelegramCallbackView(APIView):
    """POST /api/v1/payments/telegram/callback/ - Telegram bot inline keyboard callback handler."""

    permission_classes = [permissions.AllowAny]

    def post(self, request):
        from .telegram_notify import _answer_callback_query, notify_both_parties_confirmation

        update = request.data
        callback_query = update.get("callback_query")
        if not callback_query:
            return Response({"ok": True})

        callback_id = callback_query.get("id", "")
        data = callback_query.get("data", "")
        from_user = callback_query.get("from", {})
        telegram_id = from_user.get("id")

        if not data or not telegram_id:
            _answer_callback_query(callback_id, "Xatolik yuz berdi.")
            return Response({"ok": True})

        parts = data.split(":", 1)
        if len(parts) != 2:
            _answer_callback_query(callback_id)
            return Response({"ok": True})

        action, escrow_id = parts[0], parts[1]

        try:
            escrow = EscrowTransaction.objects.select_related(
                "buyer", "seller", "listing"
            ).get(pk=escrow_id)
        except Exception:
            _answer_callback_query(callback_id, "Savdo topilmadi.")
            return Response({"ok": True})

        from apps.accounts.models import User
        try:
            tg_user = User.objects.get(telegram_id=telegram_id)
        except User.DoesNotExist:
            _answer_callback_query(callback_id, "Foydalanuvchi topilmadi.")
            return Response({"ok": True})

        from core.exceptions import BusinessLogicError

        if action == "escrow_seller_ok":
            if tg_user != escrow.seller:
                _answer_callback_query(callback_id, "Faqat sotuvchi tasdiqlashi mumkin.")
                return Response({"ok": True})
            try:
                EscrowService.seller_confirm_transfer(escrow, tg_user)
            except BusinessLogicError:
                pass
            try:
                from apps.messaging.services import post_system_message_to_order_chat
                post_system_message_to_order_chat(escrow,
                    "Sotuvchi (bot orqali) akkauntni topshirganini tasdiqladi. "
                    "Haridor endi akkauntni tekshirib, tasdiqlashi kerak.")
                from .telegram_notify import notify_seller_confirmed
                notify_seller_confirmed(escrow)
                notify_both_parties_confirmation(escrow, confirmed_by="seller")
            except Exception:
                pass
            _answer_callback_query(callback_id, "Tasdiqlandi! Haridor tekshirmoqda.")

        elif action == "escrow_buyer_ok":
            if tg_user != escrow.buyer:
                _answer_callback_query(callback_id, "Faqat haridor tasdiqlashi mumkin.")
                return Response({"ok": True})
            try:
                EscrowService.confirm_delivery(escrow, tg_user)
            except BusinessLogicError:
                pass
            try:
                from apps.messaging.services import post_system_message_to_order_chat
                post_system_message_to_order_chat(escrow,
                    "Haridor (bot orqali) akkauntni to'liq qabul qilganini tasdiqladi. "
                    "Mablag' sotuvchiga o'tkazilmoqda. Xarid yakunlandi!")
                from .telegram_notify import notify_buyer_confirmed
                notify_buyer_confirmed(escrow)
                notify_both_parties_confirmation(escrow, confirmed_by="buyer")
            except Exception:
                pass
            _answer_callback_query(callback_id, "Tasdiqlandi! Xarid yakunlandi.")

        elif action == "escrow_buyer_no":
            if tg_user != escrow.buyer:
                _answer_callback_query(callback_id, "Faqat haridor shikoyat ochishi mumkin.")
                return Response({"ok": True})
            reason = "Haridor bot orqali muammoni bildirdi."
            try:
                EscrowService.open_dispute(escrow, tg_user, reason)
            except BusinessLogicError:
                pass
            try:
                from apps.messaging.services import post_system_message_to_order_chat
                post_system_message_to_order_chat(escrow,
                    "Haridor bot orqali muammoni bildirdi. Shikoyat ochildi. "
                    "Admin ko'rib chiqadi va qaror qabul qiladi.")
                from .telegram_notify import notify_dispute_opened
                notify_dispute_opened(escrow, reason)
            except Exception:
                pass
            _answer_callback_query(callback_id, "Shikoyat ochildi. Admin ko'rib chiqadi.")

        else:
            _answer_callback_query(callback_id)

        return Response({"ok": True})
