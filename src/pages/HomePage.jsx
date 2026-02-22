import { useState, useEffect, useRef } from 'react';
import { Link } from 'react-router-dom';
import { ArrowRight, Shield, Zap, Users, TrendingUp, Star, Crown, ChevronRight, Trophy } from 'lucide-react';
import { useGames, useListings } from '../hooks';
import GameCard from '../components/GameCard';
import AccountCard from '../components/AccountCard';
import { SkeletonGrid, SkeletonCard } from '../components/SkeletonLoader';
import { useLanguage } from '../context/LanguageContext';
import { games as mockGames, accounts as mockAccounts } from '../data/mockData';

// Animated counter hook
function useCounter(target, duration = 2000) {
    const [value, setValue] = useState('0');
    const [started, setStarted] = useState(false);
    const ref = useRef(null);

    useEffect(() => {
        const el = ref.current;
        if (!el) return;
        const obs = new IntersectionObserver(([entry]) => {
            if (entry.isIntersecting && !started) {
                setStarted(true);
                const num = parseFloat(String(target).replace(/[^0-9.]/g, ''));
                const suffix = String(target).replace(/[0-9,.]/g, '');
                const hasComma = String(target).includes(',');
                const start = performance.now();
                const animate = (now) => {
                    const p = Math.min((now - start) / duration, 1);
                    const eased = 1 - Math.pow(1 - p, 3);
                    const cur = Math.floor(eased * num);
                    setValue((hasComma ? cur.toLocaleString() : String(cur)) + suffix);
                    if (p < 1) requestAnimationFrame(animate);
                    else setValue((hasComma ? num.toLocaleString() : String(num)) + suffix);
                };
                requestAnimationFrame(animate);
            }
        }, { threshold: 0.3 });
        obs.observe(el);
        return () => obs.disconnect();
    }, [target, duration, started]);

    return { ref, value };
}

