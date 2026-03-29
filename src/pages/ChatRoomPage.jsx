import { useEffect, useMemo, useRef, useState } from 'react';
import { useParams, useNavigate, Link } from 'react-router-dom';
import { Send, MessageCircle, AlertTriangle, X, Volume2, VolumeX } from 'lucide-react';
import { useAuth } from '../context/AuthContext';
import { useTheme } from '../context/ThemeContext';
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
    const { isDark } = useTheme();
    const userId = user?.id ?? null;
    const { t, language } = useLanguage();

    // Theme-aware chat colors for maximum readability
    const chatColors = {
        msgText: isDark ? '#f1f5f9' : '#1e293b',
        senderName: isDark ? '#60a5fa' : '#2563eb',
        timestamp: isDark ? '#94a3b8' : '#64748b',
        incomingBg: isDark ? 'rgba(255,255,255,0.08)' : '#ffffff',
        incomingBorder: isDark ? 'rgba(255,255,255,0.12)' : '#e2e8f0',
        dateSep: isDark ? '#cbd5e1' : '#475569',
        systemMsg: isDark ? '#cbd5e1' : '#475569',
    };
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
                            <h1 className="truncate" style={{ fontSize: '17px', fontWeight: 700, margin: 0, color: 'var(--color-text-primary)', letterSpacing: '-0.01em' }}>
                                {activeRoom?.listing?.title || t('detail.order_chat') || 'Buyurtma chat'}
                            </h1>
                            {activeRoom?.listing?.game_name && (
                                <p className="truncate" style={{ margin: '2px 0 0 0', fontSize: '13px', fontWeight: 500, color: 'var(--color-text-secondary)' }}>
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
                        <p style={{ fontWeight: 700, color: 'var(--color-text-primary)', margin: '0 0 6px 0', fontSize: '14px' }}>
                            {t('detail.chat_safety_title') || 'Firibgarlardan (mashenniklardan) ehtiyot bo\'ling'}
                        </p>
                        <p style={{ margin: 0, fontSize: '14px', fontWeight: 500, color: 'var(--color-text-secondary)', lineHeight: 1.5 }}>
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
                        <div style={{ padding: '14px 16px', backgroundColor: 'var(--color-bg-primary)', borderBottom: '1px solid var(--color-border-muted)', flexShrink: 0 }}>
                            <Link
                                to={`/seller/${otherUser.id}`}
                                state={{ seller: { id: otherUser.id, display_name: otherUser.display_name, name: otherUser.display_name, avatar: otherUser.avatar } }}
                                style={{ display: 'flex', alignItems: 'center', gap: '12px', textDecoration: 'none', color: 'inherit' }}
                            >
                                {resolveImageUrl(otherUser.avatar) ? (
                                    <img
                                        src={resolveImageUrl(otherUser.avatar)}
                                        alt=""
                                        style={{ width: '40px', height: '40px', borderRadius: 'var(--radius-full)', objectFit: 'cover', flexShrink: 0 }}
                                    />
                                ) : (
                                    <div
                                        style={{
                                            width: '40px',
                                            height: '40px',
                                            borderRadius: 'var(--radius-full)',
                                            backgroundColor: 'var(--color-bg-tertiary)',
                                            display: 'flex',
                                            alignItems: 'center',
                                            justifyContent: 'center',
                                            fontSize: '15px',
                                            fontWeight: 700,
                                            color: 'var(--color-text-secondary)',
                                            flexShrink: 0,
                                        }}
                                    >
                                        {getDisplayInitial(otherUser.display_name)}
                                    </div>
                                )}
                                <span style={{ fontWeight: 700, fontSize: '15px', color: 'var(--color-text-primary)' }}>
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
                            <p style={{ color: 'var(--color-text-secondary)', fontSize: '15px', fontWeight: 500 }}>
                                {t('common.loading') || 'Yuklanmoqda...'}
                            </p>
                        ) : messages.length === 0 ? (
                            <div style={{ textAlign: 'center', padding: '40px 20px', color: 'var(--color-text-secondary)' }}>
                                <MessageCircle style={{ width: '56px', height: '56px', margin: '0 auto 16px', opacity: 0.4 }} />
                                <p style={{ fontSize: '15px', fontWeight: 600 }}>{t('detail.no_messages') || 'Xabar yo\'q. Birinchi xabarni yozing.'}</p>
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
                                                <div style={{ display: 'flex', alignItems: 'center', gap: '12px', margin: '12px 0', padding: '0 4px' }}>
                                                    <div style={{ flex: 1, height: '1px', backgroundColor: 'var(--color-border-muted)' }} />
                                                    <span style={{ fontSize: '12px', fontWeight: 600, color: chatColors.dateSep, flexShrink: 0, padding: '4px 12px', backgroundColor: 'var(--color-bg-secondary)', borderRadius: '999px', border: '1px solid var(--color-border-muted)' }}>{dateSepLabel}</span>
                                                    <div style={{ flex: 1, height: '1px', backgroundColor: 'var(--color-border-muted)' }} />
                                                </div>
                                            )}
                                            <div style={{ textAlign: 'center', padding: '8px 0' }}>
                                                <span style={{ fontSize: '13px', fontWeight: 600, color: chatColors.systemMsg, backgroundColor: 'var(--color-bg-secondary)', padding: '6px 14px', borderRadius: 'var(--radius-full)', border: '1px solid var(--color-border-muted)' }}>
                                                    🛡️ {msg.content}
                                                </span>
                                            </div>
                                        </div>
                                    );
                                }
                                return (
                                    <div key={msg.id}>
                                        {showDateSep && (
                                            <div style={{ display: 'flex', alignItems: 'center', gap: '12px', margin: '12px 0', padding: '0 4px' }}>
                                                <div style={{ flex: 1, height: '1px', backgroundColor: 'var(--color-border-muted)' }} />
                                                <span style={{ fontSize: '12px', fontWeight: 600, color: chatColors.dateSep, flexShrink: 0, padding: '4px 12px', backgroundColor: 'var(--color-bg-secondary)', borderRadius: '999px', border: '1px solid var(--color-border-muted)' }}>{dateSepLabel}</span>
                                                <div style={{ flex: 1, height: '1px', backgroundColor: 'var(--color-border-muted)' }} />
                                            </div>
                                        )}
                                    <div
                                        style={{
                                            display: 'flex',
                                            alignItems: 'flex-end',
                                            justifyContent: isMe ? 'flex-end' : 'flex-start',
                                            gap: '10px',
                                        }}
                                    >
                                        {!isMe &&
                                            (resolveImageUrl(senderAvatar) ? (
                                                <img
                                                    src={resolveImageUrl(senderAvatar)}
                                                    alt=""
                                                    style={{ width: '34px', height: '34px', borderRadius: 'var(--radius-full)', objectFit: 'cover', flexShrink: 0, alignSelf: 'flex-end' }}
                                                />
                                            ) : (
                                                <div
                                                    style={{
                                                        width: '34px',
                                                        height: '34px',
                                                        borderRadius: 'var(--radius-full)',
                                                        backgroundColor: 'var(--color-bg-tertiary)',
                                                        display: 'flex',
                                                        alignItems: 'center',
                                                        justifyContent: 'center',
                                                        fontSize: '13px',
                                                        fontWeight: 700,
                                                        color: 'var(--color-text-secondary)',
                                                        flexShrink: 0,
                                                        alignSelf: 'flex-end',
                                                    }}
                                                >
                                                    {getDisplayInitial(senderName)}
                                                </div>
                                            ))}
                                        <div style={{ maxWidth: '72%', minWidth: 0, display: 'flex', flexDirection: 'column', alignItems: isMe ? 'flex-end' : 'flex-start' }}>
                                            {!isMe && senderName && (
                                                <span style={{ fontSize: '13px', color: chatColors.senderName, marginBottom: '4px', paddingLeft: '4px', fontWeight: 700 }}>{senderName}</span>
                                            )}
                                        <div
                                            style={{
                                                padding: '12px 16px',
                                                overflowWrap: 'break-word',
                                                wordBreak: 'break-word',
                                                boxShadow: isDark ? '0 1px 4px rgba(0,0,0,0.3)' : '0 1px 3px rgba(0,0,0,0.1)',
                                                ...(isMe
                                                    ? {
                                                        background: 'linear-gradient(135deg, #3b82f6, #2563eb)',
                                                        color: '#ffffff',
                                                        borderRadius: '20px 20px 4px 20px',
                                                    }
                                                    : {
                                                        backgroundColor: chatColors.incomingBg,
                                                        color: chatColors.msgText,
                                                        border: `1px solid ${chatColors.incomingBorder}`,
                                                        borderRadius: '20px 20px 20px 4px',
                                                    }),
                                            }}
                                        >
                                            <p style={{ fontSize: '15px', lineHeight: '1.55', margin: 0, whiteSpace: 'pre-wrap', overflowWrap: 'break-word', wordBreak: 'break-word', fontWeight: 500 }}>{msg.content}</p>
                                            <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'flex-end', gap: '5px', marginTop: '5px' }}>
                                                <span style={{ fontSize: '12px', fontWeight: 500, color: isMe ? 'rgba(255,255,255,0.85)' : chatColors.timestamp }}>
                                                    {msg.created_at ? new Date(msg.created_at).toLocaleTimeString('uz-UZ', { hour: '2-digit', minute: '2-digit' }) : ''}
                                                </span>
                                                {isMe && (
                                                    <span style={{ fontSize: '13px', lineHeight: 1, fontWeight: 600, color: msg.is_read ? '#93c5fd' : 'rgba(255,255,255,0.7)' }}>
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
                            padding: '12px 14px',
                            borderTop: '1px solid var(--color-border-muted)',
                            backgroundColor: 'var(--color-bg-primary)',
                            flexShrink: 0,
                        }}
                    >
                        <div style={{ display: 'flex', gap: '10px', alignItems: 'flex-end' }}>
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
                                minHeight: '48px',
                                maxHeight: '120px',
                                overflowY: 'auto',
                                padding: '12px 18px',
                                borderRadius: '24px',
                                border: '2px solid var(--color-border-default)',
                                backgroundColor: 'var(--color-bg-secondary)',
                                color: 'var(--color-text-primary)',
                                fontSize: '15px',
                                fontWeight: 500,
                                lineHeight: '1.5',
                                outline: 'none',
                                transition: 'border-color 0.15s, box-shadow 0.15s',
                                fontFamily: 'inherit',
                            }}
                            onFocus={(e) => { e.target.style.borderColor = '#2563EB'; e.target.style.boxShadow = '0 0 0 3px rgba(37,99,235,0.15)'; }}
                            onBlur={(e) => { e.target.style.borderColor = 'var(--color-border-default)'; e.target.style.boxShadow = 'none'; }}
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
