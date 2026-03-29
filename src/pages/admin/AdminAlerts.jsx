import { useState } from 'react';
import { useAdminAlerts } from '../../hooks/useAdmin';
import { useLanguage } from '../../context/LanguageContext';
import { AlertTriangle, AlertCircle, Info, RefreshCw, CheckCircle, Shield, Clock, Package } from 'lucide-react';
import AdminLayout from './AdminLayout';

const LEVEL_CONFIG = {
  critical: {
    icon: AlertTriangle,
    color: 'var(--color-accent-red)',
    bg: 'var(--color-error-bg, rgba(248,81,73,0.1))',
    border: 'var(--color-error-border, rgba(248,81,73,0.3))',
    badge: 'badge-red',
  },
  warning: {
    icon: AlertCircle,
    color: 'var(--color-accent-orange, #d29922)',
    bg: 'var(--color-warning-bg, rgba(210,153,34,0.1))',
    border: 'var(--color-warning-border, rgba(210,153,34,0.3))',
    badge: 'badge-orange',
  },
  info: {
    icon: Info,
    color: 'var(--color-accent-blue)',
    bg: 'var(--color-info-bg, rgba(56,139,253,0.1))',
    border: 'var(--color-info-border, rgba(56,139,253,0.3))',
    badge: 'badge-blue',
  },
};

const TYPE_ICONS = {
  old_disputes: AlertTriangle,
  old_withdrawals: Clock,
  suspicious_activity: Shield,
  pending_listings: Package,
};

