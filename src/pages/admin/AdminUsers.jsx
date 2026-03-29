import { useState } from 'react';
import { Search, Crown, Ban, Eye, UserCheck, Gem, Wallet } from 'lucide-react';
import { getDisplayInitial } from '../../lib/displayUtils';
import { useLanguage } from '../../context/LanguageContext';
import { useAdminUsers, useAdminGrantSubscription } from '../../hooks/useAdmin';

const AdminUsers = () => {
    const { t } = useLanguage();
    const [selectedRole, setSelectedRole] = useState('all');
    const [searchQuery, setSearchQuery] = useState('');

    const { data: usersData, isLoading } = useAdminUsers();
    const grantSubscription = useAdminGrantSubscription();
    const rawUsers = Array.isArray(usersData) ? usersData : (usersData?.results ?? []);
    const users = rawUsers.map(u => ({
        id: u.id,
        name: u.display_name ?? u.full_name ?? u.username ?? u.email ?? '-',
        email: u.email ?? '-',
        role: u.seller_profile ? 'seller' : 'buyer',
        isPremium: u.is_premium ?? false,
        isPro: u.is_pro ?? false,
        plan: u.plan ?? 'free',
        status: u.is_active === false ? 'blocked' : 'active',
        sales: u.total_sales ?? u.seller_profile?.total_sales ?? 0,
        purchases: u.purchases_count ?? 0,
        balance: Number(u.balance ?? 0),
        joined: (u.created_at ?? u.date_joined) ? (u.created_at ?? u.date_joined).slice(0, 10) : '-',
    }));

    const roleFilters = [
        { value: 'all', label: t('admin.filter_all') },
        { value: 'seller', label: t('admin.filter_sellers') },
        { value: 'buyer', label: t('admin.filter_buyers') },
        { value: 'premium', label: t('admin.filter_premium') },
        { value: 'blocked', label: t('admin.filter_blocked') },
    ];

    const getStatusBadge = (status) => {
        const config = {
            active: { bg: 'var(--color-success-bg)', color: 'var(--color-accent-green)', label: t('admin.status_active') },
            blocked: { bg: 'var(--color-error-bg)', color: 'var(--color-accent-red)', label: t('admin.status_blocked') },
        };
        const s = config[status] || config.active;
        return <span className="badge" style={{ backgroundColor: s.bg, color: s.color }}>{s.label}</span>;
    };

    const getRoleBadge = (role, isPremium, isPro) => {
        if (isPro) {
            return (
                <span className="badge badge-pro" style={{ display: 'inline-flex', alignItems: 'center', gap: '4px', fontSize: '12px' }}>
                    <Gem style={{ width: '12px', height: '12px' }} />
                    Pro {role === 'seller' ? t('admin.role_seller') : t('admin.role_buyer')}
                </span>
            );
        }
        if (isPremium) {
            return (
                <span className="badge badge-premium" style={{ display: 'inline-flex', alignItems: 'center', gap: '4px', fontSize: '12px' }}>
                    <Crown style={{ width: '12px', height: '12px' }} />
                    Premium {role === 'seller' ? t('admin.role_seller') : t('admin.role_buyer')}
                </span>
            );
        }
        return (
            <span className="badge" style={{
                backgroundColor: role === 'seller' ? 'var(--color-info-bg)' : 'var(--color-bg-tertiary)',
                color: role === 'seller' ? 'var(--color-accent-blue)' : 'var(--color-text-muted)',
            }}>
                {role === 'seller' ? t('admin.role_seller') : t('admin.role_buyer')}
            </span>
        );
    };

    const handlePlanChange = (userId, planSlug) => {
        grantSubscription.mutate({ userId, planSlug, months: 1 });
    };

    if (isLoading) {
        return <div style={{ padding: '40px', textAlign: 'center', color: 'var(--color-text-muted)' }}>Yuklanmoqda...</div>;
    }

    const filteredUsers = users.filter(user => {
        let matchesRole = selectedRole === 'all';
        if (selectedRole === 'seller') matchesRole = user.role === 'seller';
        if (selectedRole === 'buyer') matchesRole = user.role === 'buyer';
        if (selectedRole === 'premium') matchesRole = user.isPremium;
        if (selectedRole === 'blocked') matchesRole = user.status === 'blocked';
        const matchesSearch = user.name.toLowerCase().includes(searchQuery.toLowerCase()) ||
            user.email.toLowerCase().includes(searchQuery.toLowerCase());
        return matchesRole && matchesSearch;
    });

    return (
        <div style={{ display: 'flex', flexDirection: 'column', gap: '24px' }}>
            {/* Header */}
            <div className="flex flex-col sm:flex-row sm:items-center justify-between" style={{ gap: '16px' }}>
                <div>
                    <h1 style={{ fontSize: 'var(--font-size-2xl)', fontWeight: 'var(--font-weight-bold)', color: 'var(--color-text-primary)', marginBottom: '4px' }}>
                        {t('admin.users_title')}
                    </h1>
                    <p style={{ color: 'var(--color-text-muted)', fontSize: 'var(--font-size-sm)' }}>
                        {t('admin.users_subtitle')}
                    </p>
                </div>
                <div style={{ display: 'flex', alignItems: 'center', gap: '8px', flexWrap: 'wrap' }}>
                    <span className="badge" style={{ backgroundColor: 'var(--color-info-bg)', color: 'var(--color-accent-blue)', padding: '6px 12px' }}>
                        {users.filter(u => u.role === 'seller').length} {t('admin.count_sellers')}
                    </span>
                    <span className="badge" style={{ backgroundColor: 'var(--color-warning-bg)', color: 'var(--color-premium-gold-light)', padding: '6px 12px' }}>
                        {users.filter(u => u.isPremium).length} {t('admin.count_premium')}
                    </span>
                    <span className="badge" style={{ backgroundColor: 'var(--color-success-bg)', color: 'var(--color-accent-green)', padding: '6px 12px', display: 'flex', alignItems: 'center', gap: '4px' }}>
                        <Wallet style={{ width: '12px', height: '12px' }} />
                        {users.reduce((sum, u) => sum + u.balance, 0).toLocaleString('uz-UZ')} UZS
                    </span>
                </div>
            </div>

            {/* Filters */}
            <div className="flex flex-col lg:flex-row" style={{ gap: '12px' }}>
                <div style={{ position: 'relative', flex: 1 }}>
                    <Search style={{ position: 'absolute', left: '12px', top: '50%', transform: 'translateY(-50%)', width: '16px', height: '16px', color: 'var(--color-text-muted)' }} />
                    <input
                        type="text"
                        value={searchQuery}
                        onChange={(e) => setSearchQuery(e.target.value)}
                        placeholder={t('admin.users_search_placeholder')}
                        className="input input-lg"
                        style={{ paddingLeft: '36px' }}
                    />
                </div>
                <div style={{ display: 'flex', gap: '8px', overflowX: 'auto' }}>
                    {roleFilters.map((filter) => (
                        <button
                            key={filter.value}
                            onClick={() => setSelectedRole(filter.value)}
                            className={`btn ${selectedRole === filter.value ? 'btn-primary' : 'btn-secondary'} btn-md`}
                            style={{ whiteSpace: 'nowrap' }}
                        >
                            {filter.label}
                        </button>
                    ))}
                </div>
            </div>

            {/* Table */}
            <div style={{
                backgroundColor: 'var(--color-bg-secondary)',
                borderRadius: 'var(--radius-xl)',
                border: '1px solid var(--color-border-default)',
                overflow: 'hidden',
            }}>
                <div style={{ overflowX: 'auto' }}>
                    <table className="gh-table">
                        <thead>
                            <tr>
                                <th>{t('admin.table_user')}</th>
                                <th>{t('admin.table_email')}</th>
                                <th>{t('admin.table_role')}</th>
                                <th>{t('admin.table_activity')}</th>
                                <th>
                                    <span style={{ display: 'flex', alignItems: 'center', gap: '4px' }}>
                                        <Wallet style={{ width: '13px', height: '13px' }} />
                                        Mablag'
                                    </span>
                                </th>
                                <th>{t('admin.table_status')}</th>
                                <th>{t('admin.table_joined')}</th>
                                <th>{t('admin.table_actions')}</th>
                            </tr>
                        </thead>
                        <tbody>
                            {filteredUsers.map((user) => (
                                <tr key={user.id}>
                                    <td>
                                        <div style={{ display: 'flex', alignItems: 'center', gap: '12px' }}>
                                            <div style={{
                                                width: '36px',
                                                height: '36px',
                                                background: 'linear-gradient(135deg, var(--color-accent-blue), var(--color-accent-blue-hover))',
                                                borderRadius: 'var(--radius-full)',
                                                display: 'flex',
                                                alignItems: 'center',
                                                justifyContent: 'center',
                                                color: '#ffffff',
                                                fontWeight: 'var(--font-weight-bold)',
                                                fontSize: 'var(--font-size-sm)',
                                                flexShrink: 0,
                                            }}>
                                                {getDisplayInitial(user.name, 'U')}
                                            </div>
                                            <span style={{ fontWeight: 'var(--font-weight-medium)', color: 'var(--color-text-primary)', fontSize: 'var(--font-size-sm)' }}>
                                                {user.name}
                                            </span>
                                        </div>
                                    </td>
                                    <td style={{ color: 'var(--color-text-secondary)', fontSize: 'var(--font-size-sm)' }}>{user.email}</td>
                                    <td>{getRoleBadge(user.role, user.isPremium, user.isPro)}</td>
                                    <td style={{ color: 'var(--color-text-secondary)', fontSize: 'var(--font-size-sm)' }}>
                                        {user.role === 'seller' ? `${user.sales} ta sotuvlar` : `${user.purchases} ta xaridlar`}
                                    </td>
                                    <td>
                                        <span style={{
                                            display: 'inline-flex',
                                            alignItems: 'center',
                                            gap: '4px',
                                            fontWeight: user.balance > 0 ? '600' : '400',
                                            color: user.balance > 0 ? 'var(--color-accent-blue)' : 'var(--color-text-muted)',
                                            fontSize: 'var(--font-size-sm)',
                                        }}>
                                            {user.balance.toLocaleString('uz-UZ')}
                                            <span style={{ fontSize: '10px', opacity: 0.7 }}>UZS</span>
                                        </span>
                                    </td>
                                    <td>{getStatusBadge(user.status)}</td>
                                    <td style={{ color: 'var(--color-text-muted)', fontSize: 'var(--font-size-sm)' }}>{user.joined}</td>
                                    <td>
                                        <div style={{ display: 'flex', alignItems: 'center', gap: '4px' }}>
                                            <select
                                                value={user.plan}
                                                onChange={(e) => handlePlanChange(user.id, e.target.value)}
                                                disabled={grantSubscription.isPending}
                                                className="input input-sm"
                                                style={{
                                                    width: '90px', fontSize: '11px', height: '28px', padding: '0 6px',
                                                    cursor: 'pointer',
                                                    borderColor: user.plan === 'pro' ? 'var(--color-pro-purple)' : user.plan === 'premium' ? 'var(--color-premium-gold-light)' : 'var(--color-border-default)',
                                                }}
                                            >
                                                <option value="free">Free</option>
                                                <option value="premium">Premium</option>
                                                <option value="pro">Pro</option>
                                            </select>
                                            <button className="btn btn-ghost btn-sm" style={{ padding: '6px' }} title="Ko'rish" aria-label="View">
                                                <Eye style={{ width: '14px', height: '14px' }} />
                                            </button>
                                            {user.status === 'active' ? (
                                                <button className="btn btn-ghost btn-sm" style={{ padding: '6px', color: 'var(--color-accent-red)' }} title="Bloklash" aria-label="Block">
                                                    <Ban style={{ width: '14px', height: '14px' }} />
                                                </button>
                                            ) : (
                                                <button className="btn btn-ghost btn-sm" style={{ padding: '6px', color: 'var(--color-accent-green)' }} title="Blokdan chiqarish" aria-label="Unblock">
                                                    <UserCheck style={{ width: '14px', height: '14px' }} />
                                                </button>
                                            )}
                                        </div>
                                    </td>
                                </tr>
                            ))}
                        </tbody>
                    </table>
                </div>

                {/* Pagination */}
                <div style={{
                    display: 'flex',
                    alignItems: 'center',
                    justifyContent: 'space-between',
                    padding: 'var(--space-4)',
                    borderTop: '1px solid var(--color-border-muted)',
                }}>
                    <div style={{ fontSize: 'var(--font-size-sm)', color: 'var(--color-text-muted)' }}>
                        {filteredUsers.length} ta foydalanuvchi topildi
                    </div>
                    <div style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
                        <button className="btn btn-secondary btn-sm">Oldingi</button>
                        <button className="btn btn-primary btn-sm">1</button>
                        <button className="btn btn-secondary btn-sm">Keyingi</button>
                    </div>
                </div>
            </div>
        </div>
    );
};

export default AdminUsers;
