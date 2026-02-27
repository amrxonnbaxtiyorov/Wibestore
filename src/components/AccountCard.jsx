import { useState, useEffect } from 'react';
import { Link } from 'react-router-dom';
import { Star, Crown, Heart } from 'lucide-react';
import { formatPrice } from '../data/mockData';
import { useAuth } from '../context/AuthContext';
import { useLanguage } from '../context/LanguageContext';

const AccountCard = ({ account, featured = false }) => {
    const { user, isAuthenticated } = useAuth();
    const { t } = useLanguage();
    const [isLiked, setIsLiked] = useState(false);

    useEffect(() => {
        if (!user) return;
        const savedLikes = localStorage.getItem(`wibeLikes_${user.id}`);
        if (savedLikes) {
            const likedIds = JSON.parse(savedLikes);
            const liked = likedIds.includes(account.id);
            queueMicrotask(() => setIsLiked(liked));
        }
    }, [user, account.id]);

    const handleLike = (e) => {
        e.preventDefault();
        e.stopPropagation();
        if (!isAuthenticated || !user) return;

        const savedLikes = localStorage.getItem(`wibeLikes_${user.id}`);
        let likedIds = savedLikes ? JSON.parse(savedLikes) : [];

        if (isLiked) {
            likedIds = likedIds.filter(id => id !== account.id);
        } else {
            likedIds.push(account.id);
        }

        localStorage.setItem(`wibeLikes_${user.id}`, JSON.stringify(likedIds));
        setIsLiked(!isLiked);
    };

    // Fallback for missing data
    const accountId = account.id || crypto.randomUUID();
    const accountTitle = account.title || t('common.untitled_account');
    const accountPrice = account.price || 0;
    const accountGameName = account.gameName || account.game?.name || t('common.unknown_game');
    const accountDescription = account.description || '';
    const accountImage = account.image;
    const accountIsPremium = account.isPremium || account.is_premium || false;
    const seller = account.seller || { rating: 5.0, isPremium: false };
    const warrantyDays = account.warranty_days ?? 0;
    const salePercent = account.sale_percent ?? 0;
    const saleEndsAt = account.sale_ends_at ? new Date(account.sale_ends_at) : null;
    const isOnSale = salePercent > 0 && (!saleEndsAt || saleEndsAt > new Date());
    
    return (
        <Link
            to={`/account/${accountId}`}
            className={`group relative account-card-hover block ${accountIsPremium ? 'account-card-premium' : ''} ${featured ? 'flex-shrink-0 snap-start' : ''}`}
            style={{
                backgroundColor: 'var(--color-bg-primary)',
                border: `1px solid ${accountIsPremium ? 'var(--color-premium-gold-light)' : 'var(--color-border-default)'}`,
                borderRadius: 'var(--radius-lg)',
                overflow: 'hidden',
                width: featured ? '280px' : 'auto',
                textDecoration: 'none',
            }}
        >
            {/* Premium top accent */}
            {accountIsPremium && (
                <div
                    style={{
                        position: 'absolute',
                        top: 0,
                        left: 0,
                        right: 0,
                        height: '2px',
                        background: `linear-gradient(90deg, var(--color-premium-gold), var(--color-premium-gold-light))`,
                        zIndex: 2,
                    }}
                />
            )}

            {/* Sale & Warranty badges */}
            <div className="absolute top-2 right-2 flex flex-col gap-1" style={{ zIndex: 2 }}>
                {isOnSale && (
                    <span
                        className="badge"
                        style={{
                            backgroundColor: 'var(--color-error)',
                            color: 'white',
                            fontSize: '11px',
                            padding: '2px 6px',
                        }}
                    >
                        -{salePercent}%
                    </span>
                )}
                {warrantyDays > 0 && (
                    <span
                        className="badge"
                        style={{
                            backgroundColor: 'var(--color-accent-green)',
                            color: 'white',
                            fontSize: '11px',
                            padding: '2px 6px',
                        }}
                    >
                        {warrantyDays} {t('common.days_warranty') || 'kun kafolat'}
                    </span>
                )}
            </div>

            {/* Image */}
            <div
                className="relative overflow-hidden"
                style={{
                    height: '164px',
                    backgroundColor: 'var(--color-bg-tertiary)',
                }}
            >
                {accountImage ? (
                    <img
                        src={accountImage}
                        alt={accountTitle}
                        className="w-full h-full object-cover transition-transform duration-500 group-hover:scale-105"
                    />
                ) : (
                    <div className="w-full h-full flex items-center justify-center text-5xl opacity-30">
                        🎮
                    </div>
                )}

                {/* Like Button */}
                {isAuthenticated && (
                    <button
                        onClick={handleLike}
                        className="absolute flex items-center justify-center rounded-full transition-all"
                        style={{
                            top: '12px',
                            left: '12px',
                            width: '32px',
                            height: '32px',
                            backgroundColor: isLiked ? 'var(--color-accent-red)' : 'rgba(0,0,0,0.5)',
                            backdropFilter: 'blur(4px)',
                            color: '#fff',
                            border: 'none',
                            cursor: 'pointer',
                        }}
                        aria-label={isLiked ? 'Unlike' : 'Like'}
                    >
                        <Heart className={`w-3.5 h-3.5 ${isLiked ? 'fill-current' : ''}`} />
                    </button>
                )}

                {/* Premium Badge */}
                {accountIsPremium && (
                    <div
                        className="badge badge-premium absolute flex items-center gap-1"
                        style={{ top: '12px', right: '12px', padding: '4px 8px', fontSize: '11px' }}
                    >
                        <Crown className="w-3 h-3" />
                        Premium
                    </div>
                )}

                {/* Game Badge */}
                <div
                    className="absolute rounded-full text-xs"
                    style={{
                        bottom: '12px',
                        left: '12px',
                        padding: '4px 10px',
                        backgroundColor: 'rgba(0,0,0,0.65)',
                        backdropFilter: 'blur(4px)',
                        color: '#ffffff',
                        fontWeight: 500,
                    }}
                >
                    {accountGameName}
                </div>
            </div>

            {/* Content */}
            <div style={{ padding: 'var(--space-4)' }}>
                {/* Title */}
                <h3
                    className="font-semibold mb-2 line-clamp-2 transition-colors"
                    style={{
                        fontSize: 'var(--font-size-base)',
                        lineHeight: 'var(--line-height-base)',
                        color: 'var(--color-text-primary)',
                    }}
                >
                    {accountTitle}
                </h3>

                {/* Description */}
                {accountDescription && (
                    <p
                        className="line-clamp-2 mb-4"
                        style={{
                            fontSize: 'var(--font-size-sm)',
                            color: 'var(--color-text-muted)',
                            lineHeight: 'var(--line-height-sm)',
                        }}
                    >
                        {accountDescription}
                    </p>
                )}

                {/* Footer */}
                <div
                    className="flex items-center justify-between"
                    style={{
                        paddingTop: 'var(--space-3)',
                        borderTop: '1px solid var(--color-border-muted)',
                    }}
                >
                    {/* Price */}
                    <span
                        className="font-bold"
                        style={{
                            fontSize: 'var(--font-size-lg)',
                            color: 'var(--color-text-accent)',
                        }}
                    >
                        {formatPrice(accountPrice)}
                    </span>

                    {/* Seller Info */}
                    <div className="flex items-center gap-2">
                        <div className="flex items-center gap-1">
                            <Star className="w-3.5 h-3.5 fill-current" style={{ color: 'var(--color-premium-gold-light)' }} />
                            <span style={{ fontSize: 'var(--font-size-sm)', color: 'var(--color-text-secondary)' }}>
                                {seller.rating}
                            </span>
                        </div>
                        {seller.isPremium && (
                            <Crown className="w-3.5 h-3.5" style={{ color: 'var(--color-premium-gold-light)' }} />
                        )}
                    </div>
                </div>
            </div>
        </Link>
    );
};

export default AccountCard;
