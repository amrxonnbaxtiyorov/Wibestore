import { User } from 'lucide-react';
import { resolveImageUrl } from '../lib/displayUtils';

/**
 * UserAvatar — foydalanuvchi avatarini ko'rsatadi.
 * Avatar yo'q bo'lsa — standart User ikonkasi chiqadi.
 * Avatar bo'lsa — rasm ko'rinadi.
 */
const UserAvatar = ({ src, size = 40, name = 'User', style = {}, className = '' }) => {
    const resolved = src ? resolveImageUrl(src) || src : null;
    const iconSize = Math.round(size * 0.5);

    return (
        <div
            className={className}
            style={{
                width: size,
                height: size,
                borderRadius: '50%',
                display: 'flex',
                alignItems: 'center',
                justifyContent: 'center',
                overflow: 'hidden',
                background: resolved ? 'transparent' : 'linear-gradient(135deg, var(--color-accent-blue, #3B82F6), var(--color-accent-purple, #8B5CF6))',
                color: '#fff',
                flexShrink: 0,
                ...style,
            }}
        >
            {resolved ? (
                <img
                    src={resolved}
                    alt={name}
                    style={{ width: '100%', height: '100%', objectFit: 'cover' }}
                />
            ) : (
                <User size={iconSize} strokeWidth={1.8} />
            )}
        </div>
    );
};

export default UserAvatar;
