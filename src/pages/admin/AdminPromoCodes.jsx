import { useState } from 'react';
import { useAdminPromoCodes, useAdminCreatePromoCode, useAdminUpdatePromoCode, useAdminDeletePromoCode } from '../../hooks/useAdmin';
import AdminLayout from './AdminLayout';

export default function AdminPromoCodes() {
  const { data, isLoading } = useAdminPromoCodes();
  const createPromo = useAdminCreatePromoCode();
  const updatePromo = useAdminUpdatePromoCode();
  const deletePromo = useAdminDeletePromoCode();
  const [showForm, setShowForm] = useState(false);
  const [editId, setEditId] = useState(null);
  const [formData, setFormData] = useState({
    code: '', discount_percent: 0, discount_fixed: 0,
    min_purchase: 0, max_uses_total: '', max_uses_per_user: 1,
    valid_from: '', valid_until: '', is_active: true,
  });

  const promos = data?.results ?? data ?? [];

  const handleSubmit = async (e) => {
    e.preventDefault();
    const payload = { ...formData };
    if (!payload.max_uses_total) delete payload.max_uses_total;
    if (!payload.valid_from) delete payload.valid_from;
    if (!payload.valid_until) delete payload.valid_until;

    if (editId) {
      await updatePromo.mutateAsync({ id: editId, data: payload });
    } else {
      await createPromo.mutateAsync(payload);
    }
    setShowForm(false);
    setEditId(null);
    setFormData({ code: '', discount_percent: 0, discount_fixed: 0, min_purchase: 0, max_uses_total: '', max_uses_per_user: 1, valid_from: '', valid_until: '', is_active: true });
  };

  const handleEdit = (promo) => {
    setFormData({
      code: promo.code, discount_percent: promo.discount_percent || 0,
      discount_fixed: promo.discount_fixed || 0, min_purchase: promo.min_purchase || 0,
      max_uses_total: promo.max_uses_total || '', max_uses_per_user: promo.max_uses_per_user || 1,
      valid_from: promo.valid_from?.slice(0, 16) || '', valid_until: promo.valid_until?.slice(0, 16) || '',
      is_active: promo.is_active,
    });
    setEditId(promo.id);
    setShowForm(true);
  };

  const handleDelete = async (id) => {
    if (confirm('Delete this promo code?')) {
      await deletePromo.mutateAsync(id);
    }
  };

  const generateCode = () => {
    const chars = 'ABCDEFGHIJKLMNOPQRSTUVWXYZ0123456789';
    let code = 'WIBE';
    for (let i = 0; i < 6; i++) code += chars[Math.floor(Math.random() * chars.length)];
    setFormData(f => ({ ...f, code }));
  };

  return (
    <AdminLayout>
      <div className="admin-page">
        <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '20px' }}>
          <h1 className="admin-page-title">Promo Codes</h1>
          <button className="btn btn-primary" onClick={() => { setShowForm(true); setEditId(null); }}>
            + Create Promo
          </button>
        </div>

        {showForm && (
          <form onSubmit={handleSubmit} className="card" style={{ marginBottom: '20px', padding: '20px' }}>
            <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fill, minmax(200px, 1fr))', gap: '12px' }}>
              <div className="form-group">
                <label>Code</label>
                <div style={{ display: 'flex', gap: '4px' }}>
                  <input className="input" value={formData.code} required
                    onChange={(e) => setFormData(f => ({ ...f, code: e.target.value.toUpperCase() }))} />
                  <button type="button" className="btn btn-sm btn-secondary" onClick={generateCode}>Auto</button>
                </div>
              </div>
              <div className="form-group">
                <label>Discount %</label>
                <input className="input" type="number" value={formData.discount_percent}
                  onChange={(e) => setFormData(f => ({ ...f, discount_percent: parseInt(e.target.value) || 0 }))} />
              </div>
              <div className="form-group">
                <label>Discount Fixed (UZS)</label>
                <input className="input" type="number" value={formData.discount_fixed}
                  onChange={(e) => setFormData(f => ({ ...f, discount_fixed: parseInt(e.target.value) || 0 }))} />
              </div>
              <div className="form-group">
                <label>Min Purchase</label>
                <input className="input" type="number" value={formData.min_purchase}
                  onChange={(e) => setFormData(f => ({ ...f, min_purchase: parseInt(e.target.value) || 0 }))} />
              </div>
              <div className="form-group">
                <label>Max Uses Total</label>
                <input className="input" type="number" value={formData.max_uses_total} placeholder="Unlimited"
                  onChange={(e) => setFormData(f => ({ ...f, max_uses_total: e.target.value }))} />
              </div>
              <div className="form-group">
                <label>Max Uses Per User</label>
                <input className="input" type="number" value={formData.max_uses_per_user}
                  onChange={(e) => setFormData(f => ({ ...f, max_uses_per_user: parseInt(e.target.value) || 1 }))} />
              </div>
              <div className="form-group">
                <label>Valid From</label>
                <input className="input" type="datetime-local" value={formData.valid_from}
                  onChange={(e) => setFormData(f => ({ ...f, valid_from: e.target.value }))} />
              </div>
              <div className="form-group">
                <label>Valid Until</label>
                <input className="input" type="datetime-local" value={formData.valid_until}
                  onChange={(e) => setFormData(f => ({ ...f, valid_until: e.target.value }))} />
              </div>
              <div className="form-group" style={{ display: 'flex', alignItems: 'end' }}>
                <label style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
                  <input type="checkbox" checked={formData.is_active}
                    onChange={(e) => setFormData(f => ({ ...f, is_active: e.target.checked }))} />
                  Active
                </label>
              </div>
            </div>
            <div style={{ display: 'flex', gap: '8px', marginTop: '12px' }}>
              <button type="submit" className="btn btn-primary">{editId ? 'Update' : 'Create'}</button>
              <button type="button" className="btn btn-secondary" onClick={() => { setShowForm(false); setEditId(null); }}>Cancel</button>
            </div>
          </form>
        )}

        {isLoading ? <div className="loading-spinner" /> : (
          <div className="admin-table-wrapper">
            <table className="admin-table">
              <thead>
                <tr>
                  <th>Code</th>
                  <th>Discount</th>
                  <th>Min Purchase</th>
                  <th>Uses</th>
                  <th>Valid</th>
                  <th>Status</th>
                  <th>Actions</th>
                </tr>
              </thead>
              <tbody>
                {promos.map((promo) => (
                  <tr key={promo.id}>
                    <td><code style={{ fontWeight: 'bold' }}>{promo.code}</code></td>
                    <td>
                      {promo.discount_percent > 0 && `${promo.discount_percent}%`}
                      {promo.discount_fixed > 0 && ` ${Number(promo.discount_fixed).toLocaleString()} UZS`}
                    </td>
                    <td>{Number(promo.min_purchase || 0).toLocaleString()} UZS</td>
                    <td>{promo.max_uses_total || 'Unlimited'} / user: {promo.max_uses_per_user}</td>
                    <td style={{ fontSize: '12px' }}>
                      {promo.valid_from && <div>From: {new Date(promo.valid_from).toLocaleDateString()}</div>}
                      {promo.valid_until && <div>To: {new Date(promo.valid_until).toLocaleDateString()}</div>}
                    </td>
                    <td>
                      <span className={`badge ${promo.is_active ? 'badge-green' : 'badge-red'}`}>
                        {promo.is_active ? 'Active' : 'Inactive'}
                      </span>
                    </td>
                    <td>
                      <div style={{ display: 'flex', gap: '6px' }}>
                        <button className="btn btn-sm btn-secondary" onClick={() => handleEdit(promo)}>Edit</button>
                        <button className="btn btn-sm btn-danger" onClick={() => handleDelete(promo.id)}>Delete</button>
                      </div>
                    </td>
                  </tr>
                ))}
                {promos.length === 0 && (
                  <tr><td colSpan="7" style={{ textAlign: 'center' }}>No promo codes</td></tr>
                )}
              </tbody>
            </table>
          </div>
        )}
      </div>
    </AdminLayout>
  );
}
