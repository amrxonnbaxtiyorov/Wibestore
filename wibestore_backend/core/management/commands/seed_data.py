"""
WibeStore Backend - Management Command for Creating Seed Data
Creates games, payment methods, subscription plans, and test users.

Usage:
    python manage.py seed_data
"""

import random

from django.core.management.base import BaseCommand
from django.db import transaction

from apps.accounts.models import User
from apps.games.models import Game, Category
from apps.marketplace.models import Listing
from apps.subscriptions.models import SubscriptionPlan


class Command(BaseCommand):
    help = "Create seed data for development"

    @transaction.atomic
    def handle(self, *args, **options):
        self.stdout.write("Creating seed data...")

        self.create_categories()
        self.create_games()
        self.create_subscription_plans()
        self.create_test_users()
        self.create_listings()

        self.stdout.write(
            self.style.SUCCESS(
                "Successfully created seed data!\n"
                "Test users:\n"
                "  - admin@wibestore.uz / admin123 (Admin)\n"
                "  - seller@wibestore.uz / seller123 (Seller)\n"
                "  - buyer@wibestore.uz / buyer123 (Buyer)\n"
                "  - user@wibestore.uz / user123 (Regular user)"
            )
        )

    def create_categories(self):
        categories = [
            {"name": "Mobile Games", "slug": "mobile-games"},
            {"name": "PC Games", "slug": "pc-games"},
            {"name": "Console Games", "slug": "console-games"},
            {"name": "Battle Royale", "slug": "battle-royale"},
            {"name": "MOBA", "slug": "moba"},
            {"name": "MMORPG", "slug": "mmorpg"},
        ]
        for cat in categories:
            Category.objects.get_or_create(
                slug=cat["slug"],
                defaults={"name": cat["name"], "name_uz": cat["name"], "name_ru": cat["name"]}
            )
        self.stdout.write("Created categories")

    def create_games(self):
        games = [
            {"name": "PUBG Mobile", "slug": "pubg-mobile", "category": "mobile-games"},
            {"name": "Free Fire", "slug": "free-fire", "category": "mobile-games"},
            {"name": "Mobile Legends", "slug": "mobile-legends", "category": "mobile-games"},
            {"name": "Call of Duty Mobile", "slug": "cod-mobile", "category": "mobile-games"},
            {"name": "Clash of Clans", "slug": "clash-of-clans", "category": "mobile-games"},
            {"name": "Clash Royale", "slug": "clash-royale", "category": "mobile-games"},
            {"name": "Genshin Impact", "slug": "genshin-impact", "category": "mobile-games"},
            {"name": "Honkai: Star Rail", "slug": "honkai-star-rail", "category": "mobile-games"},
            {"name": "Roblox", "slug": "roblox", "category": "mobile-games"},
            {"name": "Minecraft PE", "slug": "minecraft-pe", "category": "mobile-games"},
            {"name": "Standoff 2", "slug": "standoff-2", "category": "mobile-games"},
            {"name": "Brawl Stars", "slug": "brawl-stars", "category": "mobile-games"},
            {"name": "Steam", "slug": "steam", "category": "pc-games"},
            {"name": "CS:GO", "slug": "csgo", "category": "pc-games"},
            {"name": "Dota 2", "slug": "dota-2", "category": "pc-games"},
            {"name": "Valorant", "slug": "valorant", "category": "pc-games"},
            {"name": "League of Legends", "slug": "league-of-legends", "category": "pc-games"},
            {"name": "World of Warcraft", "slug": "world-of-warcraft", "category": "pc-games"},
            {"name": "Overwatch 2", "slug": "overwatch-2", "category": "pc-games"},
            {"name": "Apex Legends", "slug": "apex-legends", "category": "pc-games"},
            {"name": "Fortnite", "slug": "fortnite", "category": "pc-games"},
            {"name": "Rocket League", "slug": "rocket-league", "category": "pc-games"},
            {"name": "Fall Guys", "slug": "fall-guys", "category": "pc-games"},
            {"name": "Among Us", "slug": "among-us", "category": "pc-games"},
            {"name": "PlayStation Network", "slug": "psn", "category": "console-games"},
            {"name": "Xbox Live", "slug": "xbox-live", "category": "console-games"},
            {"name": "Nintendo Switch", "slug": "nintendo-switch", "category": "console-games"},
            {"name": "FIFA 24", "slug": "fifa-24", "category": "console-games"},
            {"name": "NBA 2K24", "slug": "nba-2k24", "category": "console-games"},
            {"name": "Call of Duty", "slug": "call-of-duty", "category": "console-games"},
            {"name": "Grand Theft Auto V", "slug": "gta-v", "category": "console-games"},
            {"name": "Red Dead Redemption 2", "slug": "rdr2", "category": "console-games"},
            {"name": "The Last of Us", "slug": "the-last-of-us", "category": "console-games"},
            {"name": "God of War", "slug": "god-of-war", "category": "console-games"},
            {"name": "Spider-Man", "slug": "spider-man", "category": "console-games"},
            {"name": "Assassin's Creed", "slug": "assassins-creed", "category": "console-games"},
        ]
        for game_data in games:
            category = Category.objects.filter(slug=game_data["category"]).first()
            Game.objects.get_or_create(
                slug=game_data["slug"],
                defaults={
                    "name": game_data["name"],
                    "name_uz": game_data["name"],
                    "name_ru": game_data["name"],
                    "category": category,
                    "description": f"{game_data['name']} - popular game for buying and selling accounts",
                    "is_active": True,
                }
            )
        self.stdout.write(f"Created {len(games)} games")

    def create_subscription_plans(self):
        plans = [
            {"name": "Free", "slug": "free", "price": 0, "commission_rate": 0.10, "features": ["10% commission", "Basic support", "Standard listing"]},
            {"name": "Premium", "slug": "premium", "price": 50000, "commission_rate": 0.08, "features": ["8% commission", "Priority support", "Featured listings", "Analytics"]},
            {"name": "Pro", "slug": "pro", "price": 100000, "commission_rate": 0.05, "features": ["5% commission", "24/7 support", "Top featured listings", "Advanced analytics", "API access"]},
        ]
        for plan in plans:
            SubscriptionPlan.objects.get_or_create(
                slug=plan["slug"],
                defaults={
                    "name": plan["name"],
                    "name_uz": plan["name"],
                    "name_ru": plan["name"],
                    "price": plan["price"],
                    "commission_rate": plan["commission_rate"],
                    "features": plan["features"],
                    "is_active": True,
                }
            )
        self.stdout.write("Created subscription plans")

    def create_test_users(self):
        User.objects.filter(email="admin@wibestore.uz").delete()
        User.objects.create_superuser(
            email="admin@wibestore.uz",
            password="admin123",
            full_name="Admin User",
            is_staff=True,
            is_verified=True,
        )
        User.objects.filter(email="seller@wibestore.uz").delete()
        User.objects.create_user(
            email="seller@wibestore.uz",
            password="seller123",
            full_name="Top Seller",
            is_verified=True,
            rating=4.9,
            total_sales=150,
        )
        User.objects.filter(email="buyer@wibestore.uz").delete()
        User.objects.create_user(
            email="buyer@wibestore.uz",
            password="buyer123",
            full_name="Regular Buyer",
            is_verified=True,
            rating=5.0,
            total_purchases=25,
        )
        User.objects.filter(email="user@wibestore.uz").delete()
        User.objects.create_user(
            email="user@wibestore.uz",
            password="user123",
            full_name="Test User",
            is_verified=False,
        )
        self.stdout.write("Created test users")

    def create_listings(self):
        seller = User.objects.filter(email="seller@wibestore.uz").first()
        if not seller:
            return
        games = list(Game.objects.filter(is_active=True)[:20])
        listings_data = [
            {"title": "PUBG Mobile Account - Conqueror", "price": 500000, "game_slug": "pubg-mobile"},
            {"title": "Steam Account - 100+ Games", "price": 1200000, "game_slug": "steam"},
            {"title": "Genshin Impact AR 60", "price": 800000, "game_slug": "genshin-impact"},
            {"title": "CS:GO Prime Account", "price": 300000, "game_slug": "csgo"},
            {"title": "Dota 2 MMR 7000+", "price": 1500000, "game_slug": "dota-2"},
            {"title": "Valorant Radiant Account", "price": 2000000, "game_slug": "valorant"},
            {"title": "League of Legends Challenger", "price": 3000000, "game_slug": "league-of-legends"},
            {"title": "Free Fire Max Level", "price": 250000, "game_slug": "free-fire"},
            {"title": "Mobile Legends Mythic", "price": 400000, "game_slug": "mobile-legends"},
            {"title": "Clash of Clans TH15", "price": 600000, "game_slug": "clash-of-clans"},
        ]
        for data in listings_data:
            game = next((g for g in games if g.slug == data["game_slug"]), None)
            if game and seller:
                Listing.objects.create(
                    seller=seller,
                    game=game,
                    title=data["title"],
                    description=f"Premium {data['title']} for sale. Guaranteed safe and secure.",
                    price=data["price"],
                    status="active",
                    is_premium=random.choice([True, False]),
                )
        self.stdout.write("Created test listings")
