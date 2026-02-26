// WibeStore - Mock Data
// All prices in UZS (Uzbek Sum)

import getGamesList from './gamesList';

/** Barcha o'yinlar ro'yxati (faqat o'yinlar) */
export const games = getGamesList();

// Helper: API-formatga mos mock listing (bosh sahifa, mahsulotlar, batafsil uchun)
function mockListing(id, gameId, gameName, title, description, price, image, seller, isPremium) {
    return {
        id,
        gameId,
        gameName,
        game: { slug: gameId, id: gameId, name: gameName },
        title,
        description,
        price: String(price),
        image,
        images: [{ image }],
        seller: { ...seller, rating: seller.rating },
        isPremium: !!isPremium,
        is_premium: !!isPremium,
        is_favorited: false,
        status: 'active',
        createdAt: '2024-02-01'
    };
}

const _sellers = {
    pro: { id: 1, name: 'ProGamer_UZ', rating: 4.9, sales: 156, isPremium: true },
    gameStore: { id: 2, name: 'GameStore_TJ', rating: 4.7, sales: 89, isPremium: true },
    ffKing: { id: 3, name: 'FFKing_UZ', rating: 4.8, sales: 234, isPremium: false },
    so2: { id: 4, name: 'SO2Master', rating: 4.6, sales: 78, isPremium: true },
    mlbb: { id: 5, name: 'MLBB_Pro', rating: 4.9, sales: 167, isPremium: true },
    clash: { id: 6, name: 'ClashKing', rating: 4.8, sales: 45, isPremium: false },
    roblox: { id: 7, name: 'RobloxMaster', rating: 4.5, sales: 312, isPremium: false },
    pubgTrader: { id: 8, name: 'PUBGTrader', rating: 4.7, sales: 98, isPremium: false },
};

export const accounts = [
    mockListing(
        1, 'pubg-mobile', 'PUBG Mobile',
        'Conqueror hisobi - Season 25',
        'Daraja 75, 200+ skin, M416 Glacier, AWM Dragon, Kar98 Dragon. Roy Pass to\'liq, barcha mifrik skinlar. Email va parol beriladi, Escrow orqali xavfsiz.',
        2500000, '/img/Pubg/pg.jpg', _sellers.pro, true
    ),
    mockListing(
        2, 'steam', 'Steam Account',
        'Steam hisobi - 150+ o\'yin',
        'GTA V, CS2, Rust, PUBG, Dota 2, FIFA 24 va boshqa o\'yinlar. Steam Guard ochiq, email bilan birga. To\'liq access.',
        3800000, '/img/Steam/st.jpg', _sellers.gameStore, true
    ),
    mockListing(
        3, 'free-fire', 'Free Fire',
        'Heroic hisobi - 50+ personaj',
        'Chrono, Alok, K, Skyler. 100+ skin, Elite Pass 1–50 mavsum. Barcha maxsus personajlar ochiq. Tez yetkazib beriladi.',
        1200000, '/img/FireFree/fire.jpg', _sellers.ffKing, false
    ),
    mockListing(
        4, 'standoff2', 'Standoff 2',
        'Elite hisobi - noyob pichoklar',
        'Karambit Fade, M4A4 Howl, AK-47 Fire Serpent. Yuqori reyting, ko\'p skinlar. VK yoki email orqali bog\'langan.',
        1800000, '/img/icons/st.webp', _sellers.so2, true
    ),
    mockListing(
        5, 'mobile-legends', 'Mobile Legends',
        'Mythic Glory - barcha qahramonlar',
        '115+ qahramon, 200+ skin, Legendary va Collector skinlar. Emblem to\'liq. Mening profilim orqali tekshirishingiz mumkin.',
        2100000, '/img/icons/ml.webp', _sellers.mlbb, true
    ),
    mockListing(
        6, 'clash-of-clans', 'Clash of Clans',
        'TH14 Max hisob',
        'TH14 to\'liq max, 6 ta builder, barcha qahramonlar 80+. O\'g\'il qal’a, Giga Inferno. Faol klan bilan.',
        4500000, '/img/icons/cc.webp', _sellers.clash, false
    ),
    mockListing(
        7, 'codm', 'Call of Duty Mobile',
        'Legendary hisob - barcha qurollar',
        'Legendary daraja, 50+ legendary skin, Damascus camo. To\'liq RP, barcha operatorlar. Tezkor yetkazish.',
        1900000, '/img/icons/cal.webp', _sellers.pro, true
    ),
    mockListing(
        8, 'roblox', 'Roblox',
        'Boy hisob - 10K Robux',
        '10,000 Robux, Premium obuna, noyob limitedlar. Email va parol beriladi. Ad Blocker yoqilgan.',
        850000, '/img/icons/roblox.webp', _sellers.roblox, false
    ),
    mockListing(
        9, 'pubg-mobile', 'PUBG Mobile',
        'ACE hisobi - 150 skin',
        'Daraja 68, 150 skin, bir nechta mifrik, RP max. AWM, M4 mifrik skinlar. Kuniga 2 soat o\'ynalgan, xavfsiz.',
        1500000, '/img/Pubg/pg.jpg', _sellers.pubgTrader, false
    ),
    mockListing(
        10, 'steam', 'Steam Account',
        'CS2 hisobi - Global Elite',
        'Global Elite, 15k soat, Karambit Doppler pichog\'i. Ko\'p skinlar, 500+ o\'yin. Steam Guard va email bilan.',
        2800000, '/img/Steam/st.jpg', _sellers.gameStore, true
    ),
    mockListing(
        11, 'free-fire', 'Free Fire',
        'Grandmaster hisob - barcha petlar',
        'Barcha petlar va personajlar, 80+ skin. Elite Pass hozirgi mavsum to\'liq. Kuniga 1 soat, hisob toza.',
        950000, '/img/FireFree/fire.jpg', _sellers.ffKing, true
    ),
    mockListing(
        12, 'mobile-legends', 'Mobile Legends',
        'Mythic 50+ yulduz - collector skinlar',
        '50+ yulduz Mythic, barcha collector va Legend skinlar. Emblem 60. Profil ochiq, skrinshotlar bor.',
        3200000, '/img/icons/ml.webp', _sellers.mlbb, true
    ),
    mockListing(
        13, 'clash-of-clans', 'Clash of Clans',
        'TH13 max - tez sotuv',
        'TH13 to\'liq max, qahramonlar 75+. O\'g\'il qal’a. Klan wars uchun tayyor. Email bilan beriladi.',
        2800000, '/img/icons/cc.webp', _sellers.clash, false
    ),
    mockListing(
        14, 'standoff2', 'Standoff 2',
        'Yuqori reyting - ko\'p skinlar',
        'Gold rank, 30+ skin, noyob pichoklar. VK bog\'langan, email ham beriladi. Yordam bilan o\'tkazamiz.',
        1200000, '/img/icons/st.webp', _sellers.so2, false
    ),
    mockListing(
        15, 'pubg-mobile', 'PUBG Mobile',
        'Crown hisobi - 80 skin',
        'Daraja 55, 80 skin, RP to\'liq. Bir nechta mifrik. Telefon va email bilan, 24 soat ichida yetkazamiz.',
        1100000, '/img/Pubg/pg.jpg', _sellers.pubgTrader, false
    ),
    mockListing(
        16, 'codm', 'Call of Duty Mobile',
        'Master hisob - Damascus',
        'Master daraja, Damascus camo barcha qurollarda. 20+ legendary skin. Faol o\'yinchi, hisob xavfsiz.',
        1400000, '/img/icons/cal.webp', _sellers.pro, false
    ),
    mockListing(
        17, 'roblox', 'Roblox',
        'Premium + 5K Robux',
        'Roblox Premium obuna, 5000 Robux. Noyob limitedlar va kiyimlar. Email va parol to\'liq beriladi.',
        650000, '/img/icons/roblox.webp', _sellers.roblox, true
    ),
    mockListing(
        18, 'steam', 'Steam Account',
        'Steam - 50 ta mashhur o\'yin',
        'GTA V, RDR2, Elden Ring, Hogwarts Legacy va boshqalar. 2 yillik hisob, Steam Guard ochiq.',
        5200000, '/img/Steam/st.jpg', _sellers.gameStore, true
    ),
    mockListing(
        19, 'mobile-legends', 'Mobile Legends',
        'Epic hisob - 60+ qahramon',
        '60+ qahramon, 80+ skin. Epic daraja, emblem 45. Tez sotuv, narx kelishiladi. Profil ochiq.',
        750000, '/img/icons/ml.webp', _sellers.mlbb, false
    ),
    mockListing(
        20, 'free-fire', 'Free Fire',
        'Diamond hisob - 30 skin',
        'Diamond daraja, 30+ skin, 15+ personaj. Elite Pass 3 mavsum. Kuniga 30 daqiqa, hisob faol.',
        550000, '/img/FireFree/fire.jpg', _sellers.ffKing, false
    )
];

