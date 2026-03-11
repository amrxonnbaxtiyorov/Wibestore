import { useState, useEffect, useRef, useCallback } from 'react';
import { useNavigate } from 'react-router-dom';
import { X, AlertCircle, LogIn } from 'lucide-react';
import { useAuth } from '../context/AuthContext';
import { useLanguage } from '../context/LanguageContext';
import { formatUzPhoneDisplay, normalizeUzPhoneForSubmit } from '../lib/phoneFormat';

const TELEGRAM_BOT_USERNAME = import.meta.env.VITE_TELEGRAM_BOT_USERNAME || 'wibestorebot';
const TELEGRAM_BOT_URL = `https://t.me/${TELEGRAM_BOT_USERNAME}`;

const LoginModal = ({ isOpen, onClose, onSuccess, message }) => {
    const { t } = useLanguage();
    const { loginWithTelegram } = useAuth();
    const navigate = useNavigate();

    const [telegramPhone, setTelegramPhone] = useState('');
    const [telegramCode, setTelegramCode] = useState('');
    const [telegramStep, setTelegramStep] = useState(1);
    const [error, setError] = useState('');
    const [loading, setLoading] = useState(false);
    const [isClosing, setIsClosing] = useState(false);

    const modalRef = useRef(null);
    const phoneInputRef = useRef(null);

    useEffect(() => {
        if (isOpen) {
            setIsClosing(false);
            setError('');
            setTelegramPhone('');
            setTelegramCode('');
            setTelegramStep(1);
            setTimeout(() => {
                phoneInputRef.current?.focus();
            }, 100);
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

    useEffect(() => {
        const handleKeyDown = (e) => {
            if (e.key === 'Escape' && isOpen) {
                handleClose();
            }
        };
        document.addEventListener('keydown', handleKeyDown);
        return () => document.removeEventListener('keydown', handleKeyDown);
    }, [isOpen, handleClose]);

    const handleOverlayClick = (e) => {
        if (e.target === e.currentTarget) {
            handleClose();
        }
    };

    const handleTelegramLogin = async (e) => {
        e.preventDefault();
        setError('');
        const phoneToSend = normalizeUzPhoneForSubmit(telegramPhone);
        const digitsOnly = phoneToSend.replace(/\D/g, '');
        const code = telegramCode.trim().replace(/\D/g, '').slice(0, 6);
        if (!digitsOnly || digitsOnly.length < 12) {
            setError(t('signup.telegram_phone_required') || 'Telefon raqamni kiriting');
            return;
        }
        if (code.length !== 6) {
            setError(t('signup.telegram_code_required') || 'Botdan olgan 6 xonali kodni kiriting');
            return;
        }
        setLoading(true);
        try {
            await loginWithTelegram(phoneToSend, code);
            handleCloseImmediate();
            if (onSuccess) onSuccess();
        } catch (err) {
            setError(err?.message || t('auth.invalid_credentials') || 'Kod noto\'g\'ri');
        } finally {
            setLoading(false);
        }
    };

    const handleGoToSignup = () => {
        handleCloseImmediate();
        navigate('/signup');
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
                <button
                    onClick={handleClose}
                    className="login-modal-close"
                    aria-label="Close"
                >
                    <X className="w-5 h-5" />
                </button>

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
                        {message || t('auth.login_subtitle') || 'Telegram orqali kiring'}
                    </p>
                </div>

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

                <div
                    style={{
                        padding: '16px',
                        borderRadius: 'var(--radius-lg)',
                        border: '1px solid rgba(42, 171, 238, 0.35)',
                        background: 'linear-gradient(135deg, rgba(42, 171, 238, 0.06) 0%, rgba(42, 171, 238, 0.02) 100%)',
                        marginBottom: '16px',
                    }}
                >
                    <form onSubmit={handleTelegramLogin}>
                        <div style={{ marginBottom: '12px' }}>
                            <label className="input-label" style={{ fontSize: 'var(--font-size-sm)' }}>{t('signup.phone') || 'Telefon raqam'}</label>
                            <input
                                ref={phoneInputRef}
                                type="tel"
                                inputMode="numeric"
                                autoComplete="tel"
                                value={telegramPhone}
                                onChange={(e) => setTelegramPhone(formatUzPhoneDisplay(e.target.value))}
                                placeholder="+998 99-999-99-99"
                                className="input input-md"
                                style={{ paddingLeft: '12px' }}
                            />
                        </div>
                        <a
                            href={TELEGRAM_BOT_URL}
                            target="_blank"
                            rel="noopener noreferrer"
                            onClick={() => setTelegramStep(2)}
                            className="btn btn-md w-full"
                            style={{
                                gap: '8px', marginBottom: '12px',
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
                            {t('signup.telegram_get_code') || 'Kod olish'}
                        </a>
                        {telegramStep >= 2 && (
                            <>
                                <div style={{ marginBottom: '12px' }}>
                                    <label className="input-label" style={{ fontSize: 'var(--font-size-sm)' }}>{t('signup.telegram_code') || 'Kod'}</label>
                                    <input
                                        type="text"
                                        inputMode="numeric"
                                        maxLength={10}
                                        value={telegramCode}
                                        onChange={(e) => setTelegramCode(e.target.value.replace(/\D/g, ''))}
                                        placeholder="123456"
                                        className="input input-md"
                                        style={{ paddingLeft: '12px', letterSpacing: '4px', fontVariantNumeric: 'tabular-nums' }}
                                        autoFocus
                                    />
                                </div>
                                <button
                                    type="submit"
                                    disabled={loading}
                                    className="btn btn-md w-full"
                                    style={{
                                        background: 'linear-gradient(135deg, #2AABEE 0%, #229ED9 100%)', color: '#fff', border: 'none',
                                        borderRadius: 'var(--radius-md)', padding: '10px 16px', fontWeight: 600,
                                        boxShadow: '0 4px 12px rgba(42, 171, 238, 0.3)',
                                    }}
                                >
                                    {loading && <span className="spinner" style={{ marginRight: '8px' }} />}
                                    {t('auth.login_btn') || 'Kirish'}
                                </button>
                            </>
                        )}
                    </form>
                </div>

                <p
                    className="text-center"
                    style={{
                        marginTop: '12px',
                        fontSize: 'var(--font-size-sm)',
                        color: 'var(--color-text-secondary)',
                    }}
                >
                    {t('auth.no_account') || "Akkauntingiz yo'qmi?"}{' '}
                    <button
                        onClick={handleGoToSignup}
                        type="button"
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
