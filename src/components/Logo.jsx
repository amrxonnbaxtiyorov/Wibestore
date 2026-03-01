// Oldingi SVG logoning o'lchamlari: viewBox 185×36, height 38 → width ≈ 195
const LOGO_ASPECT = 185 / 36;

const Logo = ({ height = 38 }) => {
    const width = Math.round(height * LOGO_ASPECT);
    return (
        <div
            className="flex-shrink-0 overflow-hidden"
            style={{ width: `${width}px`, height: `${height}px` }}
        >
            <img
                src="/logo.png"
                alt="WibeStore — Gaming Marketplace"
                className="select-none w-full h-full flex-shrink-0"
                style={{
                    objectFit: 'cover',
                    objectPosition: 'center center',
                    display: 'block',
                }}
            />
        </div>
    );
};

export default Logo;
