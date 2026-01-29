import { Crown, Star, Flame } from 'lucide-react';
import AccountCard from '../components/AccountCard';
import { accounts } from '../data/mockData';

const TopAccountsPage = () => {
    // Sort by rating and premium status
    const topAccounts = [...accounts].sort((a, b) => {
        // Premium accounts first
        if (a.isPremium && !b.isPremium) return -1;
        if (!a.isPremium && b.isPremium) return 1;
        // Then by rating
        return b.seller.rating - a.seller.rating;
    });

    return (
        <div className="bt min-h-screen pt-24 pb-16 ">
            <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
                {/* Header */}
                <div className="bs text-center mb-12">
                    <div className="inline-flex items-center gap-2 px-4 py-2 bg-orange-500/10 border border-orange-500/30 rounded-full text-orange-400 text-sm font-medium mb-6">
                        <Flame className="w-4 h-4" />
                        Eng yaxshilar
                    </div>
                    <h1 className="text-4xl font-bold text-white mb-4">
                        Top <span className="bg-gradient-to-r from-orange-400 to-red-400 bg-clip-text text-transparent">akkauntlar</span>
                    </h1>
                    <div className="text1">
                    <p className=" text-gray-400 max-w-2xl mx-auto">
                        Eng yuqori reytingli va ishonchli sotuvchilardan eng yaxshi akkauntlar
                    </p>

                    </div>
                </div>

                {/* Stats */}
                <div className="bs grid grid-cols-1 sm:grid-cols-3 gap-4 mb-12">
                    <div className="height-w bg-gradient-to-b from-[#1e1e32] to-[#25253a] rounded-2xl p-6 border border-white/5 text-center">
                        <Crown className="w-8 h-8 text-yellow-400 mx-auto mb-3" />
                        <div className="text-2xl font-bold text-white mb-1">Premium</div>
                        <div className="text-gray-400 text-sm">Ishonchli sotuvchilar</div>
                    </div>
                    <div className="height-w bg-gradient-to-b from-[#1e1e32] to-[#25253a] rounded-2xl p-6 border border-white/5 text-center">
                        <Star className="w-8 h-8 text-yellow-400 mx-auto mb-3" />
                        <div className="text-2xl font-bold text-white mb-1">4.5+ Reyting</div>
                        <div className="text-gray-400 text-sm">Faqat yuqori baholanganlar</div>
                    </div>
                    <div className="height-w bg-gradient-to-b from-[#1e1e32] to-[#25253a] rounded-2xl p-6 border border-white/5 text-center">
                        <Flame className="w-8 h-8 text-orange-400 mx-auto mb-3" />
                        <div className="text-2xl font-bold text-white mb-1">100+ Sotuvlar</div>
                        <div className="text-gray-400 text-sm">Tajribali sotuvchilar</div>
                    </div>
                </div>

                {/* Accounts Grid */}
                <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4 gap-6">
                    {topAccounts.map((account) => (
                        <AccountCard key={account.id} account={account} />
                    ))}
                </div>
            </div>
        </div>
    );
};

export default TopAccountsPage;
