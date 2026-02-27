import { useState, useEffect } from 'react';
import { Link, useNavigate } from 'react-router-dom';
import { ShoppingBag, Tag, Heart, Star, Settings, Edit2, LogOut, Package, Clock, CheckCircle, XCircle, Trash2, PlusCircle, BarChart3, UserPlus, Copy } from 'lucide-react';
import { useAuth } from '../context/AuthContext';
import { useProfile, useProfileListings, useProfileFavorites, useProfilePurchases, useProfileSales, useDeleteListing, useSellerDashboard, useReferral } from '../hooks';
import AccountCard from '../components/AccountCard';
import ReviewList from '../components/ReviewList';
import { games, formatPrice } from '../data/mockData';
import { useLanguage } from '../context/LanguageContext';
import { useToast } from '../components/ToastProvider';
import SkeletonLoader from '../components/SkeletonLoader';
import EmptyState from '../components/EmptyState';

const ProfilePage = () => {
    const { t } = useLanguage();
    const navigate = useNavigate();
    const { user, isAuthenticated, logout } = useAuth();
    const { addToast } = useToast();
    const [activeTab, setActiveTab] = useState('listings');

    // API hooks
    const { isLoading: profileLoading } = useProfile();
    const { data: listingsData, isLoading: listingsLoading } = useProfileListings();
    const { data: favoritesData } = useProfileFavorites();
    const { data: purchasesData } = useProfilePurchases();
    const { data: salesData } = useProfileSales();
    const { data: dashboardData } = useSellerDashboard();
    const { data: referralData } = useReferral();
    const { mutate: deleteListingMutation } = useDeleteListing();

    const [reviewCount] = useState(0);
    const [averageRating] = useState(5.0);

    useEffect(() => {
        if (!isAuthenticated) navigate('/login');
    }, [isAuthenticated, navigate]);

    // Helper functions for game info
    const getGameName = (gameId) => {
        const game = games.find(g => g.id === gameId);
        return game?.name || gameId || t('common.unknown_game');
    };

    const getGameImage = (gameId) => {
        const game = games.find(g => g.id === gameId);
        return game?.image || null;
    };

    // Handle logout
    const handleLogout = () => {
        logout();
        navigate('/');
    };

    // Use API data or fallback to user context
    const myListings = listingsData?.results || [];
    const likedAccounts = favoritesData?.results || [];
    const purchases = purchasesData?.results || [];
    const sales = salesData?.results || [];

    const getStatusBadge = (status) => {
        const map = {
            pending: { icon: Clock, text: t('status.pending') || 'Pending', color: 'var(--color-accent-orange)', bg: 'var(--color-warning-bg)' },
            approved: { icon: CheckCircle, text: t('status.approved') || 'Approved', color: 'var(--color-accent-green)', bg: 'var(--color-success-bg)' },
            rejected: { icon: XCircle, text: t('status.rejected') || 'Rejected', color: 'var(--color-error)', bg: 'var(--color-error-bg)' },
            sold: { icon: CheckCircle, text: t('status.sold') || 'Sold', color: 'var(--color-accent-blue)', bg: 'var(--color-info-bg)' },
        };
        return map[status] || map.pending;
    };

    const deleteListing = (listingId) => {
        if (window.confirm(t('profile.delete_confirm') || 'Delete this listing?')) {
            deleteListingMutation(listingId, {
                onSuccess: () => {
                    addToast({
                        type: 'success',
                        title: t('common.success'),
                        message: t('profile.deleted_success'),
                    });
                },
                onError: (error) => {
                    addToast({
                        type: 'error',
                        title: t('common.error'),
                        message: error?.message || t('profile.delete_error'),
                    });
                }
            });
        }
    };

    const tabs = [
        { id: 'dashboard', label: t('profile.dashboard') || 'Dashboard', icon: BarChart3 },
        { id: 'referral', label: t('profile.referral') || 'Referral', icon: UserPlus },
        { id: 'listings', label: t('profile.my_listings') || 'My Listings', icon: Package, count: myListings.length },
        { id: 'purchases', label: t('profile.purchases') || 'Purchases', icon: ShoppingBag, count: purchases.length },
        { id: 'sales', label: t('profile.sales') || 'Sales', icon: Tag, count: sales.length },
        { id: 'likes', label: t('profile.likes') || 'Liked', icon: Heart, count: likedAccounts.length },
    ];

    if (!user) return null;

    // Loading state
    if (profileLoading) {
        return (
            <div className="page-enter" style={{ minHeight: '100vh', padding: '32px' }}>
                <SkeletonLoader />
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
                    <span className="breadcrumb-current">{t('nav.profile') || 'Profile'}</span>
                </div>

                {/* Profile Header */}
                <div
                    style={{
                        backgroundColor: 'var(--color-bg-secondary)',
                        border: '1px solid var(--color-border-default)',
                        borderRadius: 'var(--radius-xl)',
                        padding: '24px',
                        marginTop: '16px',
                        marginBottom: '24px',
                    }}
                >
                    <div className="flex flex-col md:flex-row items-center gap-5">
                        {/* Avatar — yuklangan rasm yoki ismning birinchi harfi */}
                        <div className="relative">
                            <div
                                className="avatar"
                                style={{
                                    width: '80px', height: '80px',
                                    background: user.avatar ? 'transparent' : 'linear-gradient(135deg, var(--color-accent-blue), var(--color-accent-purple))',
                                    fontSize: '32px', fontWeight: 'var(--font-weight-bold)',
                                    color: '#ffffff',
                                    borderRadius: 'var(--radius-full)',
                                    display: 'flex', alignItems: 'center', justifyContent: 'center',
                                    overflow: 'hidden',
                                }}
                            >
                                {user.avatar ? (
                                    <img src={user.avatar} alt={user.name || 'User'} style={{ width: '100%', height: '100%', objectFit: 'cover' }} />
                                ) : (
                                    (user.name || user.display_name || 'U').charAt(0).toUpperCase()
                                )}
                            </div>
                            <button
                                style={{
                                    position: 'absolute', bottom: 0, right: 0,
                                    width: '28px', height: '28px',
                                    backgroundColor: 'var(--color-accent-blue)',
                                    borderRadius: 'var(--radius-full)',
                                    border: '2px solid var(--color-bg-secondary)',
                                    display: 'flex', alignItems: 'center', justifyContent: 'center',
                                    cursor: 'pointer', color: '#fff',
                                }}
                            >
                                <Edit2 className="w-3 h-3" />
                            </button>
                        </div>

                        {/* Info */}
                        <div className="flex-1 text-center md:text-left">
                            <h1 style={{ fontSize: 'var(--font-size-xl)', fontWeight: 'var(--font-weight-bold)', color: 'var(--color-text-primary)', marginBottom: '4px' }}>
                                {user.name || user.display_name || user.email}
                            </h1>
                            <p style={{ color: 'var(--color-text-muted)', fontSize: 'var(--font-size-sm)', marginBottom: '12px' }}>
                                {user.email}
                            </p>
                            <div className="flex flex-wrap items-center justify-center md:justify-start gap-2">
                                <span className="badge badge-yellow" style={{ fontSize: '12px' }}>
                                    <Star className="w-3 h-3 fill-current" /> {averageRating} ({reviewCount})
                                </span>
                                <span className="badge badge-green" style={{ fontSize: '12px' }}>
                                    <Tag className="w-3 h-3" /> {sales.length} {t('profile.sales_count') || 'sales'}
                                </span>
                                <span className="badge badge-blue" style={{ fontSize: '12px' }}>
                                    <ShoppingBag className="w-3 h-3" /> {purchases.length} {t('profile.purchases_count') || 'purchases'}
                                </span>
                            </div>
                        </div>

                        {/* Actions */}
                        <div className="flex items-center gap-2">
                            <Link to="/settings" className="btn btn-secondary btn-md" style={{ textDecoration: 'none' }}>
                                <Settings className="w-4 h-4" />
                            </Link>
                            <button onClick={handleLogout} className="btn btn-md" style={{
                                backgroundColor: 'var(--color-error-bg)',
                                color: 'var(--color-error)',
                                border: '1px solid transparent',
                            }}>
                                <LogOut className="w-4 h-4" />
                                <span className="hidden sm:inline">{t('auth.logout') || 'Logout'}</span>
                            </button>
                        </div>
                    </div>
                </div>

                {/* Tabs */}
                <div className="tabs" style={{ marginBottom: '0' }}>
                    {tabs.map((tab) => (
                        <button
                            key={tab.id}
                            className={`tab ${activeTab === tab.id ? 'tab-active' : ''}`}
                            onClick={() => setActiveTab(tab.id)}
                        >
                            <tab.icon className="w-4 h-4" />
                            <span className="hidden sm:inline">{tab.label}</span>
                            {tab.count != null && (
                                <span className="badge badge-count" style={{ fontSize: '10px', padding: '0 5px', minWidth: '18px' }}>{tab.count}</span>
                            )}
                        </button>
                    ))}
                </div>

                {/* Tab Content */}
                <div
                    style={{
                        backgroundColor: 'var(--color-bg-primary)',
                        border: '1px solid var(--color-border-default)',
                        borderTop: 'none',
                        borderRadius: '0 0 var(--radius-lg) var(--radius-lg)',
                        padding: '24px',
                        minHeight: '400px',
                    }}
                >
                    {activeTab === 'dashboard' && (
                        <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fill, minmax(140px, 1fr))', gap: '16px' }}>
                            <div className="card" style={{ padding: '16px', textAlign: 'center' }}>
                                <div style={{ fontSize: '24px', fontWeight: 700, color: 'var(--color-primary)' }}>{dashboardData?.active_listings ?? 0}</div>
                                <div style={{ fontSize: '12px', color: 'var(--color-text-muted)' }}>{t('profile.active_listings') || 'Active listings'}</div>
                            </div>
                            <div className="card" style={{ padding: '16px', textAlign: 'center' }}>
                                <div style={{ fontSize: '24px', fontWeight: 700 }}>{dashboardData?.sold_listings ?? 0}</div>
                                <div style={{ fontSize: '12px', color: 'var(--color-text-muted)' }}>{t('profile.sold') || 'Sold'}</div>
                            </div>
                            <div className="card" style={{ padding: '16px', textAlign: 'center' }}>
                                <div style={{ fontSize: '24px', fontWeight: 700 }}>{dashboardData?.total_views ?? 0}</div>
                                <div style={{ fontSize: '12px', color: 'var(--color-text-muted)' }}>{t('profile.views') || 'Views'}</div>
                            </div>
                            <div className="card" style={{ padding: '16px', textAlign: 'center' }}>
                                <div style={{ fontSize: '24px', fontWeight: 700 }}>{dashboardData?.total_sales_count ?? 0}</div>
                                <div style={{ fontSize: '12px', color: 'var(--color-text-muted)' }}>{t('profile.sales_count') || 'Sales'}</div>
                            </div>
                            <div className="card" style={{ padding: '16px', textAlign: 'center' }}>
                                <div style={{ fontSize: '24px', fontWeight: 700 }}>{formatPrice(dashboardData?.total_sales_amount ?? 0)}</div>
                                <div style={{ fontSize: '12px', color: 'var(--color-text-muted)' }}>{t('profile.earnings') || 'Earnings'}</div>
                            </div>
                            <div className="card" style={{ padding: '16px', textAlign: 'center' }}>
                                <div style={{ fontSize: '24px', fontWeight: 700 }}>{dashboardData?.conversion ?? 0}%</div>
                                <div style={{ fontSize: '12px', color: 'var(--color-text-muted)' }}>{t('profile.conversion') || 'Conversion'}</div>
                            </div>
                        </div>
                    )}
                    {activeTab === 'referral' && (
                        <div className="card" style={{ padding: '24px', maxWidth: '480px' }}>
                            <h3 style={{ fontSize: 'var(--font-size-lg)', marginBottom: '12px' }}>{t('profile.referral_title') || 'Invite friends'}</h3>
                            <p style={{ color: 'var(--color-text-muted)', fontSize: 'var(--font-size-sm)', marginBottom: '16px' }}>
                                {t('profile.referral_description') || 'Share your link. When friends sign up, you get rewards.'}
                            </p>
                            <div style={{ display: 'flex', flexDirection: 'column', gap: '8px' }}>
                                <label style={{ fontSize: '12px', color: 'var(--color-text-muted)' }}>{t('profile.your_code') || 'Your code'}</label>
                                <div style={{ display: 'flex', gap: '8px', alignItems: 'center' }}>
                                    <code style={{
                                        padding: '10px 14px', backgroundColor: 'var(--color-bg-secondary)', borderRadius: 'var(--radius-md)',
                                        fontFamily: 'monospace', fontSize: '16px', letterSpacing: '0.1em',
                                    }}>
                                        {referralData?.referral_code ?? '—'}
                                    </code>
                                    <button
                                        type="button"
                                        className="btn btn-secondary btn-sm"
                                        onClick={() => {
                                            if (referralData?.referral_code) {
                                                navigator.clipboard.writeText(referralData.referral_code);
                                                addToast({ type: 'success', title: t('common.copied') || 'Copied', message: '' });
                                            }
                                        }}
                                    >
                                        <Copy className="w-4 h-4" />
                                    </button>
                                </div>
                                <label style={{ fontSize: '12px', color: 'var(--color-text-muted)', marginTop: '8px' }}>{t('profile.referral_link') || 'Link'}</label>
                                <div style={{ display: 'flex', gap: '8px', alignItems: 'center' }}>
                                    <input
                                        readOnly
                                        value={referralData?.referral_url ?? ''}
                                        style={{
                                            flex: 1, padding: '10px 14px', backgroundColor: 'var(--color-bg-secondary)', borderRadius: 'var(--radius-md)',
                                            border: '1px solid var(--color-border-default)', fontSize: '14px',
                                        }}
                                    />
                                    <button
                                        type="button"
                                        className="btn btn-secondary btn-sm"
                                        onClick={() => {
                                            if (referralData?.referral_url) {
                                                navigator.clipboard.writeText(referralData.referral_url);
                                                addToast({ type: 'success', title: t('common.copied') || 'Copied', message: '' });
                                            }
                                        }}
                                    >
                                        <Copy className="w-4 h-4" />
                                    </button>
                                </div>
                                <p style={{ marginTop: '12px', fontSize: '14px', color: 'var(--color-text-muted)' }}>
                                    {t('profile.referred_count') || 'Referred'}: <strong>{referralData?.referred_count ?? 0}</strong>
                                </p>
                            </div>
                        </div>
                    )}
                    {activeTab === 'listings' && (
                        <>
                            <div className="flex items-center justify-between" style={{ marginBottom: '20px' }}>
                                <h2 style={{ fontSize: 'var(--font-size-lg)', fontWeight: 'var(--font-weight-bold)', color: 'var(--color-text-primary)' }}>
                                    {t('profile.my_listings') || 'My Listings'}
                                </h2>
                                <Link to="/sell" className="btn btn-primary btn-sm" style={{ textDecoration: 'none' }}>
                                    <PlusCircle className="w-3.5 h-3.5" /> {t('profile.new_listing') || 'New listing'}
                                </Link>
                            </div>
                            {listingsLoading ? (
                                <SkeletonLoader />
                            ) : myListings.length > 0 ? (
                                <div style={{ display: 'flex', flexDirection: 'column', gap: '12px' }}>
                                    {myListings.map((listing) => {
                                        const status = getStatusBadge(listing.status);
                                        const StatusIcon = status.icon;
                                        return (
                                            <div
                                                key={listing.id}
                                                className="flex flex-col sm:flex-row gap-4"
                                                style={{
                                                    padding: '16px',
                                                    borderRadius: 'var(--radius-lg)',
                                                    backgroundColor: 'var(--color-bg-secondary)',
                                                    border: '1px solid var(--color-border-muted)',
                                                }}
                                            >
                                                <div
                                                    style={{
                                                        width: '100%', maxWidth: '120px', height: '100px',
                                                        borderRadius: 'var(--radius-md)',
                                                        overflow: 'hidden', flexShrink: 0,
                                                        backgroundColor: 'var(--color-bg-tertiary)',
                                                        display: 'flex', alignItems: 'center', justifyContent: 'center',
                                                    }}
                                                >
                                                    {listing.images?.[0] ? (
                                                        <img src={listing.images[0]} alt={listing.title} style={{ width: '100%', height: '100%', objectFit: 'cover' }} />
                                                    ) : (
                                                        <div className="flex items-center justify-center" style={{ width: '100%', height: '100%' }}>
                                                            {getGameImage(listing.gameId) ? (
                                                                <img src={getGameImage(listing.gameId)} alt="" style={{ width: '48px', height: '48px', objectFit: 'cover', borderRadius: 'var(--radius-md)', opacity: 0.5 }} />
                                                            ) : (
                                                                <Package style={{ width: '32px', height: '32px', color: 'var(--color-text-muted)', opacity: 0.5 }} />
                                                            )}
                                                        </div>
                                                    )}
                                                </div>
                                                <div className="flex-1">
                                                    <div className="flex flex-wrap items-start justify-between gap-2" style={{ marginBottom: '8px' }}>
                                                        <div>
                                                            <h3 style={{ fontWeight: 'var(--font-weight-semibold)', color: 'var(--color-text-primary)', marginBottom: '2px' }}>{listing.title}</h3>
                                                            <p style={{ fontSize: 'var(--font-size-sm)', color: 'var(--color-text-muted)' }}>{getGameName(listing.gameId)}</p>
                                                        </div>
                                                        <span className="flex items-center gap-1" style={{ fontSize: 'var(--font-size-xs)', padding: '2px 8px', borderRadius: 'var(--radius-full)', backgroundColor: status.bg, color: status.color }}>
                                                            <StatusIcon className="w-3 h-3" /> {status.text}
                                                        </span>
                                                    </div>
                                                    <div className="flex items-center justify-between">
                                                        <span style={{ fontSize: 'var(--font-size-lg)', fontWeight: 'var(--font-weight-bold)', color: 'var(--color-text-accent)' }}>
                                                            {formatPrice(listing.price)}
                                                        </span>
                                                        <div className="flex items-center gap-2">
                                                            <span style={{ fontSize: 'var(--font-size-xs)', color: 'var(--color-text-muted)' }}>
                                                                {listing.createdAt ? new Date(listing.createdAt).toLocaleDateString() : ''}
                                                            </span>
                                                            <button
                                                                onClick={() => deleteListing(listing.id)}
                                                                style={{ padding: '6px', borderRadius: 'var(--radius-md)', color: 'var(--color-text-muted)', background: 'none', border: 'none', cursor: 'pointer' }}
                                                                onMouseEnter={(e) => e.currentTarget.style.color = 'var(--color-error)'}
                                                                onMouseLeave={(e) => e.currentTarget.style.color = 'var(--color-text-muted)'}
                                                            >
                                                                <Trash2 className="w-4 h-4" />
                                                            </button>
                                                        </div>
                                                    </div>
                                                </div>
                                            </div>
                                        );
                                    })}
                                </div>
                            ) : (
                                <EmptyState icon={Package} title={t('profile.no_listings') || 'No listings yet'} actionLabel={t('profile.create_listing') || 'Create listing'} actionTo="/sell" />
                            )}
                        </>
                    )}

                    {activeTab === 'purchases' && (
                        <>
                            <h2 style={{ fontSize: 'var(--font-size-lg)', fontWeight: 'var(--font-weight-bold)', color: 'var(--color-text-primary)', marginBottom: '20px' }}>
                                {t('profile.my_purchases') || 'My Purchases'}
                            </h2>
                            {purchases.length > 0 ? (
                                <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4" style={{ gap: '16px' }}>
                                    {purchases.map((account) => <AccountCard key={account.id} account={account} />)}
                                </div>
                            ) : <EmptyState icon={ShoppingBag} title={t('profile.no_purchases') || 'No purchases yet'} actionLabel={t('profile.browse') || 'Browse accounts'} actionTo="/" />}
                        </>
                    )}

                    {activeTab === 'sales' && (
                        <>
                            <div className="flex items-center justify-between" style={{ marginBottom: '20px' }}>
                                <h2 style={{ fontSize: 'var(--font-size-lg)', fontWeight: 'var(--font-weight-bold)', color: 'var(--color-text-primary)' }}>
                                    {t('profile.my_sales') || 'My Sales'}
                                </h2>
                                <Link to="/sell" className="btn btn-primary btn-sm" style={{ textDecoration: 'none' }}>
                                    <Tag className="w-3.5 h-3.5" /> {t('profile.new_listing') || 'New listing'}
                                </Link>
                            </div>
                            {sales.length > 0 ? (
                                <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4" style={{ gap: '16px' }}>
                                    {sales.map((account) => <AccountCard key={account.id} account={account} />)}
                                </div>
                            ) : <EmptyState icon={Tag} text={t('profile.no_sales') || 'No sales yet'} actionLabel={t('profile.create_listing') || 'Create listing'} actionTo="/sell" />}
                        </>
                    )}

                    {activeTab === 'likes' && (
                        <>
                            <h2 style={{ fontSize: 'var(--font-size-lg)', fontWeight: 'var(--font-weight-bold)', color: 'var(--color-text-primary)', marginBottom: '20px' }}>
                                {t('profile.liked_accounts') || 'Liked Accounts'}
                            </h2>
                            {likedAccounts.length > 0 ? (
                                <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4" style={{ gap: '16px' }}>
                                    {likedAccounts.map((account) => <AccountCard key={account.id} account={account} />)}
                                </div>
                            ) : <EmptyState icon={Heart} text={t('profile.no_likes') || 'No liked accounts'} actionLabel={t('profile.browse') || 'Browse accounts'} actionTo="/" />}
                        </>
                    )}

                    {activeTab === 'reviews' && (
                        <>
                            <h2 style={{ fontSize: 'var(--font-size-lg)', fontWeight: 'var(--font-weight-bold)', color: 'var(--color-text-primary)', marginBottom: '20px' }}>
                                {t('profile.my_reviews') || 'My Reviews'}
                            </h2>
                            <ReviewList userId={user.id} type="received" />
                        </>
                    )}
                </div>
            </div>
        </div>
    );
};

export default ProfilePage;
