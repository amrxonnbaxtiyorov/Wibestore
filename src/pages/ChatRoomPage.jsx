import { useEffect, useRef, useState } from 'react';
import { useParams, useNavigate, Link } from 'react-router-dom';
import { ArrowLeft, Send, MessageCircle, AlertTriangle } from 'lucide-react';
import { useAuth } from '../context/AuthContext';
import { useChatMessages, useMarkChatRead, useSendMessage } from '../hooks/useChat.js';
import { useLanguage } from '../context/LanguageContext';

/**
 * Sahifa: xarid (to'lov) dan keyin ochiladigan chat — xaridor, sotuvchi va admin.
 * URL: /chat/:roomId
 */
export default function ChatRoomPage() {
    const { roomId } = useParams();
    const navigate = useNavigate();
    const { user, isAuthenticated } = useAuth();
    const { t } = useLanguage();
    const [text, setText] = useState('');

    const {
        data: messagesData,
        isLoading,
        fetchNextPage,
        hasNextPage,
        isFetchingNextPage,
    } = useChatMessages(roomId);
    const sendMessageMutation = useSendMessage(roomId);
    const markReadMutation = useMarkChatRead(roomId);

    const messages = messagesData?.pages?.flatMap((p) => p.results ?? p) ?? [];
    const messagesEndRef = useRef(null);

    useEffect(() => {
        // yangi xabar kelganda pastga scroll
        messagesEndRef.current?.scrollIntoView({ behavior: 'smooth' });
    }, [messages.length]);

    useEffect(() => {
        // Chat ochilganda kelgan xabarlarni "o'qildi" qilish
        if (!roomId || !user) return;
        const hasIncomingUnread = messages.some((m) => m?.sender?.id && m.sender.id !== user.id && m.is_read === false);
        if (hasIncomingUnread && !markReadMutation.isPending) {
            markReadMutation.mutate();
        }
        // eslint-disable-next-line react-hooks/exhaustive-deps
    }, [roomId, user?.id, messages.length]);

    const handleSend = (e) => {
        e.preventDefault();
        if (!text.trim() || sendMessageMutation.isPending) return;
        sendMessageMutation.mutate(text.trim(), {
            onSuccess: () => setText(''),
        });
    };

    if (!isAuthenticated || !user) {
        navigate('/login?redirect=' + encodeURIComponent('/chat/' + roomId));
        return null;
    }

    return (
        <div className="page-enter" style={{ minHeight: 'calc(100vh - 64px)', display: 'flex', flexDirection: 'column' }}>
            <div className="gh-container" style={{ flex: 1, minHeight: 0, maxWidth: '720px', margin: '0 auto', paddingTop: '24px', display: 'flex', flexDirection: 'column' }}>
                <div
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
                        to="/"
                        className="btn btn-ghost btn-sm"
                        style={{ display: 'flex', alignItems: 'center', gap: '6px' }}
                    >
                        <ArrowLeft style={{ width: '18px', height: '18px' }} />
                        {t('common.back') || 'Orqaga'}
                    </Link>
                    <div style={{ display: 'flex', alignItems: 'center', gap: '8px', flex: 1 }}>
                        <MessageCircle style={{ width: '22px', height: '22px', color: 'var(--color-accent-blue)' }} />
                        <h1 style={{ fontSize: 'var(--font-size-lg)', fontWeight: 'var(--font-weight-semibold)', margin: 0 }}>
                            {t('detail.order_chat') || 'Buyurtma chat'}
                        </h1>
                    </div>
                </div>

                {/* Ogohlantirish: firibgarlardan ehtiyot bo'lish */}
                <div
                    role="alert"
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
                    <div
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
                                return (
                                    <div
                                        key={msg.id}
                                        style={{
                                            display: 'flex',
                                            justifyContent: isMe ? 'flex-end' : 'flex-start',
                                        }}
                                    >
                                        <div
                                            style={{
                                                maxWidth: '80%',
                                                padding: '10px 14px',
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
                                            {!isMe && msg.sender?.display_name && (
                                                <p style={{ fontSize: 'var(--font-size-xs)', opacity: 0.8, marginBottom: '4px' }}>
                                                    {msg.sender.display_name}
                                                </p>
                                            )}
                                            <p style={{ fontSize: 'var(--font-size-sm)', margin: 0 }}>{msg.content}</p>
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
