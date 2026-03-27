import { useState, useEffect, useMemo } from 'react';
import { Link, useNavigate, useSearchParams } from 'react-router-dom';
import {
    Search, Key, Clock, Wallet, Plus, X, ChevronRight,
    Sparkles, TrendingUp, ArrowUpRight, Loader2, AlertCircle,
    Megaphone, Timer, BadgePercent, ExternalLink,
} from 'lucide-react';
import { useAuth } from '../context/AuthContext';
import { useLanguage } from '../context/LanguageContext';
import { useToast } from '../components/ToastProvider';
import { useGames, useProfile, useSEO } from '../hooks';
import { useRentalListings, usePromotionCalculate, useCreatePromotion, useMyPromotions } from '../hooks/useRentals';
import AccountCard from '../components/AccountCard';
import { SkeletonGrid } from '../components/SkeletonLoader';
import { PageHeader } from '../components/ui';
import { resolveImageUrl } from '../lib/displayUtils';
import { formatPrice } from '../data/mockData';

const PRICE_PER_HOUR = 5000;

function calcDiscount(hours) {
    const steps = Math.floor(hours / 10);
    return Math.min(steps * 10, 90);
}

function calcTotalCost(hours) {
    const base = PRICE_PER_HOUR * hours;
    const discount = calcDiscount(hours);
    return base - Math.floor(base * discount / 100);
}

