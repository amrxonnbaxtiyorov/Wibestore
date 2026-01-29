import { Link } from 'react-router-dom';
import { Check, Crown, Star, Zap, Shield, TrendingUp, X } from 'lucide-react';
import { premiumPlans, formatPrice } from '../data/mockData';

const PremiumPage = () => {
    const features = {
        free: [
            { text: 'Akkauntlarni sotish', included: true },
            { text: "10% komissiya", included: true },
            { text: 'Standart pozitsiya', included: true },
            { text: 'Asosiy statistika', included: true },
            { text: "Premium badge", included: false },
            { text: "Bosh sahifada ko'rinish", included: false },
            { text: 'Tezkor to\'lov', included: false },
            { text: 'Shaxsiy manager', included: false },
        ],
        premium: [
            { text: 'Akkauntlarni sotish', included: true },
            { text: "10% komissiya", included: true },
            { text: "Tavsiyalarda 3x ko'proq", included: true },
            { text: 'Premium ⭐ badge', included: true },
            { text: "Bosh sahifada ko'rinish", included: true },
            { text: "Qidiruvda yuqori pozitsiya", included: true },
            { text: 'Maxsus support', included: true },
            { text: 'Shaxsiy manager', included: false },
        ],
        pro: [
            { text: 'Akkauntlarni sotish', included: true },
            { text: "0% komissiya (standart 10%)", included: true },
            { text: "Eng yuqori pozitsiya", included: true },
            { text: 'VIP 💎 golden badge', included: true },
            { text: "Bosh sahifada birinchi", included: true },
            { text: 'Tezkor to\'lov (24 soat)', included: true },
            { text: 'Maxsus VIP support', included: true },
            { text: 'Shaxsiy manager', included: true },
        ],
    };

    const plans = [
        {
            id: 'free',
            name: 'Free',
            price: 0,
            icon: '🆓',
            description: 'Boshlash uchun',
            color: 'from-gray-600 to-gray-700',
            buttonClass: 'bg-[#25253a] hover:bg-[#2a2a45] text-white',
            features: features.free
        },
        {
            id: 'premium',
            name: 'Premium',
            price: 99000,
            icon: '⭐',
            description: "Ko'proq ko'rinish",
            color: 'from-purple-500 to-pink-500',
            buttonClass: 'bg-gradient-to-r from-purple-500 to-pink-500 hover:opacity-90 text-white',
            features: features.premium
        },
        {
            id: 'pro',
            name: 'Pro',
            price: 249000,
            icon: '💎',
            description: 'Maksimal imkoniyatlar',
            color: 'from-yellow-400 to-orange-500',
            buttonClass: 'bg-gradient-to-r from-yellow-400 to-orange-500 hover:opacity-90 text-black font-semibold',
            features: features.pro,
            popular: true
        }
    ];

    return (
        <div className="min-h-screen pt-24 pb-16">
            <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
                {/* Header */}
                <div className="text-center mb-16">
                    <div className="inline-flex items-center gap-2 px-4 py-2 bg-yellow-400/10 border border-yellow-400/30 rounded-full text-yellow-400 text-sm font-medium mb-6">
                        <Crown className="w-4 h-4" />
                        Premium obuna
                    </div>
                    <h1 className="text-4xl lg:text-5xl font-bold text-white mb-6">
                        Sotuvlaringizni <span className="bg-gradient-to-r from-yellow-400 to-orange-400 bg-clip-text text-transparent">oshiring</span>
                    </h1>
                    <p className="text-lg text-gray-400 max-w-2xl mx-auto">
                        Premium obuna bilan akkauntlaringiz ko'proq ko'rinadi, tezroq sotiladi va ko'proq daromad keltiradi
                    </p>
                </div>

                {/* Pricing Cards */}
                <div className="grid grid-cols-1 md:grid-cols-3 gap-8 mb-16">
                    {plans.map((plan) => (
                        <div
                            key={plan.id}
                            className={`relative bg-[#1e1e32] rounded-3xl p-8 border transition-all duration-300 hover:-translate-y-2 ${plan.popular
                                ? 'border-yellow-400/50 shadow-xl shadow-yellow-500/10'
                                : 'border-white/5 hover:border-purple-500/30'
                                }`}
                        >
                            {/* Popular Badge */}
                            {plan.popular && (
                                <div className="absolute -top-4 left-1/2 -translate-x-1/2 px-4 py-1 bg-gradient-to-r from-yellow-400 to-orange-500 rounded-full text-sm font-bold text-black">
                                    🔥 Eng mashhur
                                </div>
                            )}

                            {/* Icon & Name */}
                            <div className="text-center mb-6">
                                <div className={`w-16 h-16 mx-auto mb-4 bg-gradient-to-br ${plan.color} rounded-2xl flex items-center justify-center text-3xl shadow-lg`}>
                                    {plan.icon}
                                </div>
                                <h3 className="text-2xl font-bold text-white">{plan.name}</h3>
                                <p className="text-gray-400 text-sm">{plan.description}</p>
                            </div>

                            {/* Price */}
                            <div className="text-center mb-8">
                                {plan.price > 0 ? (
                                    <>
                                        <span className="text-4xl font-bold text-white">{formatPrice(plan.price)}</span>
                                        <span className="text-gray-400">/oy</span>
                                    </>
                                ) : (
                                    <span className="text-4xl font-bold text-white">Bepul</span>
                                )}
                            </div>

                            {/* Features */}
                            <ul className="space-y-4 mb-8">
                                {plan.features.map((feature, index) => (
                                    <li key={index} className="flex items-center gap-3">
                                        {feature.included ? (
                                            <div className="w-5 h-5 rounded-full bg-green-500/20 flex items-center justify-center">
                                                <Check className="w-3 h-3 text-green-400" />
                                            </div>
                                        ) : (
                                            <div className="w-5 h-5 rounded-full bg-gray-700/50 flex items-center justify-center">
                                                <X className="w-3 h-3 text-gray-500" />
                                            </div>
                                        )}
                                        <span className={feature.included ? 'text-gray-300' : 'text-gray-500'}>
                                            {feature.text}
                                        </span>
                                    </li>
                                ))}
                            </ul>

                            {/* Button */}
                            <button className={`w-full py-4 rounded-xl font-semibold transition-all ${plan.buttonClass}`}>
                                {plan.price > 0 ? 'Sotib olish' : 'Hozirgi reja'}
                            </button>
                        </div>
                    ))}
                </div>

                {/* Benefits Section */}
                <div className="bg-gradient-to-b from-[#1e1e32] to-[#25253a] rounded-3xl p-8 lg:p-12 border border-white/5 mb-16">
                    <div className="text-center mb-12">
                        <h2 className="text-3xl font-bold text-white mb-4">Premium afzalliklari</h2>
                        <p className="text-gray-400">Nima uchun sotuvchilar Premium tanlaydi?</p>
                    </div>

                    <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6">
                        {[
                            {
                                icon: TrendingUp,
                                title: "3x ko'proq ko'rinish",
                                description: "Akkauntlaringiz tavsiyalarda va qidiruvda ko'proq chiqadi",
                                color: 'from-purple-500 to-pink-500'
                            },
                            {
                                icon: Zap,
                                title: "Tezkor sotish",
                                description: "Premium sotuvchilar o'rtacha 2x tezroq sotadi",
                                color: 'from-cyan-500 to-blue-500'
                            },
                            {
                                icon: Shield,
                                title: "Ishonch badge'i",
                                description: "Xaridorlar Premium sotuvchilarga ko'proq ishonadi",
                                color: 'from-green-500 to-emerald-500'
                            },
                            {
                                icon: Star,
                                title: 'Yuqori pozitsiya',
                                description: "Bosh sahifa va qidiruv natijalarida birinchi bo'ling",
                                color: 'from-yellow-400 to-orange-500'
                            }
                        ].map((benefit, index) => (
                            <div key={index} className="text-center p-6">
                                <div className={`w-14 h-14 mx-auto mb-4 bg-gradient-to-br ${benefit.color} rounded-2xl flex items-center justify-center shadow-lg`}>
                                    <benefit.icon className="w-7 h-7 text-white" />
                                </div>
                                <h3 className="text-lg font-semibold text-white mb-2">{benefit.title}</h3>
                                <p className="text-sm text-gray-400">{benefit.description}</p>
                            </div>
                        ))}
                    </div>
                </div>

                {/* Payment Methods */}
                <div className="text-center">
                    <h3 className="text-xl font-semibold text-white mb-6">To'lov usullari</h3>
                    <div className="flex items-center justify-center gap-6 flex-wrap">
                        {/* Payme */}
                        <div className="px-6 py-4 bg-[#1e1e32] rounded-xl hover:bg-[#25253a] transition-colors">
                            <svg className="h-8 w-auto" viewBox="0 0 120 40" xmlns="http://www.w3.org/2000/svg">
                                <rect width="120" height="40" rx="8" fill="#00CCCC" />
                                <text x="60" y="26" textAnchor="middle" fill="white" fontSize="16" fontWeight="bold" fontFamily="Arial, sans-serif">payme</text>
                            </svg>
                        </div>

                        {/* Click */}
                        <div className="px-6 py-4 bg-[#1e1e32] rounded-xl hover:bg-[#25253a] transition-colors">
                            <svg className="h-8 w-auto" viewBox="0 0 120 40" xmlns="http://www.w3.org/2000/svg">
                                <rect width="120" height="40" rx="8" fill="#0095FF" />
                                <circle cx="25" cy="20" r="8" fill="white" />
                                <circle cx="25" cy="20" r="4" fill="#0095FF" />
                                <text x="72" y="26" textAnchor="middle" fill="white" fontSize="16" fontWeight="bold" fontFamily="Arial, sans-serif">Click</text>
                            </svg>
                        </div>

                        {/* Paynet */}
                        <div className="px-6 py-4 bg-[#1e1e32] rounded-xl hover:bg-[#25253a] transition-colors">
                            <svg className="h-8 w-auto" viewBox="0 0 120 40" xmlns="http://www.w3.org/2000/svg">
                                <rect width="120" height="40" rx="8" fill="#FFB800" />
                                <text x="60" y="26" textAnchor="middle" fill="#1a1a2e" fontSize="14" fontWeight="bold" fontFamily="Arial, sans-serif">PAYNET</text>
                            </svg>
                        </div>

                        {/* Uzcard */}
                        <div className="px-6 py-4 bg-[#1e1e32] rounded-xl hover:bg-[#25253a] transition-colors">
                            <svg className="h-8 w-auto" viewBox="0 0 120 40" xmlns="http://www.w3.org/2000/svg">
                                <rect width="120" height="40" rx="8" fill="#00B140" />
                                <text x="60" y="26" textAnchor="middle" fill="white" fontSize="14" fontWeight="bold" fontFamily="Arial, sans-serif">UZCARD</text>
                            </svg>
                        </div>

                        {/* Humo */}
                        <div className="px-6 py-4 bg-[#1e1e32] rounded-xl hover:bg-[#25253a] transition-colors">
                            <svg className="h-8 w-auto" viewBox="0 0 120 40" xmlns="http://www.w3.org/2000/svg">
                                <rect width="120" height="40" rx="8" fill="#E31E24" />
                                <text x="60" y="26" textAnchor="middle" fill="white" fontSize="16" fontWeight="bold" fontFamily="Arial, sans-serif">HUMO</text>
                            </svg>
                        </div>
                    </div>
                    <p className="text-gray-500 text-sm mt-6">Obuna har oy avtomatik uzaytiriladi. Istalgan vaqt bekor qilish mumkin.</p>
                </div>
            </div>
        </div>
    );
};

export default PremiumPage;
