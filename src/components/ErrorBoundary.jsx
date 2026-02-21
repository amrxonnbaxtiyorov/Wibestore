import { Component } from 'react';

/**
 * Error Boundary компонент для ловли ошибок рендеринга
 * Отправляет ошибки в Sentry и показывает fallback UI
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

    static getDerivedStateFromError(error) {
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
            } catch (_) {}
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
            return (
                <div
                    style={{
                        minHeight: '100vh',
                        display: 'flex',
                        alignItems: 'center',
                        justifyContent: 'center',
                        padding: '20px',
                        backgroundColor: '#f5f5f5',
                    }}
                >
                    <div
                        style={{
                            maxWidth: '500px',
                            padding: '32px',
                            backgroundColor: 'white',
                            borderRadius: '12px',
                            boxShadow: '0 4px 12px rgba(0,0,0,0.1)',
                        }}
                    >
                        <h1
                            style={{
                                fontSize: '24px',
                                fontWeight: '700',
                                color: '#dc2626',
                                marginBottom: '16px',
                            }}
                        >
                            Упс! Что-то пошло не так
                        </h1>
                        
                        <p
                            style={{
                                fontSize: '16px',
                                color: '#6b7280',
                                marginBottom: '24px',
                                lineHeight: '1.5',
                            }}
                        >
                            Произошла непредвиденная ошибка. Мы уже работаем над исправлением.
                        </p>
                        
                        {import.meta.env.DEV && this.state.error && (
                            <details
                                style={{
                                    marginBottom: '24px',
                                    padding: '16px',
                                    backgroundColor: '#fef2f2',
                                    borderRadius: '8px',
                                    fontSize: '12px',
                                }}
                            >
                                <summary
                                    style={{
                                        cursor: 'pointer',
                                        fontWeight: '600',
                                        color: '#dc2626',
                                    }}
                                >
                                    Детали ошибки (для разработчиков)
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
                                Обновить страницу
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
                                На главную
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
