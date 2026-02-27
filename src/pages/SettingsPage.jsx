import { useState, useEffect } from 'react';
import { Link, useNavigate } from 'react-router-dom';
import { Settings, User, Lock, Bell, Globe, CreditCard, Shield, Trash2, Camera, Save, AlertCircle, CheckCircle } from 'lucide-react';
import { useAuth } from '../context/AuthContext';
import { useLanguage, languages as langList } from '../context/LanguageContext';

const SettingsPage = () => {
    const navigate = useNavigate();
    const { user, isAuthenticated, updateProfile, logout, requestEmailChange, confirmEmailChange, refreshUser } = useAuth();
    const { t, language, setLanguage } = useLanguage();
    const [activeTab, setActiveTab] = useState('profile');
    const [isSaving, setIsSaving] = useState(false);
    const [message, setMessage] = useState({ type: '', text: '' });

    const [profileData, setProfileData] = useState({
        name: user?.name ?? user?.display_name ?? user?.full_name ?? '',
        email: user?.email ?? '',
        phone: user?.phone_number ?? user?.phone ?? '',
        bio: user?.bio ?? ''
    });

    useEffect(() => {
        if (user) {
            setProfileData(prev => ({
                ...prev,
                name: user.name ?? user.display_name ?? user.full_name ?? prev.name,
                email: user.email ?? prev.email,
                phone: user.phone_number ?? user.phone ?? prev.phone,
                bio: user.bio ?? prev.bio
            }));
        }
    }, [user?.id, user?.name, user?.email, user?.phone_number, user?.full_name]);

    const [passwordData, setPasswordData] = useState({
        currentPassword: '',
        newPassword: '',
        confirmPassword: ''
    });

    const [emailChange, setEmailChange] = useState({
        newEmail: '',
        code: '',
        step: 'idle',
        loading: false,
    });

    const [notifications, setNotifications] = useState({
        email: true, push: true, sales: true, messages: true, updates: false
    });
    const [avatarUploading, setAvatarUploading] = useState(false);

    useEffect(() => {
        if (!isAuthenticated) navigate('/login');
    }, [isAuthenticated, navigate]);

    const handleAvatarChange = async (e) => {
        const file = e.target.files?.[0];
        if (!file || !file.type.startsWith('image/')) return;
        if (file.size > 5 * 1024 * 1024) {
            setMessage({ type: 'error', text: t('settings.avatar_too_large') || 'Rasm 5MB dan oshmasin' });
            return;
        }
        setAvatarUploading(true);
        setMessage({ type: '', text: '' });
        try {
            const form = new FormData();
            form.append('avatar', file);
            await updateProfile(form);
            setMessage({ type: 'success', text: t('settings.profile_updated') || 'Profil yangilandi' });
        } catch (err) {
            setMessage({ type: 'error', text: err?.message || t('settings.generic_error') });
        } finally {
            setAvatarUploading(false);
            e.target.value = '';
        }
    };

    if (!isAuthenticated) return null;

    const tabs = [
        { id: 'profile', label: t('settings.profile'), icon: User },
        { id: 'security', label: t('settings.security'), icon: Lock },
        { id: 'notifications', label: t('settings.notifications'), icon: Bell },
        { id: 'language', label: t('settings.language'), icon: Globe },
        { id: 'wallet', label: t('settings.wallet'), icon: CreditCard },
    ];

    const handleProfileSave = async () => {
        setIsSaving(true);
        setMessage({ type: '', text: '' });
        try {
            await updateProfile({
                full_name: profileData.name,
                phone_number: profileData.phone || null
            });
            setMessage({ type: 'success', text: t('settings.profile_updated') });
        } catch (err) {
            setMessage({ type: 'error', text: err?.message || t('settings.generic_error') });
        } finally {
            setIsSaving(false);
        }
    };

    const handlePasswordChange = async () => {
        setMessage({ type: '', text: '' });
        if (!passwordData.currentPassword || !passwordData.newPassword || !passwordData.confirmPassword) {
            setMessage({ type: 'error', text: t('settings.fill_all') }); return;
        }
        if (passwordData.newPassword !== passwordData.confirmPassword) {
            setMessage({ type: 'error', text: t('settings.passwords_mismatch') }); return;
        }
        if (passwordData.newPassword.length < 8) {
            setMessage({ type: 'error', text: t('settings.password_short') }); return;
        }

        setIsSaving(true);

        try {
            // Use backend API for password change
            const { createPublicClient } = await import('../lib/apiClient');
            const publicClient = createPublicClient();
            
            await publicClient.post('/auth/password/change/', {
                current_password: passwordData.currentPassword,
                new_password: passwordData.newPassword,
            });

            setMessage({ type: 'success', text: t('settings.password_changed') });
            setPasswordData({ currentPassword: '', newPassword: '', confirmPassword: '' });
        } catch (err) {
            console.error(err);
            const errorMsg = err.response?.data?.error || err.response?.data?.detail || t('settings.generic_error');
            setMessage({ type: 'error', text: errorMsg });
        } finally {
            setIsSaving(false);
        }
    };

    const handleDeleteAccount = () => {
        if (window.confirm(t('settings.delete_confirm'))) { logout(); navigate('/'); }
    };

    const handleRequestEmailChange = async () => {
        const newEmail = emailChange.newEmail.trim();
        if (!newEmail) {
            setMessage({ type: 'error', text: t('settings.enter_email') || 'Yangi email kiriting' });
            return;
        }
        const emailRe = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
        if (!emailRe.test(newEmail)) {
            setMessage({ type: 'error', text: t('settings.valid_email') || 'To\'g\'ri email kiriting' });
            return;
        }
        if (newEmail.toLowerCase() === (user?.email || '').toLowerCase()) {
            setMessage({ type: 'error', text: t('settings.email_same') || 'Yangi email joriy emaildan farq qilishi kerak' });
            return;
        }
        setMessage({ type: '', text: '' });
        setEmailChange(prev => ({ ...prev, loading: true }));
        try {
            await requestEmailChange(newEmail);
            setMessage({ type: 'success', text: t('settings.email_code_sent') || 'Tasdiqlash kodi yangi emailga yuborildi' });
            setEmailChange(prev => ({ ...prev, step: 'confirm', loading: false }));
        } catch (err) {
            const msg = err?.message || err?.error || err?.detail || t('settings.generic_error');
            setMessage({ type: 'error', text: typeof msg === 'string' ? msg : t('settings.generic_error') });
            setEmailChange(prev => ({ ...prev, loading: false }));
        }
    };

    const handleConfirmEmailChange = async () => {
        const { newEmail, code } = emailChange;
        if (!code.trim()) {
            setMessage({ type: 'error', text: t('settings.enter_code') || 'Tasdiqlash kodini kiriting' });
            return;
        }
        setMessage({ type: '', text: '' });
        setEmailChange(prev => ({ ...prev, loading: true }));
        try {
            await confirmEmailChange(newEmail.trim(), code.trim());
            setMessage({ type: 'success', text: t('settings.email_changed') || 'Email muvaffaqiyatli o\'zgartirildi' });
            setEmailChange({ newEmail: '', code: '', step: 'idle', loading: false });
            if (refreshUser) await refreshUser();
        } catch (err) {
            const msg = err?.message || err?.error || err?.detail || t('settings.generic_error');
            setMessage({ type: 'error', text: typeof msg === 'string' ? msg : t('settings.generic_error') });
            setEmailChange(prev => ({ ...prev, loading: false }));
        }
    };

    const notificationItems = [
        { key: 'email', label: t('settings.email_notif'), desc: t('settings.email_notif_desc') },
        { key: 'push', label: t('settings.push_notif'), desc: t('settings.push_notif_desc') },
        { key: 'sales', label: t('settings.sales_notif'), desc: t('settings.sales_notif_desc') },
        { key: 'messages', label: t('settings.messages_notif'), desc: t('settings.messages_notif_desc') },
        { key: 'updates', label: t('settings.updates_notif'), desc: t('settings.updates_notif_desc') },
    ];

    const cardStyle = {
        backgroundColor: 'var(--color-bg-primary)',
        border: '1px solid var(--color-border-default)',
        borderRadius: 'var(--radius-xl)',
        padding: '24px',
    };

    const inputStyle = 'input input-lg';

    return (
        <div className="page-enter" style={{ minHeight: '100vh', paddingBottom: '64px' }}>
            <div className="gh-container" style={{ maxWidth: '960px' }}>
                {/* Breadcrumbs */}
                <div className="breadcrumbs">
                    <Link to="/">{t('common.home')}</Link>
                    <span className="breadcrumb-separator">/</span>
                    <Link to="/profile">{t('nav.profile') || 'Profile'}</Link>
                    <span className="breadcrumb-separator">/</span>
                    <span className="breadcrumb-current">{t('settings.title')}</span>
                </div>

                {/* Header */}
                <div style={{ paddingTop: '16px', marginBottom: '24px' }}>
                    <h1 className="flex items-center gap-3" style={{ fontSize: 'var(--font-size-2xl)', fontWeight: 'var(--font-weight-bold)' }}>
                        <Settings className="w-6 h-6" style={{ color: 'var(--color-text-accent)' }} />
                        {t('settings.title')}
                    </h1>
                    <p style={{ color: 'var(--color-text-secondary)', marginTop: '4px' }}>{t('settings.subtitle')}</p>
                </div>

                <div className="flex flex-col lg:flex-row gap-5">
                    {/* Sidebar */}
                    <div style={{ width: '240px', flexShrink: 0 }}>
                        <div style={{ ...cardStyle, padding: '8px' }}>
                            <nav style={{ display: 'flex', flexDirection: 'column', gap: '2px' }}>
                                {tabs.map((tab) => (
                                    <button
                                        key={tab.id}
                                        onClick={() => { setActiveTab(tab.id); setMessage({ type: '', text: '' }); }}
                                        className="w-full flex items-center gap-3 text-left"
                                        style={{
                                            padding: '10px 12px',
                                            borderRadius: 'var(--radius-md)',
                                            fontSize: 'var(--font-size-base)',
                                            fontWeight: activeTab === tab.id ? 'var(--font-weight-semibold)' : 'var(--font-weight-regular)',
                                            color: activeTab === tab.id ? 'var(--color-text-primary)' : 'var(--color-text-secondary)',
                                            backgroundColor: activeTab === tab.id ? 'var(--color-bg-tertiary)' : 'transparent',
                                            border: 'none',
                                            cursor: 'pointer',
                                            transition: 'all 0.15s ease',
                                        }}
                                    >
                                        <tab.icon className="w-4 h-4" />
                                        {tab.label}
                                    </button>
                                ))}
                            </nav>
                        </div>
                    </div>

                    {/* Content */}
                    <div className="flex-1">
                        <div style={cardStyle}>
                            {/* Message */}
                            {message.text && (
                                <div
                                    className="flex items-center gap-3"
                                    style={{
                                        padding: '12px 16px',
                                        borderRadius: 'var(--radius-md)',
                                        marginBottom: '20px',
                                        backgroundColor: message.type === 'success' ? 'var(--color-success-bg)' : 'var(--color-error-bg)',
                                        border: `1px solid ${message.type === 'success' ? 'var(--color-accent-green)' : 'var(--color-error)'}`,
                                        color: message.type === 'success' ? 'var(--color-accent-green)' : 'var(--color-error)',
                                        fontSize: 'var(--font-size-sm)',
                                    }}
                                >
                                    {message.type === 'success' ? <CheckCircle className="w-4 h-4 flex-shrink-0" /> : <AlertCircle className="w-4 h-4 flex-shrink-0" />}
                                    <span>{message.text}</span>
                                </div>
                            )}

                            {/* Profile Tab */}
                            {activeTab === 'profile' && (
                                <div>
                                    <h2 style={{ fontSize: 'var(--font-size-lg)', fontWeight: 'var(--font-weight-bold)', color: 'var(--color-text-primary)', marginBottom: '20px' }}>
                                        {t('settings.profile_info')}
                                    </h2>

                                    {/* Avatar — rasm bor bo'lsa rasm, yo'q bo'lsa ismning birinchi harfi */}
                                    <div className="flex items-center gap-4" style={{ marginBottom: '24px' }}>
                                        <div className="relative">
                                            <div style={{
                                                width: '64px', height: '64px',
                                                background: user?.avatar ? 'transparent' : 'linear-gradient(135deg, var(--color-accent-blue), var(--color-accent-purple))',
                                                borderRadius: 'var(--radius-xl)',
                                                display: 'flex', alignItems: 'center', justifyContent: 'center',
                                                fontSize: '24px', fontWeight: 'var(--font-weight-bold)', color: '#fff',
                                                overflow: 'hidden',
                                            }}>
                                                {user?.avatar ? (
                                                    <img src={user.avatar} alt={user?.name || 'User'} style={{ width: '100%', height: '100%', objectFit: 'cover' }} />
                                                ) : (
                                                    (user?.name || 'U').charAt(0).toUpperCase()
                                                )}
                                            </div>
                                            <label style={{
                                                position: 'absolute', bottom: '-4px', right: '-4px',
                                                width: '24px', height: '24px',
                                                backgroundColor: 'var(--color-accent-blue)',
                                                borderRadius: 'var(--radius-md)', border: '2px solid var(--color-bg-primary)',
                                                display: 'flex', alignItems: 'center', justifyContent: 'center',
                                                cursor: avatarUploading ? 'wait' : 'pointer', color: '#fff',
                                            }}>
                                                <input type="file" accept="image/*" className="hidden" style={{ display: 'none' }} onChange={handleAvatarChange} disabled={avatarUploading} />
                                                {avatarUploading ? <span className="animate-pulse" style={{ fontSize: 10 }}>...</span> : <Camera className="w-3 h-3" />}
                                            </label>
                                        </div>
                                        <div>
                                            <p style={{ fontWeight: 'var(--font-weight-medium)', color: 'var(--color-text-primary)' }}>{user?.name || user?.display_name || user?.email}</p>
                                            <p style={{ fontSize: 'var(--font-size-sm)', color: 'var(--color-text-muted)' }}>{user?.email}</p>
                                        </div>
                                    </div>

                                    {/* Joriy email (faqat ko'rsatish) — o'zgartirish tasdiqlash kodi orqali */}
                                    <div style={{ marginBottom: '20px' }}>
                                        <label className="input-label">{t('settings.email')}</label>
                                        <div style={{ display: 'flex', alignItems: 'center', gap: '12px', flexWrap: 'wrap' }}>
                                            <input type="email" value={user?.email ?? ''} readOnly className={inputStyle} style={{ flex: '1', minWidth: '200px', backgroundColor: 'var(--color-bg-tertiary)', cursor: 'not-allowed' }} />
                                            <span style={{ fontSize: 'var(--font-size-sm)', color: 'var(--color-text-muted)' }}>{t('settings.email_change_hint') || 'O\'zgartirish uchun quyida tasdiqlash kodi yuboring'}</span>
                                        </div>
                                    </div>

                                    {/* Email o'zgartirish — tasdiqlash kodi (Google reserve account kabi) */}
                                    <div style={{ marginBottom: '24px', padding: '20px', borderRadius: 'var(--radius-lg)', border: '1px solid var(--color-border-default)', backgroundColor: 'var(--color-bg-secondary)' }}>
                                        <h3 style={{ fontSize: 'var(--font-size-base)', fontWeight: 'var(--font-weight-semibold)', color: 'var(--color-text-primary)', marginBottom: '12px' }}>
                                            {t('settings.change_email') || 'Emailni o\'zgartirish'}
                                        </h3>
                                        <p style={{ fontSize: 'var(--font-size-sm)', color: 'var(--color-text-muted)', marginBottom: '16px' }}>
                                            {t('settings.change_email_desc') || 'Yangi email kiriting. Unga tasdiqlash kodi yuboriladi. Kodni kiriting va email yangilanadi.'}
                                        </p>
                                        <div style={{ display: 'flex', flexDirection: 'column', gap: '12px' }}>
                                            <div>
                                                <label className="input-label">{t('settings.new_email') || 'Yangi email'}</label>
                                                <input
                                                    type="email"
                                                    value={emailChange.newEmail}
                                                    onChange={(e) => setEmailChange(prev => ({ ...prev, newEmail: e.target.value }))}
                                                    placeholder={t('settings.email_placeholder') || 'email@example.com'}
                                                    className={inputStyle}
                                                    disabled={emailChange.step === 'confirm'}
                                                    autoComplete="email"
                                                />
                                            </div>
                                            {emailChange.step === 'confirm' && (
                                                <div>
                                                    <label className="input-label">{t('settings.verification_code') || 'Tasdiqlash kodi'}</label>
                                                    <input
                                                        type="text"
                                                        inputMode="numeric"
                                                        maxLength={8}
                                                        value={emailChange.code}
                                                        onChange={(e) => setEmailChange(prev => ({ ...prev, code: e.target.value.replace(/\D/g, '') }))}
                                                        placeholder="123456"
                                                        className={inputStyle}
                                                        autoComplete="one-time-code"
                                                    />
                                                </div>
                                            )}
                                            <div style={{ display: 'flex', gap: '8px', flexWrap: 'wrap' }}>
                                                {emailChange.step === 'idle' ? (
                                                    <button type="button" onClick={handleRequestEmailChange} disabled={emailChange.loading} className="btn btn-primary btn-md">
                                                        {emailChange.loading ? (t('settings.sending') || 'Yuborilmoqda...') : (t('settings.send_verification_code') || 'Tasdiqlash kodini yuborish')}
                                                    </button>
                                                ) : (
                                                    <>
                                                        <button type="button" onClick={handleConfirmEmailChange} disabled={emailChange.loading} className="btn btn-primary btn-md">
                                                            {emailChange.loading ? (t('settings.saving') || 'Saqlanmoqda...') : (t('settings.confirm_email_change') || 'Tasdiqlash')}
                                                        </button>
                                                        <button type="button" onClick={() => setEmailChange({ newEmail: '', code: '', step: 'idle', loading: false })} disabled={emailChange.loading} className="btn btn-ghost btn-md">
                                                            {t('settings.cancel') || 'Bekor qilish'}
                                                        </button>
                                                    </>
                                                )}
                                            </div>
                                        </div>
                                    </div>

                                    {/* Form */}
                                    <div className="grid grid-cols-1 md:grid-cols-2" style={{ gap: '16px', marginBottom: '24px' }}>
                                        <div>
                                            <label className="input-label">{t('settings.name')}</label>
                                            <input type="text" value={profileData.name} onChange={(e) => setProfileData({ ...profileData, name: e.target.value })} className={inputStyle} autoComplete="name" />
                                        </div>
                                        <div className="md:col-span-2">
                                            <label className="input-label">{t('settings.phone')}</label>
                                            <input type="tel" value={profileData.phone} onChange={(e) => setProfileData({ ...profileData, phone: e.target.value })} placeholder="+998 90 123 45 67" className={inputStyle} autoComplete="tel" />
                                        </div>
                                        <div className="md:col-span-2">
                                            <label className="input-label">{t('settings.bio')}</label>
                                            <textarea
                                                value={profileData.bio}
                                                onChange={(e) => setProfileData({ ...profileData, bio: e.target.value })}
                                                placeholder={t('settings.bio_placeholder')}
                                                rows={3}
                                                className="input"
                                                style={{ height: 'auto', padding: '12px 16px', resize: 'none' }}
                                            />
                                        </div>
                                    </div>

                                    <button onClick={handleProfileSave} disabled={isSaving} className="btn btn-primary btn-lg">
                                        <Save className="w-4 h-4" />
                                        {isSaving ? t('settings.saving') : t('settings.save')}
                                    </button>
                                </div>
                            )}

                            {/* Security Tab */}
                            {activeTab === 'security' && (
                                <div>
                                    <h2 style={{ fontSize: 'var(--font-size-lg)', fontWeight: 'var(--font-weight-bold)', color: 'var(--color-text-primary)', marginBottom: '20px' }}>
                                        {t('settings.security')}
                                    </h2>

                                    <div style={{ display: 'flex', flexDirection: 'column', gap: '16px', marginBottom: '24px' }}>
                                        <div>
                                            <label className="input-label">{t('settings.current_password')}</label>
                                            <input type="password" value={passwordData.currentPassword} onChange={(e) => setPasswordData({ ...passwordData, currentPassword: e.target.value })} className={inputStyle} autoComplete="current-password" />
                                        </div>
                                        <div>
                                            <label className="input-label">{t('settings.new_password')}</label>
                                            <input type="password" value={passwordData.newPassword} onChange={(e) => setPasswordData({ ...passwordData, newPassword: e.target.value })} className={inputStyle} autoComplete="new-password" />
                                        </div>
                                        <div>
                                            <label className="input-label">{t('settings.confirm_password')}</label>
                                            <input type="password" value={passwordData.confirmPassword} onChange={(e) => setPasswordData({ ...passwordData, confirmPassword: e.target.value })} className={inputStyle} autoComplete="new-password" />
                                        </div>
                                    </div>

                                    <button onClick={handlePasswordChange} disabled={isSaving} className="btn btn-primary btn-lg">
                                        <Lock className="w-4 h-4" />
                                        {isSaving ? t('settings.changing_password') : t('settings.change_password')}
                                    </button>

                                    {/* 2FA */}
                                    <div style={{ marginTop: '32px', paddingTop: '24px', borderTop: '1px solid var(--color-border-muted)' }}>
                                        <div className="flex items-center justify-between">
                                            <div>
                                                <h3 style={{ fontWeight: 'var(--font-weight-medium)', color: 'var(--color-text-primary)' }}>{t('settings.twofa')}</h3>
                                                <p style={{ fontSize: 'var(--font-size-sm)', color: 'var(--color-text-muted)', marginTop: '4px' }}>{t('settings.twofa_desc')}</p>
                                            </div>
                                            <button className="btn btn-secondary btn-sm">{t('settings.enable')}</button>
                                        </div>
                                    </div>

                                    {/* Delete Account */}
                                    <div style={{ marginTop: '32px', paddingTop: '24px', borderTop: '1px solid var(--color-border-muted)' }}>
                                        <h3 style={{ fontWeight: 'var(--font-weight-medium)', color: 'var(--color-error)', marginBottom: '8px' }}>{t('settings.danger_zone')}</h3>
                                        <p style={{ fontSize: 'var(--font-size-sm)', color: 'var(--color-text-secondary)', marginBottom: '16px' }}>{t('settings.delete_warning')}</p>
                                        <button onClick={handleDeleteAccount} className="btn btn-danger btn-md">
                                            <Trash2 className="w-4 h-4" />
                                            {t('settings.delete_account')}
                                        </button>
                                    </div>
                                </div>
                            )}

                            {/* Notifications Tab */}
                            {activeTab === 'notifications' && (
                                <div>
                                    <h2 style={{ fontSize: 'var(--font-size-lg)', fontWeight: 'var(--font-weight-bold)', color: 'var(--color-text-primary)', marginBottom: '20px' }}>
                                        {t('settings.notifications')}
                                    </h2>
                                    <div style={{ display: 'flex', flexDirection: 'column', gap: '8px' }}>
                                        {notificationItems.map((item) => (
                                            <div
                                                key={item.key}
                                                className="flex items-center justify-between"
                                                style={{
                                                    padding: '14px 16px',
                                                    borderRadius: 'var(--radius-lg)',
                                                    backgroundColor: 'var(--color-bg-secondary)',
                                                    border: '1px solid var(--color-border-muted)',
                                                }}
                                            >
                                                <div>
                                                    <p style={{ fontWeight: 'var(--font-weight-medium)', color: 'var(--color-text-primary)' }}>{item.label}</p>
                                                    <p style={{ fontSize: 'var(--font-size-sm)', color: 'var(--color-text-muted)' }}>{item.desc}</p>
                                                </div>
                                                <button
                                                    onClick={() => setNotifications({ ...notifications, [item.key]: !notifications[item.key] })}
                                                    style={{
                                                        width: '44px', height: '24px',
                                                        borderRadius: 'var(--radius-full)',
                                                        backgroundColor: notifications[item.key] ? 'var(--color-accent-blue)' : 'var(--color-bg-tertiary)',
                                                        border: `1px solid ${notifications[item.key] ? 'var(--color-accent-blue)' : 'var(--color-border-default)'}`,
                                                        cursor: 'pointer',
                                                        position: 'relative',
                                                        transition: 'all 0.2s ease',
                                                        flexShrink: 0,
                                                    }}
                                                >
                                                    <div style={{
                                                        width: '18px', height: '18px',
                                                        borderRadius: 'var(--radius-full)',
                                                        backgroundColor: '#ffffff',
                                                        position: 'absolute', top: '2px',
                                                        left: notifications[item.key] ? '22px' : '2px',
                                                        transition: 'left 0.2s ease',
                                                        boxShadow: 'var(--shadow-xs)',
                                                    }} />
                                                </button>
                                            </div>
                                        ))}
                                    </div>
                                </div>
                            )}

                            {/* Language Tab */}
                            {activeTab === 'language' && (
                                <div>
                                    <h2 style={{ fontSize: 'var(--font-size-lg)', fontWeight: 'var(--font-weight-bold)', color: 'var(--color-text-primary)', marginBottom: '20px' }}>
                                        {t('settings.choose_language')}
                                    </h2>
                                    <div className="grid grid-cols-1 md:grid-cols-3" style={{ gap: '12px', marginBottom: '16px' }}>
                                        {langList.map((lang) => (
                                            <button
                                                key={lang.code}
                                                onClick={() => setLanguage(lang.code)}
                                                style={{
                                                    padding: '16px',
                                                    borderRadius: 'var(--radius-lg)',
                                                    border: `2px solid ${language === lang.code ? 'var(--color-accent-blue)' : 'var(--color-border-default)'}`,
                                                    backgroundColor: language === lang.code ? 'var(--color-info-bg)' : 'var(--color-bg-secondary)',
                                                    cursor: 'pointer',
                                                    textAlign: 'center',
                                                    transition: 'all 0.15s ease',
                                                }}
                                            >
                                                <div style={{ marginBottom: '8px', display: 'flex', justifyContent: 'center' }}>
                                                    <img
                                                        src={lang.flagUrl}
                                                        alt={lang.name}
                                                        style={{
                                                            width: '40px',
                                                            height: '24px',
                                                            objectFit: 'cover',
                                                            borderRadius: '4px',
                                                            display: 'block',
                                                        }}
                                                    />
                                                </div>
                                                <p style={{ fontWeight: 'var(--font-weight-medium)', color: 'var(--color-text-primary)' }}>{lang.name}</p>
                                            </button>
                                        ))}
                                    </div>
                                    <p style={{ fontSize: 'var(--font-size-sm)', color: 'var(--color-text-muted)' }}>{t('settings.language_note')}</p>
                                </div>
                            )}

                            {/* Wallet Tab */}
                            {activeTab === 'wallet' && (
                                <div>
                                    <h2 style={{ fontSize: 'var(--font-size-lg)', fontWeight: 'var(--font-weight-bold)', color: 'var(--color-text-primary)', marginBottom: '20px' }}>
                                        {t('settings.wallet')}
                                    </h2>

                                    {/* Balance */}
                                    <div
                                        style={{
                                            padding: '24px',
                                            borderRadius: 'var(--radius-xl)',
                                            backgroundColor: 'var(--color-accent-blue)',
                                            marginBottom: '20px',
                                            position: 'relative',
                                            overflow: 'hidden',
                                        }}
                                    >
                                        <div style={{ position: 'absolute', inset: 0, opacity: 0.06, pointerEvents: 'none' }}>
                                            <div style={{ position: 'absolute', top: '-20%', right: '-10%', width: '200px', height: '200px', background: '#fff', borderRadius: '50%', filter: 'blur(60px)' }} />
                                        </div>
                                        <p style={{ fontSize: 'var(--font-size-sm)', color: 'rgba(255,255,255,0.7)', marginBottom: '4px' }}>{t('settings.balance')}</p>
                                        <p style={{ fontSize: 'var(--font-size-3xl)', fontWeight: 'var(--font-weight-bold)', color: '#ffffff' }}>{t('settings.balance_amount')}</p>
                                    </div>

                                    {/* Actions */}
                                    <div className="grid grid-cols-2" style={{ gap: '12px', marginBottom: '24px' }}>
                                        <button
                                            className="text-center"
                                            onClick={() => alert(t('settings.add_money_coming_soon'))}
                                            style={{
                                                padding: '16px',
                                                borderRadius: 'var(--radius-lg)',
                                                backgroundColor: 'var(--color-bg-secondary)',
                                                border: '1px solid var(--color-border-default)',
                                                cursor: 'pointer',
                                                transition: 'all 0.15s ease',
                                            }}
                                        >
                                            <CreditCard className="mx-auto" style={{ width: '24px', height: '24px', color: 'var(--color-accent-green)', marginBottom: '8px' }} />
                                            <p style={{ fontWeight: 'var(--font-weight-medium)', color: 'var(--color-text-primary)' }}>{t('settings.add_money')}</p>
                                        </button>
                                        <button
                                            className="text-center"
                                            onClick={() => alert(t('settings.withdraw_coming_soon'))}
                                            style={{
                                                padding: '16px',
                                                borderRadius: 'var(--radius-lg)',
                                                backgroundColor: 'var(--color-bg-secondary)',
                                                border: '1px solid var(--color-border-default)',
                                                cursor: 'pointer',
                                                transition: 'all 0.15s ease',
                                            }}
                                        >
                                            <Shield className="mx-auto" style={{ width: '24px', height: '24px', color: 'var(--color-accent-blue)', marginBottom: '8px' }} />
                                            <p style={{ fontWeight: 'var(--font-weight-medium)', color: 'var(--color-text-primary)' }}>{t('settings.withdraw')}</p>
                                        </button>
                                    </div>

                                    {/* Cards */}
                                    <div>
                                        <h3 style={{ fontWeight: 'var(--font-weight-medium)', color: 'var(--color-text-primary)', marginBottom: '12px' }}>{t('settings.linked_cards')}</h3>
                                        <div className="text-center" style={{
                                            padding: '32px 16px',
                                            borderRadius: 'var(--radius-lg)',
                                            backgroundColor: 'var(--color-bg-secondary)',
                                            border: '1px solid var(--color-border-default)',
                                        }}>
                                            <CreditCard className="mx-auto" style={{ width: '40px', height: '40px', color: 'var(--color-text-muted)', marginBottom: '12px' }} />
                                            <p style={{ color: 'var(--color-text-secondary)' }}>{t('settings.no_cards')}</p>
                                            <button onClick={() => alert(t('settings.add_card_coming_soon'))} style={{ marginTop: '12px', color: 'var(--color-text-accent)', fontSize: 'var(--font-size-sm)', background: 'none', border: 'none', cursor: 'pointer' }}>
                                                {t('settings.add_card')}
                                            </button>
                                        </div>
                                    </div>
                                </div>
                            )}
                        </div>
                    </div>
                </div>
            </div>
        </div>
    );
};

export default SettingsPage;
