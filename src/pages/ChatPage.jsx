import { useState, useRef, useEffect } from 'react';
import { Link, useNavigate } from 'react-router-dom';
import { MessageCircle, ArrowLeft, Send, Star, AlertTriangle } from 'lucide-react';
import { useAuth } from '../context/AuthContext';
import { useChat } from '../context/ChatContext';
import { useLanguage } from '../context/LanguageContext';
import { resolveBackendImageUrl } from '../lib/displayUtils';

/**
 * Chat — bitta sahifa: suhbatlar ro'yxati va tanlangan suhbat xabarlari.
 * URL: /chat
 */
export default function ChatPage() {
    const { user, isAuthenticated } = useAuth();
    const navigate = useNavigate();
    const { t } = useLanguage();
    const {
        conversations,
        activeChat,
        sendMessage,
        setActiveChat,
    } = useChat();

    const [messageText, setMessageText] = useState('');
    const messagesEndRef = useRef(null);

    useEffect(() => {
        if (!isAuthenticated) navigate('/login?redirect=' + encodeURIComponent('/chat'));
    }, [isAuthenticated, navigate]);

    useEffect(() => {
        messagesEndRef.current?.scrollIntoView({ behavior: 'smooth' });
    }, [activeChat?.messages]);

    const handleSend = (e) => {
        e.preventDefault();
        if (!messageText.trim() || !activeChat) return;
        sendMessage(activeChat.id, messageText);
        setMessageText('');
    };

    const formatTime = (timestamp) => {
        const date = new Date(timestamp);
        return date.toLocaleTimeString('uz-UZ', { hour: '2-digit', minute: '2-digit' });
    };

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
                    {/* Header inside card */}
                    <div
                        style={{
                            padding: 'var(--space-4)',
                            borderBottom: '1px solid var(--color-border-muted)',
                            display: 'flex',
                            alignItems: 'center',
                            gap: '12px',
                            backgroundColor: 'var(--color-bg-primary)',
                        }}
                    >
                        {activeChat ? (
                            <>
                                <button
                                    onClick={() => setActiveChat(null)}
                                    className="btn btn-ghost btn-sm"
                                    style={{ padding: '6px' }}
                                    aria-label={t('common.back')}
                                >
                                    <ArrowLeft className="w-5 h-5" />
                                </button>
                                <div style={{ flex: 1, minWidth: 0 }}>
                                    <p style={{ fontWeight: 'var(--font-weight-semibold)', color: 'var(--color-text-primary)', fontSize: 'var(--font-size-base)', margin: 0 }}>
                                        {activeChat.sellerName}
                                    </p>
                                    <p style={{ fontSize: 'var(--font-size-sm)', color: 'var(--color-text-muted)', margin: '2px 0 0 0' }}>
                                        {activeChat.accountTitle}
                                    </p>
                                </div>
                            </>
                        ) : (
                            <p style={{ fontWeight: 'var(--font-weight-semibold)', color: 'var(--color-text-primary)', margin: 0 }}>
                                {conversations.length} {t('chat.conversations') || 'suhbat'}
                            </p>
                        )}
                    </div>

                    {/* Content */}
                    <div style={{ flex: 1, overflowY: 'auto', display: 'flex', flexDirection: 'column' }}>
                        {activeChat ? (
                            <div style={{ padding: 'var(--space-4)', display: 'flex', flexDirection: 'column', gap: '12px' }}>
                                <div
                                    role="alert"
                                    style={{
                                        padding: '10px 12px',
                                        backgroundColor: 'var(--color-warning-bg, #fef3c7)',
                                        border: '1px solid var(--color-warning-border, #f59e0b)',
                                        borderRadius: 'var(--radius-lg)',
                                        display: 'flex',
                                        gap: '8px',
                                        alignItems: 'flex-start',
                                    }}
                                >
                                    <AlertTriangle style={{ width: '18px', height: '18px', color: 'var(--color-warning, #d97706)', flexShrink: 0, marginTop: '1px' }} />
                                    <div>
                                        <p style={{ fontWeight: 'var(--font-weight-semibold)', color: 'var(--color-text-primary)', margin: '0 0 4px 0', fontSize: 'var(--font-size-xs)' }}>
                                            {t('detail.chat_safety_title') || 'Firibgarlardan ehtiyot bo\'ling'}
                                        </p>
                                        <p style={{ margin: 0, fontSize: 'var(--font-size-xs)', color: 'var(--color-text-secondary)', lineHeight: 1.4 }}>
                                            {t('detail.chat_safety_warning')}
                                        </p>
                                    </div>
                                </div>
                                <div
                                    className="flex items-center gap-3"
                                    style={{
                                        backgroundColor: 'var(--color-info-bg)',
                                        borderRadius: 'var(--radius-xl)',
                                        padding: 'var(--space-3)',
                                    }}
                                >
                                    <img
                                        src={resolveBackendImageUrl(activeChat.accountImage) || activeChat.accountImage || '/placeholder.jpg'}
                                        alt=""
                                        style={{ width: '48px', height: '48px', borderRadius: 'var(--radius-lg)', objectFit: 'cover' }}
                                    />
                                    <div className="flex-1 min-w-0">
                                        <p className="truncate" style={{ fontSize: 'var(--font-size-sm)', color: 'var(--color-text-primary)' }}>
                                            {activeChat.accountTitle}
                                        </p>
                                        <div className="flex items-center gap-1" style={{ color: 'var(--color-premium-gold-light)' }}>
                                            <Star className="w-3 h-3" style={{ fill: 'currentColor' }} />
                                            <span style={{ fontSize: 'var(--font-size-xs)' }}>{activeChat.sellerRating}</span>
                                        </div>
                                    </div>
                                </div>
                                {activeChat.messages.length === 0 ? (
                                    <div className="empty-state" style={{ padding: '32px 16px' }}>
                                        <MessageCircle className="empty-state-icon" style={{ width: '48px', height: '48px' }} />
                                        <p className="empty-state-description" style={{ fontSize: 'var(--font-size-sm)' }}>Xabar yo'q</p>
                                        <p style={{ fontSize: 'var(--font-size-xs)', color: 'var(--color-text-muted)', marginTop: '4px' }}>Suhbatni boshlang!</p>
                                    </div>
                                ) : (
                                    activeChat.messages.map((msg) => (
                                        <div
                                            key={msg.id}
                                            style={{ display: 'flex', justifyContent: msg.senderId === user?.id ? 'flex-end' : 'flex-start' }}
                                        >
                                            <div
                                                style={{
                                                    maxWidth: '80%',
                                                    padding: 'var(--space-3)',
                                                    borderRadius: 'var(--radius-2xl)',
                                                    ...(msg.senderId === user?.id
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
                                                <p style={{ fontSize: 'var(--font-size-sm)' }}>{msg.text}</p>
                                                <p style={{
                                                    fontSize: 'var(--font-size-xs)',
                                                    marginTop: '4px',
                                                    opacity: msg.senderId === user?.id ? 0.7 : 1,
                                                    color: msg.senderId === user?.id ? 'inherit' : 'var(--color-text-muted)',
                                                }}>
                                                    {formatTime(msg.timestamp)}
                                                </p>
                                            </div>
                                        </div>
                                    ))
                                )}
                                <div ref={messagesEndRef} />
                            </div>
                        ) : (
                            <div style={{ padding: 'var(--space-4)' }}>
                                {conversations.length === 0 ? (
                                    <div className="empty-state">
                                        <MessageCircle className="empty-state-icon" style={{ width: '64px', height: '64px' }} />
                                        <p className="empty-state-description">Suhbatlar yo'q</p>
                                        <p style={{ fontSize: 'var(--font-size-sm)', color: 'var(--color-text-muted)', marginTop: '8px', textAlign: 'center' }}>
                                            Akkaunt sahifasidan sotuvchi bilan bog'laning
                                        </p>
                                    </div>
                                ) : (
                                    conversations.map((conv) => (
                                        <button
                                            key={conv.id}
                                            onClick={() => setActiveChat(conv)}
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
                                            <img
                                                src={resolveBackendImageUrl(conv.accountImage) || conv.accountImage || '/placeholder.jpg'}
                                                alt=""
                                                style={{ width: '48px', height: '48px', borderRadius: 'var(--radius-lg)', objectFit: 'cover' }}
                                            />
                                            <div className="flex-1 min-w-0" style={{ textAlign: 'left' }}>
                                                <p className="truncate" style={{ fontSize: 'var(--font-size-sm)', fontWeight: 'var(--font-weight-medium)', color: 'var(--color-text-primary)' }}>
                                                    {conv.sellerName}
                                                </p>
                                                <p className="truncate" style={{ fontSize: 'var(--font-size-xs)', color: 'var(--color-text-muted)' }}>
                                                    {conv.accountTitle}
                                                </p>
                                                {conv.lastMessage && (
                                                    <p className="truncate" style={{ fontSize: 'var(--font-size-xs)', color: 'var(--color-text-muted)', marginTop: '2px' }}>
                                                        {conv.lastMessage.text}
                                                    </p>
                                                )}
                                            </div>
                                        </button>
                                    ))
                                )}
                            </div>
                        )}
                    </div>

                    {/* Input */}
                    {activeChat && (
                        <form
                            onSubmit={handleSend}
                            style={{ padding: 'var(--space-4)', borderTop: '1px solid var(--color-border-muted)', backgroundColor: 'var(--color-bg-primary)' }}
                        >
                            <div className="flex gap-2">
                                <input
                                    type="text"
                                    value={messageText}
                                    onChange={(e) => setMessageText(e.target.value)}
                                    placeholder="Xabar yozing..."
                                    className="input input-md"
                                    style={{ flex: 1 }}
                                />
                                <button
                                    type="submit"
                                    disabled={!messageText.trim()}
                                    className="btn btn-primary btn-md"
                                    style={{ padding: '10px', flexShrink: 0 }}
                                >
                                    <Send className="w-5 h-5" />
                                </button>
                            </div>
                        </form>
                    )}
                </div>
            </div>
        </div>
    );
}