export default function AdminAlerts() {
  const { t } = useLanguage();
  const { data, isLoading, refetch, isFetching } = useAdminAlerts();
  const alerts = data?.alerts ?? [];
  const totalCritical = data?.total_critical ?? 0;
  const totalWarning = data?.total_warning ?? 0;

  return (
    <AdminLayout>
      <div className="admin-page">
        {/* Header */}
        <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '24px', flexWrap: 'wrap', gap: '12px' }}>
          <div>
            <h1 style={{ fontSize: 'var(--font-size-2xl)', fontWeight: 'var(--font-weight-bold)', color: 'var(--color-text-primary)', margin: 0 }}>
              {t('admin_alerts.title') || 'Alerts'}
            </h1>
            <p style={{ fontSize: 'var(--font-size-sm)', color: 'var(--color-text-muted)', marginTop: '4px' }}>
              {t('admin_alerts.subtitle') || 'System alerts and notifications'}
            </p>
          </div>
          <button
            className="btn btn-secondary btn-sm"
            onClick={() => refetch()}
            disabled={isFetching}
            style={{ display: 'flex', alignItems: 'center', gap: '6px' }}
          >
            <RefreshCw style={{ width: '14px', height: '14px', animation: isFetching ? 'spin 1s linear infinite' : 'none' }} />
            {t('admin_alerts.refresh') || 'Refresh'}
          </button>
        </div>

        {/* Summary cards */}
        <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(200px, 1fr))', gap: '16px', marginBottom: '24px' }}>
          <div className="card" style={{ padding: '20px', display: 'flex', alignItems: 'center', gap: '16px' }}>
            <div style={{
              width: '48px', height: '48px', borderRadius: 'var(--radius-lg)',
              backgroundColor: totalCritical > 0 ? 'rgba(248,81,73,0.1)' : 'var(--color-bg-tertiary)',
              display: 'flex', alignItems: 'center', justifyContent: 'center'
            }}>
              <AlertTriangle style={{ width: '24px', height: '24px', color: totalCritical > 0 ? 'var(--color-accent-red)' : 'var(--color-text-muted)' }} />
            </div>
            <div>
              <div style={{ fontSize: 'var(--font-size-2xl)', fontWeight: 'var(--font-weight-bold)', color: 'var(--color-text-primary)' }}>
                {totalCritical}
              </div>
              <div style={{ fontSize: 'var(--font-size-sm)', color: 'var(--color-text-muted)' }}>
                {t('admin_alerts.total_critical') || 'Critical alerts'}
              </div>
            </div>
          </div>
          <div className="card" style={{ padding: '20px', display: 'flex', alignItems: 'center', gap: '16px' }}>
            <div style={{
              width: '48px', height: '48px', borderRadius: 'var(--radius-lg)',
              backgroundColor: totalWarning > 0 ? 'rgba(210,153,34,0.1)' : 'var(--color-bg-tertiary)',
              display: 'flex', alignItems: 'center', justifyContent: 'center'
            }}>
              <AlertCircle style={{ width: '24px', height: '24px', color: totalWarning > 0 ? 'var(--color-accent-orange, #d29922)' : 'var(--color-text-muted)' }} />
            </div>
            <div>
              <div style={{ fontSize: 'var(--font-size-2xl)', fontWeight: 'var(--font-weight-bold)', color: 'var(--color-text-primary)' }}>
                {totalWarning}
              </div>
              <div style={{ fontSize: 'var(--font-size-sm)', color: 'var(--color-text-muted)' }}>
                {t('admin_alerts.total_warning') || 'Warnings'}
              </div>
            </div>
          </div>
          <div className="card" style={{ padding: '20px', display: 'flex', alignItems: 'center', gap: '16px' }}>
            <div style={{
              width: '48px', height: '48px', borderRadius: 'var(--radius-lg)',
              backgroundColor: 'var(--color-bg-tertiary)',
              display: 'flex', alignItems: 'center', justifyContent: 'center'
            }}>
              <CheckCircle style={{ width: '24px', height: '24px', color: 'var(--color-accent-green, #3fb950)' }} />
            </div>
            <div>
              <div style={{ fontSize: 'var(--font-size-2xl)', fontWeight: 'var(--font-weight-bold)', color: 'var(--color-text-primary)' }}>
                {alerts.length}
              </div>
              <div style={{ fontSize: 'var(--font-size-sm)', color: 'var(--color-text-muted)' }}>
                {t('admin_alerts.info') || 'Total'}
              </div>
            </div>
          </div>
        </div>

        {/* Alerts list */}
        {isLoading ? (
          <div style={{ display: 'flex', justifyContent: 'center', padding: '60px 0' }}>
            <div className="loading-spinner" />
          </div>
        ) : alerts.length === 0 ? (
          <div className="card" style={{ padding: '60px 20px', textAlign: 'center' }}>
            <CheckCircle style={{ width: '48px', height: '48px', color: 'var(--color-accent-green, #3fb950)', margin: '0 auto 16px' }} />
            <h3 style={{ fontSize: 'var(--font-size-lg)', fontWeight: 'var(--font-weight-semibold)', color: 'var(--color-text-primary)', marginBottom: '8px' }}>
              {t('admin_alerts.no_alerts') || 'No alerts'}
            </h3>
            <p style={{ fontSize: 'var(--font-size-sm)', color: 'var(--color-text-muted)' }}>
              {t('admin_alerts.no_alerts_desc') || 'Everything is running smoothly.'}
            </p>
          </div>
        ) : (
          <div style={{ display: 'flex', flexDirection: 'column', gap: '12px' }}>
            {alerts.map((alert, idx) => {
              const config = LEVEL_CONFIG[alert.level] || LEVEL_CONFIG.info;
              const TypeIcon = TYPE_ICONS[alert.type] || config.icon;
              return (
                <div
                  key={idx}
                  className="card"
                  style={{
                    padding: '20px',
                    borderLeft: `4px solid ${config.color}`,
                    display: 'flex',
                    alignItems: 'center',
                    gap: '16px',
                  }}
                >
                  <div style={{
                    width: '44px', height: '44px', borderRadius: 'var(--radius-lg)',
                    backgroundColor: config.bg, display: 'flex',
                    alignItems: 'center', justifyContent: 'center', flexShrink: 0,
                  }}>
                    <TypeIcon style={{ width: '22px', height: '22px', color: config.color }} />
                  </div>
                  <div style={{ flex: 1, minWidth: 0 }}>
                    <div style={{ display: 'flex', alignItems: 'center', gap: '8px', marginBottom: '4px', flexWrap: 'wrap' }}>
                      <span className={`badge ${config.badge}`}>
                        {t(`admin_alerts.${alert.level}`) || alert.level}
                      </span>
                      <span style={{ fontSize: 'var(--font-size-xs)', color: 'var(--color-text-muted)' }}>
                        {t(`admin_alerts.${alert.type}`) || alert.type}
                      </span>
                    </div>
                    <p style={{ fontSize: 'var(--font-size-base)', color: 'var(--color-text-primary)', margin: 0, wordBreak: 'break-word' }}>
                      {alert.message}
                    </p>
                  </div>
                  <div style={{
                    backgroundColor: config.bg,
                    borderRadius: 'var(--radius-lg)',
                    padding: '8px 16px',
                    textAlign: 'center',
                    flexShrink: 0,
                  }}>
                    <div style={{ fontSize: 'var(--font-size-xl)', fontWeight: 'var(--font-weight-bold)', color: config.color }}>
                      {alert.count}
                    </div>
                  </div>
                </div>
              );
            })}
          </div>
        )}

        {/* Timestamp */}
        {data?.timestamp && (
          <div style={{ marginTop: '16px', fontSize: 'var(--font-size-xs)', color: 'var(--color-text-muted)', textAlign: 'right' }}>
            {t('admin_alerts.last_updated') || 'Last updated'}: {new Date(data.timestamp).toLocaleString()}
          </div>
        )}
      </div>
    </AdminLayout>
  );
}
