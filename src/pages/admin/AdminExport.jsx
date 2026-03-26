import { useState } from 'react';
import { useAdminExport } from '../../hooks/useAdmin';
import AdminLayout from './AdminLayout';

const EXPORT_TYPES = [
  { value: 'users', label: 'Users', icon: '👥' },
  { value: 'transactions', label: 'Transactions', icon: '💰' },
  { value: 'listings', label: 'Listings', icon: '📦' },
  { value: 'trades', label: 'Trades', icon: '🔄' },
];

export default function AdminExport() {
  const [dateFrom, setDateFrom] = useState('');
  const [dateTo, setDateTo] = useState('');
  const exportData = useAdminExport();

  const handleExport = (type) => {
    exportData.mutate({ type, dateFrom, dateTo });
  };

  return (
    <AdminLayout>
      <div className="admin-page">
        <h1 className="admin-page-title">Data Export</h1>

        <div className="card" style={{ padding: '20px', marginBottom: '20px' }}>
          <h3>Date Range (optional)</h3>
          <div style={{ display: 'flex', gap: '12px', marginTop: '12px' }}>
            <div className="form-group">
              <label>From</label>
              <input type="date" className="input" value={dateFrom} onChange={(e) => setDateFrom(e.target.value)} />
            </div>
            <div className="form-group">
              <label>To</label>
              <input type="date" className="input" value={dateTo} onChange={(e) => setDateTo(e.target.value)} />
            </div>
          </div>
        </div>

        <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fill, minmax(200px, 1fr))', gap: '16px' }}>
          {EXPORT_TYPES.map(({ value, label, icon }) => (
            <div key={value} className="card" style={{ padding: '20px', textAlign: 'center' }}>
              <div style={{ fontSize: '36px', marginBottom: '8px' }}>{icon}</div>
              <h3>{label}</h3>
              <button
                className="btn btn-primary"
                style={{ marginTop: '12px', width: '100%' }}
                onClick={() => handleExport(value)}
                disabled={exportData.isPending}
              >
                {exportData.isPending ? 'Exporting...' : 'Download CSV'}
              </button>
            </div>
          ))}
        </div>
      </div>
    </AdminLayout>
  );
}