export const premiumPlans = [
    {
        id: 'premium',
        name: 'Premium',
        price: 99000, // UZS per month
        icon: '\u2B50',
        features: [
            "Tavsiyalarda 3x ko'proq chiqish",
            'Premium badge',
            "Bosh sahifada ko'rinish",
            "Qidiruvda yuqori pozitsiya",
            'Maxsus support'
        ],
        color: 'from-blue-500 to-blue-600'
    },
    {
        id: 'pro',
        name: 'Pro',
        price: 249000, // UZS per month
        icon: '\uD83D\uDC8E',
        features: [
            'Barcha Premium afzalliklari',
            'VIP golden badge',
            'Eng yuqori pozitsiya',
            "5% komissiya (standart 10%)",
            'Tezkor to\'lov (24 soat)',
            'Shaxsiy manager'
        ],
        color: 'from-yellow-400 to-orange-500',
        popular: true
    }
];

export const paymentMethods = [
    { id: 'google_pay', name: 'Google Pay', icon: '📱', logo: '/payments/google-pay.svg' },
    { id: 'visa', name: 'Visa Card', icon: '💳', logo: '/payments/visa.svg' },
    { id: 'mastercard', name: 'Mastercard', icon: '💳', logo: '/payments/mastercard.svg' },
    { id: 'apple_pay', name: 'Apple Pay', icon: '🍎', logo: '/payments/apple-pay.svg' },
];

// Commission rate - 10% for all sellers
export const COMMISSION_RATE = 0.10;

// Format price in UZS
export const formatPrice = (price) => {
    return new Intl.NumberFormat('uz-UZ', {
        style: 'decimal',
        minimumFractionDigits: 0
    }).format(price) + " so'm";
};

// Calculate commission
export const calculateCommission = (price) => {
    return price * COMMISSION_RATE;
};

// Calculate seller earnings
export const calculateSellerEarnings = (price) => {
    return price - calculateCommission(price);
};