const HomePage = () => {
    const { t } = useLanguage();
    
    // API hooks
    const { data: gamesData, isLoading: gamesLoading } = useGames();
    const { data: listingsData, isLoading: listingsLoading } = useListings({ limit: 8 });

    // Use API data or fallback to mock data — ensure array, no undefined items
    const rawGames = gamesData?.results ?? gamesData ?? mockGames;
    const games = Array.isArray(rawGames) ? rawGames.filter(Boolean) : [];

    // API bo'sh bo'lsa mock akkauntlar ko'rinsin (sotuvchi/xaridor va xatolik tekshiruvi uchun)
    const rawListings = listingsData?.pages?.flatMap?.(page => page?.results ?? []) ?? listingsData?.results ?? listingsData ?? [];
    let allListings = Array.isArray(rawListings) ? rawListings.filter(Boolean) : [];
    if (allListings.length === 0) allListings = mockAccounts;

    const premiumAccounts = allListings.filter(l => l?.is_premium).slice(0, 6);
    const recommendedAccounts = allListings.slice(0, 8);

    // Top accounts - sorted by premium status and rating
    const topAccounts = [...allListings]
        .sort((a, b) => {
            if (!a || !b) return 0;
            if (a.is_premium && !b.is_premium) return -1;
            if (!a.is_premium && b.is_premium) return 1;
            return (b.seller?.rating || 0) - (a.seller?.rating || 0);
        })
        .slice(0, 8);

    const statsData = [
        { target: '12,500+', label: t('stats.accounts'), icon: TrendingUp },
        { target: '5,000+', label: t('stats.sellers'), icon: Users },
        { target: '98%', label: t('stats.success'), icon: Zap },
    ];

    // Create counter hooks for each stat
    const counter1 = useCounter(statsData[0].target);
    const counter2 = useCounter(statsData[1].target);
    const counter3 = useCounter(statsData[2].target);
    const counters = [counter1, counter2, counter3];

    return (
        <div className="page-enter" style={{ minHeight: '100vh' }}>
            {/* Hero Section */}
            <section style={{ paddingTop: '80px', paddingBottom: '64px', position: 'relative', overflow: 'hidden' }}>
                {/* Subtle background accents */}
                <div
                    style={{
                        position: 'absolute',
                        top: '50%',
                        left: '50%',
                        transform: 'translate(-50%, -50%)',
                        width: '600px',
                        height: '600px',
                        background: 'radial-gradient(circle, var(--color-accent-blue) 0%, transparent 70%)',
                        opacity: 0.04,
                        pointerEvents: 'none',
                    }}
                />
                <div
                    style={{
                        position: 'absolute',
                        top: '30%',
                        right: '-10%',
                        width: '400px',
                        height: '400px',
                        background: 'radial-gradient(circle, var(--color-accent-purple) 0%, transparent 70%)',
                        opacity: 0.03,
                        pointerEvents: 'none',
                    }}
                />

                <div className="gh-container" style={{ position: 'relative' }}>
                    <div className="text-center" style={{ maxWidth: '720px', margin: '0 auto' }}>
                        {/* Badge */}
                        <div
                            className="badge badge-blue inline-flex items-center gap-2 animate-fadeInUp"
                            style={{ padding: '6px 14px', marginBottom: '24px', fontSize: '13px' }}
                        >
                            <Shield className="w-3.5 h-3.5" />
                            <span>{t('hero.badge')}</span>
                        </div>

                        {/* Heading */}
                        <h1
                            className="animate-fadeInUp"
                            style={{
                                fontSize: 'clamp(32px, 5vw, 48px)',
                                lineHeight: 1.15,
                                fontWeight: 'var(--font-weight-bold)',
                                color: 'var(--color-text-primary)',
                                marginBottom: '20px',
                                animationDelay: '0.1s',
                            }}
                        >
                            {t('hero.title1')}{' '}
                            <span className="text-gradient">
                                {t('hero.title2')}
                            </span>
                        </h1>

                        {/* Subtitle */}
                        <p
                            className="animate-fadeInUp"
                            style={{
                                fontSize: 'var(--font-size-lg)',
                                lineHeight: 'var(--line-height-lg)',
                                color: 'var(--color-text-secondary)',
                                maxWidth: '560px',
                                margin: '0 auto 32px',
                                animationDelay: '0.2s',
                            }}
                        >
                            {t('hero.subtitle')}
                        </p>

                        {/* CTA Buttons */}
                        <div
                            className="flex flex-col sm:flex-row items-center justify-center gap-3 animate-fadeInUp"
                            style={{ animationDelay: '0.3s' }}
                        >
                            <Link
                                to="/products"
                                className="btn btn-primary btn-xl"
                                style={{
                                    width: 'auto',
                                    minWidth: '160px',
                                    textDecoration: 'none',
                                    gap: '8px',
                                }}
                            >
                                {t('hero.cta_browse')}
                                <ArrowRight className="w-4 h-4" />
                            </Link>
                            <Link
                                to="/signup"
                                className="btn btn-secondary btn-xl"
                                style={{
                                    width: 'auto',
                                    minWidth: '160px',
                                    textDecoration: 'none',
                                }}
                            >
                                {t('hero.cta_sell')}
                            </Link>
                        </div>

                        {/* Animated Stats */}
                        <div
                            className="flex flex-wrap items-center justify-center gap-8 lg:gap-16 animate-fadeInUp"
                            style={{ marginTop: '48px', animationDelay: '0.4s' }}
                        >
                            {statsData.map((stat, index) => (
                                <div key={index} className="text-center" ref={counters[index].ref}>
                                    <div className="flex items-center justify-center gap-2 mb-1">
                                        <stat.icon className="w-4 h-4" style={{ color: 'var(--color-text-accent)' }} />
                                        <span
                                            className="font-bold animate-countUp"
                                            style={{
                                                fontSize: 'var(--font-size-2xl)',
                                                color: 'var(--color-text-primary)',
                                                fontVariantNumeric: 'tabular-nums',
                                            }}
                                        >
                                            {counters[index].value}
                                        </span>
                                    </div>
                                    <span style={{ fontSize: 'var(--font-size-sm)', color: 'var(--color-text-muted)' }}>
                                        {stat.label}
                                    </span>
                                </div>
                            ))}
                        </div>
                    </div>
                </div>
            </section>

            {/* Games Grid Section */}
            <section style={{ paddingTop: '48px', paddingBottom: '48px' }}>
                <div className="gh-container">
                    <div className="flex items-center justify-between" style={{ marginBottom: '24px' }}>
                        <h2
                            className="flex items-center gap-2"
                            style={{
                                fontSize: 'var(--font-size-xl)',
                                fontWeight: 'var(--font-weight-semibold)',
                                color: 'var(--color-text-primary)',
                            }}
                        >
                            <span>🎮</span>
                            {t('sections.popular_games')}
                        </h2>
                        <Link
                            to="/products"
                            className="flex items-center gap-1 text-sm font-medium transition-colors"
                            style={{ color: 'var(--color-text-accent)', textDecoration: 'none' }}
                        >
                            {t('sections.all')}
                            <ChevronRight className="w-4 h-4" />
                        </Link>
                    </div>

                    <div
                        className="grid grid-cols-2 sm:grid-cols-3 lg:grid-cols-4 animate-stagger grid-auto-fill-280"
                        style={{ gap: 'var(--space-4)' }}
                    >
                        {gamesLoading ? (
                            Array.from({ length: 8 }).map((_, i) => <SkeletonCard key={i} />)
                        ) : games.length > 0 ? (
                            games.slice(0, 8).map((game) => (
                                <GameCard key={game.id || game.slug} game={{
                                    id: game.id || game.slug,
                                    name: game.name,
                                    slug: game.slug,
                                    icon: game.icon,
                                    listingsCount: game.listings_count,
                                }} />
                            ))
                        ) : null}
                    </div>
                </div>
            </section>

            {/* Premium Accounts Section */}
            <section
                style={{
                    paddingTop: '48px',
                    paddingBottom: '48px',
                    position: 'relative',
                }}
            >
                {/* Subtle premium line */}
                <div
                    style={{
                        position: 'absolute',
                        top: 0,
                        left: 0,
                        right: 0,
                        height: '1px',
                        background: 'linear-gradient(90deg, transparent, var(--color-premium-gold-light), transparent)',
                        opacity: 0.3,
                    }}
                />

                <div className="gh-container">
                    <div className="flex items-center justify-between" style={{ marginBottom: '24px' }}>
                        <h2
                            className="flex items-center gap-2"
                            style={{
                                fontSize: 'var(--font-size-xl)',
                                fontWeight: 'var(--font-weight-semibold)',
                                color: 'var(--color-text-primary)',
                            }}
                        >
                            <Crown className="w-5 h-5" style={{ color: 'var(--color-premium-gold-light)' }} />
                            {t('sections.premium_accounts')}
                        </h2>
                        <Link
                            to="/top"
                            className="flex items-center gap-1 text-sm font-medium"
                            style={{ color: 'var(--color-premium-gold-light)', textDecoration: 'none' }}
                        >
                            {t('sections.all')}
                            <ChevronRight className="w-4 h-4" />
                        </Link>
                    </div>

                    {/* Horizontal scroll slider */}
                    <div
                        className="flex gap-4 overflow-x-auto pb-4 snap-x snap-mandatory scrollbar-hide"
                        style={{ margin: '0 -16px', padding: '0 16px 16px' }}
                    >
                        {listingsLoading ? (
                            Array.from({ length: 6 }).map((_, i) => <SkeletonCard key={i} />)
                        ) : premiumAccounts.length > 0 ? (
                            premiumAccounts.map((account) => (
                                <AccountCard key={account.id} account={{
                                    id: account.id,
                                    gameId: account.game?.slug || account.game?.id,
                                    gameName: account.game?.name,
                                    title: account.title,
                                    price: parseFloat(account.price),
                                    seller: account.seller,
                                    image: account.images?.[0]?.image || '',
                                    isLiked: account.is_favorited || false,
                                    isPremium: account.is_premium,
                                }} featured />
                            ))
                        ) : null}
                    </div>
                </div>
            </section>

            {/* Top Accounts Section */}
            <section
                style={{
                    paddingTop: '48px',
                    paddingBottom: '48px',
                    backgroundColor: 'var(--color-bg-secondary)',
                }}
            >
                <div className="gh-container">
                    <div className="flex items-center justify-between" style={{ marginBottom: '24px' }}>
                        <h2
                            className="flex items-center gap-2"
                            style={{
                                fontSize: 'var(--font-size-xl)',
                                fontWeight: 'var(--font-weight-semibold)',
                                color: 'var(--color-text-primary)',
                            }}
                        >
                            <Trophy className="w-5 h-5" style={{ color: 'var(--color-premium-gold-light)' }} />
                            {t('nav.top')}
                        </h2>
                        <Link
                            to="/top"
                            className="flex items-center gap-1 text-sm font-medium"
                            style={{ color: 'var(--color-text-accent)', textDecoration: 'none' }}
                        >
                            {t('sections.all')}
                            <ChevronRight className="w-4 h-4" />
                        </Link>
                    </div>

                    <div
                        className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4 animate-stagger"
                        style={{ gap: '16px' }}
                    >
                        {listingsLoading ? (
                            Array.from({ length: 8 }).map((_, i) => <SkeletonCard key={i} />)
                        ) : topAccounts.length > 0 ? (
                            topAccounts.map((account) => (
                                <AccountCard key={account.id} account={{
                                    id: account.id,
                                    gameId: account.game?.slug || account.game?.id,
                                    gameName: account.game?.name,
                                    title: account.title,
                                    price: parseFloat(account.price),
                                    seller: account.seller,
                                    image: account.images?.[0]?.image || account.image,
                                    isLiked: account.is_favorited || false,
                                    isPremium: account.is_premium,
                                }} />
                            ))
                        ) : null}
                    </div>
                </div>
            </section>

            {/* Recommended Accounts Section */}
            <section style={{ paddingTop: '48px', paddingBottom: '48px' }}>
                <div className="gh-container">
                    <div className="flex items-center justify-between" style={{ marginBottom: '24px' }}>
                        <h2
                            className="flex items-center gap-2"
                            style={{
                                fontSize: 'var(--font-size-xl)',
                                fontWeight: 'var(--font-weight-semibold)',
                                color: 'var(--color-text-primary)',
                            }}
                        >
                            <Star className="w-5 h-5" style={{ color: 'var(--color-text-accent)' }} />
                            {t('sections.recommended')}
                        </h2>
                        <Link
                            to="/products"
                            className="flex items-center gap-1 text-sm font-medium"
                            style={{ color: 'var(--color-text-accent)', textDecoration: 'none' }}
                        >
                            {t('sections.more')}
                            <ChevronRight className="w-4 h-4" />
                        </Link>
                    </div>

                    <div
                        className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4 animate-stagger"
                        style={{ gap: '16px' }}
                    >
                        {listingsLoading ? (
                            Array.from({ length: 8 }).map((_, i) => <SkeletonCard key={i} />)
                        ) : recommendedAccounts.length > 0 ? (
                            recommendedAccounts.map((account) => (
                                <AccountCard key={account.id} account={{
                                    id: account.id,
                                    gameId: account.game?.slug || account.game?.id,
                                    gameName: account.game?.name,
                                    title: account.title,
                                    price: parseFloat(account.price),
                                    seller: account.seller,
                                    image: account.images?.[0]?.image || '',
                                    isLiked: account.is_favorited || false,
                                    isPremium: account.is_premium,
                                }} />
                            ))
                        ) : null}
                    </div>
                </div>
            </section>

            {/* Trust Section */}
            <section style={{ paddingTop: '48px', paddingBottom: '48px' }}>
                <div className="gh-container">
                    <div
                        style={{
                            borderRadius: 'var(--radius-xl)',
                            border: '1px solid var(--color-border-default)',
                            backgroundColor: 'var(--color-bg-secondary)',
                            padding: '48px 32px',
                        }}
                    >
                        <div className="text-center" style={{ marginBottom: '40px' }}>
                            <h2
                                style={{
                                    fontSize: 'var(--font-size-2xl)',
                                    fontWeight: 'var(--font-weight-bold)',
                                    color: 'var(--color-text-primary)',
                                    marginBottom: '12px',
                                }}
                            >
                                {t('trust.title')}{' '}
                                <span style={{ color: 'var(--color-text-accent)' }}>{t('trust.brand')}</span>?
                            </h2>
                            <p
                                style={{
                                    color: 'var(--color-text-secondary)',
                                    maxWidth: '480px',
                                    margin: '0 auto',
                                    fontSize: 'var(--font-size-base)',
                                }}
                            >
                                {t('trust.subtitle')}
                            </p>
                        </div>

                        <div className="grid grid-cols-1 md:grid-cols-3" style={{ gap: '24px' }}>
                            {[
                                {
                                    icon: Shield,
                                    title: t('trust.secure_payment'),
                                    description: t('trust.secure_desc'),
                                    color: 'var(--color-accent-green)',
                                },
                                {
                                    icon: Zap,
                                    title: t('trust.fast_delivery'),
                                    description: t('trust.fast_desc'),
                                    color: 'var(--color-accent-blue)',
                                },
                                {
                                    icon: Users,
                                    title: t('trust.support'),
                                    description: t('trust.support_desc'),
                                    color: 'var(--color-accent-purple)',
                                }
                            ].map((feature, index) => (
                                <div
                                    key={index}
                                    className="text-center card-hover-lift"
                                    style={{
                                        padding: '32px 24px',
                                        borderRadius: 'var(--radius-lg)',
                                        backgroundColor: 'var(--color-bg-primary)',
                                        border: '1px solid var(--color-border-muted)',
                                    }}
                                >
                                    <div
                                        className="flex items-center justify-center mx-auto"
                                        style={{
                                            width: '48px',
                                            height: '48px',
                                            borderRadius: 'var(--radius-lg)',
                                            backgroundColor: feature.color,
                                            marginBottom: '16px',
                                        }}
                                    >
                                        <feature.icon className="w-5 h-5" style={{ color: '#ffffff' }} />
                                    </div>
                                    <h3
                                        style={{
                                            fontSize: 'var(--font-size-lg)',
                                            fontWeight: 'var(--font-weight-semibold)',
                                            color: 'var(--color-text-primary)',
                                            marginBottom: '8px',
                                        }}
                                    >
                                        {feature.title}
                                    </h3>
                                    <p
                                        style={{
                                            fontSize: 'var(--font-size-sm)',
                                            color: 'var(--color-text-muted)',
                                            lineHeight: 'var(--line-height-base)',
                                            maxWidth: '280px',
                                            margin: '0 auto',
                                        }}
                                    >
                                        {feature.description}
                                    </p>
                                </div>
                            ))}
                        </div>
                    </div>
                </div>
            </section>

            {/* CTA Section */}
            <section style={{ paddingTop: '32px', paddingBottom: '64px' }}>
                <div className="gh-container">
                    <div
                        className="text-center"
                        style={{
                            borderRadius: 'var(--radius-xl)',
                            backgroundColor: 'var(--color-accent-blue)',
                            padding: '64px 32px',
                            position: 'relative',
                            overflow: 'hidden',
                        }}
                    >
                        {/* Background pattern */}
                        <div style={{ position: 'absolute', inset: 0, opacity: 0.08, pointerEvents: 'none' }}>
                            <div style={{ position: 'absolute', top: '-20%', right: '-5%', width: '300px', height: '300px', background: '#fff', borderRadius: '50%', filter: 'blur(60px)' }} />
                            <div style={{ position: 'absolute', bottom: '-20%', left: '-5%', width: '300px', height: '300px', background: '#fff', borderRadius: '50%', filter: 'blur(60px)' }} />
                        </div>

                        <div style={{ position: 'relative' }}>
                            <h2
                                style={{
                                    fontSize: 'clamp(24px, 4vw, 32px)',
                                    fontWeight: 'var(--font-weight-bold)',
                                    color: '#ffffff',
                                    marginBottom: '12px',
                                }}
                            >
                                {t('cta.title')}
                            </h2>
                            <p
                                style={{
                                    color: 'rgba(255,255,255,0.85)',
                                    maxWidth: '480px',
                                    margin: '0 auto 32px',
                                    fontSize: 'var(--font-size-lg)',
                                }}
                            >
                                {t('cta.subtitle')}
                            </p>
                            <div className="flex flex-col sm:flex-row items-center justify-center gap-3">
                                <Link
                                    to="/signup"
                                    className="btn btn-lg"
                                    style={{
                                        backgroundColor: '#ffffff',
                                        color: 'var(--color-accent-blue)',
                                        fontWeight: 'var(--font-weight-semibold)',
                                        textDecoration: 'none',
                                        minWidth: '140px',
                                    }}
                                >
                                    {t('cta.start')}
                                </Link>
                                <Link
                                    to="/premium"
                                    className="btn btn-lg flex items-center gap-2"
                                    style={{
                                        backgroundColor: 'transparent',
                                        color: '#ffffff',
                                        border: '1px solid rgba(255,255,255,0.3)',
                                        textDecoration: 'none',
                                        minWidth: '140px',
                                    }}
                                >
                                    <Crown className="w-4 h-4" />
                                    {t('cta.get_premium')}
                                </Link>
                            </div>
                        </div>
                    </div>
                </div>
            </section>
        </div>
    );
};

export default HomePage;
