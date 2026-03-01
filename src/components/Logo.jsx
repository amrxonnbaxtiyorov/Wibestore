const Logo = ({ height = 46 }) => {
    return (
        <img
            src="/logo.png"
            alt="WibeStore — Gaming Marketplace"
            className="select-none object-contain flex-shrink-0"
            style={{
                height: `${height}px`,
                width: 'auto',
                maxWidth: '280px',
                minHeight: `${height}px`,
                display: 'block',
            }}
        />
    );
};

export default Logo;
