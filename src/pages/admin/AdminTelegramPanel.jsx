import { useState } from 'react'
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query'
import apiClient from '../../lib/apiClient'
import { useLanguage } from '../../context/LanguageContext'

const TABS = ['overview', 'users', 'deposits', 'analytics']

function StatusBadge({ value, trueLabel, falseLabel, trueColor = 'badge-green', falseColor = 'badge-red' }) {
  return (
    <span className={`badge ${value ? trueColor : falseColor}`}>
      {value ? trueLabel : falseLabel}
    </span>
  )
}

function BarChart({ data, noDataText }) {
  if (!data || data.length === 0) return <div style={{ color: 'var(--color-text-secondary)' }}>{noDataText}</div>
  const max = Math.max(...data.map(d => d.count), 1)
  const width = 600
  const height = 200
  const barWidth = Math.max(4, Math.floor(width / data.length) - 2)
  return (
    <svg width="100%" viewBox={`0 0 ${width} ${height + 30}`} style={{ maxWidth: width }}>
      {data.map((d, i) => {
        const barH = Math.max(2, Math.floor((d.count / max) * height))
        const x = i * (width / data.length)
        const y = height - barH
        return (
          <g key={i}>
            <rect x={x} y={y} width={barWidth} height={barH} fill="var(--color-accent-blue)" rx={2} />
            {data.length <= 15 && (
              <text x={x + barWidth / 2} y={height + 16} textAnchor="middle" fontSize={10} fill="var(--color-text-secondary)">
                {d.date?.slice(5)}
              </text>
            )}
            <title>{d.date}: {d.count}</title>
          </g>
        )
      })}
    </svg>
  )
}

