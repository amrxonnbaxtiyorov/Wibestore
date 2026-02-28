import { useState, useEffect, useRef, useCallback } from 'react';
import { useNavigate } from 'react-router-dom';
import { X, Mail, Lock, Eye, EyeOff, AlertCircle, LogIn } from 'lucide-react';
import { useAuth } from '../context/AuthContext';
import { sendLoginEmail } from '../lib/emailService';
import { useLanguage } from '../context/LanguageContext';

const LoginModal = ({ isOpen, onClose, onSuccess, message }) => {
    const { t } = useLanguage();
    const { login } = useAuth();
    const navigate = useNavigate();

    const [email, setEmail] = useState('');
    const [password, setPassword] = useState('');
    const [showPassword, setShowPassword] = useState(false);
    const [error, setError] = useState('');
    const [loading, setLoading] = useState(false);
    const [isClosing, setIsClosing] = useState(false);

    const modalRef = useRef(null);
    const emailInputRef = useRef(null);

    // Focus email input when modal opens
    useEffect(() => {
        if (isOpen) {
            setIsClosing(false);
            setError('');
            setEmail('');
            setPassword('');
            setShowPassword(false);
            setTimeout(() => {
                emailInputRef.current?.focus();
            }, 100);
            // Prevent body scroll
            document.body.style.overflow = 'hidden';
        }
        return () => {
            document.body.style.overflow = '';
        };
    }, [isOpen]);

    const handleCloseImmediate = useCallback(() => {
        document.body.style.overflow = '';
        onClose();
    }, [onClose]);

    const handleClose = useCallback(() => {
        setIsClosing(true);
        setTimeout(() => {
            setIsClosing(false);
            document.body.style.overflow = '';
            onClose();
        }, 250);
    }, [onClose]);

    // Close on Escape key
    useEffect(() => {
        const handleKeyDown = (e) => {
            if (e.key === 'Escape' && isOpen) {
                handleClose();
            }
        };
        document.addEventListener('keydown', handleKeyDown);
        return () => document.removeEventListener('keydown', handleKeyDown);
    }, [isOpen, handleClose]);

    // Close on overlay click
    const handleOverlayClick = (e) => {
        if (e.target === e.currentTarget) {
            handleClose();
        }
    };

    const handleSubmit = async (e) => {
        e.preventDefault();
        setError('');
        setLoading(true);
        try {
            await login(email, password);
            try { await sendLoginEmail(email); } catch { /* email send optional */ }
            handleCloseImmediate();
            if (onSuccess) {
                onSuccess();
            }
        } catch {
            setError(t('auth.invalid_credentials') || 'Email yoki parol noto\'g\'ri');
        } finally {
            setLoading(false);
        }
    };

    const handleTelegramClick = () => {
        const botUsername = import.meta.env.VITE_TELEGRAM_BOT_USERNAME || 'wibestorebot';
        const url = botUsername.startsWith('http') ? botUsername : `https://t.me/${botUsername}`;
        window.open(url, '_blank');
    };

    const handleGoToSignup = () => {
        handleCloseImmediate();
        navigate('/signup');
    };

    const handleGoToForgotPassword = () => {
        handleCloseImmediate();
        navigate('/forgot-password');
    };

    if (!isOpen && !isClosing) return null;

    return (
        <div
            className={`login-modal-overlay ${isClosing ? 'login-modal-closing' : 'login-modal-opening'}`}
            onClick={handleOverlayClick}
            role="dialog"
            aria-modal="true"
            aria-label={t('auth.login_title') || 'Tizimga kirish'}
        >
            <div
                ref={modalRef}
                className={`login-modal ${isClosing ? 'login-modal-content-closing' : 'login-modal-content-opening'}`}
                onClick={(e) => e.stopPropagation()}
            >
                {/* Close Button */}
                <button
                    onClick={handleClose}
                    className="login-modal-close"
                    aria-label="Close"
                >
                    <X className="w-5 h-5" />
                </button>

                {/* Header */}
                <div className="text-center" style={{ marginBottom: '24px' }}>
                    <h2
                        className="flex items-center justify-center gap-3"
                        style={{
                            fontSize: 'var(--font-size-xl)',
                            fontWeight: 'var(--font-weight-bold)',
                            color: 'var(--color-text-primary)',
                            marginBottom: '6px',
                        }}
                    >
                        <div
                            className="flex items-center justify-center flex-shrink-0"
                            style={{
                                width: '40px',
                                height: '40px',
                                borderRadius: 'var(--radius-lg)',
                                background: 'linear-gradient(135deg, var(--color-accent-blue), var(--color-accent-purple))',
                                boxShadow: '0 6px 20px rgba(9, 105, 218, 0.25)',
                            }}
                        >
                            <LogIn className="w-5 h-5" style={{ color: '#ffffff' }} />
                        </div>
                        {t('auth.login_title') || 'Tizimga kirish'}
                    </h2>
                    <p style={{ color: 'var(--color-text-secondary)', fontSize: 'var(--font-size-sm)' }}>
                        {message || t('auth.login_subtitle') || 'Davom etish uchun akkauntingizga kiring'}
                    </p>
                </div>

                {/* Error */}
                {error && (
                    <div
                        className="flex items-center gap-2 login-modal-animate-shake"
                        style={{
                            padding: '10px 12px',
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

                {/* Form */}
                <form onSubmit={handleSubmit}>
                    {/* Email */}
                    <div style={{ marginBottom: '14px' }}>
                        <label className="input-label">{t('auth.email') || 'Email'}</label>
                        <div className="relative">
                            <Mail
                                className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4"
                                style={{ color: 'var(--color-text-muted)' }}
                            />
                            <input
                                ref={emailInputRef}
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
                    <div style={{ marginBottom: '14px' }}>
                        <div className="flex items-center justify-between" style={{ marginBottom: '4px' }}>
                            <label className="input-label" style={{ marginBottom: 0 }}>
                                {t('auth.password') || 'Parol'}
                            </label>
                            <button
                                type="button"
                                onClick={handleGoToForgotPassword}
                                style={{
                                    color: 'var(--color-text-accent)',
                                    fontSize: 'var(--font-size-xs)',
                                    background: 'none',
                                    border: 'none',
                                    cursor: 'pointer',
                                    padding: 0,
                                }}
                            >
                                {t('auth.forgot_password') || 'Parolni unutdingizmi?'}
                            </button>
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
                                style={{
                                    color: 'var(--color-text-muted)',
                                    background: 'none',
                                    border: 'none',
                                    cursor: 'pointer',
                                }}
                            >
                                {showPassword ? (
                                    <EyeOff className="w-4 h-4" />
                                ) : (
                                    <Eye className="w-4 h-4" />
                                )}
                            </button>
                        </div>
                    </div>

                    {/* Submit */}
                    <button
                        type="submit"
                        className="btn btn-primary btn-lg w-full"
                        disabled={loading}
                        style={{ marginTop: '4px' }}
                    >
                        {loading && <span className="spinner" />}
                        {t('auth.login_btn') || 'Kirish'}
                    </button>
                </form>

                {/* Divider */}
                <div className="flex items-center gap-3" style={{ margin: '18px 0' }}>
                    <div className="divider flex-1" />
                    <span style={{ fontSize: 'var(--font-size-xs)', color: 'var(--color-text-muted)' }}>
                        {t('auth.or') || 'Yoki'}
                    </span>
                    <div className="divider flex-1" />
                </div>

                {/* Social Login */}
                <div className="flex flex-col gap-2">
                    <button
                        onClick={handleTelegramClick}
                        type="button"
                        className="btn btn-md w-full"
                        style={{
                            gap: '8px',
                            background: 'linear-gradient(135deg, #2AABEE 0%, #229ED9 100%)',
                            color: '#fff',
                            border: 'none',
                            borderRadius: 'var(--radius-md)',
                            padding: '10px 16px',
                            fontWeight: 600,
                            boxShadow: '0 4px 12px rgba(42, 171, 238, 0.3)',
                            cursor: 'pointer',
                        }}
                    >
                        <svg width="18" height="18" viewBox="0 0 24 24" fill="none">
                            <path d="M12 0C5.373 0 0 5.373 0 12s5.373 12 12 12 12-5.373 12-12S18.627 0 12 0z" fill="#fff" />
                            <path d="M5.432 11.873l8.772-3.63c.65-.233 2.82-.935 2.82-.935s1.005-.39.922.558c-.027.39-.243 1.766-.458 3.256l-.676 4.403s-.057.65-.536.758c-.479.108-1.267-.39-1.404-.498-.108-.081-2.024-1.296-2.72-1.892-.19-.163-.406-.49.027-.87l2.845-2.72c.325-.307.65-1.024-.703-.152l-3.804 2.575s-.46.284-1.318.027c-.858-.257-1.857-.603-1.857-.603s-.693-.433.487-.893z" fill="#2AABEE" />
                        </svg>
                        {t('auth.telegram_btn') || 'Telegram orqali kirish'}
                    </button>
                </div>

                {/* Sign up link */}
                <p
                    className="text-center"
                    style={{
                        marginTop: '18px',
                        fontSize: 'var(--font-size-sm)',
                        color: 'var(--color-text-secondary)',
                    }}
                >
                    {t('auth.no_account') || "Akkauntingiz yo'qmi?"}{' '}
                    <button
                        onClick={handleGoToSignup}
                        style={{
                            color: 'var(--color-text-accent)',
                            fontWeight: 'var(--font-weight-semibold)',
                            background: 'none',
                            border: 'none',
                            cursor: 'pointer',
                            padding: 0,
                            fontSize: 'inherit',
                        }}
                    >
                        {t('auth.signup_link') || "Ro'yxatdan o'tish"}
                    </button>
                </p>
            </div>
        </div>
    );
};

export default LoginModal;
