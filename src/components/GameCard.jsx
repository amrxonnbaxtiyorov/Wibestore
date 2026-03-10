import { useState } from 'react';
import { Link } from 'react-router-dom';

const GameCard = ({ game }) => {
    // API formatini qo'llab-quvvatlash
    const gameId = game.id || game.slug;
    const gameName = game.name;
    const gameIcon = game.icon;
    const gameImage = game.image || game.banner;
    const imageFallback = game.imageFallback;
    const accountCount = game.accountCount ?? game.listingsCount ?? game.active_listings_count ?? 0;
    const [imageError, setImageError] = useState(false);
    const [useFallback, setUseFallback] = useState(false);
    const displayImage = useFallback && imageFallback ? imageFallback : gameImage;
    const showImage = displayImage && !String(displayImage).includes('placeholder') && !imageError;

    const handleImageError = () => {
        if (imageFallback && !useFallback) {
            setUseFallback(true);
        } else {
            setImageError(true);
        }
    };

    return (
        <Link
            to={`/game/${gameId}`}
            className="group block card-hover-lift"
            style={{
                backgroundColor: 'var(--color-bg-primary)',
                border: '1px solid var(--color-border-default)',
                borderRadius: 'var(--radius-lg)',
                overflow: 'hidden',
                textDecoration: 'none',
            }}
        >
            {/* O'yin rasmi (iconka) — bosilsa shu o'yin akkauntlari sahifasiga o'tadi */}
            <div
                className="relative flex items-center justify-center overflow-hidden"
                style={{
                    height: '120px',
                    backgroundColor: 'var(--color-bg-tertiary)',
                }}
            >
                {showImage ? (
                    <img
                        src={displayImage}
                        alt={gameName}
                        className="w-full h-full object-cover transition-transform duration-500 group-hover:scale-105"
                        onError={handleImageError}
                    />
                ) : gameIcon ? (
                    <span className="text-4xl opacity-40">{gameIcon}</span>
                ) : (
                    <span className="text-4xl opacity-40">🎮</span>
                )}

                {/* Account count badge */}
                {accountCount > 0 && (
                    <div
                        className="rounded-full"
                        style={{
                            bottom: '8px',
                            right: '8px',
                            padding: '2px 8px',
                            backgroundColor: 'var(--color-accent-blue)',
                            color: '#ffffff',
                            fontSize: 'var(--font-size-xs)',
                            fontWeight: 'var(--font-weight-semibold)',
                            position: 'absolute',
                        }}
                    >
                        {accountCount}
                    </div>
                )}
            </div>

            {/* Content */}
            <div
                className="flex items-center gap-3"
                style={{ padding: 'var(--space-3) var(--space-4)' }}
            >
                {gameIcon && (
                    <span className="text-lg flex-shrink-0">{gameIcon}</span>
                )}
                <div className="min-w-0">
                    <h3
                        className="font-semibold truncate"
                        style={{
                            fontSize: 'var(--font-size-base)',
                            color: 'var(--color-text-primary)',
                            lineHeight: 'var(--line-height-base)',
                        }}
                    >
                        {gameName}
                    </h3>
                    {accountCount > 0 && (
                        <p style={{
                            fontSize: 'var(--font-size-sm)',
                            color: 'var(--color-text-muted)',
                        }}>
                            {accountCount} accounts
                        </p>
                    )}
                </div>
            </div>
        </Link>
    );
};

export default GameCard;
