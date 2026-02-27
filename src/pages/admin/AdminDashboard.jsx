import {
    TrendingUp, TrendingDown, Users, Package, DollarSign,
    AlertTriangle, Star, Clock, Eye, Check, X
} from 'lucide-react';
import { formatPrice } from '../../data/mockData';
import { useAdminDashboard, useAdminFraudStats, useAdminPendingListings, useAdminReports } from '../../hooks/useAdmin';

const defaultStats = [
    { label: 'Jami akkauntlar', value: '0', change: '-', trend: 'up', icon: Package, color: 'var(--color-accent-blue)' },
    { label: 'Bugun sotildi', value: '0', change: '-', trend: 'up', icon: TrendingUp, color: 'var(--color-accent-green)' },
    { label: 'Kutilgan moderatsiya', value: '0', change: '-', trend: 'down', icon: Clock, color: 'var(--color-accent-orange)' },
    { label: 'Shikoyatlar', value: '0', change: '-', trend: 'up', icon: AlertTriangle, color: 'var(--color-accent-red)' },
];

const fallbackAccounts = [
    { id: 1, title: 'PUBG Mobile Conqueror', game: 'PUBG Mobile', price: 2500000, status: 'pending', seller: 'ProGamer_UZ' },
    { id: 2, title: 'Steam 150+ Games', game: 'Steam', price: 3800000, status: 'active', seller: 'GameStore_TJ' },
];
const fallbackReports = [
    { id: 1, type: 'Scam', account: 'PUBG Account #123', reporter: 'user123', status: 'pending' },
];

