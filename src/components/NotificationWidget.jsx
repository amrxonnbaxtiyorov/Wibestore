import { useState, useRef, useEffect } from 'react';
import { Bell, Check, Trash2, X } from 'lucide-react';
import { useNotifications } from '../context/NotificationContext';
import { useLanguage } from '../context/LanguageContext';

const NotificationWidget = () => {
    const { t } = useLanguage();
    const [isOpen, setIsOpen] = useState(false);
    const dropdownRef = useRef(null);
    const { notifications, unreadCount, markAsRead, markAllAsRead, deleteNotification, clearAll } = useNotifications();

    // Close on outside click
    useEffect(() => {
        const handleClickOutside = (event) => {
            if (dropdownRef.current && !dropdownRef.current.contains(event.target)) {
                setIsOpen(false);
            }
        };

        document.addEventListener('mousedown', handleClickOutside);
        return () => document.removeEventListener('mousedown', handleClickOutside);
    }, []);

    const formatTime = (timeString) => {
        const date = new Date(timeString);
        const now = new Date();
        const diff = now - date;
        const minutes = Math.floor(diff / 60000);
        const hours = Math.floor(diff / 3600000);
        const days = Math.floor(diff / 86400000);

        if (minutes < 1) return t('notifications.time_now') || 'Just now';
        if (minutes < 60) return (t('notifications.time_minutes_ago') || '{n} min ago').replace('{n}', minutes);
        if (hours < 24) return (t('notifications.time_hours_ago') || '{n} hours ago').replace('{n}', hours);
        if (days < 7) return (t('notifications.time_days_ago') || '{n} days ago').replace('{n}', days);
        return date.toLocaleDateString();
    };

    return (
        <div className="relative" ref={dropdownRef}>
            {/* Bell Button */}
            <button
                onClick={() => setIsOpen(!isOpen)}
                className="btn btn-ghost btn-sm"
                style={{ position: 'relative', padding: '8px', borderRadius: 'var(--radius-xl)' }}
            >
                <Bell className="w-5 h-5" style={{ color: 'var(--color-text-secondary)' }} />
                {unreadCount > 0 && (
                    <span
                        style={{
                            position: 'absolute',
                            top: '-2px',
                            right: '-2px',
                            width: '20px',
                            height: '20px',
                            backgroundColor: 'var(--color-accent-red)',
                            borderRadius: '50%',
                            fontSize: 'var(--font-size-xs)',
                            fontWeight: 'var(--font-weight-bold)',
                            color: '#fff',
                            display: 'flex',
                            alignItems: 'center',
                            justifyContent: 'center',
                        }}
                    >
                        {unreadCount > 9 ? '9+' : unreadCount}
                    </span>
                )}
            </button>

            {/* Dropdown */}
            {isOpen && (
                <div
                    className="dropdown-menu"
                    style={{
                        position: 'absolute',
                        right: 0,
                        top: 'calc(100% + 8px)',
                        minWidth: '340px',
                        maxWidth: '400px',
                        maxHeight: '480px',
                        display: 'flex',
                        flexDirection: 'column',
                    }}
                >
                    {/* Header */}
                    <div
                        style={{
                            display: 'flex',
                            alignItems: 'center',
                            justifyContent: 'space-between',
                            padding: 'var(--space-4)',
                            borderBottom: '1px solid var(--color-border-muted)',
                        }}
                    >
                        <h3 style={{
                            fontWeight: 'var(--font-weight-semibold)',
                            color: 'var(--color-text-primary)',
                            fontSize: 'var(--font-size-base)',
                        }}>
                            {t('notifications.title')}
                        </h3>
                        <div className="flex items-center gap-2">
                            {unreadCount > 0 && (
                                <button
                                    onClick={markAllAsRead}
                                    className="btn btn-ghost btn-sm"
                                    style={{
                                        fontSize: 'var(--font-size-xs)',
                                        color: 'var(--color-text-accent)',
                                        gap: '4px',
                                    }}
                                >
                                    <Check className="w-3 h-3" />
                                    {t('notifications.mark_all_read')}
                                </button>
                            )}
                        </div>
                    </div>

                    {/* Notifications List */}
                    <div style={{ flex: 1, overflowY: 'auto', maxHeight: '320px' }}>
                        {notifications.length > 0 ? (
                            notifications.map((notification) => (
                                <div
                                    key={notification.id}
                                    style={{
                                        padding: 'var(--space-4)',
                                        borderBottom: '1px solid var(--color-border-muted)',
                                        cursor: 'pointer',
                                        transition: 'background-color 0.15s ease',
                                        backgroundColor: !notification.read
                                            ? 'var(--color-info-bg)'
                                            : 'transparent',
                                    }}
                                    onClick={() => markAsRead(notification.id)}
                                    onMouseEnter={(e) => {
                                        e.currentTarget.style.backgroundColor = 'var(--color-bg-tertiary)';
                                    }}
                                    onMouseLeave={(e) => {
                                        e.currentTarget.style.backgroundColor = !notification.read
                                            ? 'var(--color-info-bg)'
                                            : 'transparent';
                                    }}
                                >
                                    <div className="flex items-start gap-3">
                                        <div
                                            style={{
                                                width: '40px',
                                                height: '40px',
                                                flexShrink: 0,
                                                backgroundColor: 'var(--color-bg-tertiary)',
                                                borderRadius: 'var(--radius-xl)',
                                                display: 'flex',
                                                alignItems: 'center',
                                                justifyContent: 'center',
                                                fontSize: '20px',
                                            }}
                                        >
                                            {notification.icon}
                                        </div>
                                        <div className="flex-1 min-w-0">
                                            <div className="flex items-center justify-between gap-2">
                                                <p
                                                    className="truncate"
                                                    style={{
                                                        fontWeight: !notification.read
                                                            ? 'var(--font-weight-medium)'
                                                            : 'var(--font-weight-normal)',
                                                        color: !notification.read
                                                            ? 'var(--color-text-primary)'
                                                            : 'var(--color-text-secondary)',
                                                        fontSize: 'var(--font-size-base)',
                                                    }}
                                                >
                                                    {notification.title}
                                                </p>
                                                <button
                                                    onClick={(e) => {
                                                        e.stopPropagation();
                                                        deleteNotification(notification.id);
                                                    }}
                                                    className="btn btn-ghost btn-sm"
                                                    style={{
                                                        padding: '4px',
                                                        color: 'var(--color-text-muted)',
                                                        flexShrink: 0,
                                                    }}
                                                >
                                                    <X className="w-4 h-4" />
                                                </button>
                                            </div>
                                            <p
                                                className="line-clamp-2"
                                                style={{
                                                    fontSize: 'var(--font-size-sm)',
                                                    color: 'var(--color-text-muted)',
                                                    marginTop: '4px',
                                                }}
                                            >
                                                {notification.message}
                                            </p>
                                            <p style={{
                                                fontSize: 'var(--font-size-xs)',
                                                color: 'var(--color-text-muted)',
                                                marginTop: '8px',
                                            }}>
                                                {formatTime(notification.time)}
                                            </p>
                                        </div>
                                        {!notification.read && (
                                            <div
                                                style={{
                                                    width: '8px',
                                                    height: '8px',
                                                    backgroundColor: 'var(--color-accent-blue)',
                                                    borderRadius: '50%',
                                                    flexShrink: 0,
                                                    marginTop: '8px',
                                                }}
                                            />
                                        )}
                                    </div>
                                </div>
                            ))
                        ) : (
                            <div className="empty-state" style={{ padding: '32px 16px' }}>
                                <Bell
                                    className="empty-state-icon"
                                    style={{ width: '48px', height: '48px' }}
                                />
                                <p className="empty-state-description">{t('notifications.empty')}</p>
                            </div>
                        )}
                    </div>

                    {/* Footer */}
                    {notifications.length > 0 && (
                        <div
                            style={{
                                padding: 'var(--space-3)',
                                borderTop: '1px solid var(--color-border-muted)',
                            }}
                        >
                            <button
                                onClick={clearAll}
                                className="btn btn-ghost btn-sm w-full"
                                style={{
                                    gap: '8px',
                                    color: 'var(--color-text-muted)',
                                    fontSize: 'var(--font-size-sm)',
                                    justifyContent: 'center',
                                }}
                            >
                                <Trash2 className="w-4 h-4" />
                                {t('notifications.clear_all')}
                            </button>
                        </div>
                    )}
                </div>
            )}
        </div>
    );
};

export default NotificationWidget;
