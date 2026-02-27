import { useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { Lock, User, Eye, EyeOff, Shield, AlertCircle } from 'lucide-react';
import { useLanguage } from '../../context/LanguageContext';

// Admin credentials from environment variables (not hardcoded)
const ADMIN_USERNAME = import.meta.env.VITE_ADMIN_USERNAME || 'admin';
const ADMIN_PASSWORD = import.meta.env.VITE_ADMIN_PASSWORD || '';

// Check if admin password is configured
const isAdminConfigured = ADMIN_PASSWORD && ADMIN_PASSWORD !== '';

const AdminLogin = () => {
    const navigate = useNavigate();
    const { t } = useLanguage();
    const [formData, setFormData] = useState({ username: '', password: '' });
    const [showPassword, setShowPassword] = useState(false);
    const [error, setError] = useState('');
    const [isLoading, setIsLoading] = useState(false);

    const handleChange = (e) => {
        setFormData({ ...formData, [e.target.name]: e.target.value });
        setError('');
    };

    const handleSubmit = (e) => {
        e.preventDefault();
        setIsLoading(true);
        setError('');

        // Warn if admin password is not configured
        if (!isAdminConfigured) {
            setError(t('admin.error_not_configured') || "Admin paroli so'zlanmagan! Iltimos, .env faylga VITE_ADMIN_PASSWORD ni kiriting.");
            setIsLoading(false);
            return;
        }

        setTimeout(() => {
            if (formData.username === ADMIN_USERNAME &&
                formData.password === ADMIN_PASSWORD) {
                // Store admin session with timestamp and simple hash
                const sessionToken = btoa(`${formData.username}:${Date.now()}:${Math.random()}`);
                localStorage.setItem('adminAuth', JSON.stringify({
                    isAuthenticated: true,
                    username: formData.username,
                    sessionToken: sessionToken,
                    loginTime: new Date().toISOString(),
                    expiresAt: new Date(Date.now() + 8 * 60 * 60 * 1000).toISOString() // 8 hours
                }));
                navigate('/admin');
            } else {
                setError(t('admin.error_invalid') || "Login yoki parol noto'g'ri!");
            }
            setIsLoading(false);
        }, 500);
    };

    return (
        <div
            style={{
                minHeight: '100vh',
                display: 'flex',
                alignItems: 'center',
                justifyContent: 'center',
                backgroundColor: 'var(--color-bg-primary)',
                padding: '0 16px',
                position: 'relative',
                overflow: 'hidden',
            }}
        >
            {/* Subtle background accent */}
            <div
                style={{
                    position: 'absolute',
                    top: '30%',
                    left: '50%',
                    transform: 'translate(-50%, -50%)',
                    width: '500px',
                    height: '500px',
                    background: 'radial-gradient(circle, var(--color-accent-blue) 0%, transparent 70%)',
                    opacity: 0.04,
                    pointerEvents: 'none',
                }}
            />

            <div style={{ position: 'relative', width: '100%', maxWidth: '420px' }}>
                {/* Logo */}
                <div style={{ textAlign: 'center', marginBottom: '32px' }}>
                    <div
                        style={{
                            width: '64px',
                            height: '64px',
                            margin: '0 auto 16px',
                            background: 'linear-gradient(135deg, var(--color-accent-blue), var(--color-accent-blue-hover))',
                            borderRadius: 'var(--radius-xl)',
                            display: 'flex',
                            alignItems: 'center',
                            justifyContent: 'center',
                        }}
                    >
                        <Shield style={{ width: '32px', height: '32px', color: '#ffffff' }} />
                    </div>
                    <h1 style={{
                        fontSize: 'var(--font-size-2xl)',
                        fontWeight: 'var(--font-weight-bold)',
                        color: 'var(--color-text-primary)',
                        marginBottom: '8px',
                    }}>
                        {t('admin.panel_title') || 'Admin Panel'}
                    </h1>
                    <p style={{ color: 'var(--color-text-muted)', fontSize: 'var(--font-size-base)' }}>
                        {t('admin.panel_subtitle') || 'WibeStore boshqaruv paneli'}
                    </p>
                </div>

                {/* Login Form */}
                <div
                    style={{
                        backgroundColor: 'var(--color-bg-secondary)',
                        borderRadius: 'var(--radius-xl)',
                        padding: '32px',
                        border: '1px solid var(--color-border-default)',
                    }}
                >
                    <form onSubmit={handleSubmit} style={{ display: 'flex', flexDirection: 'column', gap: '20px' }}>
                        {/* Error Message */}
                        {error && (
                            <div className="alert alert-error">
                                <AlertCircle style={{ width: '18px', height: '18px', flexShrink: 0 }} />
                                <span style={{ fontSize: 'var(--font-size-sm)' }}>{error}</span>
                            </div>
                        )}

                        {/* Username */}
                        <div className="form-field" style={{ marginBottom: 0 }}>
                            <label className="input-label" htmlFor="admin-username">{t('admin.login_label') || 'Login'}</label>
                            <div style={{ position: 'relative' }}>
                                <User
                                    style={{
                                        position: 'absolute',
                                        left: '12px',
                                        top: '50%',
                                        transform: 'translateY(-50%)',
                                        width: '18px',
                                        height: '18px',
                                        color: 'var(--color-text-muted)',
                                    }}
                                />
                                <input
                                    id="admin-username"
                                    type="text"
                                    name="username"
                                    value={formData.username}
                                    onChange={handleChange}
                                    placeholder="admin"
                                    className="input input-lg"
                                    style={{ paddingLeft: '40px' }}
                                    required
                                    autoComplete="username"
                                />
                            </div>
                        </div>

                        {/* Password */}
                        <div className="form-field" style={{ marginBottom: 0 }}>
                            <label className="input-label" htmlFor="admin-password">{t('admin.password_label') || 'Parol'}</label>
                            <div style={{ position: 'relative' }}>
                                <Lock
                                    style={{
                                        position: 'absolute',
                                        left: '12px',
                                        top: '50%',
                                        transform: 'translateY(-50%)',
                                        width: '18px',
                                        height: '18px',
                                        color: 'var(--color-text-muted)',
                                    }}
                                />
                                <input
                                    id="admin-password"
                                    type={showPassword ? 'text' : 'password'}
                                    name="password"
                                    value={formData.password}
                                    onChange={handleChange}
                                    placeholder="••••••••"
                                    className="input input-lg"
                                    style={{ paddingLeft: '40px', paddingRight: '44px' }}
                                    required
                                    autoComplete="current-password"
                                />
                                <button
                                    type="button"
                                    onClick={() => setShowPassword(!showPassword)}
                                    className="password-toggle-btn"
                                    style={{
                                        position: 'absolute',
                                        right: '12px',
                                        top: '50%',
                                        transform: 'translateY(-50%)',
                                        background: 'none',
                                        border: 'none',
                                        cursor: 'pointer',
                                        color: 'var(--color-text-muted)',
                                        padding: '4px',
                                    }}
                                    aria-label={showPassword ? 'Hide password' : 'Show password'}
                                >
                                    {showPassword ? <EyeOff style={{ width: '18px', height: '18px' }} /> : <Eye style={{ width: '18px', height: '18px' }} />}
                                </button>
                            </div>
                        </div>

                        {/* Submit Button */}
                        <button
                            type="submit"
                            disabled={isLoading}
                            className={`btn btn-primary btn-xl ${isLoading ? 'btn-loading' : ''}`}
                            style={{ width: '100%', marginTop: '8px', height: '48px', fontSize: 'var(--font-size-lg)' }}
                        >
                            {isLoading ? (
                                <span style={{ display: 'flex', alignItems: 'center', justifyContent: 'center', gap: '8px' }}>
                                    <span className="spinner" />
                                    {t('admin.login_loading') || 'Kirish...'}
                                </span>
                            ) : (
                                t('admin.login_btn') || 'Kirish'
                            )}
                        </button>
                    </form>

                    {/* Back to Home */}
                    <div style={{ marginTop: '24px', textAlign: 'center' }}>
                        <a
                            href="/"
                            className="link-hover-accent"
                            style={{
                                fontSize: 'var(--font-size-sm)',
                            }}
                        >
                            ← {t('admin.back_home') || 'Bosh sahifaga qaytish'}
                        </a>
                    </div>
                </div>

                {/* Security Note */}
                <p style={{
                    textAlign: 'center',
                    fontSize: 'var(--font-size-xs)',
                    color: 'var(--color-text-muted)',
                    marginTop: '24px',
                }}>
                    🔒 {t('admin.secure_note') || 'Xavfsiz ulanish orqali himoyalangan'}
                </p>
            </div >
        </div >
    );
};

export default AdminLogin;
