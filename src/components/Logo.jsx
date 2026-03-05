import { useTheme } from '../context/ThemeContext';

const LOGO_ASPECT = 185 / 36;
const LOGO_LIGHT = '/logo_website_black.png';
const LOGO_DARK = '/logo_website_white.png';

const Logo = ({ height = 56 }) => {
    const { isDark } = useTheme();
    const width = Math.round(height * LOGO_ASPECT);
    const bg = isDark ? '#0d1117' : '#ffffff';
    const logoSrc = isDark ? LOGO_DARK : LOGO_LIGHT;
    return (
        <div
            className="shrink-0 select-none"
            style={{
                width: `${width}px`,
                height: `${height}px`,
                backgroundColor: bg,
                backgroundImage: `url(${logoSrc})`,
                backgroundSize: 'cover',
                backgroundPosition: 'center',
                backgroundRepeat: 'no-repeat',
                imageRendering: '-webkit-optimize-contrast',
                WebkitBackfaceVisibility: 'hidden',
                transform: 'translateZ(0)',
            }}
            role="img"
            aria-label="WibeStore — Gaming Marketplace"
        />
    );
};

export default Logo;
