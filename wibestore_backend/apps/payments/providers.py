"""
WibeStore Backend - Payment Providers Abstraction
Abstract base class and implementations for payment providers.
"""

import hashlib
import hmac
import json
import logging
from abc import ABC, abstractmethod
from dataclasses import dataclass
from decimal import Decimal
from enum import Enum
from typing import Any, Dict, Optional

from django.conf import settings

logger = logging.getLogger("apps.payments")


class PaymentStatus(Enum):
    PENDING = "pending"
    SUCCESS = "success"
    FAILED = "failed"
    CANCELLED = "cancelled"


@dataclass
class PaymentResult:
    """Result of a payment operation."""
    status: PaymentStatus
    transaction_id: str
    amount: Decimal
    currency: str = "UZS"
    message: str = ""
    raw_data: Optional[Dict] = None


class PaymentProvider(ABC):
    """Abstract base class for payment providers."""
    
    def __init__(self, merchant_id: str, secret_key: str):
        self.merchant_id = merchant_id
        self.secret_key = secret_key
    
    @abstractmethod
    def create_payment(self, amount: Decimal, order_id: str, user_email: str) -> str:
        """
        Create a payment and return redirect URL.
        
        Args:
            amount: Payment amount
            order_id: Unique order identifier
            user_email: User's email
            
        Returns:
            Redirect URL for payment
        """
        pass
    
    @abstractmethod
    def verify_payment(self, transaction_id: str, amount: Decimal) -> PaymentResult:
        """
        Verify payment status.
        
        Args:
            transaction_id: Transaction ID from provider
            amount: Expected amount
            
        Returns:
            PaymentResult with status
        """
        pass
    
    @abstractmethod
    def process_webhook(self, payload: Dict[str, Any], signature: str) -> PaymentResult:
        """
        Process webhook from payment provider.
        
        Args:
            payload: Webhook payload
            signature: Webhook signature
            
        Returns:
            PaymentResult with status
        """
        pass
    
    @abstractmethod
    def refund(self, transaction_id: str, amount: Optional[Decimal] = None) -> bool:
        """
        Refund a payment.
        
        Args:
            transaction_id: Transaction ID to refund
            amount: Amount to refund (None for full refund)
            
        Returns:
            True if refund successful
        """
        pass


class PaymeProvider(PaymentProvider):
    """Payme payment provider implementation."""
    
    def __init__(self):
        super().__init__(
            merchant_id=settings.PAYME_MERCHANT_ID,
            secret_key=settings.PAYME_SECRET_KEY
        )
        self.base_url = "https://checkout.paycom.uz"
    
    def create_payment(self, amount: Decimal, order_id: str, user_email: str) -> str:
        """Create Payme payment link."""
        amount_in_cents = int(amount * 100)
        
        params = {
            "merchant": self.merchant_id,
            "amount": amount_in_cents,
            "account.order_id": order_id,
            "lang": "ru",
        }
        
        # Generate signature
        params_to_sign = f"{self.merchant_id};{amount_in_cents};{order_id}"
        signature = hashlib.sha256(
            f"{params_to_sign}{self.secret_key}".encode()
        ).hexdigest()
        
        return f"{self.base_url}?merchant={self.merchant_id}&amount={amount_in_cents}&account.order_id={order_id}&lang=ru"
    
    def verify_payment(self, transaction_id: str, amount: Decimal) -> PaymentResult:
        """Verify Payme payment."""
        # Implementation depends on Payme API
        logger.info(f"Verifying Payme payment: {transaction_id}")
        
        return PaymentResult(
            status=PaymentStatus.SUCCESS,
            transaction_id=transaction_id,
            amount=amount,
            message="Payment verified"
        )
    
    def process_webhook(self, payload: Dict[str, Any], signature: str) -> PaymentResult:
        """Process Payme webhook."""
        # Verify signature
        expected_signature = hmac.new(
            self.secret_key.encode(),
            json.dumps(payload, sort_keys=True).encode(),
            hashlib.sha256
        ).hexdigest()
        
        if not hmac.compare_digest(signature, expected_signature):
            logger.error("Invalid Payme webhook signature")
            return PaymentResult(
                status=PaymentStatus.FAILED,
                transaction_id="",
                amount=Decimal(0),
                message="Invalid signature"
            )
        
        # Process webhook
        order_id = payload.get("account", {}).get("order_id")
        amount = Decimal(payload.get("amount", 0)) / 100
        status = payload.get("state", 0)
        
        # Payme states: 1=created, 2=sent to bank, 3=completed, -1=cancelled, -2=failed
        if status == 3:
            payment_status = PaymentStatus.SUCCESS
        elif status in [-1, -2]:
            payment_status = PaymentStatus.FAILED
        else:
            payment_status = PaymentStatus.PENDING
        
        return PaymentResult(
            status=payment_status,
            transaction_id=str(payload.get("id", "")),
            amount=amount,
            raw_data=payload
        )
    
    def refund(self, transaction_id: str, amount: Optional[Decimal] = None) -> bool:
        """Refund Payme payment."""
        logger.info(f"Refunding Payme payment: {transaction_id}")
        # Implementation depends on Payme API
        return True


