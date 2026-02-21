import { useState } from 'react';
import { Link } from 'react-router-dom';
import { Coins, Gift, Clock, ShoppingBag, TrendingUp, HelpCircle, ChevronRight, Star, CheckCircle, AlertCircle } from 'lucide-react';
import { useAuth } from '../context/AuthContext';
import { useCoins } from '../context/CoinContext';
import { useLanguage } from '../context/LanguageContext';

const CoinsPage = () => {
    const { t } = useLanguage();
    const { user, isAuthenticated } = useAuth();
    const { balance, monthlyEarned, monthlyTransactions, history, COINS_PER_TRANSACTION, MAX_MONTHLY_TRANSACTIONS, PREMIUM_COST_IN_COINS, getVoucherDiscount } = useCoins();
    const [activeTab, setActiveTab] = useState('about');

    const vouchers = [
        { id: 1, type: 'premium', discount: 50, expiresAt: new Date(Date.now() + 90 * 24 * 60 * 60 * 1000).toISOString(), status: 'active' },
        { id: 2, type: 'pro', discount: 20, expiresAt: new Date(Date.now() + 60 * 24 * 60 * 60 * 1000).toISOString(), status: 'active' },
    ];

    const formatDate = (dateString) => {
        return new Date(dateString).toLocaleDateString('uz-UZ', { year: 'numeric', month: 'long', day: 'numeric' });
    };

    const getDaysLeft = (dateString) => {
        const diff = new Date(dateString) - new Date();
        return Math.ceil(diff / (1000 * 60 * 60 * 24));
    };

    const cardStyle = {
        backgroundColor: 'var(--color-bg-primary)',
        border: '1px solid var(--color-border-default)',
        borderRadius: 'var(--radius-xl)',
        padding: '24px',
    };

    if (!isAuthenticated) {
        return (
            <div className="page-enter" style={{ minHeight: '100vh', display: 'flex', alignItems: 'center', justifyContent: 'center', paddingBottom: '64px' }}>
                <div className="text-center" style={{ maxWidth: '400px', padding: '0 16px' }}>
                    <div style={{ width: '72px', height: '72px', borderRadius: 'var(--radius-full)', background: 'linear-gradient(135deg, var(--color-premium-gold), var(--color-premium-gold-light))', display: 'flex', alignItems: 'center', justifyContent: 'center', margin: '0 auto 20px', opacity: 0.8 }}>
                        <Coins style={{ width: '36px', height: '36px', color: '#fff' }} />
                    </div>
                    <h1 style={{ fontSize: 'var(--font-size-2xl)', fontWeight: 'var(--font-weight-bold)', color: 'var(--color-text-primary)', marginBottom: '8px' }}>{t('coins.login_required')}</h1>
                    <p style={{ color: 'var(--color-text-secondary)', marginBottom: '24px' }}>{t('coins.login_prompt')}</p>
                    <Link to="/login" className="btn btn-primary btn-lg" style={{ textDecoration: 'none' }}>{t('coins.login_btn')}</Link>
                </div>
            </div>
        );
    }

    const tabs = [
        { id: 'about', label: t('coins.tab_about'), icon: HelpCircle },
        { id: 'vouchers', label: t('coins.tab_vouchers'), icon: Gift },
        { id: 'history', label: t('coins.tab_history'), icon: Clock },
    ];

    return (
        <div className="page-enter" style={{ minHeight: '100vh', paddingBottom: '64px' }}>
            <div className="gh-container" style={{ maxWidth: '960px' }}>
                {/* Breadcrumbs */}
                <div className="breadcrumbs">
                    <Link to="/">{t('common.home')}</Link>
                    <span className="breadcrumb-separator">/</span>
                    <span className="breadcrumb-current">{t('coins.breadcrumb')}</span>
                </div>

                {/* Header */}
                <div className="text-center" style={{ paddingTop: '24px', marginBottom: '32px' }}>
                    <div className="badge badge-yellow inline-flex items-center gap-2" style={{ padding: '6px 14px', marginBottom: '16px', fontSize: '13px' }}>
                        <Coins className="w-3.5 h-3.5" />
                        <span>{t('coins.badge')}</span>
                    </div>
                    <h1 style={{ fontSize: 'clamp(28px, 4vw, 36px)', fontWeight: 'var(--font-weight-bold)', color: 'var(--color-text-primary)', marginBottom: '10px' }}>
                        🪙 {t('coins.title')}
                    </h1>
                    <p style={{ color: 'var(--color-text-secondary)', maxWidth: '500px', margin: '0 auto' }}>
                        {t('coins.subtitle')}
                    </p>
                </div>

                {/* Balance Card */}
                <div style={{
                    ...cardStyle,
                    padding: '24px',
                    marginBottom: '24px',
                    background: 'linear-gradient(135deg, rgba(212,167,44,0.08) 0%, rgba(255,152,0,0.08) 100%)',
                    border: '1px solid rgba(212,167,44,0.2)',
                }}>
                    <div className="flex flex-col md:flex-row md:items-center md:justify-between" style={{ gap: '20px' }}>
                        <div className="flex items-center gap-4">
                            <div style={{
                                width: '56px', height: '56px',
                                background: 'linear-gradient(135deg, var(--color-premium-gold), var(--color-premium-gold-light))',
                                borderRadius: 'var(--radius-xl)',
                                display: 'flex', alignItems: 'center', justifyContent: 'center',
                            }}>
                                <Coins style={{ width: '28px', height: '28px', color: '#fff' }} />
                            </div>
                            <div>
                                <p style={{ fontSize: 'var(--font-size-sm)', color: 'var(--color-text-muted)' }}>{t('coins.balance_label')}</p>
                                <p style={{ fontSize: 'var(--font-size-3xl)', fontWeight: 'var(--font-weight-bold)', color: 'var(--color-text-primary)' }}>
                                    {balance} <span style={{ color: 'var(--color-premium-gold-light)' }}>Coin</span>
                                </p>
                            </div>
                        </div>
                        <div className="flex flex-wrap" style={{ gap: '12px' }}>
                            <div style={{ padding: '10px 16px', borderRadius: 'var(--radius-lg)', backgroundColor: 'var(--color-bg-primary)', border: '1px solid var(--color-border-muted)' }}>
                                <p style={{ fontSize: 'var(--font-size-xs)', color: 'var(--color-text-muted)' }}>{t('coins.monthly_earned')}</p>
                                <p style={{ fontSize: 'var(--font-size-lg)', fontWeight: 'var(--font-weight-bold)', color: 'var(--color-accent-green)' }}>+{monthlyEarned} coin</p>
                            </div>
                            <div style={{ padding: '10px 16px', borderRadius: 'var(--radius-lg)', backgroundColor: 'var(--color-bg-primary)', border: '1px solid var(--color-border-muted)' }}>
                                <p style={{ fontSize: 'var(--font-size-xs)', color: 'var(--color-text-muted)' }}>{t('coins.transactions_label')}</p>
                                <p style={{ fontSize: 'var(--font-size-lg)', fontWeight: 'var(--font-weight-bold)', color: 'var(--color-text-primary)' }}>{monthlyTransactions}/{MAX_MONTHLY_TRANSACTIONS}</p>
                            </div>
                        </div>
                    </div>
                </div>

                {/* Tabs */}
                <div className="tabs" style={{ marginBottom: '20px' }}>
                    {tabs.map(tab => (
                        <button
                            key={tab.id}
                            onClick={() => setActiveTab(tab.id)}
                            className={`tab ${activeTab === tab.id ? 'tab-active' : ''}`}
                        >
                            <tab.icon className="w-4 h-4" />
                            {tab.label}
                        </button>
                    ))}
                </div>

                {/* Tab Content */}
                <div style={cardStyle}>
                    {activeTab === 'about' && (
                        <div>
                            {/* How to earn */}
                            <div style={{ marginBottom: '28px' }}>
                                <h3 className="flex items-center gap-2" style={{ fontSize: 'var(--font-size-lg)', fontWeight: 'var(--font-weight-semibold)', color: 'var(--color-text-primary)', marginBottom: '16px' }}>
                                    <TrendingUp className="w-5 h-5" style={{ color: 'var(--color-accent-green)' }} />
                                    {t('coins.how_earn_title')}
                                </h3>
                                <div className="grid md:grid-cols-2" style={{ gap: '12px' }}>
                                    <div style={{ padding: '16px', borderRadius: 'var(--radius-lg)', backgroundColor: 'var(--color-bg-secondary)', border: '1px solid var(--color-border-muted)' }}>
                                        <div className="flex items-center gap-3" style={{ marginBottom: '10px' }}>
                                            <div style={{ width: '36px', height: '36px', borderRadius: 'var(--radius-md)', backgroundColor: 'var(--color-success-bg)', display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
                                                <ShoppingBag className="w-4 h-4" style={{ color: 'var(--color-accent-green)' }} />
                                            </div>
                                            <div>
                                                <p style={{ fontWeight: 'var(--font-weight-semibold)', color: 'var(--color-text-primary)' }}>{t('coins.sell_account')}</p>
                                                <p style={{ fontSize: 'var(--font-size-sm)', color: 'var(--color-text-muted)' }}>{t('coins.per_sale')}</p>
                                            </div>
                                        </div>
                                        <p style={{ fontSize: 'var(--font-size-2xl)', fontWeight: 'var(--font-weight-bold)', color: 'var(--color-premium-gold-light)' }}>+{COINS_PER_TRANSACTION} coin</p>
                                    </div>
                                    <div style={{ padding: '16px', borderRadius: 'var(--radius-lg)', backgroundColor: 'var(--color-bg-secondary)', border: '1px solid var(--color-border-muted)' }}>
                                        <div className="flex items-center gap-3" style={{ marginBottom: '10px' }}>
                                            <div style={{ width: '36px', height: '36px', borderRadius: 'var(--radius-md)', backgroundColor: 'var(--color-info-bg)', display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
                                                <ShoppingBag className="w-4 h-4" style={{ color: 'var(--color-accent-blue)' }} />
                                            </div>
                                            <div>
                                                <p style={{ fontWeight: 'var(--font-weight-semibold)', color: 'var(--color-text-primary)' }}>{t('coins.buy_account')}</p>
                                                <p style={{ fontSize: 'var(--font-size-sm)', color: 'var(--color-text-muted)' }}>{t('coins.per_purchase')}</p>
                                            </div>
                                        </div>
                                        <p style={{ fontSize: 'var(--font-size-2xl)', fontWeight: 'var(--font-weight-bold)', color: 'var(--color-premium-gold-light)' }}>+{COINS_PER_TRANSACTION} coin</p>
                                    </div>
                                </div>
                                <div className="flex items-start gap-2" style={{ marginTop: '12px', padding: '12px 16px', borderRadius: 'var(--radius-md)', backgroundColor: 'var(--color-warning-bg)', border: '1px solid var(--color-accent-orange)' }}>
                                    <AlertCircle className="w-4 h-4 mt-0.5 flex-shrink-0" style={{ color: 'var(--color-accent-orange)' }} />
                                    <p style={{ fontSize: 'var(--font-size-sm)', color: 'var(--color-text-secondary)' }}>
                                        {(t('coins.important_note') || '').replace('{n}', MAX_MONTHLY_TRANSACTIONS).replace('{max}', MAX_MONTHLY_TRANSACTIONS * COINS_PER_TRANSACTION)}
                                    </p>
                                </div>
                            </div>

                            {/* How to use */}
                            <div style={{ marginBottom: '28px' }}>
                                <h3 className="flex items-center gap-2" style={{ fontSize: 'var(--font-size-lg)', fontWeight: 'var(--font-weight-semibold)', color: 'var(--color-text-primary)', marginBottom: '16px' }}>
                                    <Gift className="w-5 h-5" style={{ color: 'var(--color-accent-blue)' }} />
                                    {t('coins.how_use_title')}
                                </h3>
                                <div className="flex items-center gap-4" style={{ padding: '16px', borderRadius: 'var(--radius-lg)', background: 'linear-gradient(135deg, var(--color-info-bg) 0%, rgba(137,87,229,0.06) 100%)', border: '1px solid var(--color-accent-blue)' }}>
                                    <div style={{ width: '48px', height: '48px', borderRadius: 'var(--radius-xl)', backgroundColor: 'var(--color-accent-blue)', display: 'flex', alignItems: 'center', justifyContent: 'center', flexShrink: 0 }}>
                                        <Star style={{ width: '24px', height: '24px', color: '#fff' }} />
                                    </div>
                                    <div className="flex-1">
                                        <p style={{ fontWeight: 'var(--font-weight-semibold)', color: 'var(--color-text-primary)' }}>{t('coins.premium_free')}</p>
                                        <p style={{ fontSize: 'var(--font-size-sm)', color: 'var(--color-text-muted)' }}>{t('coins.premium_free_desc')}</p>
                                    </div>
                                    <div style={{ textAlign: 'right' }}>
                                        <p style={{ fontSize: 'var(--font-size-2xl)', fontWeight: 'var(--font-weight-bold)', color: 'var(--color-premium-gold-light)' }}>{PREMIUM_COST_IN_COINS}</p>
                                        <p style={{ fontSize: 'var(--font-size-xs)', color: 'var(--color-text-muted)' }}>coin</p>
                                    </div>
                                </div>
                            </div>

                            {/* Voucher Info */}
                            <div>
                                <h3 className="flex items-center gap-2" style={{ fontSize: 'var(--font-size-lg)', fontWeight: 'var(--font-weight-semibold)', color: 'var(--color-text-primary)', marginBottom: '16px' }}>
                                    <Clock className="w-5 h-5" style={{ color: 'var(--color-accent-orange)' }} />
                                    {t('coins.voucher_about')}
                                </h3>
                                <div className="grid md:grid-cols-2" style={{ gap: '12px', marginBottom: '12px' }}>
                                    <div style={{ padding: '16px', borderRadius: 'var(--radius-lg)', backgroundColor: 'var(--color-bg-secondary)', border: '1px solid var(--color-border-muted)' }}>
                                        <p style={{ color: 'var(--color-accent-blue)', fontWeight: 'var(--font-weight-semibold)', marginBottom: '8px' }}>{t('coins.premium_subscriber')}</p>
                                        <p style={{ fontSize: 'var(--font-size-2xl)', fontWeight: 'var(--font-weight-bold)', color: 'var(--color-text-primary)', marginBottom: '4px' }}>50% <span style={{ fontSize: 'var(--font-size-base)', color: 'var(--color-text-muted)' }}>{t('coins.discount')}</span></p>
                                        <p style={{ fontSize: 'var(--font-size-sm)', color: 'var(--color-text-muted)' }}>{t('coins.premium_auto_voucher')}</p>
                                    </div>
                                    <div style={{ padding: '16px', borderRadius: 'var(--radius-lg)', backgroundColor: 'var(--color-bg-secondary)', border: '1px solid var(--color-border-muted)' }}>
                                        <p style={{ color: 'var(--color-accent-purple)', fontWeight: 'var(--font-weight-semibold)', marginBottom: '8px' }}>{t('coins.pro_subscriber')}</p>
                                        <p style={{ fontSize: 'var(--font-size-2xl)', fontWeight: 'var(--font-weight-bold)', color: 'var(--color-text-primary)', marginBottom: '4px' }}>20% <span style={{ fontSize: 'var(--font-size-base)', color: 'var(--color-text-muted)' }}>{t('coins.discount')}</span></p>
                                        <p style={{ fontSize: 'var(--font-size-sm)', color: 'var(--color-text-muted)' }}>{t('coins.pro_auto_voucher')}</p>
                                    </div>
                                </div>
                                <div className="flex items-start gap-2" style={{ padding: '12px 16px', borderRadius: 'var(--radius-md)', backgroundColor: 'var(--color-warning-bg)', border: '1px solid var(--color-accent-orange)' }}>
                                    <Clock className="w-4 h-4 mt-0.5 flex-shrink-0" style={{ color: 'var(--color-accent-orange)' }} />
                                    <p style={{ fontSize: 'var(--font-size-sm)', color: 'var(--color-text-secondary)' }}>
                                        {t('coins.voucher_note')}
                                    </p>
                                </div>
                            </div>
                        </div>
                    )}

                    {activeTab === 'vouchers' && (
                        <div>
                            <h3 style={{ fontSize: 'var(--font-size-lg)', fontWeight: 'var(--font-weight-semibold)', color: 'var(--color-text-primary)', marginBottom: '16px' }}>{t('coins.your_vouchers')}</h3>
                            {vouchers.length > 0 ? (
                                <div style={{ display: 'flex', flexDirection: 'column', gap: '10px' }}>
                                    {vouchers.map(voucher => (
                                        <div key={voucher.id} className="flex items-center gap-4" style={{ padding: '14px 16px', borderRadius: 'var(--radius-lg)', backgroundColor: 'var(--color-bg-secondary)', border: '1px solid var(--color-border-muted)' }}>
                                            <div style={{
                                                width: '48px', height: '48px', borderRadius: 'var(--radius-xl)',
                                                background: voucher.type === 'premium' ? 'linear-gradient(135deg, var(--color-accent-blue), var(--color-accent-purple))' : 'linear-gradient(135deg, var(--color-accent-blue), var(--color-accent-green))',
                                                display: 'flex', alignItems: 'center', justifyContent: 'center', flexShrink: 0,
                                            }}>
                                                <Gift style={{ width: '24px', height: '24px', color: '#fff' }} />
                                            </div>
                                            <div className="flex-1">
                                                <div className="flex items-center gap-2">
                                                    <p style={{ fontWeight: 'var(--font-weight-semibold)', color: 'var(--color-text-primary)' }}>{voucher.discount}% chegirma</p>
                                                    <span className={`badge ${voucher.type === 'premium' ? 'badge-purple' : 'badge-blue'}`}>
                                                        {voucher.type === 'premium' ? 'Premium' : 'Pro'}
                                                    </span>
                                                </div>
                                                <p style={{ fontSize: 'var(--font-size-sm)', color: 'var(--color-text-muted)' }}>{t('coins.valid_until')}: {formatDate(voucher.expiresAt)}</p>
                                            </div>
                                            <div className="text-right">
                                                <p style={{ fontSize: 'var(--font-size-sm)', fontWeight: 'var(--font-weight-medium)', color: getDaysLeft(voucher.expiresAt) < 30 ? 'var(--color-accent-orange)' : 'var(--color-accent-green)' }}>
                                                    {(t('coins.days_left') || '').replace('{n}', getDaysLeft(voucher.expiresAt))}
                                                </p>
                                                <Link to="/premium" className="flex items-center gap-1 justify-end" style={{ fontSize: 'var(--font-size-xs)', color: 'var(--color-text-accent)', marginTop: '4px', textDecoration: 'none' }}>
                                                    {t('coins.use_btn')} <ChevronRight className="w-3 h-3" />
                                                </Link>
                                            </div>
                                        </div>
                                    ))}
                                </div>
                            ) : (
                                <div className="empty-state">
                                    <Gift className="empty-state-icon" />
                                    <p className="empty-state-title">{t('coins.empty_vouchers')}</p>
                                    <p className="empty-state-description">{t('coins.empty_vouchers_desc')}</p>
                                </div>
                            )}
                        </div>
                    )}

                    {activeTab === 'history' && (
                        <div>
                            <h3 style={{ fontSize: 'var(--font-size-lg)', fontWeight: 'var(--font-weight-semibold)', color: 'var(--color-text-primary)', marginBottom: '16px' }}>{t('coins.coin_history')}</h3>
                            {history.length > 0 ? (
                                <div style={{ display: 'flex', flexDirection: 'column', gap: '6px' }}>
                                    {history.slice().reverse().map(item => (
                                        <div key={item.id} className="flex items-center gap-3" style={{ padding: '10px 14px', borderRadius: 'var(--radius-lg)', backgroundColor: 'var(--color-bg-secondary)' }}>
                                            <div style={{
                                                width: '36px', height: '36px', borderRadius: 'var(--radius-md)',
                                                backgroundColor: item.type === 'earned' ? 'var(--color-success-bg)' : 'var(--color-error-bg)',
                                                display: 'flex', alignItems: 'center', justifyContent: 'center', flexShrink: 0,
                                            }}>
                                                {item.type === 'earned' ? (
                                                    <TrendingUp className="w-4 h-4" style={{ color: 'var(--color-accent-green)' }} />
                                                ) : (
                                                    <ShoppingBag className="w-4 h-4" style={{ color: 'var(--color-error)' }} />
                                                )}
                                            </div>
                                            <div className="flex-1">
                                                <p style={{ fontWeight: 'var(--font-weight-medium)', color: 'var(--color-text-primary)' }}>{item.reason}</p>
                                                <p style={{ fontSize: 'var(--font-size-xs)', color: 'var(--color-text-muted)' }}>{formatDate(item.date)}</p>
                                            </div>
                                            <p style={{ fontWeight: 'var(--font-weight-bold)', color: item.amount > 0 ? 'var(--color-accent-green)' : 'var(--color-error)' }}>
                                                {item.amount > 0 ? '+' : ''}{item.amount} coin
                                            </p>
                                        </div>
                                    ))}
                                </div>
                            ) : (
                                <div className="empty-state">
                                    <Clock className="empty-state-icon" />
                                    <p className="empty-state-title">{t('coins.empty_history')}</p>
                                    <p className="empty-state-description">{t('coins.empty_history_desc')}</p>
                                </div>
                            )}
                        </div>
                    )}
                </div>

                {/* CTA */}
                {balance >= PREMIUM_COST_IN_COINS && (
                    <div className="text-center" style={{
                        marginTop: '24px', padding: '28px',
                        borderRadius: 'var(--radius-xl)',
                        background: 'linear-gradient(135deg, var(--color-info-bg) 0%, rgba(137,87,229,0.06) 100%)',
                        border: '1px solid var(--color-accent-blue)',
                    }}>
                        <CheckCircle style={{ width: '48px', height: '48px', color: 'var(--color-accent-green)', margin: '0 auto 16px' }} />
                        <h3 style={{ fontSize: 'var(--font-size-lg)', fontWeight: 'var(--font-weight-bold)', color: 'var(--color-text-primary)', marginBottom: '8px' }}>{t('coins.congrats_title')} 🎉</h3>
                        <p style={{ color: 'var(--color-text-secondary)', marginBottom: '16px' }}>{(t('coins.congrats_text') || '').replace('{n}', balance)}</p>
                        <Link to="/premium" className="btn btn-primary btn-lg" style={{ textDecoration: 'none' }}>
                            {t('coins.get_premium_btn')} <ChevronRight className="w-4 h-4" />
                        </Link>
                    </div>
                )}
            </div>
        </div>
    );
};

export default CoinsPage;
