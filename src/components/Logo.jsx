import { useTheme } from '../context/ThemeContext';

// Oldingi SVG logoning o'lchamlari: viewBox 185×36, height 38 → width ≈ 195
const LOGO_ASPECT = 185 / 36;

const Logo = ({ height = 38 }) => {
    const { isDark } = useTheme();
    const width = Math.round(height * LOGO_ASPECT);
    const bg = isDark ? '#0d1117' : '#ffffff';
    return (
        <div
            className="flex-shrink-0 overflow-hidden"
            style={{
                width: `${width}px`,
                height: `${height}px`,
                backgroundColor: bg,
            }}
        >
            <img
                src="/logo.png"
                alt="WibeStore — Gaming Marketplace"
                className="select-none w-full h-full flex-shrink-0"
                style={{
                    objectFit: 'contain',
                    objectPosition: 'center center',
                    display: 'block',
                }}
            />
        </div>
    );
};

export default Logo;
