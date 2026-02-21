import { useState } from 'react';
import { Link } from 'react-router-dom';
import { Crown, Star, Flame, Trophy } from 'lucide-react';
import AccountCard from '../components/AccountCard';
import { accounts } from '../data/mockData';
import { useLanguage } from '../context/LanguageContext';

const TopAccountsPage = () => {
    const { t } = useLanguage();
    const [filter, setFilter] = useState('all');
    const [sortBy, setSortBy] = useState('rating');

    const filteredAccounts = [...accounts]
        .filter(acc => {
            if (filter === 'premium') return acc.isPremium;
            return true;
        })
        .sort((a, b) => {
            if (sortBy === 'rating') {
                if (a.isPremium && !b.isPremium) return -1;
                if (!a.isPremium && b.isPremium) return 1;
                return b.seller.rating - a.seller.rating;
            }
            if (sortBy === 'price-high') return b.price - a.price;
            if (sortBy === 'price-low') return a.price - b.price;
            if (sortBy === 'sales') return b.seller.sales - a.seller.sales;
            return 0;
        });

    const statCards = [
        { icon: Crown, label: t('top.premium_sellers') || 'Premium Sellers', value: accounts.filter(a => a.isPremium).length, color: 'var(--color-premium-gold-light)' },
        { icon: Star, label: t('top.high_rated') || 'High rated only', value: '4.5+', color: 'var(--color-premium-gold-light)' },
        { icon: Flame, label: t('top.experienced') || 'Experienced sellers', value: '100+', color: 'var(--color-accent-orange)' },
    ];

    return (
        <div className="page-enter" style={{ minHeight: '100vh', paddingBottom: '64px' }}>
            <div className="gh-container">
                {/* Breadcrumbs */}
                <div className="breadcrumbs">
                    <Link to="/">{t('common.home')}</Link>
                    <span className="breadcrumb-separator">/</span>
                    <span className="breadcrumb-current">{t('nav.top') || 'Top'}</span>
                </div>

                {/* Header */}
                <div className="text-center" style={{ paddingTop: 'var(--space-8)', marginBottom: 'var(--space-10)' }}>
                    <div
                        className="badge badge-orange inline-flex items-center gap-2"
                        style={{ padding: '6px 14px', marginBottom: 'var(--space-5)', fontSize: '13px' }}
                    >
                        <Trophy className="w-3.5 h-3.5" />
                        <span>{t('top.badge') || 'Best of the best'}</span>
                    </div>
                    <h1 style={{
                        fontSize: 'clamp(28px, 4vw, 40px)',
                        fontWeight: 'var(--font-weight-bold)',
                        color: 'var(--color-text-primary)',
                        marginBottom: 'var(--space-3)',
                    }}>
                        {t('top.title') || 'Top'}{' '}
                        <span style={{ color: 'var(--color-accent-orange)' }}>
                            {t('top.accounts') || 'Accounts'}
                        </span>
                    </h1>
                    <p style={{
                        color: 'var(--color-text-secondary)',
                        maxWidth: '480px',
                        margin: '0 auto',
                        fontSize: 'var(--font-size-base)',
                    }}>
                        {t('top.subtitle') || 'Best accounts from highest rated and most trusted sellers'}
                    </p>
                </div>

                {/* Stats */}
                <div className="grid grid-cols-1 sm:grid-cols-3" style={{ gap: 'var(--space-4)', marginBottom: 'var(--space-10)' }}>
                    {statCards.map((card, idx) => (
                        <div key={idx} className="stat-card text-center">
                            <card.icon className="w-7 h-7 mx-auto" style={{ color: card.color, marginBottom: 'var(--space-3)' }} />
                            <div className="stat-card-value">{card.value}</div>
                            <div className="stat-card-label">{card.label}</div>
                        </div>
                    ))}
                </div>

                {/* Filters & Sort */}
                <div
                    className="flex flex-col sm:flex-row items-stretch sm:items-center gap-3"
                    style={{ marginBottom: 'var(--space-6)' }}
                >
                    {/* Filter tabs */}
                    <div className="tabs" style={{ borderBottom: 'none', flex: 1 }}>
                        <button
                            className={`tab ${filter === 'all' ? 'tab-active' : ''}`}
                            onClick={() => setFilter('all')}
                        >
                            {t('top.all') || 'All'}
                        </button>
                        <button
                            className={`tab ${filter === 'premium' ? 'tab-active' : ''}`}
                            onClick={() => setFilter('premium')}
                        >
                            <Crown className="w-4 h-4" style={{ color: 'var(--color-premium-gold-light)' }} />
                            {t('top.premium_only') || 'Premium Only'}
                        </button>
                    </div>

                    {/* Sort */}
                    <select
                        value={sortBy}
                        onChange={(e) => setSortBy(e.target.value)}
                        className="select select-md"
                        style={{ minWidth: '180px' }}
                        aria-label="Sort accounts"
                    >
                        <option value="rating">{t('sort.rating') || 'Best Rating'}</option>
                        <option value="price-high">{t('sort.price_high') || 'Price: High'}</option>
                        <option value="price-low">{t('sort.price_low') || 'Price: Low'}</option>
                        <option value="sales">{t('sort.sales') || 'Most Sales'}</option>
                    </select>
                </div>

                {/* Result count */}
                <p style={{
                    fontSize: 'var(--font-size-sm)',
                    color: 'var(--color-text-muted)',
                    marginBottom: 'var(--space-4)',
                }}>
                    {filteredAccounts.length} {t('top.results') || 'accounts'}
                </p>

                {/* Accounts Grid */}
                <div
                    className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4 animate-stagger"
                    style={{ gap: 'var(--space-4)' }}
                >
                    {filteredAccounts.map((account, index) => (
                        <div key={account.id} style={{ position: 'relative' }}>
                            {/* Rank badge for top 3 */}
                            {index < 3 && (
                                <div
                                    style={{
                                        position: 'absolute',
                                        top: '-8px',
                                        left: '-8px',
                                        zIndex: 10,
                                        width: '28px',
                                        height: '28px',
                                        borderRadius: 'var(--radius-full)',
                                        background: index === 0 ? 'linear-gradient(135deg, #FFD700, #FFA500)' :
                                            index === 1 ? 'linear-gradient(135deg, #C0C0C0, #A0A0A0)' :
                                                'linear-gradient(135deg, #CD7F32, #A0522D)',
                                        display: 'flex',
                                        alignItems: 'center',
                                        justifyContent: 'center',
                                        fontSize: 'var(--font-size-sm)',
                                        fontWeight: 'var(--font-weight-bold)',
                                        color: '#fff',
                                        boxShadow: 'var(--shadow-md)',
                                    }}
                                >
                                    {index + 1}
                                </div>
                            )}
                            <AccountCard account={account} />
                        </div>
                    ))}
                </div>
            </div>
        </div>
    );
};

export default TopAccountsPage;
