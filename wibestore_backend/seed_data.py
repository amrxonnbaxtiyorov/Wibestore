"""
WibeStore - Test ma'lumotlarini yaratish
"""
from apps.games.models import Game
from apps.marketplace.models import Listing
from apps.accounts.models import User

# Test sotuvchini yaratish
print("Test sotuvchi yaratilmoqda...")
seller, created = User.objects.get_or_create(
    email='seller@test.com',
    defaults={
        'username': 'ProGamer_UZ',
        'full_name': 'Pro Gamer',
        'is_active': True,
        'is_verified': True,
    }
)
if created:
    seller.set_password('password123')
    seller.save()
    print(f"  ✓ Sotuvchi yaratildi: {seller.username}")
else:
    print(f"  - Sotuvchi allaqachon mavjud: {seller.username}")

# Test akkauntlarni yaratish
print("\nTest akkauntlar yaratilmoqda...")
pubg_game = Game.objects.filter(slug='pubg-mobile').first()
steam_game = Game.objects.filter(slug='steam').first()
freefire_game = Game.objects.filter(slug='free-fire').first()
ml_game = Game.objects.filter(slug='mobile-legends').first()
roblox_game = Game.objects.filter(slug='roblox').first()
codm_game = Game.objects.filter(slug='codm').first()

accounts_data = [
    {
        'title': 'PUBG Conqueror Account - Season 25',
        'description': 'Level 75, 200+ skins, M416 Glacier, AWM Dragon',
        'price': '2500000',
        'game': pubg_game,
    },
    {
        'title': 'Steam Account - 150+ Games',
        'description': 'GTA V, CS2, Rust, PUBG, Dota 2, FIFA 24',
        'price': '3800000',
        'game': steam_game,
    },
    {
        'title': 'PUBG ACE Account - 150 Skins',
        'description': 'Level 68, 150 skins, multiple mythics',
        'price': '1500000',
        'game': pubg_game,
    },
    {
        'title': 'Steam CS2 Account - Global Elite',
        'description': 'Global Elite, 15k hours, Knife Karambit',
        'price': '2800000',
        'game': steam_game,
    },
    {
        'title': 'Free Fire Heroic Account',
        'description': '50+ Characters, Chrono, Alok, K, Skyler',
        'price': '1200000',
        'game': freefire_game,
    },
    {
        'title': 'Mobile Legends Mythic Glory',
        'description': '115+ heroes, 200+ skins, Legendary skins',
        'price': '2100000',
        'game': ml_game,
    },
    {
        'title': 'Roblox Rich Account - 10K Robux',
        'description': '10,000 Robux, Premium membership, rare limiteds',
        'price': '850000',
        'game': roblox_game,
    },
    {
        'title': 'CODM Legendary Account',
        'description': 'Legendary rank, 50+ legendary skins, Damascus camo',
        'price': '1900000',
        'game': codm_game,
    },
]

for account_data in accounts_data:
    if account_data['game']:
        listing, created = Listing.objects.get_or_create(
            title=account_data['title'],
            defaults={
                'description': account_data['description'],
                'price': account_data['price'],
                'game': account_data['game'],
                'seller': seller,
                'is_premium': True,
                'status': 'active',
            }
        )
        if created:
            print(f"  ✓ {listing.title} yaratildi")
        else:
            print(f"  - {listing.title} allaqachon mavjud")

print("\n✅ Test ma'lumotlar tayyor!")
print(f"\nJami o'yinlar: {Game.objects.count()}")
print(f"Jami akkauntlar: {Listing.objects.count()}")
print(f"\nLogin qilish uchun: seller@test.com / password123")
