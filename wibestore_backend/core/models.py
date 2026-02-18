"""
WibeStore Backend - Abstract Base Models
Reusable abstract models for all apps.
"""

import uuid

from django.db import models
from django.utils import timezone


class TimeStampedModel(models.Model):
    """Abstract model with created_at and updated_at timestamps."""

    created_at = models.DateTimeField(auto_now_add=True, db_index=True)
    updated_at = models.DateTimeField(auto_now=True)

    class Meta:
        abstract = True
        ordering = ["-created_at"]


class UUIDModel(models.Model):
    """Abstract model with UUID primary key."""

    id = models.UUIDField(primary_key=True, default=uuid.uuid4, editable=False)

    class Meta:
        abstract = True


class SoftDeleteManager(models.Manager):
    """Manager that excludes soft-deleted objects by default."""

    def get_queryset(self) -> models.QuerySet:
        return super().get_queryset().filter(deleted_at__isnull=True)

    def all_with_deleted(self) -> models.QuerySet:
        return super().get_queryset()

    def deleted_only(self) -> models.QuerySet:
        return super().get_queryset().filter(deleted_at__isnull=False)


class SoftDeleteModel(models.Model):
    """Abstract model with soft delete support."""

    deleted_at = models.DateTimeField(null=True, blank=True, default=None)

    objects = SoftDeleteManager()
    all_objects = models.Manager()

    class Meta:
        abstract = True

    def soft_delete(self) -> None:
        """Mark the object as deleted."""
        self.deleted_at = timezone.now()
        self.save(update_fields=["deleted_at"])

    def restore(self) -> None:
        """Restore a soft-deleted object."""
        self.deleted_at = None
        self.save(update_fields=["deleted_at"])

    @property
    def is_deleted(self) -> bool:
        return self.deleted_at is not None


class BaseModel(UUIDModel, TimeStampedModel):
    """Base model combining UUID primary key and timestamps."""

    class Meta:
        abstract = True
        ordering = ["-created_at"]


class BaseSoftDeleteModel(BaseModel, SoftDeleteModel):
    """Base model with UUID, timestamps, and soft delete."""

    class Meta:
        abstract = True
        ordering = ["-created_at"]
