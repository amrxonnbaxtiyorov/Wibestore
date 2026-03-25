import { useState } from 'react';
import { Link, useLocation, useNavigate } from 'react-router-dom';
import {
    LayoutDashboard, Users, Package, AlertTriangle, Star,
    DollarSign, Settings, LogOut, Menu, X, Gamepad2, Bell, Search, ChevronLeft, MessageSquare, Send, ShoppingBag
} from 'lucide-react';
import { useAuth } from '../../hooks';
import { useLanguage } from '../../context/LanguageContext';
import './admin.css';

const AdminLayout = ({ children }) => {
    const [sidebarOpen, setSidebarOpen] = useState(true);
    const [sidebarCollapsed, setSidebarCollapsed] = useState(false);
    const location = useLocation();
    const navigate = useNavigate();
    const { user, logout } = useAuth();
    const { t } = useLanguage();

    // Admin panel faqat staff foydalanuvchilar uchun; AdminGuard allaqachon tekshiradi
    if (user && !user.is_staff) {
        navigate('/');
        return null;
    }

    const handleLogout = async () => {
        await logout();
        navigate('/admin/login');
    };
    const menuItems = [
        { icon: LayoutDashboard, label: t('admin.menu_dashboard'), to: '/admin' },
        { icon: Users, label: t('admin.menu_users'), to: '/admin/users' },
        { icon: Package, label: t('admin.menu_accounts'), to: '/admin/accounts' },
        { icon: AlertTriangle, label: t('admin.menu_reports'), to: '/admin/reports' },
        { icon: Star, label: t('admin.menu_premium'), to: '/admin/premium' },
        { icon: DollarSign, label: t('admin.menu_finance'), to: '/admin/finance' },
        { icon: MessageSquare, label: 'Savdo chatlari', to: '/admin/trade-chats' },
        { icon: Send, label: 'Telegram Бот', to: '/admin/telegram' },
        { icon: ShoppingBag, label: 'Сделки', to: '/admin/trades' },
        { icon: Settings, label: t('admin.menu_settings'), to: '/admin/settings' },
    ];

    const getAdminName = () => {
        if (user?.name) return user.name;
        if (user?.username) return user.username;
        if (user?.email) return user.email.split('@')[0];
        return 'Admin';
    };

    const sidebarWidth = sidebarCollapsed ? '64px' : '280px';

    return (
        <div style={{ minHeight: '100vh', display: 'flex', backgroundColor: 'var(--color-bg-primary)' }}>
            {/* Sidebar */}
            <aside
                style={{
                    position: 'fixed',
                    top: 0,
                    left: 0,
                    bottom: 0,
                    width: sidebarWidth,
                    backgroundColor: 'var(--color-bg-secondary)',
                    borderRight: '1px solid var(--color-border-default)',
                    zIndex: 50,
                    transition: 'all 0.3s ease',
                    transform: sidebarOpen ? 'translateX(0)' : 'translateX(-100%)',
                    display: 'flex',
                    flexDirection: 'column',
                    overflow: 'hidden',
                }}
            >
                {/* Logo */}
                <div
                    style={{
                        padding: sidebarCollapsed ? '20px 12px' : '20px 24px',
                        borderBottom: '1px solid var(--color-border-default)',
                        display: 'flex',
                        alignItems: 'center',
                        justifyContent: sidebarCollapsed ? 'center' : 'space-between',
                    }}
                >
                    <Link
                        to="/admin"
                        style={{
                            display: 'flex',
                            alignItems: 'center',
                            gap: '12px',
                            textDecoration: 'none',
                        }}
                    >
                        <div
                            style={{
                                width: '36px',
                                height: '36px',
                                background: 'linear-gradient(135deg, var(--color-accent-blue), var(--color-accent-blue-hover))',
                                borderRadius: 'var(--radius-lg)',
                                display: 'flex',
                                alignItems: 'center',
                                justifyContent: 'center',
                                flexShrink: 0,
                            }}
                        >
                            <Gamepad2 style={{ width: '20px', height: '20px', color: '#ffffff' }} />
                        </div>
                        {!sidebarCollapsed && (
                            <div>
                                <span style={{ fontSize: 'var(--font-size-lg)', fontWeight: 'var(--font-weight-bold)', color: 'var(--color-text-primary)' }}>
                                    WibeStore
                                </span>
                                <span style={{ display: 'block', fontSize: 'var(--font-size-xs)', color: 'var(--color-text-muted)' }}>
                                    Admin Panel
                                </span>
                            </div>
                        )}
                    </Link>
                    {!sidebarCollapsed && (
                        <button
                            onClick={() => setSidebarCollapsed(true)}
                            className="hidden lg:flex items-center justify-center"
                            style={{
                                padding: '6px',
                                borderRadius: 'var(--radius-md)',
                                background: 'none',
                                border: 'none',
                                cursor: 'pointer',
                                color: 'var(--color-text-muted)',
                            }}
                            aria-label="Collapse sidebar"
                        >
                            <ChevronLeft style={{ width: '16px', height: '16px' }} />
                        </button>
                    )}
                </div>

                {/* Menu */}
                <nav style={{ flex: 1, padding: '12px', overflowY: 'auto', display: 'flex', flexDirection: 'column', gap: '4px' }}>
                    {menuItems.map((item) => {
                        const isActive = location.pathname === item.to;
                        return (
                            <Link
                                key={item.to}
                                to={item.to}
                                className={`admin-sidebar-link ${isActive ? 'admin-sidebar-link-active' : ''}`}
                                style={{
                                    display: 'flex',
                                    alignItems: 'center',
                                    gap: '12px',
                                    padding: sidebarCollapsed ? '12px' : '10px 16px',
                                    borderRadius: 'var(--radius-lg)',
                                    textDecoration: 'none',
                                    justifyContent: sidebarCollapsed ? 'center' : 'flex-start',
                                    backgroundColor: isActive ? 'var(--color-info-bg)' : 'transparent',
                                    color: isActive ? 'var(--color-text-accent)' : 'var(--color-text-secondary)',
                                    fontWeight: isActive ? 'var(--font-weight-semibold)' : 'var(--font-weight-medium)',
                                    fontSize: 'var(--font-size-base)',
                                    border: isActive ? '1px solid var(--color-border-accent)' : '1px solid transparent',
                                }}
                                title={sidebarCollapsed ? item.label : undefined}
                            >
                                <item.icon style={{ width: '18px', height: '18px', flexShrink: 0 }} />
                                {!sidebarCollapsed && <span>{item.label}</span>}
                            </Link>
                        );
                    })}
                </nav>

                {/* Logout */}
                <div style={{ padding: '12px', borderTop: '1px solid var(--color-border-default)' }}>
                    <button
                        onClick={handleLogout}
                        className="admin-logout-btn"
                        style={{
                            width: '100%',
                            display: 'flex',
                            alignItems: 'center',
                            gap: '12px',
                            padding: sidebarCollapsed ? '12px' : '10px 16px',
                            borderRadius: 'var(--radius-lg)',
                            background: 'none',
                            border: 'none',
                            cursor: 'pointer',
                            color: 'var(--color-text-secondary)',
                            fontSize: 'var(--font-size-base)',
                            fontWeight: 'var(--font-weight-medium)',
                            justifyContent: sidebarCollapsed ? 'center' : 'flex-start',
                        }}
                        title={sidebarCollapsed ? 'Chiqish' : undefined}
                    >
                        <LogOut style={{ width: '18px', height: '18px', flexShrink: 0 }} />
                        {!sidebarCollapsed && <span>Chiqish</span>}
                    </button>
                </div>
            </aside>

            {/* Main Content */}
            <div style={{ flex: 1, display: 'flex', flexDirection: 'column', minHeight: '100vh', marginLeft: sidebarWidth, transition: 'margin-left 0.3s ease' }}>
                {/* Header */}
                <header
                    style={{
                        height: '64px',
                        backgroundColor: 'var(--color-bg-primary)',
                        borderBottom: '1px solid var(--color-border-default)',
                        display: 'flex',
                        alignItems: 'center',
                        justifyContent: 'space-between',
                        padding: '0 24px',
                        position: 'sticky',
                        top: 0,
                        zIndex: 40,
                    }}
                >
                    <div style={{ display: 'flex', alignItems: 'center', gap: '16px' }}>
                        <button
                            onClick={() => setSidebarOpen(!sidebarOpen)}
                            className="lg:hidden"
                            style={{
                                padding: '8px',
                                background: 'none',
                                border: 'none',
                                cursor: 'pointer',
                                color: 'var(--color-text-secondary)',
                                borderRadius: 'var(--radius-md)',
                            }}
                            aria-label="Toggle sidebar"
                        >
                            {sidebarOpen ? <X style={{ width: '20px', height: '20px' }} /> : <Menu style={{ width: '20px', height: '20px' }} />}
                        </button>

                        {/* Search */}
                        <div style={{ position: 'relative' }} className="hidden sm:block">
                            <Search
                                style={{
                                    position: 'absolute',
                                    left: '12px',
                                    top: '50%',
                                    transform: 'translateY(-50%)',
                                    width: '16px',
                                    height: '16px',
                                    color: 'var(--color-text-muted)',
                                }}
                            />
                            <input
                                type="text"
                                placeholder="Qidirish..."
                                className="input input-md"
                                style={{
                                    width: '280px',
                                    paddingLeft: '36px',
                                }}
                            />
                        </div>
                    </div>

                    <div style={{ display: 'flex', alignItems: 'center', gap: '12px' }}>
                        {/* Notifications */}
                        <button
                            className="admin-notification-btn"
                            style={{
                                position: 'relative',
                                padding: '8px',
                                background: 'none',
                                border: 'none',
                                cursor: 'pointer',
                                color: 'var(--color-text-secondary)',
                                borderRadius: 'var(--radius-md)',
                            }}
                            aria-label="Notifications"
                        >
                            <Bell style={{ width: '18px', height: '18px' }} />
                            <span
                                style={{
                                    position: 'absolute',
                                    top: '4px',
                                    right: '4px',
                                    width: '8px',
                                    height: '8px',
                                    backgroundColor: 'var(--color-accent-red)',
                                    borderRadius: 'var(--radius-full)',
                                }}
                            />
                        </button>

                        {/* Divider */}
                        <div style={{ width: '1px', height: '24px', backgroundColor: 'var(--color-border-default)' }} />

                        {/* Admin Avatar */}
                        <div style={{ display: 'flex', alignItems: 'center', gap: '10px' }}>
                            <div
                                style={{
                                    width: '32px',
                                    height: '32px',
                                    background: 'linear-gradient(135deg, var(--color-accent-blue), var(--color-accent-blue-hover))',
                                    borderRadius: 'var(--radius-full)',
                                    display: 'flex',
                                    alignItems: 'center',
                                    justifyContent: 'center',
                                    color: '#ffffff',
                                    fontSize: 'var(--font-size-sm)',
                                    fontWeight: 'var(--font-weight-bold)',
                                }}
                            >
                                {getAdminName().charAt(0).toUpperCase()}
                            </div>
                            <div className="hidden sm:block">
                                <div style={{ fontSize: 'var(--font-size-base)', fontWeight: 'var(--font-weight-medium)', color: 'var(--color-text-primary)' }}>
                                    {getAdminName()}
                                </div>
                                <div style={{ fontSize: 'var(--font-size-xs)', color: 'var(--color-text-muted)' }}>
                                    Super Admin
                                </div>
                            </div>
                        </div>
                    </div>
                </header>

                {/* Page Content */}
                <main style={{ flex: 1, padding: '32px', overflowY: 'auto' }}>
                    {children}
                </main>
            </div>

            {/* Mobile Overlay */}
            {sidebarOpen && (
                <div
                    className="lg:hidden"
                    style={{
                        position: 'fixed',
                        inset: 0,
                        backgroundColor: 'var(--color-bg-overlay)',
                        zIndex: 40,
                    }}
                    onClick={() => setSidebarOpen(false)}
                />
            )}
        </div>
    );
};

export default AdminLayout;