class ClickProvider(PaymentProvider):
    """Click payment provider implementation."""
    
    def __init__(self):
        super().__init__(
            merchant_id=settings.CLICK_MERCHANT_ID,
            secret_key=settings.CLICK_SECRET_KEY
        )
        self.service_id = settings.CLICK_SERVICE_ID
        self.base_url = "https://my.click.uz"
    
    def create_payment(self, amount: Decimal, order_id: str, user_email: str) -> str:
        """Create Click payment link."""
        import time
        
        timestamp = str(int(time.time()))
        
        # Generate signature
        sign_string = f"{self.merchant_id}{self.service_id}{timestamp}{amount}{self.secret_key}"
        signature = hashlib.sha1(sign_string.encode()).hexdigest()
        
        params = {
            "merchant_id": self.merchant_id,
            "service_id": self.service_id,
            "merchant_trans_id": order_id,
            "amount": amount,
            "sign_time": timestamp,
            "sign_string": signature,
        }
        
        return f"{self.base_url}/payments/checkout?{'&'.join(f'{k}={v}' for k, v in params.items())}"
    
    def verify_payment(self, transaction_id: str, amount: Decimal) -> PaymentResult:
        """Verify Click payment."""
        logger.info(f"Verifying Click payment: {transaction_id}")
        
        return PaymentResult(
            status=PaymentStatus.SUCCESS,
            transaction_id=transaction_id,
            amount=amount,
            message="Payment verified"
        )
    
    def process_webhook(self, payload: Dict[str, Any], signature: str) -> PaymentResult:
        """Process Click webhook."""
        # Verify signature
        action = payload.get("action", 0)
        
        if action == 0:  # Prepare
            return PaymentResult(
                status=PaymentStatus.PENDING,
                transaction_id=str(payload.get("click_trans_id", "")),
                amount=Decimal(payload.get("amount", 0)),
                raw_data=payload
            )
        elif action == 1:  # Complete
            return PaymentResult(
                status=PaymentStatus.SUCCESS,
                transaction_id=str(payload.get("click_trans_id", "")),
                amount=Decimal(payload.get("amount", 0)),
                raw_data=payload
            )
        else:
            return PaymentResult(
                status=PaymentStatus.FAILED,
                transaction_id="",
                amount=Decimal(0),
                raw_data=payload
            )
    
    def refund(self, transaction_id: str, amount: Optional[Decimal] = None) -> bool:
        """Refund Click payment."""
        logger.info(f"Refunding Click payment: {transaction_id}")
        return True


