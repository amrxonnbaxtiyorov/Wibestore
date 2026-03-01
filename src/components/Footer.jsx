import { Link } from 'react-router-dom';
import { Gamepad2, Mail, Phone, MapPin, Send, Instagram, Facebook } from 'lucide-react';
import { useLanguage } from '../context/LanguageContext';

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
            { label: t('footer.privacy'), to: '/privacy' },
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
                            <span
                                className="text-lg font-bold"
                                style={{ color: 'var(--color-text-primary)' }}
                            >
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
                            {t('footer.description') || 'Самая надёжная платформа торговли игровыми аккаунтами в Узбекистане'}
                        </p>
                        <div className="space-y-2">
                            <a
                                href="mailto:support@wibestore.uz"
                                className="flex items-center gap-2 text-sm link-hover-accent"
                            >
                                <Mail className="w-4 h-4" />
                                support@wibestore.uz
                            </a>
                            <a
                                href="tel:+998901234567"
                                className="flex items-center gap-2 text-sm link-hover-accent"
                            >
                                <Phone className="w-4 h-4" />
                                +998 90 123 45 67
                            </a>
                            <div
                                className="flex items-center gap-2 text-sm"
                                style={{ color: 'var(--color-text-muted)' }}
                            >
                                <MapPin className="w-4 h-4" />
                                Toshkent, O'zbekiston
                            </div>
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
                                    <Link
                                        to={link.to}
                                        className="text-sm link-hover-accent"
                                    >
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
                                    <Link
                                        to={link.to}
                                        className="text-sm link-hover-accent"
                                    >
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

                    {/* Social Links */}
                    <div className="flex items-center gap-2">
                        {[
                            { href: 'https://t.me/wibestoreuz', icon: Send, label: 'Telegram' },
                            { href: 'https://instagram.com/wibestoreuz', icon: Instagram, label: 'Instagram' },
                            { href: 'https://facebook.com/wibestoreuz', icon: Facebook, label: 'Facebook' },
                        ].map((social) => (
                            <a
                                key={social.label}
                                href={social.href}
                                target="_blank"
                                rel="noopener noreferrer"
                                aria-label={social.label}
                                className="social-icon-btn"
                            >
                                <social.icon className="w-4 h-4" />
                            </a>
                        ))}
                    </div>

                    {/* Payment Methods */}
                    <div className="flex items-center gap-2">
                        {['Payme', 'Click', 'Paynet'].map((method) => (
                            <div
                                key={method}
                                className="rounded-md text-xs font-medium"
                                style={{
                                    backgroundColor: 'var(--color-bg-tertiary)',
                                    color: 'var(--color-text-secondary)',
                                    border: '1px solid var(--color-border-muted)',
                                    padding: '10px',
                                }}
                            >
                                {method}
                            </div>
                        ))}
                    </div>
                </div>
            </div>
        </footer>
    );
};

export default Footer;
