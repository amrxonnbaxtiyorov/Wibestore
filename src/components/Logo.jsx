const Logo = ({ height = 36 }) => {
    return (
        <img
            src="/logo.png"
            alt="WibeStore — Gaming Marketplace"
            className="select-none object-contain"
            style={{
                height: `${height}px`,
                width: 'auto',
                maxWidth: '220px',
                display: 'block',
            }}
        />
    );
};

export default Logo;
