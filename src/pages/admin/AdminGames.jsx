import { useState } from 'react';
import { useAdminGames, useAdminCreateGame, useAdminUpdateGame, useAdminDeleteGame } from '../../hooks/useAdmin';
import AdminLayout from './AdminLayout';

export default function AdminGames() {
  const { data, isLoading } = useAdminGames();
  const createGame = useAdminCreateGame();
  const updateGame = useAdminUpdateGame();
  const deleteGame = useAdminDeleteGame();
  const [showForm, setShowForm] = useState(false);
  const [formData, setFormData] = useState({ name: '', description: '', icon: '', color: '#3B82F6', sort_order: 0 });
  const [editSlug, setEditSlug] = useState(null);

  const games = data?.results ?? data ?? [];

  const handleSubmit = async (e) => {
    e.preventDefault();
    if (editSlug) {
      await updateGame.mutateAsync({ slug: editSlug, data: formData });
    } else {
      await createGame.mutateAsync(formData);
    }
    setShowForm(false);
    setEditSlug(null);
    setFormData({ name: '', description: '', icon: '', color: '#3B82F6', sort_order: 0 });
  };

  const handleEdit = (game) => {
    setFormData({ name: game.name, description: game.description, icon: game.icon, color: game.color, sort_order: game.sort_order });
    setEditSlug(game.slug);
    setShowForm(true);
  };

  const handleDelete = async (slug) => {
    if (confirm('Delete this game?')) {
      await deleteGame.mutateAsync(slug);
    }
  };

  const handleToggle = async (game) => {
    await updateGame.mutateAsync({ slug: game.slug, data: { is_active: !game.is_active } });
  };

  return (
    <AdminLayout>
      <div className="admin-page">
        <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '20px' }}>
          <h1 className="admin-page-title">Games</h1>
          <button className="btn btn-primary" onClick={() => { setShowForm(true); setEditSlug(null); }}>
            + Add Game
          </button>
        </div>

        {showForm && (
          <form onSubmit={handleSubmit} className="card" style={{ marginBottom: '20px', padding: '20px' }}>
            <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '12px' }}>
              <div className="form-group">
                <label>Name</label>
                <input className="input" value={formData.name} required
                  onChange={(e) => setFormData(f => ({ ...f, name: e.target.value }))} />
              </div>
              <div className="form-group">
                <label>Icon (emoji)</label>
                <input className="input" value={formData.icon}
                  onChange={(e) => setFormData(f => ({ ...f, icon: e.target.value }))} />
              </div>
              <div className="form-group">
                <label>Color</label>
                <input type="color" value={formData.color}
                  onChange={(e) => setFormData(f => ({ ...f, color: e.target.value }))} />
              </div>
              <div className="form-group">
                <label>Sort Order</label>
                <input className="input" type="number" value={formData.sort_order}
                  onChange={(e) => setFormData(f => ({ ...f, sort_order: parseInt(e.target.value) || 0 }))} />
              </div>
              <div className="form-group" style={{ gridColumn: '1 / -1' }}>
                <label>Description</label>
                <textarea className="input" rows="2" value={formData.description}
                  onChange={(e) => setFormData(f => ({ ...f, description: e.target.value }))} />
              </div>
            </div>
            <div style={{ display: 'flex', gap: '8px', marginTop: '12px' }}>
              <button type="submit" className="btn btn-primary" disabled={createGame.isPending || updateGame.isPending}>
                {editSlug ? 'Update' : 'Create'}
              </button>
              <button type="button" className="btn btn-secondary" onClick={() => { setShowForm(false); setEditSlug(null); }}>
                Cancel
              </button>
            </div>
          </form>
        )}

        {isLoading ? <div className="loading-spinner" /> : (
          <div className="admin-table-wrapper">
            <table className="admin-table">
              <thead>
                <tr>
                  <th>Icon</th>
                  <th>Name</th>
                  <th>Slug</th>
                  <th>Active Listings</th>
                  <th>Status</th>
                  <th>Order</th>
                  <th>Actions</th>
                </tr>
              </thead>
              <tbody>
                {games.map((game) => (
                  <tr key={game.id}>
                    <td style={{ fontSize: '24px' }}>{game.icon}</td>
                    <td><strong>{game.name}</strong></td>
                    <td><code>{game.slug}</code></td>
                    <td>{game.active_listings_count ?? 0}</td>
                    <td>
                      <span className={`badge ${game.is_active ? 'badge-green' : 'badge-red'}`}>
                        {game.is_active ? 'Active' : 'Inactive'}
                      </span>
                    </td>
                    <td>{game.sort_order}</td>
                    <td>
                      <div style={{ display: 'flex', gap: '6px' }}>
                        <button className="btn btn-sm btn-secondary" onClick={() => handleEdit(game)}>Edit</button>
                        <button className="btn btn-sm btn-secondary" onClick={() => handleToggle(game)}>
                          {game.is_active ? 'Disable' : 'Enable'}
                        </button>
                        <button className="btn btn-sm btn-danger" onClick={() => handleDelete(game.slug)}>Delete</button>
                      </div>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        )}
      </div>
    </AdminLayout>
  );
}
