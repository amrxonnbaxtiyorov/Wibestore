import { useState, useEffect, useCallback } from 'react';
import { Search, Crown, User, Check, X, Clock, Star } from 'lucide-react';
import { getDisplayInitial } from '../../lib/displayUtils';
import { useLanguage } from '../../context/LanguageContext';

const AdminPremium = () => {
    const { t } = useLanguage();
    const [searchQuery, setSearchQuery] = useState('');
    const [users, setUsers] = useState([]);
    const [selectedUser, setSelectedUser] = useState(null);
    const [showConfirmModal, setShowConfirmModal] = useState(false);
    const [premiumType, setPremiumType] = useState('premium');
    const [premiumDays, setPremiumDays] = useState(30);
    const [message, setMessage] = useState({ type: '', text: '' });

    const loadUsers = useCallback(() => {
        const savedUsers = localStorage.getItem('wibeUsers');
        if (savedUsers) {
            setUsers(JSON.parse(savedUsers));
        } else {
            const demoUsers = [
                { id: '1', name: 'Sardor', email: 'sardor@test.com', isPremium: false, premiumType: null, premiumExpiry: null },
                { id: '2', name: 'Jasur', email: 'jasur@test.com', isPremium: true, premiumType: 'premium', premiumExpiry: '2026-02-28' },
                { id: '3', name: 'Anvar', email: 'anvar@test.com', isPremium: true, premiumType: 'pro', premiumExpiry: '2026-03-15' },
            ];
            localStorage.setItem('wibeUsers', JSON.stringify(demoUsers));
            setUsers(demoUsers);
        }
    }, []);

    useEffect(() => {
        queueMicrotask(() => loadUsers());
    }, [loadUsers]);

    const filteredUsers = users.filter(user =>
        user.name?.toLowerCase().includes(searchQuery.toLowerCase()) ||
        user.email?.toLowerCase().includes(searchQuery.toLowerCase())
    );

    const handleGrantPremium = () => {
        if (!selectedUser) return;
        const expiryDate = new Date();
        expiryDate.setDate(expiryDate.getDate() + premiumDays);
        const updated = users.map(user => user.id === selectedUser.id ? {
            ...user, isPremium: true, premiumType, premiumExpiry: expiryDate.toISOString().split('T')[0]
        } : user);
        localStorage.setItem('wibeUsers', JSON.stringify(updated));
        setUsers(updated);
        setShowConfirmModal(false);
        setSelectedUser(null);
        setMessage({ type: 'success', text: `${selectedUser.name} ga ${premiumType} berildi!` });
        setTimeout(() => setMessage({ type: '', text: '' }), 3000);
    };

    const handleRevokePremium = (user) => {
        if (!window.confirm(`${user.name} dan premiumni olib tashlamoqchimisiz?`)) return;
        const updated = users.map(u => u.id === user.id ? { ...u, isPremium: false, premiumType: null, premiumExpiry: null } : u);
        localStorage.setItem('wibeUsers', JSON.stringify(updated));
        setUsers(updated);
        setMessage({ type: 'success', text: `${user.name} dan premium olib tashlandi!` });
        setTimeout(() => setMessage({ type: '', text: '' }), 3000);
    };

    const getPremiumBadge = (user) => {
        if (!user.isPremium) return null;
        if (user.premiumType === 'pro') {
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
                        {t('admin.premium_users_count')} ({filteredUsers.length})
                    </h2>
                </div>

                <div>
                    {filteredUsers.length > 0 ? (
                        filteredUsers.map((user, idx) => (
                            <div
                                key={user.id}
                                className="leaderboard-row"
                                style={{
                                    padding: '16px 20px',
                                    display: 'flex',
                                    alignItems: 'center',
                                    justifyContent: 'space-between',
                                    borderBottom: idx < filteredUsers.length - 1 ? '1px solid var(--color-border-muted)' : 'none',
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
                                        {getDisplayInitial(user.name, 'U')}
                                    </div>
                                    <div>
                                        <div style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
                                            <span style={{ fontWeight: 'var(--font-weight-medium)', color: 'var(--color-text-primary)' }}>{user.name}</span>
                                            {getPremiumBadge(user)}
                                        </div>
                                        <p style={{ fontSize: 'var(--font-size-sm)', color: 'var(--color-text-muted)' }}>{user.email}</p>
                                        {user.isPremium && user.premiumExpiry && (
                                            <p style={{ fontSize: 'var(--font-size-xs)', color: 'var(--color-text-muted)', display: 'flex', alignItems: 'center', gap: '4px', marginTop: '4px' }}>
                                                <Clock style={{ width: '12px', height: '12px' }} />
                                                {t('admin.premium_expires')}: {user.premiumExpiry}
                                            </p>
                                        )}
                                    </div>
                                </div>

                                <div style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
                                    {user.isPremium ? (
                                        <button onClick={() => handleRevokePremium(user)} className="btn btn-danger btn-md">
                                            {t('admin.premium_revoke')}
                                        </button>
                                    ) : (
                                        <button onClick={() => { setSelectedUser(user); setShowConfirmModal(true); }} className="btn btn-premium btn-md">
                                            <Crown style={{ width: '14px', height: '14px' }} /> {t('admin.premium_grant')}
                                        </button>
                                    )}
                                </div>
                            </div>
                        ))
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
                    { icon: Crown, label: 'Premium', value: users.filter(u => u.isPremium && u.premiumType === 'premium').length, color: 'var(--color-premium-gold-light)' },
                    { icon: Star, label: t('admin.premium_pro'), value: users.filter(u => u.isPremium && u.premiumType === 'pro').length, color: 'var(--color-accent-blue)' },
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
                                <p style={{ color: 'var(--color-text-muted)', fontSize: 'var(--font-size-sm)' }}>{selectedUser.name}</p>
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
                            <label className="input-label">Muddat (kun)</label>
                            <select
                                value={premiumDays}
                                onChange={(e) => setPremiumDays(Number(e.target.value))}
                                className="select select-lg"
                            >
                                <option value={7}>7 kun</option>
                                <option value={30}>1 oy (30 kun)</option>
                                <option value={90}>3 oy (90 kun)</option>
                                <option value={180}>6 oy (180 kun)</option>
                                <option value={365}>1 yil (365 kun)</option>
                            </select>
                        </div>

                        {/* Actions */}
                        <div style={{ display: 'flex', gap: '12px', marginTop: '8px' }}>
                            <button
                                onClick={() => { setShowConfirmModal(false); setSelectedUser(null); }}
                                className="btn btn-secondary btn-md"
                                style={{ flex: 1 }}
                            >
                                {t('admin.cancel')}
                            </button>
                            <button
                                onClick={handleGrantPremium}
                                className="btn btn-premium btn-md"
                                style={{ flex: 1 }}
                            >
                                <Check style={{ width: '16px', height: '16px' }} /> {t('admin.confirm')}
                            </button>
                        </div>
                    </div>
                </div>
            )}
        </div>
    );
};

export default AdminPremium;
