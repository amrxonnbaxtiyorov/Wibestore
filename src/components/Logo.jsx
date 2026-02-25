import { useTheme } from '../context/ThemeContext';

const Logo = ({ height = 36 }) => {
    const { isDark } = useTheme();

    const scale = height / 36;
    const totalWidth = Math.round(185 * scale);
    const totalHeight = height;

    return (
        <svg
            width={totalWidth}
            height={totalHeight}
            viewBox="0 0 185 36"
            fill="none"
            xmlns="http://www.w3.org/2000/svg"
            className="select-none"
        >
            {/* Controller icon */}
            <g transform="translate(0, 2)">
                {/* Controller body */}
                <path
                    d="M6 12C6 8.68629 8.68629 6 12 6H24C27.3137 6 30 8.68629 30 12V16C30 17.3 29.4 18.5 28.5 19.3L24 24C23.2 24.8 22.8 26 22.8 27.2V28C22.8 29.1 21.9 30 20.8 30H19.2C18.1 30 17.2 29.1 17.2 28V27.2C17.2 26 16.8 24.8 16 24L11.5 19.3C10.6 18.5 10 17.3 10 16V12H6Z"
                    fill="url(#controllerGrad)"
                    opacity="0.15"
                />
                <path
                    d="M8 11C8 8.23858 10.2386 6 13 6H23C25.7614 6 28 8.23858 28 11V15.5C28 16.6 27.5 17.7 26.7 18.4L23 22C22.3 22.7 21.9 23.6 21.9 24.6V26C21.9 27.1 21 28 19.9 28H16.1C15 28 14.1 27.1 14.1 26V24.6C14.1 23.6 13.7 22.7 13 22L9.3 18.4C8.5 17.7 8 16.6 8 15.5V11Z"
                    fill="url(#controllerGrad)"
                    stroke="url(#controllerStroke)"
                    strokeWidth="1.5"
                />
                {/* Left stick */}
                <circle cx="14" cy="14" r="2.5" fill="url(#buttonGrad)" />
                {/* Right buttons */}
                <circle cx="22" cy="12" r="1.5" fill="url(#buttonGrad)" />
                <circle cx="22" cy="16" r="1.5" fill="url(#buttonGrad)" />
                <circle cx="20" cy="14" r="1.5" fill="url(#buttonGrad)" />
                <circle cx="24" cy="14" r="1.5" fill="url(#buttonGrad)" />
                {/* D-pad (small cross) */}
                <rect x="13" y="18" width="2" height="4" rx="0.5" fill="url(#buttonGrad)" opacity="0.6" />
                <rect x="12" y="19" width="4" height="2" rx="0.5" fill="url(#buttonGrad)" opacity="0.6" />
            </g>

            {/* "WIBE" text */}
            <text
                x="38"
                y="24"
                fontFamily="'Inter', 'Segoe UI', system-ui, -apple-system, sans-serif"
                fontSize="19"
                fontWeight="800"
                letterSpacing="0.5"
                fill={isDark ? '#f0f6fc' : '#1f2328'}
            >
                WIBE
            </text>

            {/* "STORE" text with gradient */}
            <text
                x="99"
                y="24"
                fontFamily="'Inter', 'Segoe UI', system-ui, -apple-system, sans-serif"
                fontSize="19"
                fontWeight="800"
                letterSpacing="0.5"
                fill="url(#textGrad)"
            >
                STORE
            </text>

            {/* Tagline */}
            <text
                x="38"
                y="33"
                fontFamily="'Inter', 'Segoe UI', system-ui, -apple-system, sans-serif"
                fontSize="6.5"
                fontWeight="500"
                letterSpacing="2.5"
                fill={isDark ? '#484f58' : '#8c959f'}
            >
                GAMING MARKETPLACE
            </text>

            {/* Gradients */}
            <defs>
                <linearGradient id="controllerGrad" x1="8" y1="6" x2="28" y2="28" gradientUnits="userSpaceOnUse">
                    <stop stopColor="#3B82F6" />
                    <stop offset="1" stopColor="#06B6D4" />
                </linearGradient>
                <linearGradient id="controllerStroke" x1="8" y1="6" x2="28" y2="28" gradientUnits="userSpaceOnUse">
                    <stop stopColor="#3B82F6" />
                    <stop offset="1" stopColor="#06B6D4" />
                </linearGradient>
                <linearGradient id="buttonGrad" x1="14" y1="10" x2="24" y2="22" gradientUnits="userSpaceOnUse">
                    <stop stopColor="#ffffff" stopOpacity="0.9" />
                    <stop offset="1" stopColor="#e0f2fe" stopOpacity="0.7" />
                </linearGradient>
                <linearGradient id="textGrad" x1="99" y1="10" x2="160" y2="28" gradientUnits="userSpaceOnUse">
                    <stop stopColor="#3B82F6" />
                    <stop offset="1" stopColor="#06B6D4" />
                </linearGradient>
            </defs>
        </svg>
    );
};

export default Logo;
