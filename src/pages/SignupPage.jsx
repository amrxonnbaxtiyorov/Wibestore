import { useState } from 'react';
import { Link, useNavigate } from 'react-router-dom';
import { User, Mail, Lock, Eye, EyeOff, Gamepad2, Phone, AlertCircle, CheckCircle } from 'lucide-react';
import { useAuth } from '../context/AuthContext';
import { useLanguage } from '../context/LanguageContext';
import { useToast } from '../components/ToastProvider';

const SignupPage = () => {
    const navigate = useNavigate();
    const { register } = useAuth();
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
                title: 'Muvaffaqiyatli!',
                message: 'Ro\'yxatdan o\'tish amalga oshirildi',
            });
            navigate('/');
        } catch (err) {
            const errorMessage = err?.message || 'Ro\'yxatdan o\'tishda xatolik yuz berdi';
            setError(errorMessage);
            addToast({
                type: 'error',
                title: 'Xatolik',
                message: errorMessage,
            });
        } finally {
            setIsLoading(false);
        }
    };

    const handleChange = (field, value) => {
        setFormData(prev => ({ ...prev, [field]: value }));
    };

    return (
        <div
            className="page-enter flex items-center justify-center"
            style={{ minHeight: 'calc(100vh - 64px)', padding: '32px 16px' }}
        >
            <div style={{ width: '100%', maxWidth: '440px' }}>
                {/* Header */}
                <div className="text-center" style={{ marginBottom: '24px' }}>
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
                    <h1
                        style={{
                            fontSize: 'var(--font-size-2xl)',
                            fontWeight: 'var(--font-weight-bold)',
                            color: 'var(--color-text-primary)',
                            marginBottom: '8px',
                        }}
                    >
                        {t('signup.title') || 'Create your account'}
                    </h1>
                    <p style={{ color: 'var(--color-text-secondary)', fontSize: 'var(--font-size-base)' }}>
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
