import { useState } from 'react';
import { Link, useNavigate, useLocation, useSearchParams } from 'react-router-dom';
import { Mail, Lock, Eye, EyeOff, Gamepad2, AlertCircle } from 'lucide-react';
import { useAuth } from '../context/AuthContext';
import { useGoogleAuthEnabled } from '../context/GoogleAuthContext';
import GoogleLoginButton from '../components/GoogleLoginButton';
import { useLanguage } from '../context/LanguageContext';
import { useToast } from '../components/ToastProvider';

const LoginPage = () => {
    const { t } = useLanguage();
    const { login } = useAuth();
    const navigate = useNavigate();
    const location = useLocation();
    const [searchParams] = useSearchParams();
    const { addToast } = useToast();

    const [email, setEmail] = useState('');
    const [password, setPassword] = useState('');
    const [showPassword, setShowPassword] = useState(false);
    const [error, setError] = useState('');
    const [loading, setLoading] = useState(false);

    // Redirect: state (AuthGuard) yoki ?redirect= query (masalan /login?redirect=/account/123)
    const redirectRaw = location.state?.from?.pathname || searchParams.get('redirect') || '';
    const from = (redirectRaw && redirectRaw.startsWith('/') && !redirectRaw.startsWith('//')) ? redirectRaw : '/';

    const handleSubmit = async (e) => {
        e.preventDefault();
        setError('');
        setLoading(true);
        try {
            await login(email, password);
            addToast({
                type: 'success',
                title: 'Muvaffaqiyatli!',
                message: 'Xush kelibsiz!',
            });
            navigate(from, { replace: true });
        } catch (err) {
            const errorMessage = err?.message || t('auth.invalid_credentials') || 'Email yoki parol noto\'g\'ri';
            setError(errorMessage);
            addToast({
                type: 'error',
                title: 'Xatolik',
                message: errorMessage,
            });
        } finally {
            setLoading(false);
        }
    };

    const googleEnabled = useGoogleAuthEnabled();

    const handleTelegramClick = () => {
        window.open('https://t.me/wibestoreuz', '_blank');
    };

    return (
        <div
            className="page-enter flex items-center justify-center"
            style={{
                minHeight: 'calc(100vh - 64px)',
                padding: '32px 16px',
            }}
        >
            <div
                style={{
                    width: '100%',
                    maxWidth: '400px',
                }}
            >
                {/* Header */}
                <div style={{ marginBottom: '32px' }}>
                    <h1
                        className="flex items-center justify-center gap-3"
                        style={{
                            fontSize: 'var(--font-size-2xl)',
                            fontWeight: 'var(--font-weight-bold)',
                            color: 'var(--color-text-primary)',
                            marginBottom: '8px',
                        }}
                    >
                        <div
                            className="flex items-center justify-center flex-shrink-0"
                            style={{
                                width: '40px',
                                height: '40px',
                                borderRadius: 'var(--radius-xl)',
                                background: 'linear-gradient(135deg, var(--color-accent-blue), var(--color-accent-purple))',
                            }}
                        >
                            <Gamepad2 className="w-5 h-5" style={{ color: '#ffffff' }} />
                        </div>
                        {t('auth.login_title') || 'Sign in to WibeStore'}
                    </h1>
                    <p className="text-center" style={{ color: 'var(--color-text-secondary)', fontSize: 'var(--font-size-base)' }}>
                        {t('auth.login_subtitle') || 'Welcome back'}
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
                    {/* Error */}
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
                        {/* Email */}
                        <div style={{ marginBottom: '16px' }}>
                            <label className="input-label">{t('auth.email') || 'Email'}</label>
                            <div className="relative">
                                <Mail
                                    className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4"
                                    style={{ color: 'var(--color-text-muted)' }}
                                />
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

                        {/* Password */}
                        <div style={{ marginBottom: '16px' }}>
                            <div className="flex items-center justify-between" style={{ marginBottom: '4px' }}>
                                <label className="input-label" style={{ marginBottom: 0 }}>{t('auth.password') || 'Password'}</label>
                                <Link
                                    to="/forgot-password"
                                    className="text-sm"
                                    style={{ color: 'var(--color-text-accent)', textDecoration: 'none', fontSize: 'var(--font-size-sm)' }}
                                >
                                    {t('auth.forgot_password') || 'Forgot password?'}
                                </Link>
                            </div>
                            <div className="relative">
                                <Lock
                                    className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4"
                                    style={{ color: 'var(--color-text-muted)' }}
                                />
                                <input
                                    type={showPassword ? 'text' : 'password'}
                                    value={password}
                                    onChange={(e) => setPassword(e.target.value)}
                                    placeholder="••••••••"
                                    className="input input-md"
                                    style={{ paddingLeft: '36px', paddingRight: '40px' }}
                                    required
                                    autoComplete="current-password"
                                />
                                <button
                                    type="button"
                                    onClick={() => setShowPassword(!showPassword)}
                                    className="absolute right-3 top-1/2 -translate-y-1/2"
                                    style={{ color: 'var(--color-text-muted)', background: 'none', border: 'none', cursor: 'pointer' }}
                                >
                                    {showPassword ? <EyeOff className="w-4 h-4" /> : <Eye className="w-4 h-4" />}
                                </button>
                            </div>
                        </div>

                        {/* Submit */}
                        <button
                            type="submit"
                            className="btn btn-primary btn-lg w-full"
                            disabled={loading}
                        >
                            {loading && <span className="spinner" />}
                            {t('auth.login_btn') || 'Sign in'}
                        </button>
                    </form>

                    {/* Divider */}
                    <div className="flex items-center gap-3" style={{ margin: '20px 0' }}>
                        <div className="divider flex-1" />
                        <span style={{ fontSize: 'var(--font-size-sm)', color: 'var(--color-text-muted)' }}>
                            {t('auth.or') || 'Or continue with'}
                        </span>
                        <div className="divider flex-1" />
                    </div>

                    {/* Social Login */}
                    <div className="flex flex-col gap-3">
                        {googleEnabled && (
                            <GoogleLoginButton
                                className="btn btn-secondary btn-lg w-full"
                                style={{ gap: '8px' }}
                                onSuccess={() => {
                                    addToast({ type: 'success', title: 'Muvaffaqiyatli!', message: 'Google orqali kirish amalga oshirildi' });
                                    navigate(from, { replace: true });
                                }}
                                onError={(msg) => {
                                    setError(msg);
                                    addToast({ type: 'error', title: 'Xatolik', message: msg });
                                }}
                            >
                                <svg width="18" height="18" viewBox="0 0 24 24"><path d="M22.56 12.25c0-.78-.07-1.53-.2-2.25H12v4.26h5.92a5.06 5.06 0 0 1-2.2 3.32v2.77h3.57c2.08-1.92 3.28-4.74 3.28-8.1z" fill="#4285F4" /><path d="M12 23c2.97 0 5.46-.98 7.28-2.66l-3.57-2.77c-.98.66-2.23 1.06-3.71 1.06-2.86 0-5.29-1.93-6.16-4.53H2.18v2.84C3.99 20.53 7.7 23 12 23z" fill="#34A853" /><path d="M5.84 14.09c-.22-.66-.35-1.36-.35-2.09s.13-1.43.35-2.09V7.07H2.18C1.43 8.55 1 10.22 1 12s.43 3.45 1.18 4.93l2.85-2.22.81-.62z" fill="#FBBC05" /><path d="M12 5.38c1.62 0 3.06.56 4.21 1.64l3.15-3.15C17.45 2.09 14.97 1 12 1 7.7 1 3.99 3.47 2.18 7.07l3.66 2.84c.87-2.6 3.3-4.53 6.16-4.53z" fill="#EA4335" /></svg>
                                Google
                            </GoogleLoginButton>
                        )}
                        <button
                            onClick={handleTelegramClick}
                            className="btn btn-secondary btn-lg w-full"
                            style={{ gap: '8px' }}
                        >
                            <svg width="18" height="18" viewBox="0 0 24 24" fill="none"><path d="M12 0C5.373 0 0 5.373 0 12s5.373 12 12 12 12-5.373 12-12S18.627 0 12 0z" fill="#2AABEE" /><path d="M5.432 11.873l8.772-3.63c.65-.233 2.82-.935 2.82-.935s1.005-.39.922.558c-.027.39-.243 1.766-.458 3.256l-.676 4.403s-.057.65-.536.758c-.479.108-1.267-.39-1.404-.498-.108-.081-2.024-1.296-2.72-1.892-.19-.163-.406-.49.027-.87l2.845-2.72c.325-.307.65-1.024-.703-.152l-3.804 2.575s-.46.284-1.318.027c-.858-.257-1.857-.603-1.857-.603s-.693-.433.487-.893z" fill="#fff" /></svg>
                            Telegram
                        </button>
                    </div>
                </div>

                {/* Sign up link */}
                <p
                    className="text-center"
                    style={{
                        marginTop: '24px',
                        fontSize: 'var(--font-size-sm)',
                        color: 'var(--color-text-secondary)',
                    }}
                >
                    {t('auth.no_account') || "Don't have an account?"}{' '}
                    <Link
                        to="/signup"
                        style={{ color: 'var(--color-text-accent)', fontWeight: 'var(--font-weight-semibold)', textDecoration: 'none' }}
                    >
                        {t('auth.signup_link') || 'Sign up'}
                    </Link>
                </p>
            </div>
        </div>
    );
};

export default LoginPage;
