import { createContext, useContext, useState, useEffect } from 'react';

const NotificationContext = createContext();

export const useNotifications = () => useContext(NotificationContext);

export const NotificationProvider = ({ children }) => {
    const [notifications, setNotifications] = useState([]);
    const [unreadCount, setUnreadCount] = useState(0);

    // Load notifications from localStorage
    useEffect(() => {
        const saved = localStorage.getItem('wibeNotifications');
        if (saved) {
            const parsed = JSON.parse(saved);
            setNotifications(parsed);
            setUnreadCount(parsed.filter(n => !n.read).length);
        } else {
            // Demo notifications
            const demoNotifications = [
                {
                    id: 1,
                    type: 'sale',
                    title: 'Akkaunt sotildi!',
                    message: 'Sizning "PUBG Level 50" akkauntingiz 500,000 so\'mga sotildi.',
                    time: new Date(Date.now() - 1000 * 60 * 30).toISOString(),
                    read: false,
                    icon: '💰'
                },
                {
                    id: 2,
                    type: 'message',
                    title: 'Yangi xabar',
                    message: 'GamerPro sizga xabar yubordi.',
                    time: new Date(Date.now() - 1000 * 60 * 60 * 2).toISOString(),
                    read: false,
                    icon: '💬'
                },
                {
                    id: 3,
                    type: 'system',
                    title: 'Xush kelibsiz!',
                    message: 'WibeStore platformasiga xush kelibsiz. Premium obunani sinab ko\'ring!',
                    time: new Date(Date.now() - 1000 * 60 * 60 * 24).toISOString(),
                    read: true,
                    icon: '🎉'
                },
                {
                    id: 4,
                    type: 'security',
                    title: 'Yangi kirish',
                    message: 'Hisobingizga yangi qurilmadan kirildi.',
                    time: new Date(Date.now() - 1000 * 60 * 60 * 48).toISOString(),
                    read: true,
                    icon: '🔐'
                }
            ];
            setNotifications(demoNotifications);
            setUnreadCount(demoNotifications.filter(n => !n.read).length);
        }
    }, []);

    // Save to localStorage
    const saveNotifications = (newNotifications) => {
        localStorage.setItem('wibeNotifications', JSON.stringify(newNotifications));
    };

    const addNotification = (notification) => {
        const newNotification = {
            id: Date.now(),
            ...notification,
            time: new Date().toISOString(),
            read: false
        };
        const updated = [newNotification, ...notifications];
        setNotifications(updated);
        setUnreadCount(prev => prev + 1);
        saveNotifications(updated);
    };

    const markAsRead = (id) => {
        const updated = notifications.map(n =>
            n.id === id ? { ...n, read: true } : n
        );
        setNotifications(updated);
        setUnreadCount(updated.filter(n => !n.read).length);
        saveNotifications(updated);
    };

    const markAllAsRead = () => {
        const updated = notifications.map(n => ({ ...n, read: true }));
        setNotifications(updated);
        setUnreadCount(0);
        saveNotifications(updated);
    };

    const deleteNotification = (id) => {
        const updated = notifications.filter(n => n.id !== id);
        setNotifications(updated);
        setUnreadCount(updated.filter(n => !n.read).length);
        saveNotifications(updated);
    };

    const clearAll = () => {
        setNotifications([]);
        setUnreadCount(0);
        saveNotifications([]);
    };

    return (
        <NotificationContext.Provider value={{
            notifications,
            unreadCount,
            addNotification,
            markAsRead,
            markAllAsRead,
            deleteNotification,
            clearAll
        }}>
            {children}
        </NotificationContext.Provider>
    );
};
