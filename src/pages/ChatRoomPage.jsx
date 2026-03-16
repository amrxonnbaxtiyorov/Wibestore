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
    const { t } = useLanguage();
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
                            gap: '12px',
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

                                {messages.map((msg) => {
                                const isMe = msg.sender?.id === user.id;
                                const senderAvatar = msg.sender?.avatar || msg.sender?.profile_image || msg.sender?.image || null;
                                const senderName = msg.sender?.display_name || msg.sender?.name || '';
                                return (
                                    <div
                                        key={msg.id}
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
                                                    style={{ width: '28px', height: '28px', borderRadius: 'var(--radius-full)', objectFit: 'cover', flexShrink: 0 }}
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
                                                    }}
                                                >
                                                    {getDisplayInitial(senderName)}
                                                </div>
                                            ))}
                                        <div
                                            style={{
                                                maxWidth: '80%',
                                                minWidth: 0,
                                                padding: '10px 14px',
                                                borderRadius: 'var(--radius-2xl)',
                                                overflowWrap: 'break-word',
                                                wordBreak: 'break-word',
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
                                            {!isMe && msg.sender?.display_name && (
                                                <p style={{ fontSize: 'var(--font-size-xs)', opacity: 0.8, marginBottom: '4px' }}>
                                                    {msg.sender.display_name}
                                                </p>
                                            )}
                                            <p style={{ fontSize: 'var(--font-size-sm)', margin: 0, whiteSpace: 'pre-wrap', overflowWrap: 'break-word', wordBreak: 'break-word' }}>{msg.content}</p>
                                            <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'flex-end', gap: '6px', marginTop: '4px' }}>
                                                <span style={{ fontSize: 'var(--font-size-xs)', opacity: 0.85 }}>
                                                    {msg.created_at ? new Date(msg.created_at).toLocaleString('uz-UZ') : ''}
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
                                })}
                                <div ref={messagesEndRef} />
                            </>
                        )}
                    </div>

                    <form
                        onSubmit={handleSend}
                        className="chat-room-form"
                        style={{
                            padding: '16px',
                            borderTop: '1px solid var(--color-border-muted)',
                            display: 'flex',
                            gap: '8px',
                        }}
                    >
                        <input
                            type="text"
                            value={text}
                            onChange={(e) => setText(e.target.value)}
                            placeholder={t('detail.write_message') || 'Xabar yozing...'}
                            className="input input-md"
                            style={{ flex: 1 }}
                            disabled={sendMessageMutation.isPending}
                        />
                        <button
                            type="submit"
                            disabled={!text.trim() || sendMessageMutation.isPending}
                            className="btn btn-primary btn-md"
                            style={{ padding: '10px 16px' }}
                        >
                            <Send style={{ width: '18px', height: '18px' }} />
                        </button>
                    </form>
                </div>
            </div>
        </div>
    );
}
