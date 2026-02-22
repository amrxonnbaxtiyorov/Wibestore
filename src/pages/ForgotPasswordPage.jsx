import { useState } from 'react';
import { Link } from 'react-router-dom';
import { Mail, ArrowLeft, CheckCircle, Gamepad2, AlertCircle } from 'lucide-react';
import { useLanguage } from '../context/LanguageContext';

const ForgotPasswordPage = () => {
    const { t } = useLanguage();
    const [email, setEmail] = useState('');
    const [isLoading, setIsLoading] = useState(false);
    const [isSubmitted, setIsSubmitted] = useState(false);
    const [error, setError] = useState('');

    const handleSubmit = async (e) => {
        e.preventDefault();
        setError('');

        if (!email) {
            setError(t('auth.enter_email') || 'Please enter your email');
            return;
        }
        if (!/\S+@\S+\.\S+/.test(email)) {
            setError(t('auth.valid_email') || 'Please enter a valid email');
            return;
        }

        setIsLoading(true);
        await new Promise(resolve => setTimeout(resolve, 1500));
        setIsLoading(false);
        setIsSubmitted(true);
    };

    if (isSubmitted) {
        return (
            <div
                className="page-enter flex items-center justify-center"
                style={{ minHeight: 'calc(100vh - 64px)', padding: '32px 16px' }}
            >
                <div className="text-center" style={{ maxWidth: '400px' }}>
                    <div
                        className="flex items-center justify-center mx-auto"
                        style={{
                            width: '64px',
                            height: '64px',
                            borderRadius: 'var(--radius-full)',
                            backgroundColor: 'var(--color-success-bg)',
                            marginBottom: '24px',
                        }}
                    >
                        <CheckCircle className="w-8 h-8" style={{ color: 'var(--color-accent-green)' }} />
                    </div>
                    <h1 style={{
                        fontSize: 'var(--font-size-2xl)',
                        fontWeight: 'var(--font-weight-bold)',
                        color: 'var(--color-text-primary)',
                        marginBottom: '12px',
                    }}>
                        {t('auth.email_sent') || 'Email sent!'}
                    </h1>
                    <p style={{
                        color: 'var(--color-text-secondary)',
                        marginBottom: '32px',
                        lineHeight: 'var(--line-height-lg)',
                    }}>
                        {t('auth.reset_link_sent') || 'A password reset link has been sent to'}{' '}
                        <strong style={{ color: 'var(--color-text-primary)' }}>{email}</strong>
                    </p>
                    <div className="space-y-3">
                        <Link to="/login" className="btn btn-primary btn-lg w-full" style={{ textDecoration: 'none' }}>
                            {t('auth.back_to_login') || 'Back to Sign in'}
                        </Link>
                        <button
                            onClick={() => { setIsSubmitted(false); setEmail(''); }}
                            className="btn btn-ghost btn-lg w-full"
                        >
                            {t('auth.try_another') || 'Try another email'}
                        </button>
                    </div>
                </div>
            </div>
        );
    }

    return (
        <div
            className="page-enter flex items-center justify-center"
            style={{ minHeight: 'calc(100vh - 64px)', padding: '32px 16px' }}
        >
            <div style={{ width: '100%', maxWidth: '400px' }}>
                {/* Header */}
                <div className="text-center" style={{ marginBottom: '32px' }}>
                    <div
                        className="flex items-center justify-center mx-auto"
                        style={{
                            width: '48px',
                            height: '48px',
                            borderRadius: 'var(--radius-xl)',
                            background: 'linear-gradient(135deg, var(--color-accent-blue), var(--color-accent-purple))',
                            marginBottom: '20px',
                        }}
                    >
                        <Gamepad2 className="w-6 h-6" style={{ color: '#ffffff' }} />
                    </div>
                    <h1 style={{
                        fontSize: 'var(--font-size-2xl)',
                        fontWeight: 'var(--font-weight-bold)',
                        color: 'var(--color-text-primary)',
                        marginBottom: '8px',
                    }}>
                        {t('auth.reset_title') || 'Reset your password'}
                    </h1>
                    <p style={{ color: 'var(--color-text-secondary)', fontSize: 'var(--font-size-base)' }}>
                        {t('auth.reset_subtitle') || "Enter your email and we'll send you a reset link"}
                    </p>
                </div>

                {/* Form Card */}
                <div
                    style={{
                        backgroundColor: 'var(--color-bg-secondary)',
                        border: '1px solid var(--color-border-default)',
                        borderRadius: 'var(--radius-lg)',
                        padding: '24px',
                    }}
                >
                    {error && (
                        <div
                            className="flex items-center gap-2"
                            style={{
                                padding: '12px',
                                borderRadius: 'var(--radius-md)',
                                backgroundColor: 'var(--color-error-bg)',
                                color: 'var(--color-error)',
                                fontSize: 'var(--font-size-sm)',
                                marginBottom: '16px',
                            }}
                        >
                            <AlertCircle className="w-4 h-4 flex-shrink-0" />
                            <span>{error}</span>
                        </div>
                    )}

                    <form onSubmit={handleSubmit}>
                        <div style={{ marginBottom: '16px' }}>
                            <label className="input-label">{t('auth.email') || 'Email'}</label>
                            <div className="relative">
                                <Mail className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4" style={{ color: 'var(--color-text-muted)' }} />
                                <input
                                    type="email"
                                    value={email}
                                    onChange={(e) => setEmail(e.target.value)}
                                    placeholder="you@example.com"
                                    className="input input-md"
                                    style={{ paddingLeft: '36px' }}
                                    required
                                    autoComplete="email"
                                />
                            </div>
                        </div>

                        <button
                            type="submit"
                            disabled={isLoading}
                            className="btn btn-primary btn-lg w-full"
                        >
                            {isLoading && <span className="spinner" />}
                            {t('auth.send_link') || 'Send reset link'}
                        </button>
                    </form>

                    {/* Back to login */}
                    <Link
                        to="/login"
                        className="flex items-center justify-center gap-2 text-sm"
                        style={{
                            marginTop: '20px',
                            color: 'var(--color-text-secondary)',
                            textDecoration: 'none',
                        }}
                    >
                        <ArrowLeft className="w-4 h-4" />
                        {t('auth.back_to_login') || 'Back to Sign in'}
                    </Link>
                </div>
            </div>
        </div>
    );
};

export default ForgotPasswordPage;
