import { useState } from 'react'
import { useParams, Link } from 'react-router-dom'
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query'
import apiClient from '../lib/apiClient'
import { useAuth } from '../context/AuthContext'
import { useLanguage } from '../context/LanguageContext'

const STATUS_STEPS = ['paid', 'delivered', 'confirmed']

const STATUS_ICONS = {
  pending_payment: '\u23F3',
  paid: '\uD83D\uDCB0',
  delivered: '\uD83D\uDCE6',
  confirmed: '\u2705',
  disputed: '\u26A0\uFE0F',
  refunded: '\u21A9\uFE0F',
  cancelled: '\u274C',
}

function Timeline({ status, tradeStatus, t }) {
  // Yangi 5 bosqichli timeline
  const steps = [
    { key: 'paid', label: t('trade.status_paid') || "To'langan" },
    { key: 'buyer_confirm', label: t('trade.buyer_confirmed') || 'Haridor tasdiqladi' },
    { key: 'seller_confirm', label: t('trade.seller_confirmed') || 'Sotuvchi tasdiqladi' },
    { key: 'verification', label: t('trade.verification_required') || 'Verifikatsiya' },
    { key: 'funds', label: t('trade.funds_released') || "Pul o'tkazildi" },
  ]

  const getStepStatus = (key) => {
    if (status === 'confirmed') return 'done'
    if (key === 'paid') return status !== 'pending_payment' ? 'done' : 'pending'
    if (key === 'buyer_confirm') return tradeStatus?.buyer_confirmed ? 'done' : 'pending'
    if (key === 'seller_confirm') return tradeStatus?.seller_confirmed ? 'done' : 'pending'
    if (key === 'verification') {
      if (status === 'confirmed') return 'done'
      if (tradeStatus?.both_confirmed) return 'active'
      return 'pending'
    }
    if (key === 'funds') return status === 'confirmed' ? 'done' : 'pending'
    return 'pending'
  }

  return (
    <div style={{ display: 'flex', alignItems: 'center', gap: 0, marginBottom: 32, overflowX: 'auto' }}>
      {steps.map((step, i) => {
        const s = getStepStatus(step.key)
        const isDone = s === 'done'
        const isActive = s === 'active'
        return (
          <div key={step.key} style={{ display: 'flex', alignItems: 'center', flex: i < steps.length - 1 ? 1 : 'none' }}>
            <div style={{
              width: 32, height: 32, borderRadius: '50%', display: 'flex', alignItems: 'center', justifyContent: 'center',
              background: isDone ? 'var(--color-accent-blue)' : isActive ? 'var(--color-warning-text)' : 'var(--color-bg-tertiary)',
              color: isDone || isActive ? '#fff' : 'var(--color-text-secondary)',
              fontWeight: 700, fontSize: 12, flexShrink: 0,
              border: `2px solid ${isDone ? 'var(--color-accent-blue)' : isActive ? 'var(--color-warning-text)' : 'var(--color-border-default)'}`,
            }}>
              {isDone ? '\u2713' : i + 1}
            </div>
            <div style={{ marginLeft: 6, marginRight: 6, fontSize: 11, color: isDone ? 'var(--color-text-primary)' : 'var(--color-text-secondary)', whiteSpace: 'nowrap' }}>
              {step.label}
            </div>
            {i < steps.length - 1 && (
              <div style={{ flex: 1, height: 2, background: isDone ? 'var(--color-accent-blue)' : 'var(--color-border-default)', margin: '0 4px', minWidth: 12 }} />
            )}
          </div>
        )
      })}
    </div>
  )
}

function ConfirmationBadge({ confirmed, cancelled, label }) {
  if (confirmed) return <span className="badge-green" style={{ fontSize: 12, padding: '2px 8px', borderRadius: 6 }}>{'\u2705'} {label}</span>
  if (cancelled) return <span className="badge-red" style={{ fontSize: 12, padding: '2px 8px', borderRadius: 6 }}>{'\u274C'} Bekor qildi</span>
  return <span className="badge-yellow" style={{ fontSize: 12, padding: '2px 8px', borderRadius: 6 }}>{'\u23F3'} Kutilmoqda</span>
}

