import { useState } from 'react'
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query'
import apiClient from '../../lib/apiClient'

const TABS = ['overview', 'users', 'deposits', 'analytics']
const TAB_LABELS = {
  overview: 'Обзор',
  users: 'Пользователи бота',
  deposits: 'Пополнения',
  analytics: 'Аналитика регистраций',
}

function StatusBadge({ value, trueLabel = 'Да', falseLabel = 'Нет', trueColor = 'badge-green', falseColor = 'badge-red' }) {
  return (
    <span className={`badge ${value ? trueColor : falseColor}`}>
      {value ? trueLabel : falseLabel}
    </span>
  )
}

function BarChart({ data }) {
  if (!data || data.length === 0) return <div style={{ color: 'var(--color-text-secondary)' }}>Нет данных</div>
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
  const [activeTab, setActiveTab] = useState('overview')
  const [userSearch, setUserSearch] = useState('')
  const [userStatus, setUserStatus] = useState('all')
  const [userDateFrom, setUserDateFrom] = useState('')
  const [userDateTo, setUserDateTo] = useState('')
  const [selectedUser, setSelectedUser] = useState(null)
  const [depositStatus, setDepositStatus] = useState('all')
  const [depositSearch, setDepositSearch] = useState('')
  const [depositAction, setDepositAction] = useState(null) // { id, action: 'approve'|'reject', amount, note }
  const [regDateFrom, setRegDateFrom] = useState('')
  const [regDateTo, setRegDateTo] = useState('')
  const [screenshotUrl, setScreenshotUrl] = useState(null)
  const queryClient = useQueryClient()

  const { data: stats } = useQuery({
    queryKey: ['admin-telegram-stats'],
    queryFn: () => apiClient.get('/api/v1/admin-panel/telegram/stats/').then(r => r.data),
    refetchInterval: 60000,
  })

  const { data: usersData, isLoading: usersLoading } = useQuery({
    queryKey: ['admin-telegram-users', userSearch, userStatus, userDateFrom, userDateTo],
    queryFn: () => apiClient.get('/api/v1/admin-panel/telegram/users/', {
      params: { search: userSearch, status: userStatus, date_from: userDateFrom, date_to: userDateTo }
    }).then(r => r.data),
    enabled: activeTab === 'users',
  })

  const { data: depositsData, isLoading: depositsLoading } = useQuery({
    queryKey: ['admin-deposits', depositStatus, depositSearch],
    queryFn: () => apiClient.get('/api/v1/admin-panel/deposits/', {
      params: { status: depositStatus, search: depositSearch }
    }).then(r => r.data),
    enabled: activeTab === 'deposits',
  })

  const { data: depositStats } = useQuery({
    queryKey: ['admin-deposit-stats'],
    queryFn: () => apiClient.get('/api/v1/admin-panel/deposits/stats/').then(r => r.data),
    enabled: activeTab === 'deposits',
    refetchInterval: 30000,
  })

  const { data: regData } = useQuery({
    queryKey: ['admin-registrations-by-date', regDateFrom, regDateTo],
    queryFn: () => apiClient.get('/api/v1/admin-panel/telegram/registrations/by-date/', {
      params: { date_from: regDateFrom, date_to: regDateTo }
    }).then(r => r.data),
    enabled: activeTab === 'analytics',
  })

  const updateDeposit = useMutation({
    mutationFn: ({ id, data }) => apiClient.patch(`/api/v1/admin-panel/deposits/${id}/`, data).then(r => r.data),
    onSuccess: () => {
      queryClient.invalidateQueries(['admin-deposits'])
      queryClient.invalidateQueries(['admin-deposit-stats'])
      setDepositAction(null)
    },
  })

  const updateUser = useMutation({
    mutationFn: ({ telegram_id, data }) => apiClient.patch(`/api/v1/admin-panel/telegram/users/${telegram_id}/`, data).then(r => r.data),
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
        <h1 className="page-title">Telegram Bot</h1>
      </div>

      {/* Tabs */}
      <div className="tabs-nav" style={{ marginBottom: 24 }}>
        {TABS.map(tab => (
          <button
            key={tab}
            className={`tab-btn${activeTab === tab ? ' active' : ''}`}
            onClick={() => setActiveTab(tab)}
          >
            {TAB_LABELS[tab]}
          </button>
        ))}
      </div>

      {/* OVERVIEW TAB */}
      {activeTab === 'overview' && (
        <div>
          <div className="stats-grid" style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(180px, 1fr))', gap: 16, marginBottom: 32 }}>
            {[
              { label: 'Всего пользователей', value: stats?.total_bot_users ?? '—', color: 'var(--color-accent-blue)' },
              { label: 'Активны сегодня', value: stats?.active_today ?? '—', color: 'var(--color-success-text)' },
              { label: 'Зарегистрировались', value: stats?.registered_users ?? '—', color: 'var(--color-accent-blue)' },
              { label: 'Заблокировали бота', value: stats?.blocked_users ?? '—', color: 'var(--color-error-text)' },
              { label: 'Новых сегодня', value: stats?.new_today ?? '—', color: 'var(--color-success-text)' },
              { label: 'Новых за неделю', value: stats?.new_this_week ?? '—', color: 'var(--color-warning-text)' },
              { label: 'Новых за месяц', value: stats?.new_this_month ?? '—', color: 'var(--color-text-primary)' },
              { label: 'Ожидают регистрации', value: stats?.pending_registration ?? '—', color: 'var(--color-warning-text)' },
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
              placeholder="Поиск по username, имени, telegram_id..."
              value={userSearch}
              onChange={e => setUserSearch(e.target.value)}
              style={{ flex: 1, minWidth: 200 }}
            />
            <select className="input" value={userStatus} onChange={e => setUserStatus(e.target.value)} style={{ width: 160 }}>
              <option value="all">Все статусы</option>
              <option value="active">Активные</option>
              <option value="blocked">Заблокировали</option>
              <option value="registered">Зарегистрированы</option>
            </select>
            <input type="date" className="input" value={userDateFrom} onChange={e => setUserDateFrom(e.target.value)} style={{ width: 150 }} />
            <input type="date" className="input" value={userDateTo} onChange={e => setUserDateTo(e.target.value)} style={{ width: 150 }} />
          </div>

          {usersLoading ? (
            <div style={{ color: 'var(--color-text-secondary)', padding: 20 }}>Загрузка...</div>
          ) : (
            <div style={{ overflowX: 'auto' }}>
              <table className="admin-table" style={{ width: '100%', borderCollapse: 'collapse' }}>
                <thead>
                  <tr>
                    <th>Telegram ID</th>
                    <th>Username</th>
                    <th>Имя</th>
                    <th>Аккаунт</th>
                    <th>Первый вход</th>
                    <th>Регистрация</th>
                    <th>OTP код</th>
                    <th>Статус</th>
                    <th></th>
                  </tr>
                </thead>
                <tbody>
                  {users.map(u => (
                    <tr key={u.telegram_id}>
                      <td><code>{u.telegram_id}</code></td>
                      <td>{u.telegram_username ? `@${u.telegram_username}` : '—'}</td>
                      <td>{[u.telegram_first_name, u.telegram_last_name].filter(Boolean).join(' ') || '—'}</td>
                      <td>{u.user_email || <span style={{ color: 'var(--color-text-secondary)' }}>не связан</span>}</td>
                      <td>{u.first_interaction_at ? new Date(u.first_interaction_at).toLocaleDateString('ru') : '—'}</td>
                      <td>{u.registration_date ? new Date(u.registration_date).toLocaleDateString('ru') : '—'}</td>
                      <td><code>{u.registration_otp_code || '—'}</code></td>
                      <td>
                        {u.is_blocked
                          ? <span className="badge badge-red">Заблокировал</span>
                          : u.registration_completed
                            ? <span className="badge badge-green">Зарегистрирован</span>
                            : <span className="badge badge-orange">Ожидает</span>
                        }
                      </td>
                      <td>
                        <button className="btn btn-sm btn-secondary" onClick={() => setSelectedUser(u)}>
                          Подробнее
                        </button>
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
              {users.length === 0 && (
                <div style={{ textAlign: 'center', padding: 40, color: 'var(--color-text-secondary)' }}>
                  Нет пользователей
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
                { label: 'Ожидают подтверждения', value: depositStats.pending_count, sub: `${(depositStats.pending_total_amount / 1000).toFixed(0)}K UZS`, color: 'var(--color-warning-text)' },
                { label: 'Одобрено сегодня', value: depositStats.approved_today_count, sub: `${(depositStats.approved_today_total / 1000).toFixed(0)}K UZS`, color: 'var(--color-success-text)' },
                { label: 'Отклонено сегодня', value: depositStats.rejected_today_count, sub: '', color: 'var(--color-error-text)' },
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
              placeholder="Поиск..."
              value={depositSearch}
              onChange={e => setDepositSearch(e.target.value)}
              style={{ flex: 1, minWidth: 200 }}
            />
            <select className="input" value={depositStatus} onChange={e => setDepositStatus(e.target.value)} style={{ width: 160 }}>
              <option value="all">Все статусы</option>
              <option value="pending">Ожидают</option>
              <option value="approved">Одобрены</option>
              <option value="rejected">Отклонены</option>
            </select>
          </div>

          {depositsLoading ? (
            <div style={{ color: 'var(--color-text-secondary)', padding: 20 }}>Загрузка...</div>
          ) : (
            <div style={{ overflowX: 'auto' }}>
              <table className="admin-table" style={{ width: '100%', borderCollapse: 'collapse' }}>
                <thead>
                  <tr>
                    <th>Пользователь</th>
                    <th>Сумма</th>
                    <th>Скриншот</th>
                    <th>Дата</th>
                    <th>Статус</th>
                    <th>Действия</th>
                  </tr>
                </thead>
                <tbody>
                  {deposits.map(d => (
                    <tr key={d.id}>
                      <td>
                        <div>{d.user_email || '—'}</div>
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
                            📷 Открыть
                          </button>
                        ) : '—'}
                      </td>
                      <td>{d.sent_at ? new Date(d.sent_at).toLocaleString('ru') : '—'}</td>
                      <td>
                        {d.status === 'pending' && <span className="badge badge-orange">Ожидает</span>}
                        {d.status === 'approved' && <span className="badge badge-green">Одобрен</span>}
                        {d.status === 'rejected' && <span className="badge badge-red">Отклонён</span>}
                      </td>
                      <td>
                        {d.status === 'pending' && (
                          <div style={{ display: 'flex', gap: 8 }}>
                            <button
                              className="btn btn-sm btn-primary"
                              onClick={() => setDepositAction({ id: d.id, action: 'approve', amount: d.amount, note: '' })}
                            >
                              ✅ Одобрить
                            </button>
                            <button
                              className="btn btn-sm btn-danger"
                              onClick={() => setDepositAction({ id: d.id, action: 'reject', amount: d.amount, note: '' })}
                            >
                              ❌ Отклонить
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
                  Нет заявок
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
            <label style={{ color: 'var(--color-text-secondary)' }}>От:</label>
            <input type="date" className="input" value={regDateFrom} onChange={e => setRegDateFrom(e.target.value)} style={{ width: 160 }} />
            <label style={{ color: 'var(--color-text-secondary)' }}>До:</label>
            <input type="date" className="input" value={regDateTo} onChange={e => setRegDateTo(e.target.value)} style={{ width: 160 }} />
          </div>

          <div style={{
            background: 'var(--color-bg-secondary)',
            border: '1px solid var(--color-border-default)',
            borderRadius: 12, padding: 24, marginBottom: 24,
          }}>
            <h3 style={{ marginBottom: 16, color: 'var(--color-text-primary)' }}>Регистрации по дням</h3>
            <BarChart data={regData} />
          </div>

          {regData && regData.length > 0 && (
            <table className="admin-table" style={{ width: '100%', borderCollapse: 'collapse' }}>
              <thead>
                <tr>
                  <th>Дата</th>
                  <th>Зарегистрировались</th>
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
              <h3>Пользователь бота</h3>
              <button className="modal-close" onClick={() => setSelectedUser(null)}>✕</button>
            </div>
            <div className="modal-body" style={{ display: 'flex', flexDirection: 'column', gap: 12 }}>
              <div><b>Telegram ID:</b> <code>{selectedUser.telegram_id}</code></div>
              <div><b>Username:</b> {selectedUser.telegram_username ? `@${selectedUser.telegram_username}` : '—'}</div>
              <div><b>Имя:</b> {[selectedUser.telegram_first_name, selectedUser.telegram_last_name].filter(Boolean).join(' ') || '—'}</div>
              <div><b>Связанный аккаунт:</b> {selectedUser.user_email || 'не связан'}</div>
              <div><b>Первый вход:</b> {selectedUser.first_interaction_at ? new Date(selectedUser.first_interaction_at).toLocaleString('ru') : '—'}</div>
              <div><b>Последний вход:</b> {selectedUser.last_interaction_at ? new Date(selectedUser.last_interaction_at).toLocaleString('ru') : '—'}</div>
              <div><b>Дата регистрации:</b> {selectedUser.registration_date ? new Date(selectedUser.registration_date).toLocaleString('ru') : '—'}</div>
              <div><b>OTP код:</b> <code>{selectedUser.registration_otp_code || '—'}</code></div>
              <div><b>Команд отправлено:</b> {selectedUser.total_commands_sent}</div>
              <div><b>Статус:</b> {selectedUser.is_blocked ? '🚫 Заблокировал бота' : selectedUser.registration_completed ? '✅ Зарегистрирован' : '⏳ Ожидает'}</div>
            </div>
          </div>
        </div>
      )}

      {/* DEPOSIT ACTION MODAL */}
      {depositAction && (
        <div className="modal-overlay" onClick={() => setDepositAction(null)}>
          <div className="modal" onClick={e => e.stopPropagation()} style={{ maxWidth: 420 }}>
            <div className="modal-header">
              <h3>{depositAction.action === 'approve' ? '✅ Одобрить пополнение' : '❌ Отклонить пополнение'}</h3>
              <button className="modal-close" onClick={() => setDepositAction(null)}>✕</button>
            </div>
            <div className="modal-body" style={{ display: 'flex', flexDirection: 'column', gap: 16 }}>
              {depositAction.action === 'approve' && (
                <div>
                  <label className="form-label">Сумма (UZS)</label>
                  <input
                    className="input"
                    type="number"
                    value={depositAction.amount}
                    onChange={e => setDepositAction(prev => ({ ...prev, amount: e.target.value }))}
                  />
                </div>
              )}
              <div>
                <label className="form-label">Заметка администратора</label>
                <textarea
                  className="input"
                  rows={3}
                  value={depositAction.note}
                  onChange={e => setDepositAction(prev => ({ ...prev, note: e.target.value }))}
                  placeholder="Необязательно..."
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
                  {updateDeposit.isPending ? 'Сохранение...' : depositAction.action === 'approve' ? 'Одобрить' : 'Отклонить'}
                </button>
                <button className="btn btn-secondary" onClick={() => setDepositAction(null)}>Отмена</button>
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
              <h3>Скриншот пополнения</h3>
              <button className="modal-close" onClick={() => setScreenshotUrl(null)}>✕</button>
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
