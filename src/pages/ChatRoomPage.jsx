import { useEffect, useMemo, useRef, useState } from 'react';
import { useParams, useNavigate, Link } from 'react-router-dom';
import { Send, MessageCircle, AlertTriangle, X, Volume2, VolumeX } from 'lucide-react';
import { useAuth } from '../context/AuthContext';
import { useChats, useChatMessages, useMarkChatRead, useSendMessage, useChatSoundEnabled } from '../hooks/useChat';
import { useLanguage } from '../context/LanguageContext';
import { resolveImageUrl, getDisplayInitial } from '../lib/displayUtils';
import { ensureSoundUnlocked, playChatNotificationSound } from '../lib/notificationSound';

/**
 * Sahifa: xarid (to'lov) dan keyin ochiladigan chat — xaridor, sotuvchi va admin.
 * URL: /chat/:roomId
 */
export default function ChatRoomPage() {
    const { roomId } = useParams();
    const navigate = useNavigate();
    const { user, isAuthenticated } = useAuth();
    const userId = user?.id ?? null;
    const { t, language } = useLanguage();
    const [text, setText] = useState('');
    const [soundEnabled, toggleSound] = useChatSoundEnabled();

    const { data: chatsData } = useChats();
    const activeRoom = useMemo(() => {
        const list = chatsData?.results ?? chatsData ?? [];
        if (!Array.isArray(list)) return null;
        return list.find((r) => String(r?.id) === String(roomId)) ?? null;
    }, [chatsData, roomId]);

    const {
        data: messagesData,
        isLoading,
        fetchNextPage,
        hasNextPage,
        isFetchingNextPage,
    } = useChatMessages(roomId);
    const sendMessageMutation = useSendMessage(roomId);
    const markReadMutation = useMarkChatRead(roomId);

    // API yangisi birinchi qaytaradi; ekranda eskisi tepada, yangisi pastda bo'lishi uchun teskari
    const messages = useMemo(() => {
        const arr = messagesData?.pages?.flatMap((p) => p.results ?? p) ?? [];
        return [...arr].reverse();
    }, [messagesData]);
    const messagesEndRef = useRef(null);
    const lastNotifiedMessageIdRef = useRef(null);

    const otherUser = useMemo(() => {
        const list = messagesData?.pages?.flatMap((p) => p.results ?? p) ?? [];
        if (!user || !list.length) return null;
        const firstOther = list.find((m) => m?.sender?.id && m.sender.id !== user.id);
        const s = firstOther?.sender;
        if (!s?.id) return null;
        return {
            id: s.id,
            display_name: s.display_name || s.name || '',
            avatar: s.avatar || s.profile_image || s.image || null,
        };
    }, [user, messagesData]);

    useEffect(() => {
        // yangi xabar kelganda pastga scroll
        messagesEndRef.current?.scrollIntoView({ behavior: 'smooth' });
    }, [messages.length]);

    useEffect(() => {
        ensureSoundUnlocked();
    }, []);

    useEffect(() => {
        if (!isAuthenticated || !user) {
            navigate('/login?redirect=' + encodeURIComponent('/chat/' + roomId), { replace: true });
        }
    }, [isAuthenticated, user, navigate, roomId]);

    useEffect(() => {
        if (!userId) return;
        if (!messages.length) return;
        const last = messages[messages.length - 1];
        const lastId = last?.id ?? null;
        if (!lastId || lastId === lastNotifiedMessageIdRef.current) return;

        const senderId = last?.sender?.id ?? null;
        const isIncoming = senderId && senderId !== userId;
        const isOptimistic = String(lastId).startsWith('optimistic-');
        if (isIncoming && !isOptimistic) {
            playChatNotificationSound();
        }
        lastNotifiedMessageIdRef.current = lastId;
    }, [userId, messages]);

    useEffect(() => {
        // Chat ochilganda kelgan xabarlarni "o'qildi" qilish
        if (!roomId || !userId) return;
        const hasIncomingUnread = messages.some((m) => m?.sender?.id && m.sender.id !== userId && m.is_read === false);
        if (hasIncomingUnread && !markReadMutation.isPending) {
            markReadMutation.mutate();
        }
        // eslint-disable-next-line react-hooks/exhaustive-deps
    }, [roomId, userId, messages.length]);

    const handleSend = (e) => {
        e.preventDefault();
        if (!text.trim() || sendMessageMutation.isPending) return;
        sendMessageMutation.mutate(text.trim(), {
            onSuccess: () => setText(''),
        });
    };

    if (!isAuthenticated || !user) return null;

    return (
        <div className="page-enter" style={{ minHeight: 'calc(100vh - 64px)', display: 'flex', flexDirection: 'column' }}>
            <div className="gh-container chat-room-page" style={{ flex: 1, minHeight: 0, maxWidth: '720px', margin: '0 auto', paddingTop: '24px', paddingLeft: 'var(--space-4)', paddingRight: 'var(--space-4)', display: 'flex', flexDirection: 'column' }}>
                <div
                    className="chat-room-header"
                    style={{
                        display: 'flex',
                        alignItems: 'center',
                        gap: '12px',
                        marginBottom: '24px',
                        borderBottom: '1px solid var(--color-border-muted)',
                        paddingBottom: '16px',
                    }}
                >
                    <Link
                        to="/chat"
                        className="btn btn-ghost btn-sm"
                        style={{
                            display: 'flex',
                            alignItems: 'center',
                            justifyContent: 'center',
                            gap: '6px',
                            minWidth: '44px',
                            minHeight: '44px',
                            padding: '10px',
                            borderRadius: 'var(--radius-lg)',
                            border: '1px solid var(--color-border-muted)',
                            backgroundColor: 'var(--color-bg-primary)',
                        }}
                        aria-label={t('common.back') || 'Orqaga — userlar ro\'yxati'}
                    >
                        <X style={{ width: '20px', height: '20px' }} />
                    </Link>
                    <div style={{ display: 'flex', alignItems: 'center', gap: '10px', flex: 1, minWidth: 0 }}>
                        {resolveImageUrl(activeRoom?.listing?.primary_image) ? (
                            <img
                                src={resolveImageUrl(activeRoom.listing.primary_image)}
                                alt=""
                                style={{ width: '36px', height: '36px', borderRadius: 'var(--radius-md)', objectFit: 'cover', flexShrink: 0 }}
                            />
                        ) : (
                            <MessageCircle style={{ width: '22px', height: '22px', color: 'var(--color-accent-blue)', flexShrink: 0 }} />
                        )}
                        <div className="min-w-0">
                            <h1 className="truncate" style={{ fontSize: 'var(--font-size-base)', fontWeight: 'var(--font-weight-semibold)', margin: 0, color: 'var(--color-text-primary)' }}>
                                {activeRoom?.listing?.title || t('detail.order_chat') || 'Buyurtma chat'}
                            </h1>
                            {activeRoom?.listing?.game_name && (
                                <p className="truncate" style={{ margin: 0, fontSize: 'var(--font-size-xs)', color: 'var(--color-text-muted)' }}>
                                    {activeRoom.listing.game_name}
                                </p>
                            )}
                        </div>
                    </div>
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

                {/* Ogohlantirish: firibgarlardan ehtiyot bo'lish */}
                <div
                    role="alert"
                    className="chat-room-warning"
                    style={{
                        marginBottom: '16px',
                        padding: '14px 16px',
                        backgroundColor: 'var(--color-warning-bg, #fef3c7)',
                        border: '1px solid var(--color-warning-border, #f59e0b)',
                        borderRadius: 'var(--radius-xl)',
                        display: 'flex',
                        gap: '12px',
                        alignItems: 'flex-start',
                    }}
                >
                    <AlertTriangle style={{ width: '22px', height: '22px', color: 'var(--color-warning, #d97706)', flexShrink: 0, marginTop: '2px' }} />
                    <div>
                        <p style={{ fontWeight: 'var(--font-weight-semibold)', color: 'var(--color-text-primary)', margin: '0 0 6px 0', fontSize: 'var(--font-size-sm)' }}>
                            {t('detail.chat_safety_title') || 'Firibgarlardan (mashenniklardan) ehtiyot bo\'ling'}
                        </p>
                        <p style={{ margin: 0, fontSize: 'var(--font-size-sm)', color: 'var(--color-text-secondary)', lineHeight: 1.45 }}>
                            {t('detail.chat_safety_warning')}
                        </p>
                    </div>
                </div>

                <div
                    style={{
                        backgroundColor: 'var(--color-bg-secondary)',
                        borderRadius: 'var(--radius-xl)',
                        border: '1px solid var(--color-border-default)',
                        flex: 1,
                        minHeight: 0,
                        display: 'flex',
                        flexDirection: 'column',
                        overflow: 'hidden',
                    }}
                >
                    {otherUser && (
                        <div style={{ padding: '12px 14px', backgroundColor: 'var(--color-bg-primary)', borderBottom: '1px solid var(--color-border-muted)', flexShrink: 0 }}>
                            <Link
                                to={`/seller/${otherUser.id}`}
                                state={{ seller: { id: otherUser.id, display_name: otherUser.display_name, name: otherUser.display_name, avatar: otherUser.avatar } }}
                                style={{ display: 'flex', alignItems: 'center', gap: '10px', textDecoration: 'none', color: 'inherit' }}
                            >
                                {resolveImageUrl(otherUser.avatar) ? (
                                    <img
                                        src={resolveImageUrl(otherUser.avatar)}
                                        alt=""
                                        style={{ width: '36px', height: '36px', borderRadius: 'var(--radius-full)', objectFit: 'cover', flexShrink: 0 }}
                                    />
                                ) : (
                                    <div
                                        style={{
                                            width: '36px',
                                            height: '36px',
                                            borderRadius: 'var(--radius-full)',
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
                                        {getDisplayInitial(otherUser.display_name)}
                                    </div>
                                )}
                                <span style={{ fontWeight: 'var(--font-weight-semibold)', color: 'var(--color-text-primary)' }}>
                                    {otherUser.display_name || (t('detail.seller') || 'Sotuvchi')}
                                </span>
                            </Link>
                        </div>
                    )}
                    <div
                        className="chat-room-messages"
                        style={{
                            flex: 1,
                            minHeight: 0,
                            overflowY: 'auto',
                            padding: '16px',
                            display: 'flex',
                            flexDirection: 'column',
                            gap: '10px',
                            scrollbarGutter: 'stable',
                            scrollbarWidth: 'thin',
                        }}
                    >
                        {isLoading ? (
                            <p style={{ color: 'var(--color-text-muted)', fontSize: 'var(--font-size-sm)' }}>
                                {t('common.loading') || 'Yuklanmoqda...'}
                            </p>
                        ) : messages.length === 0 ? (
                            <div style={{ textAlign: 'center', padding: '32px', color: 'var(--color-text-muted)', fontSize: 'var(--font-size-sm)' }}>
                                <MessageCircle style={{ width: '48px', height: '48px', margin: '0 auto 12px', opacity: 0.5 }} />
                                <p>{t('detail.no_messages') || 'Xabar yo\'q. Birinchi xabarni yozing.'}</p>
                            </div>
                        ) : (
                            <>
                                {hasNextPage && (
                                    <div style={{ display: 'flex', justifyContent: 'center', marginBottom: '6px' }}>
                                        <button
                                            className="btn btn-ghost btn-sm"
                                            onClick={() => fetchNextPage()}
                                            disabled={isFetchingNextPage}
                                        >
                                            {isFetchingNextPage ? (t('common.loading') || 'Yuklanmoqda...') : (t('chat.load_older') || 'Eski xabarlar')}
                                        </button>
                                    </div>
                                )}

                                {messages.map((msg, idx) => {
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
                                // System message
                                if (msg.message_type === 'system') {
                                    return (
                                        <div key={msg.id}>
                                            {showDateSep && (
                                                <div style={{ display: 'flex', alignItems: 'center', gap: '10px', margin: '8px 0', padding: '0 4px' }}>
                                                    <div style={{ flex: 1, height: '1px', backgroundColor: 'var(--color-border-muted)' }} />
                                                    <span style={{ fontSize: '11px', color: 'var(--color-text-muted)', flexShrink: 0, padding: '2px 8px', backgroundColor: 'var(--color-bg-secondary)', borderRadius: '999px', border: '1px solid var(--color-border-muted)' }}>{dateSepLabel}</span>
                                                    <div style={{ flex: 1, height: '1px', backgroundColor: 'var(--color-border-muted)' }} />
                                                </div>
                                            )}
                                            <div style={{ textAlign: 'center', padding: '8px 0' }}>
                                                <span style={{ fontSize: '12px', color: 'var(--color-text-muted)', backgroundColor: 'var(--color-bg-secondary)', padding: '4px 12px', borderRadius: 'var(--radius-full)', border: '1px solid var(--color-border-muted)' }}>
                                                    🛡️ {msg.content}
                                                </span>
                                            </div>
                                        </div>
                                    );
                                }
                                return (
                                    <div key={msg.id}>
                                        {showDateSep && (
                                            <div style={{ display: 'flex', alignItems: 'center', gap: '10px', margin: '8px 0', padding: '0 4px' }}>
                                                <div style={{ flex: 1, height: '1px', backgroundColor: 'var(--color-border-muted)' }} />
                                                <span style={{ fontSize: '11px', color: 'var(--color-text-muted)', flexShrink: 0, padding: '2px 8px', backgroundColor: 'var(--color-bg-secondary)', borderRadius: '999px', border: '1px solid var(--color-border-muted)' }}>{dateSepLabel}</span>
                                                <div style={{ flex: 1, height: '1px', backgroundColor: 'var(--color-border-muted)' }} />
                                            </div>
                                        )}
                                    <div
                                        style={{
                                            display: 'flex',
                                            alignItems: 'flex-end',
                                            justifyContent: isMe ? 'flex-end' : 'flex-start',
                                            gap: '8px',
                                        }}
                                    >
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
                                })}
                                <div ref={messagesEndRef} />
                            </>
                        )}
                    </div>

                    <form
                        onSubmit={handleSend}
                        className="chat-room-form"
                        style={{
                            padding: '10px 12px',
                            borderTop: '1px solid var(--color-border-muted)',
                            backgroundColor: 'var(--color-bg-primary)',
                            flexShrink: 0,
                        }}
                    >
                        <div style={{ display: 'flex', gap: '8px', alignItems: 'flex-end' }}>
                        <textarea
                            value={text}
                            onChange={(e) => { setText(e.target.value); e.target.style.height = 'auto'; e.target.style.height = Math.min(e.target.scrollHeight, 120) + 'px'; }}
                            onKeyDown={(e) => { if (e.key === 'Enter' && !e.shiftKey) { e.preventDefault(); handleSend(e); } }}
                            placeholder={t('detail.write_message') || 'Xabar yozing...'}
                            disabled={sendMessageMutation.isPending}
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
                            disabled={!text.trim() || sendMessageMutation.isPending}
                            style={{
                                width: '44px',
                                height: '44px',
                                borderRadius: '50%',
                                border: 'none',
                                cursor: text.trim() ? 'pointer' : 'default',
                                background: text.trim() ? 'linear-gradient(135deg, #2563EB, #1d4ed8)' : 'var(--color-bg-tertiary)',
                                color: text.trim() ? '#ffffff' : 'var(--color-text-muted)',
                                display: 'flex',
                                alignItems: 'center',
                                justifyContent: 'center',
                                flexShrink: 0,
                                transition: 'transform 0.15s, background 0.2s',
                                boxShadow: text.trim() ? '0 2px 8px rgba(37,99,235,0.35)' : 'none',
                            }}
                            onMouseEnter={(e) => { if (text.trim()) e.currentTarget.style.transform = 'scale(1.05)'; }}
                            onMouseLeave={(e) => { e.currentTarget.style.transform = 'scale(1)'; }}
                        >
                            <Send style={{ width: '18px', height: '18px' }} />
                        </button>
                        </div>
                    </form>
                </div>
            </div>
        </div>
    );
}
