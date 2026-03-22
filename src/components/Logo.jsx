const LOGO_SRC = '/wibestore_logo.png';

const Logo = () => {
    return (
        <img
            src={LOGO_SRC}
            alt="WibeStore — Gaming Marketplace"
            className="shrink-0 select-none w-auto object-contain"
            style={{
                height: 'clamp(36px, 8vw, 48px)',
                maxHeight: '48px',
                imageRendering: '-webkit-optimize-contrast',
            }}
            role="img"
            fetchPriority="high"
        />
    );
};

export default Logo;
