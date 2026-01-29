import { Link } from 'react-router-dom';
import { ArrowRight, Shield, Zap, Users, TrendingUp, Star, Crown } from 'lucide-react';
import GameCard from '../components/GameCard';
import AccountCard from '../components/AccountCard';
import { games, accounts } from '../data/mockData';

const HomePage = () => {
    const premiumAccounts = accounts.filter(acc => acc.isPremium).slice(0, 6);
    const recommendedAccounts = accounts.slice(0, 8);

    const stats = [
        { value: '12,500+', label: 'Akkauntlar', icon: TrendingUp },
        { value: '5,000+', label: 'Sotuvchilar', icon: Users },
        { value: '98%', label: 'Muvaffaqiyat', icon: Zap },
    ];

    return (
        <div className="min-h-screen cons page-enter">
            {/* Hero Section */}
            <section className="relative pt-32 pb-20 overflow-hidden">
                {/* Background effect */}
                <div className="absolute top-1/2 left-1/2 -translate-x-1/2 -translate-y-1/2 w-[800px] h-[800px] bg-gradient-radial from-purple-500/15 to-transparent rounded-full blur-3xl animate-float" />

                <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 relative ">

                    <div className="text-center cons">
                        {/* Badge */}
                        <div className="za inline-flex items-center gap-2 px-4 py-2 bg-cyan-500/10 border border-cyan-500/30 rounded-full text-cyan-400 text-sm font-medium mb-6 animate-fadeInUp">
                            <Shield className="w-4 h-4" />
                            100% xavfsiz savdo kafolati
                        </div>

                        {/* Heading */}
                        <h1 className="text-4xl sm:text-5xl lg:text-6xl font-bold text-white mb-6 animate-fadeInUp" style={{ animationDelay: '0.1s' }}>
                            O'yin akkauntlari uchun <br />
                            <span className="bg-gradient-to-r from-purple-400 via-pink-400 to-cyan-400 bg-clip-text text-transparent">
                                ishonchli marketplace
                            </span>
                        </h1>

                        {/* Subtitle */}
                        <div className="bad">

                            <p className="text-lg text-gray-400 max-w-2xl mx-auto mb-10 animate-fadeInUp" style={{ animationDelay: '0.2s' }}>
                                PUBG Mobile, Free Fire, Steam va boshqa o'yinlar uchun akkauntlarni xavfsiz sotib oling yoki soting.
                                Payme, Click, Paynet orqali to'lang.
                            </p>
                        </div>

                        {/* CTA Buttons */}
                        <div className="flex flex-col sm:flex-row items-center justify-center gap-4 animate-fadeInUp" style={{ animationDelay: '0.3s' }}>
                            <Link
                                to="/products"
                                className="w-full sm:w-auto flex items-center justify-center gap-2 px-8 py-4 rounded-xl font-semibold text-white bg-gradient-to-r from-purple-500 to-pink-500 shadow-lg shadow-purple-500/30 hover:shadow-purple-500/50 hover:-translate-y-1 transition-all duration-300"
                            >
                                Akkauntlarni ko'rish
                                <ArrowRight className="w-5 h-5" />
                            </Link>
                            <Link
                                to="/signup"
                                className="w-full sm:w-auto flex items-center justify-center gap-2 px-8 py-4 rounded-xl font-semibold text-white bg-[#25253a] border border-white/10 hover:border-purple-500/50 hover:bg-white/5 transition-all duration-300"
                            >
                                Sotuvchi bo'lish
                            </Link>
                        </div>

                        {/* Stats */}
                        <div className="flex flex-wrap items-center justify-center gap-8 lg:gap-16 mt-16 animate-fadeInUp" style={{ animationDelay: '0.4s' }}>
                            {stats.map((stat, index) => (
                                <div key={index} className="text-center">
                                    <div className="flex items-center justify-center gap-2 mb-1">
                                        <stat.icon className="w-5 h-5 text-purple-400" />
                                        <span className="text-3xl font-bold bg-gradient-to-r from-purple-400 to-pink-400 bg-clip-text text-transparent">
                                            {stat.value}
                                        </span>
                                    </div>
                                    <span className="text-sm text-gray-500">{stat.label}</span>
                                </div>
                            ))}
                        </div>
                    </div>
                </div>
            </section>

            {/* Games Grid Section */}
            <section className="py-16 c2">
                <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
                    <div className="flex items-center justify-between mb-8">
                        <h2 className="flex items-center gap-3 text-2xl font-bold text-white">
                            <span className="text-2xl">🎮</span>
                            Mashhur o'yinlar
                        </h2>
                        <Link to="/products" className="flex items-center gap-1 text-purple-400 hover:text-purple-300 font-medium transition-colors">
                            Barchasi
                            <ArrowRight className="w-4 h-4" />
                        </Link>
                    </div>

                    <div className="grid grid-cols-2 sm:grid-cols-3 lg:grid-cols-4 gap-4 lg:gap-6">
                        {games.map((game) => (
                            <GameCard key={game.id} game={game} />
                        ))}
                    </div>
                </div>
            </section>

            {/* Premium Accounts Section */}
            <section className="py-16 relative">
                {/* Premium gradient background */}
                <div className="absolute inset-0 bg-gradient-to-b from-transparent via-yellow-500/[0.02] to-transparent pointer-events-none" />
                <div className="absolute top-0 left-0 right-0 h-px bg-gradient-to-r from-transparent via-yellow-500/30 to-transparent" />

                <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 relative">
                    <div className="flex items-center justify-between mb-8">
                        <h2 className="flex items-center gap-3 text-2xl font-bold text-white">
                            <Crown className="w-6 h-6 text-yellow-400" />
                            Premium akkauntlar
                        </h2>
                        <Link to="/top" className="flex items-center gap-1 text-yellow-400 hover:text-yellow-300 font-medium transition-colors">
                            Barchasi
                            <ArrowRight className="w-4 h-4" />
                        </Link>
                    </div>

                    {/* Horizontal scroll slider */}
                    <div className="flex gap-6 overflow-x-auto pb-4 snap-x snap-mandatory scrollbar-hide -mx-4 px-4">
                        {premiumAccounts.map((account) => (
                            <AccountCard key={account.id} account={account} featured />
                        ))}
                    </div>
                </div>
            </section>

            {/* Recommended Accounts Section */}
            <section className="py-16">
                <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
                    <div className="flex items-center justify-between mb-8">
                        <h2 className="flex items-center gap-3 text-2xl font-bold text-white">
                            <Star className="w-6 h-6 text-cyan-400" />
                            Tavsiya etilgan
                        </h2>
                        <Link to="/products" className="flex items-center gap-1 text-purple-400 hover:text-purple-300 font-medium transition-colors">
                            Ko'proq
                            <ArrowRight className="w-4 h-4" />
                        </Link>
                    </div>

                    <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4 gap-6">
                        {recommendedAccounts.map((account) => (
                            <AccountCard key={account.id} account={account} />
                        ))}
                    </div>
                </div>
            </section>

            {/* Trust Section */}
            <section className="py-16 pag">
                <div className=" max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
                    <div className="h-[300px] padd  bg-gradient-to-b from-[#1e1e32] to-[#25253a] rounded-3xl p-8 lg:p-12 border border-white/5">
                        <div className=" text-center mb-12">
                            <h2 className="text-3xl font-bold text-white mb-4">
                                Nega <span className="text-purple-400">WibeStore</span>?
                            </h2>
                            <div className='c1'>
                                <p className="text-gray-400 max-w-2xl mx-auto text-center">
                                    Biz xavfsizlik va ishonchni birinchi o'ringa qo'yamiz
                                </p>

                            </div>
                        </div>
                        <br />
                        <div className="grid grid-cols-1 md:grid-cols-3 gap-8">
                            {[
                                {
                                    icon: Shield,
                                    title: 'Xavfsiz to\'lov',
                                    description: 'Escrow tizimi - pul faqat akkaunt tasdiqlangandan so\'ng sotuvchiga o\'tkaziladi',
                                    color: 'from-green-500 to-emerald-500'
                                },
                                {
                                    icon: Zap,
                                    title: 'Tezkor yetkazish',
                                    description: 'Ko\'p akkauntlar darhol yetkazib beriladi. Premium sotuvchilar 24 soat ichida',
                                    color: 'from-purple-500 to-pink-500'
                                },
                                {
                                    icon: Users,
                                    title: '24/7 Qo\'llab-quvvatlash',
                                    description: 'Muammolar bo\'lsa, bizning jamoamiz har doim yordam berishga tayyor',
                                    color: 'from-cyan-500 to-blue-500'
                                }
                            ].map((feature, index) => (
                                <div key={index} className="flex flex-col items-center text-center p-8 lg:p-10 rounded-2xl bg-white/[0.02] hover:bg-white/[0.05] transition-colors">
                                    <div className={`w-14 h-14 mb-5 bg-gradient-to-br ${feature.color} rounded-2xl flex items-center justify-center shadow-lg`}>
                                        <feature.icon className="w-7 h-7 text-white" />
                                    </div>
                                    <h3 className="text-lg font-semibold text-white mb-3">{feature.title}</h3>
                                    <p className="text-sm text-gray-400 leading-relaxed max-w-xs">{feature.description}</p>
                                </div>
                            ))}
                        </div>
                    </div>
                </div>
            </section>

            {/* CTA Section */}
            <section className="py-16 c3">
                <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
                    <div className="gr relative overflow-hidden rounded-3xl bg-gradient-to-r from-purple-600 to-pink-600 p-8 lg:p-12">
                        {/* Background pattern */}
                        <div className="absolute inset-0 opacity-10">
                            <div className="absolute top-0 right-0 w-64 h-64 bg-white rounded-full blur-3xl" />
                            <div className="absolute bottom-0 left-0 w-64 h-64 bg-white rounded-full blur-3xl" />
                        </div>

                        <div className="relative text-center">
                            <h2 className="text-3xl lg:text-4xl font-bold text-white mb-4">
                                Akkauntlaringizni soting!
                            </h2>
                            <div className="c4">
                                <p className="text-white/80 max-w-2xl mx-auto mb-8">
                                    Premium va oddiy sotuvchilar uchun imkoniyat. Faqat 10% komissiya.
                                    Payme, Click, Paynet orqali pul oling.
                                </p>
                            </div>
                            <div className="flex flex-col sm:flex-row items-center justify-center gap-4">
                                <Link
                                    to="/signup"
                                    className="w-full sm:w-auto flex items-center justify-center gap-2 px-8 py-4 rounded-xl font-semibold text-white border-2 border-white/30 hover:bg-white/10 transition-colors"
                                >
                                    Hoziroq boshlash
                                </Link>
                                <Link
                                    to="/premium"
                                    className="w-full sm:w-auto flex items-center justify-center gap-2 px-8 py-4 rounded-xl font-semibold text-white border-2 border-white/30 hover:bg-white/10 transition-colors"
                                >
                                    <Crown className="w-5 h-5" />
                                    Premium olish
                                </Link>
                            </div>
                        </div>
                    </div>
                </div>
            </section>
        </div>
    );
};

export default HomePage;
