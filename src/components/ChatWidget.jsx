import { useState, useRef, useEffect } from 'react';
import { MessageCircle, X, Send, ArrowLeft, Star, AlertTriangle } from 'lucide-react';
import { useAuth } from '../context/AuthContext';
import { useChat } from '../context/ChatContext';
import { useLanguage } from '../context/LanguageContext';

const ChatWidget = () => {
    const { user } = useAuth();
    const { t } = useLanguage();
    const {
        conversations,
        activeChat,
        isOpen,
        sendMessage,
        closeChat,
        openChat,
        setActiveChat,
        getUnreadCount
    } = useChat();

    const [messageText, setMessageText] = useState('');
    const messagesEndRef = useRef(null);

    // Scroll to bottom when messages change
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

    const unreadCount = getUnreadCount();

    // Show on all pages, but only functional for authenticated users
    // Don't show on admin pages
    const isAdminPage = window.location.pathname.includes('/admin');
    if (isAdminPage) {
        return null;
    }

    return (
        <>
            {/* Floating Button */}
            {!isOpen && (
                <button
                    onClick={() => openChat()}
                    style={{
                        position: 'fixed',
                        bottom: '24px',
                        right: '24px',
                        width: '56px',
                        height: '56px',
                        backgroundColor: 'var(--color-accent-blue)',
                        borderRadius: '50%',
                        display: 'flex',
                        alignItems: 'center',
                        justifyContent: 'center',
                        boxShadow: 'var(--shadow-lg)',
                        border: 'none',
                        cursor: 'pointer',
                        transition: 'all 0.2s ease',
                        zIndex: 50,
                    }}
                    onMouseEnter={(e) => {
                        e.currentTarget.style.transform = 'scale(1.1)';
                        e.currentTarget.style.boxShadow = 'var(--shadow-xl)';
                    }}
                    onMouseLeave={(e) => {
                        e.currentTarget.style.transform = 'scale(1)';
                        e.currentTarget.style.boxShadow = 'var(--shadow-lg)';
                    }}
                >
                    <MessageCircle className="w-6 h-6" style={{ color: 'var(--color-text-on-accent)' }} />
                    {unreadCount > 0 && (
                        <span
                            style={{
                                position: 'absolute',
                                top: '-4px',
                                right: '-4px',
                                width: '20px',
                                height: '20px',
                                backgroundColor: 'var(--color-accent-red)',
                                borderRadius: '50%',
                                fontSize: 'var(--font-size-xs)',
                                color: '#fff',
                                display: 'flex',
                                alignItems: 'center',
                                justifyContent: 'center',
                                fontWeight: 'var(--font-weight-bold)',
                            }}
                        >
                            {unreadCount}
                        </span>
                    )}
                </button>
            )}

            {/* Chat Window */}
            {isOpen && (
                <div
                    style={{
                        position: 'fixed',
                        bottom: '24px',
                        right: '24px',
                        width: '384px',
                        height: '500px',
                        backgroundColor: 'var(--color-bg-primary)',
                        borderRadius: 'var(--radius-2xl)',
                        boxShadow: 'var(--shadow-xl)',
                        border: '1px solid var(--color-border-default)',
                        display: 'flex',
                        flexDirection: 'column',
                        zIndex: 50,
                        overflow: 'hidden',
                    }}
                >
                    {/* Header */}
                    <div
                        style={{
                            padding: 'var(--space-4)',
                            backgroundColor: 'var(--color-bg-primary)',
                            borderBottom: '1px solid var(--color-border-muted)',
                            display: 'flex',
                            alignItems: 'center',
                            justifyContent: 'space-between',
                        }}
                    >
                        {activeChat ? (
                            <div className="flex items-center gap-3">
                                <button
                                    onClick={() => setActiveChat(null)}
                                    className="btn btn-ghost btn-sm"
                                    style={{ padding: '4px' }}
                                >
                                    <ArrowLeft className="w-5 h-5" />
                                </button>
                                <div>
                                    <h3 style={{
                                        fontWeight: 'var(--font-weight-semibold)',
                                        color: 'var(--color-text-primary)',
                                        fontSize: 'var(--font-size-sm)',
                                    }}>
                                        {activeChat.sellerName}
                                    </h3>
                                    <p style={{
                                        fontSize: 'var(--font-size-xs)',
                                        color: 'var(--color-text-muted)',
                                    }}>
                                        {activeChat.accountTitle}
                                    </p>
                                </div>
                            </div>
                        ) : (
                            <div>
                                <h3 style={{
                                    fontWeight: 'var(--font-weight-semibold)',
                                    color: 'var(--color-text-primary)',
                                }}>
                                    Xabarlar
                                </h3>
                                <p style={{
                                    fontSize: 'var(--font-size-xs)',
                                    color: 'var(--color-text-muted)',
                                }}>
                                    {conversations.length} suhbat
                                </p>
                            </div>
                        )}
                        <button
                            onClick={closeChat}
                            className="btn btn-ghost btn-sm"
                            style={{ padding: '4px' }}
                        >
                            <X className="w-5 h-5" />
                        </button>
                    </div>

                    {/* Content */}
                    <div style={{ flex: 1, overflowY: 'auto' }}>
                        {activeChat ? (
                            // Messages View
                            <div style={{ padding: 'var(--space-4)', display: 'flex', flexDirection: 'column', gap: '12px' }}>
                                {/* Ogohlantirish: firibgarlardan ehtiyot bo'lish */}
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
                                        marginBottom: '4px',
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
                                {/* Account Info */}
                                <div
                                    className="flex items-center gap-3"
                                    style={{
                                        backgroundColor: 'var(--color-info-bg)',
                                        borderRadius: 'var(--radius-xl)',
                                        padding: 'var(--space-3)',
                                        marginBottom: 'var(--space-4)',
                                    }}
                                >
                                    <img
                                        src={activeChat.accountImage || '/placeholder.jpg'}
                                        alt=""
                                        style={{
                                            width: '48px',
                                            height: '48px',
                                            borderRadius: 'var(--radius-lg)',
                                            objectFit: 'cover',
                                        }}
                                    />
                                    <div className="flex-1 min-w-0">
                                        <p className="truncate" style={{
                                            fontSize: 'var(--font-size-sm)',
                                            color: 'var(--color-text-primary)',
                                        }}>
                                            {activeChat.accountTitle}
                                        </p>
                                        <div className="flex items-center gap-1" style={{ color: 'var(--color-premium-gold-light)' }}>
                                            <Star className="w-3 h-3" style={{ fill: 'currentColor' }} />
                                            <span style={{ fontSize: 'var(--font-size-xs)' }}>{activeChat.sellerRating}</span>
                                        </div>
                                    </div>
                                </div>

                                {/* Messages */}
                                {activeChat.messages.length === 0 ? (
                                    <div className="empty-state" style={{ padding: '32px 16px' }}>
                                        <MessageCircle
                                            className="empty-state-icon"
                                            style={{ width: '48px', height: '48px' }}
                                        />
                                        <p className="empty-state-description" style={{ fontSize: 'var(--font-size-sm)' }}>
                                            Xabar yo'q
                                        </p>
                                        <p style={{
                                            fontSize: 'var(--font-size-xs)',
                                            color: 'var(--color-text-muted)',
                                            marginTop: '4px',
                                        }}>
                                            Suhbatni boshlang!
                                        </p>
                                    </div>
                                ) : (
                                    activeChat.messages.map((msg) => (
                                        <div
                                            key={msg.id}
                                            style={{
                                                display: 'flex',
                                                justifyContent: msg.senderId === user.id ? 'flex-end' : 'flex-start',
                                            }}
                                        >
                                            <div
                                                style={{
                                                    maxWidth: '80%',
                                                    padding: 'var(--space-3)',
                                                    borderRadius: 'var(--radius-2xl)',
                                                    ...(msg.senderId === user.id
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
                                                    opacity: msg.senderId === user.id ? 0.7 : 1,
                                                    color: msg.senderId === user.id
                                                        ? 'inherit'
                                                        : 'var(--color-text-muted)',
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
                            // Conversations List
                            <div style={{ padding: 'var(--space-2)' }}>
                                {conversations.length === 0 ? (
                                    <div className="empty-state">
                                        <MessageCircle
                                            className="empty-state-icon"
                                            style={{ width: '64px', height: '64px' }}
                                        />
                                        <p className="empty-state-description">Suhbatlar yo'q</p>
                                        <p style={{
                                            fontSize: 'var(--font-size-sm)',
                                            color: 'var(--color-text-muted)',
                                            marginTop: '8px',
                                            textAlign: 'center',
                                        }}>
                                            Akkaunt sahifasidan sotuvchi bilan <br />bog'laning
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
                                            }}
                                            onMouseEnter={(e) => {
                                                e.currentTarget.style.backgroundColor = 'var(--color-bg-tertiary)';
                                            }}
                                            onMouseLeave={(e) => {
                                                e.currentTarget.style.backgroundColor = 'transparent';
                                            }}
                                        >
                                            <img
                                                src={conv.accountImage || '/placeholder.jpg'}
                                                alt=""
                                                style={{
                                                    width: '48px',
                                                    height: '48px',
                                                    borderRadius: 'var(--radius-lg)',
                                                    objectFit: 'cover',
                                                }}
                                            />
                                            <div className="flex-1 min-w-0" style={{ textAlign: 'left' }}>
                                                <p className="truncate" style={{
                                                    fontSize: 'var(--font-size-sm)',
                                                    fontWeight: 'var(--font-weight-medium)',
                                                    color: 'var(--color-text-primary)',
                                                }}>
                                                    {conv.sellerName}
                                                </p>
                                                <p className="truncate" style={{
                                                    fontSize: 'var(--font-size-xs)',
                                                    color: 'var(--color-text-muted)',
                                                }}>
                                                    {conv.accountTitle}
                                                </p>
                                                {conv.lastMessage && (
                                                    <p className="truncate" style={{
                                                        fontSize: 'var(--font-size-xs)',
                                                        color: 'var(--color-text-muted)',
                                                        marginTop: '2px',
                                                    }}>
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

                    {/* Input (only when in chat) */}
                    {activeChat && (
                        <form
                            onSubmit={handleSend}
                            style={{
                                padding: 'var(--space-4)',
                                borderTop: '1px solid var(--color-border-muted)',
                            }}
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
            )}
        </>
    );
};

export default ChatWidget;
