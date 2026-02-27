import { useState, useEffect } from 'react';
import { Link, useNavigate, useSearchParams } from 'react-router-dom';
import { Lock, ArrowLeft, CheckCircle, Eye, EyeOff } from 'lucide-react';
import { useLanguage } from '../context/LanguageContext';
import { useAuth } from '../context/AuthContext';

/**
 * Parolni tiklash — backend yuborgan linkdan kelganda (uid + token).
 * URL: /reset-password?uid=xxx&token=yyy
 */
const ResetPasswordPage = () => {
    const { t } = useLanguage();
    const navigate = useNavigate();
    const [searchParams] = useSearchParams();
    const { confirmResetPassword } = useAuth();

    const uid = searchParams.get('uid') || '';
    const token = searchParams.get('token') || '';

    const [newPassword, setNewPassword] = useState('');
    const [confirmPassword, setConfirmPassword] = useState('');
    const [showPassword, setShowPassword] = useState(false);
    const [isLoading, setIsLoading] = useState(false);
    const [isSuccess, setIsSuccess] = useState(false);
    const [error, setError] = useState('');

    useEffect(() => {
        if (!uid || !token) {
            navigate('/forgot-password', { replace: true });
        }
    }, [uid, token, navigate]);

    const handleSubmit = async (e) => {
        e.preventDefault();
        setError('');

        if (!newPassword || !confirmPassword) {
            setError(t('settings.fill_all') || 'Barcha maydonlarni to\'ldiring');
            return;
        }
        if (newPassword.length < 8) {
            setError(t('signup.password_short') || 'Parol kamida 8 ta belgidan iborat bo\'lishi kerak');
            return;
        }
        if (newPassword !== confirmPassword) {
            setError(t('settings.passwords_mismatch') || 'Parollar mos kelmadi');
            return;
        }

        setIsLoading(true);
        try {
            await confirmResetPassword(uid, token, newPassword);
            setIsSuccess(true);
        } catch (err) {
            const msg = err?.message || err?.error || err?.detail || t('settings.generic_error');
            setError(typeof msg === 'string' ? msg : t('settings.generic_error'));
        } finally {
            setIsLoading(false);
        }
    };

    if (!uid || !token) {
        return null;
    }

    if (isSuccess) {
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
                    <h1 style={{ fontSize: 'var(--font-size-2xl)', fontWeight: 'var(--font-weight-bold)', color: 'var(--color-text-primary)', marginBottom: '12px' }}>
                        {t('auth.reset_success_title') || 'Parol yangilandi'}
                    </h1>
                    <p style={{ color: 'var(--color-text-secondary)', marginBottom: '32px', lineHeight: 'var(--line-height-lg)' }}>
                        {t('auth.reset_success_desc') || 'Yangi parol bilan tizimga kiring.'}
                    </p>
                    <Link to="/login" className="btn btn-primary btn-lg w-full" style={{ textDecoration: 'none' }}>
                        {t('auth.back_to_login') || 'Kirish'}
                    </Link>
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
                <Link
                    to="/forgot-password"
                    className="inline-flex items-center gap-2"
                    style={{ color: 'var(--color-text-muted)', fontSize: 'var(--font-size-sm)', marginBottom: '24px', textDecoration: 'none' }}
                >
                    <ArrowLeft className="w-4 h-4" />
                    {t('auth.back_to_login') || 'Orqaga'}
                </Link>

                <h1 style={{ fontSize: 'var(--font-size-2xl)', fontWeight: 'var(--font-weight-bold)', color: 'var(--color-text-primary)', marginBottom: '8px' }}>
                    {t('auth.reset_confirm_title') || t('auth.reset_title') || 'Yangi parol kiriting'}
                </h1>
                <p style={{ color: 'var(--color-text-secondary)', marginBottom: '24px', fontSize: 'var(--font-size-sm)' }}>
                    {t('auth.reset_desc') || 'Parolni tiklash uchun yangi parol kiriting.'}
                </p>

                <form onSubmit={handleSubmit}>
                    {error && (
                        <div
                            style={{
                                padding: '12px 16px',
                                marginBottom: '16px',
                                borderRadius: 'var(--radius-md)',
                                backgroundColor: 'var(--color-error-bg)',
                                color: 'var(--color-error)',
                                fontSize: 'var(--font-size-sm)',
                            }}
                        >
                            {error}
                        </div>
                    )}

                    <div style={{ marginBottom: '16px' }}>
                        <label className="input-label">{t('settings.new_password') || 'Yangi parol'}</label>
                        <div className="relative">
                            <input
                                type={showPassword ? 'text' : 'password'}
                                value={newPassword}
                                onChange={(e) => setNewPassword(e.target.value)}
                                placeholder={t('settings.new_password') || 'Yangi parol'}
                                className="input input-lg"
                                style={{ paddingRight: '44px' }}
                                autoComplete="new-password"
                                minLength={8}
                            />
                            <button
                                type="button"
                                onClick={() => setShowPassword((p) => !p)}
                                className="absolute right-3 top-1/2 -translate-y-1/2"
                                style={{ background: 'none', border: 'none', cursor: 'pointer', color: 'var(--color-text-muted)' }}
                                aria-label={showPassword ? 'Parolni yashirish' : 'Parolni ko\'rsatish'}
                            >
                                {showPassword ? <EyeOff className="w-4 h-4" /> : <Eye className="w-4 h-4" />}
                            </button>
                        </div>
                    </div>

                    <div style={{ marginBottom: '24px' }}>
                        <label className="input-label">{t('settings.confirm_password') || 'Parolni tasdiqlang'}</label>
                        <input
                            type={showPassword ? 'text' : 'password'}
                            value={confirmPassword}
                            onChange={(e) => setConfirmPassword(e.target.value)}
                            placeholder={t('settings.confirm_password') || 'Parolni tasdiqlang'}
                            className="input input-lg"
                            autoComplete="new-password"
                        />
                    </div>

                    <button type="submit" disabled={isLoading} className="btn btn-primary btn-lg w-full">
                        {isLoading ? (t('settings.saving') || 'Saqlanmoqda...') : (t('auth.reset_confirm_btn') || 'Parolni yangilash')}
                    </button>
                </form>
            </div>
        </div>
    );
};

export default ResetPasswordPage;
