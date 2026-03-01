import { useState } from 'react';
import { Link, useSearchParams } from 'react-router-dom';
import { Check, Crown, Star, Zap, Shield, TrendingUp, X, Loader2 } from 'lucide-react';
import { useLanguage } from '../context/LanguageContext';
import { useAuth } from '../context/AuthContext';
import apiClient from '../lib/apiClient';

const PremiumPage = () => {
    const { t } = useLanguage();
    const { user } = useAuth();
    const [searchParams] = useSearchParams();
    const [loading, setLoading] = useState(null); // plan id being loaded
    const [error, setError] = useState('');

    // Check for payment result from URL params
    const paymentStatus = searchParams.get('payment');

    const features = {
        free: [
            { text: t('premium.feat_sell') || 'Sell accounts', included: true },
            { text: t('premium.feat_commission_10') || '10% commission', included: true },
            { text: t('premium.feat_standard') || 'Standard position', included: true },
            { text: t('premium.feat_basic_stats') || 'Basic statistics', included: true },
            { text: t('premium.feat_badge') || 'Premium badge', included: false },
            { text: t('premium.feat_homepage') || 'Homepage visibility', included: false },
            { text: t('premium.feat_fast_pay') || 'Fast payout', included: false },
            { text: t('premium.feat_manager') || 'Personal manager', included: false },
        ],
        premium: [
            { text: t('premium.feat_sell') || 'Sell accounts', included: true },
            { text: t('premium.feat_commission_8') || '8% commission', included: true },
            { text: t('premium.feat_3x') || '3x more visibility', included: true },
            { text: t('premium.feat_badge') || 'Premium badge', included: true },
            { text: t('premium.feat_homepage') || 'Homepage visibility', included: true },
            { text: t('premium.feat_search') || 'Top search position', included: true },
            { text: t('premium.feat_support') || 'Priority support', included: true },
            { text: t('premium.feat_manager') || 'Personal manager', included: false },
        ],
        pro: [
            { text: t('premium.feat_sell') || 'Sell accounts', included: true },
            { text: t('premium.feat_commission_5') || '5% commission', included: true },
            { text: t('premium.feat_top') || 'Top position', included: true },
            { text: t('premium.feat_vip_badge') || 'VIP golden badge', included: true },
            { text: t('premium.feat_homepage_first') || 'Homepage first', included: true },
            { text: t('premium.feat_fast_pay') || 'Fast payout (24h)', included: true },
            { text: t('premium.feat_vip_support') || 'VIP support', included: true },
            { text: t('premium.feat_manager') || 'Personal manager', included: true },
        ],
    };

    const plans = [
        {
            id: 'free',
            name: 'Free',
            priceUSD: 0,
            icon: '🆓',
            description: t('premium.free_desc') || 'Get started',
            features: features.free,
        },
        {
            id: 'premium',
            name: 'Premium',
            priceUSD: 9.99,
            icon: '⭐',
            description: t('premium.premium_desc') || 'More visibility',
            features: features.premium,
        },
        {
            id: 'pro',
            name: 'Pro',
            priceUSD: 24.99,
            icon: '💎',
            description: t('premium.pro_desc') || 'Maximum benefits',
            features: features.pro,
            popular: true,
        },
    ];

    const handleSubscribe = async (planSlug) => {
        setError('');

        if (!user) {
            const msg = t('premium.login_required') || 'Please login first to subscribe.';
            setError(msg);
            alert(msg);
            window.scrollTo({ top: 0, behavior: 'smooth' });
            return;
        }

        setLoading(planSlug);

        try {
            const response = await apiClient.post('/payments/stripe/create-checkout-session/', {
                plan_slug: planSlug,
            });

            if (response.data?.success && response.data?.data?.checkout_url) {
                // Redirect to Stripe Checkout
                window.location.href = response.data.data.checkout_url;
            } else {
                const msg = response.data?.error?.message || 'Failed to create checkout session.';
                setError(msg);
                alert(msg);
                window.scrollTo({ top: 0, behavior: 'smooth' });
            }
        } catch (err) {
            const msg = err.response?.data?.error?.message || err.message || 'Payment error. Please try again.';
            setError(msg);
            alert(msg);
            window.scrollTo({ top: 0, behavior: 'smooth' });
        } finally {
            setLoading(null);
        }
    };

    return (
        <div className="page-enter" style={{ minHeight: '100vh', paddingBottom: '64px' }}>
            <div className="gh-container">
                {/* Breadcrumbs */}
                <div className="breadcrumbs">
                    <Link to="/">{t('common.home')}</Link>
                    <span className="breadcrumb-separator">/</span>
                    <span className="breadcrumb-current">Premium</span>
                </div>

                {/* Payment Status Banner */}
                {paymentStatus === 'success' && (
                    <div
                        style={{
                            padding: '16px 20px',
                            borderRadius: 'var(--radius-lg)',
                            backgroundColor: 'var(--color-success-bg)',
                            border: '1px solid var(--color-accent-green)',
                            marginBottom: '24px',
                            marginTop: '16px',
                            textAlign: 'center',
                        }}
                    >
                        <p style={{ color: 'var(--color-accent-green)', fontWeight: 'var(--font-weight-semibold)' }}>
                            ✅ {t('premium.payment_success') || 'Payment successful! Your subscription is now active.'}
                        </p>
                    </div>
                )}

                {paymentStatus === 'cancelled' && (
                    <div
                        style={{
                            padding: '16px 20px',
                            borderRadius: 'var(--radius-lg)',
                            backgroundColor: 'var(--color-bg-secondary)',
                            border: '1px solid var(--color-border-default)',
                            marginBottom: '24px',
                            marginTop: '16px',
                            textAlign: 'center',
                        }}
                    >
                        <p style={{ color: 'var(--color-text-secondary)' }}>
                            {t('premium.payment_cancelled') || 'Payment was cancelled. You can try again anytime.'}
                        </p>
                    </div>
                )}

                {/* Error Banner */}
                {error && (
                    <div
                        style={{
                            padding: '16px 20px',
                            borderRadius: 'var(--radius-lg)',
                            backgroundColor: 'rgba(239, 68, 68, 0.1)',
                            border: '1px solid rgba(239, 68, 68, 0.3)',
                            marginBottom: '24px',
                            marginTop: '16px',
                            textAlign: 'center',
                        }}
                    >
                        <p style={{ color: '#ef4444', fontWeight: 'var(--font-weight-medium)' }}>
                            ⚠️ {error}
                        </p>
                    </div>
                )}

                {/* Header */}
                <div className="text-center" style={{ paddingTop: '32px', marginBottom: '48px' }}>
                    <div
                        className="badge badge-premium inline-flex items-center gap-2"
                        style={{ padding: '6px 14px', marginBottom: '20px', fontSize: '13px' }}
                    >
                        <Crown className="w-3.5 h-3.5" />
                        <span>{t('premium.badge') || 'Premium Plans'}</span>
                    </div>
                    <h1
                        style={{
                            fontSize: 'clamp(28px, 4vw, 40px)',
                            fontWeight: 'var(--font-weight-bold)',
                            color: 'var(--color-text-primary)',
                            marginBottom: '12px',
                        }}
                    >
                        {t('premium.title') || 'Boost your sales'}
                    </h1>
                    <p style={{
                        color: 'var(--color-text-secondary)',
                        fontSize: 'var(--font-size-lg)',
                        maxWidth: '520px',
                        margin: '0 auto',
                    }}>
                        {t('premium.subtitle') || 'Get more visibility and sell faster with Premium'}
                    </p>
                </div>

                {/* Pricing Cards */}
                <div
                    className="grid grid-cols-1 md:grid-cols-3"
                    style={{ gap: '24px', marginBottom: '64px' }}
                >
                    {plans.map((plan) => (
                        <div
                            key={plan.id}
                            className="relative pricing-card-hover"
                            style={{
                                backgroundColor: 'var(--color-bg-primary)',
                                border: `1px solid ${plan.popular ? 'var(--color-premium-gold-light)' : 'var(--color-border-default)'}`,
                                borderRadius: 'var(--radius-xl)',
                                padding: '32px 24px',
                            }}
                        >
                            {/* Popular badge */}
                            {plan.popular && (
                                <div
                                    className="absolute"
                                    style={{
                                        zIndex: 10,
                                        top: '-12px',
                                        left: '50%',
                                        transform: 'translateX(-50%)',
                                        padding: '4px 16px',
                                        background: 'linear-gradient(135deg, var(--color-premium-gold), var(--color-premium-gold-light))',
                                        borderRadius: 'var(--radius-full)',
                                        fontSize: 'var(--font-size-xs)',
                                        fontWeight: 'var(--font-weight-bold)',
                                        color: '#ffffff',
                                        whiteSpace: 'nowrap',
                                    }}
                                >
                                    🔥 {t('premium.popular') || 'Most Popular'}
                                </div>
                            )}

                            {/* Premium top accent */}
                            {plan.popular && (
                                <div style={{
                                    position: 'absolute', top: 0, left: 0, right: 0, height: '0px',
                                    background: 'linear-gradient(90deg, var(--color-premium-gold), var(--color-premium-gold-light))',
                                    borderRadius: 'var(--radius-xl) var(--radius-xl) 0 0',
                                }} />
                            )}

                            {/* Icon & Name */}
                            <div className="text-center" style={{ marginBottom: '24px' }}>
                                <div
                                    className="flex items-center justify-center mx-auto"
                                    style={{
                                        width: '56px', height: '56px',
                                        borderRadius: 'var(--radius-xl)',
                                        backgroundColor: 'var(--color-bg-tertiary)',
                                        fontSize: '24px',
                                        marginBottom: '16px',
                                    }}
                                >
                                    {plan.icon}
                                </div>
                                <h3 style={{
                                    fontSize: 'var(--font-size-xl)',
                                    fontWeight: 'var(--font-weight-bold)',
                                    color: 'var(--color-text-primary)',
                                    marginBottom: '4px',
                                }}>
                                    {plan.name}
                                </h3>
                                <p style={{ fontSize: 'var(--font-size-sm)', color: 'var(--color-text-muted)' }}>
                                    {plan.description}
                                </p>
                            </div>

                            {/* Price */}
                            <div className="text-center" style={{ marginBottom: '24px' }}>
                                {plan.priceUSD > 0 ? (
                                    <>
                                        <span style={{
                                            fontSize: 'var(--font-size-3xl)',
                                            fontWeight: 'var(--font-weight-bold)',
                                            color: 'var(--color-text-primary)',
                                        }}>
                                            ${plan.priceUSD}
                                        </span>
                                        <span style={{ color: 'var(--color-text-muted)', fontSize: 'var(--font-size-sm)' }}>/mo</span>
                                        <p style={{ marginTop: '6px', fontSize: 'var(--font-size-sm)', color: 'var(--color-accent-green)', fontWeight: 600 }}>
                                            {t('premium.first_month_discount') || '50% off first month'}
                                        </p>
                                    </>
                                ) : (
                                    <span style={{
                                        fontSize: 'var(--font-size-3xl)',
                                        fontWeight: 'var(--font-weight-bold)',
                                        color: 'var(--color-text-primary)',
                                    }}>
                                        {t('premium.free_label') || 'Free'}
                                    </span>
                                )}
                            </div>

                            {/* Features */}
                            <ul style={{ marginBottom: '24px' }}>
                                {plan.features.map((feature, index) => (
                                    <li
                                        key={index}
                                        className="flex items-center gap-3"
                                        style={{ padding: '6px 0' }}
                                    >
                                        <div
                                            className="flex items-center justify-center flex-shrink-0"
                                            style={{
                                                width: '18px', height: '18px',
                                                borderRadius: 'var(--radius-full)',
                                                backgroundColor: feature.included ? 'var(--color-success-bg)' : 'var(--color-bg-tertiary)',
                                            }}
                                        >
                                            {feature.included ? (
                                                <Check className="w-3 h-3" style={{ color: 'var(--color-accent-green)' }} />
                                            ) : (
                                                <X className="w-3 h-3" style={{ color: 'var(--color-text-muted)' }} />
                                            )}
                                        </div>
                                        <span style={{
                                            fontSize: 'var(--font-size-sm)',
                                            color: feature.included ? 'var(--color-text-primary)' : 'var(--color-text-muted)',
                                        }}>
                                            {feature.text}
                                        </span>
                                    </li>
                                ))}
                            </ul>

                            {/* Button */}
                            {plan.priceUSD > 0 ? (
                                <button
                                    onClick={() => handleSubscribe(plan.id)}
                                    disabled={loading === plan.id}
                                    className={`btn btn-lg w-full ${plan.popular ? 'btn-premium' : 'btn-primary'}`}
                                    style={{
                                        display: 'flex',
                                        alignItems: 'center',
                                        justifyContent: 'center',
                                        gap: '8px',
                                        cursor: loading === plan.id ? 'not-allowed' : 'pointer',
                                        opacity: loading === plan.id ? 0.7 : 1,
                                    }}
                                >
                                    {loading === plan.id ? (
                                        <>
                                            <Loader2 className="w-4 h-4" style={{ animation: 'spin 1s linear infinite' }} />
                                            {t('premium.processing') || 'Processing...'}
                                        </>
                                    ) : (
                                        <>
                                            💳 {t('premium.subscribe_now') || 'Subscribe Now'}
                                        </>
                                    )}
                                </button>
                            ) : (
                                <button className="btn btn-secondary btn-lg w-full" disabled>
                                    {t('premium.current_plan') || 'Current plan'}
                                </button>
                            )}
                        </div>
                    ))}
                </div>

                {/* Benefits Section */}
                <div
                    style={{
                        borderRadius: 'var(--radius-xl)',
                        backgroundColor: 'var(--color-accent-blue)',
                        padding: '48px 32px',
                        marginBottom: '48px',
                        position: 'relative',
                        overflow: 'hidden',
                    }}
                >
                    <div style={{ position: 'absolute', inset: 0, opacity: 0.06, pointerEvents: 'none' }}>
                        <div style={{ position: 'absolute', top: '-20%', right: '-5%', width: '300px', height: '300px', background: '#fff', borderRadius: '50%', filter: 'blur(60px)' }} />
                    </div>
                    <div style={{ position: 'relative' }}>
                        <div className="text-center" style={{ marginBottom: '40px' }}>
                            <h2 style={{ fontSize: 'var(--font-size-2xl)', fontWeight: 'var(--font-weight-bold)', color: '#ffffff', marginBottom: '8px' }}>
                                {t('premium.benefits_title') || 'Premium Benefits'}
                            </h2>
                            <p style={{ color: 'rgba(255,255,255,0.8)' }}>
                                {t('premium.benefits_subtitle') || 'Why sellers choose Premium?'}
                            </p>
                        </div>

                        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4" style={{ gap: '20px' }}>
                            {[
                                { icon: TrendingUp, title: t('premium.ben_visibility') || '3x visibility', description: t('premium.ben_visibility_desc') || 'Your accounts appear more in search' },
                                { icon: Zap, title: t('premium.ben_fast') || 'Fast sales', description: t('premium.ben_fast_desc') || 'Premium sellers sell 2x faster' },
                                { icon: Shield, title: t('premium.ben_trust') || 'Trust badge', description: t('premium.ben_trust_desc') || 'Buyers trust Premium sellers more' },
                                { icon: Star, title: t('premium.ben_position') || 'Top position', description: t('premium.ben_position_desc') || 'First in homepage and search' },
                            ].map((benefit, index) => (
                                <div
                                    key={index}
                                    className="text-center"
                                    style={{
                                        padding: '24px 16px',
                                        borderRadius: 'var(--radius-lg)',
                                        backgroundColor: 'rgba(255,255,255,0.1)',
                                        backdropFilter: 'blur(8px)',
                                    }}
                                >
                                    <div
                                        className="flex items-center justify-center mx-auto"
                                        style={{
                                            width: '48px', height: '48px',
                                            borderRadius: 'var(--radius-lg)',
                                            backgroundColor: 'rgba(255,255,255,0.15)',
                                            marginBottom: '12px',
                                        }}
                                    >
                                        <benefit.icon className="w-6 h-6" style={{ color: '#ffffff' }} />
                                    </div>
                                    <h3 style={{ fontSize: 'var(--font-size-base)', fontWeight: 'var(--font-weight-semibold)', color: '#ffffff', marginBottom: '4px' }}>
                                        {benefit.title}
                                    </h3>
                                    <p style={{ fontSize: 'var(--font-size-sm)', color: 'rgba(255,255,255,0.7)' }}>
                                        {benefit.description}
                                    </p>
                                </div>
                            ))}
                        </div>
                    </div>
                </div>

                {/* Payment Methods */}
                <div className="text-center">
                    <h3 style={{ fontSize: 'var(--font-size-lg)', fontWeight: 'var(--font-weight-semibold)', color: 'var(--color-text-primary)', marginBottom: '24px' }}>
                        {t('premium.payment_methods') || 'Payment Methods'}
                    </h3>
                    <div className="flex items-center justify-center gap-3 flex-wrap" style={{ marginBottom: '16px' }}>
                        {['Visa', 'Mastercard', 'Google Pay', 'Apple Pay'].map((method) => (
                            <div
                                key={method}
                                style={{
                                    padding: '12px 24px',
                                    borderRadius: 'var(--radius-lg)',
                                    backgroundColor: 'var(--color-bg-secondary)',
                                    border: '1px solid var(--color-border-default)',
                                    fontSize: 'var(--font-size-base)',
                                    fontWeight: 'var(--font-weight-bold)',
                                    color: 'var(--color-text-secondary)',
                                }}
                            >
                                {method}
                            </div>
                        ))}
                    </div>
                    <p style={{ color: 'var(--color-text-muted)', fontSize: 'var(--font-size-sm)' }}>
                        {t('premium.secure_payment') || 'Secure payment powered by Stripe'}
                    </p>
                </div>
            </div>

            {/* Spinner animation */}
            <style>{`
                @keyframes spin {
                    from { transform: rotate(0deg); }
                    to { transform: rotate(360deg); }
                }
            `}</style>
        </div>
    );
};

export default PremiumPage;
