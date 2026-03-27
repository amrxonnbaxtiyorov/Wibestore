import { useState } from 'react';
import { useAdminExport } from '../../hooks/useAdmin';
import { useLanguage } from '../../context/LanguageContext';
import { Download, Users, DollarSign, Package, ShoppingBag } from 'lucide-react';
import AdminLayout from './AdminLayout';

const EXPORT_TYPES = [
  { value: 'users', icon: Users, color: 'var(--color-accent-purple, #a371f7)' },
  { value: 'transactions', icon: DollarSign, color: 'var(--color-accent-orange, #d29922)' },
  { value: 'listings', icon: Package, color: 'var(--color-accent-blue)' },
  { value: 'trades', icon: ShoppingBag, color: 'var(--color-accent-green, #3fb950)' },
];

export default function AdminExport() {
  const { t } = useLanguage();
  const [dateFrom, setDateFrom] = useState('');
  const [dateTo, setDateTo] = useState('');
  const [activeType, setActiveType] = useState(null);
  const exportData = useAdminExport();

  const handleExport = (type) => {
    setActiveType(type);
    exportData.mutate(
      { type, dateFrom, dateTo },
      { onSettled: () => setActiveType(null) }
    );
  };

  return (
    <AdminLayout>
      <div className="admin-page">
        <div style={{ marginBottom: '24px' }}>
          <h1 style={{ fontSize: 'var(--font-size-2xl)', fontWeight: 'var(--font-weight-bold)', color: 'var(--color-text-primary)', margin: 0 }}>
            {t('admin_export.title') || 'Data Export'}
          </h1>
          <p style={{ fontSize: 'var(--font-size-sm)', color: 'var(--color-text-muted)', marginTop: '4px' }}>
            {t('admin_export.subtitle') || 'Export data as CSV files'}
          </p>
        </div>

        <div className="card" style={{ padding: '20px', marginBottom: '24px' }}>
          <h3 style={{ fontSize: 'var(--font-size-base)', fontWeight: 'var(--font-weight-semibold)', color: 'var(--color-text-primary)', marginBottom: '12px' }}>
            {t('admin_export.date_range') || 'Date Range (optional)'}
          </h3>
          <div style={{ display: 'flex', gap: '16px', flexWrap: 'wrap' }}>
            <div style={{ flex: '1 1 180px' }}>
              <label style={{ display: 'block', fontSize: 'var(--font-size-sm)', color: 'var(--color-text-secondary)', marginBottom: '6px' }}>
                {t('admin_export.from') || 'From'}
              </label>
              <input type="date" className="input" value={dateFrom} onChange={(e) => setDateFrom(e.target.value)} style={{ width: '100%' }} />
            </div>
            <div style={{ flex: '1 1 180px' }}>
              <label style={{ display: 'block', fontSize: 'var(--font-size-sm)', color: 'var(--color-text-secondary)', marginBottom: '6px' }}>
                {t('admin_export.to') || 'To'}
              </label>
              <input type="date" className="input" value={dateTo} onChange={(e) => setDateTo(e.target.value)} style={{ width: '100%' }} />
            </div>
          </div>
        </div>

        <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fill, minmax(220px, 1fr))', gap: '16px' }}>
          {EXPORT_TYPES.map(({ value, icon: Icon, color }) => (
            <div key={value} className="card admin-card-hover" style={{ padding: '24px', textAlign: 'center' }}>
              <div style={{
                width: '56px', height: '56px', borderRadius: 'var(--radius-lg)',
                backgroundColor: `color-mix(in srgb, ${color} 15%, transparent)`,
                display: 'flex', alignItems: 'center', justifyContent: 'center',
                margin: '0 auto 12px',
              }}>
                <Icon style={{ width: '28px', height: '28px', color }} />
              </div>
              <h3 style={{ fontSize: 'var(--font-size-lg)', fontWeight: 'var(--font-weight-semibold)', color: 'var(--color-text-primary)', marginBottom: '12px' }}>
                {t(`admin_export.${value}`) || value.charAt(0).toUpperCase() + value.slice(1)}
              </h3>
              <button
                className="btn btn-primary btn-sm"
                style={{ width: '100%', display: 'flex', alignItems: 'center', justifyContent: 'center', gap: '6px' }}
                onClick={() => handleExport(value)}
                disabled={exportData.isPending}
              >
                <Download style={{ width: '14px', height: '14px' }} />
                {activeType === value
                  ? (t('admin_export.exporting') || 'Exporting...')
                  : (t('admin_export.download_csv') || 'Download CSV')}
              </button>
            </div>
          ))}
        </div>

        {exportData.isError && (
          <div className="card" style={{ padding: '16px', marginTop: '16px', borderLeft: '4px solid var(--color-accent-red)', color: 'var(--color-text-primary)' }}>
            {t('server_error.title') || 'Server error'}: {exportData.error?.message || t('server_error.description') || 'An error occurred'}
          </div>
        )}
      </div>
    </AdminLayout>
  );
}
