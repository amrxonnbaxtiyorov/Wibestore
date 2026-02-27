import { Component } from 'react';
import uz from '../locales/uz.json';
import en from '../locales/en.json';
import ru from '../locales/ru.json';

const LOCALES = { uz, en, ru };

function getErrorBoundaryMessages() {
    const lang = (typeof window !== 'undefined' && localStorage.getItem('wibeLanguage')) || 'uz';
    const L = LOCALES[lang]?.error_boundary || LOCALES.uz?.error_boundary || {};
    return {
        title: L.title || 'Xatolik yuz berdi',
        description: L.description || 'Kutilmagan xatolik.',
        details_label: L.details_label || 'Tafsilotlar',
        retry: L.retry || 'Sahifani yangilash',
        home: L.home || 'Bosh sahifaga',
    };
}

/**
 * Error Boundary — render xatolarini ushlaydi, Sentry ga yuboradi, i18n fallback UI ko'rsatadi
 */
class ErrorBoundary extends Component {
    constructor(props) {
        super(props);
        this.state = {
            hasError: false,
            error: null,
            errorInfo: null,
        };
    }

    static getDerivedStateFromError(_error) {
        return { hasError: true };
    }

    componentDidCatch(error, errorInfo) {
        this.setState({ error, errorInfo });
        
        console.error('[ErrorBoundary] Caught error:', error, errorInfo);
        
        // Отправка ошибки в Sentry (если настроен)
        if (import.meta.env.VITE_SENTRY_DSN) {
            try {
                if (typeof window !== 'undefined' && window.Sentry) {
                    window.Sentry.captureException(error, { extra: errorInfo });
                }
            } catch {
                // Sentry may be unavailable; ignore
            }
        }
    }

    handleRetry = () => {
        this.setState({ hasError: false, error: null, errorInfo: null });
        window.location.reload();
    };

    handleGoHome = () => {
        window.location.href = '/';
    };

    render() {
        if (this.state.hasError) {
            const msg = getErrorBoundaryMessages();
            return (
                <div
                    style={{
                        minHeight: '100vh',
                        display: 'flex',
                        alignItems: 'center',
                        justifyContent: 'center',
                        padding: '20px',
                        backgroundColor: 'var(--color-bg-secondary, #f5f5f5)',
                    }}
                >
                    <div
                        style={{
                            maxWidth: '500px',
                            padding: '32px',
                            backgroundColor: 'var(--color-bg-primary, white)',
                            borderRadius: '12px',
                            boxShadow: '0 4px 12px rgba(0,0,0,0.1)',
                        }}
                    >
                        <h1
                            style={{
                                fontSize: '24px',
                                fontWeight: '700',
                                color: 'var(--color-error, #dc2626)',
                                marginBottom: '16px',
                            }}
                        >
                            {msg.title}
                        </h1>
                        
                        <p
                            style={{
                                fontSize: '16px',
                                color: 'var(--color-text-secondary, #6b7280)',
                                marginBottom: '24px',
                                lineHeight: '1.5',
                            }}
                        >
                            {msg.description}
                        </p>
                        
                        {import.meta.env.DEV && this.state.error && (
                            <details
                                style={{
                                    marginBottom: '24px',
                                    padding: '16px',
                                    backgroundColor: 'var(--color-error-bg, #fef2f2)',
                                    borderRadius: '8px',
                                    fontSize: '12px',
                                }}
                            >
                                <summary
                                    style={{
                                        cursor: 'pointer',
                                        fontWeight: '600',
                                        color: 'var(--color-error, #dc2626)',
                                    }}
                                >
                                    {msg.details_label}
                                </summary>
                                <pre
                                    style={{
                                        marginTop: '8px',
                                        whiteSpace: 'pre-wrap',
                                        wordBreak: 'break-word',
                                        color: '#7f1d1d',
                                    }}
                                >
                                    {this.state.error.toString()}
                                    {'\n\n'}
                                    {this.state.errorInfo?.componentStack}
                                </pre>
                            </details>
                        )}
                        
                        <div
                            style={{
                                display: 'flex',
                                gap: '12px',
                            }}
                        >
                            <button
                                onClick={this.handleRetry}
                                style={{
                                    flex: 1,
                                    padding: '12px 24px',
                                    backgroundColor: '#2563eb',
                                    color: 'white',
                                    border: 'none',
                                    borderRadius: '8px',
                                    fontSize: '14px',
                                    fontWeight: '600',
                                    cursor: 'pointer',
                                    transition: 'background-color 0.2s',
                                }}
                                onMouseOver={(e) => e.target.style.backgroundColor = '#1d4ed8'}
                                onMouseOut={(e) => e.target.style.backgroundColor = '#2563eb'}
                            >
                                {msg.retry}
                            </button>
                            
                            <button
                                onClick={this.handleGoHome}
                                style={{
                                    flex: 1,
                                    padding: '12px 24px',
                                    backgroundColor: '#f3f4f6',
                                    color: '#374151',
                                    border: '1px solid #d1d5db',
                                    borderRadius: '8px',
                                    fontSize: '14px',
                                    fontWeight: '600',
                                    cursor: 'pointer',
                                    transition: 'background-color 0.2s',
                                }}
                                onMouseOver={(e) => e.target.style.backgroundColor = '#e5e7eb'}
                                onMouseOut={(e) => e.target.style.backgroundColor = '#f3f4f6'}
                            >
                                {msg.home}
                            </button>
                        </div>
                    </div>
                </div>
            );
        }

        return this.props.children;
    }
}

export default ErrorBoundary;
