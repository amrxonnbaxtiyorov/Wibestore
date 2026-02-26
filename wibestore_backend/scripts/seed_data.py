"""
WibeStore Backend - Seed Data Script
Populates the database with initial data for development/staging.

Usage:
    python manage.py shell < scripts/seed_data.py
    # or
    python manage.py runscript seed_data  (if django-extensions installed)
"""

import os
import sys

import django

# Setup Django
os.environ.setdefault("DJANGO_SETTINGS_MODULE", "config.settings.development")
sys.path.insert(0, os.path.dirname(os.path.dirname(os.path.abspath(__file__))))
django.setup()

from decimal import Decimal

from django.contrib.auth import get_user_model

User = get_user_model()


def seed_games():
    """Seed initial game data."""
    from apps.games.models import Category, Game

    games_data = [
        {
            "name": "PUBG Mobile",
            "slug": "pubg-mobile",
            "description": "PlayerUnknown's Battlegrounds Mobile - battle royale game",
            "icon": "🎮",
            "color": "#F59E0B",
            "sort_order": 1,
        },
        {
            "name": "Steam",
            "slug": "steam",
            "description": "Steam platform accounts with games library",
            "icon": "🎯",
            "color": "#1B2838",
            "sort_order": 2,
        },
        {
            "name": "Free Fire",
            "slug": "free-fire",
            "description": "Garena Free Fire - battle royale game",
            "icon": "🔥",
            "color": "#EF4444",
            "sort_order": 3,
        },
        {
            "name": "Standoff 2",
            "slug": "standoff-2",
            "description": "Standoff 2 - first-person shooter",
            "icon": "🔫",
            "color": "#8B5CF6",
            "sort_order": 4,
        },
        {
            "name": "Mobile Legends",
            "slug": "mobile-legends",
            "description": "Mobile Legends: Bang Bang - MOBA game",
            "icon": "⚔️",
            "color": "#3B82F6",
            "sort_order": 5,
        },
        {
            "name": "Clash of Clans",
            "slug": "clash-of-clans",
            "description": "Clash of Clans - strategy game",
            "icon": "🏰",
            "color": "#10B981",
            "sort_order": 6,
        },
        {
            "name": "Roblox",
            "slug": "roblox",
            "description": "Roblox - online game platform",
            "icon": "🧱",
            "color": "#DC2626",
            "sort_order": 7,
        },
        {
            "name": "Genshin Impact",
            "slug": "genshin-impact",
            "description": "Genshin Impact - open-world RPG",
            "icon": "🌟",
            "color": "#6366F1",
            "sort_order": 8,
        },
        {
            "name": "Fortnite",
            "slug": "fortnite",
            "description": "Fortnite - battle royale game",
            "icon": "🏗️",
            "color": "#2563EB",
            "sort_order": 9,
        },
        {
            "name": "Valorant",
            "slug": "valorant",
            "description": "Valorant - tactical FPS by Riot Games",
            "icon": "🎯",
            "color": "#FF4655",
            "sort_order": 10,
        },
    ]

    created = 0
    for data in games_data:
        _, was_created = Game.objects.get_or_create(
            slug=data["slug"], defaults=data
        )
        if was_created:
            created += 1
    print(f"✅ Games: {created} created, {len(games_data) - created} already existed")

    # Seed categories
    categories_data = [
        {"name": "Accounts", "slug": "accounts"},
        {"name": "In-Game Items", "slug": "in-game-items"},
        {"name": "Currency", "slug": "currency"},
        {"name": "Boosting", "slug": "boosting"},
    ]

    created = 0
    for data in categories_data:
        _, was_created = Category.objects.get_or_create(
            slug=data["slug"], defaults=data
        )
        if was_created:
            created += 1
    print(f"✅ Categories: {created} created, {len(categories_data) - created} already existed")


def seed_subscription_plans():
    """Seed subscription plans."""
    from apps.subscriptions.models import SubscriptionPlan

    plans_data = [
        {
            "name": "Free",
            "slug": "free",
            "price_monthly": Decimal("0"),
            "price_yearly": Decimal("0"),
            "commission_rate": Decimal("10.0"),
            "features": {
                "listing_limit": 5,
                "priority_support": False,
                "badge": None,
                "fast_withdrawal": False,
            },
            "is_premium": False,
            "is_pro": False,
            "sort_order": 1,
        },
        {
            "name": "Premium",
            "slug": "premium",
            "price_monthly": Decimal("49000"),
            "price_yearly": Decimal("399000"),
            "commission_rate": Decimal("8.0"),
            "features": {
                "listing_limit": 20,
                "priority_support": True,
                "badge": "premium",
                "fast_withdrawal": False,
                "highlighted_listings": True,
            },
            "is_premium": True,
            "is_pro": False,
            "sort_order": 2,
        },
        {
            "name": "Pro",
            "slug": "pro",
            "price_monthly": Decimal("99000"),
            "price_yearly": Decimal("799000"),
            "commission_rate": Decimal("5.0"),
            "features": {
                "listing_limit": -1,
                "priority_support": True,
                "badge": "pro",
                "fast_withdrawal": True,
                "highlighted_listings": True,
                "personal_manager": True,
            },
            "is_premium": True,
            "is_pro": True,
            "sort_order": 3,
        },
    ]

    created = 0
    for data in plans_data:
        _, was_created = SubscriptionPlan.objects.get_or_create(
            slug=data["slug"], defaults=data
        )
        if was_created:
            created += 1
    print(f"✅ Subscription Plans: {created} created, {len(plans_data) - created} already existed")


def seed_payment_methods():
    """Seed payment methods."""
    from apps.payments.models import PaymentMethod

    methods_data = [
        {"name": "Google Pay", "code": "google_pay", "is_active": True},
        {"name": "Visa Card", "code": "visa", "is_active": True},
        {"name": "Mastercard", "code": "mastercard", "is_active": True},
        {"name": "Apple Pay", "code": "apple_pay", "is_active": True},
        {"name": "Uzcard", "code": "uzcard", "is_active": True},
        {"name": "Humo", "code": "humo", "is_active": True},
    ]

    created = 0
    for data in methods_data:
        _, was_created = PaymentMethod.objects.get_or_create(
            code=data["code"], defaults=data
        )
        if was_created:
            created += 1
    print(f"✅ Payment Methods: {created} created, {len(methods_data) - created} already existed")


def seed_notification_types():
    """Seed notification types."""
    from apps.notifications.models import NotificationType

    types_data = [
        {"name": "System", "code": "system", "icon": "bell"},
        {"name": "Admin", "code": "admin", "icon": "shield"},
        {"name": "Payment", "code": "payment", "icon": "credit-card"},
        {"name": "Escrow", "code": "escrow", "icon": "lock"},
        {"name": "Listing", "code": "listing", "icon": "tag"},
        {"name": "Message", "code": "message", "icon": "message-circle"},
        {"name": "Review", "code": "review", "icon": "star"},
        {"name": "Subscription", "code": "subscription", "icon": "crown"},
    ]

    created = 0
    for data in types_data:
        _, was_created = NotificationType.objects.get_or_create(
            code=data["code"], defaults=data
        )
        if was_created:
            created += 1
    print(f"✅ Notification Types: {created} created, {len(types_data) - created} already existed")


def run():
    """Run all seed functions."""
    print("=" * 50)
    print("🌱 Seeding WibeStore database...")
    print("=" * 50)

    seed_games()
    seed_subscription_plans()
    seed_payment_methods()
    seed_notification_types()

    print("=" * 50)
    print("✅ Seeding complete!")
    print("=" * 50)


if __name__ == "__main__":
    run()
