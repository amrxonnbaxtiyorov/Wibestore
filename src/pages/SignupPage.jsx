import { useState } from 'react';
import { Link, useNavigate } from 'react-router-dom';
import { User, Mail, Lock, Eye, EyeOff, Gamepad2, Phone, AlertCircle, CheckCircle } from 'lucide-react';
import { useAuth } from '../context/AuthContext';
import { useGoogleAuthEnabled } from '../context/GoogleAuthContext';
import GoogleLoginButton from '../components/GoogleLoginButton';
import { useLanguage } from '../context/LanguageContext';
import { useToast } from '../components/ToastProvider';

const TELEGRAM_BOT_USERNAME = import.meta.env.VITE_TELEGRAM_BOT_USERNAME || 'wibestorebot';
const TELEGRAM_BOT_URL = `https://t.me/${TELEGRAM_BOT_USERNAME}`;

const SignupPage = () => {
    const navigate = useNavigate();
    const { register, registerWithTelegram } = useAuth();
    const googleEnabled = useGoogleAuthEnabled();
    const { t } = useLanguage();
    const { addToast } = useToast();
    const [showPassword, setShowPassword] = useState(false);
    const [error, setError] = useState('');
    const [isLoading, setIsLoading] = useState(false);
    const [formData, setFormData] = useState({
        name: '',
        email: '',
        phone: '',
        password: '',
        confirmPassword: '',
        agreeTerms: false
    });
    const [telegramPhone, setTelegramPhone] = useState('');
    const [telegramCode, setTelegramCode] = useState('');
    const [telegramLoading, setTelegramLoading] = useState(false);

    const handleSubmit = async (e) => {
        e.preventDefault();
        setError('');

        if (formData.password !== formData.confirmPassword) {
            setError(t('signup.password_mismatch') || 'Passwords do not match');
            return;
        }

        if (formData.password.length < 8) {
            setError(t('signup.password_short') || 'Password must be at least 8 characters');
            return;
        }

        if (!formData.agreeTerms) {
            setError(t('signup.agree_terms') || 'You must agree to the terms');
            return;
        }

        setIsLoading(true);
        try {
            await register({
                name: formData.name,
                email: formData.email,
                phone: formData.phone,
                password: formData.password
            });
            addToast({
                type: 'success',
                title: t('auth.success_title'),
                message: t('auth.signup_success'),
            });
            navigate('/');
        } catch (err) {
            const errorMessage = err?.message || t('auth.signup_error');
            setError(errorMessage);
            addToast({
                type: 'error',
                title: t('auth.error_title'),
                message: errorMessage,
            });
        } finally {
            setIsLoading(false);
        }
    };

    const handleChange = (field, value) => {
        setFormData(prev => ({ ...prev, [field]: value }));
    };

    const handleTelegramSignup = async (e) => {
        e.preventDefault();
        setError('');
        const rawPhone = telegramPhone.trim();
        const digitsOnly = rawPhone.replace(/\D/g, '');
        const code = telegramCode.trim().replace(/\D/g, '').slice(0, 6);
        if (!digitsOnly || digitsOnly.length < 9) {
            setError(t('signup.telegram_phone_required') || 'Telefon raqamni kiriting');
            return;
        }
        if (code.length !== 6) {
            setError(t('signup.telegram_code_required') || 'Botdan olgan 6 xonali kodni kiriting');
            return;
        }
        const phoneToSend = rawPhone.startsWith('+') ? rawPhone
            : (digitsOnly.startsWith('998') && digitsOnly.length === 12) ? `+${digitsOnly}`
            : (digitsOnly.length === 9 && digitsOnly[0] === '9') ? `+998${digitsOnly}` : `+${digitsOnly}`;
        setTelegramLoading(true);
        try {
            await registerWithTelegram(phoneToSend, code);
            addToast({
                type: 'success',
                title: t('auth.success_title'),
                message: t('signup.telegram_success') || "Telegram orqali ro'yxatdan o'tdingiz!",
            });
            navigate('/');
        } catch (err) {
            const msg = err?.message || t('auth.signup_error');
            setError(msg);
            addToast({ type: 'error', title: t('auth.error_title'), message: msg });
        } finally {
            setTelegramLoading(false);
        }
    };

    return (
        <div
            className="page-enter flex items-center justify-center"
            style={{ minHeight: 'calc(100vh - 64px)', padding: '32px 16px' }}
        >
            <div style={{ width: '100%', maxWidth: '440px' }}>
                {/* Header */}
                <div style={{ marginBottom: '24px' }}>
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
                        {t('signup.title') || 'Create your account'}
                    </h1>
                    <p className="text-center" style={{ color: 'var(--color-text-secondary)', fontSize: 'var(--font-size-base)' }}>
                        {t('signup.subtitle') || 'Join WibeStore marketplace'}
                    </p>
                </div>

                {/* Features Badge */}
                <div
                    style={{
                        padding: '12px 16px',
                        borderRadius: 'var(--radius-lg)',
                        backgroundColor: 'var(--color-info-bg)',
                        border: '1px solid var(--color-border-muted)',
                        marginBottom: '20px',
                    }}
                >
                    <div className="flex items-center gap-2 text-sm" style={{ color: 'var(--color-text-secondary)', marginBottom: '6px' }}>
                        <CheckCircle className="w-4 h-4" style={{ color: 'var(--color-accent-green)' }} />
                        <span>{t('signup.feature1') || 'Free account'} <span style={{ color: 'var(--color-text-accent)', fontWeight: 500 }}>{t('signup.feature1_and') || '& instant access'}</span></span>
                    </div>
                    <div className="flex items-center gap-2 text-sm" style={{ color: 'var(--color-text-secondary)' }}>
                        <CheckCircle className="w-4 h-4" style={{ color: 'var(--color-accent-green)' }} />
                        <span>{t('signup.feature2') || 'Secure transactions'}</span>
                    </div>
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
                        {/* Name */}
                        <div style={{ marginBottom: '16px' }}>
                            <label className="input-label">{t('signup.name') || 'Full Name'}</label>
                            <div className="relative">
                                <User className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4" style={{ color: 'var(--color-text-muted)' }} />
                                <input
                                    type="text"
                                    value={formData.name}
                                    onChange={(e) => handleChange('name', e.target.value)}
                                    placeholder={t('signup.name_placeholder') || 'Enter your name'}
                                    className="input input-md"
                                    style={{ paddingLeft: '36px' }}
                                    required
                                    autoComplete="name"
                                />
                            </div>
                        </div>

                        {/* Email */}
                        <div style={{ marginBottom: '16px' }}>
                            <label className="input-label">{t('signup.email') || 'Email'}</label>
                            <div className="relative">
                                <Mail className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4" style={{ color: 'var(--color-text-muted)' }} />
                                <input
                                    type="email"
                                    value={formData.email}
                                    onChange={(e) => handleChange('email', e.target.value)}
                                    placeholder={t('signup.email_placeholder') || 'you@example.com'}
                                    className="input input-md"
                                    style={{ paddingLeft: '36px' }}
                                    required
                                    autoComplete="email"
                                />
                            </div>
                        </div>

                        {/* Phone */}
                        <div style={{ marginBottom: '16px' }}>
                            <label className="input-label">{t('signup.phone') || 'Phone'}</label>
                            <div className="relative">
                                <Phone className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4" style={{ color: 'var(--color-text-muted)' }} />
                                <input
                                    type="tel"
                                    value={formData.phone}
                                    onChange={(e) => handleChange('phone', e.target.value)}
                                    placeholder={t('signup.phone_placeholder') || '+998 90 123 45 67'}
                                    className="input input-md"
                                    style={{ paddingLeft: '36px' }}
                                    required
                                    autoComplete="tel"
                                />
                            </div>
                        </div>

                        {/* Password */}
                        <div style={{ marginBottom: '16px' }}>
                            <label className="input-label">{t('signup.password') || 'Password'}</label>
                            <div className="relative">
                                <Lock className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4" style={{ color: 'var(--color-text-muted)' }} />
                                <input
                                    type={showPassword ? 'text' : 'password'}
                                    value={formData.password}
                                    onChange={(e) => handleChange('password', e.target.value)}
                                    placeholder={t('signup.password_placeholder') || '••••••••'}
                                    className="input input-md"
                                    style={{ paddingLeft: '36px', paddingRight: '40px' }}
                                    required
                                    autoComplete="new-password"
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

                        {/* Confirm Password */}
                        <div style={{ marginBottom: '16px' }}>
                            <label className="input-label">{t('signup.confirm_password') || 'Confirm Password'}</label>
                            <div className="relative">
                                <Lock className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4" style={{ color: 'var(--color-text-muted)' }} />
                                <input
                                    type={showPassword ? 'text' : 'password'}
                                    value={formData.confirmPassword}
                                    onChange={(e) => handleChange('confirmPassword', e.target.value)}
                                    placeholder={t('signup.confirm_placeholder') || 'Repeat password'}
                                    className="input input-md"
                                    style={{ paddingLeft: '36px' }}
                                    required
                                    autoComplete="new-password"
                                />
                            </div>
                        </div>

                        {/* Terms */}
                        <label className="flex items-start gap-2 cursor-pointer" style={{ marginBottom: '20px' }}>
                            <input
                                type="checkbox"
                                checked={formData.agreeTerms}
                                onChange={(e) => handleChange('agreeTerms', e.target.checked)}
                                style={{ marginTop: '2px', accentColor: 'var(--color-accent-blue)' }}
                            />
                            <span style={{ fontSize: 'var(--font-size-sm)', color: 'var(--color-text-secondary)' }}>
                                <Link to="/terms" style={{ color: 'var(--color-text-accent)' }}>{t('signup.terms') || 'Terms'}</Link>{' '}
                                {t('signup.agree') || 'and Privacy Policy'}
                            </span>
                        </label>

                        {/* Submit */}
                        <button
                            type="submit"
                            disabled={isLoading}
                            className="btn btn-primary btn-lg w-full"
                        >
                            {isLoading && <span className="spinner" />}
                            {t('signup.submit') || 'Create Account'}
                        </button>
                    </form>

                    {/* Divider — Google orqali ro'yxatdan o'tish */}
                    {googleEnabled && (
                        <>
                            <div className="flex items-center gap-3" style={{ margin: '20px 0' }}>
                                <div className="divider flex-1" />
                                <span style={{ fontSize: 'var(--font-size-sm)', color: 'var(--color-text-muted)' }}>
                                    {t('auth.or') || 'Yoki'}
                                </span>
                                <div className="divider flex-1" />
                            </div>
                            <div style={{ marginBottom: '0' }}>
                                <GoogleLoginButton
                                    className="btn btn-secondary btn-lg w-full"
                                    style={{ gap: '8px' }}
                                    onSuccess={() => {
                                        addToast({
                                            type: 'success',
                                            title: t('auth.success_title'),
                                            message: t('auth.google_signup_success'),
                                        });
                                        navigate('/');
                                    }}
                                    onError={(msg) => {
                                        setError(msg || t('auth.google_error') || "Google orqali ro'yxatdan o'tishda xatolik");
                                        addToast({ type: 'error', title: t('auth.error_title'), message: msg });
                                    }}
                                >
                                    <svg width="18" height="18" viewBox="0 0 24 24"><path d="M22.56 12.25c0-.78-.07-1.53-.2-2.25H12v4.26h5.92a5.06 5.06 0 0 1-2.2 3.32v2.77h3.57c2.08-1.92 3.28-4.74 3.28-8.1z" fill="#4285F4" /><path d="M12 23c2.97 0 5.46-.98 7.28-2.66l-3.57-2.77c-.98.66-2.23 1.06-3.71 1.06-2.86 0-5.29-1.93-6.16-4.53H2.18v2.84C3.99 20.53 7.7 23 12 23z" fill="#34A853" /><path d="M5.84 14.09c-.22-.66-.35-1.36-.35-2.09s.13-1.43.35-2.09V7.07H2.18C1.43 8.55 1 10.22 1 12s.43 3.45 1.18 4.93l2.85-2.22.81-.62z" fill="#FBBC05" /><path d="M12 5.38c1.62 0 3.06.56 4.21 1.64l3.15-3.15C17.45 2.09 14.97 1 12 1 7.7 1 3.99 3.47 2.18 7.07l3.66 2.84c.87-2.6 3.3-4.53 6.16-4.53z" fill="#EA4335" /></svg>
                                    {t('signup.google') || "Google bilan ro'yxatdan o'tish"}
                                </GoogleLoginButton>
                            </div>
                        </>
                    )}

                    {/* Telegram orqali ro'yxatdan o'tish — chiroyli kartochka */}
                    <div className="flex items-center gap-3" style={{ margin: '20px 0' }}>
                        <div className="divider flex-1" />
                        <span style={{ fontSize: 'var(--font-size-sm)', color: 'var(--color-text-muted)' }}>
                            {t('auth.or') || 'Yoki'}
                        </span>
                        <div className="divider flex-1" />
                    </div>
                    <div
                        style={{
                            padding: '20px',
                            borderRadius: 'var(--radius-lg)',
                            border: '1px solid rgba(42, 171, 238, 0.35)',
                            background: 'linear-gradient(135deg, rgba(42, 171, 238, 0.06) 0%, rgba(42, 171, 238, 0.02) 100%)',
                            marginBottom: '16px',
                        }}
                    >
                        <div style={{ display: 'flex', alignItems: 'center', gap: '10px', marginBottom: '14px' }}>
                            <div style={{
                                width: '40px', height: '40px', borderRadius: 'var(--radius-lg)',
                                background: 'linear-gradient(135deg, #2AABEE 0%, #229ED9 100%)',
                                display: 'flex', alignItems: 'center', justifyContent: 'center',
                                boxShadow: '0 4px 12px rgba(42, 171, 238, 0.35)',
                            }}>
                                <svg width="22" height="22" viewBox="0 0 24 24" fill="none">
                                    <path d="M12 0C5.373 0 0 5.373 0 12s5.373 12 12 12 12-5.373 12-12S18.627 0 12 0z" fill="#fff" />
                                    <path d="M5.432 11.873l8.772-3.63c.65-.233 2.82-.935 2.82-.935s1.005-.39.922.558c-.027.39-.243 1.766-.458 3.256l-.676 4.403s-.057.65-.536.758c-.479.108-1.267-.39-1.404-.498-.108-.081-2.024-1.296-2.72-1.892-.19-.163-.406-.49.027-.87l2.845-2.72c.325-.307.65-1.024-.703-.152l-3.804 2.575s-.46.284-1.318.027c-.858-.257-1.857-.603-1.857-.603s-.693-.433.487-.893z" fill="#2AABEE" />
                                </svg>
                            </div>
                            <div>
                                <p style={{ fontSize: 'var(--font-size-base)', fontWeight: 'var(--font-weight-semibold)', color: 'var(--color-text-primary)', margin: 0 }}>
                                    {t('signup.telegram_title') || "Telegram orqali ro'yxatdan o'tish"}
                                </p>
                                <p style={{ fontSize: 'var(--font-size-sm)', color: 'var(--color-text-muted)', margin: '2px 0 0 0' }}>
                                    {t('signup.telegram_hint') || "Botdan kod oling, keyin telefon va kodni kiriting."}
                                </p>
                            </div>
                        </div>
                        <a
                            href={TELEGRAM_BOT_URL}
                            target="_blank"
                            rel="noopener noreferrer"
                            className="btn btn-md w-full"
                            style={{
                                gap: '8px', marginBottom: '16px',
                                display: 'inline-flex', alignItems: 'center', justifyContent: 'center', textDecoration: 'none',
                                background: 'linear-gradient(135deg, #2AABEE 0%, #229ED9 100%)', color: '#fff', border: 'none',
                                borderRadius: 'var(--radius-md)', padding: '10px 16px', fontWeight: 600, fontSize: 'var(--font-size-sm)',
                                boxShadow: '0 4px 12px rgba(42, 171, 238, 0.3)',
                            }}
                        >
                            <svg width="18" height="18" viewBox="0 0 24 24" fill="none">
                                <path d="M12 0C5.373 0 0 5.373 0 12s5.373 12 12 12 12-5.373 12-12S18.627 0 12 0z" fill="#fff" />
                                <path d="M5.432 11.873l8.772-3.63c.65-.233 2.82-.935 2.82-.935s1.005-.39.922.558c-.027.39-.243 1.766-.458 3.256l-.676 4.403s-.057.65-.536.758c-.479.108-1.267-.39-1.404-.498-.108-.081-2.024-1.296-2.72-1.892-.19-.163-.406-.49.027-.87l2.845-2.72c.325-.307.65-1.024-.703-.152l-3.804 2.575s-.46.284-1.318.027c-.858-.257-1.857-.603-1.857-.603s-.693-.433.487-.893z" fill="#2AABEE" />
                            </svg>
                            @wibestorebot — Kod olish
                        </a>
                        <form onSubmit={handleTelegramSignup}>
                            <div style={{ marginBottom: '12px' }}>
                                <label className="input-label" style={{ fontSize: 'var(--font-size-sm)' }}>{t('signup.phone') || 'Telefon'}</label>
                                <input
                                    type="tel"
                                    value={telegramPhone}
                                    onChange={(e) => setTelegramPhone(e.target.value)}
                                    placeholder="+998 90 123 45 67"
                                    className="input input-md"
                                    style={{ paddingLeft: '12px' }}
                                />
                            </div>
                            <div style={{ marginBottom: '14px' }}>
                                <label className="input-label" style={{ fontSize: 'var(--font-size-sm)' }}>{t('signup.telegram_code') || '6 xonali kod'}</label>
                                <input
                                    type="text"
                                    inputMode="numeric"
                                    maxLength={6}
                                    value={telegramCode}
                                    onChange={(e) => setTelegramCode(e.target.value.replace(/\D/g, ''))}
                                    placeholder="123456"
                                    className="input input-md"
                                    style={{ paddingLeft: '12px', letterSpacing: '4px', fontVariantNumeric: 'tabular-nums' }}
                                />
                            </div>
                            <button
                                type="submit"
                                disabled={telegramLoading}
                                className="btn btn-md w-full"
                                style={{
                                    background: 'linear-gradient(135deg, #2AABEE 0%, #229ED9 100%)', color: '#fff', border: 'none',
                                    borderRadius: 'var(--radius-md)', padding: '10px 16px', fontWeight: 600,
                                    boxShadow: '0 4px 12px rgba(42, 171, 238, 0.3)',
                                }}
                            >
                                {telegramLoading && <span className="spinner" style={{ marginRight: '8px' }} />}
                                {t('signup.telegram_submit') || "Telegram orqali ro'yxatdan o'tish"}
                            </button>
                        </form>
                    </div>
                </div>

                {/* Login Link */}
                <p
                    className="text-center"
                    style={{
                        marginTop: '24px',
                        fontSize: 'var(--font-size-sm)',
                        color: 'var(--color-text-secondary)',
                    }}
                >
                    {t('signup.has_account') || 'Already have an account?'}{' '}
                    <Link
                        to="/login"
                        style={{ color: 'var(--color-text-accent)', fontWeight: 'var(--font-weight-semibold)', textDecoration: 'none' }}
                    >
                        {t('signup.login_link') || 'Sign in'}
                    </Link>
                </p>
            </div>
        </div>
    );
};

export default SignupPage;
