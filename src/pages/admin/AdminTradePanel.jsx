import { useState } from 'react'
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query'
import apiClient from '../../lib/apiClient'

const STATUS_LABELS = {
  paid: 'Оплачено',
  delivered: 'Передано',
  confirmed: 'Подтверждено',
  disputed: 'Спор',
  refunded: 'Возврат',
  cancelled: 'Отменено',
}

const STATUS_COLORS = {
  paid: 'badge-blue',
  delivered: 'badge-orange',
  confirmed: 'badge-green',
  disputed: 'badge-red',
  refunded: 'badge-purple',
  cancelled: 'badge-red',
}

function TradeBadge({ status }) {
  return (
    <span className={`badge ${STATUS_COLORS[status] || 'badge-blue'}`}>
      {STATUS_LABELS[status] || status}
    </span>
  )
}

const TABS = ['trades', 'verifications']
const TAB_LABELS = { trades: 'Все сделки', verifications: 'Верификации продавцов' }

export default function AdminTradePanel() {
  const [activeTab, setActiveTab] = useState('trades')
  const [tradeStatus, setTradeStatus] = useState('all')
  const [tradeSearch, setTradeSearch] = useState('')
  const [selectedTrade, setSelectedTrade] = useState(null)
  const [resolveWinner, setResolveWinner] = useState('buyer')
  const [resolveNote, setResolveNote] = useState('')
  const [showResolve, setShowResolve] = useState(false)
  const [selectedVerif, setSelectedVerif] = useState(null)
  const [rejectReason, setRejectReason] = useState('')
  const [showRejectModal, setShowRejectModal] = useState(false)
  const [verifStatus, setVerifStatus] = useState('submitted')
  const queryClient = useQueryClient()

  const { data: tradeStats } = useQuery({
    queryKey: ['admin-trade-stats'],
    queryFn: () => apiClient.get('/api/v1/admin-panel/trades/stats/').then(r => r.data),
    refetchInterval: 30000,
  })

  const { data: tradesData, isLoading: tradesLoading } = useQuery({
    queryKey: ['admin-trades', tradeStatus, tradeSearch],
    queryFn: () => apiClient.get('/api/v1/admin-panel/trades/', {
      params: { status: tradeStatus, search: tradeSearch }
    }).then(r => r.data),
    enabled: activeTab === 'trades',
    refetchInterval: 30000,
  })

  const { data: verifsData, isLoading: verifsLoading } = useQuery({
    queryKey: ['admin-seller-verifs', verifStatus],
    queryFn: () => apiClient.get('/api/v1/admin-panel/seller-verifications/', {
      params: { status: verifStatus }
    }).then(r => r.data),
    enabled: activeTab === 'verifications',
  })

  const completeTrade = useMutation({
    mutationFn: (id) => apiClient.post(`/api/v1/admin-panel/trades/${id}/complete/`).then(r => r.data),
    onSuccess: () => {
      queryClient.invalidateQueries(['admin-trades'])
      queryClient.invalidateQueries(['admin-trade-stats'])
      setSelectedTrade(null)
    },
  })

  const refundTrade = useMutation({
    mutationFn: (id) => apiClient.post(`/api/v1/admin-panel/trades/${id}/refund/`).then(r => r.data),
    onSuccess: () => {
      queryClient.invalidateQueries(['admin-trades'])
      queryClient.invalidateQueries(['admin-trade-stats'])
      setSelectedTrade(null)
    },
  })

  const resolveDispute = useMutation({
    mutationFn: ({ id, winner, note }) => apiClient.post(`/api/v1/admin-panel/trades/${id}/resolve-dispute/`, { winner, note }).then(r => r.data),
    onSuccess: () => {
      queryClient.invalidateQueries(['admin-trades'])
      setSelectedTrade(null)
      setShowResolve(false)
    },
  })

  const approveVerif = useMutation({
    mutationFn: (id) => apiClient.post(`/api/v1/admin-panel/seller-verifications/${id}/approve/`).then(r => r.data),
    onSuccess: () => {
      queryClient.invalidateQueries(['admin-seller-verifs'])
      setSelectedVerif(null)
    },
  })

  const rejectVerif = useMutation({
    mutationFn: ({ id, reason }) => apiClient.post(`/api/v1/admin-panel/seller-verifications/${id}/reject/`, { reason }).then(r => r.data),
    onSuccess: () => {
      queryClient.invalidateQueries(['admin-seller-verifs'])
      setSelectedVerif(null)
      setShowRejectModal(false)
    },
  })

  const trades = tradesData?.results || tradesData || []
  const verifs = verifsData?.results || verifsData || []

  return (
    <div className="admin-page">
      <div className="page-header">
        <h1 className="page-title">Торговые сделки</h1>
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

      {/* TRADES TAB */}
      {activeTab === 'trades' && (
        <div style={{ display: 'flex', gap: 24 }}>
          {/* Left: list */}
          <div style={{ flex: 1, minWidth: 0 }}>
            {/* Stats */}
            {tradeStats && (
              <div style={{ display: 'flex', gap: 12, marginBottom: 20, flexWrap: 'wrap' }}>
                {[
                  { label: 'Активные', value: tradeStats.active_trades, color: 'var(--color-accent-blue)' },
                  { label: 'Ожидают передачи', value: tradeStats.pending_delivery, color: 'var(--color-warning-text)' },
                  { label: 'Споры', value: tradeStats.disputed, color: 'var(--color-error-text)' },
                  { label: 'Завершено сегодня', value: tradeStats.completed_today, color: 'var(--color-success-text)' },
                ].map(s => (
                  <div key={s.label} style={{
                    background: 'var(--color-bg-secondary)',
                    border: '1px solid var(--color-border-default)',
                    borderRadius: 10, padding: '12px 18px',
                  }}>
                    <div style={{ fontSize: 22, fontWeight: 700, color: s.color }}>{s.value}</div>
                    <div style={{ fontSize: 12, color: 'var(--color-text-secondary)' }}>{s.label}</div>
                  </div>
                ))}
              </div>
            )}

            {/* Filters */}
            <div style={{ display: 'flex', gap: 12, marginBottom: 16, flexWrap: 'wrap' }}>
              <input
                className="input"
                placeholder="Поиск по аккаунту, покупателю, продавцу..."
                value={tradeSearch}
                onChange={e => setTradeSearch(e.target.value)}
                style={{ flex: 1, minWidth: 200 }}
              />
              <select className="input" value={tradeStatus} onChange={e => setTradeStatus(e.target.value)} style={{ width: 160 }}>
                <option value="all">Все статусы</option>
                <option value="paid">Оплачено</option>
                <option value="delivered">Передано</option>
                <option value="confirmed">Подтверждено</option>
                <option value="disputed">Спор</option>
                <option value="refunded">Возврат</option>
              </select>
            </div>

            {tradesLoading ? (
              <div style={{ color: 'var(--color-text-secondary)', padding: 20 }}>Загрузка...</div>
            ) : (
              <div style={{ overflowX: 'auto' }}>
                <table className="admin-table" style={{ width: '100%', borderCollapse: 'collapse' }}>
                  <thead>
                    <tr>
                      <th>Аккаунт</th>
                      <th>Покупатель</th>
                      <th>Продавец</th>
                      <th>Сумма</th>
                      <th>Статус</th>
                      <th>Дата</th>
                      <th></th>
                    </tr>
                  </thead>
                  <tbody>
                    {trades.map(t => (
                      <tr key={t.id} style={{ cursor: 'pointer', background: selectedTrade?.id === t.id ? 'var(--color-info-bg)' : '' }}
                        onClick={() => setSelectedTrade(t)}>
                        <td>
                          <div style={{ fontWeight: 500 }}>{t.listing_title || '—'}</div>
                          <div style={{ fontSize: 12, color: 'var(--color-text-secondary)' }}>{t.listing_game}</div>
                        </td>
                        <td>
                          <div>{t.buyer_username || t.buyer_email}</div>
                          {t.buyer_telegram && <div style={{ fontSize: 12, color: 'var(--color-accent-blue)' }}>@{t.buyer_telegram}</div>}
                        </td>
                        <td>
                          <div>{t.seller_username || t.seller_email}</div>
                          {t.seller_telegram && <div style={{ fontSize: 12, color: 'var(--color-accent-blue)' }}>@{t.seller_telegram}</div>}
                        </td>
                        <td style={{ fontWeight: 600 }}>{Number(t.amount).toLocaleString()} UZS</td>
                        <td><TradeBadge status={t.status} /></td>
                        <td style={{ fontSize: 12 }}>{t.created_at ? new Date(t.created_at).toLocaleString('ru') : '—'}</td>
                        <td>
                          <button className="btn btn-sm btn-secondary" onClick={e => { e.stopPropagation(); setSelectedTrade(t) }}>
                            Детали
                          </button>
                        </td>
                      </tr>
                    ))}
                  </tbody>
                </table>
                {trades.length === 0 && (
                  <div style={{ textAlign: 'center', padding: 40, color: 'var(--color-text-secondary)' }}>Нет сделок</div>
                )}
              </div>
            )}
          </div>

          {/* Right: side panel */}
          {selectedTrade && (
            <div style={{
              width: 380, flexShrink: 0,
              background: 'var(--color-bg-secondary)',
              border: '1px solid var(--color-border-default)',
              borderRadius: 12, padding: 24,
              height: 'fit-content', position: 'sticky', top: 80,
            }}>
              <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: 20 }}>
                <h3 style={{ color: 'var(--color-text-primary)' }}>Детали сделки</h3>
                <button style={{ background: 'none', border: 'none', cursor: 'pointer', color: 'var(--color-text-secondary)', fontSize: 18 }} onClick={() => setSelectedTrade(null)}>✕</button>
              </div>

              <div style={{ marginBottom: 12 }}>
                <TradeBadge status={selectedTrade.status} />
                <span style={{ marginLeft: 8, fontSize: 12, color: 'var(--color-text-secondary)' }}>#{selectedTrade.id?.slice(0, 8)}</span>
              </div>

              <div style={{ marginBottom: 16 }}>
                <div style={{ fontWeight: 600, marginBottom: 4 }}>{selectedTrade.listing_title}</div>
                <div style={{ fontSize: 13, color: 'var(--color-text-secondary)' }}>{selectedTrade.listing_game}</div>
                <div style={{ fontSize: 18, fontWeight: 700, color: 'var(--color-accent-blue)', marginTop: 4 }}>
                  {Number(selectedTrade.amount).toLocaleString()} UZS
                </div>
              </div>

              <hr style={{ border: 'none', borderTop: '1px solid var(--color-border-default)', margin: '12px 0' }} />

              <div style={{ marginBottom: 12 }}>
                <div style={{ fontSize: 11, textTransform: 'uppercase', color: 'var(--color-text-secondary)', marginBottom: 6 }}>Покупатель</div>
                <div style={{ fontWeight: 500 }}>{selectedTrade.buyer_username || selectedTrade.buyer_email}</div>
                <div style={{ fontSize: 13, color: 'var(--color-text-secondary)' }}>{selectedTrade.buyer_email}</div>
                {selectedTrade.buyer_phone && <div style={{ fontSize: 13 }}>📞 {selectedTrade.buyer_phone}</div>}
                {selectedTrade.buyer_telegram && <div style={{ fontSize: 13, color: 'var(--color-accent-blue)' }}>@{selectedTrade.buyer_telegram}</div>}
              </div>

              <div style={{ marginBottom: 12 }}>
                <div style={{ fontSize: 11, textTransform: 'uppercase', color: 'var(--color-text-secondary)', marginBottom: 6 }}>Продавец</div>
                <div style={{ fontWeight: 500 }}>{selectedTrade.seller_username || selectedTrade.seller_email}</div>
                <div style={{ fontSize: 13, color: 'var(--color-text-secondary)' }}>{selectedTrade.seller_email}</div>
                {selectedTrade.seller_phone && <div style={{ fontSize: 13 }}>📞 {selectedTrade.seller_phone}</div>}
                {selectedTrade.seller_telegram && <div style={{ fontSize: 13, color: 'var(--color-accent-blue)' }}>@{selectedTrade.seller_telegram}</div>}
              </div>

              <hr style={{ border: 'none', borderTop: '1px solid var(--color-border-default)', margin: '12px 0' }} />

              <div style={{ marginBottom: 16 }}>
                <div style={{ fontSize: 11, textTransform: 'uppercase', color: 'var(--color-text-secondary)', marginBottom: 6 }}>Даты</div>
                <div style={{ fontSize: 13 }}>📅 Создана: {selectedTrade.created_at ? new Date(selectedTrade.created_at).toLocaleString('ru') : '—'}</div>
                <div style={{ fontSize: 13 }}>🔄 Обновлена: {selectedTrade.updated_at ? new Date(selectedTrade.updated_at).toLocaleString('ru') : '—'}</div>
                {selectedTrade.chat_room_id && (
                  <div style={{ fontSize: 13 }}>💬 Чат: <a href={`/admin/trade-chats`} style={{ color: 'var(--color-accent-blue)' }}>Открыть</a></div>
                )}
              </div>

              {/* Action buttons */}
              <div style={{ display: 'flex', flexDirection: 'column', gap: 8 }}>
                {['paid', 'delivered', 'disputed'].includes(selectedTrade.status) && (
                  <button
                    className="btn btn-primary"
                    onClick={() => { if (window.confirm('Завершить сделку в пользу продавца?')) completeTrade.mutate(selectedTrade.id) }}
                    disabled={completeTrade.isPending}
                  >
                    ✅ Завершить сделку
                  </button>
                )}
                {['paid', 'delivered', 'disputed'].includes(selectedTrade.status) && (
                  <button
                    className="btn btn-danger"
                    onClick={() => { if (window.confirm('Вернуть деньги покупателю?')) refundTrade.mutate(selectedTrade.id) }}
                    disabled={refundTrade.isPending}
                  >
                    ↩️ Вернуть деньги
                  </button>
                )}
                {selectedTrade.status === 'disputed' && (
                  <button
                    className="btn btn-secondary"
                    onClick={() => setShowResolve(true)}
                  >
                    ⚖️ Разрешить спор
                  </button>
                )}
              </div>
            </div>
          )}
        </div>
      )}

      {/* VERIFICATIONS TAB */}
      {activeTab === 'verifications' && (
        <div>
          <div style={{ display: 'flex', gap: 12, marginBottom: 16 }}>
            <select className="input" value={verifStatus} onChange={e => setVerifStatus(e.target.value)} style={{ width: 200 }}>
              <option value="submitted">Ожидают проверки</option>
              <option value="pending">На рассмотрении</option>
              <option value="approved">Одобрены</option>
              <option value="rejected">Отклонены</option>
            </select>
          </div>

          {verifsLoading ? (
            <div style={{ color: 'var(--color-text-secondary)', padding: 20 }}>Загрузка...</div>
          ) : (
            <div style={{ overflowX: 'auto' }}>
              <table className="admin-table" style={{ width: '100%', borderCollapse: 'collapse' }}>
                <thead>
                  <tr>
                    <th>Продавец</th>
                    <th>Аккаунт</th>
                    <th>Сумма к зачислению</th>
                    <th>Статус</th>
                    <th>Дата</th>
                    <th></th>
                  </tr>
                </thead>
                <tbody>
                  {verifs.map(v => (
                    <tr key={v.id}>
                      <td>
                        <div>{v.seller_username || v.seller_email}</div>
                        <div style={{ fontSize: 12, color: 'var(--color-text-secondary)' }}>{v.seller_email}</div>
                      </td>
                      <td>{v.listing_title || '—'}</td>
                      <td style={{ fontWeight: 600 }}>{v.seller_earnings ? `${Number(v.seller_earnings).toLocaleString()} UZS` : '—'}</td>
                      <td>
                        {v.status === 'submitted' && <span className="badge badge-orange">Ожидает</span>}
                        {v.status === 'approved' && <span className="badge badge-green">Одобрена</span>}
                        {v.status === 'rejected' && <span className="badge badge-red">Отклонена</span>}
                        {v.status === 'pending' && <span className="badge badge-blue">На рассмотрении</span>}
                      </td>
                      <td style={{ fontSize: 12 }}>{v.created_at ? new Date(v.created_at).toLocaleDateString('ru') : '—'}</td>
                      <td>
                        <button className="btn btn-sm btn-secondary" onClick={() => setSelectedVerif(v)}>
                          Проверить
                        </button>
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
              {verifs.length === 0 && (
                <div style={{ textAlign: 'center', padding: 40, color: 'var(--color-text-secondary)' }}>Нет верификаций</div>
              )}
            </div>
          )}
        </div>
      )}

      {/* RESOLVE DISPUTE MODAL */}
      {showResolve && selectedTrade && (
        <div className="modal-overlay" onClick={() => setShowResolve(false)}>
          <div className="modal" onClick={e => e.stopPropagation()} style={{ maxWidth: 420 }}>
            <div className="modal-header">
              <h3>⚖️ Разрешить спор</h3>
              <button className="modal-close" onClick={() => setShowResolve(false)}>✕</button>
            </div>
            <div className="modal-body" style={{ display: 'flex', flexDirection: 'column', gap: 16 }}>
              <div>
                <label className="form-label">Победитель спора</label>
                <select className="input" value={resolveWinner} onChange={e => setResolveWinner(e.target.value)}>
                  <option value="buyer">Покупатель (вернуть деньги)</option>
                  <option value="seller">Продавец (зачислить деньги)</option>
                </select>
              </div>
              <div>
                <label className="form-label">Примечание</label>
                <textarea className="input" rows={3} value={resolveNote} onChange={e => setResolveNote(e.target.value)} placeholder="Причина решения..." />
              </div>
              <div style={{ display: 'flex', gap: 12 }}>
                <button
                  className="btn btn-primary"
                  onClick={() => resolveDispute.mutate({ id: selectedTrade.id, winner: resolveWinner, note: resolveNote })}
                  disabled={resolveDispute.isPending}
                >
                  {resolveDispute.isPending ? 'Сохранение...' : 'Подтвердить'}
                </button>
                <button className="btn btn-secondary" onClick={() => setShowResolve(false)}>Отмена</button>
              </div>
            </div>
          </div>
        </div>
      )}

      {/* VERIFICATION DETAIL MODAL */}
      {selectedVerif && (
        <div className="modal-overlay" onClick={() => setSelectedVerif(null)}>
          <div className="modal" onClick={e => e.stopPropagation()} style={{ maxWidth: 600 }}>
            <div className="modal-header">
              <h3>Верификация продавца</h3>
              <button className="modal-close" onClick={() => setSelectedVerif(null)}>✕</button>
            </div>
            <div className="modal-body" style={{ display: 'flex', flexDirection: 'column', gap: 12 }}>
              <div><b>Продавец:</b> {selectedVerif.seller_username || selectedVerif.seller_email}</div>
              <div><b>Email:</b> {selectedVerif.seller_email}</div>
              <div><b>Аккаунт:</b> {selectedVerif.listing_title}</div>
              <div><b>Сумма к зачислению:</b> {selectedVerif.seller_earnings ? `${Number(selectedVerif.seller_earnings).toLocaleString()} UZS` : '—'}</div>
              <div><b>ФИО:</b> {selectedVerif.full_name || '—'}</div>
              {selectedVerif.location_lat && (
                <div>
                  <b>Локация:</b>{' '}
                  <a href={`https://maps.google.com/?q=${selectedVerif.location_lat},${selectedVerif.location_lng}`} target="_blank" rel="noreferrer" style={{ color: 'var(--color-accent-blue)' }}>
                    {selectedVerif.location_lat}, {selectedVerif.location_lng}
                  </a>
                </div>
              )}
              {selectedVerif.passport_front_file_id && (
                <div><b>Паспорт (лицевая):</b> <code style={{ fontSize: 11 }}>{selectedVerif.passport_front_file_id}</code></div>
              )}
              {selectedVerif.passport_back_file_id && (
                <div><b>Паспорт (обратная):</b> <code style={{ fontSize: 11 }}>{selectedVerif.passport_back_file_id}</code></div>
              )}
              {selectedVerif.circle_video_file_id && (
                <div><b>Видео:</b> <code style={{ fontSize: 11 }}>{selectedVerif.circle_video_file_id}</code></div>
              )}

              {selectedVerif.status === 'submitted' && (
                <div style={{ display: 'flex', gap: 12, marginTop: 8 }}>
                  <button
                    className="btn btn-primary"
                    onClick={() => { if (window.confirm('Одобрить и зачислить средства?')) approveVerif.mutate(selectedVerif.id) }}
                    disabled={approveVerif.isPending}
                  >
                    ✅ Одобрить и зачислить
                  </button>
                  <button
                    className="btn btn-danger"
                    onClick={() => setShowRejectModal(true)}
                  >
                    ❌ Отклонить
                  </button>
                </div>
              )}
            </div>
          </div>
        </div>
      )}

      {/* REJECT VERIFICATION MODAL */}
      {showRejectModal && selectedVerif && (
        <div className="modal-overlay" onClick={() => setShowRejectModal(false)}>
          <div className="modal" onClick={e => e.stopPropagation()} style={{ maxWidth: 400 }}>
            <div className="modal-header">
              <h3>Отклонить верификацию</h3>
              <button className="modal-close" onClick={() => setShowRejectModal(false)}>✕</button>
            </div>
            <div className="modal-body" style={{ display: 'flex', flexDirection: 'column', gap: 16 }}>
              <div>
                <label className="form-label">Причина отказа</label>
                <textarea
                  className="input"
                  rows={4}
                  value={rejectReason}
                  onChange={e => setRejectReason(e.target.value)}
                  placeholder="Укажите причину..."
                />
              </div>
              <div style={{ display: 'flex', gap: 12 }}>
                <button
                  className="btn btn-danger"
                  onClick={() => rejectVerif.mutate({ id: selectedVerif.id, reason: rejectReason })}
                  disabled={rejectVerif.isPending || !rejectReason.trim()}
                >
                  {rejectVerif.isPending ? 'Сохранение...' : 'Отклонить'}
                </button>
                <button className="btn btn-secondary" onClick={() => setShowRejectModal(false)}>Отмена</button>
              </div>
            </div>
          </div>
        </div>
      )}
    </div>
  )
}
