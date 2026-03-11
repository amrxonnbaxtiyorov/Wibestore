import { useState } from 'react';
import { Search, Crown, User, Check, X, Clock, Star, Loader } from 'lucide-react';
import { getDisplayInitial } from '../../lib/displayUtils';
import { useLanguage } from '../../context/LanguageContext';
import { useAdminUsers, useAdminGrantSubscription } from '../../hooks';

const AdminPremium = () => {
    const { t } = useLanguage();
    const [searchQuery, setSearchQuery] = useState('');
    const [selectedUser, setSelectedUser] = useState(null);
    const [showConfirmModal, setShowConfirmModal] = useState(false);
    const [premiumType, setPremiumType] = useState('premium');
    const [premiumMonths, setPremiumMonths] = useState(1);
    const [message, setMessage] = useState({ type: '', text: '' });

    const { data: usersData, isLoading } = useAdminUsers({ search: searchQuery, page_size: 50 });
    const grantSubscription = useAdminGrantSubscription();

    const users = Array.isArray(usersData?.results) ? usersData.results : (Array.isArray(usersData) ? usersData : []);

    const handleGrantPremium = () => {
        if (!selectedUser) return;
        grantSubscription.mutate(
            { userId: selectedUser.id, planSlug: premiumType, months: premiumMonths },
            {
                onSuccess: () => {
                    setShowConfirmModal(false);
                    setSelectedUser(null);
                    setMessage({ type: 'success', text: `${selectedUser.display_name || selectedUser.email} ga ${premiumType} berildi!` });
                    setTimeout(() => setMessage({ type: '', text: '' }), 3000);
                },
                onError: (err) => {
                    const msg = err?.response?.data?.error || err?.message || 'Xatolik yuz berdi';
                    setMessage({ type: 'error', text: msg });
                    setTimeout(() => setMessage({ type: '', text: '' }), 4000);
                },
            }
        );
    };

    const handleRevokePremium = (user) => {
        if (!window.confirm(`${user.display_name || user.email} dan premiumni olib tashlamoqchimisiz?`)) return;
        grantSubscription.mutate(
            { userId: user.id, planSlug: 'free', months: 0 },
            {
                onSuccess: () => {
                    setMessage({ type: 'success', text: `${user.display_name || user.email} dan premium olib tashlandi!` });
                    setTimeout(() => setMessage({ type: '', text: '' }), 3000);
                },
                onError: (err) => {
                    const msg = err?.response?.data?.error || err?.message || 'Xatolik yuz berdi';
                    setMessage({ type: 'error', text: msg });
                    setTimeout(() => setMessage({ type: '', text: '' }), 4000);
                },
            }
        );
    };

    const getPremiumBadge = (user) => {
        const plan = user.subscription_plan ?? user.current_plan ?? null;
        if (!plan || plan === 'free') return null;
        if (plan === 'pro') {
            return (
                <span className="badge" style={{ backgroundColor: 'var(--color-info-bg)', color: 'var(--color-accent-blue)', display: 'inline-flex', alignItems: 'center', gap: '4px' }}>
                    <Star style={{ width: '12px', height: '12px' }} /> Pro
                </span>
            );
        }
        return (
            <span className="badge" style={{ backgroundColor: 'var(--color-warning-bg)', color: 'var(--color-premium-gold-light)', display: 'inline-flex', alignItems: 'center', gap: '4px' }}>
                <Crown style={{ width: '12px', height: '12px' }} /> Premium
            </span>
        );
    };

    const premiumUsers = users.filter(u => (u.subscription_plan ?? u.current_plan) === 'premium');
    const proUsers = users.filter(u => (u.subscription_plan ?? u.current_plan) === 'pro');

    return (
        <div style={{ display: 'flex', flexDirection: 'column', gap: '24px' }}>
            {/* Header */}
            <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between' }}>
                <div>
                    <h1 style={{ fontSize: 'var(--font-size-2xl)', fontWeight: 'var(--font-weight-bold)', color: 'var(--color-text-primary)', display: 'flex', alignItems: 'center', gap: '12px' }}>
                        <Crown style={{ width: '28px', height: '28px', color: 'var(--color-premium-gold-light)' }} />
                        {t('admin.premium_title')}
                    </h1>
                    <p style={{ color: 'var(--color-text-muted)', marginTop: '4px' }}>{t('admin.premium_subtitle')}</p>
                </div>
            </div>

            {/* Success/Error Message */}
            {message.text && (
                <div className={`alert ${message.type === 'success' ? 'alert-success' : 'alert-error'}`}>
                    {message.type === 'success' ? <Check style={{ width: '18px', height: '18px', flexShrink: 0 }} /> : <X style={{ width: '18px', height: '18px', flexShrink: 0 }} />}
                    <span>{message.text}</span>
                </div>
            )}

            {/* Search */}
            <div style={{
                backgroundColor: 'var(--color-bg-secondary)',
                borderRadius: 'var(--radius-xl)',
                padding: '24px',
                border: '1px solid var(--color-border-default)',
            }}>
                <h2 style={{ fontSize: 'var(--font-size-lg)', fontWeight: 'var(--font-weight-semibold)', color: 'var(--color-text-primary)', marginBottom: '16px' }}>
                    {t('admin.premium_search')}
                </h2>
                <div style={{ position: 'relative' }}>
                    <Search style={{ position: 'absolute', left: '12px', top: '50%', transform: 'translateY(-50%)', width: '16px', height: '16px', color: 'var(--color-text-muted)' }} />
                    <input
                        type="text"
                        value={searchQuery}
                        onChange={(e) => setSearchQuery(e.target.value)}
                        placeholder={t('admin.premium_search_placeholder')}
                        className="input input-lg"
                        style={{ paddingLeft: '36px' }}
                    />
                </div>
            </div>

            {/* Users List */}
            <div style={{
                backgroundColor: 'var(--color-bg-secondary)',
                borderRadius: 'var(--radius-xl)',
                border: '1px solid var(--color-border-default)',
                overflow: 'hidden',
            }}>
                <div className="card-header">
                    <h2 style={{ fontSize: 'var(--font-size-lg)', fontWeight: 'var(--font-weight-semibold)', color: 'var(--color-text-primary)' }}>
                        {t('admin.premium_users_count')} ({users.length})
                    </h2>
                </div>

                <div>
                    {isLoading ? (
                        <div style={{ padding: '48px 16px', textAlign: 'center' }}>
                            <Loader style={{ width: '32px', height: '32px', color: 'var(--color-text-muted)', margin: '0 auto' }} />
                        </div>
                    ) : users.length > 0 ? (
                        users.map((user, idx) => {
                            const name = user.display_name || user.full_name || user.email || 'User';
                            const plan = user.subscription_plan ?? user.current_plan ?? 'free';
                            const expiry = user.subscription_expires_at ?? null;

                            return (
                                <div
                                    key={user.id}
                                    className="leaderboard-row"
                                    style={{
                                        padding: '16px 20px',
                                        display: 'flex',
                                        alignItems: 'center',
                                        justifyContent: 'space-between',
                                        borderBottom: idx < users.length - 1 ? '1px solid var(--color-border-muted)' : 'none',
                                    }}
                                >
                                    <div style={{ display: 'flex', alignItems: 'center', gap: '16px' }}>
                                        <div style={{
                                            width: '44px',
                                            height: '44px',
                                            background: 'linear-gradient(135deg, var(--color-accent-blue), var(--color-accent-blue-hover))',
                                            borderRadius: 'var(--radius-full)',
                                            display: 'flex',
                                            alignItems: 'center',
                                            justifyContent: 'center',
                                            color: '#ffffff',
                                            fontWeight: 'var(--font-weight-bold)',
                                            flexShrink: 0,
                                        }}>
                                            {getDisplayInitial(name, 'U')}
                                        </div>
                                        <div>
                                            <div style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
                                                <span style={{ fontWeight: 'var(--font-weight-medium)', color: 'var(--color-text-primary)' }}>{name}</span>
                                                {getPremiumBadge(user)}
                                            </div>
                                            <p style={{ fontSize: 'var(--font-size-sm)', color: 'var(--color-text-muted)' }}>{user.email}</p>
                                            {plan !== 'free' && expiry && (
                                                <p style={{ fontSize: 'var(--font-size-xs)', color: 'var(--color-text-muted)', display: 'flex', alignItems: 'center', gap: '4px', marginTop: '4px' }}>
                                                    <Clock style={{ width: '12px', height: '12px' }} />
                                                    {t('admin.premium_expires')}: {new Date(expiry).toLocaleDateString()}
                                                </p>
                                            )}
                                        </div>
                                    </div>

                                    <div style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
                                        {plan !== 'free' ? (
                                            <button onClick={() => handleRevokePremium(user)} className="btn btn-danger btn-md" disabled={grantSubscription.isPending}>
                                                {t('admin.premium_revoke')}
                                            </button>
                                        ) : (
                                            <button onClick={() => { setSelectedUser(user); setShowConfirmModal(true); }} className="btn btn-premium btn-md">
                                                <Crown style={{ width: '14px', height: '14px' }} /> {t('admin.premium_grant')}
                                            </button>
                                        )}
                                    </div>
                                </div>
                            );
                        })
                    ) : (
                        <div style={{ padding: '48px 16px', textAlign: 'center' }}>
                            <User style={{ width: '48px', height: '48px', color: 'var(--color-text-muted)', margin: '0 auto 16px' }} />
                            <p style={{ color: 'var(--color-text-secondary)' }}>{t('admin.premium_no_user')}</p>
                        </div>
                    )}
                </div>
            </div>

            {/* Premium Stats */}
            <div className="grid grid-cols-1 sm:grid-cols-3" style={{ gap: '16px' }}>
                {[
                    { icon: User, label: t('admin.premium_total_users'), value: users.length, color: 'var(--color-text-muted)' },
                    { icon: Crown, label: 'Premium', value: premiumUsers.length, color: 'var(--color-premium-gold-light)' },
                    { icon: Star, label: t('admin.premium_pro'), value: proUsers.length, color: 'var(--color-accent-blue)' },
                ].map((s, idx) => (
                    <div key={idx} className="stat-card">
                        <div style={{ display: 'flex', alignItems: 'center', gap: '12px', marginBottom: '8px' }}>
                            <s.icon style={{ width: '20px', height: '20px', color: s.color }} />
                            <span style={{ color: 'var(--color-text-muted)', fontSize: 'var(--font-size-sm)' }}>{s.label}</span>
                        </div>
                        <p className="stat-card-value">{s.value}</p>
                    </div>
                ))}
            </div>

            {/* Grant Premium Modal */}
            {showConfirmModal && selectedUser && (
                <div style={{ position: 'fixed', inset: 0, backgroundColor: 'var(--color-bg-overlay)', backdropFilter: 'blur(4px)', zIndex: 50, display: 'flex', alignItems: 'center', justifyContent: 'center', padding: '16px' }}>
                    <div style={{
                        backgroundColor: 'var(--color-bg-secondary)',
                        borderRadius: 'var(--radius-xl)',
                        padding: '24px',
                        width: '100%',
                        maxWidth: '440px',
                        border: '1px solid var(--color-border-default)',
                    }}>
                        <div style={{ display: 'flex', alignItems: 'center', gap: '12px', marginBottom: '24px' }}>
                            <div style={{
                                width: '44px',
                                height: '44px',
                                background: 'linear-gradient(135deg, var(--color-premium-gold), var(--color-premium-gold-light))',
                                borderRadius: 'var(--radius-full)',
                                display: 'flex',
                                alignItems: 'center',
                                justifyContent: 'center',
                            }}>
                                <Crown style={{ width: '22px', height: '22px', color: '#ffffff' }} />
                            </div>
                            <div>
                                <h3 style={{ fontSize: 'var(--font-size-lg)', fontWeight: 'var(--font-weight-bold)', color: 'var(--color-text-primary)' }}>
                                    {t('admin.premium_grant')}
                                </h3>
                                <p style={{ color: 'var(--color-text-muted)', fontSize: 'var(--font-size-sm)' }}>
                                    {selectedUser.display_name || selectedUser.email}
                                </p>
                            </div>
                        </div>

                        {/* Premium Type */}
                        <div className="form-field">
                            <label className="input-label">Tarif turi</label>
                            <div className="grid grid-cols-2" style={{ gap: '12px' }}>
                                {[
                                    { type: 'premium', icon: Crown, label: 'Premium', active: 'var(--color-warning-bg)', border: 'var(--color-accent-orange)', text: 'var(--color-accent-orange)' },
                                    { type: 'pro', icon: Star, label: 'Pro', active: 'var(--color-info-bg)', border: 'var(--color-accent-blue)', text: 'var(--color-accent-blue)' },
                                ].map((opt) => (
                                    <button
                                        key={opt.type}
                                        onClick={() => setPremiumType(opt.type)}
                                        style={{
                                            padding: '16px',
                                            borderRadius: 'var(--radius-lg)',
                                            border: `1px solid ${premiumType === opt.type ? opt.border : 'var(--color-border-default)'}`,
                                            backgroundColor: premiumType === opt.type ? opt.active : 'var(--color-bg-primary)',
                                            color: premiumType === opt.type ? opt.text : 'var(--color-text-secondary)',
                                            display: 'flex',
                                            flexDirection: 'column',
                                            alignItems: 'center',
                                            gap: '8px',
                                            cursor: 'pointer',
                                            transition: 'all 0.15s ease',
                                        }}
                                    >
                                        <opt.icon style={{ width: '22px', height: '22px' }} />
                                        {opt.label}
                                    </button>
                                ))}
                            </div>
                        </div>

                        {/* Duration */}
                        <div className="form-field">
                            <label className="input-label">Muddat (oy)</label>
                            <select
                                value={premiumMonths}
                                onChange={(e) => setPremiumMonths(Number(e.target.value))}
                                className="select select-lg"
                            >
                                <option value={1}>1 oy</option>
                                <option value={3}>3 oy</option>
                                <option value={6}>6 oy</option>
                                <option value={12}>1 yil (12 oy)</option>
                            </select>
                        </div>

                        {/* Actions */}
                        <div style={{ display: 'flex', gap: '12px', marginTop: '8px' }}>
                            <button
                                onClick={() => { setShowConfirmModal(false); setSelectedUser(null); }}
                                className="btn btn-secondary btn-md"
                                style={{ flex: 1 }}
                                disabled={grantSubscription.isPending}
                            >
                                {t('admin.cancel')}
                            </button>
                            <button
                                onClick={handleGrantPremium}
                                className="btn btn-premium btn-md"
                                style={{ flex: 1 }}
                                disabled={grantSubscription.isPending}
                            >
                                {grantSubscription.isPending
                                    ? <Loader style={{ width: '16px', height: '16px' }} />
                                    : <Check style={{ width: '16px', height: '16px' }} />
                                }
                                {t('admin.confirm')}
                            </button>
                        </div>
                    </div>
                </div>
            )}
        </div>
    );
};

export default AdminPremium;