// ==================== PROMOTION MODAL ====================
const PromotionModal = ({ listing, onClose }) => {
    const { t } = useLanguage();
    const { addToast } = useToast();
    const [hours, setHours] = useState(1);
    const { data: profile } = useProfile();
    const { data: calcData, isLoading: calcLoading } = usePromotionCalculate(hours);
    const createPromotion = useCreatePromotion();

    const balance = profile?.balance ?? profile?.data?.balance ?? 0;
    const totalCost = calcData?.total_cost ?? calcTotalCost(hours);
    const discount = calcData?.discount_percent ?? calcDiscount(hours);
    const baseCost = calcData?.base_cost ?? (PRICE_PER_HOUR * hours);
    const deficit = Math.max(0, totalCost - balance);
    const canAfford = balance >= totalCost;

    const presets = [1, 3, 6, 10, 24, 48, 72];

    const handlePromote = () => {
        if (!canAfford) return;
        createPromotion.mutate(
            { listing_id: listing.id, hours },
            {
                onSuccess: (data) => {
                    if (data?.success) {
                        addToast(data.message || `E'lon ${hours} soatga reklama qilindi!`, 'success');
                        onClose();
                    } else {
                        addToast(data?.error?.message || 'Xatolik yuz berdi', 'error');
                    }
                },
                onError: (err) => {
                    const errData = err?.response?.data;
                    if (errData?.error?.code === 'insufficient_balance') {
                        addToast(errData.error.message, 'error');
                    } else {
                        addToast(errData?.error?.message || 'Xatolik yuz berdi', 'error');
                    }
                },
            }
        );
    };

    const telegramBotUrl = `https://t.me/wibestorebot?start=topup_${Math.ceil(deficit)}`;

    return (
        <div
            style={{
                position: 'fixed', inset: 0, zIndex: 1000,
                display: 'flex', alignItems: 'center', justifyContent: 'center',
                backgroundColor: 'rgba(0,0,0,0.6)', backdropFilter: 'blur(4px)',
                padding: '16px',
            }}
            onClick={(e) => e.target === e.currentTarget && onClose()}
        >
            <div
                className="animate-fadeIn"
                style={{
                    backgroundColor: 'var(--color-bg-secondary)',
                    borderRadius: 'var(--radius-xl)',
                    border: '1px solid var(--color-border-primary)',
                    maxWidth: '480px', width: '100%',
                    maxHeight: '90vh', overflowY: 'auto',
                    padding: '24px',
                }}
            >
                {/* Header */}
                <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: '20px' }}>
                    <div style={{ display: 'flex', alignItems: 'center', gap: '10px' }}>
                        <div style={{
                            width: '40px', height: '40px', borderRadius: 'var(--radius-lg)',
                            background: 'linear-gradient(135deg, var(--color-accent-blue), var(--color-accent-purple))',
                            display: 'flex', alignItems: 'center', justifyContent: 'center',
                        }}>
                            <Megaphone className="w-5 h-5" style={{ color: '#fff' }} />
                        </div>
                        <div>
                            <h3 style={{ fontSize: 'var(--font-size-lg)', fontWeight: 'var(--font-weight-bold)', color: 'var(--color-text-primary)', margin: 0 }}>
                                E'lonni reklama qilish
                            </h3>
                            <p style={{ fontSize: 'var(--font-size-xs)', color: 'var(--color-text-muted)', margin: 0 }}>
                                {listing?.title}
                            </p>
                        </div>
                    </div>
                    <button onClick={onClose} style={{ background: 'none', border: 'none', cursor: 'pointer', color: 'var(--color-text-muted)', padding: '4px' }}>
                        <X className="w-5 h-5" />
                    </button>
                </div>

                {/* Pricing info */}
                <div style={{
                    padding: '16px', borderRadius: 'var(--radius-lg)',
                    backgroundColor: 'var(--color-bg-tertiary)',
                    border: '1px solid var(--color-border-secondary)',
                    marginBottom: '16px',
                }}>
                    <div style={{ display: 'flex', alignItems: 'center', gap: '8px', marginBottom: '8px' }}>
                        <Timer className="w-4 h-4" style={{ color: 'var(--color-accent-blue)' }} />
                        <span style={{ fontSize: 'var(--font-size-sm)', fontWeight: 'var(--font-weight-semibold)', color: 'var(--color-text-primary)' }}>
                            Narxlar
                        </span>
                    </div>
                    <div style={{ fontSize: 'var(--font-size-sm)', color: 'var(--color-text-secondary)', lineHeight: '1.6' }}>
                        <div style={{ display: 'flex', justifyContent: 'space-between' }}>
                            <span>1 soat:</span>
                            <span style={{ fontWeight: 'var(--font-weight-semibold)' }}>{formatPrice(PRICE_PER_HOUR)}</span>
                        </div>
                        <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
                            <span>Chegirma:</span>
                            <span style={{ display: 'flex', alignItems: 'center', gap: '4px' }}>
                                <BadgePercent className="w-3.5 h-3.5" style={{ color: 'var(--color-success-text)' }} />
                                <span style={{ color: 'var(--color-success-text)', fontWeight: 'var(--font-weight-semibold)' }}>
                                    Har 10 soatda 10%
                                </span>
                            </span>
                        </div>
                    </div>
                </div>

                {/* Hour selector */}
                <div style={{ marginBottom: '16px' }}>
                    <label style={{ display: 'block', fontSize: 'var(--font-size-sm)', fontWeight: 'var(--font-weight-semibold)', color: 'var(--color-text-primary)', marginBottom: '8px' }}>
                        Necha soat?
                    </label>
                    <div style={{ display: 'flex', flexWrap: 'wrap', gap: '8px', marginBottom: '12px' }}>
                        {presets.map((h) => {
                            const d = calcDiscount(h);
                            return (
                                <button
                                    key={h}
                                    onClick={() => setHours(h)}
                                    style={{
                                        padding: '8px 14px', borderRadius: 'var(--radius-md)',
                                        border: hours === h ? '2px solid var(--color-accent-blue)' : '1px solid var(--color-border-primary)',
                                        backgroundColor: hours === h ? 'var(--color-accent-blue-muted, rgba(59,130,246,0.1))' : 'var(--color-bg-primary)',
                                        color: hours === h ? 'var(--color-accent-blue)' : 'var(--color-text-secondary)',
                                        cursor: 'pointer', fontSize: 'var(--font-size-sm)',
                                        fontWeight: 'var(--font-weight-semibold)',
                                        position: 'relative', transition: 'all 0.15s ease',
                                    }}
                                >
                                    {h} soat
                                    {d > 0 && (
                                        <span style={{
                                            position: 'absolute', top: '-8px', right: '-6px',
                                            fontSize: '10px', fontWeight: 'var(--font-weight-bold)',
                                            backgroundColor: 'var(--color-success-text)',
                                            color: '#fff', borderRadius: '10px', padding: '1px 5px',
                                        }}>
                                            -{d}%
                                        </span>
                                    )}
                                </button>
                            );
                        })}
                    </div>
                    <div style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
                        <input
                            type="number"
                            min={1}
                            max={720}
                            value={hours}
                            onChange={(e) => setHours(Math.max(1, Math.min(720, parseInt(e.target.value) || 1)))}
                            className="input input-sm"
                            style={{ width: '100px', textAlign: 'center' }}
                        />
                        <span style={{ fontSize: 'var(--font-size-sm)', color: 'var(--color-text-muted)' }}>soat (1 — 720)</span>
                    </div>
                </div>

                {/* Cost breakdown */}
                <div style={{
                    padding: '16px', borderRadius: 'var(--radius-lg)',
                    backgroundColor: 'var(--color-bg-tertiary)',
                    border: '1px solid var(--color-border-secondary)',
                    marginBottom: '16px',
                }}>
                    <div style={{ display: 'flex', justifyContent: 'space-between', marginBottom: '6px', fontSize: 'var(--font-size-sm)', color: 'var(--color-text-secondary)' }}>
                        <span>Asosiy narx ({hours} soat x {formatPrice(PRICE_PER_HOUR)}):</span>
                        <span>{formatPrice(baseCost)}</span>
                    </div>
                    {discount > 0 && (
                        <div style={{ display: 'flex', justifyContent: 'space-between', marginBottom: '6px', fontSize: 'var(--font-size-sm)', color: 'var(--color-success-text)' }}>
                            <span>Chegirma ({discount}%):</span>
                            <span>-{formatPrice(baseCost - totalCost)}</span>
                        </div>
                    )}
                    <div style={{ borderTop: '1px solid var(--color-border-primary)', paddingTop: '8px', marginTop: '8px', display: 'flex', justifyContent: 'space-between' }}>
                        <span style={{ fontSize: 'var(--font-size-md)', fontWeight: 'var(--font-weight-bold)', color: 'var(--color-text-primary)' }}>Jami:</span>
                        <span style={{ fontSize: 'var(--font-size-lg)', fontWeight: 'var(--font-weight-bold)', color: 'var(--color-accent-blue)' }}>
                            {formatPrice(totalCost)}
                        </span>
                    </div>
                </div>

                {/* Balance status */}
                <div style={{
                    padding: '12px 16px', borderRadius: 'var(--radius-lg)',
                    backgroundColor: canAfford ? 'rgba(34,197,94,0.08)' : 'rgba(239,68,68,0.08)',
                    border: `1px solid ${canAfford ? 'rgba(34,197,94,0.2)' : 'rgba(239,68,68,0.2)'}`,
                    marginBottom: '16px',
                }}>
                    <div style={{ display: 'flex', alignItems: 'center', gap: '8px', marginBottom: '4px' }}>
                        <Wallet className="w-4 h-4" style={{ color: canAfford ? 'var(--color-success-text)' : 'var(--color-error-text)' }} />
                        <span style={{ fontSize: 'var(--font-size-sm)', fontWeight: 'var(--font-weight-semibold)', color: canAfford ? 'var(--color-success-text)' : 'var(--color-error-text)' }}>
                            Balansingiz: {formatPrice(balance)}
                        </span>
                    </div>
                    {!canAfford && (
                        <div style={{ fontSize: 'var(--font-size-sm)', color: 'var(--color-error-text)', marginTop: '4px' }}>
                            <span>Kamomad: <strong>{formatPrice(deficit)}</strong></span>
                        </div>
                    )}
                </div>

                {/* Action buttons */}
                <div style={{ display: 'flex', gap: '10px' }}>
                    {canAfford ? (
                        <button
                            onClick={handlePromote}
                            disabled={createPromotion.isPending}
                            className="btn btn-primary"
                            style={{ flex: 1, display: 'flex', alignItems: 'center', justifyContent: 'center', gap: '8px' }}
                        >
                            {createPromotion.isPending ? (
                                <Loader2 className="w-4 h-4 animate-spin" />
                            ) : (
                                <Sparkles className="w-4 h-4" />
                            )}
                            {createPromotion.isPending ? 'Jarayon...' : 'Reklama qilish'}
                        </button>
                    ) : (
                        <a
                            href={telegramBotUrl}
                            target="_blank"
                            rel="noopener noreferrer"
                            className="btn btn-primary"
                            style={{ flex: 1, display: 'flex', alignItems: 'center', justifyContent: 'center', gap: '8px', textDecoration: 'none' }}
                        >
                            <Wallet className="w-4 h-4" />
                            Hisobni to'ldirish ({formatPrice(deficit)})
                            <ExternalLink className="w-3.5 h-3.5" />
                        </a>
                    )}
                    <button onClick={onClose} className="btn btn-secondary" style={{ minWidth: '80px' }}>
                        Bekor
                    </button>
                </div>
            </div>
        </div>
    );
};

