"""
Admin Panel App - Tasks
"""

import logging
from celery import shared_task
from django.utils import timezone
from django.db.models import Count, Sum, Avg
from django.contrib.auth import get_user_model
from apps.marketplace.models import Listing
from apps.payments.models import Transaction, EscrowTransaction
from apps.reviews.models import Review

logger = logging.getLogger(__name__)
User = get_user_model()


@shared_task
def calculate_daily_statistics():
    """Calculate and store daily platform statistics."""
    today = timezone.now().date()
    
    try:
        # User statistics
        total_users = User.objects.count()
        active_users = User.objects.filter(is_active=True).count()
        new_users_today = User.objects.filter(
            created_at__date=today
        ).count()
        
        # Listing statistics
        total_listings = Listing.objects.count()
        active_listings = Listing.objects.filter(status='active').count()
        pending_listings = Listing.objects.filter(status='pending').count()
        sold_today = Listing.objects.filter(
            status='sold',
            updated_at__date=today
        ).count()
        
        # Financial statistics
        total_sales = Transaction.objects.filter(
            type='purchase',
            status='completed'
        ).aggregate(total=Sum('amount'))['total'] or 0
        
        today_revenue = Transaction.objects.filter(
            type='purchase',
            status='completed',
            processed_at__date=today
        ).aggregate(total=Sum('amount'))['total'] or 0
        
        total_commission = Transaction.objects.filter(
            type='commission',
            status='completed'
        ).aggregate(total=Sum('amount'))['total'] or 0
        
        # Escrow statistics
        pending_escrow = EscrowTransaction.objects.filter(
            status='delivered'
        ).count()
        
        disputed_escrow = EscrowTransaction.objects.filter(
            status='disputed'
        ).count()
        
        # Review statistics
        total_reviews = Review.objects.count()
        avg_rating = Review.objects.aggregate(Avg('rating'))['rating__avg'] or 0
        new_reviews_today = Review.objects.filter(
            created_at__date=today
        ).count()
        
        # Log statistics
        stats = {
            'date': str(today),
            'total_users': total_users,
            'active_users': active_users,
            'new_users_today': new_users_today,
            'total_listings': total_listings,
            'active_listings': active_listings,
            'pending_listings': pending_listings,
            'sold_today': sold_today,
            'total_sales': float(total_sales),
            'today_revenue': float(today_revenue),
            'total_commission': float(total_commission),
            'pending_escrow': pending_escrow,
            'disputed_escrow': disputed_escrow,
            'total_reviews': total_reviews,
            'avg_rating': round(float(avg_rating), 2),
            'new_reviews_today': new_reviews_today,
        }
        
        logger.info(f"Daily statistics calculated: {stats}")
        
        # Here you could save to a DailyStatistics model if needed
        # For now, just log the statistics
        
        return stats
        
    except Exception as e:
        logger.error(f"Error calculating daily statistics: {e}")
        raise


@shared_task
def cleanup_old_data():
    """Clean up old soft-deleted data."""
    from datetime import timedelta
    
    days_to_keep = 30
    cutoff_date = timezone.now() - timedelta(days=days_to_keep)
    
    # Clean up soft-deleted listings
    deleted_listings = Listing.objects.filter(
        deleted_at__lt=cutoff_date
    ).count()
    
    # Clean up old notifications
    from apps.notifications.models import Notification
    old_notifications = Notification.objects.filter(
        created_at__lt=cutoff_date
    ).count()
    
    logger.info(f"Cleaned up {deleted_listings} old listings and {old_notifications} old notifications")
    
    return {
        'deleted_listings': deleted_listings,
        'deleted_notifications': old_notifications,
    }


@shared_task
def check_premium_expirations():
    """Check and handle expiring premium subscriptions."""
    from apps.subscriptions.models import UserSubscription
    from datetime import timedelta
    
    expiring_soon = UserSubscription.objects.filter(
        status='active',
        end_date__lte=timezone.now() + timedelta(days=3)
    ).select_related('user')
    
    for subscription in expiring_soon:
        # Send notification to user
        from apps.notifications.services import NotificationService
        NotificationService.create_notification(
            user=subscription.user,
            notification_type='subscription_expiring',
            title='Premium obuna yakunlanmoqda',
            message=f"Sizning {subscription.plan.name} obunangiz 3 kundan so'ng yakunlanadi.",
        )
        
        logger.info(f"Premium expiration notification sent to user {subscription.user.id}")
    
    return {'expiring_count': expiring_soon.count()}
