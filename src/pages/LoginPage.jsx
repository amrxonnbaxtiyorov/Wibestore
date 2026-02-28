import { useState } from 'react';
import { Link, useNavigate, useLocation, useSearchParams } from 'react-router-dom';
import { Gamepad2, AlertCircle } from 'lucide-react';
import { useAuth } from '../context/AuthContext';
import { useLanguage } from '../context/LanguageContext';
import { useToast } from '../components/ToastProvider';

const TELEGRAM_BOT_USERNAME = import.meta.env.VITE_TELEGRAM_BOT_USERNAME || 'wibestorebot';
const TELEGRAM_BOT_URL = `https://t.me/${TELEGRAM_BOT_USERNAME}`;

// Kirish faqat Telegram orqali: telefon + botdan kod. Email/parol ishlatilmaydi.
const LoginPage = () => {
    const { t } = useLanguage();
    const { loginWithTelegram } = useAuth();
    const navigate = useNavigate();
    const location = useLocation();
    const [searchParams] = useSearchParams();
    const { addToast } = useToast();

    const [telegramPhone, setTelegramPhone] = useState('');
    const [telegramCode, setTelegramCode] = useState('');
    const [telegramStep, setTelegramStep] = useState(1);
    const [error, setError] = useState('');
    const [loading, setLoading] = useState(false);

    const redirectRaw = location.state?.from?.pathname || searchParams.get('redirect') || '';
    const from = (redirectRaw && redirectRaw.startsWith('/') && !redirectRaw.startsWith('//')) ? redirectRaw : '/';

    const handleTelegramLogin = async (e) => {
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
        setLoading(true);
        try {
            await loginWithTelegram(phoneToSend, code);
            addToast({
                type: 'success',
                title: t('auth.success_title'),
                message: t('auth.welcome'),
            });
            navigate(from, { replace: true });
        } catch (err) {
            const msg = err?.message || t('auth.invalid_credentials');
            setError(msg);
            addToast({ type: 'error', title: t('auth.error_title'), message: msg });
        } finally {
            setLoading(false);
        }
    };

    return (
        <div
            className="page-enter flex items-center justify-center"
            style={{
                minHeight: 'calc(100vh - 64px)',
                padding: '32px 16px',
            }}
        >
            <div style={{ width: '100%', maxWidth: '440px' }}>
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
                        {t('auth.login_title') || 'Tizimga kirish'}
                    </h1>
                    <p className="text-center" style={{ color: 'var(--color-text-secondary)', fontSize: 'var(--font-size-base)' }}>
                        {t('auth.login_subtitle') || 'Telegram orqali kiring'}
                    </p>
                </div>

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

                    <div
                        style={{
                            padding: '20px',
                            borderRadius: 'var(--radius-lg)',
                            border: '1px solid rgba(42, 171, 238, 0.35)',
                            background: 'linear-gradient(135deg, rgba(42, 171, 238, 0.06) 0%, rgba(42, 171, 238, 0.02) 100%)',
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
                                    {t('auth.telegram_login_title') || 'Telegram orqali kirish'}
                                </p>
                                <p style={{ fontSize: 'var(--font-size-sm)', color: 'var(--color-text-muted)', margin: '2px 0 0 0' }}>
                                    {t('signup.telegram_hint') || "Telefon raqamni kiriting, botdan kod oling va kiriting."}
                                </p>
                            </div>
                        </div>
                        <form onSubmit={handleTelegramLogin}>
                            <div style={{ marginBottom: '12px' }}>
                                <label className="input-label" style={{ fontSize: 'var(--font-size-sm)' }}>{t('signup.phone') || 'Telefon raqam'}</label>
                                <input
                                    type="tel"
                                    value={telegramPhone}
                                    onChange={(e) => setTelegramPhone(e.target.value)}
                                    placeholder="+998 90 123 45 67"
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
                                {t('signup.telegram_get_code') || "Kod olish"}
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
                </div>

                <p
                    className="text-center"
                    style={{
                        marginTop: '24px',
                        fontSize: 'var(--font-size-sm)',
                        color: 'var(--color-text-secondary)',
                    }}
                >
                    {t('auth.no_account') || "Akkauntingiz yo'qmi?"}{' '}
                    <Link
                        to="/signup"
                        style={{ color: 'var(--color-text-accent)', fontWeight: 'var(--font-weight-semibold)', textDecoration: 'none' }}
                    >
                        {t('auth.signup_link') || "Ro'yxatdan o'tish"}
                    </Link>
                </p>
            </div>
        </div>
    );
};

export default LoginPage;
