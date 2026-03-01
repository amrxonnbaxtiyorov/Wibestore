"""
WibeStore Backend - Stripe Payment Views
Stripe Checkout Session creation and Webhook handling for premium subscriptions.
"""

import logging
from datetime import timedelta
from decimal import Decimal

import stripe
from django.conf import settings
from django.db import transaction as db_transaction
from django.utils import timezone
from drf_spectacular.utils import extend_schema
from rest_framework import permissions, status
from rest_framework.response import Response
from rest_framework.views import APIView

logger = logging.getLogger("apps.payments")


@extend_schema(tags=["Stripe"])
class StripeCreateCheckoutSessionView(APIView):
    """
    POST /api/v1/payments/stripe/create-checkout-session/

    Creates a Stripe Checkout Session for purchasing a subscription plan.
    Returns the checkout URL to redirect the user to.
    """

    permission_classes = [permissions.IsAuthenticated]

    def post(self, request):
        plan_slug = request.data.get("plan_slug")
        if plan_slug not in ("premium", "pro"):
            return Response(
                {"success": False, "error": {"message": "Invalid plan. Choose 'premium' or 'pro'."}},
                status=status.HTTP_400_BAD_REQUEST,
            )

        # Get price config from settings
        price_config = settings.STRIPE_PRICES.get(plan_slug)
        if not price_config:
            return Response(
                {"success": False, "error": {"message": "Plan pricing not configured."}},
                status=status.HTTP_400_BAD_REQUEST,
            )

        # First month 50% discount: apply if user has never had a paid subscription
        from apps.subscriptions.models import UserSubscription
        has_ever_paid = UserSubscription.objects.filter(
            user=request.user,
            plan__slug__in=["premium", "pro"],
        ).exists()
        amount_cents = price_config["amount"]
        if not has_ever_paid:
            amount_cents = max(1, int(amount_cents * 0.5))  # 50% off first month

        # Initialize Stripe
        stripe.api_key = settings.STRIPE_SECRET_KEY
        if not stripe.api_key:
            logger.error("STRIPE_SECRET_KEY is not configured")
            return Response(
                {"success": False, "error": {"message": "Payment system is not configured."}},
                status=status.HTTP_500_INTERNAL_SERVER_ERROR,
            )

        try:
            checkout_session = stripe.checkout.Session.create(
                payment_method_types=["card"],
                line_items=[
                    {
                        "price_data": {
                            "currency": price_config["currency"],
                            "product_data": {
                                "name": price_config["name"],
                                "description": f"WibeStore {plan_slug.capitalize()} monthly subscription"
                                + (" (50% off first month)" if not has_ever_paid else ""),
                            },
                            "unit_amount": amount_cents,
                        },
                        "quantity": 1,
                    }
                ],
                mode="payment",
                success_url=settings.STRIPE_SUCCESS_URL,
                cancel_url=settings.STRIPE_CANCEL_URL,
                client_reference_id=str(request.user.id),
                customer_email=request.user.email,
                metadata={
                    "plan_slug": plan_slug,
                    "billing_period": "monthly",
                    "user_id": str(request.user.id),
                },
            )

            logger.info(
                "Stripe checkout session created: %s for user %s, plan: %s",
                checkout_session.id, request.user.email, plan_slug,
            )

            return Response(
                {
                    "success": True,
                    "data": {
                        "session_id": checkout_session.id,
                        "checkout_url": checkout_session.url,
                    },
                },
                status=status.HTTP_200_OK,
            )

        except stripe.error.StripeError as e:
            logger.error("Stripe error: %s", str(e))
            return Response(
                {"success": False, "error": {"message": "Payment service error. Please try again."}},
                status=status.HTTP_502_BAD_GATEWAY,
            )


