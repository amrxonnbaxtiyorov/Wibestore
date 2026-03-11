import { useState } from 'react';
import { Link } from 'react-router-dom';
import { Trophy, TrendingUp, Users, ShoppingBag, Star, Medal, Crown, Award } from 'lucide-react';
import { useLanguage } from '../context/LanguageContext';
import { useListings, useGames } from '../hooks';

const StatisticsPage = () => {
    const { t } = useLanguage();
    const [activeTab, setActiveTab] = useState('sellers');

    const { data: listingsData } = useListings({ limit: 1 });
    const { data: gamesData } = useGames();

    const totalListings = listingsData?.pages?.[0]?.count ?? 0;
    const rawGames = gamesData?.results ?? gamesData ?? [];
    const gamesCount = Array.isArray(rawGames) ? rawGames.length : 0;

    const getRankIcon = (index) => {
        if (index === 0) return <Crown className="w-5 h-5" style={{ color: 'var(--color-premium-gold-light)' }} />;
        if (index === 1) return <Medal className="w-5 h-5" style={{ color: 'var(--color-text-muted)' }} />;
        if (index === 2) return <Award className="w-5 h-5" style={{ color: 'var(--color-accent-orange)' }} />;
        return <span style={{ fontSize: 'var(--font-size-sm)', fontWeight: 'var(--font-weight-bold)', color: 'var(--color-text-muted)' }}>{index + 1}</span>;
    };

    const stats = [
        { icon: ShoppingBag, label: t('stats.total_listings') || 'Total Listings', value: totalListings > 0 ? `${totalListings}+` : '—', color: 'var(--color-accent-blue)' },
        { icon: ShoppingBag, label: t('stats.games') || 'Games', value: gamesCount > 0 ? `${gamesCount}` : '—', color: 'var(--color-accent-green)' },
        { icon: Star, label: t('stats.avg_rating') || 'Avg Rating', value: '4.8+', color: 'var(--color-premium-gold-light)' },
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
                <div className="grid grid-cols-1 md:grid-cols-3" style={{ gap: '16px', marginBottom: '40px' }}>
                    {stats.map((stat, idx) => (
                        <div
                            key={idx}
                            style={{
                                display: 'flex',
                                flexDirection: 'column',
                                alignItems: 'center',
                                justifyContent: 'center',
                                textAlign: 'center',
                                padding: '20px 16px',
                                borderRadius: 'var(--radius-lg)',
                                backgroundColor: 'var(--color-bg-secondary)',
                                border: '1px solid var(--color-border-default)',
                            }}
                        >
                            <div
                                className="flex items-center justify-center"
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

                {/* Leaderboard — empty state while no leaderboard API */}
                <div
                    style={{
                        backgroundColor: 'var(--color-bg-primary)',
                        border: '1px solid var(--color-border-default)',
                        borderTop: 'none',
                        borderRadius: '0 0 var(--radius-lg) var(--radius-lg)',
                        overflow: 'hidden',
                    }}
                >
                    <div className="empty-state" style={{ padding: '48px 24px' }}>
                        <Trophy className="empty-state-icon" />
                        <h3 className="empty-state-title">
                            {t('stats.coming_soon_title') || 'Leaderboard Coming Soon'}
                        </h3>
                        <p className="empty-state-description">
                            {t('stats.coming_soon_desc') || 'Rankings will be shown here once enough transactions are recorded.'}
                        </p>
                        <Link to="/products" className="btn btn-primary btn-md" style={{ textDecoration: 'none' }}>
                            {t('hero.cta_browse') || 'Browse Accounts'}
                        </Link>
                    </div>
                </div>
            </div>
        </div>
    );
};

export default StatisticsPage;