// ==================== GAME CARD ====================
const GameCard = ({ game, isSelected, onClick, rentalCount }) => {
    const imageUrl = resolveImageUrl(game.logo || game.image || game.banner);

    return (
        <button
            onClick={onClick}
            style={{
                padding: '12px 16px',
                borderRadius: 'var(--radius-lg)',
                border: isSelected ? '2px solid var(--color-accent-blue)' : '1px solid var(--color-border-primary)',
                backgroundColor: isSelected ? 'var(--color-accent-blue-muted, rgba(59,130,246,0.08))' : 'var(--color-bg-secondary)',
                cursor: 'pointer',
                display: 'flex',
                alignItems: 'center',
                gap: '10px',
                transition: 'all 0.15s ease',
                minWidth: '140px',
                textAlign: 'left',
            }}
        >
            {imageUrl ? (
                <img
                    src={imageUrl}
                    alt={game.name}
                    style={{ width: '36px', height: '36px', borderRadius: 'var(--radius-md)', objectFit: 'cover' }}
                    loading="lazy"
                />
            ) : (
                <span style={{ fontSize: '24px' }}>{game.icon || '🎮'}</span>
            )}
            <div>
                <div style={{
                    fontSize: 'var(--font-size-sm)',
                    fontWeight: isSelected ? 'var(--font-weight-bold)' : 'var(--font-weight-semibold)',
                    color: isSelected ? 'var(--color-accent-blue)' : 'var(--color-text-primary)',
                }}>
                    {game.name}
                </div>
                {rentalCount > 0 && (
                    <div style={{ fontSize: 'var(--font-size-xs)', color: 'var(--color-text-muted)' }}>
                        {rentalCount} ta arenda
                    </div>
                )}
            </div>
        </button>
    );
};

