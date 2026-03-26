import { useState } from 'react';
import { useParams, useNavigate } from 'react-router-dom';
import { useAdminUserDetail, useAdminUpdateUser, useAdminBanUser, useAdminGrantSubscription } from '../../hooks/useAdmin';
import AdminLayout from './AdminLayout';

export default function AdminUserDetail() {
  const { id } = useParams();
  const navigate = useNavigate();
  const { data: user, isLoading } = useAdminUserDetail(id);
  const updateUser = useAdminUpdateUser();
  const banUser = useAdminBanUser(id);
  const grantSub = useAdminGrantSubscription();
  const [editData, setEditData] = useState(null);

  if (isLoading) return <AdminLayout><div className="loading-spinner" /></AdminLayout>;
  if (!user) return <AdminLayout><p>User not found</p></AdminLayout>;

  const handleSave = async () => {
    if (!editData) return;
    await updateUser.mutateAsync({ userId: id, data: editData });
    setEditData(null);
  };

  const handleBan = async () => {
    const action = user.is_active ? 'ban' : 'unban';
    if (confirm(`${action === 'ban' ? 'Ban' : 'Unban'} this user?`)) {
      await banUser.mutateAsync(action);
    }
  };

  const handleGrantSub = async (plan) => {
    await grantSub.mutateAsync({ userId: id, planSlug: plan, months: 1 });
  };

  const editing = editData !== null;
  const displayData = editing ? { ...user, ...editData } : user;

  return (
    <AdminLayout>
      <div className="admin-page">
        <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '20px' }}>
          <h1 className="admin-page-title">User: {user.full_name || user.email}</h1>
          <button className="btn btn-secondary" onClick={() => navigate(-1)}>Back</button>
        </div>

        <div className="admin-grid" style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '20px' }}>
          {/* Profile Info */}
          <div className="card">
            <div className="card-header"><h3>Profile</h3></div>
            <div className="card-body">
              <div className="form-group">
                <label>Email</label>
                <input className="input" value={displayData.email || ''} disabled={!editing}
                  onChange={(e) => setEditData(d => ({ ...d, email: e.target.value }))} />
              </div>
              <div className="form-group">
                <label>Full Name</label>
                <input className="input" value={displayData.full_name || ''} disabled={!editing}
                  onChange={(e) => setEditData(d => ({ ...d, full_name: e.target.value }))} />
              </div>
              <div className="form-group">
                <label>Phone</label>
                <input className="input" value={displayData.phone_number || ''} disabled={!editing}
                  onChange={(e) => setEditData(d => ({ ...d, phone_number: e.target.value }))} />
              </div>
              <div className="form-group">
                <label>Balance (UZS)</label>
                <input className="input" type="number" value={displayData.balance || '0'} disabled={!editing}
                  onChange={(e) => setEditData(d => ({ ...d, balance: e.target.value }))} />
              </div>

              <div style={{ display: 'flex', gap: '8px', marginTop: '16px' }}>
                {!editing ? (
                  <button className="btn btn-primary" onClick={() => setEditData({})}>Edit</button>
                ) : (
                  <>
                    <button className="btn btn-primary" onClick={handleSave} disabled={updateUser.isPending}>Save</button>
                    <button className="btn btn-secondary" onClick={() => setEditData(null)}>Cancel</button>
                  </>
                )}
              </div>
            </div>
          </div>

          {/* Stats & Actions */}
          <div className="card">
            <div className="card-header"><h3>Stats & Actions</h3></div>
            <div className="card-body">
              <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '8px', marginBottom: '16px' }}>
                <div><strong>Listings:</strong> {user.total_listings}</div>
                <div><strong>Active:</strong> {user.active_listings}</div>
                <div><strong>Transactions:</strong> {user.total_transactions}</div>
                <div><strong>Spent:</strong> {user.total_spent} UZS</div>
                <div><strong>Earned:</strong> {user.total_earned} UZS</div>
                <div><strong>Rating:</strong> {user.rating}</div>
                <div><strong>Telegram:</strong> {user.telegram_id || 'N/A'}</div>
                <div><strong>Verified:</strong> {user.is_verified ? 'Yes' : 'No'}</div>
              </div>

              {user.subscription_info && (
                <div className="badge badge-premium" style={{ marginBottom: '12px' }}>
                  {user.subscription_info.plan} — expires {user.subscription_info.expires?.slice(0, 10)}
                </div>
              )}

              <div style={{ display: 'flex', gap: '8px', flexWrap: 'wrap' }}>
                <button className={`btn ${user.is_active ? 'btn-danger' : 'btn-success'}`} onClick={handleBan}>
                  {user.is_active ? 'Ban User' : 'Unban User'}
                </button>
                <button className="btn btn-primary" onClick={() => handleGrantSub('premium')}>
                  Grant Premium
                </button>
                <button className="btn btn-purple" onClick={() => handleGrantSub('pro')}>
                  Grant Pro
                </button>
                <button className="btn btn-secondary" onClick={() => handleGrantSub('free')}>
                  Revoke Sub
                </button>
              </div>

              <div style={{ marginTop: '16px', fontSize: '13px', color: 'var(--color-text-secondary)' }}>
                <div>Registered: {new Date(user.created_at).toLocaleString()}</div>
                <div>Last login: {user.last_login ? new Date(user.last_login).toLocaleString() : 'Never'}</div>
              </div>
            </div>
          </div>
        </div>
      </div>
    </AdminLayout>
  );
}
