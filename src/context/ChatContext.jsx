import { createContext, useContext, useState, useEffect } from 'react';
import { useAuth } from './AuthContext';

const ChatContext = createContext(null);

export const ChatProvider = ({ children }) => {
    const { user } = useAuth();
    const [conversations, setConversations] = useState(() => {
        // Lazy initialization - birinchi renderda localStorage dan o'qish
        if (typeof window !== 'undefined') {
            try {
                const currentUser = JSON.parse(localStorage.getItem('wibeUser') || 'null');
                if (currentUser) {
                    const savedConversations = localStorage.getItem(`wibeChats_${currentUser.id}`);
                    if (savedConversations) {
                        return JSON.parse(savedConversations);
                    }
                }
            } catch {
                // JSON parse xatosi bo'lsa default qaytariladi
            }
        }
        return [];
    });
    const [activeChat, setActiveChat] = useState(null);
    const [isOpen, setIsOpen] = useState(false);

    // Sync conversations when user changes (defer to avoid sync setState in effect)
    useEffect(() => {
        if (!user) {
            queueMicrotask(() => {
                setConversations([]);
                setActiveChat(null);
            });
        }
    }, [user]);

    // Save conversations when they change
    useEffect(() => {
        if (user && conversations.length > 0) {
            try {
                localStorage.setItem(`wibeChats_${user.id}`, JSON.stringify(conversations));
            } catch {
                // localStorage yozishda xato bo'lsa ignore qilinadi
            }
        }
    }, [conversations, user]);

    // Start or open a conversation
    const startConversation = (seller, account) => {
        if (!user) return null;

        // Check if conversation already exists
        const existingConv = conversations.find(
            c => c.sellerId === seller.id && c.accountId === account.id
        );

        if (existingConv) {
            setActiveChat(existingConv);
            setIsOpen(true);
            return existingConv;
        }

        // Create new conversation
        const newConversation = {
            id: Date.now(),
            sellerId: seller.id,
            sellerName: seller.name,
            sellerRating: seller.rating,
            accountId: account.id,
            accountTitle: account.title,
            accountImage: account.image,
            messages: [],
            createdAt: new Date().toISOString(),
            lastMessage: null
        };

        setConversations(prev => [newConversation, ...prev]);
        setActiveChat(newConversation);
        setIsOpen(true);
        return newConversation;
    };

    // Send a message
    const sendMessage = (conversationId, text) => {
        if (!user || !text.trim()) return;

        const newMessage = {
            id: Date.now(),
            senderId: user.id,
            senderName: user.name,
            text: text.trim(),
            timestamp: new Date().toISOString(),
            read: false
        };

        setConversations(prev => prev.map(conv => {
            if (conv.id === conversationId) {
                return {
                    ...conv,
                    messages: [...conv.messages, newMessage],
                    lastMessage: newMessage
                };
            }
            return conv;
        }));

        // Update active chat if it's the current one
        if (activeChat?.id === conversationId) {
            setActiveChat(prev => ({
                ...prev,
                messages: [...prev.messages, newMessage],
                lastMessage: newMessage
            }));
        }
    };

    // Mark messages as read
    const markAsRead = (conversationId) => {
        setConversations(prev => prev.map(conv => {
            if (conv.id === conversationId) {
                return {
                    ...conv,
                    messages: conv.messages.map(msg => ({ ...msg, read: true }))
                };
            }
            return conv;
        }));
    };

    // Get unread count
    const getUnreadCount = () => {
        return conversations.reduce((count, conv) => {
            const unread = conv.messages.filter(
                msg => !msg.read && msg.senderId !== user?.id
            ).length;
            return count + unread;
        }, 0);
    };

    // Close chat
    const closeChat = () => {
        setIsOpen(false);
        setActiveChat(null);
    };

    // Open chat
    const openChat = (conversation = null) => {
        if (conversation) {
            setActiveChat(conversation);
        }
        setIsOpen(true);
    };

    const value = {
        conversations,
        activeChat,
        isOpen,
        startConversation,
        sendMessage,
        markAsRead,
        getUnreadCount,
        closeChat,
        openChat,
        setActiveChat
    };

    return (
        <ChatContext.Provider value={value}>
            {children}
        </ChatContext.Provider>
    );
};

export const useChat = () => {
    const context = useContext(ChatContext);
    if (!context) {
        throw new Error('useChat must be used within a ChatProvider');
    }
    return context;
};

export default ChatContext;