// ==================== MAIN PAGE ====================
const RentalBrowsePage = () => {
    const navigate = useNavigate();
    const { isAuthenticated, user } = useAuth();
    const { t } = useLanguage();
    const { addToast } = useToast();
    const [searchParams, setSearchParams] = useSearchParams();

    useSEO({
        title: "Arenda — O'yin Akkauntlarini Ijaraga Olish | WibeStore",
        description: "O'yin akkauntlarini arzon narxda ijaraga oling. PUBG, Free Fire, Roblox, Steam va boshqalar.",
        canonical: 'https://wibestore.net/rent',
    });

    const urlGame = searchParams.get('game') ?? 'all';
    const urlSearch = searchParams.get('search') ?? '';
    const [selectedGame, setSelectedGame] = useState(urlGame);
    const [searchQuery, setSearchQuery] = useState(urlSearch);
    const [promoListing, setPromoListing] = useState(null);

    // Sync URL params
    useEffect(() => { setSelectedGame(urlGame); }, [urlGame]);
    useEffect(() => { setSearchQuery(urlSearch); }, [urlSearch]);

    useEffect(() => {
        const timer = setTimeout(() => {
            setSearchParams((prev) => {
                const next = new URLSearchParams(prev);
                const q = searchQuery.trim();
                if (q) next.set('search', q); else next.delete('search');
                if (selectedGame !== 'all') next.set('game', selectedGame); else next.delete('game');
                return next;
            }, { replace: true });
        }, 400);
        return () => clearTimeout(timer);
    }, [searchQuery, selectedGame, setSearchParams]);

    const { data: gamesData, isLoading: gamesLoading } = useGames();
    const { data, isLoading, isFetching, fetchNextPage, hasNextPage } = useRentalListings({
        ...(selectedGame !== 'all' && { game: selectedGame }),
        ...(searchQuery.trim() && { search: searchQuery.trim() }),
    });

    const rawGames = gamesData?.results ?? gamesData ?? [];
    const games = Array.isArray(rawGames) ? rawGames.filter(Boolean) : [];
    const rawListings = data?.pages?.flatMap(page => page?.results ?? []) ?? [];
    const allListings = Array.isArray(rawListings) ? rawListings.filter(Boolean) : [];

    // Group listings by game for counts
    const rentalCountByGame = useMemo(() => {
        const counts = {};
        allListings.forEach(l => {
            const slug = l.game_slug || l.game?.slug;
            if (slug) counts[slug] = (counts[slug] || 0) + 1;
        });
        return counts;
    }, [allListings]);

    return (
        <div className="page-enter" style={{ minHeight: '100vh' }}>
            <div className="gh-container">
                <PageHeader
                    breadcrumbs={[
                        { label: t('common.home') || 'Bosh sahifa', to: '/' },
                        { label: 'Arenda' },
                    ]}
                    title="Arenda"
                    description="O'yin akkauntlarini ijaraga oling yoki o'zingizning akkauntingizni joylashtiring"
                    action={
                        isAuthenticated && (
                            <Link
                                to="/rent/create"
                                className="btn btn-primary"
                                style={{ display: 'inline-flex', alignItems: 'center', gap: '6px' }}
                            >
                                <Plus className="w-4 h-4" />
                                E'lon joylash
                            </Link>
                        )
                    }
                />
            </div>

            <div className="gh-container" style={{ paddingBottom: '48px' }}>
                {/* Search bar */}
                <div style={{ marginBottom: '20px' }}>
                    <div className="relative" style={{ maxWidth: '480px' }}>
                        <Search
                            className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4"
                            style={{ color: 'var(--color-text-muted)' }}
                        />
                        <input
                            type="text"
                            placeholder="Akkaunt nomi yoki o'yin bo'yicha qidirish..."
                            value={searchQuery}
                            onChange={(e) => setSearchQuery(e.target.value)}
                            className="input input-md w-full"
                            style={{ paddingLeft: '36px' }}
                        />
                        {searchQuery && (
                            <button
                                onClick={() => setSearchQuery('')}
                                className="absolute right-3 top-1/2 -translate-y-1/2"
                                style={{ background: 'none', border: 'none', cursor: 'pointer', color: 'var(--color-text-muted)' }}
                            >
                                <X className="w-4 h-4" />
                            </button>
                        )}
                    </div>
                </div>

                {/* Game selection */}
                <div style={{ marginBottom: '24px' }}>
                    <h2 style={{
                        fontSize: 'var(--font-size-md)',
                        fontWeight: 'var(--font-weight-bold)',
                        color: 'var(--color-text-primary)',
                        marginBottom: '12px',
                        display: 'flex', alignItems: 'center', gap: '8px',
                    }}>
                        <Key className="w-5 h-5" style={{ color: 'var(--color-accent-blue)' }} />
                        O'yinni tanlang
                    </h2>
                    <div style={{
                        display: 'flex', flexWrap: 'wrap', gap: '10px',
                        overflowX: 'auto', paddingBottom: '4px',
                    }}>
                        <button
                            onClick={() => setSelectedGame('all')}
                            style={{
                                padding: '10px 18px',
                                borderRadius: 'var(--radius-lg)',
                                border: selectedGame === 'all' ? '2px solid var(--color-accent-blue)' : '1px solid var(--color-border-primary)',
                                backgroundColor: selectedGame === 'all' ? 'var(--color-accent-blue-muted, rgba(59,130,246,0.08))' : 'var(--color-bg-secondary)',
                                color: selectedGame === 'all' ? 'var(--color-accent-blue)' : 'var(--color-text-secondary)',
                                cursor: 'pointer',
                                fontWeight: 'var(--font-weight-semibold)',
                                fontSize: 'var(--font-size-sm)',
                                display: 'flex', alignItems: 'center', gap: '6px',
                            }}
                        >
                            🎮 Hammasi
                            <span className="badge-count" style={{ fontSize: '11px' }}>
                                {allListings.length}
                            </span>
                        </button>
                        {games.map((game) => (
                            <GameCard
                                key={game.id || game.slug}
                                game={game}
                                isSelected={selectedGame === game.slug}
                                onClick={() => setSelectedGame(selectedGame === game.slug ? 'all' : game.slug)}
                                rentalCount={rentalCountByGame[game.slug] || 0}
                            />
                        ))}
                    </div>
                </div>

                {/* Promotion banner for logged-in users with rental listings */}
                {isAuthenticated && (
                    <div style={{
                        marginBottom: '24px',
                        padding: '16px 20px',
                        borderRadius: 'var(--radius-xl)',
                        background: 'linear-gradient(135deg, rgba(59,130,246,0.08), rgba(139,92,246,0.08))',
                        border: '1px solid rgba(59,130,246,0.15)',
                        display: 'flex', alignItems: 'center', justifyContent: 'space-between',
                        flexWrap: 'wrap', gap: '12px',
                    }}>
                        <div style={{ display: 'flex', alignItems: 'center', gap: '10px' }}>
                            <TrendingUp className="w-5 h-5" style={{ color: 'var(--color-accent-blue)' }} />
                            <div>
                                <div style={{ fontSize: 'var(--font-size-sm)', fontWeight: 'var(--font-weight-bold)', color: 'var(--color-text-primary)' }}>
                                    E'loningizni tepaga chiqaring!
                                </div>
                                <div style={{ fontSize: 'var(--font-size-xs)', color: 'var(--color-text-muted)' }}>
                                    Soatiga atigi {formatPrice(PRICE_PER_HOUR)} | Har 10 soatda 10% chegirma
                                </div>
                            </div>
                        </div>
                        <Link
                            to="/rent/create"
                            className="btn btn-sm btn-primary"
                            style={{ display: 'inline-flex', alignItems: 'center', gap: '4px', textDecoration: 'none', whiteSpace: 'nowrap' }}
                        >
                            <Plus className="w-3.5 h-3.5" />
                            E'lon joylash
                        </Link>
                    </div>
                )}

                {/* Listings */}
                {isLoading ? (
                    <SkeletonGrid count={8} />
                ) : allListings.length === 0 ? (
                    <div style={{
                        textAlign: 'center', padding: '60px 20px',
                        backgroundColor: 'var(--color-bg-secondary)',
                        borderRadius: 'var(--radius-xl)',
                        border: '1px solid var(--color-border-primary)',
                    }}>
                        <Key className="w-12 h-12" style={{ color: 'var(--color-text-muted)', margin: '0 auto 16px' }} />
                        <h3 style={{ fontSize: 'var(--font-size-lg)', fontWeight: 'var(--font-weight-bold)', color: 'var(--color-text-primary)', marginBottom: '8px' }}>
                            {selectedGame !== 'all' ? 'Bu o\'yin uchun arenda e\'lonlari topilmadi' : 'Hozircha arenda e\'lonlari yo\'q'}
                        </h3>
                        <p style={{ fontSize: 'var(--font-size-sm)', color: 'var(--color-text-muted)', marginBottom: '20px' }}>
                            Birinchi bo'lib e'lon joylang va daromad oling!
                        </p>
                        {isAuthenticated && (
                            <Link
                                to="/rent/create"
                                className="btn btn-primary"
                                style={{ display: 'inline-flex', alignItems: 'center', gap: '6px' }}
                            >
                                <Plus className="w-4 h-4" />
                                E'lon joylash
                            </Link>
                        )}
                    </div>
                ) : (
                    <>
                        {/* Listing grid */}
                        <div style={{
                            display: 'grid',
                            gridTemplateColumns: 'repeat(auto-fill, minmax(260px, 1fr))',
                            gap: '16px',
                        }}>
                            {allListings.map((listing) => (
                                <div key={listing.id} style={{ position: 'relative' }}>
                                    <AccountCard account={listing} />
                                    {/* Promote button for own listings */}
                                    {isAuthenticated && user && listing.seller?.id === user.id && (
                                        <button
                                            onClick={(e) => {
                                                e.preventDefault();
                                                e.stopPropagation();
                                                setPromoListing(listing);
                                            }}
                                            style={{
                                                position: 'absolute', top: '8px', left: '8px',
                                                padding: '4px 10px', borderRadius: 'var(--radius-md)',
                                                background: 'linear-gradient(135deg, var(--color-accent-blue), var(--color-accent-purple))',
                                                color: '#fff', border: 'none', cursor: 'pointer',
                                                fontSize: '11px', fontWeight: 'var(--font-weight-bold)',
                                                display: 'flex', alignItems: 'center', gap: '4px',
                                                boxShadow: '0 2px 8px rgba(0,0,0,0.2)',
                                                zIndex: 5,
                                            }}
                                        >
                                            <Megaphone className="w-3 h-3" />
                                            Reklama
                                        </button>
                                    )}
                                </div>
                            ))}
                        </div>

                        {/* Load more */}
                        {hasNextPage && (
                            <div style={{ textAlign: 'center', marginTop: '24px' }}>
                                <button
                                    onClick={() => fetchNextPage()}
                                    disabled={isFetching}
                                    className="btn btn-secondary"
                                    style={{ display: 'inline-flex', alignItems: 'center', gap: '6px' }}
                                >
                                    {isFetching ? <Loader2 className="w-4 h-4 animate-spin" /> : <ChevronRight className="w-4 h-4" />}
                                    {isFetching ? 'Yuklanmoqda...' : 'Ko\'proq ko\'rsatish'}
                                </button>
                            </div>
                        )}
                    </>
                )}
            </div>

            {/* Promotion modal */}
            {promoListing && (
                <PromotionModal
                    listing={promoListing}
                    onClose={() => setPromoListing(null)}
                />
            )}
        </div>
    );
};

export default RentalBrowsePage;
