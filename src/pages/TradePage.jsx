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

function Timeline({ status, t }) {
  const activeIdx = STATUS_STEPS.indexOf(status)
  const stepLabels = {
    paid: t('trade.status_paid') || 'To\'langan',
    delivered: t('trade.status_delivered') || 'Akkaunt topshirildi',
    confirmed: t('trade.status_confirmed') || 'Savdo yakunlandi',
  }
  return (
    <div style={{ display: 'flex', alignItems: 'center', gap: 0, marginBottom: 32 }}>
      {STATUS_STEPS.map((step, i) => (
        <div key={step} style={{ display: 'flex', alignItems: 'center', flex: i < STATUS_STEPS.length - 1 ? 1 : 'none' }}>
          <div style={{
            width: 36, height: 36, borderRadius: '50%', display: 'flex', alignItems: 'center', justifyContent: 'center',
            background: i <= activeIdx ? 'var(--color-accent-blue)' : 'var(--color-bg-tertiary)',
            color: i <= activeIdx ? '#fff' : 'var(--color-text-secondary)',
            fontWeight: 700, fontSize: 14, flexShrink: 0,
            border: `2px solid ${i <= activeIdx ? 'var(--color-accent-blue)' : 'var(--color-border-default)'}`,
          }}>
            {i < activeIdx ? '\u2713' : i + 1}
          </div>
          <div style={{ marginLeft: 8, marginRight: 8, fontSize: 13, color: i <= activeIdx ? 'var(--color-text-primary)' : 'var(--color-text-secondary)', whiteSpace: 'nowrap' }}>
            {stepLabels[step]}
          </div>
          {i < STATUS_STEPS.length - 1 && (
            <div style={{ flex: 1, height: 2, background: i < activeIdx ? 'var(--color-accent-blue)' : 'var(--color-border-default)', margin: '0 4px' }} />
          )}
        </div>
      ))}
    </div>
  )
}

