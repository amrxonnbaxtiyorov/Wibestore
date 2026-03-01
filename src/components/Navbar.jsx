import { useState, useEffect, useRef } from 'react';
import { Link, useLocation, useNavigate } from 'react-router-dom';
import { Search, Menu, X, Sun, Moon, User, LogOut, Settings, ShoppingBag, Crown, ChevronDown, TrendingUp, BarChart3, Zap } from 'lucide-react';
import { useAuth } from '../context/AuthContext';
import { useTheme } from '../context/ThemeContext';
import { useCoins } from '../context/CoinContext';
import { useLanguage, languages as langList } from '../context/LanguageContext';
import NotificationWidget from './NotificationWidget';
import Logo from './Logo';

const Navbar = () => {
    const { user, isAuthenticated, logout } = useAuth();
    const { toggleTheme, isDark } = useTheme();
    const { coins } = useCoins();
    const { t, language, setLanguage } = useLanguage();
    const location = useLocation();
    const navigate = useNavigate();

    const [isMobileMenuOpen, setIsMobileMenuOpen] = useState(false);
    const [isProfileOpen, setIsProfileOpen] = useState(false);
    const [isLangOpen, setIsLangOpen] = useState(false);
    const [isScrolled, setIsScrolled] = useState(false);
    const [searchFocused, setSearchFocused] = useState(false);
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
        const handleScroll = () => setIsScrolled(window.scrollY > 10);
        window.addEventListener('scroll', handleScroll, { passive: true });
        return () => window.removeEventListener('scroll', handleScroll);
    }, []);

    // Close mobile menu on route change
    useEffect(() => {
        queueMicrotask(() => {
            setIsMobileMenuOpen(false);
            setIsProfileOpen(false);
        });
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
            searchInputRef.current?.blur();
        }
    };

    const navLinks = [
        { to: '/products', label: t('nav.products') || 'Boshqa mahsulotlar', icon: ShoppingBag },
        { to: '/top', label: t('nav.top') || 'Top akkauntlar', icon: TrendingUp },
        { to: '/statistics', label: t('nav.statistics') || 'Statistika', icon: BarChart3 },
        { to: '/premium', label: t('nav.premium') || 'Site Premium', icon: Zap, badge: 'NEW' },
    ];

    const isAdmin = user?.is_staff || false;
    const isActive = (path) => location.pathname === path;
    const currentLang = langList.find(l => l.code === language) || langList[0];

    return (
        <>
            <nav
                className={`fixed top-0 left-0 right-0 z-50 transition-all duration-300 ${isScrolled ? 'shadow-lg' : ''}`}
                style={{
                    height: '64px',
                    backgroundColor: isScrolled
                        ? (isDark ? 'rgba(13, 17, 23, 0.95)' : 'rgba(255, 255, 255, 0.95)')
                        : (isDark ? '#0d1117' : '#ffffff'),
                    backdropFilter: isScrolled ? 'blur(20px) saturate(180%)' : 'none',
                    borderBottom: `1px solid ${isDark ? 'rgba(255,255,255,0.08)' : 'rgba(0,0,0,0.08)'}`,
                }}
                role="navigation"
                aria-label="Main navigation"
            >
                <div className="h-full w-full max-w-[1800px] mx-auto px-4 sm:px-6 lg:px-24 lg:pr-32">
                    <div className="h-full flex items-center gap-1">

                        {/* ─── Logo ─── */}
                        <Link
                            to="/"
                            className="flex items-center flex-shrink-0 mr-4 transition-opacity duration-200 hover:opacity-80"
                            style={{ textDecoration: 'none' }}
                        >
                            <Logo height={38} />
                        </Link>

                        {/* ─── Nav Links (desktop) ─── */}
                        <div className="hidden lg:flex items-center gap-3 flex-shrink-0">
                            {navLinks.map((link) => {
                                const active = isActive(link.to);
                                return (
                                    <Link
                                        key={link.to}
                                        to={link.to}
                                        className="relative flex items-center gap-1.5 px-3 py-1.5 rounded-md text-[13px] font-medium transition-colors duration-150 whitespace-nowrap"
                                        style={{
                                            textDecoration: 'none',
                                            color: active
                                                ? (isDark ? '#f0f6fc' : '#1f2328')
                                                : (isDark ? '#8b949e' : '#656d76'),
                                            backgroundColor: active
                                                ? (isDark ? 'rgba(255,255,255,0.08)' : 'rgba(0,0,0,0.04)')
                                                : 'transparent',
                                            padding: isActive ? '10px' : 'auto',
                                        }}
                                        onMouseEnter={(e) => {
                                            if (!active) {
                                                e.currentTarget.style.color = isDark ? '#c9d1d9' : '#1f2328';
                                                e.currentTarget.style.backgroundColor = isDark ? 'rgba(255,255,255,0.05)' : 'rgba(0,0,0,0.03)';
                                            }
                                        }}
                                        onMouseLeave={(e) => {
                                            if (!active) {
                                                e.currentTarget.style.color = isDark ? '#8b949e' : '#656d76';
                                                e.currentTarget.style.backgroundColor = 'transparent';
                                            }
                                        }}
                                    >
                                        <link.icon className="w-3.5 h-3.5" />
                                        <span>{link.label}</span>
                                        {link.badge && (
                                            <span
                                                className="px-1.5 py-0.5 rounded-full text-[9px] font-bold leading-none"
                                                style={{
                                                    padding: '2px 6px',
                                                    background: 'linear-gradient(135deg, #F59E0B, #EF4444)',
                                                    color: '#fff',
                                                }}
                                            >
                                                {link.badge}
                                            </span>
                                        )}
                                        {active && (
                                            <span
                                                className="absolute bottom-0 left-3 right-3 h-[2px] rounded-full"
                                                style={{ backgroundColor: isDark ? '#58a6ff' : '#0969da' }}
                                            />
                                        )}
                                    </Link>
                                );
                            })}

                            {isAdmin && (
                                <Link
                                    to="/admin"
                                    className="flex items-center gap-1.5 px-3 py-1.5 rounded-md text-[13px] font-semibold transition-colors duration-150 whitespace-nowrap"
                                    style={{
                                        textDecoration: 'none',
                                        color: isDark ? '#f85149' : '#cf222e',
                                        backgroundColor: isDark ? 'rgba(248,81,73,0.1)' : 'rgba(207,34,46,0.06)',
                                    }}
                                >
                                    <Settings className="w-3.5 h-3.5" />
                                    <span>Admin</span>
                                </Link>
                            )}
                        </div>

                        {/* ─── Spacer ─── */}
                        <div className="flex-1 min-w-0" />

                        {/* ─── Search (desktop) ─── */}
                        <div className="hidden md:flex items-center mr-3">
                            <form onSubmit={handleSearch} className="relative">
                                <Search
                                    className="absolute left-2.5 top-1/2 -translate-y-1/2 w-4 h-4 pointer-events-none"
                                    style={{ color: isDark ? '#484f58' : '#8c959f' }}
                                />
                                <input
                                    ref={searchInputRef}
                                    type="text"
                                    placeholder={t('nav.search') || 'Akkauntlarni qidirish...'}
                                    value={searchQuery}
                                    onChange={(e) => setSearchQuery(e.target.value)}
                                    onFocus={() => setSearchFocused(true)}
                                    onBlur={() => setSearchFocused(false)}
                                    className="h-8 rounded-md text-xs font-medium outline-none transition-all duration-200"
                                    style={{
                                        width: searchFocused ? '280px' : '220px',
                                        paddingLeft: '32px',
                                        paddingRight: '12px',
                                        backgroundColor: isDark ? 'rgba(255,255,255,0.06)' : 'rgba(0,0,0,0.04)',
                                        color: isDark ? '#f0f6fc' : '#1f2328',
                                        border: `1px solid ${searchFocused
                                            ? (isDark ? '#388bfd' : '#0969da')
                                            : (isDark ? 'rgba(255,255,255,0.1)' : 'rgba(0,0,0,0.1)')
                                            }`,
                                        boxShadow: searchFocused
                                            ? `0 0 0 3px ${isDark ? 'rgba(56,139,253,0.15)' : 'rgba(9,105,218,0.15)'}`
                                            : 'none',
                                    }}
                                    aria-label="Search"
                                />
                            </form>
                        </div>

                        {/* ─── Divider ─── */}
                        <div
                            className="hidden md:block w-px h-5 mx-1 flex-shrink-0"
                            style={{ backgroundColor: isDark ? 'rgba(255,255,255,0.1)' : 'rgba(0,0,0,0.1)' }}
                        />

                        {/* ─── Right Actions ─── */}
                        <div className="flex items-center gap-1 flex-shrink-0">

                            {/* Language Switcher */}
                            <div className="relative" ref={langRef}>
                                <button
                                    onClick={() => setIsLangOpen(!isLangOpen)}
                                    className="flex items-center gap-2 h-8 px-3 rounded-md transition-all duration-200"
                                    aria-label="Change language"
                                    style={{
                                        padding: isActive ? '10px' : 'auto',
                                        backgroundColor: isDark ? 'rgba(255,255,255,0.08)' : 'rgba(0,0,0,0.05)',
                                        border: `1px solid ${isDark ? 'rgba(255,255,255,0.1)' : 'rgba(0,0,0,0.08)'}`,
                                    }}
                                    onMouseEnter={(e) => {
                                        e.currentTarget.style.backgroundColor = isDark ? 'rgba(255,255,255,0.12)' : 'rgba(0,0,0,0.08)';
                                    }}
                                    onMouseLeave={(e) => {
                                        e.currentTarget.style.backgroundColor = isDark ? 'rgba(255,255,255,0.08)' : 'rgba(0,0,0,0.05)';
                                    }}
                                >
                                    <img
                                        src={currentLang.flagUrl}
                                        alt={currentLang.name}
                                        className="flex-shrink-0"
                                        style={{
                                            width: '20px',
                                            height: '14px',
                                            objectFit: 'cover',
                                            borderRadius: '2px',
                                            border: `1px solid ${isDark ? 'rgba(255,255,255,0.15)' : 'rgba(0,0,0,0.1)'}`,
                                        }}
                                    />
                                    <span
                                        className="text-[12px] font-semibold hidden sm:block"
                                        style={{ color: isDark ? '#e6edf3' : '#1f2328' }}
                                    >
                                        {{ uz: "O'zbekcha", ru: 'Русский', en: 'English' }[language] || currentLang.name}
                                    </span>
                                    <ChevronDown
                                        className={`w-3.5 h-3.5 hidden sm:block transition-transform duration-200 ${isLangOpen ? 'rotate-180' : ''}`}
                                        style={{ color: isDark ? '#8b949e' : '#656d76' }}
                                    />
                                </button>

                                {isLangOpen && (
                                    <div
                                        className="absolute right-0 top-full mt-2 py-1.5 rounded-md shadow-xl overflow-hidden"
                                        style={{
                                            minWidth: '180px',
                                            padding: isActive ? '10px' : 'auto',
                                            backgroundColor: isDark ? '#1c2333' : '#ffffff',
                                            border: `1px solid ${isDark ? '#30363d' : '#d0d7de'}`,
                                            zIndex: 100,
                                        }}
                                    >
                                        {langList.map((lang) => {
                                            const selected = language === lang.code;
                                            const subtitles = { uz: "O'zbek tili", ru: 'Russian', en: 'English' };
                                            return (
                                                <button
                                                    key={lang.code}
                                                    onClick={() => { setLanguage(lang.code); setIsLangOpen(false); }}
                                                    className="w-full flex items-center gap-3 px-3.5 py-2.5 text-left transition-colors duration-100"
                                                    style={{
                                                        backgroundColor: selected
                                                            ? (isDark ? 'rgba(56,139,253,0.12)' : 'rgba(9,105,218,0.06)')
                                                            : 'transparent',
                                                    }}
                                                    onMouseEnter={(e) => {
                                                        if (!selected) e.currentTarget.style.backgroundColor = isDark ? 'rgba(255,255,255,0.05)' : 'rgba(0,0,0,0.03)';
                                                    }}
                                                    onMouseLeave={(e) => {
                                                        if (!selected) e.currentTarget.style.backgroundColor = 'transparent';
                                                    }}
                                                >
                                                    <img
                                                        src={lang.flagUrl}
                                                        alt={lang.name}
                                                        className="flex-shrink-0"
                                                        style={{
                                                            width: '24px',
                                                            height: '17px',
                                                            objectFit: 'cover',
                                                            borderRadius: '2px',
                                                            border: `1px solid ${isDark ? 'rgba(255,255,255,0.12)' : 'rgba(0,0,0,0.08)'}`,
                                                        }}
                                                    />
                                                    <div className="flex flex-col">
                                                        <span
                                                            className="text-[13px] leading-tight"
                                                            style={{
                                                                color: selected
                                                                    ? (isDark ? '#58a6ff' : '#0969da')
                                                                    : (isDark ? '#e6edf3' : '#1f2328'),
                                                                fontWeight: selected ? '600' : '500',
                                                            }}
                                                        >
                                                            {lang.name}
                                                        </span>
                                                        <span
                                                            className="text-[11px] leading-tight"
                                                            style={{ color: isDark ? '#484f58' : '#8c959f' }}
                                                        >
                                                            {subtitles[lang.code]}
                                                        </span>
                                                    </div>
                                                </button>
                                            );
                                        })}
                                    </div>
                                )}
                            </div>

                            {/* Theme Toggle */}
                            <button
                                onClick={toggleTheme}
                                className="flex items-center justify-center w-8 h-8 rounded-md transition-colors duration-150 flex-shrink-0"
                                aria-label={isDark ? 'Switch to light mode' : 'Switch to dark mode'}
                                onMouseEnter={(e) => { e.currentTarget.style.backgroundColor = isDark ? 'rgba(255,255,255,0.06)' : 'rgba(0,0,0,0.04)'; }}
                                onMouseLeave={(e) => { e.currentTarget.style.backgroundColor = 'transparent'; }}
                            >
                                {isDark ? (
                                    <Sun className="w-4 h-4" style={{ color: '#e3b341' }} />
                                ) : (
                                    <Moon className="w-4 h-4" style={{ color: '#6366F1' }} />
                                )}
                            </button>

                            {/* Notifications */}
                            {isAuthenticated && <NotificationWidget />}

                            {/* Divider before auth */}
                            <div
                                className="hidden sm:block w-px h-5 mx-1 flex-shrink-0"
                                style={{ backgroundColor: isDark ? 'rgba(255,255,255,0.1)' : 'rgba(0,0,0,0.1)' }}
                            />

                            {/* Auth Section */}
                            {isAuthenticated ? (
                                <div className="relative" ref={profileRef}>
                                    <button
                                        onClick={() => setIsProfileOpen(!isProfileOpen)}
                                        className="flex items-center gap-2 h-8 pl-1 pr-2 rounded-md transition-colors duration-150"
                                        style={{
                                            backgroundColor: isProfileOpen
                                                ? (isDark ? 'rgba(255,255,255,0.1)' : 'rgba(0,0,0,0.06)')
                                                : 'transparent',
                                            padding: isProfileOpen ? '10px' : '',
                                        }}
                                        onMouseEnter={(e) => {
                                            e.currentTarget.style.backgroundColor = isDark ? 'rgba(255,255,255,0.06)' : 'rgba(0,0,0,0.04)';
                                            e.currentTarget.style.padding = '10px';
                                        }}
                                        onMouseLeave={(e) => {
                                            if (!isProfileOpen) {
                                                e.currentTarget.style.backgroundColor = 'transparent';
                                                e.currentTarget.style.padding = '';
                                            }
                                        }}
                                    >
                                        <div className="relative flex-shrink-0">
                                            <div
                                                className="w-7 h-7 rounded-full flex items-center justify-center text-xs font-bold overflow-hidden"
                                                style={{
                                                    background: 'linear-gradient(135deg, #3B82F6, #8B5CF6)',
                                                    color: '#fff',
                                                }}
                                            >
                                                {user?.avatar ? (
                                                    <img
                                                        src={user.avatar}
                                                        alt={user?.name || 'User'}
                                                        className="w-full h-full object-cover"
                                                    />
                                                ) : (
                                                    (user?.name || 'U').charAt(0).toUpperCase()
                                                )}
                                            </div>
                                            <div
                                                className="absolute -bottom-px -right-px w-2 h-2 rounded-full"
                                                style={{
                                                    backgroundColor: '#3fb950',
                                                    border: `1.5px solid ${isDark ? '#0d1117' : '#ffffff'}`,
                                                }}
                                            />
                                        </div>
                                        <ChevronDown
                                            className={`w-3 h-3 transition-transform duration-200 ${isProfileOpen ? 'rotate-180' : ''}`}
                                            style={{ color: isDark ? '#484f58' : '#8c959f' }}
                                        />
                                    </button>

                                    {isProfileOpen && (
                                        <div
                                            className="absolute right-0 top-full mt-2 py-2 rounded-lg shadow-xl"
                                            style={{
                                                minWidth: '240px',
                                                padding: '16px 12px',
                                                backgroundColor: isDark ? '#161b22' : '#ffffff',
                                                border: `1px solid ${isDark ? '#30363d' : '#d0d7de'}`,
                                                zIndex: 100,
                                            }}
                                        >
                                            {/* User Info */}
                                            <div className="px-3 py-2 mb-1" style={{ borderBottom: `1px solid ${isDark ? '#21262d' : '#eaeef2'}` }}>
                                                <div
                                                    className="text-[13px] font-semibold mb-1"
                                                    style={{ color: isDark ? '#f0f6fc' : '#1f2328', paddingTop: '4px', paddingBottom: '4px' }}
                                                >
                                                    {user?.name || 'User'}
                                                </div>
                                                <div
                                                    className="text-[12px] truncate mb-1"
                                                    style={{ color: isDark ? '#484f58' : '#8c959f', paddingTop: user?.email ? '2px' : '0', paddingBottom: '4px' }}
                                                >
                                                    {user?.email || user?.telegram || ''}
                                                </div>
                                                {coins > 0 && (
                                                    <div className="flex items-center gap-1 mt-2 mb-1">
                                                        <Crown className="w-3 h-3" style={{ color: '#e3b341' }} />
                                                        <span className="text-[12px] font-semibold" style={{ color: '#e3b341' }}>
                                                            {coins} coins
                                                        </span>
                                                    </div>
                                                )}
                                            </div>

                                            {/* Menu Items */}
                                            {[
                                                { to: '/profile', icon: User, label: t('nav.profile') || 'Profil' },
                                                { to: '/sell', icon: ShoppingBag, label: t('nav.sell') || 'Akkaunt sotish' },
                                                { to: '/settings', icon: Settings, label: t('nav.settings') || 'Sozlamalar' },
                                            ].map((item) => (
                                                <Link
                                                    key={item.to}
                                                    to={item.to}
                                                    className="flex items-center gap-2.5 px-3 py-2 my-1 transition-colors duration-100"
                                                    onClick={() => setIsProfileOpen(false)}
                                                    style={{ textDecoration: 'none' }}
                                                    onMouseEnter={(e) => { e.currentTarget.style.backgroundColor = isDark ? 'rgba(255,255,255,0.05)' : 'rgba(0,0,0,0.03)'; }}
                                                    onMouseLeave={(e) => { e.currentTarget.style.backgroundColor = 'transparent'; }}
                                                >
                                                    <item.icon className="w-4 h-4" style={{ color: isDark ? '#8b949e' : '#656d76' }} />
                                                    <span className="text-[13px] font-medium" style={{ color: isDark ? '#c9d1d9' : '#1f2328', paddingTop: '2px', paddingBottom: '2px' }}>
                                                        {item.label}
                                                    </span>
                                                </Link>
                                            ))}

                                            {/* Logout */}
                                            <div style={{ borderTop: `1px solid ${isDark ? '#21262d' : '#eaeef2'}`, marginTop: '4px', paddingTop: '4px' }}>
                                                <button
                                                    onClick={handleLogout}
                                                    className="w-full flex items-center gap-2.5 px-3 py-2 transition-colors duration-100 text-left"
                                                    onMouseEnter={(e) => { e.currentTarget.style.backgroundColor = isDark ? 'rgba(248,81,73,0.1)' : 'rgba(207,34,46,0.06)'; }}
                                                    onMouseLeave={(e) => { e.currentTarget.style.backgroundColor = 'transparent'; }}
                                                >
                                                    <LogOut className="w-4 h-4" style={{ color: isDark ? '#f85149' : '#cf222e' }} />
                                                    <span className="text-[13px] font-medium" style={{ color: isDark ? '#f85149' : '#cf222e' }}>
                                                        {t('nav.logout') || 'Chiqish'}
                                                    </span>
                                                </button>
                                            </div>
                                        </div>
                                    )}
                                </div>
                            ) : (
                                <div className="flex items-center gap-3">
                                    <Link
                                        to="/login"
                                        className="hidden sm:inline-flex items-center justify-center h-9 px-12 rounded-sm text-sm font-medium transition-colors duration-150 whitespace-nowrap"
                                        style={{
                                            padding: isActive ? '10px' : 'auto',
                                            textDecoration: 'none',
                                            color: isDark ? '#c9d1d9' : '#1f2328',
                                            border: `1px solid ${isDark ? 'rgba(255,255,255,0.15)' : 'rgba(0,0,0,0.12)'}`,
                                        }}
                                        onMouseEnter={(e) => { e.currentTarget.style.backgroundColor = isDark ? 'rgba(255,255,255,0.06)' : 'rgba(0,0,0,0.04)'; }}
                                        onMouseLeave={(e) => { e.currentTarget.style.backgroundColor = 'transparent'; }}
                                    >
                                        {t('nav.login') || 'Kirish'}
                                    </Link>
                                    <Link
                                        to="/signup"
                                        className="inline-flex items-center justify-center h-9 px-12 rounded-sm text-sm font-semibold transition-all duration-150 whitespace-nowrap"
                                        style={{
                                            padding: isActive ? '10px' : 'auto',
                                            textDecoration: 'none',
                                            backgroundColor: isDark ? '#238636' : '#1f883d',
                                            color: '#ffffff',
                                        }}
                                        onMouseEnter={(e) => { e.currentTarget.style.backgroundColor = isDark ? '#2ea043' : '#1a7f37'; }}
                                        onMouseLeave={(e) => { e.currentTarget.style.backgroundColor = isDark ? '#238636' : '#1f883d'; }}
                                    >
                                        {t('nav.signup') || "Ro'yxatdan o'tish"}
                                    </Link>
                                </div>
                            )}

                            {/* Mobile Menu Toggle */}
                            <button
                                type="button"
                                onClick={() => setIsMobileMenuOpen(!isMobileMenuOpen)}
                                className="lg:hidden flex items-center justify-center w-8 h-8 rounded-md ml-1 transition-colors duration-150 flex-shrink-0"
                                onMouseEnter={(e) => { e.currentTarget.style.backgroundColor = isDark ? 'rgba(255,255,255,0.06)' : 'rgba(0,0,0,0.04)'; }}
                                onMouseLeave={(e) => { e.currentTarget.style.backgroundColor = 'transparent'; }}
                            >
                                {isMobileMenuOpen ? (
                                    <X className="w-5 h-5" style={{ color: isDark ? '#f0f6fc' : '#1f2328' }} />
                                ) : (
                                    <Menu className="w-5 h-5" style={{ color: isDark ? '#f0f6fc' : '#1f2328' }} />
                                )}
                            </button>
                        </div>
                    </div>
                </div>

                {/* ─── Mobile Menu ─── */}
                {isMobileMenuOpen && (
                    <div
                        className="lg:hidden"
                        style={{
                            position: 'absolute',
                            top: '100%',
                            left: 0,
                            right: 0,
                            zIndex: 60,
                            backgroundColor: isDark ? '#161b22' : '#ffffff',
                            borderTop: `1px solid ${isDark ? '#21262d' : '#eaeef2'}`,
                            boxShadow: '0 16px 32px rgba(0,0,0,0.15)',
                        }}
                    >
                        <div className="px-4 py-3 space-y-1">
                            {/* Mobile Search */}
                            <form onSubmit={handleSearch} className="mb-3">
                                <div className="relative">
                                    <Search
                                        className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4"
                                        style={{ color: isDark ? '#484f58' : '#8c959f' }}
                                    />
                                    <input
                                        type="text"
                                        placeholder={t('nav.search') || 'Akkauntlarni qidirish...'}
                                        value={searchQuery}
                                        onChange={(e) => setSearchQuery(e.target.value)}
                                        className="w-full h-10 pl-10 pr-4 rounded-md text-sm font-medium outline-none"
                                        style={{
                                            backgroundColor: isDark ? 'rgba(255,255,255,0.06)' : 'rgba(0,0,0,0.04)',
                                            color: isDark ? '#f0f6fc' : '#1f2328',
                                            border: `1px solid ${isDark ? '#30363d' : '#d0d7de'}`,
                                        }}
                                    />
                                </div>
                            </form>

                            {/* Nav Links */}
                            {navLinks.map((link) => {
                                const active = isActive(link.to);
                                return (
                                    <Link
                                        key={link.to}
                                        to={link.to}
                                        onClick={() => setIsMobileMenuOpen(false)}
                                        className="flex items-center gap-3 px-3 py-2.5 rounded-md text-sm font-medium transition-colors duration-100"
                                        style={{
                                            textDecoration: 'none',
                                            color: active
                                                ? (isDark ? '#f0f6fc' : '#1f2328')
                                                : (isDark ? '#8b949e' : '#656d76'),
                                            backgroundColor: active
                                                ? (isDark ? 'rgba(56,139,253,0.15)' : 'rgba(9,105,218,0.08)')
                                                : 'transparent',
                                        }}
                                    >
                                        <link.icon className="w-4 h-4 flex-shrink-0" />
                                        <span className="flex-1">{link.label}</span>
                                        {link.badge && (
                                            <span
                                                className="px-1.5 py-0.5 rounded-full text-[9px] font-bold leading-none"
                                                style={{
                                                    background: 'linear-gradient(135deg, #F59E0B, #EF4444)',
                                                    color: '#fff',
                                                }}
                                            >
                                                {link.badge}
                                            </span>
                                        )}
                                    </Link>
                                );
                            })}

                            {isAdmin && (
                                <Link
                                    to="/admin"
                                    onClick={() => setIsMobileMenuOpen(false)}
                                    className="flex items-center gap-3 px-3 py-2.5 rounded-md text-sm font-semibold transition-colors duration-100"
                                    style={{
                                        textDecoration: 'none',
                                        color: isDark ? '#f85149' : '#cf222e',
                                        backgroundColor: isDark ? 'rgba(248,81,73,0.1)' : 'rgba(207,34,46,0.06)',
                                    }}
                                >
                                    <Settings className="w-4 h-4 flex-shrink-0" />
                                    <span>Admin Panel</span>
                                </Link>
                            )}

                            {/* Auth Actions (mobile) */}
                            {!isAuthenticated && (
                                <div
                                    className="pt-3 mt-2 space-y-2"
                                    style={{ borderTop: `1px solid ${isDark ? '#21262d' : '#eaeef2'}` }}
                                >
                                    <Link
                                        to="/login"
                                        onClick={() => setIsMobileMenuOpen(false)}
                                        className="flex items-center justify-center h-10 rounded-md text-sm font-medium transition-colors duration-150"
                                        style={{
                                            textDecoration: 'none',
                                            color: isDark ? '#c9d1d9' : '#1f2328',
                                            border: `1px solid ${isDark ? '#30363d' : '#d0d7de'}`,
                                        }}
                                    >
                                        {t('nav.login') || 'Kirish'}
                                    </Link>
                                    <Link
                                        to="/signup"
                                        onClick={() => setIsMobileMenuOpen(false)}
                                        className="flex items-center justify-center h-10 rounded-md text-sm font-bold transition-colors duration-150"
                                        style={{
                                            textDecoration: 'none',
                                            backgroundColor: isDark ? '#238636' : '#1f883d',
                                            color: '#ffffff',
                                        }}
                                    >
                                        {t('nav.signup') || "Ro'yxatdan o'tish"}
                                    </Link>
                                </div>
                            )}
                        </div>
                    </div>
                )}
            </nav>
        </>
    );
};

export default Navbar;
