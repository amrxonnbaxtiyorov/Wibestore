import { useState } from 'react'
import { useParams, Link } from 'react-router-dom'
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query'
import apiClient from '../lib/apiClient'
import { useAuth } from '../context/AuthContext'

const STATUS_STEPS = ['paid', 'delivered', 'confirmed']
const STATUS_LABELS = {
  pending_payment: 'Ожидает оплаты',
  paid: 'Оплачено',
  delivered: 'Аккаунт передан',
  confirmed: 'Сделка завершена',
  disputed: 'Открыт спор',
  refunded: 'Деньги возвращены',
  cancelled: 'Отменено',
}

const STATUS_ICONS = {
  pending_payment: '⏳',
  paid: '💰',
  delivered: '📦',
  confirmed: '✅',
  disputed: '⚠️',
  refunded: '↩️',
  cancelled: '❌',
}

function Timeline({ status }) {
  const activeIdx = STATUS_STEPS.indexOf(status)
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
            {i < activeIdx ? '✓' : i + 1}
          </div>
          <div style={{ marginLeft: 8, marginRight: 8, fontSize: 13, color: i <= activeIdx ? 'var(--color-text-primary)' : 'var(--color-text-secondary)', whiteSpace: 'nowrap' }}>
            {STATUS_LABELS[step]}
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
  const queryClient = useQueryClient()
  const [disputeReason, setDisputeReason] = useState('')
  const [showDisputeForm, setShowDisputeForm] = useState(false)

  const { data: escrow, isLoading, error } = useQuery({
    queryKey: ['trade', escrowId],
    queryFn: () => apiClient.get(`/payments/escrow/${escrowId}/`).then(r => r.data?.data || r.data),
    refetchInterval: 30000,
  })

  const confirmReceived = useMutation({
    mutationFn: () => apiClient.post(`/payments/escrow/${escrowId}/confirm/`).then(r => r.data),
    onSuccess: () => queryClient.invalidateQueries({ queryKey: ['trade', escrowId] }),
  })

  const openDispute = useMutation({
    mutationFn: (reason) => apiClient.post(`/payments/escrow/${escrowId}/dispute/`, { reason }).then(r => r.data),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['trade', escrowId] })
      setShowDisputeForm(false)
    },
  })

  const deliverAccount = useMutation({
    mutationFn: () => apiClient.post(`/payments/escrow/${escrowId}/deliver/`).then(r => r.data),
    onSuccess: () => queryClient.invalidateQueries({ queryKey: ['trade', escrowId] }),
  })

  if (isLoading) return (
    <div style={{ display: 'flex', justifyContent: 'center', alignItems: 'center', minHeight: 400 }}>
      <div style={{ color: 'var(--color-text-secondary)' }}>Загрузка...</div>
    </div>
  )

  if (error || !escrow) return (
    <div style={{ display: 'flex', justifyContent: 'center', alignItems: 'center', minHeight: 400 }}>
      <div style={{ color: 'var(--color-error-text)' }}>Сделка не найдена</div>
    </div>
  )

  const isBuyer = user?.id === (escrow.buyer?.id || escrow.buyer_id)
  const isSeller = user?.id === (escrow.seller?.id || escrow.seller_id)
  const status = escrow.status

  return (
    <div style={{ maxWidth: 800, margin: '0 auto', padding: '24px 16px' }}>
      {/* Header */}
      <div style={{ marginBottom: 24 }}>
        <Link to="/profile" style={{ color: 'var(--color-accent-blue)', textDecoration: 'none', fontSize: 14 }}>
          ← Назад к профилю
        </Link>
        <h1 style={{ fontSize: 24, fontWeight: 700, color: 'var(--color-text-primary)', marginTop: 8 }}>
          {STATUS_ICONS[status]} Сделка #{escrowId?.slice(0, 8)}
        </h1>
        <div style={{ color: 'var(--color-text-secondary)', fontSize: 14 }}>
          {STATUS_LABELS[status]}
        </div>
      </div>

      {/* Timeline */}
      {!['disputed', 'refunded', 'cancelled'].includes(status) && (
        <Timeline status={status} />
      )}

      {/* Status alert for special states */}
      {status === 'disputed' && (
        <div style={{ background: 'rgba(239,68,68,0.1)', border: '1px solid var(--color-error-text)', borderRadius: 10, padding: 16, marginBottom: 24, color: 'var(--color-error-text)' }}>
          ⚠️ По этой сделке открыт спор. Администратор рассматривает ситуацию.
        </div>
      )}
      {status === 'confirmed' && (
        <div style={{ background: 'rgba(34,197,94,0.1)', border: '1px solid var(--color-success-text)', borderRadius: 10, padding: 16, marginBottom: 24, color: 'var(--color-success-text)' }}>
          ✅ Сделка успешно завершена!
        </div>
      )}
      {status === 'refunded' && (
        <div style={{ background: 'rgba(168,85,247,0.1)', border: '1px solid #a855f7', borderRadius: 10, padding: 16, marginBottom: 24, color: '#a855f7' }}>
          ↩️ Деньги возвращены на ваш баланс.
        </div>
      )}

      <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 20, marginBottom: 24 }}>
        {/* Listing info */}
        <div style={{
          background: 'var(--color-bg-secondary)',
          border: '1px solid var(--color-border-default)',
          borderRadius: 12, padding: 20,
        }}>
          <h3 style={{ fontSize: 16, fontWeight: 600, marginBottom: 12, color: 'var(--color-text-primary)' }}>📦 Аккаунт</h3>
          <div style={{ fontWeight: 600, color: 'var(--color-text-primary)', marginBottom: 4 }}>
            {escrow.listing?.title || escrow.listing_title || '—'}
          </div>
          {(escrow.listing?.game?.name || escrow.game_name) && (
            <div style={{ fontSize: 13, color: 'var(--color-text-secondary)', marginBottom: 8 }}>
              🎮 {escrow.listing?.game?.name || escrow.game_name}
            </div>
          )}
          <div style={{ fontSize: 20, fontWeight: 700, color: 'var(--color-accent-blue)' }}>
            {Number(escrow.amount).toLocaleString()} UZS
          </div>
          {escrow.commission_amount && (
            <div style={{ fontSize: 12, color: 'var(--color-text-secondary)' }}>
              Комиссия: {Number(escrow.commission_amount).toLocaleString()} UZS
            </div>
          )}
        </div>

        {/* Parties */}
        <div style={{
          background: 'var(--color-bg-secondary)',
          border: '1px solid var(--color-border-default)',
          borderRadius: 12, padding: 20,
        }}>
          <h3 style={{ fontSize: 16, fontWeight: 600, marginBottom: 12, color: 'var(--color-text-primary)' }}>👥 Участники</h3>
          <div style={{ marginBottom: 12 }}>
            <div style={{ fontSize: 11, textTransform: 'uppercase', color: 'var(--color-text-secondary)', marginBottom: 4 }}>Покупатель</div>
            <div style={{ fontWeight: 500 }}>{escrow.buyer?.username || escrow.buyer?.display_name || '—'}</div>
          </div>
          <div>
            <div style={{ fontSize: 11, textTransform: 'uppercase', color: 'var(--color-text-secondary)', marginBottom: 4 }}>Продавец</div>
            <div style={{ fontWeight: 500 }}>{escrow.seller?.username || escrow.seller?.display_name || '—'}</div>
          </div>
        </div>
      </div>

      {/* Action buttons */}
      <div style={{
        background: 'var(--color-bg-secondary)',
        border: '1px solid var(--color-border-default)',
        borderRadius: 12, padding: 20, marginBottom: 24,
      }}>
        <h3 style={{ fontSize: 16, fontWeight: 600, marginBottom: 16, color: 'var(--color-text-primary)' }}>Действия</h3>

        <div style={{ display: 'flex', flexDirection: 'column', gap: 12 }}>
          {/* Seller actions */}
          {isSeller && status === 'paid' && (
            <div>
              <p style={{ color: 'var(--color-text-secondary)', fontSize: 14, marginBottom: 12 }}>
                Покупатель оплатил заказ. Пожалуйста, передайте данные аккаунта через чат.
              </p>
              <button
                className="btn btn-primary"
                onClick={() => { if (window.confirm('Подтвердить передачу аккаунта?')) deliverAccount.mutate() }}
                disabled={deliverAccount.isPending}
              >
                📦 Я передал аккаунт
              </button>
            </div>
          )}

          {/* Buyer actions */}
          {isBuyer && status === 'delivered' && (
            <div>
              <p style={{ color: 'var(--color-text-secondary)', fontSize: 14, marginBottom: 12 }}>
                Продавец передал данные аккаунта. Проверьте и подтвердите получение.
              </p>
              <div style={{ display: 'flex', gap: 12, flexWrap: 'wrap' }}>
                <button
                  className="btn btn-primary"
                  onClick={() => { if (window.confirm('Подтвердить получение аккаунта? Деньги будут переведены продавцу.')) confirmReceived.mutate() }}
                  disabled={confirmReceived.isPending}
                >
                  ✅ Аккаунт получен, всё ок
                </button>
                <button
                  className="btn btn-danger"
                  onClick={() => setShowDisputeForm(true)}
                >
                  ⚠️ Есть проблема
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
              💬 Открыть чат
            </Link>
          )}

          {!isBuyer && !isSeller && (
            <div style={{ color: 'var(--color-text-secondary)', fontSize: 14 }}>
              Вы не являетесь участником этой сделки.
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
          <h3 style={{ color: 'var(--color-error-text)', marginBottom: 12 }}>⚠️ Открыть спор</h3>
          <textarea
            className="input"
            rows={4}
            value={disputeReason}
            onChange={e => setDisputeReason(e.target.value)}
            placeholder="Опишите проблему подробно..."
            style={{ marginBottom: 12 }}
          />
          <div style={{ display: 'flex', gap: 12 }}>
            <button
              className="btn btn-danger"
              onClick={() => openDispute.mutate(disputeReason)}
              disabled={openDispute.isPending || !disputeReason.trim()}
            >
              {openDispute.isPending ? 'Отправка...' : 'Открыть спор'}
            </button>
            <button className="btn btn-secondary" onClick={() => setShowDisputeForm(false)}>
              Отмена
            </button>
          </div>
        </div>
      )}
    </div>
  )
}
