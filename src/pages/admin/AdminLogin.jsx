import { Link, useLocation } from 'react-router-dom';
import { Shield, LogIn } from 'lucide-react';
import { useLanguage } from '../../context/LanguageContext';

/**
 * Admin panel kirish sahifasi.
 * Admin panel faqat staff (is_staff) hisob orqali asosiy saytda kirishdan keyin ochiladi.
 * Parol frontendda saqlanmaydi — barcha autentifikatsiya backend (JWT) orqali.
 */
const AdminLogin = () => {
    const { t } = useLanguage();
    const location = useLocation();
    const redirectTo = '/amirxon';
    const loginPath = `/login?redirect=${encodeURIComponent(redirectTo)}`;

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

                <div
                    style={{
                        backgroundColor: 'var(--color-bg-secondary)',
                        borderRadius: 'var(--radius-xl)',
                        padding: '32px',
                        border: '1px solid var(--color-border-default)',
                    }}
                >
                    <p style={{
                        color: 'var(--color-text-secondary)',
                        fontSize: 'var(--font-size-base)',
                        marginBottom: '24px',
                        lineHeight: 1.6,
                    }}>
                        {t('admin.login_required_message') || "Admin panelga kirish uchun staff hisobingiz bilan saytda ro'yxatdan o'ting yoki kiring."}
                    </p>

                    <Link
                        to={loginPath}
                        state={location.state}
                        className="btn btn-primary btn-xl"
                        style={{
                            width: '100%',
                            display: 'flex',
                            alignItems: 'center',
                            justifyContent: 'center',
                            gap: '10px',
                            height: '48px',
                            fontSize: 'var(--font-size-lg)',
                            textDecoration: 'none',
                        }}
                    >
                        <LogIn style={{ width: '20px', height: '20px' }} />
                        {t('admin.login_with_staff') || 'Staff hisob bilan kirish'}
                    </Link>

                    <div style={{ marginTop: '24px', textAlign: 'center' }}>
                        <Link
                            to="/"
                            className="link-hover-accent"
                            style={{ fontSize: 'var(--font-size-sm)' }}
                        >
                            ← {t('admin.back_home') || 'Bosh sahifaga qaytish'}
                        </Link>
                    </div>
                </div>

                <p style={{
                    textAlign: 'center',
                    fontSize: 'var(--font-size-xs)',
                    color: 'var(--color-text-muted)',
                    marginTop: '24px',
                }}>
                    🔒 {t('admin.secure_note') || 'Xavfsiz ulanish orqali himoyalangan'}
                </p>
            </div>
        </div>
    );
};

export default AdminLogin;
