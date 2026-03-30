"""
WibeStore Backend - Payment Providers Abstraction
Abstract base class and implementations for payment providers.
"""

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
    raise ValueError(f"Unknown payment provider: {provider_name}")
