import { useParams, Link } from 'react-router-dom';
import { Search, Package, Shield, TrendingUp } from 'lucide-react';
import { useState } from 'react';
import { useGame, useGameListings } from '../hooks';
import AccountCard from '../components/AccountCard';
import SkeletonLoader from '../components/SkeletonLoader';
import { useLanguage } from '../context/LanguageContext';

const GamePage = () => {
    const { t } = useLanguage();
    const { gameId } = useParams();
    const [sortBy, setSortBy] = useState('newest');
    const [searchQuery, setSearchQuery] = useState('');
    
    // API hooks
    const { data: game, isLoading: gameLoading } = useGame(gameId);
    const { data, isLoading, fetchNextPage, hasNextPage } = useGameListings(gameId, {
        ordering: sortBy === 'price-low' ? 'price' : sortBy === 'price-high' ? '-price' : '-created_at',
    });
    
    const listings = data?.pages?.flatMap(page => page.results) || [];
    
    // Filter and sort
    const filteredListings = listings.filter(listing =>
        searchQuery === '' || listing.title.toLowerCase().includes(searchQuery.toLowerCase())
    );
    
    const sortedListings = [...filteredListings].sort((a, b) => {
        if (sortBy === 'price-low') return parseFloat(a.price) - parseFloat(b.price);
        if (sortBy === 'price-high') return parseFloat(b.price) - parseFloat(a.price);
        return 0;
    });
    
    const premiumListings = sortedListings.filter(l => l.is_premium);
    const regularListings = sortedListings.filter(l => !l.is_premium);
    const finalAccounts = [...premiumListings, ...regularListings];

    if (gameLoading) {
        return (
            <div className="page-enter" style={{ minHeight: 'calc(100vh - 64px)', display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
                <SkeletonLoader />
            </div>
        );
    }

    if (!game) {
        return (
            <div className="page-enter" style={{ minHeight: 'calc(100vh - 64px)' }}>
                <div className="gh-container">
                    <div className="empty-state">
                        <Package className="empty-state-icon" />
                        <h3 className="empty-state-title">
                            {t('game.not_found') || 'Game not found'}
                        </h3>
                        <p className="empty-state-description">
                            {t('game.not_found_desc') || 'The game you are looking for does not exist.'}
                        </p>
                        <Link to="/" className="btn btn-primary btn-md" style={{ textDecoration: 'none' }}>
                            {t('game.go_home') || 'Go to homepage'}
                        </Link>
                    </div>
                </div>
            </div>
        );
    }

    return (
        <div className="page-enter" style={{ minHeight: '100vh', paddingBottom: '64px' }}>
            <div className="gh-container">
                {/* Breadcrumbs */}
                <div className="breadcrumbs">
                    <Link to="/">{t('common.home')}</Link>
                    <span className="breadcrumb-separator">/</span>
                    <Link to="/products">{t('nav.products') || 'Products'}</Link>
                    <span className="breadcrumb-separator">/</span>
                    <span className="breadcrumb-current">{game.name}</span>
                </div>

                {/* Game Header */}
                <div
                    className="flex items-center gap-4"
                    style={{ paddingTop: 'var(--space-6)', marginBottom: 'var(--space-8)' }}
                >
                    <div
                        className="flex items-center justify-center"
                        style={{
                            width: '56px',
                            height: '56px',
                            borderRadius: 'var(--radius-xl)',
                            backgroundColor: 'var(--color-bg-secondary)',
                            border: '1px solid var(--color-border-default)',
                            fontSize: '28px',
                            flexShrink: 0,
                            overflow: 'hidden',
                        }}
                    >
                        {game.icon ? (
                            <img src={game.icon} alt={game.name} style={{ width: '100%', height: '100%', objectFit: 'cover' }} />
                        ) : (
                            game.name.charAt(0)
                        )}
                    </div>
                    <div>
                        <h1 style={{ fontSize: 'var(--font-size-2xl)', fontWeight: 'var(--font-weight-bold)', color: 'var(--color-text-primary)', marginBottom: '4px' }}>
                            {game.name}
                        </h1>
                        <p style={{ color: 'var(--color-text-secondary)', fontSize: 'var(--font-size-sm)' }}>
                            {game.listings_count || 0} {t('game.accounts') || 'accounts available'}
                        </p>
                    </div>
                </div>

                {/* Search & Sort */}
                <div
                    className="flex flex-col sm:flex-row items-stretch sm:items-center gap-3"
                    style={{ marginBottom: '24px' }}
                >
                    <div className="relative flex-1">
                        <Search
                            className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4"
                            style={{ color: 'var(--color-text-muted)' }}
                        />
                        <input
                            type="text"
                            placeholder={t('products.search_placeholder') || 'Search accounts...'}
                            value={searchQuery}
                            onChange={(e) => setSearchQuery(e.target.value)}
                            className="input input-md w-full"
                            style={{ paddingLeft: '36px' }}
                        />
                    </div>

                    <select
                        value={sortBy}
                        onChange={(e) => setSortBy(e.target.value)}
                        className="select select-md"
                        style={{ maxWidth: '180px' }}
                        aria-label="Sort by"
                    >
                        <option value="newest">{t('products.sort_newest') || 'Newest'}</option>
                        <option value="price-low">{t('products.sort_price_low') || 'Price: Low to High'}</option>
                        <option value="price-high">{t('products.sort_price_high') || 'Price: High to Low'}</option>
                    </select>
                </div>

                {/* Results */}
                {isLoading ? (
                    <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fill, minmax(280px, 1fr))', gap: '16px' }}>
                        {[...Array(8)].map((_, i) => (
                            <SkeletonLoader key={i} />
                        ))}
                    </div>
                ) : finalAccounts.length > 0 ? (
                    <>
                        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4" style={{ gap: '16px' }}>
                            {finalAccounts.map((listing) => (
                                <AccountCard
                                    key={listing.id}
                                    account={{
                                        id: listing.id,
                                        gameId: game.slug || game.id,
                                        gameName: game.name,
                                        title: listing.title,
                                        price: parseFloat(listing.price),
                                        seller: listing.seller,
                                        image: listing.images?.[0]?.image || '',
                                        isLiked: listing.is_favorited || false,
                                        isPremium: listing.is_premium,
                                    }}
                                />
                            ))}
                        </div>

                        {hasNextPage && (
                            <div className="text-center" style={{ marginTop: '32px' }}>
                                <button
                                    onClick={() => fetchNextPage()}
                                    className="btn btn-primary btn-lg"
                                    disabled={isLoading}
                                >
                                    {isLoading ? 'Loading...' : 'Load More'}
                                </button>
                            </div>
                        )}
                    </>
                ) : (
                    <div className="empty-state">
                        <Search className="empty-state-icon" />
                        <h3 className="empty-state-title">
                            {t('products.no_results') || 'No accounts found'}
                        </h3>
                        <p className="empty-state-description">
                            {t('products.no_results_desc') || 'Try adjusting your search'}
                        </p>
                    </div>
                )}
            </div>
        </div>
    );
};

export default GamePage;
