import { useParams, Link, useNavigate, useLocation } from 'react-router-dom';
import { useState, useEffect, useMemo } from 'react';
import {
    Heart, Share2, Shield, Star, MessageCircle, CheckCircle,
    AlertCircle, ChevronLeft, ChevronRight, Copy, Check,
    Gamepad2, Trophy, Swords, Layers, ArrowLeft
} from 'lucide-react';
import { useListing, useAddToFavorites, useRemoveFromFavorites, useListings } from '../hooks';
import ReviewList from '../components/ReviewList';
import AccountCard from '../components/AccountCard';
import SkeletonLoader from '../components/SkeletonLoader';
import { useLanguage } from '../context/LanguageContext';
import { useToast } from '../components/ToastProvider';
import { useAuth } from '../context/AuthContext';
import { useChat } from '../context/ChatContext';
import { accounts as mockAccounts } from '../data/mockData';
import BuyerRulesQuiz from '../components/BuyerRulesQuiz';

/* ─── Image Carousel ──────────────────────────────────────────── */
const ImageCarousel = ({ images, title }) => {
    const [current, setCurrent] = useState(0);
    const [imgError, setImgError] = useState(false);
    const total = images?.length || 0;
    const imgSrc = images?.[current]?.image || images?.[current];
    useEffect(() => {
        queueMicrotask(() => setImgError(false));
    }, [current]);

    if (!total) {
        return (
            <div style={{
                width: '100%', aspectRatio: '16/9',
                display: 'flex', alignItems: 'center', justifyContent: 'center',
                backgroundColor: 'var(--color-bg-tertiary)',
                borderRadius: 'var(--radius-xl)',
                border: '1px solid var(--color-border-default)',
                color: 'var(--color-text-muted)',
                flexDirection: 'column', gap: '12px',
            }}>
                <Gamepad2 style={{ width: '48px', height: '48px', opacity: 0.3 }} />
                <span style={{ fontSize: 'var(--font-size-sm)' }}>Rasm yo'q</span>
            </div>
        );
    }

    const prev = () => setCurrent((c) => (c - 1 + total) % total);
    const next = () => setCurrent((c) => (c + 1) % total);

    return (
        <div>
            {/* Main image */}
            <div style={{
                position: 'relative',
                borderRadius: 'var(--radius-xl)',
                overflow: 'hidden',
                border: '1px solid var(--color-border-default)',
                backgroundColor: 'var(--color-bg-secondary)',
                aspectRatio: '16/9',
            }}>
                {!imgError && imgSrc ? (
                    <img
                        src={imgSrc}
                        alt={`${title} - ${current + 1}`}
                        style={{ width: '100%', height: '100%', objectFit: 'cover', display: 'block' }}
                        onError={() => setImgError(true)}
                    />
                ) : (
                    <div style={{
                        width: '100%', height: '100%',
                        display: 'flex', alignItems: 'center', justifyContent: 'center',
                        flexDirection: 'column', gap: '12px',
                        color: 'var(--color-text-muted)',
                    }}>
                        <Gamepad2 style={{ width: '48px', height: '48px', opacity: 0.3 }} />
                        <span style={{ fontSize: 'var(--font-size-sm)' }}>Rasm yuklanmadi</span>
                    </div>
                )}

                {/* Nav arrows */}
                {total > 1 && (
                    <>
                        <button
                            onClick={prev}
                            aria-label="Previous image"
                            style={{
                                position: 'absolute', left: '12px', top: '50%', transform: 'translateY(-50%)',
                                width: '36px', height: '36px', borderRadius: 'var(--radius-full)',
                                backgroundColor: 'rgba(0,0,0,0.5)', border: 'none',
                                color: '#fff', cursor: 'pointer', display: 'flex',
                                alignItems: 'center', justifyContent: 'center',
                                backdropFilter: 'blur(4px)', transition: 'background 0.15s',
                            }}
                        >
                            <ChevronLeft style={{ width: '18px', height: '18px' }} />
                        </button>
                        <button
                            onClick={next}
                            aria-label="Next image"
                            style={{
                                position: 'absolute', right: '12px', top: '50%', transform: 'translateY(-50%)',
                                width: '36px', height: '36px', borderRadius: 'var(--radius-full)',
                                backgroundColor: 'rgba(0,0,0,0.5)', border: 'none',
                                color: '#fff', cursor: 'pointer', display: 'flex',
                                alignItems: 'center', justifyContent: 'center',
                                backdropFilter: 'blur(4px)', transition: 'background 0.15s',
                            }}
                        >
                            <ChevronRight style={{ width: '18px', height: '18px' }} />
                        </button>
                    </>
                )}

                {/* Counter */}
                {total > 1 && (
                    <div style={{
                        position: 'absolute', bottom: '12px', right: '12px',
                        backgroundColor: 'rgba(0,0,0,0.55)', backdropFilter: 'blur(4px)',
                        borderRadius: 'var(--radius-full)', padding: '4px 10px',
                        fontSize: 'var(--font-size-sm)', color: '#fff', fontWeight: 'var(--font-weight-medium)',
                    }}>
                        {current + 1} / {total}
                    </div>
                )}
            </div>

            {/* Thumbnails */}
            {total > 1 && (
                <div style={{ display: 'flex', gap: '8px', marginTop: '10px', overflowX: 'auto', paddingBottom: '4px' }}>
                    {images.map((img, i) => (
                        <button
                            key={i}
                            onClick={() => setCurrent(i)}
                            aria-label={`Image ${i + 1}`}
                            style={{
                                flexShrink: 0, width: '72px', height: '52px',
                                borderRadius: 'var(--radius-md)', overflow: 'hidden',
                                border: `2px solid ${i === current ? 'var(--color-accent-blue)' : 'var(--color-border-default)'}`,
                                padding: 0, cursor: 'pointer', transition: 'border-color 0.15s',
                                backgroundColor: 'var(--color-bg-tertiary)',
                            }}
                        >
                            <img src={img?.image || img} alt="" style={{ width: '100%', height: '100%', objectFit: 'cover' }} />
                        </button>
                    ))}
                </div>
            )}
        </div>
    );
};

