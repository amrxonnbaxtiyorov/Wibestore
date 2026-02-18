"""
WibeStore Backend - Accounts Signals
"""

import logging

from django.contrib.auth import get_user_model
from django.db.models.signals import post_save
from django.dispatch import receiver

logger = logging.getLogger("apps.accounts")
User = get_user_model()


@receiver(post_save, sender=User)
def user_post_save(sender, instance, created, **kwargs):
    """Handle actions after user creation."""
    if created:
        logger.info("New user created: %s (ID: %s)", instance.email, instance.id)
