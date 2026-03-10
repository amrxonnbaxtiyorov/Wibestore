import { useEffect, useMemo, useRef, useState } from 'react';
import { Link, useNavigate } from 'react-router-dom';
import { MessageCircle, Gamepad2, Send, X } from 'lucide-react';
import { useAuth } from '../context/AuthContext';
import { useChats, useChatMessages, useMarkChatRead, useSendMessage } from '../hooks/useChat';
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
    const chats = useMemo(() => chatsData?.results ?? chatsData ?? [], [chatsData]);
    const [activeRoomId, setActiveRoomId] = useState(null);
    const [text, setText] = useState('');
    const messagesEndRef = useRef(null);

    const activeRoom = useMemo(() => {
        if (!activeRoomId || !Array.isArray(chats)) return null;
        return chats.find((r) => String(r?.id) === String(activeRoomId)) ?? null;
    }, [activeRoomId, chats]);

    const {
        data: messagesData,
        isLoading: isMessagesLoading,
    } = useChatMessages(activeRoomId);
    const sendMessageMutation = useSendMessage(activeRoomId);
    const markReadMutation = useMarkChatRead(activeRoomId);
    const messages = messagesData?.pages?.flatMap((p) => p.results ?? p) ?? [];

    useEffect(() => {
        if (!isAuthenticated) navigate('/login?redirect=' + encodeURIComponent('/chat'));
    }, [isAuthenticated, navigate]);

    useEffect(() => {
        if (!activeRoomId) return;
        messagesEndRef.current?.scrollIntoView({ behavior: 'smooth' });
    }, [activeRoomId, messages.length]);

    useEffect(() => {
        if (!activeRoomId || !user) return;
        const hasIncomingUnread = messages.some((m) => m?.sender?.id && m.sender.id !== user.id && m.is_read === false);
        if (hasIncomingUnread && !markReadMutation.isPending) {
            markReadMutation.mutate();
        }
        // eslint-disable-next-line react-hooks/exhaustive-deps
    }, [activeRoomId, user?.id, messages.length]);

    const handleOpenRoom = (roomId) => {
        // Mobile: alohida chat sahifasi
        if (typeof window !== 'undefined' && window.innerWidth < 768) {
            navigate(`/chat/${roomId}`);
            return;
        }
        setActiveRoomId(roomId);
    };

    const handleSend = (e) => {
        e.preventDefault();
        if (!activeRoomId || !text.trim() || sendMessageMutation.isPending) return;
        sendMessageMutation.mutate(text.trim(), {
            onSuccess: () => setText(''),
        });
    };

    const handleClose = () => {
        try {
            navigate(-1);
        } catch {
            navigate('/');
        }
    };

    if (!user) return null;

    return (
        <div className="page-enter" style={{ minHeight: 'calc(100vh - 64px)', display: 'flex', flexDirection: 'column' }}>
            <div className="gh-container" style={{ flex: 1, minHeight: 0, display: 'flex', flexDirection: 'column', maxWidth: 'none' }}>
                {/* Breadcrumbs */}
                <div className="breadcrumbs">
                    <Link to="/">{t('common.home')}</Link>
                    <span className="breadcrumb-separator">/</span>
                    <span className="breadcrumb-current">{t('nav.chat') || 'Xabarlar'}</span>
                </div>

                {/* Page title */}
                <div style={{ display: 'flex', alignItems: 'center', gap: '12px', marginTop: '16px', marginBottom: '16px', paddingLeft: '12px' }}>
                    <MessageCircle style={{ width: '28px', height: '28px', color: 'var(--color-accent-blue)' }} />
                    <h1 style={{ fontSize: 'var(--font-size-2xl)', fontWeight: 'var(--font-weight-bold)', color: 'var(--color-text-primary)', margin: 0 }}>
                        {t('nav.chat') || 'Xabarlar'}
                    </h1>
                </div>

                {/* Telegram-style layout */}
                <div
                    style={{
                        flex: 1,
                        minHeight: 0,
                        display: 'grid',
                        gridTemplateColumns: '320px 1fr',
                        backgroundColor: 'var(--color-bg-secondary)',
                        border: '1px solid var(--color-border-default)',
                        borderRadius: 'var(--radius-xl)',
                        overflow: 'hidden',
                        height: '100%',
                        position: 'relative',
                    }}
                >
                    {/* Close / back button */}
                    <button
                        type="button"
                        onClick={handleClose}
                        className="btn btn-ghost btn-sm"
                        aria-label={t('common.back') || 'Orqaga'}
                        style={{
                            position: 'absolute',
                            top: '10px',
                            right: '10px',
                            zIndex: 5,
                            width: '36px',
                            height: '36px',
                            padding: 0,
                            borderRadius: '10px',
                            backgroundColor: 'var(--color-bg-primary)',
                            border: '1px solid var(--color-border-muted)',
                        }}
                    >
                        <X style={{ width: '18px', height: '18px' }} />
                    </button>

                    {/* Left: conversations */}
                    <div style={{ borderRight: '1px solid var(--color-border-muted)', overflow: 'hidden', display: 'flex', flexDirection: 'column', minHeight: 0 }}>
                        <div style={{ padding: '12px 14px', backgroundColor: 'var(--color-bg-primary)', borderBottom: '1px solid var(--color-border-muted)' }}>
                            <p style={{ margin: 0, fontWeight: 'var(--font-weight-semibold)', color: 'var(--color-text-primary)' }}>
                                {t('nav.chat') || 'Xabarlar'}
                            </p>
                        </div>
                        <div style={{ flex: 1, overflowY: 'auto', padding: '10px' }}>
                            {isLoading ? (
                                <p style={{ color: 'var(--color-text-muted)', fontSize: 'var(--font-size-sm)' }}>
                                    {t('common.loading') || 'Yuklanmoqda...'}
                                </p>
                            ) : !Array.isArray(chats) || chats.length === 0 ? (
                                <div className="empty-state">
                                    <MessageCircle className="empty-state-icon" style={{ width: '56px', height: '56px' }} />
                                    <p className="empty-state-description">Suhbatlar yo'q</p>
                                </div>
                            ) : (
                                chats.map((room) => {
                                    const participants = room?.participants ?? [];
                                    const other = participants.find((p) => p?.id && p.id !== user.id) ?? participants[0] ?? null;
                                    const title = other?.display_name || other?.name || t('detail.seller') || 'Sotuvchi';
                                    const listingTitle = room?.listing?.title || '';
                                    const listingImage = room?.listing?.primary_image || room?.listing?.image || null;
                                    const unread = Number(room?.unread_count ?? 0) || 0;
                                    const isActive = String(room?.id) === String(activeRoomId);

                                    return (
                                        <button
                                            key={room.id}
                                            onClick={() => handleOpenRoom(room.id)}
                                            style={{
                                                width: '100%',
                                                padding: '10px 10px',
                                                display: 'flex',
                                                alignItems: 'center',
                                                gap: '10px',
                                                borderRadius: 'var(--radius-xl)',
                                                backgroundColor: isActive ? 'var(--color-bg-tertiary)' : 'transparent',
                                                border: 'none',
                                                cursor: 'pointer',
                                                textAlign: 'left',
                                                marginBottom: '6px',
                                            }}
                                        >
                                            {resolveImageUrl(listingImage) ? (
                                                <img
                                                    src={resolveImageUrl(listingImage)}
                                                    alt=""
                                                    style={{ width: '44px', height: '44px', borderRadius: 'var(--radius-lg)', objectFit: 'cover', flexShrink: 0 }}
                                                />
                                            ) : (
                                                <div style={{ width: '44px', height: '44px', borderRadius: 'var(--radius-lg)', backgroundColor: 'var(--color-bg-tertiary)', display: 'flex', alignItems: 'center', justifyContent: 'center', flexShrink: 0 }}>
                                                    <Gamepad2 style={{ width: '22px', height: '22px', color: 'var(--color-text-muted)', opacity: 0.6 }} />
                                                </div>
                                            )}
                                            <div className="flex-1 min-w-0">
                                                <div className="flex items-center justify-between gap-3">
                                                    <p className="truncate" style={{ fontSize: 'var(--font-size-sm)', fontWeight: 'var(--font-weight-semibold)', color: 'var(--color-text-primary)', margin: 0 }}>
                                                        {title}
                                                    </p>
                                                    {unread > 0 && (
                                                        <span style={{ fontSize: 'var(--font-size-xs)', padding: '2px 8px', borderRadius: '999px', backgroundColor: 'var(--color-accent-blue)', color: '#fff', flexShrink: 0 }}>
                                                            {unread}
                                                        </span>
                                                    )}
                                                </div>
                                                {!!listingTitle && (
                                                    <p className="truncate" style={{ fontSize: 'var(--font-size-xs)', color: 'var(--color-text-muted)', margin: '2px 0 0 0' }}>
                                                        {listingTitle}
                                                    </p>
                                                )}
                                                {!!room?.last_message_preview && (
                                                    <p className="truncate" style={{ fontSize: 'var(--font-size-xs)', color: 'var(--color-text-muted)', margin: '2px 0 0 0' }}>
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

                    {/* Middle: messages */}
                    <div style={{ display: 'flex', flexDirection: 'column', overflow: 'hidden', minHeight: 0 }}>
                        <div style={{ padding: '12px 14px', backgroundColor: 'var(--color-bg-primary)', borderBottom: '1px solid var(--color-border-muted)' }}>
                            <p style={{ margin: 0, fontWeight: 'var(--font-weight-semibold)', color: 'var(--color-text-primary)' }}>
                                {activeRoom ? (activeRoom?.participants?.find((p) => p?.id !== user.id)?.display_name || t('detail.seller') || 'Chat') : (t('chat.choose') || 'Suhbatni tanlang')}
                            </p>
                        </div>

                        <div style={{ flex: 1, minHeight: 0, overflowY: 'auto', padding: '14px', display: 'flex', flexDirection: 'column', gap: '10px', scrollbarGutter: 'stable' }}>
                            {!activeRoom ? (
                                <div className="empty-state" style={{ flex: 1, minHeight: 0, padding: '48px 16px' }}>
                                    <MessageCircle className="empty-state-icon" style={{ width: '64px', height: '64px' }} />
                                    <p className="empty-state-description">{t('chat.choose') || 'Chap tomondan suhbat tanlang'}</p>
                                </div>
                            ) : isMessagesLoading ? (
                                <p style={{ color: 'var(--color-text-muted)', fontSize: 'var(--font-size-sm)' }}>
                                    {t('common.loading') || 'Yuklanmoqda...'}
                                </p>
                            ) : (
                                messages.map((msg) => {
                                    const isMe = msg.sender?.id === user.id;
                                    return (
                                        <div key={msg.id} style={{ display: 'flex', justifyContent: isMe ? 'flex-end' : 'flex-start' }}>
                                            <div
                                                style={{
                                                    maxWidth: '78%',
                                                    padding: '10px 12px',
                                                    borderRadius: 'var(--radius-2xl)',
                                                    ...(isMe
                                                        ? {
                                                            backgroundColor: 'var(--color-accent-blue)',
                                                            color: 'var(--color-text-on-accent)',
                                                            borderBottomRightRadius: 'var(--radius-sm)',
                                                        }
                                                        : {
                                                            backgroundColor: 'var(--color-bg-tertiary)',
                                                            color: 'var(--color-text-primary)',
                                                            borderBottomLeftRadius: 'var(--radius-sm)',
                                                        }),
                                                }}
                                            >
                                                <p style={{ fontSize: 'var(--font-size-sm)', margin: 0, whiteSpace: 'pre-wrap' }}>{msg.content}</p>
                                                <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'flex-end', gap: '6px', marginTop: '4px' }}>
                                                    <span style={{ fontSize: 'var(--font-size-xs)', opacity: 0.85 }}>
                                                        {msg.created_at ? new Date(msg.created_at).toLocaleTimeString('uz-UZ', { hour: '2-digit', minute: '2-digit' }) : ''}
                                                    </span>
                                                    {isMe && (
                                                        <span style={{ fontSize: '12px', opacity: 0.9, lineHeight: 1 }}>
                                                            {msg.is_read ? '✓✓' : '✓'}
                                                        </span>
                                                    )}
                                                </div>
                                            </div>
                                        </div>
                                    );
                                })
                            )}
                            <div ref={messagesEndRef} />
                        </div>

                        <form onSubmit={handleSend} style={{ padding: '12px', borderTop: '1px solid var(--color-border-muted)', backgroundColor: 'var(--color-bg-primary)' }}>
                            <div style={{ display: 'flex', gap: '8px' }}>
                                <input
                                    value={text}
                                    onChange={(e) => setText(e.target.value)}
                                    className="input input-md"
                                    placeholder={activeRoom ? (t('detail.write_message') || 'Xabar yozing...') : (t('chat.choose') || 'Avval suhbatni tanlang')}
                                    style={{ flex: 1 }}
                                    disabled={!activeRoom || sendMessageMutation.isPending}
                                />
                                <button
                                    type="submit"
                                    className="btn btn-primary btn-md"
                                    disabled={!activeRoom || !text.trim() || sendMessageMutation.isPending}
                                    style={{ padding: '10px 14px', flexShrink: 0 }}
                                >
                                    <Send className="w-5 h-5" />
                                </button>
                            </div>
                        </form>
                    </div>
                </div>
            </div>
        </div>
    );
}
