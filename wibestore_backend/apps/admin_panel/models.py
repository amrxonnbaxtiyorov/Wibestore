"""
WibeStore Backend - Admin Panel Models
"""
from django.conf import settings
from django.db import models

from core.models import BaseModel


class AdminAction(BaseModel):
    """Лог всех действий администратора."""
    admin = models.ForeignKey(
        settings.AUTH_USER_MODEL,
        on_delete=models.CASCADE,
        related_name="admin_actions"
    )
    action_type = models.CharField(max_length=50)  # approve_trade, reject_verification, ban_user...
    target_type = models.CharField(max_length=50)  # EscrowTransaction, SellerVerification, User...
    target_id = models.CharField(max_length=36)    # UUID
    details = models.JSONField(default=dict)
    ip_address = models.GenericIPAddressField(null=True, blank=True)

    class Meta:
        db_table = "admin_actions"
        ordering = ["-created_at"]
        verbose_name = "Admin Action"
        verbose_name_plural = "Admin Actions"

    def __str__(self) -> str:
        return f"AdminAction({self.admin_id}, {self.action_type}, {self.target_id})"
