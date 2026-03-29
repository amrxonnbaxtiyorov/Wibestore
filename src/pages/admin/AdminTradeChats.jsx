/**
 * AdminTradeChats — Admin savdo chatlari paneli
 * Barcha escrow (savdo) chatlarini ko'rsatadi va admin ularda xabar yuborishi mumkin.
 * Admin birinchi xabar yuborganda akkaunt ma'lumotlari avtomatik chiqadi.
 */
import { useEffect, useMemo, useRef, useState } from 'react';
import { MessageCircle, Send, ShoppingBag, Clock, CheckCircle, AlertTriangle, XCircle, RefreshCw, User, Filter } from 'lucide-react';
import { useAuth } from '../../context/AuthContext';
import { useLanguage } from '../../context/LanguageContext';
import { useAdminOrderChats, useChatMessages, useSendMessage, useMarkChatRead } from '../../hooks/useChat';
import { getDisplayInitial } from '../../lib/displayUtils';

/* ─── Escrow status badge ────────────────────────────────────── */
const StatusBadge = ({ status, t }) => {
    const map = {
        paid:       { label: t('admin_trade_chats.status_paid'),       bg: '#dbeafe', color: '#1d4ed8', icon: Clock },
        delivered:  { label: t('admin_trade_chats.status_delivered'),   bg: '#dcfce7', color: '#15803d', icon: CheckCircle },
        confirmed:  { label: t('admin_trade_chats.status_confirmed'),  bg: '#f0fdf4', color: '#166534', icon: CheckCircle },
        disputed:   { label: t('admin_trade_chats.status_disputed'),   bg: '#fef9c3', color: '#92400e', icon: AlertTriangle },
        refunded:   { label: t('trade.status_refunded'),               bg: '#fee2e2', color: '#b91c1c', icon: XCircle },
    };
    const cfg = map[status] || { label: status, bg: '#f3f4f6', color: '#6b7280', icon: MessageCircle };
    const Icon = cfg.icon;
    return (
        <span style={{
            display: 'inline-flex', alignItems: 'center', gap: '4px',
            padding: '2px 8px', borderRadius: '999px',
            backgroundColor: cfg.bg, color: cfg.color,
            fontSize: '11px', fontWeight: 600,
        }}>
            <Icon style={{ width: '10px', height: '10px' }} />
            {cfg.label}
        </span>
    );
};

/* ─── Chat list item ─────────────────────────────────────────── */
const ChatListItem = ({ chat, isActive, onClick, t }) => {
    const title = chat.listing_title || t('admin_trade_chats.unknown_account');
    const game  = chat.listing_game || '';
    const buyer = chat.buyer_name || t('admin_trade_chats.buyer');
    const seller = chat.seller_name || t('admin_trade_chats.seller');
    const unread = chat.unread_count || 0;
    const preview = chat.last_message_preview || '';
    const ts = chat.last_message_at
        ? new Date(chat.last_message_at).toLocaleString(undefined, { hour: '2-digit', minute: '2-digit', day: '2-digit', month: '2-digit' })
        : '';

    return (
        <button
            onClick={onClick}
            style={{
                width: '100%', textAlign: 'left', padding: '14px 16px',
                backgroundColor: isActive ? 'var(--color-info-bg)' : 'transparent',
                borderLeft: isActive ? '3px solid var(--color-accent-blue)' : '3px solid transparent',
                border: 'none', cursor: 'pointer', borderBottom: '1px solid var(--color-border-muted)',
                display: 'flex', flexDirection: 'column', gap: '4px',
                transition: 'background 0.15s',
            }}
        >
            <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start', gap: '8px' }}>
                <span style={{
                    fontWeight: 600, fontSize: '13px', color: 'var(--color-text-primary)',
                    overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap', flex: 1,
                }}>
                    {title}
                </span>
                <span style={{ fontSize: '11px', color: 'var(--color-text-muted)', flexShrink: 0 }}>{ts}</span>
            </div>

            {game && (
                <span style={{ fontSize: '11px', color: 'var(--color-accent-blue)', fontWeight: 500 }}>{game}</span>
            )}

            <div style={{ display: 'flex', gap: '6px', flexWrap: 'wrap', alignItems: 'center' }}>
                <StatusBadge status={chat.escrow_status} t={t} />
                {unread > 0 && (
                    <span style={{
                        padding: '1px 6px', borderRadius: '999px',
                        backgroundColor: 'var(--color-accent-red)',
                        color: '#fff', fontSize: '10px', fontWeight: 700,
                    }}>{unread}</span>
                )}
            </div>

            <div style={{ fontSize: '11px', color: 'var(--color-text-muted)' }}>
                <span>{buyer}</span>
                <span style={{ margin: '0 6px' }}>\u2194</span>
                <span>{seller}</span>
            </div>

            {preview && (
                <p style={{
                    fontSize: '12px', color: 'var(--color-text-secondary)',
                    overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap', margin: 0,
                }}>
                    {preview}
                </p>
            )}
        </button>
    );
};

