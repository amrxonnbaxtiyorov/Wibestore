import { Link } from 'react-router-dom';
import { Gamepad2, Send, Instagram, Facebook, Youtube, Twitter } from 'lucide-react';
import { useLanguage } from '../context/LanguageContext';

/* ── Custom brand SVG icons (lucide-da mavjud emas) ─────────────────────── */
const VkIcon = ({ className }) => (
    <svg className={className} viewBox="0 0 24 24" fill="currentColor" aria-hidden="true">
        <path d="M15.684 0H8.316C1.592 0 0 1.592 0 8.316v7.368C0 22.408 1.592 24 8.316 24h7.368C22.408 24 24 22.408 24 15.684V8.316C24 1.592 22.408 0 15.684 0zm3.692 17.123h-1.744c-.66 0-.862-.523-2.049-1.714-1.033-1.01-1.49-1.135-1.744-1.135-.356 0-.458.101-.458.593v1.562c0 .424-.135.678-1.253.678-1.846 0-3.896-1.118-5.335-3.202C4.624 10.857 4.03 8.57 4.03 8.096c0-.254.101-.491.593-.491h1.744c.44 0 .61.203.78.677.863 2.49 2.303 4.675 2.896 4.675.22 0 .322-.102.322-.66V9.721c-.068-1.186-.695-1.287-.695-1.71 0-.204.17-.407.44-.407h2.744c.373 0 .508.203.508.643v3.473c0 .372.17.508.271.508.22 0 .407-.136.813-.542 1.253-1.406 2.151-3.574 2.151-3.574.119-.254.322-.491.762-.491h1.744c.525 0 .644.27.525.643-.22 1.017-2.354 4.031-2.354 4.031-.186.305-.254.44 0 .78.186.254.796.779 1.203 1.253.745.847 1.32 1.558 1.473 2.05.17.49-.085.744-.576.744z" />
    </svg>
);

const TikTokIcon = ({ className }) => (
    <svg className={className} viewBox="0 0 24 24" fill="currentColor" aria-hidden="true">
        <path d="M19.59 6.69a4.83 4.83 0 0 1-3.77-4.25V2h-3.45v13.67a2.89 2.89 0 0 1-2.88 2.5 2.89 2.89 0 0 1-2.89-2.89 2.89 2.89 0 0 1 2.89-2.89c.28 0 .54.04.79.1V9.01a6.27 6.27 0 0 0-.79-.05 6.34 6.34 0 0 0-6.34 6.34 6.34 6.34 0 0 0 6.34 6.34 6.34 6.34 0 0 0 6.33-6.34V8.87a8.18 8.18 0 0 0 4.78 1.52V6.95a4.85 4.85 0 0 1-1.01-.26z" />
    </svg>
);

/* ── Barcha ijtimoiy tarmoqlar ro'yxati ──────────────────────────────────── */
const SOCIALS = [
    { href: 'https://t.me/wibe_store',                                              Icon: Send,      label: 'Telegram'  },
    { href: 'https://www.youtube.com/channel/UCbayXOXJtgW5H5FW074kUdg',            Icon: Youtube,   label: 'YouTube'   },
    { href: 'https://www.instagram.com/wibestorenet/',                              Icon: Instagram, label: 'Instagram' },
    { href: 'https://x.com/wibe_store',                                             Icon: Twitter,   label: 'X'         },
    { href: 'https://www.facebook.com/profile.php?id=61588454025117',               Icon: Facebook,  label: 'Facebook'  },
    { href: 'https://vk.com/wibestore',                                             Icon: VkIcon,    label: 'VK'        },
    { href: 'https://www.tiktok.com/@wibestore',                                    Icon: TikTokIcon,label: 'TikTok'    },
];

