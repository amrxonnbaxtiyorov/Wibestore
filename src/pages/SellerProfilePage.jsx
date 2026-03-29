import { useParams, Link, useLocation } from 'react-router-dom';
import { Star, Shield, ArrowLeft, Package, MessageSquare, Crown, Gem } from 'lucide-react';
import { useListings } from '../hooks';
import AccountCard from '../components/AccountCard';
import ReviewList from '../components/ReviewList';
import UserAvatar from '../components/UserAvatar';
import { useLanguage } from '../context/LanguageContext';
import SkeletonLoader from '../components/SkeletonLoader';
import { resolveImageUrl } from '../lib/displayUtils';

/**
 * Sotuvchi profil sahifasi — xaridorlar sotuvchini ko'rib chiqishi va uning e'lonlarini ko'rishi uchun.
 * Route: /seller/:userId
 */
const SellerProfilePage = () => {
    const { userId } = useParams();
    const location = useLocation();
    const { t } = useLanguage();
    // Akkaunt sahifasidan kelganda state orqali sotuvchi ma'lumotlari uzatiladi
    const sellerFromState = location.state?.seller;

    const { data: listingsData, isLoading } = useListings({
        seller: userId,
        limit: 24,
    });

    const pages = listingsData?.pages || [];
    const listings = pages.flatMap((p) => p.results || []);
    const sellerFromFirstListing = listings[0]?.seller;
    const seller = sellerFromState || sellerFromFirstListing || {
        display_name: t('detail.seller') || 'Sotuvchi',
        rating: '—',
        total_sales: 0,
    };
    const sellerId = seller?.id ?? userId;
    const displayName = seller?.display_name || seller?.name || t('detail.seller');
    const sellerAvatar = resolveImageUrl(seller?.avatar || seller?.profile_image || seller?.image);
    const rating = seller?.rating ?? '—';
    const totalSales = seller?.total_sales ?? 0;

    return (
        <div className="page-enter" style={{ minHeight: '100vh', paddingBottom: '64px' }}>
            <div className="gh-container">
                {/* Breadcrumbs */}
                <div className="breadcrumbs">
                    <Link to="/">{t('common.home')}</Link>
                    <span className="breadcrumb-separator">/</span>
                    <Link to="/products">{t('nav.products') || 'Mahsulotlar'}</Link>
                    <span className="breadcrumb-separator">/</span>
                    <span className="breadcrumb-current">{displayName}</span>
                </div>

                {/* Sotuvchi kartasi */}
                <div style={{
                    marginTop: '24px',
                    marginBottom: '32px',
                    padding: '24px',
                    borderRadius: 'var(--radius-xl)',
                    backgroundColor: 'var(--color-bg-secondary)',
                    border: `2px solid ${seller?.plan === 'pro' ? 'var(--color-pro-purple)' : (seller?.plan === 'premium' || seller?.is_premium) ? 'var(--color-premium-gold-light)' : 'var(--color-border-default)'}`,
                    position: 'relative',
                    overflow: 'hidden',
                    boxShadow: seller?.plan === 'pro'
                        ? '0 0 20px rgba(111, 66, 193, 0.15), 0 0 40px rgba(111, 66, 193, 0.05)'
                        : (seller?.plan === 'premium' || seller?.is_premium)
                            ? '0 0 20px rgba(212, 167, 44, 0.15), 0 0 40px rgba(212, 167, 44, 0.05)'
                            : 'none',
                }}>
                    {/* Premium/Pro top accent line */}
                    {(seller?.plan === 'pro' || seller?.plan === 'premium' || seller?.is_premium) && (
                        <div style={{
                            position: 'absolute', top: 0, left: 0, right: 0, height: '3px',
                            background: seller?.plan === 'pro' ? 'var(--color-pro-gradient)' : 'var(--color-premium-gradient)',
                        }} />
                    )}
                    <div style={{ display: 'flex', alignItems: 'center', gap: '20px', flexWrap: 'wrap' }}>
                        <UserAvatar
                            src={sellerAvatar}
                            size={72}
                            name={displayName}
                            style={{
                                background: sellerAvatar ? 'transparent' : (seller?.plan === 'pro' ? 'var(--color-pro-gradient)' : (seller?.plan === 'premium' || seller?.is_premium) ? 'var(--color-premium-gradient)' : 'linear-gradient(135deg, var(--color-accent-blue), var(--color-accent-purple))'),
                                boxShadow: seller?.plan === 'pro'
                                    ? '0 0 0 3px var(--color-bg-secondary), 0 0 0 5px var(--color-pro-purple)'
                                    : (seller?.plan === 'premium' || seller?.is_premium)
                                        ? '0 0 0 3px var(--color-bg-secondary), 0 0 0 5px var(--color-premium-gold-light)'
                                        : 'none',
                            }}
                        />
                        <div style={{ flex: 1, minWidth: 0 }}>
                            <h1 style={{
                                fontSize: 'var(--font-size-2xl)',
                                fontWeight: 'var(--font-weight-bold)',
                                color: 'var(--color-text-primary)',
                                marginBottom: '8px',
                            }}>
                                {displayName}
                            </h1>
                            <div style={{ display: 'flex', alignItems: 'center', gap: '16px', flexWrap: 'wrap' }}>
                                <span style={{
                                    display: 'inline-flex', alignItems: 'center', gap: '6px',
                                    fontSize: 'var(--font-size-base)', color: 'var(--color-text-secondary)',
                                }}>
                                    <Star style={{ width: '18px', height: '18px', fill: 'var(--color-premium-gold-light)', color: 'var(--color-premium-gold-light)' }} />
                                    {rating}
                                </span>
                                <span style={{ fontSize: 'var(--font-size-base)', color: 'var(--color-text-muted)' }}>
                                    {totalSales} {t('detail.sales_count') || 'ta sotuv'}
                                </span>
                                <span style={{
                                    display: 'inline-flex', alignItems: 'center', gap: '6px',
                                    padding: '4px 10px', borderRadius: 'var(--radius-md)',
                                    backgroundColor: 'var(--color-success-bg)', color: 'var(--color-accent-green)',
                                    fontSize: 'var(--font-size-sm)', fontWeight: 'var(--font-weight-medium)',
                                }}>
                                    <Shield style={{ width: '14px', height: '14px' }} /> {t('detail.verified_seller') || 'Tasdiqlangan sotuvchi'}
                                </span>
                                {seller?.plan === 'pro' && (
                                    <span className="badge badge-pro" style={{ fontSize: '12px', padding: '4px 10px', gap: '4px' }}>
                                        <Gem style={{ width: '13px', height: '13px' }} /> Pro
                                    </span>
                                )}
                                {(seller?.plan === 'premium' || (seller?.is_premium && seller?.plan !== 'pro')) && (
                                    <span className="badge badge-premium" style={{ fontSize: '12px', padding: '4px 10px', gap: '4px' }}>
                                        <Crown style={{ width: '13px', height: '13px' }} /> Premium
                                    </span>
                                )}
                            </div>
                        </div>
                        <Link
                            to="/products"
                            className="btn btn-ghost btn-md"
                            style={{ display: 'inline-flex', alignItems: 'center', gap: '8px', textDecoration: 'none' }}
                        >
                            <ArrowLeft style={{ width: '16px', height: '16px' }} />
                            {t('detail.back_to_products') || 'Mahsulotlarga qaytish'}
                        </Link>
                    </div>
                </div>

                {/* Sotuvchi reputatsiyasi — sharhlar har doim ko'rinadi */}
                <div style={{ marginBottom: '32px' }}>
                    <h2 style={{
                        fontSize: 'var(--font-size-xl)',
                        fontWeight: 'var(--font-weight-bold)',
                        color: 'var(--color-text-primary)',
                        marginBottom: '16px',
                        display: 'flex',
                        alignItems: 'center',
                        gap: '10px',
                    }}>
                        <MessageSquare style={{ width: '24px', height: '24px', color: 'var(--color-accent-blue)' }} />
                        {t('detail.reputation')} · {t('detail.reviews')}
                    </h2>
                    <ReviewList userId={sellerId} type="received" />
                </div>

                {/* Sotuvchining e'lonlari */}
                <div>
                    <h2 style={{
                        fontSize: 'var(--font-size-xl)',
                        fontWeight: 'var(--font-weight-bold)',
                        color: 'var(--color-text-primary)',
                        marginBottom: '20px',
                        display: 'flex', alignItems: 'center', gap: '10px',
                    }}>
                        <Package style={{ width: '24px', height: '24px', color: 'var(--color-accent-blue)' }} />
                        {t('profile.my_listings') || 'Sotuvchining e\'lonlari'} ({listings.length})
                    </h2>

                    {isLoading ? (
                        <div style={{ minHeight: '200px' }}>
                            <SkeletonLoader />
                        </div>
                    ) : listings.length === 0 ? (
                        <div style={{
                            padding: '48px 24px',
                            textAlign: 'center',
                            backgroundColor: 'var(--color-bg-secondary)',
                            borderRadius: 'var(--radius-xl)',
                            border: '1px solid var(--color-border-default)',
                        }}>
                            <Package style={{ width: '48px', height: '48px', color: 'var(--color-text-muted)', margin: '0 auto 16px', opacity: 0.6 }} />
                            <p style={{ color: 'var(--color-text-secondary)', marginBottom: '16px' }}>
                                {t('profile.no_listings') || 'Hozircha e\'lonlar yo\'q'}
                            </p>
                            <Link to="/products" className="btn btn-primary btn-md" style={{ textDecoration: 'none' }}>
                                {t('detail.back_to_products') || 'Barcha akkauntlar'}
                            </Link>
                        </div>
                    ) : (
                        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4" style={{ gap: '16px' }}>
                            {listings.map((acc) => (
                                <AccountCard
                                    key={acc.id}
                                    account={{
                                        id: acc.id,
                                        gameId: acc.game?.slug || acc.game?.id || acc.gameId,
                                        gameName: acc.game?.name || acc.gameName,
                                        title: acc.title,
                                        price: parseFloat(acc.price) || 0,
                                        image: acc.images?.[0]?.image || acc.image || acc.primary_image || '',
                                        isPremium: acc.is_premium ?? acc.isPremium,
                                        seller: acc.seller ?? {},
                                    }}
                                />
                            ))}
                        </div>
                    )}
                </div>
            </div>
        </div>
    );
};

export default SellerProfilePage;
