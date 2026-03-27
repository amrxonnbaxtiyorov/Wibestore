import { useState } from 'react'
import { Link } from 'react-router-dom'
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query'
import apiClient from '../../lib/apiClient'
import { useLanguage } from '../../context/LanguageContext'

const STATUS_COLORS = {
  paid: 'badge-blue',
  delivered: 'badge-orange',
  confirmed: 'badge-green',
  disputed: 'badge-red',
  refunded: 'badge-purple',
  cancelled: 'badge-red',
}

const TABS = ['trades', 'verifications']

function TradeBadge({ status, statusLabels }) {
  return (
    <span className={`badge ${STATUS_COLORS[status] || 'badge-blue'}`}>
      {statusLabels[status] || status}
    </span>
  )
}

export default function AdminTradePanel() {
  const { t } = useLanguage()
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

  const statusLabels = {
    paid: t('admin_trades.filter_paid'),
    delivered: t('admin_trades.filter_delivered'),
    confirmed: t('admin_trades.filter_confirmed'),
    disputed: t('admin_trades.filter_disputed'),
    refunded: t('admin_trades.filter_refunded'),
    cancelled: t('trade.status_cancelled'),
  }

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
        <h1 className="page-title">{t('admin_trades.title')}</h1>
      </div>

      {/* Tabs */}
      <div className="tabs-nav" style={{ marginBottom: 24 }}>
        {TABS.map(tab => (
          <button
            key={tab}
            className={`tab-btn${activeTab === tab ? ' active' : ''}`}
            onClick={() => setActiveTab(tab)}
          >
            {tab === 'trades' ? t('admin_trades.tabs.trades') : t('admin_trades.tabs.verifications')}
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
                  { label: t('admin_trades.stats.active'), value: tradeStats.active_trades, color: 'var(--color-accent-blue)' },
                  { label: t('admin_trades.stats.pending_delivery'), value: tradeStats.pending_delivery, color: 'var(--color-warning-text)' },
                  { label: t('admin_trades.stats.disputed'), value: tradeStats.disputed, color: 'var(--color-error-text)' },
                  { label: t('admin_trades.stats.completed_today'), value: tradeStats.completed_today, color: 'var(--color-success-text)' },
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
                placeholder={t('admin_trades.search_placeholder')}
                value={tradeSearch}
                onChange={e => setTradeSearch(e.target.value)}
                style={{ flex: 1, minWidth: 200 }}
              />
              <select className="input" value={tradeStatus} onChange={e => setTradeStatus(e.target.value)} style={{ width: 160 }}>
                <option value="all">{t('admin_trades.filter_all')}</option>
                <option value="paid">{t('admin_trades.filter_paid')}</option>
                <option value="delivered">{t('admin_trades.filter_delivered')}</option>
                <option value="confirmed">{t('admin_trades.filter_confirmed')}</option>
                <option value="disputed">{t('admin_trades.filter_disputed')}</option>
                <option value="refunded">{t('admin_trades.filter_refunded')}</option>
              </select>
            </div>

            {tradesLoading ? (
              <div style={{ color: 'var(--color-text-secondary)', padding: 20 }}>{t('admin_trades.loading')}</div>
            ) : (
              <div style={{ overflowX: 'auto' }}>
                <table className="admin-table" style={{ width: '100%', borderCollapse: 'collapse' }}>
                  <thead>
                    <tr>
                      <th>Kod</th>
                      <th>{t('admin_trades.table.account')}</th>
                      <th>{t('admin_trades.table.buyer')}</th>
                      <th>{t('admin_trades.table.seller')}</th>
                      <th>{t('admin_trades.table.amount')}</th>
                      <th>{t('admin_trades.table.status')}</th>
                      <th>{t('admin_trades.table.date')}</th>
                      <th></th>
                    </tr>
                  </thead>
                  <tbody>
                    {trades.map(tr => (
                      <tr key={tr.id} style={{ cursor: 'pointer', background: selectedTrade?.id === tr.id ? 'var(--color-info-bg)' : '' }}
                        onClick={() => setSelectedTrade(tr)}>
                        <td>
                          <code style={{ fontSize: 12, fontWeight: 600, color: 'var(--color-text-accent)', whiteSpace: 'nowrap' }}>{tr.trade_code || '\u2014'}</code>
                        </td>
                        <td>
                          <Link to={`/account/${tr.listing_id}`} target="_blank" onClick={e => e.stopPropagation()} style={{ fontWeight: 500, color: 'var(--color-text-accent)', textDecoration: 'none' }} title="E'lonni saytda ko'rish">
                            {tr.listing_title || '\u2014'}
                          </Link>
                          <div style={{ fontSize: 12, color: 'var(--color-text-secondary)' }}>{tr.listing_game}</div>
                        </td>
                        <td>
                          <Link to={`/seller/${tr.buyer_id}`} target="_blank" onClick={e => e.stopPropagation()} style={{ color: 'var(--color-text-primary)', textDecoration: 'none' }} title="Xaridor profilini ko'rish">
                            {tr.buyer_username || tr.buyer_email}
                          </Link>
                          {tr.buyer_telegram && <div style={{ fontSize: 12, color: 'var(--color-accent-blue)' }}>@{tr.buyer_telegram}</div>}
                        </td>
                        <td>
                          <Link to={`/seller/${tr.seller_id}`} target="_blank" onClick={e => e.stopPropagation()} style={{ color: 'var(--color-text-primary)', textDecoration: 'none' }} title="Sotuvchi profilini ko'rish">
                            {tr.seller_username || tr.seller_email}
                          </Link>
                          {tr.seller_telegram && <div style={{ fontSize: 12, color: 'var(--color-accent-blue)' }}>@{tr.seller_telegram}</div>}
                        </td>
                        <td style={{ fontWeight: 600 }}>{Number(tr.amount).toLocaleString()} UZS</td>
                        <td><TradeBadge status={tr.status} statusLabels={statusLabels} /></td>
                        <td style={{ fontSize: 12 }}>{tr.created_at ? new Date(tr.created_at).toLocaleString() : '\u2014'}</td>
                        <td>
                          <button className="btn btn-sm btn-secondary" onClick={e => { e.stopPropagation(); setSelectedTrade(tr) }}>
                            {t('admin_trades.table.details')}
                          </button>
                        </td>
                      </tr>
                    ))}
                  </tbody>
                </table>
                {trades.length === 0 && (
                  <div style={{ textAlign: 'center', padding: 40, color: 'var(--color-text-secondary)' }}>{t('admin_trades.no_trades')}</div>
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
                <h3 style={{ color: 'var(--color-text-primary)' }}>{t('admin_trades.trade_details')}</h3>
                <button style={{ background: 'none', border: 'none', cursor: 'pointer', color: 'var(--color-text-secondary)', fontSize: 18 }} onClick={() => setSelectedTrade(null)}>{'\u2715'}</button>
              </div>

              <div style={{ marginBottom: 12, display: 'flex', alignItems: 'center', gap: 8, flexWrap: 'wrap' }}>
                <TradeBadge status={selectedTrade.status} statusLabels={statusLabels} />
                {selectedTrade.trade_code && (
                  <code style={{
                    fontSize: 13, fontWeight: 700, color: 'var(--color-text-accent)',
                    background: 'var(--color-info-bg)', padding: '3px 10px',
                    borderRadius: 'var(--radius-md)', border: '1px solid var(--color-border-accent)',
                  }}>
                    {selectedTrade.trade_code}
                  </code>
                )}
                <span style={{ fontSize: 12, color: 'var(--color-text-secondary)' }}>#{selectedTrade.id?.slice(0, 8)}</span>
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
                <div style={{ fontSize: 11, textTransform: 'uppercase', color: 'var(--color-text-secondary)', marginBottom: 6 }}>{t('admin_trades.buyer_info')}</div>
                <div style={{ fontWeight: 500 }}>{selectedTrade.buyer_username || selectedTrade.buyer_email}</div>
                <div style={{ fontSize: 13, color: 'var(--color-text-secondary)' }}>{selectedTrade.buyer_email}</div>
                {selectedTrade.buyer_phone && <div style={{ fontSize: 13 }}>{selectedTrade.buyer_phone}</div>}
                {selectedTrade.buyer_telegram && <div style={{ fontSize: 13, color: 'var(--color-accent-blue)' }}>@{selectedTrade.buyer_telegram}</div>}
              </div>

              <div style={{ marginBottom: 12 }}>
                <div style={{ fontSize: 11, textTransform: 'uppercase', color: 'var(--color-text-secondary)', marginBottom: 6 }}>{t('admin_trades.seller_info')}</div>
                <div style={{ fontWeight: 500 }}>{selectedTrade.seller_username || selectedTrade.seller_email}</div>
                <div style={{ fontSize: 13, color: 'var(--color-text-secondary)' }}>{selectedTrade.seller_email}</div>
                {selectedTrade.seller_phone && <div style={{ fontSize: 13 }}>{selectedTrade.seller_phone}</div>}
                {selectedTrade.seller_telegram && <div style={{ fontSize: 13, color: 'var(--color-accent-blue)' }}>@{selectedTrade.seller_telegram}</div>}
              </div>

              <hr style={{ border: 'none', borderTop: '1px solid var(--color-border-default)', margin: '12px 0' }} />

              <div style={{ marginBottom: 16 }}>
                <div style={{ fontSize: 11, textTransform: 'uppercase', color: 'var(--color-text-secondary)', marginBottom: 6 }}>{t('admin_trades.dates')}</div>
                <div style={{ fontSize: 13 }}>{selectedTrade.created_at ? new Date(selectedTrade.created_at).toLocaleString() : '\u2014'}</div>
                <div style={{ fontSize: 13 }}>{selectedTrade.updated_at ? new Date(selectedTrade.updated_at).toLocaleString() : '\u2014'}</div>
                {selectedTrade.chat_room_id && (
                  <div style={{ fontSize: 13, marginTop: 4 }}>
                    <a href="/amirxon/trade-chats" style={{ color: 'var(--color-accent-blue)' }}>{t('admin_trades.open_chat')}</a>
                  </div>
                )}
              </div>

              {/* Action buttons */}
              <div style={{ display: 'flex', flexDirection: 'column', gap: 8 }}>
                {['paid', 'delivered', 'disputed'].includes(selectedTrade.status) && (
                  <button
                    className="btn btn-primary"
                    onClick={() => { if (window.confirm(t('admin_trades.actions.complete') + '?')) completeTrade.mutate(selectedTrade.id) }}
                    disabled={completeTrade.isPending}
                  >
                    {t('admin_trades.actions.complete')}
                  </button>
                )}
                {['paid', 'delivered', 'disputed'].includes(selectedTrade.status) && (
                  <button
                    className="btn btn-danger"
                    onClick={() => { if (window.confirm(t('admin_trades.actions.refund') + '?')) refundTrade.mutate(selectedTrade.id) }}
                    disabled={refundTrade.isPending}
                  >
                    {t('admin_trades.actions.refund')}
                  </button>
                )}
                {selectedTrade.status === 'disputed' && (
                  <button
                    className="btn btn-secondary"
                    onClick={() => setShowResolve(true)}
                  >
                    {t('admin_trades.actions.resolve_dispute')}
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
              <option value="submitted">{t('admin_trades.verification_filter.submitted')}</option>
              <option value="pending">{t('admin_trades.verification_filter.pending')}</option>
              <option value="approved">{t('admin_trades.verification_filter.approved')}</option>
              <option value="rejected">{t('admin_trades.verification_filter.rejected')}</option>
            </select>
          </div>

          {verifsLoading ? (
            <div style={{ color: 'var(--color-text-secondary)', padding: 20 }}>{t('admin_trades.loading')}</div>
          ) : (
            <div style={{ overflowX: 'auto' }}>
              <table className="admin-table" style={{ width: '100%', borderCollapse: 'collapse' }}>
                <thead>
                  <tr>
                    <th>{t('admin_trades.table.seller')}</th>
                    <th>{t('admin_trades.table.account')}</th>
                    <th>{t('admin_trades.table.earnings')}</th>
                    <th>{t('admin_trades.table.status')}</th>
                    <th>{t('admin_trades.table.date')}</th>
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
                      <td>{v.listing_title || '\u2014'}</td>
                      <td style={{ fontWeight: 600 }}>{v.seller_earnings ? `${Number(v.seller_earnings).toLocaleString()} UZS` : '\u2014'}</td>
                      <td>
                        {v.status === 'submitted' && <span className="badge badge-orange">{t('admin_trades.verification_filter.submitted')}</span>}
                        {v.status === 'approved' && <span className="badge badge-green">{t('admin_trades.verification_filter.approved')}</span>}
                        {v.status === 'rejected' && <span className="badge badge-red">{t('admin_trades.verification_filter.rejected')}</span>}
                        {v.status === 'pending' && <span className="badge badge-blue">{t('admin_trades.verification_filter.pending')}</span>}
                      </td>
                      <td style={{ fontSize: 12 }}>{v.created_at ? new Date(v.created_at).toLocaleDateString() : '\u2014'}</td>
                      <td>
                        <button className="btn btn-sm btn-secondary" onClick={() => setSelectedVerif(v)}>
                          {t('admin_trades.table.check')}
                        </button>
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
              {verifs.length === 0 && (
                <div style={{ textAlign: 'center', padding: 40, color: 'var(--color-text-secondary)' }}>{t('admin_trades.no_verifications')}</div>
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
              <h3>{t('admin_trades.actions.resolve_dispute')}</h3>
              <button className="modal-close" onClick={() => setShowResolve(false)}>{'\u2715'}</button>
            </div>
            <div className="modal-body" style={{ display: 'flex', flexDirection: 'column', gap: 16 }}>
              <div>
                <label className="form-label">{t('admin_trades.actions.resolve_dispute')}</label>
                <select className="input" value={resolveWinner} onChange={e => setResolveWinner(e.target.value)}>
                  <option value="buyer">{t('admin_trades.table.buyer')} ({t('admin_trades.actions.refund')})</option>
                  <option value="seller">{t('admin_trades.table.seller')} ({t('admin_trades.actions.complete')})</option>
                </select>
              </div>
              <div>
                <label className="form-label">{t('admin_trades.note')}</label>
                <textarea className="input" rows={3} value={resolveNote} onChange={e => setResolveNote(e.target.value)} />
              </div>
              <div style={{ display: 'flex', gap: 12 }}>
                <button
                  className="btn btn-primary"
                  onClick={() => resolveDispute.mutate({ id: selectedTrade.id, winner: resolveWinner, note: resolveNote })}
                  disabled={resolveDispute.isPending}
                >
                  {resolveDispute.isPending ? '...' : t('admin_trades.confirm_action')}
                </button>
                <button className="btn btn-secondary" onClick={() => setShowResolve(false)}>{t('common.cancel') || 'Bekor qilish'}</button>
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
              <h3>{t('admin_trades.verification_detail')}</h3>
              <button className="modal-close" onClick={() => setSelectedVerif(null)}>{'\u2715'}</button>
            </div>
            <div className="modal-body" style={{ display: 'flex', flexDirection: 'column', gap: 12 }}>
              <div><b>{t('admin_trades.table.seller')}:</b> {selectedVerif.seller_username || selectedVerif.seller_email}</div>
              <div><b>Email:</b> {selectedVerif.seller_email}</div>
              <div><b>{t('admin_trades.table.account')}:</b> {selectedVerif.listing_title}</div>
              <div><b>{t('admin_trades.table.earnings')}:</b> {selectedVerif.seller_earnings ? `${Number(selectedVerif.seller_earnings).toLocaleString()} UZS` : '\u2014'}</div>
              <div><b>{t('admin_trades.full_name')}:</b> {selectedVerif.full_name || '\u2014'}</div>
              {selectedVerif.location_latitude && (
                <div>
                  <b>{t('admin_trades.location')}:</b>{' '}
                  <a href={`https://maps.google.com/?q=${selectedVerif.location_latitude},${selectedVerif.location_longitude}`} target="_blank" rel="noreferrer" style={{ color: 'var(--color-accent-blue)' }}>
                    {selectedVerif.location_latitude}, {selectedVerif.location_longitude}
                  </a>
                </div>
              )}
              {selectedVerif.passport_front_file_id && (
                <div><b>{t('admin_trades.passport_front')}:</b> <code style={{ fontSize: 11 }}>{selectedVerif.passport_front_file_id}</code></div>
              )}
              {selectedVerif.passport_back_file_id && (
                <div><b>{t('admin_trades.passport_back')}:</b> <code style={{ fontSize: 11 }}>{selectedVerif.passport_back_file_id}</code></div>
              )}
              {selectedVerif.circle_video_file_id && (
                <div><b>{t('admin_trades.video')}:</b> <code style={{ fontSize: 11 }}>{selectedVerif.circle_video_file_id}</code></div>
              )}

              {selectedVerif.status === 'submitted' && (
                <div style={{ display: 'flex', gap: 12, marginTop: 8 }}>
                  <button
                    className="btn btn-primary"
                    onClick={() => { if (window.confirm(t('admin_trades.actions.approve') + '?')) approveVerif.mutate(selectedVerif.id) }}
                    disabled={approveVerif.isPending}
                  >
                    {t('admin_trades.actions.approve')}
                  </button>
                  <button
                    className="btn btn-danger"
                    onClick={() => setShowRejectModal(true)}
                  >
                    {t('admin_trades.actions.reject')}
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
              <h3>{t('admin_trades.reject_reason')}</h3>
              <button className="modal-close" onClick={() => setShowRejectModal(false)}>{'\u2715'}</button>
            </div>
            <div className="modal-body" style={{ display: 'flex', flexDirection: 'column', gap: 16 }}>
              <div>
                <label className="form-label">{t('admin_trades.reject_reason')}</label>
                <textarea
                  className="input"
                  rows={4}
                  value={rejectReason}
                  onChange={e => setRejectReason(e.target.value)}
                  placeholder={t('admin_trades.reject_reason_placeholder')}
                />
              </div>
              <div style={{ display: 'flex', gap: 12 }}>
                <button
                  className="btn btn-danger"
                  onClick={() => rejectVerif.mutate({ id: selectedVerif.id, reason: rejectReason })}
                  disabled={rejectVerif.isPending || !rejectReason.trim()}
                >
                  {rejectVerif.isPending ? '...' : t('admin_trades.actions.reject')}
                </button>
                <button className="btn btn-secondary" onClick={() => setShowRejectModal(false)}>{t('common.cancel') || 'Bekor qilish'}</button>
              </div>
            </div>
          </div>
        </div>
      )}
    </div>
  )
}