@extend_schema(tags=["Stripe"])
class StripeWebhookView(APIView):
    """
    POST /api/v1/payments/stripe/webhook/

    Handles Stripe webhook events.
    Verifies the webhook signature and processes checkout.session.completed events.
    """

    permission_classes = [permissions.AllowAny]
    authentication_classes = []  # No auth for webhooks

    def post(self, request):
        payload = request.body
        sig_header = request.META.get("HTTP_STRIPE_SIGNATURE", "")
        webhook_secret = settings.STRIPE_WEBHOOK_SECRET

        # Initialize Stripe
        stripe.api_key = settings.STRIPE_SECRET_KEY

        # Verify webhook signature
        if webhook_secret:
            try:
                event = stripe.Webhook.construct_event(
                    payload, sig_header, webhook_secret,
                )
            except ValueError:
                logger.error("Stripe webhook: invalid payload")
                return Response(
                    {"error": "Invalid payload"},
                    status=status.HTTP_400_BAD_REQUEST,
                )
            except stripe.error.SignatureVerificationError:
                logger.error("Stripe webhook: invalid signature")
                return Response(
                    {"error": "Invalid signature"},
                    status=status.HTTP_400_BAD_REQUEST,
                )
        else:
            # No webhook secret configured — parse without verification (dev only)
            import json
            try:
                event = json.loads(payload)
            except json.JSONDecodeError:
                return Response(
                    {"error": "Invalid JSON"},
                    status=status.HTTP_400_BAD_REQUEST,
                )
            logger.warning("Stripe webhook received WITHOUT signature verification (dev mode)")

        # Handle the event
        event_type = event.get("type") if isinstance(event, dict) else event.type

        if event_type == "checkout.session.completed":
            session = event.get("data", {}).get("object", {}) if isinstance(event, dict) else event.data.object
            self._handle_checkout_completed(session)

        return Response({"status": "ok"}, status=status.HTTP_200_OK)

    @staticmethod
    @db_transaction.atomic
    def _handle_checkout_completed(session):
        """Process a completed checkout session — activate subscription."""
        from apps.accounts.models import User
        from apps.payments.models import Transaction
        from apps.subscriptions.models import SubscriptionPlan, UserSubscription

        # Extract metadata
        if isinstance(session, dict):
            metadata = session.get("metadata", {})
            user_id = session.get("client_reference_id") or metadata.get("user_id")
            payment_intent = session.get("payment_intent", "")
            amount_total = session.get("amount_total", 0)
            currency = session.get("currency", "usd")
        else:
            metadata = session.metadata or {}
            user_id = session.client_reference_id or metadata.get("user_id")
            payment_intent = session.payment_intent or ""
            amount_total = session.amount_total or 0
            currency = session.currency or "usd"

        plan_slug = metadata.get("plan_slug", "premium")
        billing_period = metadata.get("billing_period", "monthly")

        if not user_id:
            logger.error("Stripe webhook: no user_id in checkout session")
            return

        try:
            user = User.objects.get(id=user_id)
        except User.DoesNotExist:
            logger.error("Stripe webhook: user %s not found", user_id)
            return

        # Get or create subscription plan
        try:
            plan = SubscriptionPlan.objects.get(slug=plan_slug, is_active=True)
        except SubscriptionPlan.DoesNotExist:
            logger.error("Stripe webhook: plan '%s' not found, creating default", plan_slug)
            # Auto-create plan if it doesn't exist
            plan, _ = SubscriptionPlan.objects.get_or_create(
                slug=plan_slug,
                defaults={
                    "name": plan_slug.capitalize(),
                    "price_monthly": Decimal(str(amount_total / 100)),
                    "is_premium": plan_slug == "premium",
                    "is_pro": plan_slug == "pro",
                    "is_active": True,
                    "sort_order": 1 if plan_slug == "premium" else 2,
                },
            )

        # Cancel existing active subscriptions
        UserSubscription.objects.filter(user=user, status="active").update(
            status="cancelled", cancelled_at=timezone.now()
        )

        # Create new subscription
        now = timezone.now()
        duration = timedelta(days=30) if billing_period == "monthly" else timedelta(days=365)

        subscription = UserSubscription.objects.create(
            user=user,
            plan=plan,
            status="active",
            start_date=now,
            end_date=now + duration,
            auto_renew=False,  # One-time Stripe payment, not recurring
            payment_history=[
                {
                    "amount": str(amount_total / 100),
                    "currency": currency.upper(),
                    "date": now.isoformat(),
                    "period": billing_period,
                    "stripe_payment_intent": payment_intent,
                }
            ],
        )

        # Create transaction record
        Transaction.objects.create(
            user=user,
            amount=Decimal(str(amount_total / 100)),
            currency=currency.upper(),
            type="subscription",
            status="completed",
            provider_transaction_id=payment_intent,
            description=f"Stripe payment for {plan_slug.capitalize()} plan",
            processed_at=now,
            metadata={
                "stripe_session_id": session.get("id", "") if isinstance(session, dict) else session.id,
                "plan_slug": plan_slug,
            },
        )

        logger.info(
            "Stripe subscription activated: user=%s, plan=%s, subscription=%s",
            user.email, plan_slug, subscription.id,
        )
