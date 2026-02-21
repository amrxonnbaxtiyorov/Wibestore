import { useState } from 'react';
import { Link } from 'react-router-dom';
import { Trophy, TrendingUp, Users, ShoppingBag, Star, Medal, Crown, Award } from 'lucide-react';
import { useLanguage } from '../context/LanguageContext';

const StatisticsPage = () => {
    const { t } = useLanguage();
    const [activeTab, setActiveTab] = useState('sellers');

    const topSellers = [
        { id: 1, name: 'GameMaster_UZ', sales: 156, rating: 4.9, premium: 'premium' },
        { id: 2, name: 'ProGamer777', sales: 142, rating: 4.8, premium: 'pro' },
        { id: 3, name: 'AccountKing', sales: 128, rating: 4.7, premium: 'premium' },
        { id: 4, name: 'EliteSeller', sales: 115, rating: 4.9, premium: null },
        { id: 5, name: 'TopTrader', sales: 98, rating: 4.6, premium: 'pro' },
        { id: 6, name: 'FastDeals', sales: 87, rating: 4.5, premium: null },
        { id: 7, name: 'TrustySeller', sales: 76, rating: 4.8, premium: 'premium' },
        { id: 8, name: 'QuickSale', sales: 65, rating: 4.4, premium: null },
        { id: 9, name: 'BestPrice', sales: 54, rating: 4.7, premium: 'pro' },
        { id: 10, name: 'SafeTrade', sales: 43, rating: 4.6, premium: null },
    ];

    const activeUsers = [
        { id: 1, name: 'ActivePlayer1', activity: 98, purchases: 45, sales: 32 },
        { id: 2, name: 'DailyGamer', activity: 95, purchases: 38, sales: 28 },
        { id: 3, name: 'TrueCollector', activity: 92, purchases: 52, sales: 15 },
        { id: 4, name: 'GameHunter', activity: 89, purchases: 41, sales: 22 },
        { id: 5, name: 'TopBuyer', activity: 85, purchases: 67, sales: 8 },
        { id: 6, name: 'RegularUser', activity: 82, purchases: 29, sales: 35 },
        { id: 7, name: 'ProCollector', activity: 78, purchases: 48, sales: 12 },
        { id: 8, name: 'FastBuyer', activity: 75, purchases: 33, sales: 18 },
        { id: 9, name: 'SmartTrader', activity: 72, purchases: 25, sales: 41 },
        { id: 10, name: 'NewStar', activity: 68, purchases: 19, sales: 24 },
    ];

    const getRankIcon = (index) => {
        if (index === 0) return <Crown className="w-5 h-5" style={{ color: 'var(--color-premium-gold-light)' }} />;
        if (index === 1) return <Medal className="w-5 h-5" style={{ color: 'var(--color-text-muted)' }} />;
        if (index === 2) return <Award className="w-5 h-5" style={{ color: 'var(--color-accent-orange)' }} />;
        return <span style={{ fontSize: 'var(--font-size-sm)', fontWeight: 'var(--font-weight-bold)', color: 'var(--color-text-muted)' }}>{index + 1}</span>;
    };

    const getPremiumBadge = (type) => {
        if (type === 'premium') return <span className="badge badge-blue" style={{ fontSize: '10px', padding: '1px 6px' }}>Premium</span>;
        if (type === 'pro') return <span className="badge badge-purple" style={{ fontSize: '10px', padding: '1px 6px' }}>Pro</span>;
        return null;
    };

    const stats = [
        { icon: Users, label: t('stats.total_users') || 'Total Users', value: '1,234', color: 'var(--color-accent-blue)' },
        { icon: ShoppingBag, label: t('stats.total_sales') || 'Total Sales', value: '5,678', color: 'var(--color-accent-green)' },
        { icon: Star, label: t('stats.avg_rating') || 'Avg Rating', value: '4.8', color: 'var(--color-premium-gold-light)' },
        { icon: TrendingUp, label: t('stats.growth') || 'Monthly Growth', value: '+23%', color: 'var(--color-accent-blue)' },
    ];

    return (
        <div className="page-enter" style={{ minHeight: '100vh', paddingBottom: '64px' }}>
            <div className="gh-container" style={{ maxWidth: '900px' }}>
                {/* Breadcrumbs */}
                <div className="breadcrumbs">
                    <Link to="/">{t('common.home')}</Link>
                    <span className="breadcrumb-separator">/</span>
                    <span className="breadcrumb-current">{t('nav.statistics') || 'Statistics'}</span>
                </div>

                {/* Header */}
                <div className="text-center" style={{ paddingTop: '32px', marginBottom: '40px' }}>
                    <div
                        className="badge badge-blue inline-flex items-center gap-2"
                        style={{ padding: '6px 14px', marginBottom: '20px', fontSize: '13px' }}
                    >
                        <Trophy className="w-3.5 h-3.5" />
                        <span>{t('stats.badge') || 'Statistics & Rankings'}</span>
                    </div>
                    <h1 style={{
                        fontSize: 'clamp(28px, 4vw, 36px)',
                        fontWeight: 'var(--font-weight-bold)',
                        color: 'var(--color-text-primary)',
                        marginBottom: '12px',
                    }}>
                        🏆 {t('stats.title') || 'Top Users'}
                    </h1>
                    <p style={{ color: 'var(--color-text-secondary)', fontSize: 'var(--font-size-lg)' }}>
                        {t('stats.subtitle') || 'Rankings of top sellers and most active users'}
                    </p>
                </div>

                {/* Stats Cards */}
                <div className="grid grid-cols-2 md:grid-cols-4" style={{ gap: '16px', marginBottom: '40px' }}>
                    {stats.map((stat, idx) => (
                        <div
                            key={idx}
                            className="text-center"
                            style={{
                                padding: '20px 16px',
                                borderRadius: 'var(--radius-lg)',
                                backgroundColor: 'var(--color-bg-secondary)',
                                border: '1px solid var(--color-border-default)',
                            }}
                        >
                            <div
                                className="flex items-center justify-center mx-auto"
                                style={{
                                    width: '40px', height: '40px',
                                    borderRadius: 'var(--radius-lg)',
                                    backgroundColor: 'var(--color-bg-tertiary)',
                                    marginBottom: '12px',
                                }}
                            >
                                <stat.icon className="w-4 h-4" style={{ color: stat.color }} />
                            </div>
                            <div style={{
                                fontSize: 'var(--font-size-xl)',
                                fontWeight: 'var(--font-weight-bold)',
                                color: 'var(--color-text-primary)',
                            }}>
                                {stat.value}
                            </div>
                            <div style={{ fontSize: 'var(--font-size-xs)', color: 'var(--color-text-muted)', marginTop: '4px' }}>
                                {stat.label}
                            </div>
                        </div>
                    ))}
                </div>

                {/* Tabs */}
                <div className="tabs" style={{ marginBottom: '0' }}>
                    <button
                        className={`tab ${activeTab === 'sellers' ? 'tab-active' : ''}`}
                        onClick={() => setActiveTab('sellers')}
                    >
                        <Trophy className="w-4 h-4" />
                        {t('stats.top_sellers') || 'Top Sellers'}
                    </button>
                    <button
                        className={`tab ${activeTab === 'active' ? 'tab-active' : ''}`}
                        onClick={() => setActiveTab('active')}
                    >
                        <TrendingUp className="w-4 h-4" />
                        {t('stats.active_users') || 'Active Users'}
                    </button>
                </div>

                {/* Leaderboard */}
                <div
                    style={{
                        backgroundColor: 'var(--color-bg-primary)',
                        border: '1px solid var(--color-border-default)',
                        borderTop: 'none',
                        borderRadius: '0 0 var(--radius-lg) var(--radius-lg)',
                        overflow: 'hidden',
                    }}
                >
                    {activeTab === 'sellers' ? (
                        topSellers.map((user, index) => (
                            <div
                                key={user.id}
                                className="flex items-center gap-4 leaderboard-row"
                                style={{
                                    padding: '14px 20px',
                                    borderBottom: index < topSellers.length - 1 ? '1px solid var(--color-border-muted)' : 'none',
                                    backgroundColor: index < 3 ? 'var(--color-bg-secondary)' : 'transparent',
                                }}
                            >
                                <div className="w-6 flex justify-center flex-shrink-0">
                                    {getRankIcon(index)}
                                </div>
                                <div
                                    className="avatar avatar-md"
                                    style={{ backgroundColor: 'var(--color-accent-blue)', color: '#fff' }}
                                >
                                    {user.name.charAt(0)}
                                </div>
                                <div className="flex-1 min-w-0">
                                    <div className="flex items-center gap-2 flex-wrap">
                                        <span style={{ fontWeight: 'var(--font-weight-semibold)', color: 'var(--color-text-primary)', fontSize: 'var(--font-size-base)' }}>
                                            {user.name}
                                        </span>
                                        {getPremiumBadge(user.premium)}
                                    </div>
                                    <div className="flex items-center gap-1" style={{ marginTop: '2px' }}>
                                        <Star className="w-3 h-3 fill-current" style={{ color: 'var(--color-premium-gold-light)' }} />
                                        <span style={{ fontSize: 'var(--font-size-sm)', color: 'var(--color-text-muted)' }}>
                                            {user.rating}
                                        </span>
                                    </div>
                                </div>
                                <div className="text-right flex-shrink-0">
                                    <div style={{ fontSize: 'var(--font-size-lg)', fontWeight: 'var(--font-weight-bold)', color: 'var(--color-text-accent)' }}>
                                        {user.sales}
                                    </div>
                                    <div style={{ fontSize: 'var(--font-size-xs)', color: 'var(--color-text-muted)' }}>
                                        {t('stats.sales_label') || 'sales'}
                                    </div>
                                </div>
                            </div>
                        ))
                    ) : (
                        activeUsers.map((user, index) => (
                            <div
                                key={user.id}
                                className="flex items-center gap-4 leaderboard-row"
                                style={{
                                    padding: '14px 20px',
                                    borderBottom: index < activeUsers.length - 1 ? '1px solid var(--color-border-muted)' : 'none',
                                    backgroundColor: index < 3 ? 'var(--color-bg-secondary)' : 'transparent',
                                }}
                            >
                                <div className="w-6 flex justify-center flex-shrink-0">
                                    {getRankIcon(index)}
                                </div>
                                <div
                                    className="avatar avatar-md"
                                    style={{ backgroundColor: 'var(--color-accent-purple)', color: '#fff' }}
                                >
                                    {user.name.charAt(0)}
                                </div>
                                <div className="flex-1 min-w-0">
                                    <span style={{ fontWeight: 'var(--font-weight-semibold)', color: 'var(--color-text-primary)', fontSize: 'var(--font-size-base)' }}>
                                        {user.name}
                                    </span>
                                    <div className="flex items-center gap-3" style={{ marginTop: '2px', fontSize: 'var(--font-size-sm)', color: 'var(--color-text-muted)' }}>
                                        <span>🛒 {user.purchases}</span>
                                        <span>💰 {user.sales}</span>
                                    </div>
                                </div>
                                <div className="text-right flex-shrink-0">
                                    <div className="flex items-center gap-2">
                                        <div
                                            style={{
                                                width: '80px', height: '8px',
                                                borderRadius: 'var(--radius-full)',
                                                backgroundColor: 'var(--color-bg-tertiary)',
                                                overflow: 'hidden',
                                            }}
                                        >
                                            <div
                                                style={{
                                                    width: `${user.activity}%`,
                                                    height: '100%',
                                                    borderRadius: 'var(--radius-full)',
                                                    backgroundColor: 'var(--color-accent-blue)',
                                                    transition: 'width 0.3s ease',
                                                }}
                                            />
                                        </div>
                                        <span style={{ fontSize: 'var(--font-size-sm)', fontWeight: 'var(--font-weight-semibold)', color: 'var(--color-text-primary)', width: '36px', textAlign: 'right' }}>
                                            {user.activity}%
                                        </span>
                                    </div>
                                    <div style={{ fontSize: 'var(--font-size-xs)', color: 'var(--color-text-muted)', marginTop: '2px' }}>
                                        {t('stats.activity') || 'activity'}
                                    </div>
                                </div>
                            </div>
                        ))
                    )}
                </div>
            </div>
        </div>
    );
};

export default StatisticsPage;
