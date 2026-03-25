import { useState } from 'react';
import { Search, Eye, EyeOff, Check, X, Ban, Key, AlertCircle, RefreshCw } from 'lucide-react';
import { formatPrice } from '../../data/mockData';
import {
    useAdminAllListings,
    useAdminApproveListing,
    useAdminRejectListing,
    useAdminDeleteListing,
} from '../../hooks/useAdmin';

// Sotuvdagi eski ma'lumotlarni loyihadan olib tashlash — localStorage tozalash (bir marta)
if (typeof localStorage !== 'undefined' && localStorage.getItem('wibeListings')) {
    localStorage.removeItem('wibeListings');
}

const AdminAccounts = () => {
    const [selectedStatus, setSelectedStatus] = useState('all');
    const [searchQuery, setSearchQuery] = useState('');
    const [selectedListing, setSelectedListing] = useState(null);
    const [showCredentials, setShowCredentials] = useState(false);
    const [showPassword, setShowPassword] = useState(false);
    const [message, setMessage] = useState({ type: '', text: '' });

    const statusParam = selectedStatus === 'all' ? undefined : selectedStatus;
    const { data: apiListings = [], isLoading, refetch } = useAdminAllListings({ status: statusParam });
    const approveListing = useAdminApproveListing();
    const rejectListing = useAdminRejectListing();
    const deleteListing = useAdminDeleteListing();

    const statusFilters = [
        { value: 'all', label: 'Barchasi' },
        { value: 'pending', label: 'Kutilmoqda' },
        { value: 'active', label: 'Tasdiqlandi' },
        { value: 'rejected', label: 'Rad etilgan' },
        { value: 'sold', label: 'Sotilgan' },
    ];

    const getStatusBadge = (status) => {
        const config = {
            active: { bg: 'var(--color-success-bg)', color: 'var(--color-accent-green)', label: 'Tasdiqlandi' },
            pending: { bg: 'var(--color-warning-bg)', color: 'var(--color-accent-orange)', label: 'Kutilmoqda' },
            rejected: { bg: 'var(--color-error-bg)', color: 'var(--color-accent-red)', label: 'Rad etilgan' },
            sold: { bg: 'var(--color-info-bg)', color: 'var(--color-accent-blue)', label: 'Sotilgan' },
        };
        const s = config[status] || { bg: 'var(--color-bg-tertiary)', color: 'var(--color-text-muted)', label: status };
        return <span className="badge" style={{ backgroundColor: s.bg, color: s.color }}>{s.label}</span>;
    };

    const getGameName = (listing) => listing?.game?.name || listing?.game_id || '—';
    const getSellerName = (listing) => listing?.seller?.display_name || listing?.seller?.full_name || listing?.seller?.email || '—';

    const showMsg = (type, text) => {
        setMessage({ type, text });
        setTimeout(() => setMessage({ type: '', text: '' }), 3000);
    };

    const handleApprove = async (listing) => {
        try {
            await approveListing.mutateAsync(listing.id);
            showMsg('success', `"${listing.title}" tasdiqlandi!`);
            refetch();
        } catch (err) {
            showMsg('error', err?.response?.data?.error?.message || 'Tasdiqlash xatosi');
        }
    };

    const handleReject = async (listing) => {
        if (!window.confirm(`"${listing.title}" ni rad etmoqchimisiz?`)) return;
        try {
            await rejectListing.mutateAsync({ listingId: listing.id, reason: '' });
            showMsg('success', `"${listing.title}" rad etildi!`);
            refetch();
        } catch (err) {
            showMsg('error', err?.response?.data?.error?.message || 'Rad etish xatosi');
        }
    };

    const handleDelete = async (listing) => {
        if (!window.confirm(`"${listing.title}" ni o'chirmoqchimisiz?`)) return;
        try {
            await deleteListing.mutateAsync(listing.id);
            showMsg('success', 'E\'lon o\'chirildi!');
            if (selectedListing?.id === listing.id) setShowCredentials(false);
            refetch();
        } catch (err) {
            showMsg('error', err?.response?.data?.error?.message || 'O\'chirish xatosi');
        }
    };

    const viewCredentials = (listing) => {
        setSelectedListing(listing);
        setShowCredentials(true);
        setShowPassword(false);
    };

    const filteredListings = (apiListings || []).filter((listing) => {
        const matchesSearch =
            listing.title?.toLowerCase().includes(searchQuery.toLowerCase()) ||
            getSellerName(listing).toLowerCase().includes(searchQuery.toLowerCase());
        return matchesSearch;
    });

    const pendingCount = (apiListings || []).filter((l) => l.status === 'pending').length;

    return (
        <div style={{ display: 'flex', flexDirection: 'column', gap: '24px' }}>
            <div className="flex flex-col sm:flex-row sm:items-center justify-between" style={{ gap: '16px' }}>
                <div>
                    <h1 style={{ fontSize: 'var(--font-size-2xl)', fontWeight: 'var(--font-weight-bold)', color: 'var(--color-text-primary)', marginBottom: '4px' }}>
                        Akkauntlar
                    </h1>
                    <p style={{ color: 'var(--color-text-muted)', fontSize: 'var(--font-size-sm)' }}>
                        Foydalanuvchi e&apos;lonlarini boshqaring (API orqali)
                    </p>
                </div>
                <div style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
                    <button
                        onClick={() => refetch()}
                        disabled={isLoading}
                        className="btn btn-ghost btn-md"
                        title="Yangilash"
                        aria-label="Refresh"
                    >
                        <RefreshCw style={{ width: '16px', height: '16px' }} />
                    </button>
                    {pendingCount > 0 && (
                        <span className="badge" style={{ backgroundColor: 'var(--color-warning-bg)', color: 'var(--color-accent-orange)', padding: '6px 12px' }}>
                            {pendingCount} ta kutilmoqda
                        </span>
                    )}
                </div>
            </div>

            {message.text && (
                <div className={`alert ${message.type === 'success' ? 'alert-success' : 'alert-error'}`}>
                    <Check style={{ width: '18px', height: '18px', flexShrink: 0 }} />
                    <span>{message.text}</span>
                </div>
            )}

            <div className="flex flex-col lg:flex-row" style={{ gap: '12px' }}>
                <div style={{ position: 'relative', flex: 1 }}>
                    <Search style={{ position: 'absolute', left: '12px', top: '50%', transform: 'translateY(-50%)', width: '16px', height: '16px', color: 'var(--color-text-muted)' }} />
                    <input
                        type="text"
                        value={searchQuery}
                        onChange={(e) => setSearchQuery(e.target.value)}
                        placeholder="Akkaunt yoki sotuvchi qidirish..."
                        className="input input-lg"
                        style={{ paddingLeft: '36px' }}
                    />
                </div>
                <div style={{ display: 'flex', gap: '8px', overflowX: 'auto' }}>
                    {statusFilters.map((filter) => (
                        <button
                            key={filter.value}
                            onClick={() => setSelectedStatus(filter.value)}
                            className={`btn ${selectedStatus === filter.value ? 'btn-primary' : 'btn-secondary'} btn-md`}
                            style={{ whiteSpace: 'nowrap' }}
                        >
                            {filter.label}
                        </button>
                    ))}
                </div>
            </div>

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
                                <th>ID</th>
                                <th>Akkaunt</th>
                                <th>O&apos;yin</th>
                                <th>Sotuvchi</th>
                                <th>Narx</th>
                                <th>Status</th>
                                <th>Sana</th>
                                <th>Amallar</th>
                            </tr>
                        </thead>
                        <tbody>
                            {isLoading ? (
                                <tr>
                                    <td colSpan="8" style={{ padding: '48px 16px', textAlign: 'center', color: 'var(--color-text-muted)' }}>
                                        Yuklanmoqda…
                                    </td>
                                </tr>
                            ) : filteredListings.length > 0 ? (
                                filteredListings.map((listing) => (
                                    <tr key={listing.id}>
                                        <td style={{ color: 'var(--color-text-muted)', fontSize: 'var(--font-size-sm)' }}>#{String(listing.id).slice(0, 8)}</td>
                                        <td>
                                            <div style={{ fontWeight: 'var(--font-weight-medium)', color: 'var(--color-text-primary)', fontSize: 'var(--font-size-sm)' }}>
                                                {listing.title}
                                            </div>
                                            <div style={{ fontSize: 'var(--font-size-xs)', color: 'var(--color-text-muted)', marginTop: '2px' }}>
                                                Level: {listing.level || '—'} | Rank: {listing.rank || '—'}
                                            </div>
                                        </td>
                                        <td style={{ color: 'var(--color-text-secondary)', fontSize: 'var(--font-size-sm)' }}>{getGameName(listing)}</td>
                                        <td style={{ color: 'var(--color-text-primary)', fontSize: 'var(--font-size-sm)' }}>{getSellerName(listing)}</td>
                                        <td style={{ color: 'var(--color-text-accent)', fontSize: 'var(--font-size-sm)', fontWeight: 'var(--font-weight-medium)' }}>
                                            {formatPrice(Number(listing.price))}
                                        </td>
                                        <td>{getStatusBadge(listing.status)}</td>
                                        <td style={{ color: 'var(--color-text-muted)', fontSize: 'var(--font-size-sm)' }}>
                                            {listing.created_at ? new Date(listing.created_at).toLocaleDateString('uz-UZ') : '—'}
                                        </td>
                                        <td>
                                            <div style={{ display: 'flex', alignItems: 'center', gap: '4px' }}>
                                                <button onClick={() => viewCredentials(listing)} className="btn btn-ghost btn-sm" style={{ padding: '6px', color: 'var(--color-text-accent)' }} title="Login/Parol" aria-label="View credentials">
                                                    <Key style={{ width: '14px', height: '14px' }} />
                                                </button>
                                                {listing.status === 'pending' && (
                                                    <>
                                                        <button onClick={() => handleApprove(listing)} className="btn btn-ghost btn-sm" style={{ padding: '6px', color: 'var(--color-accent-green)' }} title="Tasdiqlash" aria-label="Approve">
                                                            <Check style={{ width: '14px', height: '14px' }} />
                                                        </button>
                                                        <button onClick={() => handleReject(listing)} className="btn btn-ghost btn-sm" style={{ padding: '6px', color: 'var(--color-accent-red)' }} title="Rad etish" aria-label="Reject">
                                                            <X style={{ width: '14px', height: '14px' }} />
                                                        </button>
                                                    </>
                                                )}
                                                {listing.status === 'active' && (
                                                    <button onClick={() => handleReject(listing)} className="btn btn-ghost btn-sm" style={{ padding: '6px', color: 'var(--color-accent-red)' }} title="Bloklash" aria-label="Block">
                                                        <Ban style={{ width: '14px', height: '14px' }} />
                                                    </button>
                                                )}
                                                <button onClick={() => handleDelete(listing)} className="btn btn-ghost btn-sm" style={{ padding: '6px', color: 'var(--color-text-muted)' }} title="O'chirish" aria-label="Delete">
                                                    <X style={{ width: '14px', height: '14px' }} />
                                                </button>
                                            </div>
                                        </td>
                                    </tr>
                                ))
                            ) : (
                                <tr>
                                    <td colSpan="8" style={{ padding: '48px 16px', textAlign: 'center' }}>
                                        <AlertCircle style={{ width: '40px', height: '40px', color: 'var(--color-text-muted)', margin: '0 auto 16px' }} />
                                        <p style={{ color: 'var(--color-text-secondary)' }}>Hech qanday e&apos;lon topilmadi</p>
                                        <p style={{ color: 'var(--color-text-muted)', fontSize: 'var(--font-size-sm)', marginTop: '4px' }}>
                                            Foydalanuvchilar e&apos;lon qo&apos;shganda bu yerda ko&apos;rinadi
                                        </p>
                                    </td>
                                </tr>
                            )}
                        </tbody>
                    </table>
                </div>
                <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', padding: 'var(--space-4)', borderTop: '1px solid var(--color-border-muted)' }}>
                    <div style={{ fontSize: 'var(--font-size-sm)', color: 'var(--color-text-muted)' }}>
                        {filteredListings.length} ta akkaunt topildi
                    </div>
                </div>
            </div>

            {showCredentials && selectedListing && (
                <div className="modal-overlay" style={{ position: 'fixed', inset: 0, backgroundColor: 'var(--color-bg-overlay)', backdropFilter: 'blur(4px)', zIndex: 50, display: 'flex', alignItems: 'center', justifyContent: 'center', padding: '16px' }}>
                    <div style={{ backgroundColor: 'var(--color-bg-secondary)', borderRadius: 'var(--radius-xl)', padding: '24px', width: '100%', maxWidth: '440px', border: '1px solid var(--color-border-default)' }}>
                        <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: '24px' }}>
                            <div style={{ display: 'flex', alignItems: 'center', gap: '12px' }}>
                                <div style={{ width: '44px', height: '44px', backgroundColor: 'var(--color-accent-blue)', borderRadius: 'var(--radius-full)', display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
                                    <Key style={{ width: '22px', height: '22px', color: '#ffffff' }} />
                                </div>
                                <div>
                                    <h3 style={{ fontSize: 'var(--font-size-lg)', fontWeight: 'var(--font-weight-bold)', color: 'var(--color-text-primary)' }}>Akkaunt ma&apos;lumotlari</h3>
                                    <p style={{ fontSize: 'var(--font-size-sm)', color: 'var(--color-text-muted)' }}>{selectedListing.title}</p>
                                </div>
                            </div>
                            <button onClick={() => setShowCredentials(false)} className="btn btn-ghost btn-sm" style={{ padding: '6px' }} aria-label="Close">
                                <X style={{ width: '18px', height: '18px' }} />
                            </button>
                        </div>
                        <div style={{ display: 'flex', flexDirection: 'column', gap: '12px' }}>
                            <div style={{ padding: '16px', backgroundColor: 'var(--color-bg-primary)', borderRadius: 'var(--radius-lg)', border: '1px solid var(--color-border-muted)' }}>
                                <label style={{ fontSize: 'var(--font-size-xs)', color: 'var(--color-text-muted)', display: 'block', marginBottom: '4px' }}>Kirish usuli</label>
                                <p style={{ fontWeight: 'var(--font-weight-medium)', color: 'var(--color-text-primary)' }}>{selectedListing.login_method || 'Email'}</p>
                            </div>
                            <div style={{ padding: '16px', backgroundColor: 'var(--color-bg-primary)', borderRadius: 'var(--radius-lg)', border: '1px solid var(--color-border-muted)' }}>
                                <label style={{ fontSize: 'var(--font-size-xs)', color: 'var(--color-text-muted)', display: 'block', marginBottom: '4px' }}>Email / Login</label>
                                <p style={{ fontWeight: 'var(--font-weight-medium)', color: 'var(--color-text-primary)', fontFamily: 'monospace' }}>
                                    {selectedListing.account_email ? (showPassword ? selectedListing.account_email : '••••••••••') : '— (API orqali berilmaydi)'}
                                </p>
                            </div>
                            <div style={{ padding: '16px', backgroundColor: 'var(--color-bg-primary)', borderRadius: 'var(--radius-lg)', border: '1px solid var(--color-border-muted)' }}>
                                <label style={{ fontSize: 'var(--font-size-xs)', color: 'var(--color-text-muted)', display: 'block', marginBottom: '4px' }}>Parol</label>
                                <p style={{ fontWeight: 'var(--font-weight-medium)', color: 'var(--color-text-primary)', fontFamily: 'monospace' }}>
                                    {selectedListing.account_password ? (showPassword ? selectedListing.account_password : '••••••••••') : '— (API orqali berilmaydi)'}
                                </p>
                            </div>
                            <div style={{ padding: '16px', backgroundColor: 'var(--color-info-bg)', borderRadius: 'var(--radius-lg)', border: '1px solid var(--color-accent-blue)' }}>
                                <label style={{ fontSize: 'var(--font-size-xs)', color: 'var(--color-text-accent)', display: 'block', marginBottom: '4px' }}>Sotuvchi</label>
                                <p style={{ fontWeight: 'var(--font-weight-medium)', color: 'var(--color-text-primary)' }}>{getSellerName(selectedListing)}</p>
                                <p style={{ color: 'var(--color-text-muted)', fontSize: 'var(--font-size-sm)' }}>ID: {selectedListing.seller?.id || '—'}</p>
                            </div>
                        </div>
                        <div style={{ display: 'flex', gap: '12px', marginTop: '24px' }}>
                            {selectedListing.status === 'pending' && (
                                <>
                                    <button onClick={() => { handleApprove(selectedListing); setShowCredentials(false); }} className="btn btn-md" style={{ flex: 1, backgroundColor: 'var(--color-accent-green)', color: '#fff', border: 'none' }}>
                                        <Check style={{ width: '16px', height: '16px' }} /> Tasdiqlash
                                    </button>
                                    <button onClick={() => { handleReject(selectedListing); setShowCredentials(false); }} className="btn btn-danger btn-md" style={{ flex: 1 }}>
                                        <X style={{ width: '16px', height: '16px' }} /> Rad etish
                                    </button>
                                </>
                            )}
                            <button onClick={() => setShowCredentials(false)} className="btn btn-secondary btn-md" style={{ flex: 1 }}>Yopish</button>
                        </div>
                    </div>
                </div>
            )}
        </div>
    );
};

export default AdminAccounts;