const Footer = () => {
    const currentYear = new Date().getFullYear();
    const { t } = useLanguage();

    const footerLinks = {
        marketplace: [
            { label: t('footer.all_products') || 'Все товары', to: '/products' },
            { label: t('footer.top_accounts') || 'Топ аккаунты', to: '/top' },
            { label: t('footer.premium_sub') || 'Премиум подписка', to: '/premium' },
        ],
        support: [
            { label: t('footer.faq'), to: '/faq' },
            { label: t('footer.terms'), to: '/terms' },
            { label: t('footer.privacy'), to: '/terms' },
            { label: t('footer.cookies'), to: '/terms' },
        ],
    };

    return (
        <footer
            style={{
                backgroundColor: 'var(--color-bg-secondary)',
                borderTop: '1px solid var(--color-border-default)',
                marginTop: '64px',
            }}
        >
            <div className="gh-container" style={{ paddingTop: '48px', paddingBottom: '48px' }}>
                <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4" style={{ gap: '32px' }}>

                    {/* Brand Section */}
                    <div className="lg:col-span-2">
                        <Link to="/" className="flex items-center gap-2.5 mb-4" style={{ textDecoration: 'none' }}>
                            <div
                                className="flex items-center justify-center rounded-lg"
                                style={{
                                    width: '32px',
                                    height: '32px',
                                    background: 'linear-gradient(135deg, var(--color-accent-blue), var(--color-accent-purple))',
                                }}
                            >
                                <Gamepad2 className="w-5 h-5" style={{ color: '#ffffff' }} />
                            </div>
                            <span className="text-lg font-bold" style={{ color: 'var(--color-text-primary)' }}>
                                wibestore.uz
                            </span>
                        </Link>

                        <p
                            className="text-sm mb-6"
                            style={{
                                color: 'var(--color-text-secondary)',
                                maxWidth: '360px',
                                lineHeight: '20px',
                            }}
                        >
                            Dunyodagi eng ishonchli akkunt savdo platformasi
                        </p>

                        <div className="space-y-2">
                            <a href="https://t.me/wibestore_admin_bot" target="_blank" rel="noopener noreferrer" className="flex items-center gap-2 text-sm link-hover-accent">
                                <Send className="w-4 h-4" style={{ color: '#2AABEE' }} />
                                @wibestore_admin_bot
                            </a>
                        </div>
                    </div>

                    {/* Quick Links */}
                    <div>
                        <h3
                            className="font-semibold mb-4"
                            style={{
                                fontSize: 'var(--font-size-sm)',
                                color: 'var(--color-text-primary)',
                                textTransform: 'uppercase',
                                letterSpacing: '0.5px',
                            }}
                        >
                            {t('footer.quick_links')}
                        </h3>
                        <ul className="space-y-2">
                            {footerLinks.marketplace.map((link, idx) => (
                                <li key={idx}>
                                    <Link to={link.to} className="text-sm link-hover-accent">
                                        {link.label}
                                    </Link>
                                </li>
                            ))}
                        </ul>
                    </div>

                    {/* Support Links */}
                    <div>
                        <h3
                            className="font-semibold mb-4"
                            style={{
                                fontSize: 'var(--font-size-sm)',
                                color: 'var(--color-text-primary)',
                                textTransform: 'uppercase',
                                letterSpacing: '0.5px',
                            }}
                        >
                            {t('footer.support')}
                        </h3>
                        <ul className="space-y-2">
                            {footerLinks.support.map((link, idx) => (
                                <li key={idx}>
                                    <Link to={link.to} className="text-sm link-hover-accent">
                                        {link.label}
                                    </Link>
                                </li>
                            ))}
                        </ul>
                    </div>
                </div>

                {/* Bottom Section */}
                <div
                    className="flex flex-col md:flex-row items-center justify-between gap-4"
                    style={{
                        marginTop: '48px',
                        paddingTop: '24px',
                        borderTop: '1px solid var(--color-border-default)',
                    }}
                >
                    <p className="text-sm" style={{ color: 'var(--color-text-muted)' }}>
                        © {currentYear} WibeStore. {t('footer.rights')}
                    </p>

                    {/* Social Icons */}
                    <div className="flex items-center gap-2">
                        {SOCIALS.map(({ href, Icon, label }) => (
                            <a
                                key={label}
                                href={href}
                                target="_blank"
                                rel="noopener noreferrer"
                                aria-label={label}
                                title={label}
                                className="social-icon-btn"
                            >
                                <Icon className="w-4 h-4" />
                            </a>
                        ))}
                    </div>

                    {/* Payment Methods */}
                    <div className="flex items-center gap-2">
                        <div
                            className="rounded-md text-xs font-medium flex items-center gap-1.5"
                            style={{
                                backgroundColor: 'var(--color-bg-tertiary)',
                                color: 'var(--color-text-secondary)',
                                border: '1px solid var(--color-border-muted)',
                                padding: '10px',
                            }}
                        >
                            <Send className="w-3.5 h-3.5" style={{ color: '#2AABEE' }} />
                            Telegram orqali
                        </div>
                    </div>
                </div>
            </div>
        </footer>
    );
};

export default Footer;
