// WibeStore - Utility functions and static data

import getGamesList from ‘./gamesList’;

/** Barcha o’yinlar ro’yxati (faqat o’yinlar) */
export const games = getGamesList();

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
