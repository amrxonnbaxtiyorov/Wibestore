import { useState, useEffect } from 'react';
import { Link } from 'react-router-dom';
import { useLanguage } from '../context/LanguageContext';

const STORAGE_KEY = 'wibeCookieConsent';

const CookieConsent = () => {
    const { t } = useLanguage();
    const [visible, setVisible] = useState(false);

    useEffect(() => {
        const accepted = localStorage.getItem(STORAGE_KEY);
        if (!accepted) setVisible(true);
    }, []);

    const accept = () => {
        localStorage.setItem(STORAGE_KEY, 'accepted');
        setVisible(false);
    };

    if (!visible) return null;

    return (
        <div
            role="dialog"
            aria-label={t('cookie.banner_label')}
            className="animate-fadeIn"
            style={{
                position: 'fixed',
                bottom: 0,
                left: 0,
                right: 0,
                zIndex: 9999,
                padding: '16px 20px',
                backgroundColor: 'var(--color-bg-secondary)',
                borderTop: '1px solid var(--color-border-default)',
                boxShadow: '0 -4px 24px rgba(0,0,0,0.15)',
            }}
        >
            <div
                className="gh-container"
                style={{
                    display: 'flex',
                    flexWrap: 'wrap',
                    alignItems: 'center',
                    justifyContent: 'space-between',
                    gap: '16px',
                }}
            >
                <p
                    style={{
                        margin: 0,
                        fontSize: 'var(--font-size-sm)',
                        color: 'var(--color-text-secondary)',
                        lineHeight: 1.5,
                        flex: '1 1 280px',
                    }}
                >
                    {t('cookie.message')}{' '}
                    <Link
                        to="/terms"
                        style={{
                            color: 'var(--color-text-accent)',
                            fontWeight: 'var(--font-weight-semibold)',
                            textDecoration: 'underline',
                        }}
                    >
                        {t('cookie.learn_more')}
                    </Link>
                </p>
                <div style={{ display: 'flex', gap: '10px', flexShrink: 0 }}>
                    <button
                        type="button"
                        onClick={accept}
                        className="btn btn-md"
                        style={{
                            background: 'linear-gradient(135deg, var(--color-accent-blue), var(--color-accent-purple))',
                            color: '#fff',
                            border: 'none',
                            borderRadius: 'var(--radius-md)',
                            padding: '10px 20px',
                            fontWeight: 600,
                            fontSize: 'var(--font-size-sm)',
                            cursor: 'pointer',
                        }}
                    >
                        {t('cookie.accept')}
                    </button>
                </div>
            </div>
        </div>
    );
};

export default CookieConsent;