/* ─── Feature Tag ─────────────────────────────────────────────── */
const FeatureTag = ({ label }) => (
    <span style={{
        display: 'inline-flex', alignItems: 'center',
        padding: '4px 10px',
        borderRadius: 'var(--radius-full)',
        fontSize: 'var(--font-size-sm)',
        backgroundColor: 'var(--color-info-bg)',
        color: 'var(--color-text-accent)',
        border: '1px solid rgba(31,111,235,0.2)',
        whiteSpace: 'nowrap',
    }}>
        <Check style={{ width: '12px', height: '12px', marginRight: '4px' }} />
        {label}
    </span>
);

/* ─── Stat Item ───────────────────────────────────────────────── */
const StatItem = ({ icon: Icon, label, value, color }) => (
    <div style={{
        display: 'flex', flexDirection: 'column', alignItems: 'center',
        padding: '12px', borderRadius: 'var(--radius-lg)',
        backgroundColor: 'var(--color-bg-tertiary)',
        border: '1px solid var(--color-border-muted)',
        gap: '4px', minWidth: '72px',
    }}>
        <Icon style={{ width: '18px', height: '18px', color: color || 'var(--color-accent-blue)' }} />
        <span style={{ fontSize: 'var(--font-size-base)', fontWeight: 'var(--font-weight-bold)', color: 'var(--color-text-primary)' }}>
            {value || '—'}
        </span>
        <span style={{ fontSize: '11px', color: 'var(--color-text-muted)', textTransform: 'uppercase', letterSpacing: '0.03em' }}>
            {label}
        </span>
    </div>
);

