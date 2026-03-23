import { useState } from 'react';
import { DollarSign, TrendingUp, TrendingDown, CreditCard, Loader2, CheckCircle, XCircle, ArrowDownCircle } from 'lucide-react';
import { formatPrice } from '../../data/mockData';
import { useAdminDashboard, useAdminTransactions, useAdminWithdrawals, useAdminApproveWithdrawal, useAdminRejectWithdrawal } from '../../hooks/useAdmin';

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
    rejected: 'Rad etildi',
};

const AdminFinance = () => {
    const [activeTab, setActiveTab] = useState('transactions');
    const [rejectingId, setRejectingId] = useState(null);
    const [rejectReason, setRejectReason] = useState('');

    const { data: dashboard, isLoading: dashboardLoading, isError: dashboardError } = useAdminDashboard();
    const { data: transactionsList, isLoading: transactionsLoading, isError: transactionsError } = useAdminTransactions();
    const { data: withdrawalsData, isLoading: withdrawalsLoading } = useAdminWithdrawals();
    const { mutate: approveWithdrawal, isPending: approving } = useAdminApproveWithdrawal();
    const { mutate: rejectWithdrawal, isPending: rejecting } = useAdminRejectWithdrawal();

    const transactions = Array.isArray(transactionsList) ? transactionsList : (transactionsList?.results ?? []);
    const withdrawals = Array.isArray(withdrawalsData) ? withdrawalsData : (withdrawalsData?.results ?? []);

    const pendingWithdrawals = withdrawals.filter(w => w.status === 'pending' || w.status === 'processing');
    const completedWithdrawals = withdrawals.filter(w => w.status === 'completed' || w.status === 'rejected');

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

    const tabs = [
        { id: 'transactions', label: "Tranzaksiyalar" },
        { id: 'withdrawals', label: "Pul yechish so'rovlari", count: pendingWithdrawals.length },
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

            {/* Tabs */}
            <div className="tabs" style={{ marginBottom: '0' }}>
                {tabs.map((tab) => (
                    <button
                        key={tab.id}
                        className={`tab ${activeTab === tab.id ? 'tab-active' : ''}`}
                        onClick={() => setActiveTab(tab.id)}
                    >
                        {tab.id === 'withdrawals' && <ArrowDownCircle className="w-4 h-4" />}
                        {tab.label}
                        {tab.count > 0 && (
                            <span className="badge badge-count" style={{ fontSize: '10px', padding: '0 5px', minWidth: '18px', backgroundColor: 'var(--color-error)', color: '#fff' }}>
                                {tab.count}
                            </span>
                        )}
                    </button>
                ))}
            </div>

            {/* Tab Content */}
            <div style={{
                borderRadius: '0 0 var(--radius-xl) var(--radius-xl)',
                backgroundColor: 'var(--color-bg-secondary)',
                border: '1px solid var(--color-border-default)',
                borderTop: 'none',
                overflow: 'hidden',
            }}>
                {/* Transactions Tab */}
                {activeTab === 'transactions' && (
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
                )}

                {/* Withdrawals Tab */}
                {activeTab === 'withdrawals' && (
                    <div style={{ padding: '20px' }}>
                        {withdrawalsLoading ? (
                            <div style={{ padding: '40px', textAlign: 'center' }}>
                                <Loader2 className="animate-spin" style={{ width: '28px', height: '28px', margin: '0 auto', color: 'var(--color-accent-blue)' }} />
                            </div>
                        ) : (
                            <>
                                {/* Pending Withdrawals */}
                                {pendingWithdrawals.length > 0 && (
                                    <div style={{ marginBottom: '24px' }}>
                                        <h3 style={{
                                            fontSize: 'var(--font-size-base)',
                                            fontWeight: 'var(--font-weight-semibold)',
                                            color: 'var(--color-text-primary)',
                                            marginBottom: '12px',
                                            display: 'flex', alignItems: 'center', gap: '8px',
                                        }}>
                                            <span style={{
                                                width: '8px', height: '8px', borderRadius: '50%',
                                                backgroundColor: 'var(--color-accent-orange)', display: 'inline-block',
                                            }} />
                                            Kutilayotgan so'rovlar ({pendingWithdrawals.length})
                                        </h3>
                                        <div style={{ display: 'flex', flexDirection: 'column', gap: '12px' }}>
                                            {pendingWithdrawals.map((w) => (
                                                <div key={w.id} style={{
                                                    padding: '16px',
                                                    borderRadius: 'var(--radius-lg)',
                                                    backgroundColor: 'var(--color-bg-primary)',
                                                    border: '1px solid var(--color-border-muted)',
                                                }}>
                                                    <div className="flex flex-col sm:flex-row gap-3" style={{ justifyContent: 'space-between' }}>
                                                        <div style={{ flex: 1 }}>
                                                            <div className="flex items-center gap-2" style={{ marginBottom: '8px' }}>
                                                                <span style={{ fontSize: 'var(--font-size-lg)', fontWeight: 'var(--font-weight-bold)', color: 'var(--color-text-primary)' }}>
                                                                    {formatPrice(w.amount)}
                                                                </span>
                                                                <span style={{
                                                                    padding: '2px 8px', borderRadius: 'var(--radius-full)',
                                                                    fontSize: 'var(--font-size-xs)', fontWeight: 'var(--font-weight-medium)',
                                                                    backgroundColor: 'var(--color-warning-bg)', color: 'var(--color-warning-text)',
                                                                }}>
                                                                    {STATUS_LABELS[w.status] || w.status}
                                                                </span>
                                                            </div>
                                                            <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fill, minmax(180px, 1fr))', gap: '4px', fontSize: 'var(--font-size-sm)', color: 'var(--color-text-muted)' }}>
                                                                <span>Foydalanuvchi: <strong style={{ color: 'var(--color-text-primary)' }}>{w.user_name || w.user_email || w.user || '—'}</strong></span>
                                                                <span>Karta: <strong style={{ color: 'var(--color-text-primary)' }}>{(w.card_type || '').toUpperCase()} {w.card_number || '—'}</strong></span>
                                                                <span>Karta egasi: <strong style={{ color: 'var(--color-text-primary)' }}>{w.card_holder_name || '—'}</strong></span>
                                                                <span>Sana: {w.created_at ? new Date(w.created_at).toLocaleString() : '—'}</span>
                                                            </div>
                                                        </div>
                                                        <div className="flex items-center gap-2" style={{ flexShrink: 0 }}>
                                                            {rejectingId === w.id ? (
                                                                <div className="flex items-center gap-2">
                                                                    <input
                                                                        type="text"
                                                                        className="input"
                                                                        placeholder="Rad etish sababi..."
                                                                        value={rejectReason}
                                                                        onChange={(e) => setRejectReason(e.target.value)}
                                                                        style={{ width: '200px', fontSize: 'var(--font-size-sm)' }}
                                                                    />
                                                                    <button
                                                                        className="btn btn-sm"
                                                                        disabled={rejecting}
                                                                        style={{ backgroundColor: 'var(--color-error)', color: '#fff', border: 'none' }}
                                                                        onClick={() => {
                                                                            rejectWithdrawal({ id: w.id, reason: rejectReason }, {
                                                                                onSuccess: () => { setRejectingId(null); setRejectReason(''); },
                                                                            });
                                                                        }}
                                                                    >
                                                                        {rejecting ? <Loader2 className="animate-spin w-3 h-3" /> : <XCircle className="w-3 h-3" />}
                                                                        Rad etish
                                                                    </button>
                                                                    <button
                                                                        className="btn btn-sm"
                                                                        onClick={() => { setRejectingId(null); setRejectReason(''); }}
                                                                        style={{ border: '1px solid var(--color-border-default)' }}
                                                                    >
                                                                        Bekor
                                                                    </button>
                                                                </div>
                                                            ) : (
                                                                <>
                                                                    <button
                                                                        className="btn btn-sm"
                                                                        disabled={approving}
                                                                        style={{ backgroundColor: 'var(--color-accent-green)', color: '#fff', border: 'none' }}
                                                                        onClick={() => approveWithdrawal(w.id)}
                                                                    >
                                                                        {approving ? <Loader2 className="animate-spin w-3 h-3" /> : <CheckCircle className="w-3 h-3" />}
                                                                        Tasdiqlash
                                                                    </button>
                                                                    <button
                                                                        className="btn btn-sm"
                                                                        style={{ backgroundColor: 'var(--color-error)', color: '#fff', border: 'none' }}
                                                                        onClick={() => setRejectingId(w.id)}
                                                                    >
                                                                        <XCircle className="w-3 h-3" />
                                                                        Rad etish
                                                                    </button>
                                                                </>
                                                            )}
                                                        </div>
                                                    </div>
                                                </div>
                                            ))}
                                        </div>
                                    </div>
                                )}

                                {/* Completed/Rejected Withdrawals */}
                                <div>
                                    <h3 style={{
                                        fontSize: 'var(--font-size-base)',
                                        fontWeight: 'var(--font-weight-semibold)',
                                        color: 'var(--color-text-primary)',
                                        marginBottom: '12px',
                                    }}>
                                        Tarix
                                    </h3>
                                    {completedWithdrawals.length === 0 && pendingWithdrawals.length === 0 ? (
                                        <p style={{ textAlign: 'center', color: 'var(--color-text-muted)', padding: '24px' }}>
                                            Pul yechish so'rovlari yo'q
                                        </p>
                                    ) : completedWithdrawals.length === 0 ? (
                                        <p style={{ textAlign: 'center', color: 'var(--color-text-muted)', padding: '24px' }}>
                                            Tarix bo'sh
                                        </p>
                                    ) : (
                                        <table style={{ width: '100%', borderCollapse: 'collapse' }}>
                                            <thead>
                                                <tr style={{ borderBottom: '1px solid var(--color-border-muted)' }}>
                                                    {['Foydalanuvchi', 'Summa', 'Karta', 'Sana', 'Holati'].map(header => (
                                                        <th key={header} style={{
                                                            padding: '10px 12px', textAlign: 'left',
                                                            fontSize: 'var(--font-size-xs)', fontWeight: 'var(--font-weight-medium)',
                                                            color: 'var(--color-text-muted)', textTransform: 'uppercase',
                                                        }}>
                                                            {header}
                                                        </th>
                                                    ))}
                                                </tr>
                                            </thead>
                                            <tbody>
                                                {completedWithdrawals.map(w => (
                                                    <tr key={w.id} style={{ borderBottom: '1px solid var(--color-border-muted)' }}>
                                                        <td style={{ padding: '10px 12px', fontWeight: 'var(--font-weight-medium)', color: 'var(--color-text-primary)' }}>
                                                            {w.user_name || w.user_email || w.user || '—'}
                                                        </td>
                                                        <td style={{ padding: '10px 12px', color: 'var(--color-text-primary)' }}>
                                                            {formatPrice(w.amount)}
                                                        </td>
                                                        <td style={{ padding: '10px 12px', color: 'var(--color-text-muted)', fontSize: 'var(--font-size-sm)' }}>
                                                            {(w.card_type || '').toUpperCase()} •••• {(w.card_number || '').slice(-4)}
                                                        </td>
                                                        <td style={{ padding: '10px 12px', color: 'var(--color-text-muted)', fontSize: 'var(--font-size-sm)' }}>
                                                            {w.created_at ? new Date(w.created_at).toLocaleDateString() : '—'}
                                                        </td>
                                                        <td style={{ padding: '10px 12px' }}>
                                                            <span style={{
                                                                padding: '2px 10px', borderRadius: 'var(--radius-full)',
                                                                fontSize: 'var(--font-size-xs)', fontWeight: 'var(--font-weight-medium)',
                                                                backgroundColor: w.status === 'completed' ? 'var(--color-success-bg)' : 'var(--color-error-bg)',
                                                                color: w.status === 'completed' ? 'var(--color-success-text)' : 'var(--color-error)',
                                                            }}>
                                                                {STATUS_LABELS[w.status] || w.status}
                                                            </span>
                                                        </td>
                                                    </tr>
                                                ))}
                                            </tbody>
                                        </table>
                                    )}
                                </div>
                            </>
                        )}
                    </div>
                )}
            </div>
        </div>
    );
};

export default AdminFinance;