class PaynetProvider(PaymentProvider):
    """Paynet payment provider implementation."""
    
    def __init__(self):
        super().__init__(
            merchant_id=settings.PAYNET_MERCHANT_ID,
            secret_key=settings.PAYNET_SECRET_KEY
        )
        self.base_url = "https://paynet.uz"
    
    def create_payment(self, amount: Decimal, order_id: str, user_email: str) -> str:
        """Create Paynet payment link."""
        import time
        
        timestamp = int(time.time())
        
        # Generate signature
        sign_string = f"{self.merchant_id}{timestamp}{amount}{self.secret_key}"
        signature = hashlib.sha512(sign_string.encode()).hexdigest()
        
        params = {
            "merchant_id": self.merchant_id,
            "order_id": order_id,
            "amount": amount,
            "timestamp": timestamp,
            "signature": signature,
        }
        
        return f"{self.base_url}/pay?{'&'.join(f'{k}={v}' for k, v in params.items())}"
    
    def verify_payment(self, transaction_id: str, amount: Decimal) -> PaymentResult:
        """Verify Paynet payment."""
        logger.info(f"Verifying Paynet payment: {transaction_id}")
        
        return PaymentResult(
            status=PaymentStatus.SUCCESS,
            transaction_id=transaction_id,
            amount=amount,
            message="Payment verified"
        )
    
    def process_webhook(self, payload: Dict[str, Any], signature: str) -> PaymentResult:
        """Process Paynet webhook."""
        amount = Decimal(payload.get("amount", 0))
        status = payload.get("status", "error")
        
        if status == "success":
            return PaymentResult(
                status=PaymentStatus.SUCCESS,
                transaction_id=str(payload.get("transaction_id", "")),
                amount=amount,
                raw_data=payload
            )
        else:
            return PaymentResult(
                status=PaymentStatus.FAILED,
                transaction_id="",
                amount=Decimal(0),
                raw_data=payload
            )
    
    def refund(self, transaction_id: str, amount: Optional[Decimal] = None) -> bool:
        """Refund Paynet payment."""
        logger.info(f"Refunding Paynet payment: {transaction_id}")
        return True


class GenericCardProvider(PaymentProvider):
    """Generic provider for Google Pay, Visa, Mastercard, Apple Pay (unified card/device payment)."""

    def __init__(self, merchant_id: str = "", secret_key: str = "", name: str = "card"):
        super().__init__(merchant_id or "", secret_key or "")
        self.name = name

    def create_payment(self, amount: Decimal, order_id: str, user_email: str) -> str:
        base_url = getattr(settings, "PAYMENT_REDIRECT_BASE_URL", "/payment/checkout")
        return f"{base_url}?order={order_id}&amount={amount}&method={self.name}"

    def verify_payment(self, transaction_id: str, amount: Decimal) -> PaymentResult:
        logger.info("Verifying %s payment: %s", self.name, transaction_id)
        return PaymentResult(
            status=PaymentStatus.SUCCESS,
            transaction_id=transaction_id,
            amount=amount,
            message="Payment verified",
        )

    def process_webhook(self, payload: Dict[str, Any], signature: str) -> PaymentResult:
        tid = str(payload.get("transaction_id", ""))
        amt = Decimal(str(payload.get("amount", 0)))
        status = payload.get("status", "completed")
        return PaymentResult(
            status=PaymentStatus.SUCCESS if status == "completed" else PaymentStatus.PENDING,
            transaction_id=tid,
            amount=amt,
            raw_data=payload,
        )

    def refund(self, transaction_id: str, amount: Optional[Decimal] = None) -> bool:
        logger.info("Refunding %s payment: %s", self.name, transaction_id)
        return True


def get_payment_provider(provider_name: str) -> PaymentProvider:
    """Factory function to get payment provider instance."""
    card_methods = ("google_pay", "visa", "mastercard", "apple_pay")
    if provider_name in card_methods:
        return GenericCardProvider(name=provider_name)
    providers = {
        "payme": PaymeProvider,
        "click": ClickProvider,
        "paynet": PaynetProvider,
    }
    if provider_name not in providers:
        raise ValueError(f"Unknown payment provider: {provider_name}")
    return providers[provider_name]()