/* ─── Main Component ──────────────────────────────────────────── */
const AccountDetailPage = () => {
    const { accountId } = useParams();
    const navigate = useNavigate();
    const location = useLocation();
    const { t } = useLanguage();
    const { addToast } = useToast();
    const { user, isAuthenticated } = useAuth();
    const { startConversation, openChat } = useChat();

    const { data: apiListing, isLoading, error, refetch } = useListing(accountId);
    const { mutate: addToFavorites } = useAddToFavorites();
    const { mutate: removeFromFavorites } = useRemoveFromFavorites();
    // API yoki darhol mock — sotuvdagi akkauntlar har doim ko‘rinsin (API kutmasdan)
    const mockFallback = accountId ? mockAccounts.find((a) => String(a.id) === String(accountId)) : null;
    const rawListing = apiListing || mockFallback;
    // API va mock formatini birlashtirish — bitta listing obyekti, hammasi mukammal ko‘rinsin
    const listing = rawListing ? {
        ...rawListing,
        description: rawListing.description || mockFallback?.description || '',
        images: rawListing.images?.length ? rawListing.images : (rawListing.image ? [{ image: rawListing.image }] : (mockFallback?.images?.length ? mockFallback.images : (mockFallback?.image ? [{ image: mockFallback.image }] : []))),
        image: rawListing.image || rawListing.images?.[0]?.image || mockFallback?.image,
        seller: {
            ...(rawListing.seller || {}),
            display_name: rawListing.seller?.display_name ?? rawListing.seller?.name ?? mockFallback?.seller?.name,
            name: rawListing.seller?.name ?? rawListing.seller?.display_name ?? mockFallback?.seller?.name,
            total_sales: rawListing.seller?.total_sales ?? rawListing.seller?.sales ?? mockFallback?.seller?.sales ?? 0,
            rating: rawListing.seller?.rating ?? mockFallback?.seller?.rating ?? 5,
        },
        price: rawListing.price ?? mockFallback?.price,
        features: rawListing.features?.length ? rawListing.features : (mockFallback ? ['Escrow himoya', 'Tez yetkazish', mockFallback.game?.name || mockFallback.gameName].filter(Boolean) : []),
    } : null;
    const { data: relatedData } = useListings({ game: listing?.game?.id, limit: 4 });

    const [isLiked, setIsLiked] = useState(false);
    const [copied, setCopied] = useState(false);
    const [activeTab, setActiveTab] = useState('description');
    const [showBuyerRulesModal, setShowBuyerRulesModal] = useState(false);

    // Sevimlilar: API yoki localStorage (kirish qilmaganida) — defer to avoid sync setState in effect
    const FAV_STORAGE_KEY = 'wibeFavoriteListingIds';
    useEffect(() => {
        if (!listing?.id || isAuthenticated) return;
        try {
            const saved = JSON.parse(localStorage.getItem(FAV_STORAGE_KEY) || '[]');
            const liked = saved.includes(String(listing.id));
            queueMicrotask(() => setIsLiked(liked));
        } catch {
            queueMicrotask(() => setIsLiked(false));
        }
    }, [listing?.id, isAuthenticated]);

    /* ── Loading: faqat listing yo‘q bo‘lsa (API ham, mock ham yo‘q) skeleton ko‘rsatamiz ── */
    if (isLoading && !rawListing) {
        return (
            <div className="page-enter" style={{ minHeight: 'calc(100vh - 64px)', padding: '32px' }}>
                <div className="gh-container">
                    <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '32px' }}>
                        <div>
                            <div className="skeleton" style={{ aspectRatio: '16/9', borderRadius: 'var(--radius-xl)', marginBottom: '10px' }} />
                            <div style={{ display: 'flex', gap: '8px' }}>
                                {[1, 2, 3].map(i => <div key={i} className="skeleton" style={{ width: '72px', height: '52px', borderRadius: 'var(--radius-md)' }} />)}
                            </div>
                        </div>
                        <div style={{ display: 'flex', flexDirection: 'column', gap: '16px' }}>
                            <div className="skeleton skeleton-title" style={{ width: '70%', height: '28px' }} />
                            <div className="skeleton skeleton-text" style={{ width: '40%' }} />
                            <div className="skeleton" style={{ height: '48px', borderRadius: 'var(--radius-lg)' }} />
                            <div className="skeleton skeleton-button" style={{ width: '100%', height: '44px', borderRadius: 'var(--radius-lg)' }} />
                        </div>
                    </div>
                </div>
            </div>
        );
    }

    /* ── Not found or error ── */
    if (!listing) {
        const isNetworkError = !error?.response;
        const description = isNetworkError ? t('detail.listing_error_desc') : t('detail.listing_not_found_desc');

        return (
            <div className="page-enter" style={{ minHeight: 'calc(100vh - 64px)' }}>
                <div className="gh-container">
                    <div className="empty-state" style={{ paddingTop: '80px' }}>
                        <div className="empty-state-icon" style={{ width: 64, height: 64, borderRadius: 'var(--radius-full)', backgroundColor: 'var(--color-error-bg)', display: 'flex', alignItems: 'center', justifyContent: 'center', margin: '0 auto var(--space-6)' }}>
                            <AlertCircle style={{ width: 32, height: 32, color: 'var(--color-error)' }} />
                        </div>
                        <h3 className="empty-state-title">{t('detail.listing_not_found')}</h3>
                        <p className="empty-state-description">{description}</p>
                        <div style={{ display: 'flex', flexWrap: 'wrap', gap: 'var(--space-3)', justifyContent: 'center' }}>
                            {isNetworkError && (
                                <button type="button" onClick={() => refetch()} className="btn btn-secondary btn-md">
                                    {t('detail.try_again')}
                                </button>
                            )}
                            <Link to="/products" className="btn btn-primary btn-md" style={{ textDecoration: 'none', display: 'inline-flex', alignItems: 'center', gap: 'var(--space-2)' }}>
                                <ArrowLeft style={{ width: '16px', height: '16px' }} />
                                {t('detail.back_to_products')}
                            </Link>
                        </div>
                    </div>
                </div>
            </div>
        );
    }

    /* ── Handlers ── */
    const handleFavorite = () => {
        if (isAuthenticated) {
            if (isLiked) {
                removeFromFavorites(listing.id, {
                    onSuccess: () => {
                        setIsLiked(false);
                        addToast({ type: 'info', title: t('detail.removed_from_favorites') });
                    },
                    onError: () => addToast({ type: 'error', title: t('detail.delete_error') })
                });
            } else {
                addToFavorites(listing.id, {
                    onSuccess: () => {
                        setIsLiked(true);
                        addToast({ type: 'success', title: t('detail.added_to_favorites') });
                    },
                    onError: () => addToast({ type: 'error', title: t('detail.delete_error') })
                });
            }
        } else {
            try {
                const saved = JSON.parse(localStorage.getItem(FAV_STORAGE_KEY) || '[]');
                const idStr = String(listing.id);
                const next = isLiked ? saved.filter((id) => id !== idStr) : [...saved, idStr];
                localStorage.setItem(FAV_STORAGE_KEY, JSON.stringify(next));
                setIsLiked(!isLiked);
                addToast({ type: 'success', title: isLiked ? t('detail.removed_from_favorites') : t('detail.added_to_favorites') });
            } catch {
                addToast({ type: 'error', title: t('detail.copy_failed') });
            }
        }
    };

    const handleBuyClick = () => {
        if (!isAuthenticated || !user) {
            addToast({ type: 'info', title: t('detail.contact_seller') || 'Sotuvchi bilan bog\'lanish uchun kirish qiling' });
            navigate('/login?redirect=' + encodeURIComponent(location.pathname));
            return;
        }
        setShowBuyerRulesModal(true);
    };

    const handleContactSeller = () => {
        if (!isAuthenticated || !user) {
            addToast({ type: 'info', title: t('detail.contact_seller') || 'Sotuvchi bilan bog\'lanish uchun kirish qiling' });
            navigate('/login?redirect=' + encodeURIComponent(location.pathname));
            return;
        }
        const seller = {
            id: listing.seller?.id,
            name: listing.seller?.display_name || listing.seller?.name || t('detail.seller'),
            rating: listing.seller?.rating ?? 5
        };
        const account = {
            id: listing.id,
            title: listing.title,
            image: listing.images?.[0]?.image || listing.image
        };
        if (seller.id && account.id) {
            startConversation(seller, account);
            openChat();
        } else {
            addToast({ type: 'info', title: 'Sotuvchi bilan chat tez orada ulanadi.' });
        }
    };

    const handleShare = async () => {
        try {
            await navigator.clipboard.writeText(window.location.href);
            setCopied(true);
            setTimeout(() => setCopied(false), 2000);
            addToast({ type: 'success', title: t('detail.link_copied') });
        } catch {
            addToast({ type: 'error', title: t('detail.copy_failed') });
        }
    };

    const formatPrice = (price) => {
        if (!price) return '—';
        return new Intl.NumberFormat('uz-UZ').format(price) + ' so\'m';
    };

    const features = listing.features || [];
    const images = listing.images?.length ? listing.images : (listing.image ? [{ image: listing.image }] : []);
    const apiRelated = (relatedData?.pages?.[0]?.results || []).filter((l) => l.id !== listing.id).slice(0, 4);
    const relatedListings = apiRelated.length > 0
        ? apiRelated
        : mockAccounts.filter((a) => (a.game?.slug || a.gameId) === (listing.game?.slug || listing.gameId) && a.id !== listing.id).slice(0, 4);

    const tabs = [
        { id: 'description', label: t('detail.description') || 'Tavsif' },
        { id: 'features', label: t('detail.features') || 'Xususiyatlar' },
        { id: 'reviews', label: t('detail.reviews') || 'Sharhlar' },
    ];

    // Sotuvchiga tegishli so'nggi 2 ta sharh (localStorage — API ulansa o'zgaradi)
    const recentSellerReviews = useMemo(() => {
        const sellerId = listing?.seller?.id;
        if (!sellerId) return [];
        try {
            const raw = localStorage.getItem('wibeReviews');
            if (!raw) return [];
            const all = JSON.parse(raw);
            const forSeller = all.filter((r) => String(r.sellerId) === String(sellerId));
            return forSeller.sort((a, b) => new Date(b.createdAt || 0) - new Date(a.createdAt || 0)).slice(0, 2);
        } catch {
            return [];
        }
    }, [listing?.seller?.id]);

    return (
        <div className="page-enter" style={{ minHeight: '100vh', paddingBottom: '80px' }}>
            {showBuyerRulesModal && (
                <BuyerRulesQuiz
                    inModal
                    onPass={() => {
                        setShowBuyerRulesModal(false);
                        handleContactSeller();
                    }}
                    onClose={() => setShowBuyerRulesModal(false)}
                />
            )}
            <div className="gh-container">
                {/* Breadcrumbs */}
                <div className="breadcrumbs">
                    <Link to="/">{t('common.home')}</Link>
                    <span className="breadcrumb-separator">/</span>
                    <Link to="/products">{t('common.products')}</Link>
                    {listing.game?.name && (
                        <>
                            <span className="breadcrumb-separator">/</span>
                            <Link to={`/game/${listing.game?.slug || listing.game?.id}`}>{listing.game.name}</Link>
                        </>
                    )}
                    <span className="breadcrumb-separator">/</span>
                    <span className="breadcrumb-current" style={{ maxWidth: '200px', overflow: 'hidden', textOverflow: 'ellipsis' }}>
                        {listing.title}
                    </span>
                </div>

                {/* Main grid */}
                <div
                    className="grid grid-cols-1 lg:grid-cols-2"
                    style={{ gap: '32px', marginTop: '20px' }}
                >
                    {/* ── Left: Images ── */}
                    <div>
                        <ImageCarousel images={images} title={listing.title} />
                    </div>

                    {/* ── Right: Info + Purchase ── */}
                    <div style={{ display: 'flex', flexDirection: 'column', gap: '20px' }}>
                        {/* Title & actions */}
                        <div>
                            <div style={{ display: 'flex', alignItems: 'flex-start', justifyContent: 'space-between', gap: '12px', marginBottom: '8px' }}>
                                <div style={{ flex: 1 }}>
                                    {listing.is_premium && (
                                        <span className="badge badge-premium" style={{ marginBottom: '8px', display: 'inline-flex' }}>
                                            ★ Premium
                                        </span>
                                    )}
                                    <h1 style={{
                                        fontSize: 'var(--font-size-2xl)',
                                        fontWeight: 'var(--font-weight-bold)',
                                        color: 'var(--color-text-primary)',
                                        lineHeight: 'var(--line-height-2xl)',
                                    }}>
                                        {listing.title}
                                    </h1>
                                </div>
                                <div style={{ display: 'flex', gap: '8px', flexShrink: 0 }}>
                                    <button
                                        onClick={handleFavorite}
                                        aria-label={isLiked ? t('detail.removed_from_favorites') : t('detail.added_to_favorites')}
                                        className="btn btn-ghost btn-md"
                                        style={{ padding: '0 10px', color: isLiked ? 'var(--color-accent-red)' : undefined }}
                                    >
                                        <Heart style={{ width: '20px', height: '20px', fill: isLiked ? 'currentColor' : 'none' }} />
                                    </button>
                                    <button
                                        onClick={handleShare}
                                        aria-label={t('detail.share')}
                                        className="btn btn-ghost btn-md"
                                        style={{ padding: '0 10px' }}
                                    >
                                        {copied
                                            ? <Check style={{ width: '18px', height: '18px', color: 'var(--color-accent-green)' }} />
                                            : <Copy style={{ width: '18px', height: '18px' }} />
                                        }
                                    </button>
                                </div>
                            </div>

                            {listing.game?.name && (
                                <p style={{ fontSize: 'var(--font-size-sm)', color: 'var(--color-text-muted)' }}>
                                    {listing.game.name}
                                </p>
                            )}
                        </div>

                        {/* Stats row */}
                        {(listing.level || listing.rank || listing.skins_count) && (
                            <div style={{ display: 'flex', gap: '8px', flexWrap: 'wrap' }}>
                                {listing.level && (
                                    <StatItem icon={Trophy} label={t('detail.level')} value={listing.level} color="var(--color-premium-gold-light)" />
                                )}
                                {listing.rank && (
                                    <StatItem icon={Swords} label={t('detail.rank')} value={listing.rank} color="var(--color-accent-purple)" />
                                )}
                                {listing.skins_count > 0 && (
                                    <StatItem icon={Layers} label={t('detail.skins')} value={`${listing.skins_count}+`} color="var(--color-accent-blue)" />
                                )}
                            </div>
                        )}

                        {/* Price box */}
                        <div style={{
                            padding: '20px',
                            borderRadius: 'var(--radius-xl)',
                            backgroundColor: 'var(--color-bg-secondary)',
                            border: '1px solid var(--color-border-default)',
                        }}>
                            <p style={{ fontSize: 'var(--font-size-sm)', color: 'var(--color-text-muted)', marginBottom: '4px' }}>
                                {t('detail.price') || 'Narx'}
                            </p>
                            <p style={{
                                fontSize: 'var(--font-size-3xl)',
                                fontWeight: 'var(--font-weight-bold)',
                                color: 'var(--color-text-accent)',
                                lineHeight: '1.2',
                                marginBottom: '16px',
                            }}>
                                {formatPrice(listing.price)}
                            </p>

                            {/* Trust badges */}
                            <div style={{ display: 'flex', gap: '8px', flexWrap: 'wrap', marginBottom: '16px' }}>
                                <span style={{
                                    display: 'inline-flex', alignItems: 'center', gap: '6px',
                                    padding: '6px 10px', borderRadius: 'var(--radius-md)',
                                    backgroundColor: 'var(--color-success-bg)', color: 'var(--color-accent-green)',
                                    fontSize: 'var(--font-size-sm)', fontWeight: 'var(--font-weight-medium)',
                                }}>
                                    <Shield style={{ width: '14px', height: '14px' }} /> {t('detail.escrow_protection')}
                                </span>
                                <span style={{
                                    display: 'inline-flex', alignItems: 'center', gap: '6px',
                                    padding: '6px 10px', borderRadius: 'var(--radius-md)',
                                    backgroundColor: 'var(--color-info-bg)', color: 'var(--color-accent-blue)',
                                    fontSize: 'var(--font-size-sm)', fontWeight: 'var(--font-weight-medium)',
                                }}>
                                    <CheckCircle style={{ width: '14px', height: '14px' }} /> {t('detail.verified_seller')}
                                </span>
                            </div>

                            {/* CTA buttons */}
                            <div style={{ display: 'flex', flexDirection: 'column', gap: '10px' }}>
                                <button type="button" onClick={handleBuyClick} className="btn btn-primary btn-lg" style={{ width: '100%', justifyContent: 'center' }}>
                                    {t('detail.buy_now') || 'Sotib olish'}
                                </button>
                                <button
                                    type="button"
                                    onClick={handleContactSeller}
                                    className="btn btn-secondary btn-lg"
                                    style={{ width: '100%', justifyContent: 'center' }}
                                >
                                    <MessageCircle style={{ width: '18px', height: '18px' }} />
                                    {t('detail.contact_seller') || 'Sotuvchi bilan bog\'lanish'}
                                </button>
                            </div>
                        </div>

                        {/* Seller card — profilga o'tish */}
                        {listing.seller?.id ? (
                            <Link
                                to={`/seller/${listing.seller.id}`}
                                state={{ seller: listing.seller }}
                                style={{
                                    display: 'block',
                                    padding: '16px',
                                    borderRadius: 'var(--radius-xl)',
                                    backgroundColor: 'var(--color-bg-secondary)',
                                    border: '1px solid var(--color-border-default)',
                                    textDecoration: 'none',
                                    color: 'inherit',
                                    transition: 'background-color 0.15s ease, border-color 0.15s ease',
                                }}
                                onMouseEnter={(e) => {
                                    e.currentTarget.style.backgroundColor = 'var(--color-bg-tertiary)';
                                    e.currentTarget.style.borderColor = 'var(--color-accent-blue)';
                                }}
                                onMouseLeave={(e) => {
                                    e.currentTarget.style.backgroundColor = 'var(--color-bg-secondary)';
                                    e.currentTarget.style.borderColor = 'var(--color-border-default)';
                                }}
                            >
                                <p style={{ fontSize: 'var(--font-size-sm)', color: 'var(--color-text-muted)', marginBottom: '12px', fontWeight: 'var(--font-weight-medium)' }}>
                                    {t('detail.seller') || 'Sotuvchi'} — {t('detail.view_profile') || 'Profilni ko\'rish'}
                                </p>
                                <div style={{ display: 'flex', alignItems: 'center', gap: '12px' }}>
                                    <div style={{
                                        width: '44px', height: '44px',
                                        borderRadius: 'var(--radius-full)',
                                        background: 'linear-gradient(135deg, var(--color-accent-blue), var(--color-accent-purple))',
                                        display: 'flex', alignItems: 'center', justifyContent: 'center',
                                        color: '#fff', fontWeight: 'var(--font-weight-bold)',
                                        fontSize: 'var(--font-size-lg)', flexShrink: 0,
                                    }}>
                                        {listing.seller?.display_name?.charAt(0)?.toUpperCase() || 'S'}
                                    </div>
                                    <div style={{ flex: 1, minWidth: 0 }}>
                                        <p style={{ fontWeight: 'var(--font-weight-semibold)', color: 'var(--color-text-primary)', marginBottom: '2px' }}>
                                            {listing.seller?.display_name || t('detail.seller')}
                                        </p>
                                        <div style={{ display: 'flex', alignItems: 'center', gap: '8px', fontSize: 'var(--font-size-sm)', color: 'var(--color-text-secondary)' }}>
                                            <span style={{ display: 'flex', alignItems: 'center', gap: '3px' }}>
                                                <Star style={{ width: '13px', height: '13px', fill: 'var(--color-premium-gold-light)', color: 'var(--color-premium-gold-light)' }} />
                                                {listing.seller?.rating || '5.0'}
                                            </span>
                                            <span>·</span>
                                            <span>{listing.seller?.total_sales || 0} {t('detail.sales_count')}</span>
                                        </div>
                                    </div>
                                </div>
                                {recentSellerReviews.length > 0 && (
                                    <div style={{ marginTop: '12px', paddingTop: '12px', borderTop: '1px solid var(--color-border-muted)' }}>
                                        <p style={{ fontSize: 'var(--font-size-xs)', color: 'var(--color-text-muted)', marginBottom: '8px', fontWeight: 'var(--font-weight-medium)' }}>
                                            {t('detail.recent_reviews') || 'So\'nggi sharhlar'}
                                        </p>
                                        {recentSellerReviews.map((rev) => (
                                            <div key={rev.id || rev.createdAt} style={{ marginBottom: '8px' }}>
                                                <div style={{ display: 'flex', alignItems: 'center', gap: '6px', marginBottom: '2px' }}>
                                                    {[1, 2, 3, 4, 5].map((s) => (
                                                        <Star key={s} className="w-3 h-3" style={{ color: s <= (rev.rating || 0) ? 'var(--color-premium-gold-light)' : 'var(--color-text-muted)', fill: s <= (rev.rating || 0) ? 'currentColor' : 'none' }} />
                                                    ))}
                                                    <span style={{ fontSize: '11px', color: 'var(--color-text-muted)' }}>
                                                        {rev.reviewerName || 'Foydalanuvchi'}
                                                    </span>
                                                </div>
                                                {rev.comment && (
                                                    <p style={{ fontSize: 'var(--font-size-xs)', color: 'var(--color-text-secondary)', lineHeight: 1.35, margin: 0 }} className="line-clamp-2">
                                                        {rev.comment}
                                                    </p>
                                                )}
                                            </div>
                                        ))}
                                    </div>
                                )}
                            </Link>
                        ) : (
                            <div style={{
                                padding: '16px',
                                borderRadius: 'var(--radius-xl)',
                                backgroundColor: 'var(--color-bg-secondary)',
                                border: '1px solid var(--color-border-default)',
                            }}>
                                <p style={{ fontSize: 'var(--font-size-sm)', color: 'var(--color-text-muted)', marginBottom: '12px', fontWeight: 'var(--font-weight-medium)' }}>
                                    {t('detail.seller') || 'Sotuvchi'}
                                </p>
                                <div style={{ display: 'flex', alignItems: 'center', gap: '12px' }}>
                                    <div style={{
                                        width: '44px', height: '44px',
                                        borderRadius: 'var(--radius-full)',
                                        background: 'linear-gradient(135deg, var(--color-accent-blue), var(--color-accent-purple))',
                                        display: 'flex', alignItems: 'center', justifyContent: 'center',
                                        color: '#fff', fontWeight: 'var(--font-weight-bold)',
                                        fontSize: 'var(--font-size-lg)', flexShrink: 0,
                                    }}>
                                        {listing.seller?.display_name?.charAt(0)?.toUpperCase() || 'S'}
                                    </div>
                                    <div style={{ flex: 1, minWidth: 0 }}>
                                        <p style={{ fontWeight: 'var(--font-weight-semibold)', color: 'var(--color-text-primary)', marginBottom: '2px' }}>
                                            {listing.seller?.display_name || t('detail.seller')}
                                        </p>
                                        <div style={{ display: 'flex', alignItems: 'center', gap: '8px', fontSize: 'var(--font-size-sm)', color: 'var(--color-text-secondary)' }}>
                                            <span style={{ display: 'flex', alignItems: 'center', gap: '3px' }}>
                                                <Star style={{ width: '13px', height: '13px', fill: 'var(--color-premium-gold-light)', color: 'var(--color-premium-gold-light)' }} />
                                                {listing.seller?.rating || '5.0'}
                                            </span>
                                            <span>•</span>
                                            <span>{listing.seller?.total_sales || 0} {t('detail.sales_count')}</span>
                                        </div>
                                    </div>
                                </div>
                            </div>
                        )}
                    </div>
                </div>

                {/* ── Tabs section ── */}
                <div style={{ marginTop: '40px' }}>
                    <div className="tabs" style={{ marginBottom: '0' }}>
                        {tabs.map((tab) => (
                            <button
                                key={tab.id}
                                className={`tab ${activeTab === tab.id ? 'tab-active' : ''}`}
                                onClick={() => setActiveTab(tab.id)}
                            >
                                {tab.label}
                            </button>
                        ))}
                    </div>

                    <div style={{
                        backgroundColor: 'var(--color-bg-secondary)',
                        border: '1px solid var(--color-border-default)',
                        borderTop: 'none',
                        borderRadius: '0 0 var(--radius-xl) var(--radius-xl)',
                        padding: '24px',
                    }}>
                        {/* Description tab */}
                        {activeTab === 'description' && (
                            <div>
                                {listing.description ? (
                                    <p style={{ color: 'var(--color-text-primary)', lineHeight: '1.8', fontSize: 'var(--font-size-base)', whiteSpace: 'pre-wrap' }}>
                                        {listing.description}
                                    </p>
                                ) : (
                                    <p style={{ color: 'var(--color-text-muted)', fontStyle: 'italic' }}>{t('detail.no_description')}</p>
                                )}
                            </div>
                        )}

                        {/* Features tab */}
                        {activeTab === 'features' && (
                            <div>
                                {features.length > 0 ? (
                                    <div style={{ display: 'flex', flexWrap: 'wrap', gap: '8px' }}>
                                        {features.map((f, i) => <FeatureTag key={i} label={f} />)}
                                    </div>
                                ) : (
                                    <p style={{ color: 'var(--color-text-muted)', fontStyle: 'italic' }}>{t('detail.no_features')}</p>
                                )}
                            </div>
                        )}

                        {/* Reviews tab */}
                        {activeTab === 'reviews' && (
                            <div>
                                <ReviewList userId={listing.seller?.id} type="received" />
                            </div>
                        )}
                    </div>
                </div>

                {/* ── Related Accounts ── */}
                {relatedListings.length > 0 && (
                    <div style={{ marginTop: '48px' }}>
                        <h2 style={{
                            fontSize: 'var(--font-size-xl)',
                            fontWeight: 'var(--font-weight-bold)',
                            color: 'var(--color-text-primary)',
                            marginBottom: '20px',
                        }}>
                            {t('detail.related') || 'O\'xshash akkauntlar'}
                        </h2>
                        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4" style={{ gap: '16px' }}>
                            {relatedListings.map((acc) => (
                                <AccountCard key={acc.id} account={{
                                    id: acc.id,
                                    gameId: acc.game?.slug || acc.game?.id || acc.gameId,
                                    gameName: acc.game?.name || acc.gameName,
                                    title: acc.title,
                                    price: parseFloat(acc.price) || 0,
                                    image: acc.images?.[0]?.image || acc.image || acc.primary_image || '',
                                    isPremium: acc.is_premium ?? acc.isPremium,
                                    seller: acc.seller ?? {},
                                }} />
                            ))}
                        </div>
                    </div>
                )}
            </div>
        </div>
    );
};

export default AccountDetailPage;
