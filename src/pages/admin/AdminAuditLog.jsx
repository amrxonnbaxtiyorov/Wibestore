import { useState } from 'react';
import { useAdminAuditLog } from '../../hooks/useAdmin';
import AdminLayout from './AdminLayout';

const ACTION_COLORS = {
  approve: 'badge-green',
  create: 'badge-green',
  complete: 'badge-green',
  reject: 'badge-red',
  ban: 'badge-red',
  delete: 'badge-red',
  refund: 'badge-orange',
  edit: 'badge-yellow',
  export: 'badge-blue',
};

function getActionColor(actionType) {
  for (const [key, cls] of Object.entries(ACTION_COLORS)) {
    if (actionType?.includes(key)) return cls;
  }
  return 'badge-blue';
}

export default function AdminAuditLog() {
  const [filters, setFilters] = useState({ action_type: '', date_from: '', date_to: '' });
  const { data, isLoading } = useAdminAuditLog(filters);
  const logs = data?.results ?? data ?? [];

  return (
    <AdminLayout>
      <div className="admin-page">
        <h1 className="admin-page-title">Audit Log</h1>

        <div className="admin-filters" style={{ display: 'flex', gap: '12px', marginBottom: '20px', flexWrap: 'wrap' }}>
          <input
            type="text"
            placeholder="Action type..."
            className="input"
            value={filters.action_type}
            onChange={(e) => setFilters(f => ({ ...f, action_type: e.target.value }))}
          />
          <input
            type="date"
            className="input"
            value={filters.date_from}
            onChange={(e) => setFilters(f => ({ ...f, date_from: e.target.value }))}
          />
          <input
            type="date"
            className="input"
            value={filters.date_to}
            onChange={(e) => setFilters(f => ({ ...f, date_to: e.target.value }))}
          />
        </div>

        {isLoading ? (
          <div className="loading-spinner" />
        ) : (
          <div className="admin-table-wrapper">
            <table className="admin-table">
              <thead>
                <tr>
                  <th>Date</th>
                  <th>Admin</th>
                  <th>Action</th>
                  <th>Target</th>
                  <th>IP</th>
                </tr>
              </thead>
              <tbody>
                {logs.map((log) => (
                  <tr key={log.id}>
                    <td>{new Date(log.created_at).toLocaleString()}</td>
                    <td>{log.admin_email || log.admin_name}</td>
                    <td>
                      <span className={`badge ${getActionColor(log.action_type)}`}>
                        {log.action_type}
                      </span>
                    </td>
                    <td>
                      <span className="text-secondary">{log.target_type}</span>
                      <br />
                      <code style={{ fontSize: '11px' }}>{log.target_id?.slice(0, 8)}</code>
                    </td>
                    <td>{log.ip_address}</td>
                  </tr>
                ))}
                {logs.length === 0 && (
                  <tr><td colSpan="5" style={{ textAlign: 'center' }}>No audit logs found</td></tr>
                )}
              </tbody>
            </table>
          </div>
        )}
      </div>
    </AdminLayout>
  );
}
