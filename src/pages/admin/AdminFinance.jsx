import { DollarSign, TrendingUp, TrendingDown, CreditCard, Loader2 } from 'lucide-react';
import { formatPrice } from '../../data/mockData';
import { useAdminDashboard, useAdminTransactions } from '../../hooks/useAdmin';

const TYPE_LABELS = {
    deposit: { label: "To'ldirish", color: 'var(--color-accent-green)' },
    withdrawal: { label: "Pul yechish", color: 'var(--color-accent-orange)' },
    purchase: { label: 'Sotuv', color: 'var(--color-accent-green)' },
    refund: { label: 'Qaytarish', color: 'var(--color-accent-blue)' },
    commission: { label: 'Komissiya', color: 'var(--color-accent-purple)' },
    subscription: { label: 'Obuna', color: 'var(--color-accent-blue)' },
};

const STATUS_LABELS = {
    completed: 'Bajarildi',
    pending: 'Kutilmoqda',
    processing: 'Jarayonda',
    failed: 'Muvaffaqiyatsiz',
    cancelled: 'Bekor qilindi',
};

const AdminFinance = () => {
    const { data: dashboard, isLoading: dashboardLoading, isError: dashboardError } = useAdminDashboard();
    const { data: transactionsList, isLoading: transactionsLoading, isError: transactionsError } = useAdminTransactions();

    const transactions = Array.isArray(transactionsList) ? transactionsList : (transactionsList?.results ?? []);

    const tx = dashboard?.transactions ?? {};
    const escrow = dashboard?.escrow ?? {};
    const totalVolume = Number(tx.total_volume ?? 0);
    const monthVolume = Number(tx.month_volume ?? 0);
    const totalCommission = Number(escrow.total_commission ?? 0);

    const stats = [
        { label: 'Umumiy daromad', value: formatPrice(totalVolume), icon: DollarSign, color: 'var(--color-accent-green)' },
        { label: "Bu oydagi savdo", value: formatPrice(monthVolume), icon: TrendingUp, color: 'var(--color-accent-blue)' },
        { label: 'Komissiya daromadi', value: formatPrice(totalCommission), icon: CreditCard, color: 'var(--color-accent-purple)' },
        { label: "To'lovlar (tranzaksiyalar)", value: String(transactions.length), icon: TrendingDown, color: 'var(--color-accent-orange)' },
    ];

    return (
        <div>
            <h1 style={{
                fontSize: 'var(--font-size-2xl)',
                fontWeight: 'var(--font-weight-bold)',
                color: 'var(--color-text-primary)',
                marginBottom: '24px',
            }}>
                Moliya
            </h1>

            {dashboardError && (
                <p style={{ color: 'var(--color-error)', marginBottom: '16px' }}>
                    Statistika yuklanmadi. Sahifani yangilang.
                </p>
            )}

            {/* Stats Cards */}
            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4" style={{ gap: '16px', marginBottom: '24px' }}>
                {dashboardLoading ? (
                    <div className="col-span-full flex items-center justify-center" style={{ padding: '40px' }}>
                        <Loader2 className="animate-spin" style={{ width: '32px', height: '32px', color: 'var(--color-accent-blue)' }} />
                    </div>
                ) : (
                    stats.map((stat, i) => (
                        <div key={i} style={{
                            padding: '20px',
                            borderRadius: 'var(--radius-xl)',
                            backgroundColor: 'var(--color-bg-secondary)',
                            border: '1px solid var(--color-border-default)',
                        }}>
                            <div className="flex items-center justify-between" style={{ marginBottom: '12px' }}>
                                <div style={{
                                    width: '40px', height: '40px',
                                    borderRadius: 'var(--radius-lg)',
                                    backgroundColor: stat.color + '1a',
                                    display: 'flex', alignItems: 'center', justifyContent: 'center',
                                }}>
                                    <stat.icon style={{ width: '20px', height: '20px', color: stat.color }} />
                                </div>
                            </div>
                            <p style={{ fontSize: 'var(--font-size-sm)', color: 'var(--color-text-muted)', marginBottom: '4px' }}>{stat.label}</p>
                            <p style={{ fontSize: 'var(--font-size-xl)', fontWeight: 'var(--font-weight-bold)', color: 'var(--color-text-primary)' }}>{stat.value}</p>
                        </div>
                    ))
                )}
            </div>

            {/* Transactions Table */}
            <div style={{
                borderRadius: 'var(--radius-xl)',
                backgroundColor: 'var(--color-bg-secondary)',
                border: '1px solid var(--color-border-default)',
                overflow: 'hidden',
            }}>
                <div style={{
                    padding: '16px 20px',
                    borderBottom: '1px solid var(--color-border-muted)',
                }}>
                    <h2 style={{
                        fontWeight: 'var(--font-weight-semibold)',
                        color: 'var(--color-text-primary)',
                    }}>
                        So'nggi tranzaksiyalar
                    </h2>
                </div>
                <div style={{ overflowX: 'auto' }}>
                    {transactionsError && (
                        <p style={{ padding: '20px', color: 'var(--color-error)' }}>Tranzaksiyalar yuklanmadi.</p>
                    )}
                    {transactionsLoading ? (
                        <div style={{ padding: '40px', textAlign: 'center' }}>
                            <Loader2 className="animate-spin" style={{ width: '28px', height: '28px', margin: '0 auto', color: 'var(--color-accent-blue)' }} />
                        </div>
                    ) : (
                        <table style={{ width: '100%', borderCollapse: 'collapse' }}>
                            <thead>
                                <tr style={{ borderBottom: '1px solid var(--color-border-muted)' }}>
                                    {['Turi', 'Foydalanuvchi', 'Summa', 'Sana', 'Holati'].map(header => (
                                        <th key={header} style={{
                                            padding: '12px 16px',
                                            textAlign: 'left',
                                            fontSize: 'var(--font-size-xs)',
                                            fontWeight: 'var(--font-weight-medium)',
                                            color: 'var(--color-text-muted)',
                                            textTransform: 'uppercase',
                                        }}>
                                            {header}
                                        </th>
                                    ))}
                                </tr>
                            </thead>
                            <tbody>
                                {transactions.length === 0 ? (
                                    <tr>
                                        <td colSpan={5} style={{ padding: '24px', textAlign: 'center', color: 'var(--color-text-muted)' }}>
                                            Tranzaksiyalar yo'q
                                        </td>
                                    </tr>
                                ) : (
                                    transactions.map(tx => {
                                        const typeInfo = TYPE_LABELS[tx.type] || { label: tx.type || '—', color: 'var(--color-text-muted)' };
                                        const amount = typeof tx.amount === 'number' ? tx.amount : parseFloat(tx.amount) || 0;
                                        const dateStr = tx.created_at ? (tx.created_at.slice ? tx.created_at.slice(0, 10) : tx.created_at) : '—';
                                        const statusLabel = STATUS_LABELS[tx.status] ?? tx.status ?? '—';
                                        return (
                                            <tr key={tx.id} style={{ borderBottom: '1px solid var(--color-border-muted)' }}>
                                                <td style={{ padding: '12px 16px' }}>
                                                    <span style={{
                                                        padding: '2px 10px',
                                                        borderRadius: 'var(--radius-full)',
                                                        fontSize: 'var(--font-size-xs)',
                                                        fontWeight: 'var(--font-weight-medium)',
                                                        backgroundColor: typeInfo.color + '1a',
                                                        color: typeInfo.color,
                                                    }}>
                                                        {typeInfo.label}
                                                    </span>
                                                </td>
                                                <td style={{ padding: '12px 16px', fontWeight: 'var(--font-weight-medium)', color: 'var(--color-text-primary)' }}>
                                                    {tx.user_name ?? tx.user_email ?? tx.user ?? '—'}
                                                </td>
                                                <td style={{ padding: '12px 16px', color: 'var(--color-text-primary)' }}>
                                                    {formatPrice(amount)}
                                                </td>
                                                <td style={{ padding: '12px 16px', color: 'var(--color-text-muted)', fontSize: 'var(--font-size-sm)' }}>
                                                    {dateStr}
                                                </td>
                                                <td style={{ padding: '12px 16px' }}>
                                                    <span style={{
                                                        padding: '2px 10px',
                                                        borderRadius: 'var(--radius-full)',
                                                        fontSize: 'var(--font-size-xs)',
                                                        fontWeight: 'var(--font-weight-medium)',
                                                        backgroundColor: tx.status === 'completed' ? 'var(--color-success-bg)' : 'var(--color-warning-bg)',
                                                        color: tx.status === 'completed' ? 'var(--color-success-text)' : 'var(--color-warning-text)',
                                                    }}>
                                                        {statusLabel}
                                                    </span>
                                                </td>
                                            </tr>
                                        );
                                    })
                                )}
                            </tbody>
                        </table>
                    )}
                </div>
            </div>
        </div>
    );
};

export default AdminFinance;
