import { useState, useEffect, useRef } from 'react';
import { Link, useLocation, useNavigate } from 'react-router-dom';
import { Search, Menu, X, Sun, Moon, Bell, User, LogOut, Settings, ShoppingBag, Heart, Crown, ChevronDown, Sparkles, TrendingUp, BarChart3, Zap } from 'lucide-react';
import { useAuth } from '../context/AuthContext';
import { useTheme } from '../context/ThemeContext';
import { useCoins } from '../context/CoinContext';
import { useLanguage, languages as langList } from '../context/LanguageContext';
import NotificationWidget from './NotificationWidget';

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

    // Close mobile menu on route change (defer to avoid sync setState in effect)
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
        }
    };

    const navLinks = [
        { to: '/products', label: t('nav.products') || 'Каталог', icon: ShoppingBag, color: 'from-blue-500 to-cyan-500' },
        { to: '/top', label: t('nav.top') || 'Топ', icon: TrendingUp, color: 'from-orange-500 to-red-500' },
        { to: '/statistics', label: t('nav.statistics') || 'Статистика', icon: BarChart3, color: 'from-purple-500 to-pink-500' },
        { to: '/premium', label: t('nav.premium') || 'Premium', icon: Zap, color: 'from-amber-400 to-orange-500', badge: 'NEW' },
    ];

    const isAdmin = user?.is_staff || false;
    const isActive = (path) => location.pathname === path;
    const currentLang = langList.find(l => l.code === language) || langList[0];

    return (
        <>
            <nav
                className={`fixed top-0 left-0 right-0 z-50 transition-all duration-300 ${
                    isScrolled ? 'shadow-lg backdrop-blur-xl' : ''
                }`}
                style={{
                    height: '72px',
                    backgroundColor: isScrolled
                        ? (isDark ? 'rgba(13, 17, 23, 0.98)' : 'rgba(255, 255, 255, 0.98)')
                        : (isDark ? 'rgba(13, 17, 23, 0.7)' : 'rgba(255, 255, 255, 0.7)'),
                    borderBottom: isScrolled 
                        ? `1px solid ${isDark ? 'rgba(255,255,255,0.1)' : 'rgba(0,0,0,0.1)'}`
                        : '1px solid transparent',
                }}
                role="navigation"
                aria-label="Main navigation"
            >
                <div className="max-w-7xl mx-auto pl-4 sm:pl-6 lg:pl-8 pr-3 sm:pr-4 lg:pr-5 h-full">
                    <div className="h-full flex items-center gap-4 sm:gap-5 lg:gap-6">
                        {/* ─── Logo: transparent fon, saytga mos ─── */}
                        <Link
                            to="/"
                            className="group flex items-center flex-shrink-0 transition-all duration-200 hover:scale-[1.02] active:scale-[0.98] h-11"
                            style={{ textDecoration: 'none' }}
                        >
                            <span className="flex items-center justify-center h-9 sm:h-10 flex-shrink-0">
                                <img
                                    src="/logo.png"
                                    alt="WibeStore - Gaming Marketplace"
                                    className="h-full w-auto max-h-9 sm:max-h-10 object-contain object-left select-none pointer-events-none block"
                                    style={{
                                        maxWidth: '155px',
                                        filter: isDark ? 'brightness(1.05) drop-shadow(0 1px 2px rgba(0,0,0,0.3))' : 'drop-shadow(0 1px 2px rgba(0,0,0,0.06))',
                                    }}
                                />
                            </span>
                        </Link>

                        {/* Logo va nav orasidagi joy (flex o‘ng blokni surish uchun emas) */}
                        <div className="hidden lg:block min-w-0 grow-0 w-0" aria-hidden="true" />

                        {/* Ajratgich: Logo | Nav */}
                        <div
                            className="hidden lg:block flex-shrink-0 w-px self-center"
                            style={{ height: '28px', backgroundColor: isDark ? 'rgba(255,255,255,0.12)' : 'rgba(0,0,0,0.1)' }}
                        />

                        {/* ─── Nav linklar (desktop) — o'ng tomonda ─── */}
                        <div className="hidden lg:flex items-center gap-4 lg:gap-6 flex-shrink-0 h-10">
                            {navLinks.map((link) => (
                                <Link
                                    key={link.to}
                                    to={link.to}
                                    className="group relative flex items-center justify-center gap-2 px-4 py-2 h-9 rounded-lg text-sm font-medium transition-all duration-200 hover:scale-[1.02] whitespace-nowrap"
                                    style={{
                                        textDecoration: 'none',
                                        backgroundColor: isActive(link.to) 
                                            ? (isDark ? 'rgba(255,255,255,0.1)' : 'rgba(0,0,0,0.05)')
                                            : 'transparent',
                                    }}
                                >
                                    {/* Active Indicator */}
                                    {isActive(link.to) && (
                                        <div
                                            className="absolute inset-0 rounded-lg"
                                            style={{
                                                background: 'linear-gradient(135deg, rgba(59, 130, 246, 0.12), transparent)',
                                                border: `1px solid ${isDark ? 'rgba(255,255,255,0.1)' : 'rgba(0,0,0,0.06)'}`,
                                            }}
                                        />
                                    )}
                                    
                                    {/* Icon with gradient */}
                                    <div className="relative">
                                        <link.icon 
                                            className="w-4 h-4 transition-transform group-hover:scale-110" 
                                            style={{ 
                                                color: isActive(link.to) 
                                                    ? 'var(--color-text-accent)' 
                                                    : 'var(--color-text-secondary)',
                                            }} 
                                        />
                                        {link.badge && (
                                            <span
                                                className="absolute -top-1 -right-1 px-1.5 py-0.5 text-xs font-bold rounded-full"
                                                style={{
                                                    background: 'linear-gradient(135deg, #F59E0B, #EF4444)',
                                                    color: '#fff',
                                                    fontSize: '9px',
                                                    padding: '2px 4px',
                                                }}
                                            >
                                                {link.badge}
                                            </span>
                                        )}
                                    </div>
                                    
                                    {/* Label */}
                                    <span
                                        style={{
                                            color: isActive(link.to) 
                                                ? 'var(--color-text-primary)' 
                                                : 'var(--color-text-secondary)',
                                            fontWeight: isActive(link.to) ? '600' : '500',
                                        }}
                                    >
                                        {link.label}
                                    </span>
                                </Link>
                            ))}

                            {/* Admin Panel Link */}
                            {isAdmin && (
                                <Link
                                    to="/admin"
                                    className="group flex items-center justify-center gap-2 px-4 py-2 h-9 rounded-lg text-sm font-medium transition-all hover:scale-[1.02] whitespace-nowrap"
                                    style={{
                                        textDecoration: 'none',
                                        backgroundColor: 'rgba(239, 68, 68, 0.1)',
                                        border: '1px solid rgba(239, 68, 68, 0.2)',
                                    }}
                                >
                                    <Settings className="w-4 h-4 flex-shrink-0" style={{ color: 'var(--color-accent-red)' }} />
                                    <span style={{ color: 'var(--color-accent-red)', fontWeight: '600' }}>Admin</span>
                                </Link>
                            )}
                        </div>

                        {/* ─── O‘ng taraf: Qidiruv, til, tema, auth — bitta blok, o‘ngga yopishadi ─── */}
                        <div className="flex-1 min-w-0 hidden lg:block" aria-hidden="true" />

                        {/* Ajratgich: Nav | O‘ng blok — faqat desktop */}
                        <div
                            className="hidden md:block flex-shrink-0 w-px h-8"
                            style={{ backgroundColor: isDark ? 'rgba(255,255,255,0.12)' : 'rgba(0,0,0,0.1)', marginLeft: '4px' }}
                        />

                        <div className="flex items-center gap-2 sm:gap-3 flex-shrink-0 ml-auto">
                            {/* Qidiruv — faqat desktop */}
                            <div className="hidden md:block w-[200px] sm:w-[240px] lg:w-[280px] xl:w-[320px] flex-shrink-0">
                                <form onSubmit={handleSearch} className="w-full flex items-center h-10">
                                    <div className="relative w-full h-10 flex items-center">
                                        <Search
                                            className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 transition-colors flex-shrink-0 pointer-events-none"
                                            style={{ color: searchFocused ? 'var(--color-text-accent)' : 'var(--color-text-muted)' }}
                                        />
                                        <input
                                            type="text"
                                            placeholder={t('nav.search') || 'Akkauntlarni qidirish...'}
                                            value={searchQuery}
                                            onChange={(e) => setSearchQuery(e.target.value)}
                                            onFocus={() => setSearchFocused(true)}
                                            onBlur={() => setSearchFocused(false)}
                                            ref={searchInputRef}
                                            className="w-full h-10 px-4 pl-[4rem] pr-8 rounded-lg text-sm font-medium transition-all outline-none"
                                            style={{
                                                backgroundColor: isDark ? 'rgba(255,255,255,0.08)' : 'rgba(0,0,0,0.05)',
                                                color: 'var(--color-text-primary)',
                                                border: `1px solid ${searchFocused ? 'var(--color-accent-blue)' : 'transparent'}`,
                                            }}
                                            aria-label="Search"
                                        />
                                        <kbd
                                            className="absolute right-2 top-1/2 -translate-y-1/2 hidden xl:inline-flex items-center px-1.5 py-0.5 rounded text-[10px] font-medium"
                                            style={{
                                                backgroundColor: isDark ? 'rgba(255,255,255,0.1)' : 'rgba(0,0,0,0.08)',
                                                color: 'var(--color-text-muted)',
                                            }}
                                        >
                                            ⌘K
                                        </kbd>
                                    </div>
                                </form>
                            </div>

                            {/* Ajratgich: Qidiruv | Til/Tema/Auth */}
                            <div
                                className="hidden md:block flex-shrink-0 w-px self-center"
                                style={{ height: '28px', backgroundColor: isDark ? 'rgba(255,255,255,0.12)' : 'rgba(0,0,0,0.1)' }}
                            />
                            {/* Language Switcher */}
                            <div className="relative h-10 flex items-center" ref={langRef}>
                                <button
                                    onClick={() => setIsLangOpen(!isLangOpen)}
                                    className="flex items-center gap-2 px-3 h-9 rounded-lg transition-all hover:scale-[1.02] min-w-0"
                                    aria-label="Change language"
                                    style={{
                                        backgroundColor: isLangOpen 
                                            ? (isDark ? 'rgba(255,255,255,0.1)' : 'rgba(0,0,0,0.05)')
                                            : 'transparent',
                                    }}
                                >
                                    <img
                                        src={currentLang.flagUrl}
                                        alt={currentLang.name}
                                        className="rounded flex-shrink-0"
                                        style={{
                                            width: '20px',
                                            height: '14px',
                                            objectFit: 'cover',
                                            border: `1px solid ${isDark ? 'rgba(255,255,255,0.2)' : 'rgba(0,0,0,0.1)'}`,
                                        }}
                                    />
                                    <span 
                                        className="text-xs font-semibold hidden sm:block leading-none"
                                        style={{ color: 'var(--color-text-secondary)' }}
                                    >
                                        {language === 'en' ? 'ENG' : language.toUpperCase()}
                                    </span>
                                </button>

                                {isLangOpen && (
                                    <div
                                        className="absolute right-0 mt-2 p-2 rounded-xl shadow-xl animate-in fade-in zoom-in duration-200"
                                        style={{
                                            minWidth: '140px',
                                            backgroundColor: isDark ? '#1e293b' : '#ffffff',
                                            border: `1px solid ${isDark ? 'rgba(255,255,255,0.1)' : 'rgba(0,0,0,0.1)'}`,
                                        }}
                                    >
                                        {langList.map((lang) => (
                                            <button
                                                key={lang.code}
                                                onClick={() => { setLanguage(lang.code); setIsLangOpen(false); }}
                                                className="w-full flex items-center gap-3 px-3 py-2.5 rounded-lg transition-all hover:scale-102"
                                                style={{
                                                    backgroundColor: language === lang.code 
                                                        ? (isDark ? 'rgba(59, 130, 246, 0.2)' : 'rgba(59, 130, 246, 0.1)')
                                                        : 'transparent',
                                                }}
                                            >
                                                <img
                                                    src={lang.flagUrl}
                                                    alt={lang.name}
                                                    className="rounded-md"
                                                    style={{
                                                        width: '20px',
                                                        height: '14px',
                                                        objectFit: 'cover',
                                                    }}
                                                />
                                                <span
                                                    style={{
                                                        color: language === lang.code 
                                                            ? 'var(--color-text-accent)' 
                                                            : 'var(--color-text-secondary)',
                                                        fontSize: '13px',
                                                        fontWeight: language === lang.code ? '600' : '500',
                                                    }}
                                                >
                                                    {lang.name}
                                                </span>
                                            </button>
                                        ))}
                                    </div>
                                )}
                            </div>

                            {/* Theme Toggle */}
                            <button
                                onClick={toggleTheme}
                                className="flex items-center justify-center w-9 h-9 rounded-lg transition-all hover:scale-[1.05] flex-shrink-0"
                                aria-label={isDark ? 'Switch to light mode' : 'Switch to dark mode'}
                                style={{
                                    backgroundColor: isDark ? 'rgba(255,255,255,0.08)' : 'rgba(0,0,0,0.05)',
                                }}
                            >
                                {isDark ? (
                                    <Sun className="w-5 h-5" style={{ color: '#FCD34D' }} />
                                ) : (
                                    <Moon className="w-5 h-5" style={{ color: '#6366F1' }} />
                                )}
                            </button>

                            {/* Notifications */}
                            {isAuthenticated && (
                                <div className="relative h-10 flex items-center">
                                    <NotificationWidget />
                                </div>
                            )}

                            {/* Auth Section */}
                            {isAuthenticated ? (
                                <div className="relative h-10 flex items-center" ref={profileRef}>
                                    <button
                                        onClick={() => setIsProfileOpen(!isProfileOpen)}
                                        className="flex items-center gap-2 px-3 h-9 rounded-lg transition-all hover:scale-[1.02]"
                                        style={{
                                            backgroundColor: isProfileOpen 
                                                ? (isDark ? 'rgba(255,255,255,0.1)' : 'rgba(0,0,0,0.05)')
                                                : 'transparent',
                                            border: `1px solid ${isDark ? 'rgba(255,255,255,0.1)' : 'rgba(0,0,0,0.1)'}`,
                                        }}
                                    >
                                        <div className="relative flex-shrink-0">
                                            <div 
                                                className="w-8 h-8 rounded-lg flex items-center justify-center text-sm font-bold"
                                                style={{
                                                    background: 'linear-gradient(135deg, #3B82F6, #8B5CF6)',
                                                    color: '#fff',
                                                }}
                                            >
                                                {user?.avatar ? (
                                                    <img 
                                                        src={user.avatar} 
                                                        alt={user?.name || 'User'} 
                                                        className="w-full h-full rounded-lg object-cover"
                                                    />
                                                ) : (
                                                    (user?.name || 'U').charAt(0).toUpperCase()
                                                )}
                                            </div>
                                            {/* Online indicator */}
                                            <div 
                                                className="absolute -bottom-0.5 -right-0.5 w-2.5 h-2.5 rounded-full border-2"
                                                style={{
                                                    backgroundColor: '#10B981',
                                                    borderColor: isDark ? '#1e293b' : '#fff',
                                                }}
                                            />
                                        </div>
                                        <div className="hidden lg:block text-left min-w-0">
                                            <div 
                                                className="text-sm font-semibold"
                                                style={{ color: 'var(--color-text-primary)' }}
                                            >
                                                {user?.name || 'User'}
                                            </div>
                                            {coins > 0 && (
                                                <div className="flex items-center gap-1">
                                                    <span className="text-xs">🪙</span>
                                                    <span 
                                                        className="text-xs font-bold"
                                                        style={{ color: '#F59E0B' }}
                                                    >
                                                        {coins} coins
                                                    </span>
                                                </div>
                                            )}
                                        </div>
                                        <ChevronDown 
                                            className={`w-4 h-4 transition-transform ${isProfileOpen ? 'rotate-180' : ''}`}
                                            style={{ color: 'var(--color-text-muted)' }}
                                        />
                                    </button>

                                    {isProfileOpen && (
                                        <div
                                            className="absolute right-0 mt-2 p-2 rounded-xl shadow-xl animate-in fade-in zoom-in duration-200"
                                            style={{
                                                minWidth: '240px',
                                                backgroundColor: isDark ? '#1e293b' : '#ffffff',
                                                border: `1px solid ${isDark ? 'rgba(255,255,255,0.1)' : 'rgba(0,0,0,0.1)'}`,
                                            }}
                                        >
                                            {/* User Info Card */}
                                            <div 
                                                className="p-3 mb-2 rounded-xl"
                                                style={{
                                                    background: isDark 
                                                        ? 'linear-gradient(135deg, rgba(59, 130, 246, 0.2), rgba(139, 92, 246, 0.2))'
                                                        : 'linear-gradient(135deg, rgba(59, 130, 246, 0.1), rgba(139, 92, 246, 0.1))',
                                                }}
                                            >
                                                <div 
                                                    className="font-semibold text-sm"
                                                    style={{ color: 'var(--color-text-primary)' }}
                                                >
                                                    {user?.name || 'User'}
                                                </div>
                                                <div 
                                                    className="text-xs truncate"
                                                    style={{ color: 'var(--color-text-muted)' }}
                                                >
                                                    {user?.email || ''}
                                                </div>
                                            </div>

                                            <div className="space-y-1">
                                                <Link 
                                                    to="/profile" 
                                                    className="flex items-center gap-3 px-3 py-2.5 rounded-lg transition-all hover:scale-102"
                                                    onClick={() => setIsProfileOpen(false)}
                                                    style={{ textDecoration: 'none' }}
                                                >
                                                    <User className="w-4 h-4" style={{ color: 'var(--color-text-secondary)' }} />
                                                    <span style={{ color: 'var(--color-text-primary)', fontSize: '14px', fontWeight: '500' }}>
                                                        {t('nav.profile') || 'Профиль'}
                                                    </span>
                                                </Link>
                                                <Link 
                                                    to="/sell" 
                                                    className="flex items-center gap-3 px-3 py-2.5 rounded-lg transition-all hover:scale-102"
                                                    onClick={() => setIsProfileOpen(false)}
                                                    style={{ textDecoration: 'none' }}
                                                >
                                                    <ShoppingBag className="w-4 h-4" style={{ color: 'var(--color-text-secondary)' }} />
                                                    <span style={{ color: 'var(--color-text-primary)', fontSize: '14px', fontWeight: '500' }}>
                                                        {t('nav.sell') || 'Продать аккаунт'}
                                                    </span>
                                                </Link>
                                                <Link 
                                                    to="/settings" 
                                                    className="flex items-center gap-3 px-3 py-2.5 rounded-lg transition-all hover:scale-102"
                                                    onClick={() => setIsProfileOpen(false)}
                                                    style={{ textDecoration: 'none' }}
                                                >
                                                    <Settings className="w-4 h-4" style={{ color: 'var(--color-text-secondary)' }} />
                                                    <span style={{ color: 'var(--color-text-primary)', fontSize: '14px', fontWeight: '500' }}>
                                                        {t('nav.settings') || 'Настройки'}
                                                    </span>
                                                </Link>
                                            </div>

                                            <div className="mt-2 pt-2 border-t" style={{ borderColor: isDark ? 'rgba(255,255,255,0.1)' : 'rgba(0,0,0,0.1)' }}>
                                                <button
                                                    onClick={handleLogout}
                                                    className="w-full flex items-center gap-3 px-3 py-2.5 rounded-lg transition-all hover:scale-102"
                                                    style={{
                                                        backgroundColor: 'rgba(239, 68, 68, 0.1)',
                                                        border: 'none',
                                                        cursor: 'pointer',
                                                    }}
                                                >
                                                    <LogOut className="w-4 h-4" style={{ color: 'var(--color-accent-red)' }} />
                                                    <span style={{ color: 'var(--color-accent-red)', fontSize: '14px', fontWeight: '600' }}>
                                                        {t('nav.logout') || 'Выйти'}
                                                    </span>
                                                </button>
                                            </div>
                                        </div>
                                    )}
                                </div>
                            ) : (
                                <div className="flex items-center gap-2">
                                    <Link
                                        to="/login"
                                        className="hidden sm:inline-flex items-center justify-center h-9 px-4 rounded-lg text-sm font-semibold transition-all hover:scale-[1.02]"
                                        style={{
                                            textDecoration: 'none',
                                            color: 'var(--color-text-primary)',
                                            backgroundColor: isDark ? 'rgba(255,255,255,0.08)' : 'rgba(0,0,0,0.05)',
                                        }}
                                    >
                                        {t('nav.login') || 'Kirish'}
                                    </Link>
                                    <Link
                                        to="/signup"
                                        className="inline-flex items-center justify-center h-9 px-4 rounded-lg text-sm font-bold transition-all hover:scale-[1.02]"
                                        style={{
                                            textDecoration: 'none',
                                            background: 'linear-gradient(135deg, #3B82F6, #8B5CF6)',
                                            color: '#fff',
                                            boxShadow: '0 2px 8px rgba(59, 130, 246, 0.35)',
                                        }}
                                    >
                                        {t('nav.signup') || "Ro'yxatdan o'tish"}
                                    </Link>
                                </div>
                            )}

                            {/* Mobile Menu Toggle */}
                            <button
                                type="button"
                                onClick={() => setIsMobileMenuOpen(!isMobileMenuOpen)}
                                className="lg:hidden flex items-center justify-center w-9 h-9 rounded-lg transition-all hover:scale-[1.05] flex-shrink-0"
                                style={{
                                    backgroundColor: isDark ? 'rgba(255,255,255,0.08)' : 'rgba(0,0,0,0.05)',
                                }}
                            >
                                {isMobileMenuOpen ? (
                                    <X className="w-5 h-5" style={{ color: 'var(--color-text-primary)' }} />
                                ) : (
                                    <Menu className="w-5 h-5" style={{ color: 'var(--color-text-primary)' }} />
                                )}
                            </button>
                        </div>
                    </div>
                </div>

                {/* Mobile Menu */}
                {isMobileMenuOpen && (
                    <div
                        className="lg:hidden animate-in slide-in-from-top duration-200"
                        style={{
                            position: 'absolute',
                            top: '100%',
                            left: 0,
                            right: 0,
                            zIndex: 60,
                            backgroundColor: isDark ? '#1e293b' : '#ffffff',
                            borderTop: `1px solid ${isDark ? 'rgba(255,255,255,0.1)' : 'rgba(0,0,0,0.1)'}`,
                            boxShadow: '0 20px 25px -5px rgba(0, 0, 0, 0.1)',
                        }}
                    >
                        <div className="p-4 space-y-3">
                            {/* Mobile Search */}
                            <form onSubmit={handleSearch}>
                                <div className="relative">
                                    <Search
                                        className="absolute left-3 top-1/2 -translate-y-1/2 w-5 h-5"
                                        style={{ color: 'var(--color-text-muted)' }}
                                    />
                                    <input
                                        type="text"
                                        placeholder={t('nav.search') || 'Akkauntlarni qidirish...'}
                                        value={searchQuery}
                                        onChange={(e) => setSearchQuery(e.target.value)}
                                        className="w-full px-4 py-3 pl-14 rounded-xl text-base font-medium outline-none"
                                        style={{
                                            backgroundColor: isDark ? 'rgba(255,255,255,0.08)' : 'rgba(0,0,0,0.05)',
                                            color: 'var(--color-text-primary)',
                                            border: `2px solid ${isDark ? 'rgba(255,255,255,0.1)' : 'rgba(0,0,0,0.1)'}`,
                                        }}
                                    />
                                </div>
                            </form>

                            {/* Nav Links */}
                            <div className="space-y-1">
                                {navLinks.map((link) => (
                                    <Link
                                        key={link.to}
                                        to={link.to}
                                        onClick={() => setIsMobileMenuOpen(false)}
                                        className="flex items-center gap-3 px-4 py-3.5 rounded-xl text-base font-medium transition-all"
                                        style={{
                                            textDecoration: 'none',
                                            backgroundColor: isActive(link.to) 
                                                ? (isDark ? 'rgba(59, 130, 246, 0.2)' : 'rgba(59, 130, 246, 0.1)')
                                                : 'transparent',
                                        }}
                                    >
                                        <link.icon 
                                            className="w-5 h-5" 
                                            style={{ 
                                                color: isActive(link.to) ? 'var(--color-text-accent)' : 'var(--color-text-secondary)',
                                            }} 
                                        />
                                        <span style={{ color: 'var(--color-text-primary)' }}>
                                            {link.label}
                                            {link.badge && (
                                                <span 
                                                    className="ml-2 px-2 py-0.5 text-xs font-bold rounded-full"
                                                    style={{
                                                        background: 'linear-gradient(135deg, #F59E0B, #EF4444)',
                                                        color: '#fff',
                                                    }}
                                                >
                                                    {link.badge}
                                                </span>
                                            )}
                                        </span>
                                    </Link>
                                ))}

                                {/* Admin Link */}
                                {isAdmin && (
                                    <Link
                                        to="/admin"
                                        onClick={() => setIsMobileMenuOpen(false)}
                                        className="flex items-center gap-3 px-4 py-3.5 rounded-xl text-base font-medium transition-all"
                                        style={{
                                            textDecoration: 'none',
                                            backgroundColor: 'rgba(239, 68, 68, 0.1)',
                                        }}
                                    >
                                        <Settings className="w-5 h-5" style={{ color: 'var(--color-accent-red)' }} />
                                        <span style={{ color: 'var(--color-accent-red)' }}>Admin Panel</span>
                                    </Link>
                                )}
                            </div>

                            {/* Auth Actions */}
                            {!isAuthenticated && (
                                <>
                                    <div className="pt-3 border-t" style={{ borderColor: isDark ? 'rgba(255,255,255,0.1)' : 'rgba(0,0,0,0.1)' }}>
                                        <Link
                                            to="/login"
                                            onClick={() => setIsMobileMenuOpen(false)}
                                            className="flex items-center justify-center px-4 py-3.5 rounded-xl text-base font-semibold transition-all mb-2"
                                            style={{
                                                textDecoration: 'none',
                                                color: 'var(--color-text-primary)',
                                                backgroundColor: isDark ? 'rgba(255,255,255,0.08)' : 'rgba(0,0,0,0.05)',
                                            }}
                                        >
                                            {t('nav.login') || 'Войти'}
                                        </Link>
                                        <Link
                                            to="/signup"
                                            onClick={() => setIsMobileMenuOpen(false)}
                                            className="flex items-center justify-center px-4 py-3.5 rounded-xl text-base font-bold transition-all"
                                            style={{
                                                textDecoration: 'none',
                                                background: 'linear-gradient(135deg, #3B82F6, #8B5CF6)',
                                                color: '#fff',
                                            }}
                                        >
                                            {t('nav.signup') || 'Регистрация'}
                                        </Link>
                                    </div>
                                </>
                            )}
                        </div>
                    </div>
                )}
            </nav>
        </>
    );
};

export default Navbar;
