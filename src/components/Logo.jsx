import { useTheme } from '../context/ThemeContext';

// Oldingi SVG logoning o'lchamlari: viewBox 185×36, height 38 → width ≈ 195
const LOGO_ASPECT = 185 / 36;

const Logo = ({ height = 38 }) => {
    const { isDark } = useTheme();
    const width = Math.round(height * LOGO_ASPECT);
    const bg = isDark ? '#0d1117' : '#ffffff';
    return (
        <div
            className="flex-shrink-0 select-none"
            style={{
                width: `${width}px`,
                height: `${height}px`,
                backgroundColor: bg,
                backgroundImage: 'url(/logo-transparent.png)',
                backgroundSize: 'contain',
                backgroundPosition: 'center',
                backgroundRepeat: 'no-repeat',
            }}
            role="img"
            aria-label="WibeStore — Gaming Marketplace"
        />
    );
};

export default Logo;