const AdminDashboard = () => {
    const { data: dashboardData, isLoading: _dashboardLoading } = useAdminDashboard();
    const { data: fraudData } = useAdminFraudStats();
    const { data: pendingListings = [], isLoading: _listingsLoading } = useAdminPendingListings();
    const { data: reportsList = [], isLoading: _reportsLoading } = useAdminReports();

    const apiStats = dashboardData && typeof dashboardData === 'object' ? {
        users: dashboardData.users,
        listings: dashboardData.listings,
        transactions: dashboardData.transactions,
        escrow: dashboardData.escrow,
        reports: dashboardData.reports,
    } : null;

    const stats = apiStats ? [
        { ...defaultStats[0], value: String(apiStats.listings?.total ?? 0), change: apiStats.users?.new_this_week ? `+${apiStats.users.new_this_week}` : '-' },
        { ...defaultStats[1], value: String(apiStats.listings?.sold ?? 0), change: apiStats.transactions?.month_volume ? '+' : '-' },
        { ...defaultStats[2], value: String(apiStats.listings?.pending ?? 0) },
        { ...defaultStats[3], value: String(apiStats.reports?.pending ?? 0), change: apiStats.reports?.total ? `/${apiStats.reports.total}` : '-' },
    ] : defaultStats;

    const recentAccounts = Array.isArray(pendingListings) && pendingListings.length > 0
        ? pendingListings.slice(0, 5).map((l) => ({
            id: l.id,
            title: l.title,
            game: l.game?.name ?? '-',
            price: parseFloat(l.price) || 0,
            status: l.status,
            seller: l.seller?.email ?? l.seller?.display_name ?? '-',
        }))
        : fallbackAccounts;

    const recentReports = Array.isArray(reportsList) && reportsList.length > 0
        ? reportsList.slice(0, 5).map((r) => ({
            id: r.id,
            type: r.reason || 'Report',
            account: (r.reported_listing?.title ?? (r.description || '').slice(0, 30)) || '-',
            reporter: r.reporter?.email ?? '-',
            status: r.status,
        }))
        : fallbackReports;

    const getStatusBadge = (status) => {
        const config = {
            active: { bg: 'var(--color-success-bg)', color: 'var(--color-accent-green)', label: 'Faol' },
            pending: { bg: 'var(--color-warning-bg)', color: 'var(--color-accent-orange)', label: 'Kutilmoqda' },
            blocked: { bg: 'var(--color-error-bg)', color: 'var(--color-accent-red)', label: 'Bloklangan' },
            investigating: { bg: 'var(--color-info-bg)', color: 'var(--color-accent-blue)', label: 'Tekshirilmoqda' },
            resolved: { bg: 'var(--color-bg-tertiary)', color: 'var(--color-text-muted)', label: 'Hal qilindi' },
        };
        const s = config[status] || config.pending;
        return (
            <span
                className="badge"
                style={{ backgroundColor: s.bg, color: s.color }}
            >
                {s.label}
            </span>
        );
    };

    return (
        <div style={{ display: 'flex', flexDirection: 'column', gap: '32px' }}>
            <div>
                <h1 style={{
                    fontSize: 'var(--font-size-2xl)',
                    fontWeight: 'var(--font-weight-bold)',
                    color: 'var(--color-text-primary)',
                    marginBottom: '4px',
                }}>
                    Dashboard
                </h1>
                <p style={{ color: 'var(--color-text-muted)', fontSize: 'var(--font-size-base)' }}>
                    Xush kelibsiz, Admin!
                </p>
            </div>

            {/* Fraud & Dispute stats */}
            {fraudData && (
                <div style={{
                    padding: '16px',
                    borderRadius: 'var(--radius-lg)',
                    border: '1px solid var(--color-border-default)',
                    backgroundColor: 'var(--color-warning-bg)',
                    display: 'flex',
                    flexWrap: 'wrap',
                    gap: '24px',
                    alignItems: 'center',
                }}>
                    <span style={{ fontWeight: 600, color: 'var(--color-text-primary)' }}>Fraud & Disputes</span>
                    <span>Shubhali: <strong>{fraudData.suspicious_activities_unresolved ?? 0}</strong></span>
                    <span>Hal qilingan (hafta): <strong>{fraudData.suspicious_resolved_this_week ?? 0}</strong></span>
                    <span>Escrow nizo: <strong>{fraudData.escrow_disputed ?? 0}</strong></span>
                    <span>Shikoyatlar kutilmoqda: <strong>{fraudData.reports_pending ?? 0}</strong></span>
                </div>
            )}

            {/* Stats Grid */}
            <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4" style={{ gap: '16px' }}>
                {stats.map((stat, index) => (
                    <div
                        key={index}
                        className="stat-card admin-card-hover"
                    >
                        <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: '16px' }}>
                            <div
                                style={{
                                    width: '44px',
                                    height: '44px',
                                    borderRadius: 'var(--radius-lg)',
                                    backgroundColor: stat.color,
                                    display: 'flex',
                                    alignItems: 'center',
                                    justifyContent: 'center',
                                }}
                            >
                                <stat.icon style={{ width: '22px', height: '22px', color: '#ffffff' }} />
                            </div>
                            <div
                                className="stat-card-trend"
                                style={{ color: stat.trend === 'up' ? 'var(--color-accent-green)' : 'var(--color-accent-red)' }}
                            >
                                {stat.trend === 'up' ? (
                                    <TrendingUp style={{ width: '14px', height: '14px' }} />
                                ) : (
                                    <TrendingDown style={{ width: '14px', height: '14px' }} />
                                )}
                                {stat.change}
                            </div>
                        </div>
                        <div className="stat-card-value">{stat.value}</div>
                        <div className="stat-card-label">{stat.label}</div>
                    </div>
                ))}
            </div>

            <div className="grid grid-cols-1 lg:grid-cols-2" style={{ gap: '24px' }}>
                {/* Recent Accounts */}
                <div
                    style={{
                        backgroundColor: 'var(--color-bg-secondary)',
                        borderRadius: 'var(--radius-xl)',
                        border: '1px solid var(--color-border-default)',
                        overflow: 'hidden',
                    }}
                >
                    <div className="card-header">
                        <h2 style={{
                            fontSize: 'var(--font-size-lg)',
                            fontWeight: 'var(--font-weight-semibold)',
                            color: 'var(--color-text-primary)',
                        }}>
                            So&apos;nggi akkauntlar
                        </h2>
                    </div>
                    <div style={{ overflowX: 'auto' }}>
                        <table className="gh-table">
                            <thead>
                                <tr>
                                    <th>Akkaunt</th>
                                    <th>Narx</th>
                                    <th>Status</th>
                                    <th>Amallar</th>
                                </tr>
                            </thead>
                            <tbody>
                                {recentAccounts.map((account) => (
                                    <tr key={account.id}>
                                        <td>
                                            <div style={{
                                                fontWeight: 'var(--font-weight-medium)',
                                                color: 'var(--color-text-primary)',
                                                fontSize: 'var(--font-size-base)',
                                            }}>
                                                {account.title}
                                            </div>
                                            <div style={{
                                                fontSize: 'var(--font-size-xs)',
                                                color: 'var(--color-text-muted)',
                                                marginTop: '2px',
                                            }}>
                                                {account.seller}
                                            </div>
                                        </td>
                                        <td style={{ color: 'var(--color-text-accent)', fontWeight: 'var(--font-weight-medium)' }}>
                                            {formatPrice(account.price)}
                                        </td>
                                        <td>{getStatusBadge(account.status)}</td>
                                        <td>
                                            <div style={{ display: 'flex', alignItems: 'center', gap: '4px' }}>
                                                <button
                                                    className="btn btn-ghost btn-sm"
                                                    style={{ padding: '6px' }}
                                                    aria-label="View"
                                                >
                                                    <Eye style={{ width: '14px', height: '14px' }} />
                                                </button>
                                                {account.status === 'pending' && (
                                                    <>
                                                        <button
                                                            className="btn btn-ghost btn-sm"
                                                            style={{ padding: '6px', color: 'var(--color-accent-green)' }}
                                                            aria-label="Approve"
                                                        >
                                                            <Check style={{ width: '14px', height: '14px' }} />
                                                        </button>
                                                        <button
                                                            className="btn btn-ghost btn-sm"
                                                            style={{ padding: '6px', color: 'var(--color-accent-red)' }}
                                                            aria-label="Reject"
                                                        >
                                                            <X style={{ width: '14px', height: '14px' }} />
                                                        </button>
                                                    </>
                                                )}
                                            </div>
                                        </td>
                                    </tr>
                                ))}
                            </tbody>
                        </table>
                    </div>
                </div>

                {/* Recent Reports */}
                <div
                    style={{
                        backgroundColor: 'var(--color-bg-secondary)',
                        borderRadius: 'var(--radius-xl)',
                        border: '1px solid var(--color-border-default)',
                        overflow: 'hidden',
                    }}
                >
                    <div className="card-header">
                        <h2 style={{
                            fontSize: 'var(--font-size-lg)',
                            fontWeight: 'var(--font-weight-semibold)',
                            color: 'var(--color-text-primary)',
                        }}>
                            So&apos;nggi shikoyatlar
                        </h2>
                    </div>
                    <div style={{ padding: 'var(--space-4)', display: 'flex', flexDirection: 'column', gap: '12px' }}>
                        {recentReports.map((report) => (
                            <div
                                key={report.id}
                                className="admin-card-hover"
                                style={{
                                    display: 'flex',
                                    alignItems: 'center',
                                    justifyContent: 'space-between',
                                    padding: 'var(--space-4)',
                                    backgroundColor: 'var(--color-bg-primary)',
                                    borderRadius: 'var(--radius-lg)',
                                    border: '1px solid var(--color-border-muted)',
                                }}
                            >
                                <div>
                                    <div style={{ display: 'flex', alignItems: 'center', gap: '8px', marginBottom: '6px' }}>
                                        <AlertTriangle style={{ width: '14px', height: '14px', color: 'var(--color-accent-red)' }} />
                                        <span style={{
                                            fontWeight: 'var(--font-weight-medium)',
                                            color: 'var(--color-text-primary)',
                                            fontSize: 'var(--font-size-base)',
                                        }}>
                                            {report.type}
                                        </span>
                                    </div>
                                    <div style={{ fontSize: 'var(--font-size-xs)', color: 'var(--color-text-muted)', marginLeft: '22px' }}>
                                        {report.account}
                                    </div>
                                    <div style={{ fontSize: 'var(--font-size-xs)', color: 'var(--color-text-muted)', marginLeft: '22px', marginTop: '2px' }}>
                                        Reporter: {report.reporter}
                                    </div>
                                </div>
                                {getStatusBadge(report.status)}
                            </div>
                        ))}
                    </div>
                </div>
            </div>

            {/* Quick Stats */}
            <div className="grid grid-cols-1 sm:grid-cols-3" style={{ gap: '16px' }}>
                {[
                    {
                        icon: Users,
                        value: '5,234',
                        label: 'Jami foydalanuvchilar',
                        sub: 'Bugun +45 ta yangi',
                        color: 'var(--color-accent-blue)',
                    },
                    {
                        icon: Star,
                        value: '342',
                        label: 'Premium obunalar',
                        sub: `Oylik: ${formatPrice(33858000)}`,
                        color: 'var(--color-premium-gold-light)',
                    },
                    {
                        icon: DollarSign,
                        value: formatPrice(156000000),
                        label: 'Oylik daromad',
                        sub: `Komissiyadan: ${formatPrice(15600000)}`,
                        color: 'var(--color-accent-green)',
                    },
                ].map((card, idx) => (
                    <div
                        key={idx}
                        className="stat-card"
                    >
                        <div style={{ display: 'flex', alignItems: 'center', gap: '16px', marginBottom: '12px' }}>
                            <card.icon style={{ width: '28px', height: '28px', color: card.color, flexShrink: 0 }} />
                            <div>
                                <div className="stat-card-value">{card.value}</div>
                                <div className="stat-card-label">{card.label}</div>
                            </div>
                        </div>
                        <div style={{ fontSize: 'var(--font-size-sm)', fontWeight: 'var(--font-weight-medium)', color: card.color }}>
                            {card.sub}
                        </div>
                    </div>
                ))}
            </div>
        </div>
    );
};

export default AdminDashboard;
