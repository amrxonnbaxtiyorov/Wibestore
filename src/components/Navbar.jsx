import { useState, useEffect, useRef } from 'react';
import { Link, useLocation, useNavigate } from 'react-router-dom';
import { Search, Menu, X, Sun, Moon, Bell, User, LogOut, Settings, ShoppingBag, Heart, Crown, Gamepad2, ChevronDown, Globe } from 'lucide-react';
import { useAuth } from '../context/AuthContext';
import { useTheme } from '../context/ThemeContext';
import { useCoins } from '../context/CoinContext';
import { useLanguage, languages as langList } from '../context/LanguageContext';
import NotificationWidget from './NotificationWidget';

const Navbar = () => {
    const { user, isAuthenticated, logout } = useAuth();
    const { theme, toggleTheme, isDark } = useTheme();
    const { coins } = useCoins();
    const { t, language, setLanguage, languages: langs } = useLanguage();
    const location = useLocation();
    const navigate = useNavigate();

    const [isMobileMenuOpen, setIsMobileMenuOpen] = useState(false);
    const [isProfileOpen, setIsProfileOpen] = useState(false);
    const [isLangOpen, setIsLangOpen] = useState(false);
    const [isScrolled, setIsScrolled] = useState(false);
    const [searchQuery, setSearchQuery] = useState('');

    const profileRef = useRef(null);
    const langRef = useRef(null);
    const searchInputRef = useRef(null);

    // Ctrl+K keyboard shortcut for search
    useEffect(() => {
        const handleKeyDown = (e) => {
            if ((e.ctrlKey || e.metaKey) && e.key === 'k') {
                e.preventDefault();
                searchInputRef.current?.focus();
            }
        };
        document.addEventListener('keydown', handleKeyDown);
        return () => document.removeEventListener('keydown', handleKeyDown);
    }, []);

    // Close dropdowns on outside click or Escape
    useEffect(() => {
        const handleClickOutside = (e) => {
            if (profileRef.current && !profileRef.current.contains(e.target)) {
                setIsProfileOpen(false);
            }
            if (langRef.current && !langRef.current.contains(e.target)) {
                setIsLangOpen(false);
            }
        };
        const handleEscape = (e) => {
            if (e.key === 'Escape') {
                setIsProfileOpen(false);
                setIsLangOpen(false);
                setIsMobileMenuOpen(false);
            }
        };
        document.addEventListener('mousedown', handleClickOutside);
        document.addEventListener('keydown', handleEscape);
        return () => {
            document.removeEventListener('mousedown', handleClickOutside);
            document.removeEventListener('keydown', handleEscape);
        };
    }, []);

    // Scroll detection
    useEffect(() => {
        const handleScroll = () => setIsScrolled(window.scrollY > 8);
        window.addEventListener('scroll', handleScroll, { passive: true });
        return () => window.removeEventListener('scroll', handleScroll);
    }, []);

    // Close mobile menu on route change
    useEffect(() => {
        setIsMobileMenuOpen(false);
        setIsProfileOpen(false);
    }, [location.pathname]);

    const handleLogout = () => {
        logout();
        setIsProfileOpen(false);
        navigate('/');
    };

    const handleSearch = (e) => {
        e.preventDefault();
        if (searchQuery.trim()) {
            navigate(`/products?search=${encodeURIComponent(searchQuery.trim())}`);
            setSearchQuery('');
        }
    };

    const navLinks = [
        { to: '/products', label: t('nav.products') || 'Products' },
        { to: '/top', label: t('nav.top') || 'Top' },
        { to: '/statistics', label: t('nav.statistics') || 'Statistics' },
        { to: '/premium', label: t('nav.premium') || 'Premium', icon: Crown },
    ];
    
    // Admin link - faqat admin userlarga ko'rinadi
    const isAdmin = user?.is_staff || false;

    const isActive = (path) => location.pathname === path;

    const currentLang = langList.find(l => l.code === language) || langList[0];

    return (
        <nav
            className={`fixed top-0 left-0 right-0 z-50 transition-all duration-200 ${isScrolled
                ? 'border-b shadow-sm'
                : 'border-b border-transparent'
                }`}
            style={{
                height: '64px',
                backgroundColor: isScrolled
                    ? (isDark ? 'rgba(13, 17, 23, 0.95)' : 'rgba(255, 255, 255, 0.97)')
                    : (isDark ? 'rgba(13, 17, 23, 0.8)' : 'rgba(255, 255, 255, 0.85)'),
                backdropFilter: 'blur(12px)',
                borderColor: isScrolled ? 'var(--color-border-default)' : 'transparent',
            }}
            role="navigation"
            aria-label="Main navigation"
        >
            <div className="gh-container h-full flex items-center justify-between gap-4">
                {/* Logo */}
                <Link
                    to="/"
                    className="flex items-center gap-2.5 flex-shrink-0"
                    style={{ textDecoration: 'none' }}
                >
                    <div
                        className="flex items-center justify-center rounded-lg"
                        style={{
                            width: '32px',
                            height: '32px',
                            background: 'linear-gradient(135deg, var(--color-accent-blue), var(--color-accent-purple))',
                        }}
                    >
                        <Gamepad2 className="w-5 h-5" style={{ color: '#fff' }} />
                    </div>
                    <span
                        className="text-lg font-bold hidden sm:block"
                        style={{ color: 'var(--color-text-primary)' }}
                    >
                        WibeStore
                    </span>
                </Link>

                {/* Desktop Navigation */}
                <div className="hidden lg:flex items-center gap-1">
                    {navLinks.map((link) => (
                        <Link
                            key={link.to}
                            to={link.to}
                            className={`flex items-center gap-1.5 px-3 py-2 rounded-md text-sm font-medium nav-link-hover`}
                            style={{
                                color: isActive(link.to) ? 'var(--color-text-primary)' : 'var(--color-text-secondary)',
                                backgroundColor: isActive(link.to) ? 'var(--color-bg-secondary)' : 'transparent',
                                textDecoration: 'none',
                            }}
                        >
                            {link.icon && <link.icon className="w-4 h-4" style={{ color: 'var(--color-premium-gold-light)' }} />}
                            {link.label}
                        </Link>
                    ))}
                    
                    {/* Admin Panel Link - faqat admin uchun */}
                    {isAdmin && (
                        <Link
                            to="/admin"
                            className={`flex items-center gap-1.5 px-3 py-2 rounded-md text-sm font-medium nav-link-hover`}
                            style={{
                                color: 'var(--color-error)',
                                backgroundColor: 'var(--color-error-bg)',
                                textDecoration: 'none',
                            }}
                        >
                            <Settings className="w-4 h-4" />
                            Admin
                        </Link>
                    )}
                </div>

                {/* Search Bar (Desktop) */}
                <form onSubmit={handleSearch} className="hidden md:flex items-center flex-1 max-w-md mx-4">
                    <div className="relative w-full">
                        <Search
                            className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4"
                            style={{ color: 'var(--color-text-muted)' }}
                        />
                        <input
                            type="text"
                            placeholder={t('nav.search') || 'Search accounts...'}
                            value={searchQuery}
                            onChange={(e) => setSearchQuery(e.target.value)}
                            ref={searchInputRef}
                            className="input input-md w-full"
                            style={{ paddingLeft: '36px', height: '32px', fontSize: '13px' }}
                            aria-label="Search"
                        />
                        <kbd
                            className="absolute right-2 top-1/2 -translate-y-1/2 hidden lg:inline-flex items-center px-1.5 py-0.5 rounded text-xs"
                            style={{
                                backgroundColor: 'var(--color-bg-tertiary)',
                                color: 'var(--color-text-muted)',
                                border: '1px solid var(--color-border-default)',
                                fontSize: '10px',
                            }}
                        >
                            Ctrl+K
                        </kbd>
                    </div>
                </form>

                {/* Right Actions */}
                <div className="flex items-center gap-1">
                    {/* Language Switcher */}
                    <div className="relative" ref={langRef}>
                        <button
                            onClick={() => setIsLangOpen(!isLangOpen)}
                            className="btn btn-ghost btn-sm flex items-center gap-1"
                            aria-label="Change language"
                            aria-haspopup="true"
                            aria-expanded={isLangOpen}
                            style={{ padding: '0 8px' }}
                        >
                            <Globe className="w-4 h-4" style={{ color: 'var(--color-text-secondary)' }} />
                            <span className="hidden sm:inline-flex items-center gap-1 text-xs" style={{ color: 'var(--color-text-secondary)' }}>
                                <img
                                    src={currentLang.flagUrl}
                                    alt={currentLang.name}
                                    style={{
                                        width: '20px',
                                        height: '14px',
                                        objectFit: 'cover',
                                        borderRadius: '2px',
                                        display: 'block',
                                    }}
                                />
                            </span>
                        </button>

                        {isLangOpen && (
                            <div
                                className="dropdown-menu absolute right-0 mt-1"
                                role="menu"
                                aria-label="Language selection"
                                style={{ minWidth: '160px' }}
                            >
                                {langList.map((lang) => (
                                    <button
                                        key={lang.code}
                                        onClick={() => { setLanguage(lang.code); setIsLangOpen(false); }}
                                        className={`dropdown-item ${language === lang.code ? 'dropdown-item-active' : ''}`}
                                    >
                                        <img
                                            src={lang.flagUrl}
                                            alt={lang.name}
                                            style={{
                                                width: '20px',
                                                height: '14px',
                                                objectFit: 'cover',
                                                borderRadius: '2px',
                                                marginRight: '8px',
                                            }}
                                        />
                                        <span>{lang.name}</span>
                                    </button>
                                ))}
                            </div>
                        )}
                    </div>

                    {/* Theme Toggle */}
                    <button
                        onClick={toggleTheme}
                        className="btn btn-ghost btn-sm"
                        aria-label={isDark ? 'Switch to light mode' : 'Switch to dark mode'}
                        style={{ padding: '0 8px' }}
                    >
                        {isDark ? (
                            <Sun className="w-4 h-4" style={{ color: 'var(--color-text-secondary)' }} />
                        ) : (
                            <Moon className="w-4 h-4" style={{ color: 'var(--color-text-secondary)' }} />
                        )}
                    </button>

                    {/* Notifications */}
                    {isAuthenticated && (
                        <NotificationWidget />
                    )}

                    {/* Auth actions */}
                    {isAuthenticated ? (
                        <div className="relative" ref={profileRef}>
                            <button
                                onClick={() => setIsProfileOpen(!isProfileOpen)}
                                className="flex items-center gap-2 btn btn-ghost btn-sm"
                                style={{ padding: '0 8px' }}
                                aria-label="User menu"
                                aria-haspopup="true"
                                aria-expanded={isProfileOpen}
                            >
                                <div className="avatar avatar-sm" style={{
                                    backgroundColor: 'var(--color-accent-blue)',
                                    color: '#fff'
                                }}>
                                    {user?.avatar ? (
                                        <img src={user.avatar} alt="" />
                                    ) : (
                                        <span style={{ fontSize: '11px' }}>
                                            {(user?.name || 'U').charAt(0).toUpperCase()}
                                        </span>
                                    )}
                                </div>
                                <ChevronDown className="w-3 h-3 hidden sm:block" style={{ color: 'var(--color-text-muted)' }} />
                            </button>

                            {isProfileOpen && (
                                <div
                                    className="dropdown-menu absolute right-0 mt-1"
                                    role="menu"
                                    aria-label="User actions"
                                    style={{ minWidth: '220px' }}
                                >
                                    {/* User info */}
                                    <div style={{ padding: '12px 12px 8px' }}>
                                        <div className="font-semibold text-sm" style={{ color: 'var(--color-text-primary)' }}>
                                            {user?.name || 'User'}
                                        </div>
                                        <div className="text-xs" style={{ color: 'var(--color-text-muted)' }}>
                                            {user?.email || ''}
                                        </div>
                                        {coins > 0 && (
                                            <div className="flex items-center gap-1 mt-1">
                                                <span style={{ fontSize: '12px' }}>🪙</span>
                                                <span className="text-xs font-medium" style={{ color: 'var(--color-premium-gold-light)' }}>
                                                    {coins} coins
                                                </span>
                                            </div>
                                        )}
                                    </div>
                                    <div className="dropdown-divider" />

                                    <Link to="/profile" className="dropdown-item" onClick={() => setIsProfileOpen(false)}>
                                        <User className="w-4 h-4" style={{ color: 'var(--color-text-muted)' }} />
                                        <span>{t('nav.profile') || 'Profile'}</span>
                                    </Link>
                                    <Link to="/sell" className="dropdown-item" onClick={() => setIsProfileOpen(false)}>
                                        <ShoppingBag className="w-4 h-4" style={{ color: 'var(--color-text-muted)' }} />
                                        <span>{t('nav.sell') || 'Sell Account'}</span>
                                    </Link>
                                    <Link to="/settings" className="dropdown-item" onClick={() => setIsProfileOpen(false)}>
                                        <Settings className="w-4 h-4" style={{ color: 'var(--color-text-muted)' }} />
                                        <span>{t('nav.settings') || 'Settings'}</span>
                                    </Link>

                                    <div className="dropdown-divider" />

                                    <button
                                        onClick={handleLogout}
                                        className="dropdown-item"
                                        style={{ color: 'var(--color-accent-red)' }}
                                    >
                                        <LogOut className="w-4 h-4" />
                                        <span>{t('nav.logout') || 'Log out'}</span>
                                    </button>
                                </div>
                            )}
                        </div>
                    ) : (
                        <div className="flex items-center gap-2">
                            <Link
                                to="/login"
                                className="btn btn-ghost btn-sm hidden sm:inline-flex"
                                style={{ textDecoration: 'none', color: 'var(--color-text-primary)' }}
                            >
                                {t('nav.login') || 'Sign in'}
                            </Link>
                            <Link
                                to="/signup"
                                className="btn btn-primary btn-sm"
                                style={{ textDecoration: 'none' }}
                            >
                                {t('nav.signup') || 'Sign up'}
                            </Link>
                        </div>
                    )}

                    {/* Mobile menu toggle */}
                    <button
                        className="btn btn-ghost btn-sm lg:hidden"
                        onClick={() => setIsMobileMenuOpen(!isMobileMenuOpen)}
                        aria-label={isMobileMenuOpen ? 'Close menu' : 'Open menu'}
                        aria-expanded={isMobileMenuOpen}
                        style={{ padding: '0 8px' }}
                    >
                        {isMobileMenuOpen ? (
                            <X className="w-5 h-5" style={{ color: 'var(--color-text-primary)' }} />
                        ) : (
                            <Menu className="w-5 h-5" style={{ color: 'var(--color-text-primary)' }} />
                        )}
                    </button>
                </div>
            </div>

            {/* Mobile Menu */}
            {isMobileMenuOpen && (
                <div
                    className="lg:hidden animate-fadeIn"
                    style={{
                        backgroundColor: 'var(--color-bg-primary)',
                        borderTop: '1px solid var(--color-border-default)',
                        boxShadow: 'var(--shadow-lg)',
                    }}
                >
                    {/* Mobile search */}
                    <form onSubmit={handleSearch} className="p-4 md:hidden">
                        <div className="relative">
                            <Search
                                className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4"
                                style={{ color: 'var(--color-text-muted)' }}
                            />
                            <input
                                type="text"
                                placeholder={t('nav.search') || 'Search...'}
                                value={searchQuery}
                                onChange={(e) => setSearchQuery(e.target.value)}
                                className="input input-md w-full"
                                style={{ paddingLeft: '36px' }}
                            />
                        </div>
                    </form>

                    {/* Nav links */}
                    <div className="px-2 pb-4 space-y-0.5">
                        {navLinks.map((link) => (
                            <Link
                                key={link.to}
                                to={link.to}
                                className="flex items-center gap-3 px-4 py-3 rounded-md text-sm font-medium transition-colors"
                                style={{
                                    color: isActive(link.to) ? 'var(--color-text-primary)' : 'var(--color-text-secondary)',
                                    backgroundColor: isActive(link.to) ? 'var(--color-bg-secondary)' : 'transparent',
                                    textDecoration: 'none',
                                }}
                            >
                                {link.icon && <link.icon className="w-4 h-4" style={{ color: 'var(--color-premium-gold-light)' }} />}
                                {link.label}
                            </Link>
                        ))}
                        
                        {/* Mobile Admin Link */}
                        {isAdmin && (
                            <Link
                                to="/admin"
                                className="flex items-center gap-3 px-4 py-3 rounded-md text-sm font-medium transition-colors"
                                style={{
                                    color: 'var(--color-error)',
                                    backgroundColor: 'var(--color-error-bg)',
                                    textDecoration: 'none',
                                }}
                            >
                                <Settings className="w-4 h-4" />
                                Admin Panel
                            </Link>
                        )}

                        {!isAuthenticated && (
                            <>
                                <div className="divider my-2" />
                                <Link
                                    to="/login"
                                    className="flex items-center gap-3 px-4 py-3 rounded-md text-sm font-medium"
                                    style={{ color: 'var(--color-text-primary)', textDecoration: 'none' }}
                                >
                                    {t('nav.login') || 'Sign in'}
                                </Link>
                            </>
                        )}
                    </div>
                </div>
            )}
        </nav>
    );
};

export default Navbar;
