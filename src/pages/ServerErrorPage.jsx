import { Link } from 'react-router-dom';
import { Home, RefreshCw, Server } from 'lucide-react';
import { useLanguage } from '../context/LanguageContext';

const ServerErrorPage = () => {
    const { t } = useLanguage();

    return (
        <div
            className="page-enter flex items-center justify-center"
            style={{ minHeight: 'calc(100vh - 64px)', padding: '32px 16px' }}
        >
            <div className="text-center" style={{ maxWidth: '500px' }}>
                <div
                    style={{
                        fontSize: 'clamp(80px, 18vw, 140px)',
                        fontWeight: 'var(--font-weight-bold)',
                        lineHeight: 1,
                        color: 'var(--color-text-muted)',
                        opacity: 0.2,
                        userSelect: 'none',
                        marginBottom: '16px',
                    }}
                >
                    500
                </div>
                <div
                    className="flex items-center justify-center mx-auto"
                    style={{
                        width: '64px',
                        height: '64px',
                        borderRadius: 'var(--radius-xl)',
                        backgroundColor: 'var(--color-error-bg, #fef2f2)',
                        border: '1px solid var(--color-border-default)',
                        marginBottom: '24px',
                        marginTop: '-40px',
                    }}
                >
                    <Server style={{ width: '32px', height: '32px', color: 'var(--color-error, #dc2626)' }} />
                </div>
                <h1
                    style={{
                        fontSize: 'var(--font-size-xl)',
                        fontWeight: 'var(--font-weight-bold)',
                        color: 'var(--color-text-primary)',
                        marginBottom: '12px',
                    }}
                >
                    {t('common.server_error_title')}
                </h1>
                <p
                    style={{
                        fontSize: 'var(--font-size-base)',
                        color: 'var(--color-text-muted)',
                        marginBottom: '24px',
                        lineHeight: 1.5,
                    }}
                >
                    {t('common.server_error_message')}
                </p>
                <div className="flex flex-wrap items-center justify-center gap-3">
                    <button
                        onClick={() => window.location.reload()}
                        className="flex items-center gap-2"
                        style={{
                            padding: '12px 20px',
                            borderRadius: 'var(--radius-lg)',
                            backgroundColor: 'var(--color-accent-blue)',
                            color: '#fff',
                            border: 'none',
                            fontWeight: 'var(--font-weight-semibold)',
                            cursor: 'pointer',
                        }}
                    >
                        <RefreshCw style={{ width: '18px', height: '18px' }} />
                        {t('error_boundary.retry')}
                    </button>
                    <Link
                        to="/"
                        className="flex items-center gap-2"
                        style={{
                            padding: '12px 20px',
                            borderRadius: 'var(--radius-lg)',
                            backgroundColor: 'var(--color-bg-tertiary)',
                            color: 'var(--color-text-primary)',
                            border: '1px solid var(--color-border-default)',
                            fontWeight: 'var(--font-weight-semibold)',
                            textDecoration: 'none',
                        }}
                    >
                        <Home style={{ width: '18px', height: '18px' }} />
                        {t('common.home')}
                    </Link>
                </div>
            </div>
        </div>
    );
};

export default ServerErrorPage;