export default function TradePage() {
  const { escrowId } = useParams()
  const { user } = useAuth()
  const { t } = useLanguage()
  const queryClient = useQueryClient()
  const [disputeReason, setDisputeReason] = useState('')
  const [showDisputeForm, setShowDisputeForm] = useState(false)
  const [mutationError, setMutationError] = useState('')

  const statusLabels = {
    pending_payment: t('trade.status_pending_payment') || 'To\'lov kutilmoqda',
    paid: t('trade.status_paid') || 'To\'langan',
    delivered: t('trade.status_delivered') || 'Akkaunt topshirildi',
    confirmed: t('trade.status_confirmed') || 'Savdo yakunlandi',
    disputed: t('trade.status_disputed') || 'Nizo ochilgan',
    refunded: t('trade.status_refunded') || 'Pul qaytarildi',
    cancelled: t('trade.status_cancelled') || 'Bekor qilingan',
  }

  const { data: escrow, isLoading, error } = useQuery({
    queryKey: ['trade', escrowId],
    queryFn: () => apiClient.get(`/payments/escrow/${escrowId}/`).then(r => r.data?.data || r.data),
    refetchInterval: 30000,
  })

  const handleMutationError = (err) => {
    const msg = err?.response?.data?.message || err?.response?.data?.detail || t('trade.error_generic') || 'Xatolik yuz berdi'
    setMutationError(msg)
    setTimeout(() => setMutationError(''), 5000)
  }

  const confirmReceived = useMutation({
    mutationFn: () => apiClient.post(`/payments/escrow/${escrowId}/confirm/`).then(r => r.data),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['trade', escrowId] })
      setMutationError('')
    },
    onError: handleMutationError,
  })

  const openDispute = useMutation({
    mutationFn: (reason) => apiClient.post(`/payments/escrow/${escrowId}/dispute/`, { reason }).then(r => r.data),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['trade', escrowId] })
      setShowDisputeForm(false)
      setDisputeReason('')
      setMutationError('')
    },
    onError: handleMutationError,
  })

  const deliverAccount = useMutation({
    mutationFn: () => apiClient.post(`/payments/escrow/${escrowId}/deliver/`).then(r => r.data),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['trade', escrowId] })
      setMutationError('')
    },
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

  const isBuyer = user?.id === (escrow.buyer?.id || escrow.buyer_id)
  const isSeller = user?.id === (escrow.seller?.id || escrow.seller_id)
  const status = escrow.status

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
          \u2190 {t('trade.back_to_profile') || 'Profilga qaytish'}
        </Link>
        <h1 style={{ fontSize: 24, fontWeight: 700, color: 'var(--color-text-primary)', marginTop: 8 }}>
          {STATUS_ICONS[status]} {t('trade.title') || 'Savdo'} #{escrowId?.slice(0, 8)}
        </h1>
        <div style={{ color: 'var(--color-text-secondary)', fontSize: 14 }}>
          {statusLabels[status]}
        </div>
      </div>

      {/* Timeline */}
      {!['disputed', 'refunded', 'cancelled'].includes(status) && (
        <Timeline status={status} t={t} />
      )}

      {/* Status alert for special states */}
      {status === 'disputed' && (
        <div style={{ background: 'rgba(239,68,68,0.1)', border: '1px solid var(--color-error-text)', borderRadius: 10, padding: 16, marginBottom: 24, color: 'var(--color-error-text)' }}>
          {t('trade.alert_disputed') || 'Bu savdo bo\'yicha nizo ochilgan. Administrator vaziyatni ko\'rib chiqmoqda.'}
        </div>
      )}
      {status === 'confirmed' && (
        <div style={{ background: 'rgba(34,197,94,0.1)', border: '1px solid var(--color-success-text)', borderRadius: 10, padding: 16, marginBottom: 24, color: 'var(--color-success-text)' }}>
          {t('trade.alert_confirmed') || 'Savdo muvaffaqiyatli yakunlandi!'}
        </div>
      )}
      {status === 'refunded' && (
        <div style={{ background: 'rgba(168,85,247,0.1)', border: '1px solid #a855f7', borderRadius: 10, padding: 16, marginBottom: 24, color: '#a855f7' }}>
          {t('trade.alert_refunded') || 'Pul balansingizga qaytarildi.'}
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
            <div style={{ fontSize: 11, textTransform: 'uppercase', color: 'var(--color-text-secondary)', marginBottom: 4 }}>{t('trade.buyer') || 'Xaridor'}</div>
            <div style={{ fontWeight: 500 }}>{escrow.buyer?.username || escrow.buyer?.display_name || '\u2014'}</div>
          </div>
          <div>
            <div style={{ fontSize: 11, textTransform: 'uppercase', color: 'var(--color-text-secondary)', marginBottom: 4 }}>{t('trade.seller') || 'Sotuvchi'}</div>
            <div style={{ fontWeight: 500 }}>{escrow.seller?.username || escrow.seller?.display_name || '\u2014'}</div>
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
          {/* Seller actions */}
          {isSeller && status === 'paid' && (
            <div>
              <p style={{ color: 'var(--color-text-secondary)', fontSize: 14, marginBottom: 12 }}>
                {t('trade.seller_paid_hint') || 'Xaridor buyurtmani to\'ladi. Iltimos, akkaunt ma\'lumotlarini chat orqali yuboring.'}
              </p>
              <button
                className="btn btn-primary"
                onClick={() => { if (window.confirm(t('trade.confirm_deliver') || 'Akkauntni topshirganingizni tasdiqlaysizmi?')) deliverAccount.mutate() }}
                disabled={deliverAccount.isPending}
              >
                {deliverAccount.isPending ? (t('common.sending') || 'Yuborilmoqda...') : (t('trade.btn_delivered') || 'Akkauntni topshirdim')}
              </button>
            </div>
          )}

          {/* Buyer actions */}
          {isBuyer && status === 'delivered' && (
            <div>
              <p style={{ color: 'var(--color-text-secondary)', fontSize: 14, marginBottom: 12 }}>
                {t('trade.buyer_delivered_hint') || 'Sotuvchi akkaunt ma\'lumotlarini topshirdi. Tekshirib, qabul qilganingizni tasdiqlang.'}
              </p>
              <div style={{ display: 'flex', gap: 12, flexWrap: 'wrap' }}>
                <button
                  className="btn btn-primary"
                  onClick={() => { if (window.confirm(t('trade.confirm_received') || 'Akkauntni qabul qilganingizni tasdiqlaysizmi? Pul sotuvchiga o\'tkaziladi.')) confirmReceived.mutate() }}
                  disabled={confirmReceived.isPending}
                >
                  {confirmReceived.isPending ? (t('common.sending') || 'Yuborilmoqda...') : (t('trade.btn_received') || 'Akkaunt qabul qilindi')}
                </button>
                <button
                  className="btn btn-danger"
                  onClick={() => setShowDisputeForm(true)}
                >
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

          {!isBuyer && !isSeller && (
            <div style={{ color: 'var(--color-text-secondary)', fontSize: 14 }}>
              {t('trade.not_participant') || 'Siz bu savdoning ishtirokchisi emassiz.'}
            </div>
          )}
        </div>
      </div>

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