/* ─── Message bubble ─────────────────────────────────────────── */
const MessageBubble = ({ msg, currentUserId }) => {
    const isSystem = msg.message_type === 'system';
    const isOwn    = msg.sender?.id === currentUserId;
    const time = msg.created_at
        ? new Date(msg.created_at).toLocaleTimeString(undefined, { hour: '2-digit', minute: '2-digit' })
        : '';
    const senderName = msg.sender?.display_name || msg.sender?.email || '?';

    if (isSystem) {
        return (
            <div style={{ display: 'flex', justifyContent: 'center', padding: '6px 16px' }}>
                <div style={{
                    maxWidth: '85%', padding: '10px 14px',
                    backgroundColor: 'var(--color-bg-secondary)',
                    border: '1px solid var(--color-border-muted)',
                    borderRadius: '12px', fontSize: '12px',
                    color: 'var(--color-text-secondary)', whiteSpace: 'pre-wrap', textAlign: 'center',
                }}>
                    {msg.content}
                    <div style={{ fontSize: '10px', color: 'var(--color-text-muted)', marginTop: '4px' }}>{time}</div>
                </div>
            </div>
        );
    }

    return (
        <div style={{ display: 'flex', justifyContent: isOwn ? 'flex-end' : 'flex-start', padding: '4px 16px' }}>
            {!isOwn && (
                <div style={{
                    width: '28px', height: '28px', borderRadius: '50%', flexShrink: 0,
                    backgroundColor: 'var(--color-accent-blue)', display: 'flex',
                    alignItems: 'center', justifyContent: 'center',
                    color: '#fff', fontSize: '11px', fontWeight: 700, marginRight: '8px', marginTop: '2px',
                }}>
                    {getDisplayInitial(senderName)}
                </div>
            )}
            <div style={{ maxWidth: '70%' }}>
                {!isOwn && (
                    <div style={{ fontSize: '11px', color: 'var(--color-text-muted)', marginBottom: '2px', paddingLeft: '2px' }}>
                        {senderName}
                    </div>
                )}
                <div style={{
                    padding: '8px 12px', borderRadius: isOwn ? '16px 16px 4px 16px' : '16px 16px 16px 4px',
                    backgroundColor: isOwn ? 'var(--color-accent-blue)' : 'var(--color-bg-secondary)',
                    color: isOwn ? '#fff' : 'var(--color-text-primary)',
                    fontSize: '13px', whiteSpace: 'pre-wrap', wordBreak: 'break-word',
                    border: isOwn ? 'none' : '1px solid var(--color-border-muted)',
                }}>
                    {msg.content}
                </div>
                <div style={{
                    fontSize: '10px', color: 'var(--color-text-muted)',
                    marginTop: '2px', textAlign: isOwn ? 'right' : 'left', paddingLeft: '2px',
                }}>
                    {time}
                </div>
            </div>
        </div>
    );
};

/* ─── Empty state ────────────────────────────────────────────── */
const EmptyStateBox = ({ icon: Icon, title, desc }) => (
    <div style={{ display: 'flex', flexDirection: 'column', alignItems: 'center', justifyContent: 'center', height: '100%', gap: '12px', color: 'var(--color-text-muted)', padding: '40px' }}>
        <Icon style={{ width: '48px', height: '48px', opacity: 0.3 }} />
        <p style={{ fontWeight: 600, color: 'var(--color-text-secondary)', textAlign: 'center' }}>{title}</p>
        {desc && <p style={{ fontSize: '13px', textAlign: 'center' }}>{desc}</p>}
    </div>
);

