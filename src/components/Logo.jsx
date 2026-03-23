const LOGO_SRC = '/wibestore_logo.png';

const Logo = () => {
    return (
        <img
            src={LOGO_SRC}
            alt="WibeStore — Gaming Marketplace"
            className="shrink-0 select-none w-auto object-contain"
            style={{
                height: 'clamp(40px, 10vw, 200px)',
                maxHeight: '52px',
                imageRendering: '-webkit-optimize-contrast',
            }}
            role="img"
            fetchPriority="high"
        />
    );
};

export default Logo;
