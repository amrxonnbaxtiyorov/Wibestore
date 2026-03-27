import { useState } from 'react';
import { AlertTriangle, FileText, Clock, CheckCircle, Eye, X } from 'lucide-react';
import { useAdminReports, useAdminResolveReport } from '../../hooks/useAdmin';
import { useLanguage } from '../../context/LanguageContext';

const STATUS_CONFIG = {
    pending: { badge: 'badge-orange', label_key: 'pending' },
    investigating: { badge: 'badge-blue', label_key: 'investigating' },
    resolved: { badge: 'badge-green', label_key: 'resolved' },
    dismissed: { badge: 'badge-red', label_key: 'dismissed' },
};

const AdminReports = () => {
    const { t } = useLanguage();
    const { data: reportsList, isLoading } = useAdminReports();
    const resolveReport = useAdminResolveReport();
    const [selectedReport, setSelectedReport] = useState(null);
    const [resolveAction, setResolveAction] = useState('resolved');
    const [resolveNote, setResolveNote] = useState('');
    const [filter, setFilter] = useState('all');

    const reports = Array.isArray(reportsList) ? reportsList : (reportsList?.results ?? []);
    const filtered = filter === 'all' ? reports : reports.filter(r => r.status === filter);

    const totalPending = reports.filter(r => r.status === 'pending').length;
    const totalResolved = reports.filter(r => r.status === 'resolved').length;

    const handleResolve = (reportId) => {
        resolveReport.mutate(
            { reportId, action: resolveAction, note: resolveNote },
            {
                onSuccess: () => {
                    setSelectedReport(null);
                    setResolveNote('');
                },
            }
        );
    };

    const statusLabel = (status) => {
        const labels = {
            pending: t('admin.status_pending') || 'Kutilmoqda',
            investigating: t('admin.status_investigating') || "Ko'rib chiqilmoqda",
            resolved: t('admin.status_resolved') || 'Hal qilingan',
            dismissed: t('admin.status_dismissed') || 'Rad etilgan',
        };
        return labels[status] || status;
    };

    return (
        <div className="admin-page">
            <div style={{ marginBottom: 24 }}>
                <h1 style={{ fontSize: 'var(--font-size-2xl)', fontWeight: 'var(--font-weight-bold)', color: 'var(--color-text-primary)', margin: 0 }}>
                    {t('admin.menu_reports') || 'Shikoyatlar'}
                </h1>
                <p style={{ fontSize: 'var(--font-size-sm)', color: 'var(--color-text-muted)', marginTop: 4 }}>
                    {t('admin.reports_subtitle') || "Foydalanuvchi shikoyatlarini ko'rib chiqish"}
                </p>
            </div>

            {/* Stats */}
            <div className="grid grid-cols-1 md:grid-cols-3" style={{ gap: 16, marginBottom: 24 }}>
                {[
                    { label: 'Jami shikoyatlar', value: reports.length, icon: FileText, color: 'var(--color-accent-blue)' },
                    { label: 'Kutilmoqda', value: totalPending, icon: Clock, color: 'var(--color-accent-orange)' },
                    { label: 'Hal qilingan', value: totalResolved, icon: CheckCircle, color: 'var(--color-accent-green, #3fb950)' },
                ].map((stat, i) => (
                    <div key={i} className="card" style={{ padding: 20, display: 'flex', alignItems: 'center', gap: 16 }}>
                        <div style={{
                            width: 48, height: 48, borderRadius: 'var(--radius-lg)',
                            backgroundColor: 'var(--color-bg-tertiary)',
                            display: 'flex', alignItems: 'center', justifyContent: 'center',
                        }}>
                            <stat.icon style={{ width: 24, height: 24, color: stat.color }} />
                        </div>
                        <div>
                            <div style={{ fontSize: 'var(--font-size-2xl)', fontWeight: 'var(--font-weight-bold)', color: 'var(--color-text-primary)' }}>{stat.value}</div>
                            <div style={{ fontSize: 'var(--font-size-sm)', color: 'var(--color-text-muted)' }}>{stat.label}</div>
                        </div>
                    </div>
                ))}
            </div>

            {/* Filters */}
            <div style={{ display: 'flex', gap: 8, marginBottom: 16, flexWrap: 'wrap' }}>
                {['all', 'pending', 'investigating', 'resolved', 'dismissed'].map(f => (
                    <button
                        key={f}
                        className={`btn btn-sm ${filter === f ? 'btn-primary' : 'btn-secondary'}`}
                        onClick={() => setFilter(f)}
                    >
                        {f === 'all' ? (t('admin.filter_all') || 'Barchasi') : statusLabel(f)}
                    </button>
                ))}
            </div>

            {/* Reports table */}
            {isLoading ? (
                <div style={{ display: 'flex', justifyContent: 'center', padding: 60 }}>
                    <div className="loading-spinner" />
                </div>
            ) : (
                <div className="admin-table-wrapper">
                    <table className="admin-table">
                        <thead>
                            <tr>
                                <th>Shikoyatchi</th>
                                <th>Sabab</th>
                                <th>E'lon</th>
                                <th>Status</th>
                                <th>Sana</th>
                                <th>Amallar</th>
                            </tr>
                        </thead>
                        <tbody>
                            {filtered.map(report => {
                                const cfg = STATUS_CONFIG[report.status] || STATUS_CONFIG.pending;
                                return (
                                    <tr key={report.id}>
                                        <td>
                                            <div style={{ fontWeight: 500 }}>{report.reporter?.email || report.reporter?.username || '\u2014'}</div>
                                        </td>
                                        <td style={{ maxWidth: 250 }}>
                                            <div style={{ overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>
                                                {report.reason || report.description || '\u2014'}
                                            </div>
                                        </td>
                                        <td>
                                            <div style={{ overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap', maxWidth: 180 }}>
                                                {report.reported_listing?.title || '\u2014'}
                                            </div>
                                        </td>
                                        <td>
                                            <span className={`badge ${cfg.badge}`}>{statusLabel(report.status)}</span>
                                        </td>
                                        <td style={{ fontSize: 12, whiteSpace: 'nowrap' }}>
                                            {report.created_at ? new Date(report.created_at).toLocaleDateString() : '\u2014'}
                                        </td>
                                        <td>
                                            <div style={{ display: 'flex', gap: 6 }}>
                                                <button
                                                    className="btn btn-sm btn-secondary"
                                                    onClick={() => setSelectedReport(report)}
                                                    title="Batafsil"
                                                >
                                                    <Eye style={{ width: 14, height: 14 }} />
                                                </button>
                                                {report.status === 'pending' && (
                                                    <button
                                                        className="btn btn-sm btn-primary"
                                                        onClick={() => { setSelectedReport(report); setResolveAction('resolved'); }}
                                                    >
                                                        Hal qilish
                                                    </button>
                                                )}
                                            </div>
                                        </td>
                                    </tr>
                                );
                            })}
                            {filtered.length === 0 && (
                                <tr><td colSpan="6" style={{ textAlign: 'center', padding: 40, color: 'var(--color-text-muted)' }}>Shikoyatlar topilmadi</td></tr>
                            )}
                        </tbody>
                    </table>
                </div>
            )}

            {/* Detail / Resolve Modal */}
            {selectedReport && (
                <div className="modal-overlay" onClick={() => setSelectedReport(null)}>
                    <div className="modal" onClick={e => e.stopPropagation()} style={{ maxWidth: 500 }}>
                        <div className="modal-header">
                            <h3>Shikoyat #{selectedReport.id?.toString().slice(0, 8)}</h3>
                            <button className="modal-close" onClick={() => setSelectedReport(null)}>
                                <X style={{ width: 18, height: 18 }} />
                            </button>
                        </div>
                        <div className="modal-body" style={{ display: 'flex', flexDirection: 'column', gap: 12 }}>
                            <div><b>Shikoyatchi:</b> {selectedReport.reporter?.email || '\u2014'}</div>
                            <div><b>E'lon:</b> {selectedReport.reported_listing?.title || '\u2014'}</div>
                            <div><b>Sabab:</b> {selectedReport.reason || '\u2014'}</div>
                            <div><b>Tavsif:</b> {selectedReport.description || '\u2014'}</div>
                            <div><b>Status:</b> <span className={`badge ${(STATUS_CONFIG[selectedReport.status] || STATUS_CONFIG.pending).badge}`}>{statusLabel(selectedReport.status)}</span></div>
                            <div><b>Sana:</b> {selectedReport.created_at ? new Date(selectedReport.created_at).toLocaleString() : '\u2014'}</div>

                            {selectedReport.status === 'pending' && (
                                <>
                                    <hr style={{ border: 'none', borderTop: '1px solid var(--color-border-default)', margin: '8px 0' }} />
                                    <div>
                                        <label style={{ display: 'block', fontSize: 'var(--font-size-sm)', marginBottom: 6, color: 'var(--color-text-secondary)' }}>
                                            Qaror:
                                        </label>
                                        <select className="input" value={resolveAction} onChange={e => setResolveAction(e.target.value)} style={{ width: '100%' }}>
                                            <option value="resolved">Hal qilish</option>
                                            <option value="dismissed">Rad etish</option>
                                        </select>
                                    </div>
                                    <div>
                                        <label style={{ display: 'block', fontSize: 'var(--font-size-sm)', marginBottom: 6, color: 'var(--color-text-secondary)' }}>
                                            Izoh:
                                        </label>
                                        <textarea
                                            className="input"
                                            rows={3}
                                            value={resolveNote}
                                            onChange={e => setResolveNote(e.target.value)}
                                            placeholder="Izoh qo'shing..."
                                            style={{ width: '100%', resize: 'vertical' }}
                                        />
                                    </div>
                                    <button
                                        className="btn btn-primary"
                                        onClick={() => handleResolve(selectedReport.id)}
                                        disabled={resolveReport.isPending}
                                        style={{ width: '100%' }}
                                    >
                                        {resolveReport.isPending ? 'Yuborilmoqda...' : 'Tasdiqlash'}
                                    </button>
                                </>
                            )}
                        </div>
                    </div>
                </div>
            )}
        </div>
    );
};

export default AdminReports;