export default function TradePage() {
  const { escrowId } = useParams()
  const { user } = useAuth()
  const { t } = useLanguage()
  const queryClient = useQueryClient()
  const [disputeReason, setDisputeReason] = useState('')
  const [showDisputeForm, setShowDisputeForm] = useState(false)
  const [cancelReason, setCancelReason] = useState('')
  const [showCancelForm, setShowCancelForm] = useState(false)
  const [mutationError, setMutationError] = useState('')

  const statusLabels = {
    pending_payment: t('trade.status_pending_payment') || "To'lov kutilmoqda",
    paid: t('trade.status_paid') || "To'langan",
    delivered: t('trade.status_delivered') || 'Akkaunt topshirildi',
    confirmed: t('trade.status_confirmed') || 'Savdo yakunlandi',
    disputed: t('trade.status_disputed') || 'Nizo ochilgan',
    refunded: t('trade.status_refunded') || 'Pul qaytarildi',
    cancelled: t('trade.status_cancelled') || 'Bekor qilingan',
  }

  const { data: escrow, isLoading, error } = useQuery({
    queryKey: ['trade', escrowId],
    queryFn: () => apiClient.get(`/payments/escrow/${escrowId}/`).then(r => r.data?.data || r.data),
    refetchInterval: 10000,
  })

  // Trade status — ikki tomonlama tasdiqlash holati
  const { data: tradeStatusResp } = useQuery({
    queryKey: ['trade-status', escrowId],
    queryFn: () => apiClient.get(`/payments/escrow/${escrowId}/trade-status/`).then(r => r.data?.data || r.data),
    refetchInterval: 10000,
    enabled: !!escrowId,
  })
  const tradeStatus = tradeStatusResp || {}

  const handleMutationError = (err) => {
    const msg = err?.response?.data?.error?.message || err?.response?.data?.message || t('trade.error_generic') || 'Xatolik yuz berdi'
    setMutationError(msg)
    setTimeout(() => setMutationError(''), 5000)
  }

  const invalidate = () => {
    queryClient.invalidateQueries({ queryKey: ['trade', escrowId] })
    queryClient.invalidateQueries({ queryKey: ['trade-status', escrowId] })
  }

  // Savdo tasdiqlash (sotuvchi)
  const sellerConfirm = useMutation({
    mutationFn: () => apiClient.post(`/payments/escrow/${escrowId}/seller-confirm-trade/`).then(r => r.data),
    onSuccess: invalidate,
    onError: handleMutationError,
  })

  // Savdo tasdiqlash (haridor)
  const buyerConfirm = useMutation({
    mutationFn: () => apiClient.post(`/payments/escrow/${escrowId}/buyer-confirm/`).then(r => r.data),
    onSuccess: invalidate,
    onError: handleMutationError,
  })

  // Savdo bekor qilish (sotuvchi)
  const sellerCancel = useMutation({
    mutationFn: (reason) => apiClient.post(`/payments/escrow/${escrowId}/seller-cancel/`, { reason }).then(r => r.data),
    onSuccess: () => { invalidate(); setShowCancelForm(false); setCancelReason('') },
    onError: handleMutationError,
  })

  // Savdo bekor qilish (haridor)
  const buyerCancel = useMutation({
    mutationFn: (reason) => apiClient.post(`/payments/escrow/${escrowId}/buyer-cancel/`, { reason }).then(r => r.data),
    onSuccess: () => { invalidate(); setShowCancelForm(false); setCancelReason('') },
    onError: handleMutationError,
  })

  // Nizo ochish (mavjud)
  const openDispute = useMutation({
    mutationFn: (reason) => apiClient.post(`/payments/escrow/${escrowId}/dispute/`, { reason }).then(r => r.data),
    onSuccess: () => { invalidate(); setShowDisputeForm(false); setDisputeReason('') },
    onError: handleMutationError,
  })

  // Akkauntni topshirdim (mavjud)
  const _deliverAccount = useMutation({
    mutationFn: () => apiClient.post(`/payments/escrow/${escrowId}/seller-confirm/`).then(r => r.data),
    onSuccess: invalidate,
    onError: handleMutationError,
  })

  if (isLoading) return (
    <div style={{ display: 'flex', justifyContent: 'center', alignItems: 'center', minHeight: 400 }}>
      <div style={{ color: 'var(--color-text-secondary)' }}>{t('common.loading') || 'Yuklanmoqda...'}</div>
    </div>
  )

  if (error || !escrow) return (
    <div style={{ display: 'flex', justifyContent: 'center', alignItems: 'center', minHeight: 400 }}>
      <div style={{ color: 'var(--color-error-text)' }}>{t('trade.not_found') || 'Savdo topilmadi'}</div>
    </div>
  )

  const isBuyer = user?.id === (escrow.buyer?.id || escrow.buyer)
  const isSeller = user?.id === (escrow.seller?.id || escrow.seller)
  const st = escrow.status
  const canConfirmOrCancel = ['paid', 'delivered'].includes(st)

  return (
    <div style={{ maxWidth: 800, margin: '0 auto', padding: '24px 16px' }}>
      {/* Error toast */}
      {mutationError && (
        <div style={{ background: 'rgba(239,68,68,0.1)', border: '1px solid var(--color-error-text)', borderRadius: 10, padding: 12, marginBottom: 16, color: 'var(--color-error-text)', fontSize: 14 }}>
          {mutationError}
        </div>
      )}

      {/* Header */}
      <div style={{ marginBottom: 24 }}>
        <Link to="/profile" style={{ color: 'var(--color-accent-blue)', textDecoration: 'none', fontSize: 14 }}>
          {'\u2190'} {t('trade.back_to_profile') || 'Profilga qaytish'}
        </Link>
        <h1 style={{ fontSize: 24, fontWeight: 700, color: 'var(--color-text-primary)', marginTop: 8 }}>
          {STATUS_ICONS[st]} {t('trade.title') || 'Savdo'} #{escrowId?.slice(0, 8)}
        </h1>
        <div style={{ color: 'var(--color-text-secondary)', fontSize: 14 }}>
          {statusLabels[st]}
        </div>
      </div>

      {/* Timeline */}
      {!['disputed', 'refunded', 'cancelled'].includes(st) && (
        <Timeline status={st} tradeStatus={tradeStatus} t={t} />
      )}

      {/* Status alerts */}
      {st === 'disputed' && (
        <div style={{ background: 'rgba(239,68,68,0.1)', border: '1px solid var(--color-error-text)', borderRadius: 10, padding: 16, marginBottom: 24, color: 'var(--color-error-text)' }}>
          {t('trade.alert_disputed') || "Bu savdo bo'yicha nizo ochilgan. Administrator ko'rib chiqmoqda."}
        </div>
      )}
      {st === 'confirmed' && (
        <div style={{ background: 'rgba(34,197,94,0.1)', border: '1px solid var(--color-success-text)', borderRadius: 10, padding: 16, marginBottom: 24, color: 'var(--color-success-text)' }}>
          {t('trade.alert_confirmed') || 'Savdo muvaffaqiyatli yakunlandi!'}
        </div>
      )}
      {st === 'refunded' && (
        <div style={{ background: 'rgba(168,85,247,0.1)', border: '1px solid #a855f7', borderRadius: 10, padding: 16, marginBottom: 24, color: '#a855f7' }}>
          {t('trade.alert_refunded') || 'Pul balansingizga qaytarildi.'}
        </div>
      )}

      {/* Ikki tomonlama tasdiqlash holati */}
      {canConfirmOrCancel && (
        <div style={{
          background: 'var(--color-bg-secondary)',
          border: '1px solid var(--color-border-default)',
          borderRadius: 12, padding: 16, marginBottom: 24,
        }}>
          <h3 style={{ fontSize: 15, fontWeight: 600, marginBottom: 12, color: 'var(--color-text-primary)' }}>
            {t('trade.confirmation_status') || 'Tasdiqlash holati'}
          </h3>
          <div style={{ display: 'flex', gap: 24 }}>
            <div>
              <div style={{ fontSize: 12, color: 'var(--color-text-secondary)', marginBottom: 4 }}>{t('trade.buyer') || 'Haridor'}</div>
              <ConfirmationBadge confirmed={tradeStatus.buyer_confirmed} cancelled={tradeStatus.buyer_cancelled} label={t('trade.confirmed_label') || 'Tasdiqladi'} />
            </div>
            <div>
              <div style={{ fontSize: 12, color: 'var(--color-text-secondary)', marginBottom: 4 }}>{t('trade.seller') || 'Sotuvchi'}</div>
              <ConfirmationBadge confirmed={tradeStatus.seller_confirmed} cancelled={tradeStatus.seller_cancelled} label={t('trade.confirmed_label') || 'Tasdiqladi'} />
            </div>
          </div>
        </div>
      )}

      <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 20, marginBottom: 24 }}>
        {/* Listing info */}
        <div style={{
          background: 'var(--color-bg-secondary)',
          border: '1px solid var(--color-border-default)',
          borderRadius: 12, padding: 20,
        }}>
          <h3 style={{ fontSize: 16, fontWeight: 600, marginBottom: 12, color: 'var(--color-text-primary)' }}>{t('trade.account') || 'Akkaunt'}</h3>
          <div style={{ fontWeight: 600, color: 'var(--color-text-primary)', marginBottom: 4 }}>
            {escrow.listing?.title || escrow.listing_title || '\u2014'}
          </div>
          {(escrow.listing?.game?.name || escrow.game_name) && (
            <div style={{ fontSize: 13, color: 'var(--color-text-secondary)', marginBottom: 8 }}>
              {escrow.listing?.game?.name || escrow.game_name}
            </div>
          )}
          <div style={{ fontSize: 20, fontWeight: 700, color: 'var(--color-accent-blue)' }}>
            {Number(escrow.amount).toLocaleString()} UZS
          </div>
          {escrow.commission_amount && (
            <div style={{ fontSize: 12, color: 'var(--color-text-secondary)' }}>
              {t('trade.commission') || 'Komissiya'}: {Number(escrow.commission_amount).toLocaleString()} UZS
            </div>
          )}
        </div>

        {/* Parties */}
        <div style={{
          background: 'var(--color-bg-secondary)',
          border: '1px solid var(--color-border-default)',
          borderRadius: 12, padding: 20,
        }}>
          <h3 style={{ fontSize: 16, fontWeight: 600, marginBottom: 12, color: 'var(--color-text-primary)' }}>{t('trade.participants') || 'Ishtirokchilar'}</h3>
          <div style={{ marginBottom: 12 }}>
            <div style={{ fontSize: 11, textTransform: 'uppercase', color: 'var(--color-text-secondary)', marginBottom: 4 }}>{t('trade.buyer') || 'Haridor'}</div>
            <div style={{ fontWeight: 500 }}>{escrow.buyer_name || escrow.buyer?.username || '\u2014'}</div>
          </div>
          <div>
            <div style={{ fontSize: 11, textTransform: 'uppercase', color: 'var(--color-text-secondary)', marginBottom: 4 }}>{t('trade.seller') || 'Sotuvchi'}</div>
            <div style={{ fontWeight: 500 }}>{escrow.seller_name || escrow.seller?.username || '\u2014'}</div>
          </div>
        </div>
      </div>

      {/* Action buttons */}
      <div style={{
        background: 'var(--color-bg-secondary)',
        border: '1px solid var(--color-border-default)',
        borderRadius: 12, padding: 20, marginBottom: 24,
      }}>
        <h3 style={{ fontSize: 16, fontWeight: 600, marginBottom: 16, color: 'var(--color-text-primary)' }}>{t('trade.actions') || 'Amallar'}</h3>

        <div style={{ display: 'flex', flexDirection: 'column', gap: 12 }}>

          {/* Sotuvchi: tasdiqlash va bekor qilish */}
          {isSeller && canConfirmOrCancel && !escrow.seller_confirmed && !escrow.seller_cancelled && (
            <div>
              <p style={{ color: 'var(--color-text-secondary)', fontSize: 14, marginBottom: 12 }}>
                {t('trade.seller_confirm_hint') || "Akkaunt ma'lumotlarini haridorga topshirganingizdan so'ng tasdiqlang."}
              </p>
              <div style={{ display: 'flex', gap: 12, flexWrap: 'wrap' }}>
                <button
                  className="btn btn-primary"
                  onClick={() => { if (window.confirm(t('trade.confirm_trade_question') || 'Savdoni tasdiqlaysizmi?')) sellerConfirm.mutate() }}
                  disabled={sellerConfirm.isPending}
                >
                  {sellerConfirm.isPending ? (t('common.sending') || 'Yuborilmoqda...') : (t('trade.confirm_button') || 'Tasdiqlash')}
                </button>
                <button className="btn btn-danger" onClick={() => setShowCancelForm(true)}>
                  {t('trade.cancel_button') || 'Bekor qilish'}
                </button>
              </div>
            </div>
          )}

          {/* Haridor: tasdiqlash va bekor qilish */}
          {isBuyer && canConfirmOrCancel && !escrow.buyer_confirmed && !escrow.buyer_cancelled && (
            <div>
              <p style={{ color: 'var(--color-text-secondary)', fontSize: 14, marginBottom: 12 }}>
                {t('trade.buyer_confirm_hint') || "Akkauntni tekshiring. Hammasi joyida bo'lsa — tasdiqlang."}
              </p>
              <div style={{ display: 'flex', gap: 12, flexWrap: 'wrap' }}>
                <button
                  className="btn btn-primary"
                  onClick={() => { if (window.confirm(t('trade.confirm_trade_question') || 'Savdoni tasdiqlaysizmi?')) buyerConfirm.mutate() }}
                  disabled={buyerConfirm.isPending}
                >
                  {buyerConfirm.isPending ? (t('common.sending') || 'Yuborilmoqda...') : (t('trade.confirm_button') || 'Tasdiqlash')}
                </button>
                <button className="btn btn-danger" onClick={() => setShowCancelForm(true)}>
                  {t('trade.cancel_button') || 'Bekor qilish'}
                </button>
                <button className="btn btn-warning" onClick={() => setShowDisputeForm(true)}>
                  {t('trade.btn_problem') || 'Muammo bor'}
                </button>
              </div>
            </div>
          )}

          {/* Chat link */}
          {escrow.chat_room_id && (
            <Link
              to={`/chat/${escrow.chat_room_id}`}
              className="btn btn-secondary"
              style={{ display: 'inline-block', textDecoration: 'none', textAlign: 'center' }}
            >
              {t('trade.open_chat') || 'Chatni ochish'}
            </Link>
          )}

          {/* Trade link */}
          {escrow.listing && (
            <Link
              to={`/account/${escrow.listing?.id || escrow.listing}`}
              className="btn btn-secondary"
              style={{ display: 'inline-block', textDecoration: 'none', textAlign: 'center' }}
            >
              {t('trade.view_listing') || "Akkauntni ko'rish"}
            </Link>
          )}

          {!isBuyer && !isSeller && (
            <div style={{ color: 'var(--color-text-secondary)', fontSize: 14 }}>
              {t('trade.not_participant') || 'Siz bu savdoning ishtirokchisi emassiz.'}
            </div>
          )}
        </div>
      </div>

      {/* Cancel form */}
      {showCancelForm && (
        <div style={{
          background: 'rgba(239,68,68,0.05)',
          border: '1px solid var(--color-error-text)',
          borderRadius: 12, padding: 20, marginBottom: 24,
        }}>
          <h3 style={{ color: 'var(--color-error-text)', marginBottom: 12 }}>{t('trade.cancel_title') || 'Savdoni bekor qilish'}</h3>
          <textarea
            className="input"
            rows={3}
            value={cancelReason}
            onChange={e => setCancelReason(e.target.value)}
            placeholder={t('trade.cancel_reason_placeholder') || 'Bekor qilish sababini kiriting...'}
            style={{ marginBottom: 12 }}
          />
          <div style={{ display: 'flex', gap: 12 }}>
            <button
              className="btn btn-danger"
              onClick={() => isSeller ? sellerCancel.mutate(cancelReason) : buyerCancel.mutate(cancelReason)}
              disabled={sellerCancel.isPending || buyerCancel.isPending}
            >
              {(sellerCancel.isPending || buyerCancel.isPending) ? (t('common.sending') || 'Yuborilmoqda...') : (t('trade.cancel_button') || 'Bekor qilish')}
            </button>
            <button className="btn btn-secondary" onClick={() => { setShowCancelForm(false); setCancelReason('') }}>
              {t('common.cancel') || 'Ortga'}
            </button>
          </div>
        </div>
      )}

      {/* Dispute form */}
      {showDisputeForm && (
        <div style={{
          background: 'rgba(239,68,68,0.05)',
          border: '1px solid var(--color-error-text)',
          borderRadius: 12, padding: 20, marginBottom: 24,
        }}>
          <h3 style={{ color: 'var(--color-error-text)', marginBottom: 12 }}>{t('trade.open_dispute') || 'Nizo ochish'}</h3>
          <textarea
            className="input"
            rows={4}
            value={disputeReason}
            onChange={e => setDisputeReason(e.target.value)}
            placeholder={t('trade.dispute_placeholder') || 'Muammoni batafsil tavsiflang...'}
            style={{ marginBottom: 12 }}
          />
          <div style={{ display: 'flex', gap: 12 }}>
            <button
              className="btn btn-danger"
              onClick={() => openDispute.mutate(disputeReason)}
              disabled={openDispute.isPending || !disputeReason.trim()}
            >
              {openDispute.isPending ? (t('common.sending') || 'Yuborilmoqda...') : (t('trade.btn_open_dispute') || 'Nizo ochish')}
            </button>
            <button className="btn btn-secondary" onClick={() => { setShowDisputeForm(false); setDisputeReason('') }}>
              {t('common.cancel') || 'Bekor qilish'}
            </button>
          </div>
        </div>
      )}
    </div>
  )
}
