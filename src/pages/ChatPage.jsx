import { useEffect, useMemo, useRef, useState } from 'react';
import { Link, useNavigate } from 'react-router-dom';
import { MessageCircle, Gamepad2, Send, X, Volume2, VolumeX } from 'lucide-react';
import { useAuth } from '../context/AuthContext';
import { useChats, useChatMessages, useMarkChatRead, useSendMessage, useChatSoundEnabled } from '../hooks/useChat';
import { useLanguage } from '../context/LanguageContext';
import { resolveImageUrl, getDisplayInitial } from '../lib/displayUtils';
import { ensureSoundUnlocked, playChatNotificationSound } from '../lib/notificationSound';

/**
 * Chat — bitta sahifa: suhbatlar ro'yxati va tanlangan suhbat xabarlari.
 * URL: /chat
 */
export default function ChatPage() {
    const { user, isAuthenticated } = useAuth();
    const userId = user?.id ?? null;
    const navigate = useNavigate();
    const { t, language } = useLanguage();
    const { data: chatsData, isLoading } = useChats();
    const chats = useMemo(() => chatsData?.results ?? chatsData ?? [], [chatsData]);
    const [activeRoomId, setActiveRoomId] = useState(null);
    const [text, setText] = useState('');
    const messagesEndRef = useRef(null);
    const lastNotifiedMessageIdRef = useRef(null);

    const [soundEnabled, toggleSound] = useChatSoundEnabled();
    const activeRoom = useMemo(() => {
        if (!activeRoomId || !Array.isArray(chats)) return null;
        return chats.find((r) => String(r?.id) === String(activeRoomId)) ?? null;
    }, [activeRoomId, chats]);

    const activeRoomOther = useMemo(() => {
        if (!activeRoom || !user) return null;
        const participants = activeRoom?.participants ?? [];
        const other = participants.find((p) => p?.id && p.id !== user.id) ?? participants[0] ?? null;
        return other
            ? {
                  id: other.id,
                  display_name: other.display_name || other.name || t('detail.seller') || 'Sotuvchi',
                  avatar: other.avatar || other.profile_image || other.image || null,
              }
            : null;
    }, [activeRoom, user, t]);

    const {
        data: messagesData,
        isLoading: isMessagesLoading,
    } = useChatMessages(activeRoomId);
    const sendMessageMutation = useSendMessage(activeRoomId);
    const markReadMutation = useMarkChatRead(activeRoomId);
    // API yangisi birinchi qaytaradi; ekranda eskisi tepada, yangisi pastda bo'lishi uchun teskari
    const messages = useMemo(() => {
        const arr = messagesData?.pages?.flatMap((p) => p.results ?? p) ?? [];
        return [...arr].reverse();
    }, [messagesData]);

    useEffect(() => {
        if (!isAuthenticated) navigate('/login?redirect=' + encodeURIComponent('/chat'));
    }, [isAuthenticated, navigate]);

    useEffect(() => {
        ensureSoundUnlocked();
    }, []);

    useEffect(() => {
        if (!activeRoomId) return;
        messagesEndRef.current?.scrollIntoView({ behavior: 'smooth' });
    }, [activeRoomId, messages.length]);

    useEffect(() => {
        if (!activeRoomId || !userId) return;
        if (!messages.length) return;
        const last = messages[messages.length - 1];
        const lastId = last?.id ?? null;
        if (!lastId || lastId === lastNotifiedMessageIdRef.current) return;

        // Only notify for incoming messages (not mine / not optimistic)
        const senderId = last?.sender?.id ?? null;
        const isIncoming = senderId && senderId !== userId;
        const isOptimistic = String(lastId).startsWith('optimistic-');
        if (isIncoming && !isOptimistic) {
            playChatNotificationSound();
        }
        lastNotifiedMessageIdRef.current = lastId;
    }, [activeRoomId, userId, messages]);

    useEffect(() => {
        if (!activeRoomId || !userId) return;
        const hasIncomingUnread = messages.some((m) => m?.sender?.id && m.sender.id !== userId && m.is_read === false);
        if (hasIncomingUnread && !markReadMutation.isPending) {
            markReadMutation.mutate();
        }
        // eslint-disable-next-line react-hooks/exhaustive-deps
    }, [activeRoomId, userId, messages.length]);

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
        <div className="page-enter chat-page-wrap" style={{ height: 'calc(100vh - 64px)', display: 'flex', flexDirection: 'column', overflow: 'hidden' }}>
            <div className="gh-container" style={{ flex: '1 1 0%', minHeight: 0, display: 'flex', flexDirection: 'column', maxWidth: 'none', overflow: 'hidden' }}>
                {/* Breadcrumbs */}
                <div className="breadcrumbs" style={{ flexShrink: 0 }}>
                    <Link to="/">{t('common.home')}</Link>
                    <span className="breadcrumb-separator">/</span>
                    <span className="breadcrumb-current">{t('nav.chat') || 'Xabarlar'}</span>
                </div>

                {/* Page title + ovoz tugmasi */}
                <div className="chat-page-title" style={{ display: 'flex', alignItems: 'center', gap: '12px', marginTop: '16px', marginBottom: '16px', paddingLeft: '12px', flexShrink: 0 }}>
                    <MessageCircle style={{ width: '28px', height: '28px', color: 'var(--color-accent-blue)' }} />
                    <h1 style={{ fontSize: 'var(--font-size-2xl)', fontWeight: 'var(--font-weight-bold)', color: 'var(--color-text-primary)', margin: 0, flex: 1 }}>
                        {t('nav.chat') || 'Xabarlar'}
                    </h1>
                    <button
                        type="button"
                        onClick={toggleSound}
                        className="btn btn-ghost btn-sm"
                        aria-label={soundEnabled ? (t('chat.sound_off') || 'Ovozni o\'chirish') : (t('chat.sound_on') || 'Ovozni yoqish')}
                        title={soundEnabled ? (t('chat.sound_off') || 'Ovozni o\'chirish') : (t('chat.sound_on') || 'Ovozni yoqish')}
                        style={{
                            width: '40px',
                            height: '40px',
                            padding: 0,
                            borderRadius: 'var(--radius-lg)',
                            display: 'flex',
                            alignItems: 'center',
                            justifyContent: 'center',
                            color: soundEnabled ? 'var(--color-accent-blue)' : 'var(--color-text-muted)',
                            border: '1px solid var(--color-border-muted)',
                            backgroundColor: 'var(--color-bg-primary)',
                        }}
                    >
                        {soundEnabled ? <Volume2 style={{ width: '20px', height: '20px' }} /> : <VolumeX style={{ width: '20px', height: '20px' }} />}
                    </button>
                </div>

                {/* Telegram-style layout */}
                <div
                    className="chat-page-grid"
                    style={{
                        flex: '1 1 0%',
                        minHeight: 0,
                        display: 'grid',
                        gridTemplateColumns: '320px 1fr',
                        gridTemplateRows: 'minmax(0, 1fr)',
                        backgroundColor: 'var(--color-bg-secondary)',
                        border: '1px solid var(--color-border-default)',
                        borderRadius: 'var(--radius-xl)',
                        overflow: 'hidden',
                        position: 'relative',
                        marginBottom: '10px',
                    }}
                >
                    {/* Close / back button — mobil: aniq ko'rinsin, X bosilganda userlar ro'yxati (yoki bosh sahifa) */}
                    <button
                        type="button"
                        onClick={handleClose}
                        className="btn btn-ghost btn-sm chat-close-btn"
                        aria-label={t('common.back') || 'Orqaga'}
                        style={{
                            position: 'absolute',
                            top: '10px',
                            right: '10px',
                            zIndex: 15,
                            width: '44px',
                            height: '44px',
                            padding: 0,
                            borderRadius: 'var(--radius-lg)',
                            backgroundColor: 'var(--color-bg-primary)',
                            border: '1px solid var(--color-border-muted)',
                            display: 'flex',
                            alignItems: 'center',
                            justifyContent: 'center',
                        }}
                    >
                        <X style={{ width: '20px', height: '20px' }} />
                    </button>

                    {/* Left: conversations */}
                    <div className="chat-page-list" style={{ borderRight: '1px solid var(--color-border-muted)', overflow: 'hidden', display: 'flex', flexDirection: 'column', minHeight: 0 }}>
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
                                    <p className="empty-state-description">{t('chat.no_conversations')}</p>
                                </div>
                            ) : (
                                chats.map((room) => {
                                    const participants = room?.participants ?? [];
                                    const other = participants.find((p) => p?.id && p.id !== user.id) ?? participants[0] ?? null;
                                    const sellerName = other?.display_name || other?.name || t('detail.seller') || 'Sotuvchi';
                                    const listingTitle = room?.listing?.title || '';
                                    const listingGameName = room?.listing?.game_name || '';
                                    const listingImage = room?.listing?.primary_image || null;
                                    const otherAvatar = other?.avatar || other?.profile_image || other?.image || null;
                                    const listingUrl = resolveImageUrl(listingImage);
                                    const avatarUrl = resolveImageUrl(otherAvatar);
                                    const unread = Number(room?.unread_count ?? 0) || 0;
                                    const isActive = String(room?.id) === String(activeRoomId);
                                    const primaryTitle = listingTitle || sellerName;

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
                                                borderLeft: isActive ? '3px solid #2563EB' : '3px solid transparent',
                                                cursor: 'pointer',
                                                textAlign: 'left',
                                                marginBottom: '4px',
                                                transition: 'background-color 0.15s',
                                            }}
                                        >
                                            {listingUrl ? (
                                                <img
                                                    src={listingUrl}
                                                    alt=""
                                                    style={{ width: '44px', height: '44px', borderRadius: 'var(--radius-lg)', objectFit: 'cover', flexShrink: 0 }}
                                                />
                                            ) : avatarUrl ? (
                                                <img
                                                    src={avatarUrl}
                                                    alt=""
                                                    style={{ width: '44px', height: '44px', borderRadius: 'var(--radius-full)', objectFit: 'cover', flexShrink: 0 }}
                                                />
                                            ) : (
                                                <div style={{ width: '44px', height: '44px', borderRadius: 'var(--radius-lg)', backgroundColor: 'var(--color-bg-tertiary)', display: 'flex', alignItems: 'center', justifyContent: 'center', fontSize: 'var(--font-size-base)', fontWeight: 'var(--font-weight-semibold)', color: 'var(--color-text-muted)', flexShrink: 0 }}>
                                                    {getDisplayInitial(primaryTitle)}
                                                </div>
                                            )}
                                            <div className="flex-1 min-w-0">
                                                <div className="flex items-center justify-between gap-3">
                                                    <p className="truncate" style={{ fontSize: 'var(--font-size-sm)', fontWeight: 'var(--font-weight-semibold)', color: 'var(--color-text-primary)', margin: 0 }}>
                                                        {primaryTitle}
                                                    </p>
                                                    {unread > 0 && (
                                                        <span style={{ fontSize: 'var(--font-size-xs)', padding: '2px 8px', borderRadius: '999px', backgroundColor: 'var(--color-accent-blue)', color: '#fff', flexShrink: 0 }}>
                                                            {unread}
                                                        </span>
                                                    )}
                                                </div>
                                                <p className="truncate" style={{ fontSize: 'var(--font-size-xs)', color: 'var(--color-text-muted)', margin: '2px 0 0 0' }}>
                                                    {listingGameName ? `${listingGameName} · ${sellerName}` : sellerName}
                                                </p>
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
                    <div className="chat-page-messages-panel" style={{ display: 'flex', flexDirection: 'column', overflow: 'hidden', minHeight: 0, position: 'relative' }}>
                        <div style={{ padding: '12px 14px', backgroundColor: 'var(--color-bg-primary)', borderBottom: '1px solid var(--color-border-muted)', flexShrink: 0, display: 'flex', alignItems: 'center', gap: '10px' }}>
                            {activeRoom && activeRoomOther ? (
                                <div style={{ display: 'flex', alignItems: 'center', gap: '10px', flex: 1, minWidth: 0 }}>
                                    {resolveImageUrl(activeRoom?.listing?.primary_image) ? (
                                        <img
                                            src={resolveImageUrl(activeRoom.listing.primary_image)}
                                            alt=""
                                            style={{ width: '36px', height: '36px', borderRadius: 'var(--radius-md)', objectFit: 'cover', flexShrink: 0 }}
                                        />
                                    ) : resolveImageUrl(activeRoomOther.avatar) ? (
                                        <img
                                            src={resolveImageUrl(activeRoomOther.avatar)}
                                            alt=""
                                            style={{ width: '36px', height: '36px', borderRadius: 'var(--radius-full)', objectFit: 'cover', flexShrink: 0 }}
                                        />
                                    ) : (
                                        <div
                                            style={{
                                                width: '36px',
                                                height: '36px',
                                                borderRadius: 'var(--radius-md)',
                                                backgroundColor: 'var(--color-bg-tertiary)',
                                                display: 'flex',
                                                alignItems: 'center',
                                                justifyContent: 'center',
                                                fontSize: 'var(--font-size-sm)',
                                                fontWeight: 'var(--font-weight-semibold)',
                                                color: 'var(--color-text-secondary)',
                                                flexShrink: 0,
                                            }}
                                        >
                                            {getDisplayInitial(activeRoom?.listing?.title || activeRoomOther.display_name)}
                                        </div>
                                    )}
                                    <div className="flex-1 min-w-0">
                                        <p className="truncate" style={{ margin: 0, fontWeight: 'var(--font-weight-semibold)', color: 'var(--color-text-primary)', fontSize: 'var(--font-size-sm)' }}>
                                            {activeRoom?.listing?.title || activeRoomOther.display_name}
                                        </p>
                                        {activeRoom?.listing?.title && (
                                            <Link
                                                to={`/seller/${activeRoomOther.id}`}
                                                state={{ seller: { id: activeRoomOther.id, display_name: activeRoomOther.display_name, name: activeRoomOther.display_name, avatar: activeRoomOther.avatar } }}
                                                style={{ textDecoration: 'none' }}
                                            >
                                                <p className="truncate" style={{ margin: 0, fontSize: 'var(--font-size-xs)', color: 'var(--color-text-muted)' }}>
                                                    {activeRoom?.listing?.game_name ? `${activeRoom.listing.game_name} · ` : ''}{activeRoomOther.display_name}
                                                </p>
                                            </Link>
                                        )}
                                    </div>
                                </div>
                            ) : (
                                <p style={{ margin: 0, fontWeight: 'var(--font-weight-semibold)', color: 'var(--color-text-primary)' }}>
                                    {t('chat.choose')}
                                </p>
                            )}
                        </div>

                        <div
                            style={{
                                flex: '1 1 0%',
                                minHeight: 0,
                                overflowY: 'auto',
                                overflowX: 'hidden',
                                WebkitOverflowScrolling: 'touch',
                                padding: '14px',
                                display: 'flex',
                                flexDirection: 'column',
                                gap: '10px',
                                scrollbarGutter: 'stable',
                            }}
                        >
                            {!activeRoom ? (
                                <div className="empty-state" style={{ flex: 1, minHeight: 0, padding: '48px 16px' }}>
                                    <MessageCircle className="empty-state-icon" style={{ width: '64px', height: '64px' }} />
                                    <p className="empty-state-description">{t('chat.choose_hint')}</p>
                                </div>
                            ) : isMessagesLoading ? (
                                <p style={{ color: 'var(--color-text-muted)', fontSize: 'var(--font-size-sm)' }}>
                                    {t('common.loading') || 'Yuklanmoqda...'}
                                </p>
                            ) : (
                                messages.map((msg, idx) => {
                                    const isMe = msg.sender?.id === user.id;
                                    const senderAvatar = msg.sender?.avatar || msg.sender?.profile_image || msg.sender?.image || null;
                                    const senderName = msg.sender?.display_name || msg.sender?.name || '';
                                    // Date separator
                                    const msgDate = msg.created_at ? new Date(msg.created_at) : null;
                                    const prevMsg = idx > 0 ? messages[idx - 1] : null;
                                    const prevDate = prevMsg?.created_at ? new Date(prevMsg.created_at) : null;
                                    const showDateSep = msgDate && (!prevDate || msgDate.toDateString() !== prevDate.toDateString());
                                    const today = new Date();
                                    const yesterday = new Date(); yesterday.setDate(today.getDate() - 1);
                                    const dateLocale = language === 'ru' ? 'ru-RU' : language === 'en' ? 'en-US' : 'uz-UZ';
                                    const dateSepLabel = msgDate
                                        ? (msgDate.toDateString() === today.toDateString() ? (t('chat.today') || 'Bugun')
                                          : msgDate.toDateString() === yesterday.toDateString() ? (t('chat.yesterday') || 'Kecha')
                                          : msgDate.toLocaleDateString(dateLocale, { day: '2-digit', month: '2-digit', year: 'numeric' }))
                                        : '';
                                    return (
                                        <div key={msg.id}>
                                            {showDateSep && (
                                                <div style={{ display: 'flex', alignItems: 'center', gap: '10px', margin: '8px 0', padding: '0 4px' }}>
                                                    <div style={{ flex: 1, height: '1px', backgroundColor: 'var(--color-border-muted)' }} />
                                                    <span style={{ fontSize: '11px', color: 'var(--color-text-muted)', flexShrink: 0, padding: '2px 8px', backgroundColor: 'var(--color-bg-secondary)', borderRadius: '999px', border: '1px solid var(--color-border-muted)' }}>
                                                        {dateSepLabel}
                                                    </span>
                                                    <div style={{ flex: 1, height: '1px', backgroundColor: 'var(--color-border-muted)' }} />
                                                </div>
                                            )}
                                        <div style={{ display: 'flex', alignItems: 'flex-end', justifyContent: isMe ? 'flex-end' : 'flex-start', gap: '8px' }}>
                                            {!isMe &&
                                                (resolveImageUrl(senderAvatar) ? (
                                                    <img
                                                        src={resolveImageUrl(senderAvatar)}
                                                        alt=""
                                                        style={{ width: '28px', height: '28px', borderRadius: 'var(--radius-full)', objectFit: 'cover', flexShrink: 0, alignSelf: 'flex-end' }}
                                                    />
                                                ) : (
                                                    <div
                                                        style={{
                                                            width: '28px',
                                                            height: '28px',
                                                            borderRadius: 'var(--radius-full)',
                                                            backgroundColor: 'var(--color-bg-tertiary)',
                                                            display: 'flex',
                                                            alignItems: 'center',
                                                            justifyContent: 'center',
                                                            fontSize: 'var(--font-size-xs)',
                                                            fontWeight: 'var(--font-weight-semibold)',
                                                            color: 'var(--color-text-muted)',
                                                            flexShrink: 0,
                                                            alignSelf: 'flex-end',
                                                        }}
                                                    >
                                                        {getDisplayInitial(senderName)}
                                                    </div>
                                                ))}
                                            <div style={{ maxWidth: '72%', minWidth: 0, display: 'flex', flexDirection: 'column', alignItems: isMe ? 'flex-end' : 'flex-start' }}>
                                                {!isMe && senderName && (
                                                    <span style={{ fontSize: '11px', color: 'var(--color-text-muted)', marginBottom: '3px', paddingLeft: '4px', fontWeight: 600 }}>{senderName}</span>
                                                )}
                                            <div
                                                style={{
                                                    padding: '10px 14px',
                                                    overflowWrap: 'break-word',
                                                    wordBreak: 'break-word',
                                                    boxShadow: '0 1px 2px rgba(0,0,0,0.10)',
                                                    ...(isMe
                                                        ? {
                                                            background: 'linear-gradient(135deg, #2563EB, #1d4ed8)',
                                                            color: '#ffffff',
                                                            borderRadius: '18px 18px 4px 18px',
                                                        }
                                                        : {
                                                            backgroundColor: 'var(--color-bg-secondary)',
                                                            color: 'var(--color-text-primary)',
                                                            border: '1px solid var(--color-border-muted)',
                                                            borderRadius: '18px 18px 18px 4px',
                                                        }),
                                                }}
                                            >
                                                <p style={{ fontSize: '14px', lineHeight: '1.5', margin: 0, whiteSpace: 'pre-wrap', overflowWrap: 'break-word', wordBreak: 'break-word', fontWeight: 400 }}>{msg.content}</p>
                                                <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'flex-end', gap: '4px', marginTop: '4px' }}>
                                                    <span style={{ fontSize: '11px', opacity: isMe ? 0.75 : 0.7, color: isMe ? '#fff' : 'var(--color-text-muted)' }}>
                                                        {msg.created_at ? new Date(msg.created_at).toLocaleTimeString('uz-UZ', { hour: '2-digit', minute: '2-digit' }) : ''}
                                                    </span>
                                                    {isMe && (
                                                        <span style={{ fontSize: '12px', lineHeight: 1, color: msg.is_read ? '#93c5fd' : 'rgba(255,255,255,0.6)' }}>
                                                            {msg.is_read ? '✓✓' : '✓'}
                                                        </span>
                                                    )}
                                                </div>
                                            </div>
                                            </div>
                                        </div>
                                        </div>
                                    );
                                })
                            )}
                            <div ref={messagesEndRef} />
                        </div>

                        <form onSubmit={handleSend} style={{ padding: '10px 12px', borderTop: '1px solid var(--color-border-muted)', backgroundColor: 'var(--color-bg-primary)', flexShrink: 0 }}>
                            <div style={{ display: 'flex', gap: '8px', alignItems: 'flex-end' }}>
                                <textarea
                                    value={text}
                                    onChange={(e) => { setText(e.target.value); e.target.style.height = 'auto'; e.target.style.height = Math.min(e.target.scrollHeight, 120) + 'px'; }}
                                    onKeyDown={(e) => { if (e.key === 'Enter' && !e.shiftKey) { e.preventDefault(); handleSend(e); } }}
                                    placeholder={activeRoom ? (t('detail.write_message') || 'Xabar yozing...') : (t('chat.choose_placeholder') || 'Avval suhbatni tanlang')}
                                    disabled={!activeRoom || sendMessageMutation.isPending}
                                    rows={1}
                                    style={{
                                        flex: 1,
                                        resize: 'none',
                                        minHeight: '44px',
                                        maxHeight: '120px',
                                        overflowY: 'auto',
                                        padding: '10px 16px',
                                        borderRadius: '22px',
                                        border: '1.5px solid var(--color-border-default)',
                                        backgroundColor: 'var(--color-bg-secondary)',
                                        color: 'var(--color-text-primary)',
                                        fontSize: '14px',
                                        lineHeight: '1.5',
                                        outline: 'none',
                                        transition: 'border-color 0.15s',
                                        fontFamily: 'inherit',
                                    }}
                                    onFocus={(e) => { e.target.style.borderColor = '#2563EB'; }}
                                    onBlur={(e) => { e.target.style.borderColor = 'var(--color-border-default)'; }}
                                />
                                <button
                                    type="submit"
                                    disabled={!activeRoom || !text.trim() || sendMessageMutation.isPending}
                                    style={{
                                        width: '44px',
                                        height: '44px',
                                        borderRadius: '50%',
                                        border: 'none',
                                        cursor: text.trim() && activeRoom ? 'pointer' : 'default',
                                        background: text.trim() && activeRoom ? 'linear-gradient(135deg, #2563EB, #1d4ed8)' : 'var(--color-bg-tertiary)',
                                        color: text.trim() && activeRoom ? '#ffffff' : 'var(--color-text-muted)',
                                        display: 'flex',
                                        alignItems: 'center',
                                        justifyContent: 'center',
                                        flexShrink: 0,
                                        transition: 'transform 0.15s, background 0.2s',
                                        boxShadow: text.trim() && activeRoom ? '0 2px 8px rgba(37,99,235,0.35)' : 'none',
                                    }}
                                    onMouseEnter={(e) => { if (text.trim() && activeRoom) e.currentTarget.style.transform = 'scale(1.08)'; }}
                                    onMouseLeave={(e) => { e.currentTarget.style.transform = 'scale(1)'; }}
                                >
                                    <Send style={{ width: '18px', height: '18px' }} />
                                </button>
                            </div>
                        </form>
                    </div>
                </div>
            </div>
        </div>
    );
}
