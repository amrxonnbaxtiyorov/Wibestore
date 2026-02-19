import { useParams, Link, useNavigate } from 'react-router-dom';
import { ArrowLeft, Star, Shield, Clock, MessageCircle, Crown, ChevronRight, AlertTriangle } from 'lucide-react';
import { useState, useEffect } from 'react';
import { accounts, formatPrice, COMMISSION_RATE } from '../data/mockData';
import AccountCard from '../components/AccountCard';
import ReviewModal from '../components/ReviewModal';
import LoginModal from '../components/LoginModal';
import { useAuth } from '../context/AuthContext';
import { useChat } from '../context/ChatContext';

const AccountDetailPage = () => {
    const { accountId } = useParams();
    const navigate = useNavigate();
    const { user, isAuthenticated } = useAuth();
    const { startConversation } = useChat();
    const [selectedPayment, setSelectedPayment] = useState('payme');
    const [showReviewModal, setShowReviewModal] = useState(false);
    const [hasPurchased, setHasPurchased] = useState(false);
    const [hasReviewed, setHasReviewed] = useState(false);
    const [showLoginModal, setShowLoginModal] = useState(false);
    const [loginMessage, setLoginMessage] = useState('');

    const account = accounts.find(acc => acc.id === parseInt(accountId));

    useEffect(() => {
        if (user && account) {
            const savedPurchases = localStorage.getItem(`wibePurchases_${user.id}`);
            if (savedPurchases) {
                const purchaseIds = JSON.parse(savedPurchases);
                setHasPurchased(purchaseIds.includes(account.id));
            }
            const savedReviews = localStorage.getItem('wibeReviews');
            if (savedReviews) {
                const reviews = JSON.parse(savedReviews);
                setHasReviewed(reviews.some(r => r.accountId === account.id && r.reviewerId === user.id));
            }
        }
    }, [user, account]);

    const handleContactSeller = () => {
        if (!isAuthenticated) {
            setLoginMessage('Sotuvchi bilan bog\'lanish uchun tizimga kiring');
            setShowLoginModal(true);
            return;
        }
        const seller = { id: account.seller.id || 999, name: account.seller.name, rating: account.seller.rating };
        startConversation(seller, account);
    };

    const handleBuyClick = () => {
        if (!isAuthenticated) {
            setLoginMessage('Akkauntni sotib olish uchun tizimga kiring');
            setShowLoginModal(true);
            return;
        }
        // TODO: Purchase flow implementation
        alert('Xarid jarayoni boshlandi!');
    };

    const handleReviewSubmit = () => setHasReviewed(true);

    const relatedAccounts = accounts
        .filter(acc => acc.gameId === account?.gameId && acc.id !== account?.id)
        .slice(0, 4);

    const cardStyle = {
        backgroundColor: 'var(--color-bg-primary)',
        border: '1px solid var(--color-border-default)',
        borderRadius: 'var(--radius-xl)',
        padding: '24px',
    };

    if (!account) {
        return (
            <div className="page-enter" style={{ minHeight: '100vh', display: 'flex', alignItems: 'center', justifyContent: 'center', paddingBottom: '64px' }}>
                <div className="text-center">
                    <h1 style={{ fontSize: 'var(--font-size-2xl)', fontWeight: 'var(--font-weight-bold)', color: 'var(--color-text-primary)', marginBottom: '16px' }}>Akkaunt topilmadi</h1>
                    <Link to="/" style={{ color: 'var(--color-text-accent)', textDecoration: 'none' }}>Bosh sahifaga qaytish</Link>
                </div>
            </div>
        );
    }

    const paymentMethods = [
        { id: 'payme', name: 'Payme', color: '#00CCCC' },
        { id: 'click', name: 'Click', color: '#0095FF' },
        { id: 'paynet', name: 'Paynet', color: '#FFC107' }
    ];

    return (
        <div className="page-enter" style={{ minHeight: '100vh', paddingBottom: '64px' }}>
            <div className="gh-container">
                {/* Breadcrumbs */}
                <div className="breadcrumbs">
                    <Link to="/">Home</Link>
                    <span className="breadcrumb-separator">/</span>
                    <Link to={`/game/${account.gameId}`}>{account.gameName}</Link>
                    <span className="breadcrumb-separator">/</span>
                    <span className="breadcrumb-current">#{account.id}</span>
                </div>

                <div className="grid lg:grid-cols-3" style={{ gap: '24px', paddingTop: '16px' }}>
                    {/* Left Column - Image & Details */}
                    <div className="lg:col-span-2" style={{ display: 'flex', flexDirection: 'column', gap: '16px' }}>
                        {/* Image */}
                        <div style={{ position: 'relative', aspectRatio: '16/9', borderRadius: 'var(--radius-xl)', overflow: 'hidden', backgroundColor: 'var(--color-bg-tertiary)' }}>
                            {account.image ? (
                                <img src={account.image} alt={account.title} style={{ width: '100%', height: '100%', objectFit: 'cover' }} />
                            ) : (
                                <div style={{ width: '100%', height: '100%', display: 'flex', alignItems: 'center', justifyContent: 'center', fontSize: '64px', opacity: 0.3 }}>🎮</div>
                            )}
                            {account.isPremium && (
                                <div className="badge badge-premium flex items-center gap-1" style={{ position: 'absolute', top: '12px', left: '12px', padding: '6px 12px' }}>
                                    <Crown className="w-3.5 h-3.5" />
                                    Premium Sotuvchi
                                </div>
                            )}
                        </div>

                        {/* Account Info */}
                        <div style={cardStyle}>
                            <div className="flex items-center gap-2" style={{ fontSize: 'var(--font-size-sm)', color: 'var(--color-text-muted)', marginBottom: '10px' }}>
                                <Link to={`/game/${account.gameId}`} style={{ color: 'var(--color-text-accent)', textDecoration: 'none' }}>
                                    {account.gameName}
                                </Link>
                                <ChevronRight className="w-3.5 h-3.5" />
                                <span>#{account.id}</span>
                            </div>

                            <h1 style={{ fontSize: 'var(--font-size-2xl)', fontWeight: 'var(--font-weight-bold)', color: 'var(--color-text-primary)', marginBottom: '12px' }}>
                                {account.title}
                            </h1>

                            <p style={{ color: 'var(--color-text-secondary)', lineHeight: 'var(--line-height-lg)', marginBottom: '20px' }}>
                                {account.description}
                            </p>

                            {/* Features */}
                            <div className="grid grid-cols-1 sm:grid-cols-3" style={{ gap: '10px' }}>
                                {[
                                    { icon: Shield, color: 'var(--color-accent-green)', label: 'Xavfsizlik', value: 'Escrow kafolat' },
                                    { icon: Clock, color: 'var(--color-accent-blue)', label: 'Yetkazish', value: '1-24 soat' },
                                    { icon: MessageCircle, color: 'var(--color-accent-purple)', label: "Qo'llab-quvvatlash", value: '24/7' },
                                ].map((feat, i) => (
                                    <div key={i} className="flex items-center gap-3" style={{ padding: '12px 14px', borderRadius: 'var(--radius-lg)', backgroundColor: 'var(--color-bg-secondary)', border: '1px solid var(--color-border-muted)' }}>
                                        <feat.icon className="w-5 h-5" style={{ color: feat.color }} />
                                        <div>
                                            <div style={{ fontSize: 'var(--font-size-xs)', color: 'var(--color-text-muted)' }}>{feat.label}</div>
                                            <div style={{ fontWeight: 'var(--font-weight-semibold)', color: 'var(--color-text-primary)', fontSize: 'var(--font-size-sm)' }}>{feat.value}</div>
                                        </div>
                                    </div>
                                ))}
                            </div>
                        </div>

                        {/* Seller Info */}
                        <div style={cardStyle}>
                            <h3 style={{ fontSize: 'var(--font-size-base)', fontWeight: 'var(--font-weight-semibold)', color: 'var(--color-text-primary)', marginBottom: '14px' }}>
                                Sotuvchi haqida
                            </h3>
                            <div className="flex items-center gap-4">
                                <div style={{
                                    width: '48px', height: '48px',
                                    background: 'linear-gradient(135deg, var(--color-accent-blue), var(--color-accent-purple))',
                                    borderRadius: 'var(--radius-full)',
                                    display: 'flex', alignItems: 'center', justifyContent: 'center',
                                    fontSize: '18px', fontWeight: 'var(--font-weight-bold)', color: '#fff',
                                    flexShrink: 0,
                                }}>
                                    {account.seller.name.charAt(0)}
                                </div>
                                <div className="flex-1">
                                    <div className="flex items-center gap-2">
                                        <span style={{ fontWeight: 'var(--font-weight-semibold)', color: 'var(--color-text-primary)' }}>{account.seller.name}</span>
                                        {account.seller.isPremium && <Crown className="w-4 h-4" style={{ color: 'var(--color-premium-gold-light)' }} />}
                                    </div>
                                    <div className="flex items-center gap-3" style={{ fontSize: 'var(--font-size-sm)', color: 'var(--color-text-muted)', marginTop: '2px' }}>
                                        <span className="flex items-center gap-1">
                                            <Star className="w-3.5 h-3.5" style={{ color: 'var(--color-premium-gold-light)', fill: 'currentColor' }} />
                                            {account.seller.rating}
                                        </span>
                                        <span>{account.seller.sales} ta sotuvlar</span>
                                    </div>
                                </div>
                                <button onClick={handleContactSeller} className="btn btn-primary btn-sm">
                                    <MessageCircle className="w-4 h-4" />
                                    Bog'lanish
                                </button>
                            </div>
                        </div>
                    </div>

                    {/* Right Column - Purchase */}
                    <div>
                        <div style={{ ...cardStyle, position: 'sticky', top: '80px' }}>
                            {/* Price */}
                            <div className="text-center" style={{ marginBottom: '20px' }}>
                                <div style={{ fontSize: 'var(--font-size-sm)', color: 'var(--color-text-muted)', marginBottom: '4px' }}>Narxi</div>
                                <div style={{ fontSize: 'var(--font-size-3xl)', fontWeight: 'var(--font-weight-bold)', color: 'var(--color-accent-blue)' }}>{formatPrice(account.price)}</div>
                            </div>

                            {/* Payment Methods */}
                            <div style={{ marginBottom: '20px' }}>
                                <div style={{ fontSize: 'var(--font-size-sm)', color: 'var(--color-text-muted)', marginBottom: '10px' }}>To'lov usulini tanlang</div>
                                <div className="grid grid-cols-3" style={{ gap: '8px' }}>
                                    {paymentMethods.map((method) => (
                                        <button
                                            key={method.id}
                                            onClick={() => setSelectedPayment(method.id)}
                                            className={`payment-method-card ${selectedPayment === method.id ? 'selected' : ''}`}
                                        >
                                            <div style={{ width: '28px', height: '28px', borderRadius: 'var(--radius-md)', backgroundColor: method.color, margin: '0 auto 4px' }} />
                                            <div style={{ fontSize: 'var(--font-size-xs)', color: 'var(--color-text-secondary)' }}>{method.name}</div>
                                        </button>
                                    ))}
                                </div>
                            </div>

                            {/* Buy Button */}
                            <button
                                onClick={handleBuyClick}
                                className="btn btn-primary btn-lg"
                                style={{ width: '100%', padding: '14px', fontSize: 'var(--font-size-base)' }}
                            >
                                Sotib olish
                            </button>

                            {/* Security Notice */}
                            <div className="flex items-start gap-2" style={{
                                marginTop: '12px', padding: '10px 12px',
                                borderRadius: 'var(--radius-md)',
                                backgroundColor: 'var(--color-success-bg)',
                                border: '1px solid var(--color-accent-green)',
                            }}>
                                <Shield className="w-4 h-4 mt-0.5 flex-shrink-0" style={{ color: 'var(--color-accent-green)' }} />
                                <div style={{ fontSize: 'var(--font-size-xs)', color: 'var(--color-text-secondary)' }}>
                                    <span style={{ color: 'var(--color-accent-green)', fontWeight: 'var(--font-weight-medium)' }}>Xavfsiz xarid.</span> Pul faqat akkaunt tasdiqlangandan so'ng sotuvchiga o'tkaziladi.
                                </div>
                            </div>

                            {/* Report */}
                            <button
                                className="flex items-center justify-center gap-2 report-link"
                                style={{
                                    width: '100%', marginTop: '12px', padding: '10px',
                                    fontSize: 'var(--font-size-sm)', color: 'var(--color-text-muted)',
                                    background: 'none', border: 'none', cursor: 'pointer',
                                }}
                            >
                                <AlertTriangle className="w-4 h-4" />
                                Shikoyat qilish
                            </button>
                        </div>
                    </div>
                </div>

                {/* Related Accounts */}
                {relatedAccounts.length > 0 && (
                    <div style={{ marginTop: '48px' }}>
                        <h2 style={{ fontSize: 'var(--font-size-lg)', fontWeight: 'var(--font-weight-bold)', color: 'var(--color-text-primary)', marginBottom: '16px' }}>O'xshash akkauntlar</h2>
                        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4" style={{ gap: '16px' }}>
                            {relatedAccounts.map((acc) => (
                                <AccountCard key={acc.id} account={acc} />
                            ))}
                        </div>
                    </div>
                )}
            </div>

            {/* Review Modal */}
            <ReviewModal
                isOpen={showReviewModal}
                onClose={() => setShowReviewModal(false)}
                seller={account?.seller}
                account={account}
                onSubmit={handleReviewSubmit}
            />

            {/* Login Modal */}
            <LoginModal
                isOpen={showLoginModal}
                onClose={() => setShowLoginModal(false)}
                message={loginMessage}
                onSuccess={() => {
                    setShowLoginModal(false);
                }}
            />

            {/* Floating Review Button */}
            {hasPurchased && !hasReviewed && (
                <button
                    onClick={() => setShowReviewModal(true)}
                    className="btn btn-primary"
                    style={{
                        position: 'fixed', bottom: '80px', right: '20px',
                        borderRadius: 'var(--radius-full)', padding: '12px 20px',
                        zIndex: 40, boxShadow: 'var(--shadow-xl)',
                        background: 'linear-gradient(135deg, var(--color-premium-gold), var(--color-premium-gold-light))',
                        color: '#000', fontWeight: 'var(--font-weight-semibold)',
                    }}
                >
                    <Star className="w-4 h-4" />
                    Baholash
                </button>
            )}
        </div>
    );
};

export default AccountDetailPage;
