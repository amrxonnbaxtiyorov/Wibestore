import { useState, useEffect, useRef, useMemo, useCallback } from 'react';
import { useNavigate } from 'react-router-dom';
import { Search, ArrowRight, Gamepad2, Crown, BarChart2, HelpCircle, Settings, User } from 'lucide-react';
import { useGames } from '../hooks/useGames';
import { games as fallbackGames } from '../data/mockData';
import { useLanguage } from '../context/LanguageContext';

/**
 * CommandPalette — Ctrl+K global search / command palette
 * O'yinlar ro'yxati API dan (useGames), API mavjud bo'lmasa mock dan.
 */
const CommandPalette = () => {
    const { t } = useLanguage();
    const navigate = useNavigate();
    const { data: gamesData } = useGames();
    const [isOpen, setIsOpen] = useState(false);
    const [query, setQuery] = useState('');
    const [activeIndex, setActiveIndex] = useState(0);
    const inputRef = useRef(null);

    const apiGames = gamesData?.results ?? gamesData;
    const gamesList = Array.isArray(apiGames) && apiGames.length > 0
        ? apiGames.map((g) => ({
            id: g.slug ?? g.id,
            slug: g.slug,
            name: g.name,
            accountCount: g.active_listings_count ?? 0,
            icon: g.icon ?? null,
        }))
        : fallbackGames;

    const allItems = useMemo(() => {
        const pages = [
            { type: 'page', icon: Gamepad2, label: t('nav.products') || 'Products', description: 'Browse all accounts', path: '/products' },
            { type: 'page', icon: Crown, label: t('nav.premium') || 'Premium', description: 'Premium plans', path: '/premium' },
            { type: 'page', icon: BarChart2, label: t('nav.statistics') || 'Statistics', description: 'Rankings & stats', path: '/statistics' },
            { type: 'page', icon: User, label: t('nav.profile') || 'Profile', description: 'Your profile', path: '/profile' },
            { type: 'page', icon: Settings, label: t('nav.settings') || 'Settings', description: 'Account settings', path: '/settings' },
            { type: 'page', icon: HelpCircle, label: 'FAQ', description: 'Frequently asked questions', path: '/faq' },
        ];

        const gameItems = gamesList.map((game) => ({
            type: 'game',
            icon: Gamepad2,
            label: game.name,
            description: `${game.accountCount ?? 0} accounts`,
            path: `/game/${game.slug ?? game.id}`,
            emoji: game.icon ?? undefined,
        }));

        return [...pages, ...gameItems];
    }, [t, gamesList]);

    // Filter results based on query
    const filteredItems = useMemo(() => {
        if (!query.trim()) return allItems.slice(0, 8);
        const q = query.toLowerCase();
        return allItems.filter(item =>
            item.label.toLowerCase().includes(q) ||
            item.description.toLowerCase().includes(q)
        ).slice(0, 8);
    }, [query, allItems]);

    // Reset active index when results change (defer to avoid sync setState in effect)
    useEffect(() => {
        queueMicrotask(() => setActiveIndex(0));
    }, [filteredItems.length]);

    // Open/close with Ctrl+K
    useEffect(() => {
        const handleKeyDown = (e) => {
            if ((e.ctrlKey || e.metaKey) && e.key === 'k') {
                e.preventDefault();
                setIsOpen(prev => !prev);
            }
        };
        document.addEventListener('keydown', handleKeyDown);
        return () => document.removeEventListener('keydown', handleKeyDown);
    }, []);

    // Focus input when opened
    useEffect(() => {
        if (isOpen) {
            setTimeout(() => inputRef.current?.focus(), 50);
            document.body.style.overflow = 'hidden';
        } else {
            document.body.style.overflow = '';
            queueMicrotask(() => {
                setQuery('');
                setActiveIndex(0);
            });
        }
        return () => { document.body.style.overflow = ''; };
    }, [isOpen]);

    const handleSelect = useCallback((item) => {
        setIsOpen(false);
        navigate(item.path);
    }, [navigate]);

    const handleKeyDown = useCallback((e) => {
        if (e.key === 'Escape') {
            setIsOpen(false);
        } else if (e.key === 'ArrowDown') {
            e.preventDefault();
            setActiveIndex(prev => Math.min(prev + 1, filteredItems.length - 1));
        } else if (e.key === 'ArrowUp') {
            e.preventDefault();
            setActiveIndex(prev => Math.max(prev - 1, 0));
        } else if (e.key === 'Enter') {
            e.preventDefault();
            if (filteredItems[activeIndex]) {
                handleSelect(filteredItems[activeIndex]);
            }
        }
    }, [filteredItems, activeIndex, handleSelect]);

    if (!isOpen) return null;

    return (
        <div
            className="search-modal-overlay"
            onClick={() => setIsOpen(false)}
            role="dialog"
            aria-modal="true"
            aria-label="Search"
        >
            <div
                className="search-modal-container"
                onClick={e => e.stopPropagation()}
                onKeyDown={handleKeyDown}
            >
                {/* Search input */}
                <div className="relative">
                    <Search
                        className="absolute left-4 top-1/2 -translate-y-1/2 w-5 h-5"
                        style={{ color: 'var(--color-text-muted)' }}
                    />
                    <input
                        ref={inputRef}
                        type="text"
                        value={query}
                        onChange={(e) => setQuery(e.target.value)}
                        className="search-modal-input"
                        placeholder={t('search.placeholder') || 'Search pages, games...'}
                        autoComplete="off"
                    />
                </div>

                {/* Results */}
                <div className="search-modal-results" role="listbox">
                    {filteredItems.length > 0 ? (
                        filteredItems.map((item, index) => (
                            <button
                                key={`${item.type}-${item.path}`}
                                className={`search-modal-item w-full ${index === activeIndex ? 'active' : ''}`}
                                onClick={() => handleSelect(item)}
                                role="option"
                                aria-selected={index === activeIndex}
                                onMouseEnter={() => setActiveIndex(index)}
                            >
                                <div
                                    className="flex items-center justify-center shrink-0"
                                    style={{
                                        width: '32px', height: '32px',
                                        borderRadius: 'var(--radius-md)',
                                        backgroundColor: 'var(--color-bg-tertiary)',
                                    }}
                                >
                                    {item.emoji ? (
                                        <span style={{ fontSize: '16px' }}>{item.emoji}</span>
                                    ) : (
                                        <item.icon className="w-4 h-4" style={{ color: 'var(--color-text-muted)' }} />
                                    )}
                                </div>
                                <div className="flex-1 text-left min-w-0">
                                    <div style={{
                                        fontSize: 'var(--font-size-base)',
                                        fontWeight: 'var(--font-weight-medium)',
                                        color: 'var(--color-text-primary)',
                                    }}>
                                        {item.label}
                                    </div>
                                    <div style={{
                                        fontSize: 'var(--font-size-xs)',
                                        color: 'var(--color-text-muted)',
                                    }}>
                                        {item.description}
                                    </div>
                                </div>
                                <ArrowRight className="w-4 h-4 shrink-0" style={{ color: 'var(--color-text-muted)', opacity: index === activeIndex ? 1 : 0 }} />
                            </button>
                        ))
                    ) : (
                        <div style={{ padding: '24px 20px', textAlign: 'center', color: 'var(--color-text-muted)', fontSize: 'var(--font-size-sm)' }}>
                            {t('search.no_results') || 'No results found'}
                        </div>
                    )}
                </div>

                {/* Hint bar */}
                <div className="search-modal-hint">
                    <div className="flex items-center gap-2">
                        <span className="search-modal-kbd">↑↓</span>
                        <span>{t('search.navigate') || 'Navigate'}</span>
                    </div>
                    <div className="flex items-center gap-2">
                        <span className="search-modal-kbd">Enter</span>
                        <span>{t('search.select') || 'Select'}</span>
                    </div>
                    <div className="flex items-center gap-2">
                        <span className="search-modal-kbd">Esc</span>
                        <span>{t('search.close') || 'Close'}</span>
                    </div>
                </div>
            </div>
        </div>
    );
};

export default CommandPalette;
