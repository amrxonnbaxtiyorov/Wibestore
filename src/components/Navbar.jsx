import { useState, useEffect } from 'react';
import { Link, useLocation, useNavigate } from 'react-router-dom';
import { Menu, X, Gamepad2, Flame, Star, LogIn, UserPlus, Package, User, LogOut, ChevronDown, Settings, PlusCircle } from 'lucide-react';
import { useAuth } from '../context/AuthContext';
import NotificationWidget from './NotificationWidget';

const Navbar = () => {
    const [isScrolled, setIsScrolled] = useState(false);
    const [isMobileMenuOpen, setIsMobileMenuOpen] = useState(false);
    const [isUserMenuOpen, setIsUserMenuOpen] = useState(false);
    const location = useLocation();
    const navigate = useNavigate();
    const { user, isAuthenticated, logout } = useAuth();

    useEffect(() => {
        const handleScroll = () => {
            setIsScrolled(window.scrollY > 20);
        };
        window.addEventListener('scroll', handleScroll);
        return () => window.removeEventListener('scroll', handleScroll);
    }, []);

    // Close menus on route change
    useEffect(() => {
        setIsMobileMenuOpen(false);
        setIsUserMenuOpen(false);
    }, [location]);

    const handleLogout = () => {
        logout();
        setIsUserMenuOpen(false);
        navigate('/');
    };

    const navLinks = [
        { to: '/products', icon: Package, label: 'Boshqa mahsulotlar' },
        { to: '/top', icon: Flame, label: 'Top akkauntlar' },
        { to: '/premium', icon: Star, label: 'Site Premium', premium: true },
    ];

    return (
        <nav className={`fixed top-0 left-0 right-0 h-18 z-50 transition-all duration-300 ${isScrolled
            ? 'bg-[#0f0f1a]/95 backdrop-blur-xl shadow-lg shadow-black/20'
            : 'bg-[#0f0f1a]/80 backdrop-blur-lg'
            } border-b border-white/5`}>
            <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 h-full">
                <div className="flex items-center justify-between h-full">
                    {/* Logo */}
                    <Link to="/" className="flex items-center gap-3 group">
                        <div className="w-10 h-10 bg-gradient-to-br from-purple-500 to-pink-500 rounded-xl flex items-center justify-center shadow-lg shadow-purple-500/30 animate-pulse-glow group-hover:scale-105 transition-transform">
                            <Gamepad2 className="w-6 h-6 text-white" />
                        </div>
                        <span className="text-xl font-bold bg-gradient-to-r from-purple-400 to-pink-400 bg-clip-text text-transparent">
                            wibestore.com
                        </span>
                    </Link>

                    {/* Desktop Navigation */}
                    <div className="hidden lg:flex items-center gap-2">
                        {navLinks.map((link) => (
                            <Link
                                key={link.to}
                                to={link.to}
                                className={`flex items-center gap-2 px-4 py-2 rounded-xl text-sm font-medium transition-all duration-200 relative overflow-hidden group ${link.premium
                                    ? 'text-yellow-400 hover:bg-yellow-400/10'
                                    : 'text-gray-300 hover:text-white hover:bg-white/5'
                                    } ${location.pathname === link.to ? 'bg-white/10 text-white' : ''}`}
                            >
                                <link.icon className={`w-4 h-4 ${link.premium ? 'text-yellow-400' : ''}`} />
                                {link.label}
                            </Link>
                        ))}
                    </div>

                    {/* Auth Section */}
                    <div className="hidden lg:flex items-center gap-3">
                        {isAuthenticated && user ? (
                            <>
                                {/* Sell Button */}
                                <Link
                                    to="/sell"
                                    className="flex items-center gap-2 px-4 py-2.5 rounded-xl text-sm font-semibold text-white bg-gradient-to-r from-green-500 to-emerald-500 hover:opacity-90 transition-opacity"
                                >
                                    <PlusCircle className="w-4 h-4" />
                                    Sotish
                                </Link>

                                {/* Notifications */}
                                <NotificationWidget />

                                <div className="relative">
                                    <button
                                        onClick={() => setIsUserMenuOpen(!isUserMenuOpen)}
                                        className="flex items-center gap-3 px-4 py-2 rounded-xl bg-white/5 hover:bg-white/10 transition-colors"
                                    >
                                        <div className="w-8 h-8 bg-gradient-to-br from-purple-500 to-pink-500 rounded-full flex items-center justify-center text-sm font-bold text-white">
                                            {user.name?.charAt(0) || 'U'}
                                        </div>
                                        <span className="text-white text-sm font-medium">{user.name?.split(' ')[0] || 'User'}</span>
                                        <ChevronDown className={`w-4 h-4 text-gray-400 transition-transform ${isUserMenuOpen ? 'rotate-180' : ''}`} />
                                    </button>

                                    {/* Dropdown Menu */}
                                    {isUserMenuOpen && (
                                        <div className="absolute top-full right-0 mt-2 w-56 bg-[#1e1e32] rounded-xl border border-white/10 shadow-xl overflow-hidden">
                                            <div className="p-4 border-b border-white/10">
                                                <p className="text-white font-medium">{user.name}</p>
                                                <p className="text-sm text-gray-400">{user.email}</p>
                                            </div>
                                            <div className="p-2">
                                                <Link
                                                    to="/profile"
                                                    className="flex items-center gap-3 px-4 py-2.5 text-gray-300 hover:bg-white/5 hover:text-white rounded-lg transition-colors"
                                                >
                                                    <User className="w-4 h-4" />
                                                    Mening profilim
                                                </Link>
                                                <Link
                                                    to="/settings"
                                                    className="flex items-center gap-3 px-4 py-2.5 text-gray-300 hover:bg-white/5 hover:text-white rounded-lg transition-colors"
                                                >
                                                    <Settings className="w-4 h-4" />
                                                    Sozlamalar
                                                </Link>
                                                <button
                                                    onClick={handleLogout}
                                                    className="w-full flex items-center gap-3 px-4 py-2.5 text-gray-300 hover:bg-red-500/10 hover:text-red-400 rounded-lg transition-colors"
                                                >
                                                    <LogOut className="w-4 h-4" />
                                                    Chiqish
                                                </button>
                                            </div>
                                        </div>
                                    )}
                                </div>
                            </>
                        ) : (
                            <>
                                <Link
                                    to="/login"
                                    className="flex items-center gap-2 px-5 py-2.5 rounded-full text-sm font-medium text-white border border-white/10 hover:border-purple-500/50 hover:bg-white/5 transition-all duration-200"
                                >
                                    <LogIn className="w-4 h-4" />
                                    Kirish
                                </Link>
                                <Link
                                    to="/signup"
                                    className="flex items-center gap-2 px-5 py-2.5 rounded-full text-sm font-medium text-white bg-gradient-to-r from-purple-500 to-pink-500 shadow-lg shadow-purple-500/30 hover:shadow-purple-500/50 hover:-translate-y-0.5 transition-all duration-200"
                                >
                                    <UserPlus className="w-4 h-4" />
                                    Ro'yxatdan o'tish
                                </Link>
                            </>
                        )}
                    </div>

                    {/* Mobile Menu Button */}
                    <button
                        onClick={() => setIsMobileMenuOpen(!isMobileMenuOpen)}
                        className="lg:hidden p-2 text-gray-400 hover:text-white transition-colors"
                    >
                        {isMobileMenuOpen ? <X className="w-6 h-6" /> : <Menu className="w-6 h-6" />}
                    </button>
                </div>
            </div>

            {/* Mobile Menu */}
            <div className={`lg:hidden absolute top-full left-0 right-0 bg-[#1a1a2e] border-b border-white/10 transition-all duration-300 ${isMobileMenuOpen ? 'opacity-100 visible' : 'opacity-0 invisible'
                }`}>
                <div className="p-4 space-y-2">
                    {navLinks.map((link) => (
                        <Link
                            key={link.to}
                            to={link.to}
                            onClick={() => setIsMobileMenuOpen(false)}
                            className={`flex items-center gap-3 px-4 py-3 rounded-xl text-sm font-medium transition-all ${link.premium ? 'text-yellow-400' : 'text-gray-300'
                                } hover:bg-white/5`}
                        >
                            <link.icon className="w-5 h-5" />
                            {link.label}
                        </Link>
                    ))}

                    <div className="pt-4 mt-4 border-t border-white/10">
                        {isAuthenticated && user ? (
                            <>
                                <div className="flex items-center gap-3 px-4 py-3 mb-2">
                                    <div className="w-10 h-10 bg-gradient-to-br from-purple-500 to-pink-500 rounded-full flex items-center justify-center text-lg font-bold text-white">
                                        {user.name?.charAt(0) || 'U'}
                                    </div>
                                    <div>
                                        <p className="text-white font-medium">{user.name}</p>
                                        <p className="text-sm text-gray-400">{user.email}</p>
                                    </div>
                                </div>
                                <button
                                    onClick={handleLogout}
                                    className="w-full flex items-center gap-3 px-4 py-3 rounded-xl text-red-400 hover:bg-red-500/10 transition-colors"
                                >
                                    <LogOut className="w-5 h-5" />
                                    Chiqish
                                </button>
                            </>
                        ) : (
                            <div className="space-y-2">
                                <Link
                                    to="/login"
                                    onClick={() => setIsMobileMenuOpen(false)}
                                    className="flex items-center justify-center gap-2 px-4 py-3 rounded-xl text-white border border-white/10 hover:bg-white/5 transition-colors"
                                >
                                    <LogIn className="w-5 h-5" />
                                    Kirish
                                </Link>
                                <Link
                                    to="/signup"
                                    onClick={() => setIsMobileMenuOpen(false)}
                                    className="flex items-center justify-center gap-2 px-4 py-3 rounded-xl text-white bg-gradient-to-r from-purple-500 to-pink-500"
                                >
                                    <UserPlus className="w-5 h-5" />
                                    Ro'yxatdan o'tish
                                </Link>
                            </div>
                        )}
                    </div>
                </div>
            </div>
        </nav>
    );
};

export default Navbar;
