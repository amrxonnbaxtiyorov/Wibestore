import { BarChart3, AlertTriangle, FileText, Clock } from 'lucide-react';

const AdminReports = () => {
    const reports = [
        {
            id: 1,
            type: 'fraud',
            reporter: 'Sardor',
            target: 'ProGamer_UZ',
            reason: "Noto'g'ri akkaunt ma'lumoti",
            status: 'pending',
            date: '2026-02-18',
        },
        {
            id: 2,
            type: 'scam',
            reporter: 'Jasur',
            target: 'GameSeller99',
            reason: "To'lov qabul qilingan, lekin akkaunt berilmagan",
            status: 'reviewing',
            date: '2026-02-17',
        },
        {
            id: 3,
            type: 'inappropriate',
            reporter: 'Anvar',
            target: 'DarkTrader',
            reason: "Noqonuniy kontent joylashtirilgan",
            status: 'resolved',
            date: '2026-02-15',
        },
    ];

    const statusColors = {
        pending: { bg: 'var(--color-warning-bg)', text: 'var(--color-warning-text)', label: 'Kutilmoqda' },
        reviewing: { bg: 'var(--color-info-bg)', text: 'var(--color-info-text)', label: "Ko'rib chiqilmoqda" },
        resolved: { bg: 'var(--color-success-bg)', text: 'var(--color-success-text)', label: 'Hal qilingan' },
    };

    return (
        <div>
            <h1 style={{
                fontSize: 'var(--font-size-2xl)',
                fontWeight: 'var(--font-weight-bold)',
                color: 'var(--color-text-primary)',
                marginBottom: '24px',
            }}>
                Hisobotlar
            </h1>

            {/* Stats Cards */}
            <div className="grid grid-cols-1 md:grid-cols-3" style={{ gap: '16px', marginBottom: '24px' }}>
                {[
                    { label: 'Jami shikoyatlar', value: reports.length, icon: FileText, color: 'var(--color-accent-blue)' },
                    { label: 'Kutilmoqda', value: reports.filter(r => r.status === 'pending').length, icon: Clock, color: 'var(--color-accent-orange)' },
                    { label: 'Hal qilingan', value: reports.filter(r => r.status === 'resolved').length, icon: BarChart3, color: 'var(--color-accent-green)' },
                ].map((stat, i) => (
                    <div key={i} style={{
                        padding: '20px',
                        borderRadius: 'var(--radius-xl)',
                        backgroundColor: 'var(--color-bg-secondary)',
                        border: '1px solid var(--color-border-default)',
                    }}>
                        <div className="flex items-center gap-3">
                            <div style={{
                                width: '40px', height: '40px',
                                borderRadius: 'var(--radius-lg)',
                                backgroundColor: stat.color + '1a',
                                display: 'flex', alignItems: 'center', justifyContent: 'center',
                            }}>
                                <stat.icon style={{ width: '20px', height: '20px', color: stat.color }} />
                            </div>
                            <div>
                                <p style={{ fontSize: 'var(--font-size-sm)', color: 'var(--color-text-muted)' }}>{stat.label}</p>
                                <p style={{ fontSize: 'var(--font-size-2xl)', fontWeight: 'var(--font-weight-bold)', color: 'var(--color-text-primary)' }}>{stat.value}</p>
                            </div>
                        </div>
                    </div>
                ))}
            </div>

            {/* Reports List */}
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
                        Shikoyatlar ro'yxati
                    </h2>
                </div>
                {reports.map((report) => {
                    const status = statusColors[report.status];
                    return (
                        <div key={report.id} style={{
                            padding: '16px 20px',
                            borderBottom: '1px solid var(--color-border-muted)',
                            display: 'flex',
                            alignItems: 'center',
                            justifyContent: 'space-between',
                            gap: '12px',
                        }}>
                            <div className="flex items-center gap-3" style={{ flex: 1, minWidth: 0 }}>
                                <div style={{
                                    width: '40px', height: '40px',
                                    borderRadius: 'var(--radius-lg)',
                                    backgroundColor: 'var(--color-accent-red)' + '1a',
                                    display: 'flex', alignItems: 'center', justifyContent: 'center',
                                    flexShrink: 0,
                                }}>
                                    <AlertTriangle style={{ width: '20px', height: '20px', color: 'var(--color-accent-red)' }} />
                                </div>
                                <div style={{ minWidth: 0 }}>
                                    <p className="truncate" style={{
                                        fontWeight: 'var(--font-weight-medium)',
                                        color: 'var(--color-text-primary)',
                                    }}>
                                        {report.reporter} → {report.target}
                                    </p>
                                    <p className="truncate" style={{
                                        fontSize: 'var(--font-size-sm)',
                                        color: 'var(--color-text-muted)',
                                    }}>
                                        {report.reason}
                                    </p>
                                </div>
                            </div>
                            <div className="flex items-center gap-3" style={{ flexShrink: 0 }}>
                                <span style={{
                                    fontSize: 'var(--font-size-xs)',
                                    color: 'var(--color-text-muted)',
                                }}>
                                    {report.date}
                                </span>
                                <span style={{
                                    padding: '4px 12px',
                                    borderRadius: 'var(--radius-full)',
                                    fontSize: 'var(--font-size-xs)',
                                    fontWeight: 'var(--font-weight-medium)',
                                    backgroundColor: status.bg,
                                    color: status.text,
                                }}>
                                    {status.label}
                                </span>
                            </div>
                        </div>
                    );
                })}
            </div>
        </div>
    );
};

export default AdminReports;