export default function AdminTelegramPanel() {
  const { t } = useLanguage()
  const [activeTab, setActiveTab] = useState('overview')
  const [userSearch, setUserSearch] = useState('')
  const [userStatus, setUserStatus] = useState('all')
  const [userDateFrom, setUserDateFrom] = useState('')
  const [userDateTo, setUserDateTo] = useState('')
  const [selectedUser, setSelectedUser] = useState(null)
  const [depositStatus, setDepositStatus] = useState('all')
  const [depositSearch, setDepositSearch] = useState('')
  const [depositAction, setDepositAction] = useState(null)
  const [regDateFrom, setRegDateFrom] = useState('')
  const [regDateTo, setRegDateTo] = useState('')
  const [screenshotUrl, setScreenshotUrl] = useState(null)
  const queryClient = useQueryClient()

  const tabLabels = {
    overview: t('admin_telegram.tabs.overview'),
    users: t('admin_telegram.tabs.users'),
    deposits: t('admin_telegram.tabs.deposits'),
    analytics: t('admin_telegram.tabs.analytics'),
  }

  const { data: stats } = useQuery({
    queryKey: ['admin-telegram-stats'],
    queryFn: () => apiClient.get('/admin-panel/telegram/stats/').then(r => r.data),
    refetchInterval: 60000,
  })

  const { data: usersData, isLoading: usersLoading } = useQuery({
    queryKey: ['admin-telegram-users', userSearch, userStatus, userDateFrom, userDateTo],
    queryFn: () => apiClient.get('/admin-panel/telegram/users/', {
      params: { search: userSearch, status: userStatus, date_from: userDateFrom, date_to: userDateTo }
    }).then(r => r.data),
    enabled: activeTab === 'users',
  })

  const { data: depositsData, isLoading: depositsLoading } = useQuery({
    queryKey: ['admin-deposits', depositStatus, depositSearch],
    queryFn: () => apiClient.get('/admin-panel/deposits/', {
      params: { status: depositStatus, search: depositSearch }
    }).then(r => r.data),
    enabled: activeTab === 'deposits',
  })

  const { data: depositStats } = useQuery({
    queryKey: ['admin-deposit-stats'],
    queryFn: () => apiClient.get('/admin-panel/deposits/stats/').then(r => r.data),
    enabled: activeTab === 'deposits',
    refetchInterval: 30000,
  })

  const { data: regData } = useQuery({
    queryKey: ['admin-registrations-by-date', regDateFrom, regDateTo],
    queryFn: () => apiClient.get('/admin-panel/telegram/registrations/by-date/', {
      params: { date_from: regDateFrom, date_to: regDateTo }
    }).then(r => r.data),
    enabled: activeTab === 'analytics',
  })

  const updateDeposit = useMutation({
    mutationFn: ({ id, data }) => apiClient.patch(`/admin-panel/deposits/${id}/`, data).then(r => r.data),
    onSuccess: () => {
      queryClient.invalidateQueries(['admin-deposits'])
      queryClient.invalidateQueries(['admin-deposit-stats'])
      setDepositAction(null)
    },
  })

  const updateUser = useMutation({
    mutationFn: ({ telegram_id, data }) => apiClient.patch(`/admin-panel/telegram/users/${telegram_id}/`, data).then(r => r.data),
    onSuccess: () => {
      queryClient.invalidateQueries(['admin-telegram-users'])
      setSelectedUser(null)
    },
  })

  const users = usersData?.results || usersData || []
  const deposits = depositsData?.results || depositsData || []

  return (
    <div className="admin-page">
      <div className="page-header">
        <h1 className="page-title">{t('admin_telegram.title')}</h1>
      </div>

      {/* Tabs */}
      <div className="tabs-nav" style={{ marginBottom: 24 }}>
        {TABS.map(tab => (
          <button
            key={tab}
            className={`tab-btn${activeTab === tab ? ' active' : ''}`}
            onClick={() => setActiveTab(tab)}
          >
            {tabLabels[tab]}
          </button>
        ))}
      </div>

      {/* OVERVIEW TAB */}
      {activeTab === 'overview' && (
        <div>
          <div className="stats-grid" style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(180px, 1fr))', gap: 16, marginBottom: 32 }}>
            {[
              { label: t('admin_telegram.stats.total_users'), value: stats?.total_bot_users ?? '\u2014', color: 'var(--color-accent-blue)' },
              { label: t('admin_telegram.stats.active_today'), value: stats?.active_today ?? '\u2014', color: 'var(--color-success-text)' },
              { label: t('admin_telegram.stats.registered'), value: stats?.registered_users ?? '\u2014', color: 'var(--color-accent-blue)' },
              { label: t('admin_telegram.stats.blocked'), value: stats?.blocked_users ?? '\u2014', color: 'var(--color-error-text)' },
              { label: t('admin_telegram.stats.new_today'), value: stats?.new_today ?? '\u2014', color: 'var(--color-success-text)' },
              { label: t('admin_telegram.stats.new_this_week'), value: stats?.new_this_week ?? '\u2014', color: 'var(--color-warning-text)' },
              { label: t('admin_telegram.stats.new_this_month'), value: stats?.new_this_month ?? '\u2014', color: 'var(--color-text-primary)' },
              { label: t('admin_telegram.stats.pending_registration'), value: stats?.pending_registration ?? '\u2014', color: 'var(--color-warning-text)' },
            ].map(s => (
              <div key={s.label} className="stat-card" style={{
                background: 'var(--color-bg-secondary)',
                border: '1px solid var(--color-border-default)',
                borderRadius: 12,
                padding: '16px 20px',
              }}>
                <div style={{ fontSize: 28, fontWeight: 700, color: s.color }}>{s.value}</div>
                <div style={{ fontSize: 13, color: 'var(--color-text-secondary)', marginTop: 4 }}>{s.label}</div>
              </div>
            ))}
          </div>
        </div>
      )}

      {/* USERS TAB */}
      {activeTab === 'users' && (
        <div>
          <div style={{ display: 'flex', gap: 12, marginBottom: 16, flexWrap: 'wrap' }}>
            <input
              className="input"
              placeholder={t('admin_telegram.search_placeholder')}
              value={userSearch}
              onChange={e => setUserSearch(e.target.value)}
              style={{ flex: 1, minWidth: 200 }}
            />
            <select className="input" value={userStatus} onChange={e => setUserStatus(e.target.value)} style={{ width: 160 }}>
              <option value="all">{t('admin_telegram.filter_all')}</option>
              <option value="active">{t('admin_telegram.filter_active')}</option>
              <option value="blocked">{t('admin_telegram.filter_blocked')}</option>
              <option value="registered">{t('admin_telegram.filter_registered')}</option>
            </select>
            <input type="date" className="input" value={userDateFrom} onChange={e => setUserDateFrom(e.target.value)} style={{ width: 150 }} />
            <input type="date" className="input" value={userDateTo} onChange={e => setUserDateTo(e.target.value)} style={{ width: 150 }} />
          </div>

          {usersLoading ? (
            <div style={{ color: 'var(--color-text-secondary)', padding: 20 }}>{t('admin_telegram.loading')}</div>
          ) : (
            <div style={{ overflowX: 'auto' }}>
              <table className="admin-table" style={{ width: '100%', borderCollapse: 'collapse' }}>
                <thead>
                  <tr>
                    <th>{t('admin_telegram.table.telegram_id')}</th>
                    <th>{t('admin_telegram.table.username')}</th>
                    <th>{t('admin_telegram.table.name')}</th>
                    <th>{t('admin_telegram.table.account')}</th>
                    <th>{t('admin_telegram.table.first_interaction')}</th>
                    <th>{t('admin_telegram.table.registration_date')}</th>
                    <th>{t('admin_telegram.table.otp_code')}</th>
                    <th>{t('admin_telegram.table.status')}</th>
                    <th></th>
                  </tr>
                </thead>
                <tbody>
                  {users.map(u => (
                    <tr key={u.telegram_id}>
                      <td><code>{u.telegram_id}</code></td>
                      <td>{u.telegram_username ? `@${u.telegram_username}` : '\u2014'}</td>
                      <td>{[u.telegram_first_name, u.telegram_last_name].filter(Boolean).join(' ') || '\u2014'}</td>
                      <td>{u.user_email || <span style={{ color: 'var(--color-text-secondary)' }}>\u2014</span>}</td>
                      <td>{u.first_interaction_at ? new Date(u.first_interaction_at).toLocaleDateString() : '\u2014'}</td>
                      <td>{u.registration_date ? new Date(u.registration_date).toLocaleDateString() : '\u2014'}</td>
                      <td><code>{u.registration_otp_code || '\u2014'}</code></td>
                      <td>
                        {u.is_blocked
                          ? <span className="badge badge-red">{t('admin_telegram.status_blocked')}</span>
                          : u.registration_completed
                            ? <span className="badge badge-green">{t('admin_telegram.status_registered')}</span>
                            : <span className="badge badge-orange">{t('admin_telegram.status_pending')}</span>
                        }
                      </td>
                      <td>
                        <button className="btn btn-sm btn-secondary" onClick={() => setSelectedUser(u)}>
                          {t('admin_telegram.details')}
                        </button>
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
              {users.length === 0 && (
                <div style={{ textAlign: 'center', padding: 40, color: 'var(--color-text-secondary)' }}>
                  {t('admin_telegram.no_users')}
                </div>
              )}
            </div>
          )}
        </div>
      )}

      {/* DEPOSITS TAB */}
      {activeTab === 'deposits' && (
        <div>
          {depositStats && (
            <div style={{ display: 'flex', gap: 16, marginBottom: 24, flexWrap: 'wrap' }}>
              {[
                { label: t('admin_telegram.deposit_stats.pending_count'), value: depositStats.pending_count, sub: `${(depositStats.pending_total_amount / 1000).toFixed(0)}K UZS`, color: 'var(--color-warning-text)' },
                { label: t('admin_telegram.deposit_stats.approved_today'), value: depositStats.approved_today_count, sub: `${(depositStats.approved_today_total / 1000).toFixed(0)}K UZS`, color: 'var(--color-success-text)' },
                { label: t('admin_telegram.deposit_stats.rejected_today'), value: depositStats.rejected_today_count, sub: '', color: 'var(--color-error-text)' },
              ].map(s => (
                <div key={s.label} style={{
                  background: 'var(--color-bg-secondary)',
                  border: '1px solid var(--color-border-default)',
                  borderRadius: 12, padding: '16px 24px', minWidth: 180,
                }}>
                  <div style={{ fontSize: 26, fontWeight: 700, color: s.color }}>{s.value}</div>
                  {s.sub && <div style={{ fontSize: 12, color: 'var(--color-text-secondary)' }}>{s.sub}</div>}
                  <div style={{ fontSize: 13, color: 'var(--color-text-secondary)', marginTop: 4 }}>{s.label}</div>
                </div>
              ))}
            </div>
          )}

          <div style={{ display: 'flex', gap: 12, marginBottom: 16, flexWrap: 'wrap' }}>
            <input
              className="input"
              placeholder={t('admin_telegram.search_placeholder')}
              value={depositSearch}
              onChange={e => setDepositSearch(e.target.value)}
              style={{ flex: 1, minWidth: 200 }}
            />
            <select className="input" value={depositStatus} onChange={e => setDepositStatus(e.target.value)} style={{ width: 160 }}>
              <option value="all">{t('admin_telegram.filter_all')}</option>
              <option value="pending">{t('admin_telegram.status_pending')}</option>
              <option value="approved">{t('admin_telegram.status_approved')}</option>
              <option value="rejected">{t('admin_telegram.status_rejected')}</option>
            </select>
          </div>

          {depositsLoading ? (
            <div style={{ color: 'var(--color-text-secondary)', padding: 20 }}>{t('admin_telegram.loading')}</div>
          ) : (
            <div style={{ overflowX: 'auto' }}>
              <table className="admin-table" style={{ width: '100%', borderCollapse: 'collapse' }}>
                <thead>
                  <tr>
                    <th>{t('admin_telegram.table.user')}</th>
                    <th>{t('admin_telegram.table.amount')}</th>
                    <th>{t('admin_telegram.table.screenshot')}</th>
                    <th>{t('admin_telegram.table.date')}</th>
                    <th>{t('admin_telegram.table.status')}</th>
                    <th>{t('admin_telegram.table.actions')}</th>
                  </tr>
                </thead>
                <tbody>
                  {deposits.map(d => (
                    <tr key={d.id}>
                      <td>
                        <div>{d.user_email || '\u2014'}</div>
                        <div style={{ fontSize: 12, color: 'var(--color-text-secondary)' }}>
                          {d.telegram_username ? `@${d.telegram_username}` : d.telegram_id}
                        </div>
                      </td>
                      <td style={{ fontWeight: 600 }}>{Number(d.amount).toLocaleString()} UZS</td>
                      <td>
                        {d.screenshot ? (
                          <button
                            className="btn btn-sm btn-secondary"
                            onClick={() => setScreenshotUrl(d.screenshot)}
                          >
                            {t('admin_telegram.open_screenshot')}
                          </button>
                        ) : '\u2014'}
                      </td>
                      <td>{d.sent_at ? new Date(d.sent_at).toLocaleString() : '\u2014'}</td>
                      <td>
                        {d.status === 'pending' && <span className="badge badge-orange">{t('admin_telegram.status_pending')}</span>}
                        {d.status === 'approved' && <span className="badge badge-green">{t('admin_telegram.status_approved')}</span>}
                        {d.status === 'rejected' && <span className="badge badge-red">{t('admin_telegram.status_rejected')}</span>}
                      </td>
                      <td>
                        {d.status === 'pending' && (
                          <div style={{ display: 'flex', gap: 8 }}>
                            <button
                              className="btn btn-sm btn-primary"
                              onClick={() => setDepositAction({ id: d.id, action: 'approve', amount: d.amount, note: '' })}
                            >
                              {t('admin_telegram.approve')}
                            </button>
                            <button
                              className="btn btn-sm btn-danger"
                              onClick={() => setDepositAction({ id: d.id, action: 'reject', amount: d.amount, note: '' })}
                            >
                              {t('admin_telegram.reject')}
                            </button>
                          </div>
                        )}
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
              {deposits.length === 0 && (
                <div style={{ textAlign: 'center', padding: 40, color: 'var(--color-text-secondary)' }}>
                  {t('admin_telegram.no_deposits')}
                </div>
              )}
            </div>
          )}
        </div>
      )}

      {/* ANALYTICS TAB */}
      {activeTab === 'analytics' && (
        <div>
          <div style={{ display: 'flex', gap: 12, marginBottom: 24, flexWrap: 'wrap', alignItems: 'center' }}>
            <label style={{ color: 'var(--color-text-secondary)' }}>{t('admin_telegram.from')}:</label>
            <input type="date" className="input" value={regDateFrom} onChange={e => setRegDateFrom(e.target.value)} style={{ width: 160 }} />
            <label style={{ color: 'var(--color-text-secondary)' }}>{t('admin_telegram.to')}:</label>
            <input type="date" className="input" value={regDateTo} onChange={e => setRegDateTo(e.target.value)} style={{ width: 160 }} />
          </div>

          <div style={{
            background: 'var(--color-bg-secondary)',
            border: '1px solid var(--color-border-default)',
            borderRadius: 12, padding: 24, marginBottom: 24,
          }}>
            <h3 style={{ marginBottom: 16, color: 'var(--color-text-primary)' }}>{t('admin_telegram.registrations_by_day')}</h3>
            <BarChart data={regData} noDataText={t('admin_telegram.no_data')} />
          </div>

          {regData && regData.length > 0 && (
            <table className="admin-table" style={{ width: '100%', borderCollapse: 'collapse' }}>
              <thead>
                <tr>
                  <th>{t('admin_telegram.table.date')}</th>
                  <th>{t('admin_telegram.table.registered_count')}</th>
                </tr>
              </thead>
              <tbody>
                {[...regData].reverse().map(r => (
                  <tr key={r.date}>
                    <td>{r.date}</td>
                    <td>{r.count}</td>
                  </tr>
                ))}
              </tbody>
            </table>
          )}
        </div>
      )}

      {/* USER DETAIL MODAL */}
      {selectedUser && (
        <div className="modal-overlay" onClick={() => setSelectedUser(null)}>
          <div className="modal" onClick={e => e.stopPropagation()} style={{ maxWidth: 500 }}>
            <div className="modal-header">
              <h3>{t('admin_telegram.user_detail_title')}</h3>
              <button className="modal-close" onClick={() => setSelectedUser(null)}>\u2715</button>
            </div>
            <div className="modal-body" style={{ display: 'flex', flexDirection: 'column', gap: 12 }}>
              <div><b>{t('admin_telegram.table.telegram_id')}:</b> <code>{selectedUser.telegram_id}</code></div>
              <div><b>{t('admin_telegram.table.username')}:</b> {selectedUser.telegram_username ? `@${selectedUser.telegram_username}` : '\u2014'}</div>
              <div><b>{t('admin_telegram.table.name')}:</b> {[selectedUser.telegram_first_name, selectedUser.telegram_last_name].filter(Boolean).join(' ') || '\u2014'}</div>
              <div><b>{t('admin_telegram.linked_account')}:</b> {selectedUser.user_email || '\u2014'}</div>
              <div><b>{t('admin_telegram.table.first_interaction')}:</b> {selectedUser.first_interaction_at ? new Date(selectedUser.first_interaction_at).toLocaleString() : '\u2014'}</div>
              <div><b>{t('admin_telegram.table.registration_date')}:</b> {selectedUser.registration_date ? new Date(selectedUser.registration_date).toLocaleString() : '\u2014'}</div>
              <div><b>{t('admin_telegram.table.otp_code')}:</b> <code>{selectedUser.registration_otp_code || '\u2014'}</code></div>
              <div><b>{t('admin_telegram.total_commands')}:</b> {selectedUser.total_commands_sent}</div>
              <div><b>{t('admin_telegram.table.status')}:</b> {selectedUser.is_blocked ? t('admin_telegram.status_blocked') : selectedUser.registration_completed ? t('admin_telegram.status_registered') : t('admin_telegram.status_pending')}</div>
            </div>
          </div>
        </div>
      )}

      {/* DEPOSIT ACTION MODAL */}
      {depositAction && (
        <div className="modal-overlay" onClick={() => setDepositAction(null)}>
          <div className="modal" onClick={e => e.stopPropagation()} style={{ maxWidth: 420 }}>
            <div className="modal-header">
              <h3>{depositAction.action === 'approve' ? t('admin_telegram.approve') : t('admin_telegram.reject')}</h3>
              <button className="modal-close" onClick={() => setDepositAction(null)}>\u2715</button>
            </div>
            <div className="modal-body" style={{ display: 'flex', flexDirection: 'column', gap: 16 }}>
              {depositAction.action === 'approve' && (
                <div>
                  <label className="form-label">{t('admin_telegram.deposit_amount')} (UZS)</label>
                  <input
                    className="input"
                    type="number"
                    value={depositAction.amount}
                    onChange={e => setDepositAction(prev => ({ ...prev, amount: e.target.value }))}
                  />
                </div>
              )}
              <div>
                <label className="form-label">{t('admin_telegram.admin_note')}</label>
                <textarea
                  className="input"
                  rows={3}
                  value={depositAction.note}
                  onChange={e => setDepositAction(prev => ({ ...prev, note: e.target.value }))}
                />
              </div>
              <div style={{ display: 'flex', gap: 12 }}>
                <button
                  className={`btn ${depositAction.action === 'approve' ? 'btn-primary' : 'btn-danger'}`}
                  onClick={() => updateDeposit.mutate({
                    id: depositAction.id,
                    data: {
                      status: depositAction.action === 'approve' ? 'approved' : 'rejected',
                      admin_note: depositAction.note,
                      ...(depositAction.action === 'approve' ? { amount: depositAction.amount } : {}),
                    }
                  })}
                  disabled={updateDeposit.isPending}
                >
                  {updateDeposit.isPending ? '...' : depositAction.action === 'approve' ? t('admin_telegram.approve') : t('admin_telegram.reject')}
                </button>
                <button className="btn btn-secondary" onClick={() => setDepositAction(null)}>{t('admin_telegram.cancel')}</button>
              </div>
            </div>
          </div>
        </div>
      )}

      {/* SCREENSHOT MODAL */}
      {screenshotUrl && (
        <div className="modal-overlay" onClick={() => setScreenshotUrl(null)}>
          <div className="modal" onClick={e => e.stopPropagation()} style={{ maxWidth: 600 }}>
            <div className="modal-header">
              <h3>{t('admin_telegram.screenshot_title')}</h3>
              <button className="modal-close" onClick={() => setScreenshotUrl(null)}>\u2715</button>
            </div>
            <div className="modal-body">
              <img src={screenshotUrl} alt="Screenshot" style={{ width: '100%', borderRadius: 8 }} />
            </div>
          </div>
        </div>
      )}
    </div>
  )
}
