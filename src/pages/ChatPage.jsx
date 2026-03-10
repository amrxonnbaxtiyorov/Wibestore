import { useEffect } from 'react';
import { Link, useNavigate } from 'react-router-dom';
import { MessageCircle, Gamepad2 } from 'lucide-react';
import { useAuth } from '../context/AuthContext';
import { useChats } from '../hooks/useChat';
import { useLanguage } from '../context/LanguageContext';
import { resolveImageUrl } from '../lib/displayUtils';

/**
 * Chat — bitta sahifa: suhbatlar ro'yxati va tanlangan suhbat xabarlari.
 * URL: /chat
 */
export default function ChatPage() {
    const { user, isAuthenticated } = useAuth();
    const navigate = useNavigate();
    const { t } = useLanguage();
    const { data: chatsData, isLoading } = useChats();
    const chats = chatsData?.results ?? chatsData ?? [];

    useEffect(() => {
        if (!isAuthenticated) navigate('/login?redirect=' + encodeURIComponent('/chat'));
    }, [isAuthenticated, navigate]);

    if (!user) return null;

    return (
        <div className="page-enter" style={{ minHeight: '100vh', paddingBottom: '64px', display: 'flex', flexDirection: 'column' }}>
            <div className="gh-container" style={{ flex: 1, display: 'flex', flexDirection: 'column', maxWidth: '900px', margin: '0 auto' }}>
                {/* Breadcrumbs */}
                <div className="breadcrumbs">
                    <Link to="/">{t('common.home')}</Link>
                    <span className="breadcrumb-separator">/</span>
                    <span className="breadcrumb-current">{t('nav.chat') || 'Xabarlar'}</span>
                </div>

                {/* Page title */}
                <div style={{ display: 'flex', alignItems: 'center', gap: '12px', marginTop: '16px', marginBottom: '24px' }}>
                    <MessageCircle style={{ width: '28px', height: '28px', color: 'var(--color-accent-blue)' }} />
                    <h1 style={{ fontSize: 'var(--font-size-2xl)', fontWeight: 'var(--font-weight-bold)', color: 'var(--color-text-primary)', margin: 0 }}>
                        {t('nav.chat') || 'Xabarlar'}
                    </h1>
                </div>

                {/* Chat area — card */}
                <div
                    style={{
                        flex: 1,
                        display: 'flex',
                        flexDirection: 'column',
                        backgroundColor: 'var(--color-bg-secondary)',
                        border: '1px solid var(--color-border-default)',
                        borderRadius: 'var(--radius-xl)',
                        overflow: 'hidden',
                        minHeight: '60vh',
                    }}
                >
                    {/* Content */}
                    <div style={{ flex: 1, overflowY: 'auto', display: 'flex', flexDirection: 'column' }}>
                        <div style={{ padding: 'var(--space-4)' }}>
                            {isLoading ? (
                                <p style={{ color: 'var(--color-text-muted)', fontSize: 'var(--font-size-sm)' }}>
                                    {t('common.loading') || 'Yuklanmoqda...'}
                                </p>
                            ) : !Array.isArray(chats) || chats.length === 0 ? (
                                <div className="empty-state">
                                    <MessageCircle className="empty-state-icon" style={{ width: '64px', height: '64px' }} />
                                    <p className="empty-state-description">Suhbatlar yo'q</p>
                                    <p style={{ fontSize: 'var(--font-size-sm)', color: 'var(--color-text-muted)', marginTop: '8px', textAlign: 'center' }}>
                                        Akkaunt sahifasidan sotuvchi bilan bog'laning
                                    </p>
                                </div>
                            ) : (
                                chats.map((room) => {
                                    const participants = room?.participants ?? [];
                                    const other = participants.find((p) => p?.id && p.id !== user.id) ?? participants[0] ?? null;
                                    const title = other?.display_name || other?.name || t('detail.seller') || 'Sotuvchi';
                                    const listingTitle = room?.listing?.title || '';
                                    const listingImage = room?.listing?.primary_image || room?.listing?.image || null;
                                    const unread = Number(room?.unread_count ?? 0) || 0;

                                    return (
                                        <button
                                            key={room.id}
                                            onClick={() => navigate(`/chat/${room.id}`)}
                                            style={{
                                                width: '100%',
                                                padding: 'var(--space-3)',
                                                display: 'flex',
                                                alignItems: 'center',
                                                gap: '12px',
                                                borderRadius: 'var(--radius-xl)',
                                                background: 'none',
                                                border: 'none',
                                                cursor: 'pointer',
                                                transition: 'background-color 0.15s ease',
                                                textAlign: 'left',
                                                marginBottom: '4px',
                                            }}
                                            onMouseEnter={(e) => { e.currentTarget.style.backgroundColor = 'var(--color-bg-tertiary)'; }}
                                            onMouseLeave={(e) => { e.currentTarget.style.backgroundColor = 'transparent'; }}
                                        >
                                            {resolveImageUrl(listingImage) ? (
                                                <img
                                                    src={resolveImageUrl(listingImage)}
                                                    alt=""
                                                    style={{ width: '48px', height: '48px', borderRadius: 'var(--radius-lg)', objectFit: 'cover' }}
                                                />
                                            ) : (
                                                <div style={{ width: '48px', height: '48px', borderRadius: 'var(--radius-lg)', backgroundColor: 'var(--color-bg-tertiary)', display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
                                                    <Gamepad2 style={{ width: '24px', height: '24px', color: 'var(--color-text-muted)', opacity: 0.6 }} />
                                                </div>
                                            )}
                                            <div className="flex-1 min-w-0" style={{ textAlign: 'left' }}>
                                                <div className="flex items-center justify-between gap-3">
                                                    <p className="truncate" style={{ fontSize: 'var(--font-size-sm)', fontWeight: 'var(--font-weight-medium)', color: 'var(--color-text-primary)' }}>
                                                        {title}
                                                    </p>
                                                    {unread > 0 && (
                                                        <span
                                                            style={{
                                                                fontSize: 'var(--font-size-xs)',
                                                                padding: '2px 8px',
                                                                borderRadius: '999px',
                                                                backgroundColor: 'var(--color-accent-blue)',
                                                                color: '#fff',
                                                                flexShrink: 0,
                                                            }}
                                                        >
                                                            {unread}
                                                        </span>
                                                    )}
                                                </div>
                                                {!!listingTitle && (
                                                    <p className="truncate" style={{ fontSize: 'var(--font-size-xs)', color: 'var(--color-text-muted)' }}>
                                                        {listingTitle}
                                                    </p>
                                                )}
                                                {!!room?.last_message_preview && (
                                                    <p className="truncate" style={{ fontSize: 'var(--font-size-xs)', color: 'var(--color-text-muted)', marginTop: '2px' }}>
                                                        {room.last_message_preview}
                                                    </p>
                                                )}
                                            </div>
                                        </button>
                                    );
                                })
                            )}
                        </div>
                    </div>
                </div>
            </div>
        </div>
    );
}
