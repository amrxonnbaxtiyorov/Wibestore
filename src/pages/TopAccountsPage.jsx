import { useState } from 'react';
import { Link } from 'react-router-dom';
import { Crown, Star, Flame, Trophy, Package } from 'lucide-react';
import AccountCard from '../components/AccountCard';
import { SkeletonGrid } from '../components/SkeletonLoader';
import { useListings, useGames } from '../hooks';
import { useLanguage } from '../context/LanguageContext';

const TopAccountsPage = () => {
    const { t } = useLanguage();
    const [filter, setFilter] = useState('all');
    const [sortBy, setSortBy] = useState('rating');
    const [gameFilter, setGameFilter] = useState('');

    const ordering =
        sortBy === 'price-high' ? '-price' :
        sortBy === 'price-low' ? 'price' :
        sortBy === 'sales' ? '-seller__sales_count' :
        '-created_at';

    const { data, isLoading } = useListings({
        ...(filter === 'premium' && { is_premium: true }),
        ...(gameFilter && { game: gameFilter }),
        ordering,
        limit: 40,
    });

    const { data: gamesData } = useGames();

    const rawListings = data?.pages?.flatMap(page => page?.results ?? []) ?? [];
    const allListings = Array.isArray(rawListings) ? rawListings.filter(Boolean) : [];

    const rawGames = gamesData?.results ?? gamesData ?? [];
    const games = Array.isArray(rawGames) ? rawGames.filter(Boolean) : [];

    // Sort client-side by rating if needed (API may not support seller__rating ordering)
    const sortedListings = sortBy === 'rating'
        ? [...allListings].sort((a, b) => {
            const aPremium = a.is_premium || a.isPremium;
            const bPremium = b.is_premium || b.isPremium;
            if (aPremium && !bPremium) return -1;
            if (!aPremium && bPremium) return 1;
            return (b.seller?.rating || 0) - (a.seller?.rating || 0);
        })
        : allListings;

    const premiumCount = allListings.filter(a => a?.is_premium || a?.isPremium).length;

    const statCards = [
        { icon: Crown, label: t('top.premium_sellers') || 'Premium Sellers', value: premiumCount, color: 'var(--color-premium-gold-light)' },
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
                        <div key={idx} className="stat-card" style={{ display: 'flex', flexDirection: 'column', alignItems: 'center', justifyContent: 'center', textAlign: 'center' }}>
                            <card.icon className="w-7 h-7" style={{ color: card.color, marginBottom: 'var(--space-3)' }} />
                            <div className="stat-card-value">{card.value}</div>
                            <div className="stat-card-label">{card.label}</div>
                        </div>
                    ))}
                </div>

                {/* O'yin va saralash — bir qatorda */}
                <div
                    className="flex flex-wrap items-end gap-4"
                    style={{ marginBottom: 'var(--space-6)' }}
                >
                    {/* O'yin */}
                    <div style={{ flex: '1 1 200px', minWidth: 0 }}>
                        <label htmlFor="top-game-filter" style={{
                            display: 'block',
                            fontSize: 'var(--font-size-sm)',
                            fontWeight: 'var(--font-weight-medium)',
                            color: 'var(--color-text-secondary)',
                            marginBottom: 'var(--space-2)',
                        }}>
                            {t('top.filter_by_game') || "O'yin"}
                        </label>
                        <select
                            id="top-game-filter"
                            value={gameFilter}
                            onChange={(e) => setGameFilter(e.target.value)}
                            className="select select-md"
                            style={{ width: '100%', minWidth: '180px' }}
                            aria-label={t('top.filter_by_game') || "O'yin"}
                        >
                            <option value="">{t('top.game_all') || "Barcha o'yinlar"}</option>
                            {games.map((game) => (
                                <option key={game.id ?? game.slug} value={game.slug ?? game.id}>{game.name}</option>
                            ))}
                        </select>
                    </div>
                    {/* Saralash */}
                    <div style={{ flex: '1 1 200px', minWidth: 0 }}>
                        <label htmlFor="top-sort" style={{
                            display: 'block',
                            fontSize: 'var(--font-size-sm)',
                            fontWeight: 'var(--font-weight-medium)',
                            color: 'var(--color-text-secondary)',
                            marginBottom: 'var(--space-2)',
                        }}>
                            {t('top.sort_label') || 'Saralash'}
                        </label>
                        <select
                            id="top-sort"
                            value={sortBy}
                            onChange={(e) => setSortBy(e.target.value)}
                            className="select select-md"
                            style={{ width: '100%', minWidth: '180px' }}
                            aria-label="Sort accounts"
                        >
                            <option value="rating">{t('sort.rating') || 'Eng yaxshi reyting'}</option>
                            <option value="price-high">{t('sort.price_high') || 'Narx: yuqori'}</option>
                            <option value="price-low">{t('sort.price_low') || 'Narx: past'}</option>
                            <option value="sales">{t('sort.sales') || "Ko'p sotuvlar"}</option>
                        </select>
                    </div>
                </div>

                {/* Filter tabs: Barchasi / Premium */}
                <div className="tabs" style={{ borderBottom: 'none', marginBottom: 'var(--space-6)' }}>
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

                {/* Result count */}
                <p style={{
                    fontSize: 'var(--font-size-sm)',
                    color: 'var(--color-text-muted)',
                    marginBottom: 'var(--space-4)',
                }}>
                    {sortedListings.length} {t('top.results') || 'accounts'}
                </p>

                {/* Accounts Grid */}
                {isLoading ? (
                    <SkeletonGrid count={12} />
                ) : sortedListings.length > 0 ? (
                    <div
                        className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4 animate-stagger"
                        style={{ gap: 'var(--space-4)' }}
                    >
                        {sortedListings.map((listing, index) => (
                            <div key={listing.id} style={{ position: 'relative' }}>
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
                                <AccountCard
                                    account={{
                                        id: listing.id,
                                        listing_code: listing.listing_code,
                                        gameId: listing.game?.slug ?? listing.game?.id,
                                        // List API qaytaradi: game_name (ListingListSerializer). Detail API qaytaradi: game{name}
                                        gameName: listing.game?.name ?? listing.game_name ?? (t('common.unknown_game') || "Noma'lum o'yin"),
                                        title: listing.title ?? '',
                                        price: Number(listing.price) || 0,
                                        seller: listing.seller,
                                        image: listing.images?.[0]?.image ?? listing.image ?? listing.primary_image ?? '',
                                        isLiked: listing.is_favorited ?? false,
                                        isPremium: listing.is_premium ?? false,
                                    }}
                                />
                            </div>
                        ))}
                    </div>
                ) : (
                    <div className="empty-state">
                        <Package className="empty-state-icon" />
                        <h3 className="empty-state-title">
                            {t('products.no_results') || 'No accounts found'}
                        </h3>
                        <p className="empty-state-description">
                            {t('products.no_results_desc') || 'Try adjusting your filters'}
                        </p>
                    </div>
                )}
            </div>
        </div>
    );
};

export default TopAccountsPage;
