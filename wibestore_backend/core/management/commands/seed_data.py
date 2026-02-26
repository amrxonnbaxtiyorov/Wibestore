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
                defaults={"name": cat["name"]}
            )
        self.stdout.write("Created categories")

    def create_games(self):
        games = [
            # Mobile
            {"name": "PUBG Mobile", "slug": "pubg-mobile"},
            {"name": "Free Fire", "slug": "free-fire"},
            {"name": "Mobile Legends", "slug": "mobile-legends"},
            {"name": "Call of Duty Mobile", "slug": "codm"},
            {"name": "Clash of Clans", "slug": "clash-of-clans"},
            {"name": "Clash Royale", "slug": "clash-royale"},
            {"name": "Genshin Impact", "slug": "genshin"},
            {"name": "Honkai: Star Rail", "slug": "honkai-sr"},
            {"name": "Honkai Impact 3rd", "slug": "honkai-3rd"},
            {"name": "Roblox", "slug": "roblox"},
            {"name": "Minecraft", "slug": "minecraft"},
            {"name": "Standoff 2", "slug": "standoff2"},
            {"name": "Brawl Stars", "slug": "brawl-stars"},
            {"name": "League of Legends: Wild Rift", "slug": "wild-rift"},
            {"name": "PUBG: New State", "slug": "pubg-new-state"},
            {"name": "BGMI", "slug": "bgmi"},
            {"name": "State of Survival", "slug": "state-of-survival"},
            {"name": "Rise of Kingdoms", "slug": "rise-of-kingdoms"},
            {"name": "Lords Mobile", "slug": "lords-mobile"},
            {"name": "Top War", "slug": "top-war"},
            {"name": "Last Shelter: Survival", "slug": "last-shelter"},
            {"name": "Diablo Immortal", "slug": "diablo-immortal"},
            {"name": "Tower of Fantasy", "slug": "tower-of-fantasy"},
            {"name": "Arena Breakout", "slug": "arena-breakout"},
            {"name": "RAID: Shadow Legends", "slug": "raid"},
            {"name": "AFK Arena", "slug": "afk-arena"},
            {"name": "Epic Seven", "slug": "epic-seven"},
            {"name": "Summoners War", "slug": "summoners-war"},
            {"name": "eFootball / PES Mobile", "slug": "efootball"},
            {"name": "FIFA Mobile", "slug": "fifa-mobile"},
            {"name": "World of Tanks Blitz", "slug": "world-of-tanks-blitz"},
            {"name": "CrossFire: Legends", "slug": "crossfire-mobile"},
            {"name": "Asphalt 9: Legends", "slug": "asphalt-9"},
            {"name": "Cookie Run: Kingdom", "slug": "cookie-run"},
            {"name": "Among Us", "slug": "among-us"},
            {"name": "Brawlhalla", "slug": "brawlhalla-mobile"},
            # PC
            {"name": "Steam Account", "slug": "steam"},
            {"name": "CS:GO / CS2", "slug": "csgo"},
            {"name": "Dota 2", "slug": "dota2"},
            {"name": "Valorant", "slug": "valorant"},
            {"name": "League of Legends", "slug": "lol"},
            {"name": "World of Warcraft", "slug": "world-of-warcraft"},
            {"name": "Overwatch 2", "slug": "overwatch"},
            {"name": "Apex Legends", "slug": "apex"},
            {"name": "Fortnite", "slug": "fortnite"},
            {"name": "Call of Duty: Warzone", "slug": "cod-warzone"},
            {"name": "EA FC / FIFA", "slug": "fifa"},
            {"name": "Rust", "slug": "rust"},
            {"name": "GTA V Online", "slug": "gta5"},
            {"name": "Escape from Tarkov", "slug": "tarkov"},
            {"name": "Rainbow Six Siege", "slug": "rainbow-six"},
            {"name": "Rocket League", "slug": "rocket-league"},
            {"name": "PUBG (PC)", "slug": "pubg-pc"},
            {"name": "Lost Ark", "slug": "lost-ark"},
            {"name": "New World", "slug": "new-world"},
            {"name": "Diablo IV", "slug": "diablo-4"},
            {"name": "Path of Exile", "slug": "path-of-exile"},
            {"name": "Destiny 2", "slug": "destiny-2"},
            {"name": "Warframe", "slug": "warframe"},
            {"name": "Final Fantasy XIV", "slug": "ff14"},
            {"name": "Black Desert Online", "slug": "black-desert"},
            {"name": "Guild Wars 2", "slug": "guild-wars-2"},
            {"name": "The Elder Scrolls Online", "slug": "eso"},
            {"name": "RuneScape / OSRS", "slug": "runescape"},
            {"name": "Minecraft Java", "slug": "minecraft-java"},
            {"name": "Paladins", "slug": "paladins"},
            {"name": "Team Fortress 2", "slug": "tf2"},
            {"name": "Hunt: Showdown", "slug": "hunt-showdown"},
            {"name": "DayZ", "slug": "dayz"},
            {"name": "ARK: Survival Evolved", "slug": "ark"},
            {"name": "Sea of Thieves", "slug": "sea-of-thieves"},
            {"name": "Hearthstone", "slug": "hearthstone"},
            {"name": "Elden Ring", "slug": "elden-ring"},
            {"name": "Dead by Daylight", "slug": "dead-by-daylight"},
            {"name": "Phasmophobia", "slug": "phasmophobia"},
            {"name": "Fall Guys", "slug": "fall-guys"},
            # Platforms
            {"name": "Epic Games", "slug": "epic"},
            {"name": "Ubisoft Connect", "slug": "ubisoft"},
            {"name": "EA / Origin", "slug": "origin"},
            {"name": "Battle.net", "slug": "blizzard"},
            {"name": "Riot Games", "slug": "riot"},
            {"name": "Xbox Account", "slug": "xbox"},
            {"name": "PlayStation PSN", "slug": "playstation"},
        ]
        for game_data in games:
            Game.objects.get_or_create(
                slug=game_data["slug"],
                defaults={
                    "name": game_data["name"],
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
                    "price_monthly": plan["price"],
                    "price_yearly": plan["price"] * 12,
                    "commission_rate": plan["commission_rate"],
                    "features": plan["features"],
                    "is_active": True,
                    "is_premium": plan["slug"] != "free",
                    "is_pro": plan["slug"] == "pro",
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
