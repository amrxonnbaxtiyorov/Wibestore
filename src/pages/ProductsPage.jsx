import { useState, useEffect } from 'react';
import { useSearchParams } from 'react-router-dom';
import { Search, Grid, List, X } from 'lucide-react';
import { useListings, useGames, useSEO } from '../hooks';
import AccountCard from '../components/AccountCard';
import { SkeletonGrid } from '../components/SkeletonLoader';
import { PageHeader } from '../components/ui';
import { useLanguage } from '../context/LanguageContext';

const ProductsPage = () => {
    const { t } = useLanguage();

    useSEO({
        title: "O'yin Akkauntlari — Sotib Olish | WibeStore",
        description: "PUBG Mobile, Steam, Free Fire, Roblox, Mobile Legends va boshqa o'yin akkauntlarini sotib oling. WibeStore da eng ko'p o'yin akkauntlari.",
        canonical: 'https://wibestore.net/products',
    });

    const [searchParams, setSearchParams] = useSearchParams();
    const urlSearch = searchParams.get('search') ?? '';
    const [searchQuery, setSearchQuery] = useState(urlSearch);
    const [selectedGame, setSelectedGame] = useState('all');
    const [sortBy, setSortBy] = useState('newest');
    const [viewMode, setViewMode] = useState('grid');
    const [priceRange, setPriceRange] = useState({ min: 0, max: 10000000 });
    const [hasWarrantyOnly, setHasWarrantyOnly] = useState(false);

    // URL dan search ni sinxronlashtirish (sahifa ochilganda yoki link orqali)
    useEffect(() => {
        setSearchQuery(urlSearch);
    }, [urlSearch]);

    // Qidiruv matnini URL ga debounce bilan yozish (ulashiladigan link uchun)
    useEffect(() => {
        const timer = setTimeout(() => {
            const q = searchQuery.trim();
            setSearchParams((prev) => {
                const cur = prev.get('search') ?? '';
                if (q === cur) return prev;
                const next = new URLSearchParams(prev);
                if (q) next.set('search', q);
                else next.delete('search');
                return next;
            }, { replace: true });
        }, 400);
        return () => clearTimeout(timer);
    }, [searchQuery, setSearchParams]);

    // API hooks — faqat aniq filterlar yuboriladi (undefined yo'q, tez cache)
    const { data: gamesData } = useGames();
    const { data, isLoading, isError, isFetching, fetchNextPage, hasNextPage } = useListings({
        ...(selectedGame !== 'all' && { game: selectedGame }),
        ...(searchQuery.trim() && { search: searchQuery.trim() }),
        ...(priceRange.min > 0 && { min_price: priceRange.min }),
        ...(priceRange.max < 10000000 && { max_price: priceRange.max }),
        ...(hasWarrantyOnly && { has_warranty: true }),
        ordering: sortBy === 'price-low' ? 'price' : sortBy === 'price-high' ? '-price' : sortBy === 'views' ? '-views_count' : '-created_at',
    });

    // Flatten paginated data
    const rawListings = data?.pages?.flatMap(page => page?.results ?? []) ?? [];
    const allListings = Array.isArray(rawListings) ? rawListings.filter(Boolean) : [];
    const rawGames = gamesData?.results ?? gamesData ?? [];
    const games = Array.isArray(rawGames) ? rawGames.filter(Boolean) : [];

    // Filter va sort
    let filteredListings = [...allListings];

    if (selectedGame !== 'all' && selectedGame) {
        filteredListings = filteredListings.filter(l => l && (l.game?.slug === selectedGame || l.game?.id === selectedGame));
    }

    if (searchQuery) {
        const q = searchQuery.toLowerCase();
        filteredListings = filteredListings.filter(l =>
            l && (
                l.listing_code?.toLowerCase().includes(q) ||
                l.title?.toLowerCase().includes(q) ||
                l.description?.toLowerCase().includes(q) ||
                l.level?.toLowerCase().includes(q)
            )
        );
    }

    if (priceRange.min || priceRange.max < 10000000) {
        filteredListings = filteredListings.filter(l => {
            if (!l) return false;
            const price = parseFloat(l.price);
            return price >= priceRange.min && price <= priceRange.max;
        });
    }

    // Sort
    filteredListings.sort((a, b) => {
        if (!a || !b) return 0;
        if (sortBy === 'price-low') return parseFloat(a.price) - parseFloat(b.price);
        if (sortBy === 'price-high') return parseFloat(b.price) - parseFloat(a.price);
        return 0;
    });

    // Premium first (API: is_premium, mock: isPremium)
    const premium = filteredListings.filter(l => l?.is_premium || l?.isPremium);
    const regular = filteredListings.filter(l => !(l?.is_premium || l?.isPremium));
    const filteredAccounts = [...premium, ...regular];

    const sortOptions = [
        { value: 'newest', label: t('products.sort_newest') || 'Newest' },
        { value: 'price-low', label: t('products.sort_price_low') || 'Price: Low to High' },
        { value: 'price-high', label: t('products.sort_price_high') || 'Price: High to Low' },
        { value: 'views', label: t('products.sort_views') || 'Most Viewed' },
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
                <div style={{ marginBottom: '24px', display: 'flex', flexDirection: 'column', gap: '12px' }}>
                    {/* Row 1: Search + Game filter */}
                    <div style={{ display: 'flex', gap: '12px', alignItems: 'center', flexWrap: 'wrap' }}>
                        {/* Search */}
                        <div className="relative" style={{ flex: '1 1 200px', minWidth: '180px' }}>
                            <Search
                                className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4"
                                style={{ color: 'var(--color-text-muted)' }}
                            />
                            <input
                                type="text"
                                placeholder={t('products.search_placeholder') || 'Kod, nom yoki level bo\'yicha qidirish...'}
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
                            style={{ minWidth: '160px', flex: '0 1 200px' }}
                            aria-label="Filter by game"
                        >
                            <option value="all">{t('products.all_games') || "Barcha o'yinlar"}</option>
                            {games.map((game, index) => (
                                <option key={game?.id ?? game?.slug ?? index} value={game?.slug ?? game?.id ?? ''}>{game?.name ?? ''}</option>
                            ))}
                        </select>
                    </div>

                    {/* Row 2: Price range + Sort + Warranty + View toggle */}
                    <div style={{ display: 'flex', gap: '12px', alignItems: 'center', flexWrap: 'wrap' }}>
                        {/* Min / Max narx */}
                        <div style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
                            <input
                                type="number"
                                min={0}
                                placeholder={t('products.min_price') || 'Min narx'}
                                value={priceRange.min || ''}
                                onChange={(e) => {
                                    const val = Math.max(0, Number(e.target.value) || 0);
                                    setPriceRange(prev => ({ ...prev, min: val }));
                                }}
                                className="input input-md"
                                style={{ width: '120px' }}
                            />
                            <span style={{ color: 'var(--color-text-muted)', flexShrink: 0 }}>–</span>
                            <input
                                type="number"
                                min={0}
                                max={100000000}
                                placeholder={t('products.max_price') || 'Max narx'}
                                value={priceRange.max >= 10000000 ? '' : priceRange.max || ''}
                                onChange={(e) => {
                                    const val = Math.max(0, Math.min(100000000, Number(e.target.value) || 10000000));
                                    setPriceRange(prev => ({ ...prev, max: val }));
                                }}
                                className="input input-md"
                                style={{ width: '120px' }}
                            />
                        </div>

                        {/* Sort */}
                        <select
                            value={sortBy}
                            onChange={(e) => setSortBy(e.target.value)}
                            className="select select-md"
                            style={{ minWidth: '150px', flex: '0 1 180px' }}
                            aria-label="Sort by"
                        >
                            {sortOptions.map(opt => (
                                <option key={opt.value} value={opt.value}>{opt.label}</option>
                            ))}
                        </select>

                        {/* Warranty filter */}
                        <label className="flex items-center gap-2 cursor-pointer" style={{ whiteSpace: 'nowrap', flexShrink: 0 }}>
                            <input
                                type="checkbox"
                                checked={hasWarrantyOnly}
                                onChange={(e) => setHasWarrantyOnly(e.target.checked)}
                                className="checkbox checkbox-sm"
                            />
                            <span className="text-sm">{t('products.warranty_only') || 'Kafolatli'}</span>
                        </label>

                        {/* View toggle */}
                        <div className="flex items-center gap-1" style={{ marginLeft: 'auto', flexShrink: 0 }}>
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
                </div>

                {/* Active filters */}
                {(selectedGame !== 'all' || searchQuery || priceRange.min > 0 || priceRange.max < 10000000) && (
                    <div className="flex items-center gap-2 flex-wrap" style={{ marginBottom: '16px' }}>
                        {selectedGame !== 'all' && (
                            <span className="badge badge-blue flex items-center gap-1" style={{ padding: '4px 10px' }}>
                                {games.find(g => (g?.slug ?? g?.id) === selectedGame)?.name ?? selectedGame}
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
                                {searchQuery}
                                <button
                                    onClick={() => setSearchQuery('')}
                                    style={{ background: 'none', border: 'none', cursor: 'pointer', color: 'inherit', padding: 0 }}
                                >
                                    <X className="w-3 h-3" />
                                </button>
                            </span>
                        )}
                        <button
                            onClick={() => {
                                setSelectedGame('all');
                                setSearchQuery('');
                                setPriceRange({ min: 0, max: 10000000 });
                                setSearchParams({}, { replace: true });
                            }}
                            className="text-sm"
                            style={{ color: 'var(--color-text-muted)', background: 'none', border: 'none', cursor: 'pointer' }}
                        >
                            {t('products.clear_all') || 'Clear all'}
                        </button>
                    </div>
                )}

                {/* Results */}
                {isLoading ? (
                    <SkeletonGrid count={12} />
                ) : isError ? (
                    <div style={{ textAlign: 'center', padding: '60px 20px', color: 'var(--color-error)' }}>
                        <p style={{ fontSize: '18px', fontWeight: '600', marginBottom: '8px' }}>Server xatosi</p>
                        <p style={{ color: 'var(--color-text-secondary)', fontSize: '14px' }}>E'lonlarni yuklashda muammo. Sahifani yangilang.</p>
                    </div>
                ) : filteredAccounts.length > 0 ? (
                    <>
                        <div
                            className={`grid animate-stagger ${viewMode === 'grid'
                                ? 'grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4'
                                : 'grid-cols-1'
                                }`}
                            style={{ gap: '16px' }}
                        >
                            {filteredAccounts.map((listing, index) => (
                                <AccountCard
                                    key={listing?.id ?? `listing-${index}`}
                                    account={{
                                        id: listing?.id,
                                        listing_code: listing?.listing_code,
                                        listing_type: listing?.listing_type,
                                        gameId: listing?.game?.slug ?? listing?.game?.id,
                                        gameName: listing?.game?.name ?? listing?.game_name ?? (t('common.unknown_game') || "Noma'lum o'yin"),
                                        title: listing?.title ?? '',
                                        price: Number(listing?.price) || 0,
                                        rental_price_per_day: listing?.rental_price_per_day,
                                        rental_period_days: listing?.rental_period_days,
                                        rental_deposit: listing?.rental_deposit,
                                        seller: listing?.seller,
                                        image: listing?.images?.[0]?.image ?? listing?.image ?? listing?.primary_image ?? '',
                                        isLiked: listing?.is_favorited ?? false,
                                        isPremium: listing?.is_premium ?? listing?.isPremium ?? false,
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
                                    disabled={isFetching}
                                >
                                    {isFetching ? (t('common.loading') || 'Loading...') : (t('products.load_more') || 'Load More')}
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
                            onClick={() => {
                                setSearchQuery('');
                                setSelectedGame('all');
                                setPriceRange({ min: 0, max: 10000000 });
                                setSearchParams({}, { replace: true });
                            }}
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
