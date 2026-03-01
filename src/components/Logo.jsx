import { useTheme } from '../context/ThemeContext';

const LOGO_ASPECT = 185 / 36;
const LOGO_SRC = '/logo-transparent.png';

const Logo = ({ height = 48 }) => {
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
                backgroundImage: `url(${LOGO_SRC})`,
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
