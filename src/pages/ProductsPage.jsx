import { useState } from 'react';
import { Search, Grid, List, X } from 'lucide-react';
import { useListings, useGames } from '../hooks';
import AccountCard from '../components/AccountCard';
import { SkeletonGrid } from '../components/SkeletonLoader';
import { PageHeader } from '../components/ui';
import { useLanguage } from '../context/LanguageContext';

const ProductsPage = () => {
    const { t } = useLanguage();
    const [searchQuery, setSearchQuery] = useState('');
    const [selectedGame, setSelectedGame] = useState('all');
    const [sortBy, setSortBy] = useState('newest');
    const [viewMode, setViewMode] = useState('grid');
    const [showFilters, setShowFilters] = useState(false);
    const [priceRange, setPriceRange] = useState({ min: 0, max: 10000000 });

    // API hooks
    const { data: gamesData, isLoading: gamesLoading } = useGames();
    const { data, isLoading, fetchNextPage, hasNextPage } = useListings({
        game: selectedGame !== 'all' ? selectedGame : undefined,
        search: searchQuery || undefined,
        min_price: priceRange.min || undefined,
        max_price: priceRange.max || undefined,
        ordering: sortBy === 'price-low' ? 'price' : sortBy === 'price-high' ? '-price' : '-created_at',
    });

    // Flatten paginated data
    const allListings = data?.pages?.flatMap(page => page.results) || [];
    const games = gamesData?.results || gamesData || [];
    
    // Filter va sort
    let filteredListings = [...allListings];
    
    if (selectedGame !== 'all' && selectedGame) {
        filteredListings = filteredListings.filter(l => l.game?.slug === selectedGame || l.game?.id === selectedGame);
    }
    
    if (searchQuery) {
        filteredListings = filteredListings.filter(l => 
            l.title.toLowerCase().includes(searchQuery.toLowerCase()) ||
            l.description?.toLowerCase().includes(searchQuery.toLowerCase())
        );
    }
    
    if (priceRange.min || priceRange.max < 10000000) {
        filteredListings = filteredListings.filter(l => {
            const price = parseFloat(l.price);
            return price >= priceRange.min && price <= priceRange.max;
        });
    }
    
    // Sort
    filteredListings.sort((a, b) => {
        if (sortBy === 'price-low') return parseFloat(a.price) - parseFloat(b.price);
        if (sortBy === 'price-high') return parseFloat(b.price) - parseFloat(a.price);
        return 0;
    });
    
    // Premium first
    const premium = filteredListings.filter(l => l.is_premium);
    const regular = filteredListings.filter(l => !l.is_premium);
    const filteredAccounts = [...premium, ...regular];

    const sortOptions = [
        { value: 'newest', label: t('products.sort_newest') || 'Newest' },
        { value: 'price-low', label: t('products.sort_price_low') || 'Price: Low to High' },
        { value: 'price-high', label: t('products.sort_price_high') || 'Price: High to Low' },
        { value: 'rating', label: t('products.sort_rating') || 'Best Rating' },
    ];

    return (
        <div className="page-enter" style={{ minHeight: '100vh' }}>
            <div className="gh-container">
                <PageHeader
                    breadcrumbs={[{ label: t('common.home'), to: '/' }, { label: t('nav.products') || 'Products' }]}
                    title={t('products.title') || 'All Products'}
                    description={`${filteredAccounts.length} ${t('products.found') || 'accounts found'}`}
                />
            </div>

            <div className="gh-container">
                {/* Search & Filters Bar */}
                <div
                    className="flex flex-col sm:flex-row items-stretch sm:items-center gap-3"
                    style={{ marginBottom: '24px' }}
                >
                    {/* Search */}
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
                        {searchQuery && (
                            <button
                                onClick={() => setSearchQuery('')}
                                className="absolute right-3 top-1/2 -translate-y-1/2"
                                style={{ color: 'var(--color-text-muted)', background: 'none', border: 'none', cursor: 'pointer' }}
                            >
                                <X className="w-4 h-4" />
                            </button>
                        )}
                    </div>

                    {/* Game Filter */}
                    <select
                        value={selectedGame}
                        onChange={(e) => setSelectedGame(e.target.value)}
                        className="select select-md"
                        style={{ maxWidth: '200px' }}
                        aria-label="Filter by game"
                    >
                        <option value="all">{t('products.all_games') || 'All Games'}</option>
                        {games.map(game => (
                            <option key={game.id || game.slug} value={game.slug || game.id}>{game.name}</option>
                        ))}
                    </select>

                    {/* Sort */}
                    <select
                        value={sortBy}
                        onChange={(e) => setSortBy(e.target.value)}
                        className="select select-md"
                        style={{ maxWidth: '180px' }}
                        aria-label="Sort by"
                    >
                        {sortOptions.map(opt => (
                            <option key={opt.value} value={opt.value}>{opt.label}</option>
                        ))}
                    </select>

                    {/* View toggle */}
                    <div className="flex items-center gap-1">
                        <button
                            onClick={() => setViewMode('grid')}
                            className={`btn btn-sm ${viewMode === 'grid' ? 'btn-secondary' : 'btn-ghost'}`}
                            style={{ padding: '0 8px' }}
                            aria-label="Grid view"
                        >
                            <Grid className="w-4 h-4" />
                        </button>
                        <button
                            onClick={() => setViewMode('list')}
                            className={`btn btn-sm ${viewMode === 'list' ? 'btn-secondary' : 'btn-ghost'}`}
                            style={{ padding: '0 8px' }}
                            aria-label="List view"
                        >
                            <List className="w-4 h-4" />
                        </button>
                    </div>
                </div>

                {/* Active filters */}
                {(selectedGame !== 'all' || searchQuery) && (
                    <div className="flex items-center gap-2 flex-wrap" style={{ marginBottom: '16px' }}>
                        {selectedGame !== 'all' && (
                            <span className="badge badge-blue flex items-center gap-1" style={{ padding: '4px 10px' }}>
                                {games.find(g => g.id === selectedGame)?.name}
                                <button
                                    onClick={() => setSelectedGame('all')}
                                    style={{ background: 'none', border: 'none', cursor: 'pointer', color: 'inherit', padding: 0 }}
                                >
                                    <X className="w-3 h-3" />
                                </button>
                            </span>
                        )}
                        {searchQuery && (
                            <span className="badge badge-blue flex items-center gap-1" style={{ padding: '4px 10px' }}>
                                "{searchQuery}"
                                <button
                                    onClick={() => setSearchQuery('')}
                                    style={{ background: 'none', border: 'none', cursor: 'pointer', color: 'inherit', padding: 0 }}
                                >
                                    <X className="w-3 h-3" />
                                </button>
                            </span>
                        )}
                        <button
                            onClick={() => { setSelectedGame('all'); setSearchQuery(''); }}
                            className="text-sm"
                            style={{ color: 'var(--color-text-muted)', background: 'none', border: 'none', cursor: 'pointer' }}
                        >
                            {t('products.clear_all') || 'Clear all'}
                        </button>
                    </div>
                )}

                {/* Results */}
                {isLoading ? (
                    <SkeletonGrid count={8} />
                ) : filteredAccounts.length > 0 ? (
                    <>
                        <div
                            className={`grid animate-stagger ${viewMode === 'grid'
                                ? 'grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4'
                                : 'grid-cols-1'
                                }`}
                            style={{ gap: '16px' }}
                        >
                            {filteredAccounts.map((listing) => (
                                <AccountCard
                                    key={listing.id}
                                    account={{
                                        id: listing.id,
                                        gameId: listing.game?.slug || listing.game?.id,
                                        gameName: listing.game?.name || 'Unknown',
                                        title: listing.title,
                                        price: parseFloat(listing.price),
                                        seller: listing.seller,
                                        image: listing.images?.[0]?.image || '',
                                        isLiked: listing.is_favorited || false,
                                        isPremium: listing.is_premium,
                                    }}
                                    viewMode={viewMode}
                                />
                            ))}
                        </div>

                        {/* Load More - agar API pagination bo'lsa */}
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
                    /* Empty State */
                    <div className="empty-state">
                        <Search className="empty-state-icon" />
                        <h3 className="empty-state-title">
                            {t('products.no_results') || 'No accounts found'}
                        </h3>
                        <p className="empty-state-description">
                            {t('products.no_results_desc') || 'Try adjusting your search or filters'}
                        </p>
                        <button
                            onClick={() => { setSearchQuery(''); setSelectedGame('all'); setPriceRange({ min: 0, max: 10000000 }); }}
                            className="btn btn-primary btn-md"
                        >
                            {t('products.clear_filters') || 'Clear filters'}
                        </button>
                    </div>
                )}
            </div>
        </div>
    );
};

export default ProductsPage;
