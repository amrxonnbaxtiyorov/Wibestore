import { Link, useLocation } from 'react-router-dom';
import { MessageCircle } from 'lucide-react';
import { useAuth } from '../context/AuthContext';
import { useChat } from '../context/ChatContext';

/**
 * Chat widget: faqat /chat sahifasiga olib boradigan suzuvchi tugma.
 * Chat kontenti endi /chat sahifasida (ChatPage).
 */
const ChatWidget = () => {
    const { pathname } = useLocation();
    const { getUnreadCount } = useChat();

    const unreadCount = getUnreadCount();

    const isAdminPage = pathname.includes('/admin');
    const isChatPage = pathname === '/chat' || pathname.startsWith('/chat/');
    if (isAdminPage || isChatPage) {
        return null;
    }

    return (
        <Link
            to="/chat"
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
                cursor: 'pointer',
                transition: 'all 0.2s ease',
                zIndex: 50,
                textDecoration: 'none',
            }}
            onMouseEnter={(e) => {
                e.currentTarget.style.transform = 'scale(1.1)';
                e.currentTarget.style.boxShadow = 'var(--shadow-xl)';
            }}
            onMouseLeave={(e) => {
                e.currentTarget.style.transform = 'scale(1)';
                e.currentTarget.style.boxShadow = 'var(--shadow-lg)';
            }}
            aria-label="Xabarlar"
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
        </Link>
    );
};

export default ChatWidget;