/* ─── MAIN COMPONENT ──────────────────────────────────────────── */
export default function AdminTradeChats() {
    const { user } = useAuth();
    const { t } = useLanguage();
    const [activeFilter, setActiveFilter] = useState('');
    const [activeChatId, setActiveChatId] = useState(null);
    const [text, setText] = useState('');
    const messagesEndRef = useRef(null);
    const inputRef = useRef(null);

    const FILTERS = [
        { label: t('admin_trade_chats.all'), value: '' },
        { label: t('admin_trade_chats.status_paid'), value: 'paid' },
        { label: t('admin_trade_chats.status_delivered'), value: 'delivered' },
        { label: t('admin_trade_chats.status_confirmed'), value: 'confirmed' },
        { label: t('admin_trade_chats.status_disputed'), value: 'disputed' },
    ];

    const { data: chatsData, isLoading: chatsLoading, refetch } = useAdminOrderChats(activeFilter);
    const chats = useMemo(() => {
        const raw = chatsData?.results ?? chatsData ?? [];
        return Array.isArray(raw) ? raw : [];
    }, [chatsData]);

    const activeChat = useMemo(() => chats.find(c => c.id === activeChatId) || null, [chats, activeChatId]);

    const { data: messagesData, isLoading: msgsLoading } = useChatMessages(activeChatId);
    const sendMsg = useSendMessage(activeChatId);
    const markRead = useMarkChatRead(activeChatId);

    const messages = useMemo(() => {
        const arr = messagesData?.pages?.flatMap(p => p.results ?? p) ?? [];
        return [...arr].reverse();
    }, [messagesData]);

    // Scroll to bottom when messages change
    useEffect(() => {
        if (messagesEndRef.current) {
            messagesEndRef.current.scrollIntoView({ behavior: 'smooth' });
        }
    }, [messages.length, activeChatId]);

    // Mark messages as read when chat opens
    useEffect(() => {
        if (activeChatId) markRead.mutate();
    }, [activeChatId]); // eslint-disable-line

    const handleSend = () => {
        const content = text.trim();
        if (!content || !activeChatId || sendMsg.isPending) return;
        setText('');
        sendMsg.mutate(content);
        setTimeout(() => inputRef.current?.focus(), 50);
    };

    const handleKeyDown = (e) => {
        if (e.key === 'Enter' && !e.shiftKey) {
            e.preventDefault();
            handleSend();
        }
    };

    return (
        <div>
            {/* Page header */}
            <div style={{ marginBottom: '24px' }}>
                <h1 style={{ fontSize: '22px', fontWeight: 700, color: 'var(--color-text-primary)', margin: 0 }}>
                    {t('admin_trade_chats.title')}
                </h1>
                <p style={{ color: 'var(--color-text-muted)', fontSize: '13px', marginTop: '4px' }}>
                    {t('admin_trade_chats.description')}
                </p>
            </div>

            {/* Split-pane layout */}
            <div style={{
                display: 'flex', height: 'calc(100vh - 200px)', minHeight: '500px',
                border: '1px solid var(--color-border-default)',
                borderRadius: 'var(--radius-xl)',
                overflow: 'hidden',
                backgroundColor: 'var(--color-bg-primary)',
            }}>
                {/* ── Left: chat list ── */}
                <div style={{
                    width: '340px', flexShrink: 0,
                    borderRight: '1px solid var(--color-border-default)',
                    display: 'flex', flexDirection: 'column',
                    backgroundColor: 'var(--color-bg-secondary)',
                }}>
                    {/* Filter tabs */}
                    <div style={{
                        padding: '12px 12px 0',
                        borderBottom: '1px solid var(--color-border-muted)',
                    }}>
                        <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: '10px' }}>
                            <div style={{ display: 'flex', alignItems: 'center', gap: '6px', fontSize: '13px', fontWeight: 600, color: 'var(--color-text-secondary)' }}>
                                <Filter style={{ width: '14px', height: '14px' }} />
                                {t('admin_trade_chats.filter')}
                            </div>
                            <button
                                onClick={() => refetch()}
                                style={{ background: 'none', border: 'none', cursor: 'pointer', color: 'var(--color-text-muted)', padding: '4px', borderRadius: '6px' }}
                                title={t('admin_trade_chats.refresh')}
                            >
                                <RefreshCw style={{ width: '14px', height: '14px' }} />
                            </button>
                        </div>
                        <div style={{ display: 'flex', gap: '4px', flexWrap: 'wrap', paddingBottom: '10px' }}>
                            {FILTERS.map(f => (
                                <button
                                    key={f.value}
                                    onClick={() => { setActiveFilter(f.value); setActiveChatId(null); }}
                                    style={{
                                        padding: '3px 8px', borderRadius: '999px', fontSize: '11px', fontWeight: 500,
                                        border: '1px solid',
                                        backgroundColor: activeFilter === f.value ? 'var(--color-accent-blue)' : 'transparent',
                                        borderColor: activeFilter === f.value ? 'var(--color-accent-blue)' : 'var(--color-border-default)',
                                        color: activeFilter === f.value ? '#fff' : 'var(--color-text-secondary)',
                                        cursor: 'pointer',
                                    }}
                                >
                                    {f.label}
                                </button>
                            ))}
                        </div>
                    </div>

                    {/* Chat list */}
                    <div style={{ flex: 1, overflowY: 'auto' }}>
                        {chatsLoading ? (
                            <EmptyStateBox icon={RefreshCw} title={t('common.loading') || '...'} />
                        ) : chats.length === 0 ? (
                            <EmptyStateBox icon={ShoppingBag} title={t('admin_trade_chats.no_chats')} />
                        ) : (
                            chats.map(chat => (
                                <ChatListItem
                                    key={chat.id}
                                    chat={chat}
                                    isActive={chat.id === activeChatId}
                                    onClick={() => setActiveChatId(chat.id)}
                                    t={t}
                                />
                            ))
                        )}
                    </div>

                    {/* Stats footer */}
                    <div style={{
                        padding: '10px 14px',
                        borderTop: '1px solid var(--color-border-muted)',
                        fontSize: '12px', color: 'var(--color-text-muted)',
                        display: 'flex', alignItems: 'center', gap: '6px',
                    }}>
                        <ShoppingBag style={{ width: '12px', height: '12px' }} />
                        {t('admin_trade_chats.total_trades')}: <strong style={{ color: 'var(--color-text-secondary)' }}>{chats.length}</strong>
                    </div>
                </div>

                {/* ── Right: chat panel ── */}
                <div style={{ flex: 1, display: 'flex', flexDirection: 'column', minWidth: 0 }}>
                    {!activeChatId ? (
                        <EmptyStateBox
                            icon={MessageCircle}
                            title={t('admin_trade_chats.select_chat')}
                            desc={t('admin_trade_chats.select_chat_desc')}
                        />
                    ) : (
                        <>
                            {/* Chat header */}
                            <div style={{
                                padding: '14px 20px',
                                borderBottom: '1px solid var(--color-border-default)',
                                backgroundColor: 'var(--color-bg-secondary)',
                                display: 'flex', alignItems: 'center', gap: '12px',
                            }}>
                                <div style={{
                                    width: '36px', height: '36px', borderRadius: '50%', flexShrink: 0,
                                    backgroundColor: 'var(--color-info-bg)',
                                    display: 'flex', alignItems: 'center', justifyContent: 'center',
                                }}>
                                    <ShoppingBag style={{ width: '18px', height: '18px', color: 'var(--color-accent-blue)' }} />
                                </div>
                                <div style={{ flex: 1, minWidth: 0 }}>
                                    <p style={{ fontWeight: 600, fontSize: '14px', color: 'var(--color-text-primary)', margin: 0, overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>
                                        {activeChat?.listing_title || t('admin_trade_chats.trade_chat')}
                                    </p>
                                    <p style={{ fontSize: '12px', color: 'var(--color-text-muted)', margin: 0 }}>
                                        {activeChat?.buyer_name}
                                        {activeChat?.buyer_name && activeChat?.seller_name && ' \u2194 '}
                                        {activeChat?.seller_name}
                                        {activeChat?.listing_game && ` \u00b7 ${activeChat.listing_game}`}
                                    </p>
                                </div>
                                <div style={{ display: 'flex', gap: '8px', alignItems: 'center', flexShrink: 0 }}>
                                    {activeChat?.escrow_status && <StatusBadge status={activeChat.escrow_status} t={t} />}
                                    {activeChat?.escrow_amount && (
                                        <span style={{ fontSize: '12px', fontWeight: 600, color: 'var(--color-accent-green)' }}>
                                            {Number(activeChat.escrow_amount).toLocaleString()} UZS
                                        </span>
                                    )}
                                </div>
                            </div>

                            {/* Credentials auto-send hint */}
                            {!activeChat?.credentials_sent && activeChat?.escrow_status === 'paid' && (
                                <div style={{
                                    padding: '8px 20px',
                                    backgroundColor: 'var(--color-warning-bg)',
                                    borderBottom: '1px solid var(--color-accent-orange)',
                                    fontSize: '12px', color: 'var(--color-text-secondary)',
                                    display: 'flex', alignItems: 'center', gap: '6px',
                                }}>
                                    <AlertTriangle style={{ width: '14px', height: '14px', color: 'var(--color-accent-orange)', flexShrink: 0 }} />
                                    <span>{t('admin_trade_chats.admin_note')}</span>
                                </div>
                            )}

                            {/* Messages area */}
                            <div style={{ flex: 1, overflowY: 'auto', padding: '12px 0', display: 'flex', flexDirection: 'column' }}>
                                {msgsLoading ? (
                                    <EmptyStateBox icon={RefreshCw} title={t('common.loading') || '...'} />
                                ) : messages.length === 0 ? (
                                    <EmptyStateBox icon={MessageCircle} title={t('admin_trade_chats.no_messages')} />
                                ) : (
                                    messages.map(msg => (
                                        <MessageBubble key={msg.id} msg={msg} currentUserId={user?.id} />
                                    ))
                                )}
                                <div ref={messagesEndRef} />
                            </div>

                            {/* Input area */}
                            <div style={{
                                padding: '12px 16px',
                                borderTop: '1px solid var(--color-border-default)',
                                backgroundColor: 'var(--color-bg-secondary)',
                                display: 'flex', gap: '10px', alignItems: 'flex-end',
                            }}>
                                <div style={{ flex: 1, position: 'relative' }}>
                                    <textarea
                                        ref={inputRef}
                                        value={text}
                                        onChange={e => setText(e.target.value)}
                                        onKeyDown={handleKeyDown}
                                        placeholder={t('admin_trade_chats.message_placeholder')}
                                        rows={1}
                                        style={{
                                            width: '100%', resize: 'none', overflowY: 'auto',
                                            maxHeight: '120px', minHeight: '40px',
                                            padding: '10px 14px',
                                            backgroundColor: 'var(--color-bg-primary)',
                                            border: '1px solid var(--color-border-default)',
                                            borderRadius: '12px',
                                            color: 'var(--color-text-primary)',
                                            fontSize: '13px', lineHeight: '1.5',
                                            outline: 'none', fontFamily: 'inherit',
                                            boxSizing: 'border-box',
                                        }}
                                        onInput={e => {
                                            e.target.style.height = 'auto';
                                            e.target.style.height = Math.min(e.target.scrollHeight, 120) + 'px';
                                        }}
                                    />
                                </div>
                                <button
                                    onClick={handleSend}
                                    disabled={!text.trim() || sendMsg.isPending}
                                    style={{
                                        width: '40px', height: '40px', flexShrink: 0,
                                        borderRadius: '50%', border: 'none', cursor: 'pointer',
                                        backgroundColor: text.trim() ? 'var(--color-accent-blue)' : 'var(--color-border-default)',
                                        color: text.trim() ? '#fff' : 'var(--color-text-muted)',
                                        display: 'flex', alignItems: 'center', justifyContent: 'center',
                                        transition: 'background 0.15s',
                                    }}
                                    title={t('admin_trade_chats.send')}
                                >
                                    <Send style={{ width: '16px', height: '16px' }} />
                                </button>
                            </div>
                        </>
                    )}
                </div>
            </div>
        </div>
    );
}
