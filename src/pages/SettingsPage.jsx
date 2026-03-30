import { useState, useEffect } from 'react';
import { Link, useNavigate } from 'react-router-dom';
import { Settings, User, Lock, Bell, Globe, CreditCard, ArrowDownCircle, ArrowUpCircle, Trash2, Camera, Save, AlertCircle, CheckCircle, Send, Eye, EyeOff, ShieldCheck, ShieldAlert, Mail, MessageCircle, Chrome, LogOut } from 'lucide-react';
import { useAuth } from '../context/AuthContext';
import UserAvatar from '../components/UserAvatar';
import { useLanguage, languages as langList } from '../context/LanguageContext';

const SettingsPage = () => {
    const navigate = useNavigate();
    const { user, isAuthenticated, updateProfile, logout } = useAuth();
    const { t, language, setLanguage } = useLanguage();
    const [activeTab, setActiveTab] = useState('profile');
    const [isSaving, setIsSaving] = useState(false);
    const [message, setMessage] = useState({ type: '', text: '' });

    const [profileData, setProfileData] = useState({
        name: user?.name ?? user?.display_name ?? user?.full_name ?? '',
        phone: user?.phone_number ?? user?.phone ?? '',
        bio: user?.bio ?? ''
    });

    useEffect(() => {
        if (user) {
            setProfileData(prev => ({
                ...prev,
                name: user.name ?? user.display_name ?? user.full_name ?? prev.name,
                phone: user.phone_number ?? user.phone ?? prev.phone,
                bio: user.bio ?? prev.bio
            }));
        }
    }, [user]);

    const [passwordData, setPasswordData] = useState({
        currentPassword: '',
        newPassword: '',
        confirmPassword: ''
    });
    const [showPasswords, setShowPasswords] = useState({
        current: false, new: false, confirm: false
    });
    const [deletePasswordInput, setDeletePasswordInput] = useState('');
    const [showDeleteModal, setShowDeleteModal] = useState(false);
    const [isLoggingOutAll, setIsLoggingOutAll] = useState(false);

    const [notifications, setNotifications] = useState({
        telegram: true, push: true, sales: true, messages: true, updates: false
    });
    const [avatarUploading, setAvatarUploading] = useState(false);

    useEffect(() => {
        if (!isAuthenticated) navigate('/login');
    }, [isAuthenticated, navigate]);

    const compressImage = (file, maxSizeMB = 2, maxDim = 1024) =>
        new Promise((resolve, reject) => {
            const img = new Image();
            const url = URL.createObjectURL(file);
            img.onload = () => {
                URL.revokeObjectURL(url);
                let { width, height } = img;
                if (width > maxDim || height > maxDim) {
                    const ratio = Math.min(maxDim / width, maxDim / height);
                    width = Math.round(width * ratio);
                    height = Math.round(height * ratio);
                }
                const canvas = document.createElement('canvas');
                canvas.width = width;
                canvas.height = height;
                canvas.getContext('2d').drawImage(img, 0, 0, width, height);
                let quality = 0.85;
                const tryBlob = () => {
                    canvas.toBlob((blob) => {
                        if (!blob) { reject(new Error('Compress failed')); return; }
                        if (blob.size <= maxSizeMB * 1024 * 1024 || quality < 0.3) {
                            resolve(new File([blob], file.name, { type: 'image/jpeg' }));
                        } else {
                            quality -= 0.1;
                            tryBlob();
                        }
                    }, 'image/jpeg', quality);
                };
                tryBlob();
            };
            img.onerror = reject;
            img.src = url;
        });

    const handleAvatarChange = async (e) => {
        const file = e.target.files?.[0];
        if (!file || !file.type.startsWith('image/')) return;
        if (file.size > 20 * 1024 * 1024) {
            setMessage({ type: 'error', text: t('settings.avatar_too_large') || 'Rasm 20MB dan oshmasin' });
            return;
        }
        setAvatarUploading(true);
        setMessage({ type: '', text: '' });
        try {
            const compressed = file.size > 2 * 1024 * 1024 ? await compressImage(file) : file;
            const form = new FormData();
            form.append('avatar', compressed);
            await updateProfile(form);
            setMessage({ type: 'success', text: t('settings.profile_updated') || 'Profil yangilandi' });
        } catch (err) {
            const data = err?.response?.data;
            let text = err?.message || t('settings.generic_error');
            if (data && (typeof data === 'string')) text = data;
            else if (data?.detail) text = typeof data.detail === 'string' ? data.detail : JSON.stringify(data.detail);
            else if (data?.avatar) text = Array.isArray(data.avatar) ? data.avatar[0] : data.avatar;
            setMessage({ type: 'error', text });
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
            // Backend requires authenticated user — use apiClient (sends Bearer token)
            const apiClient = (await import('../lib/apiClient')).default;
            await apiClient.post('/auth/password/change/', {
                old_password: passwordData.currentPassword,
                new_password: passwordData.newPassword,
                new_password_confirm: passwordData.confirmPassword,
            });

            setMessage({ type: 'success', text: t('settings.password_changed') });
            setPasswordData({ currentPassword: '', newPassword: '', confirmPassword: '' });
        } catch (err) {
            const errorMsg = err.response?.data?.error || err.response?.data?.detail || t('settings.generic_error');
            setMessage({ type: 'error', text: errorMsg });
        } finally {
            setIsSaving(false);
        }
    };

    const handleDeleteAccount = async () => {
        if (!deletePasswordInput.trim()) {
            setMessage({ type: 'error', text: t('settings.fill_all') });
            return;
        }
        setIsSaving(true);
        setMessage({ type: '', text: '' });
        try {
            const apiClient = (await import('../lib/apiClient')).default;
            await apiClient.post('/auth/account/delete/', { password: deletePasswordInput });
        } catch (err) {
            const msg = err?.response?.data?.error?.message || err?.response?.data?.detail || t('settings.generic_error');
            setMessage({ type: 'error', text: msg });
            setIsSaving(false);
            return;
        }
        setShowDeleteModal(false);
        await logout();
        navigate('/');
    };

    const handleLogoutAllDevices = async () => {
        setIsLoggingOutAll(true);
        setMessage({ type: '', text: '' });
        try {
            const apiClient = (await import('../lib/apiClient')).default;
            await apiClient.post('/auth/logout/');
        } catch {
            // token allaqachon bekor — baribir logout
        } finally {
            setIsLoggingOutAll(false);
        }
        await logout();
        navigate('/login');
    };

    const getPasswordStrength = (pwd) => {
        if (!pwd) return { score: 0, label: '', color: '' };
        let score = 0;
        if (pwd.length >= 8) score++;
        if (pwd.length >= 12) score++;
        if (/[A-Z]/.test(pwd)) score++;
        if (/[0-9]/.test(pwd)) score++;
        if (/[^A-Za-z0-9]/.test(pwd)) score++;
        if (score <= 1) return { score, label: t('settings.pwd_weak') || 'Zaif', color: 'var(--color-error)' };
        if (score <= 3) return { score, label: t('settings.pwd_medium') || "O'rtacha", color: 'var(--color-warning)' };
        return { score, label: t('settings.pwd_strong') || 'Kuchli', color: 'var(--color-accent-green)' };
    };

    const notificationItems = [
        { key: 'telegram', label: t('settings.telegram_notif'), desc: t('settings.telegram_notif_desc') },
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
                    <div className="settings-sidebar-wrap" style={{ flexShrink: 0 }}>
                        <div className="settings-sidebar" style={{ ...cardStyle, padding: '8px' }}>
                            <nav className="settings-nav" style={{ display: 'flex', flexDirection: 'column', gap: '2px' }}>
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

                                    {/* Avatar — yuklangan rasm bor bo'lsa rasm, yo'q bo'lsa standart icon */}
                                    <div className="flex items-center gap-4" style={{ marginBottom: '24px' }}>
                                        <div className="relative">
                                            <UserAvatar
                                                src={user?.avatar}
                                                size={64}
                                                name={user?.name || 'User'}
                                                style={{ borderRadius: 'var(--radius-xl)' }}
                                            />
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
                                            <p style={{ fontWeight: 'var(--font-weight-medium)', color: 'var(--color-text-primary)' }}>{user?.name || user?.display_name || user?.full_name}</p>
                                            <p style={{ fontSize: 'var(--font-size-sm)', color: 'var(--color-text-muted)' }}>{user?.phone_number || user?.phone || ''}</p>
                                        </div>
                                    </div>

                                    {/* Telegram account — ID va raqam (faqat ko'rsatish) */}
                                    <div style={{ marginBottom: '20px' }}>
                                        <label className="input-label">{t('settings.telegram_account') || 'Telegram akkaunt'}</label>
                                        <div style={{ display: 'flex', flexDirection: 'column', gap: '8px' }}>
                                            <div style={{ display: 'flex', alignItems: 'center', gap: '12px', flexWrap: 'wrap' }}>
                                                <span style={{ fontSize: 'var(--font-size-sm)', color: 'var(--color-text-muted)' }}>{t('settings.telegram_id') || 'Telegram ID'}:</span>
                                                <span style={{ fontFamily: 'monospace', fontSize: 'var(--font-size-sm)', color: 'var(--color-text-primary)' }}>
                                                    {user?.telegram_id ?? (user?.email && String(user.email).startsWith('tg_') ? String(user.email).replace(/@.*$/, '').replace('tg_', '') : '—')}
                                                </span>
                                            </div>
                                            <div style={{ display: 'flex', alignItems: 'center', gap: '12px', flexWrap: 'wrap' }}>
                                                <span style={{ fontSize: 'var(--font-size-sm)', color: 'var(--color-text-muted)' }}>{t('settings.phone') || 'Telefon raqam'}:</span>
                                                <span style={{ fontSize: 'var(--font-size-sm)', color: 'var(--color-text-primary)' }}>{user?.phone_number || user?.phone || '—'}</span>
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

                                    {/* Hisob xavfsizligi holati */}
                                    <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(180px, 1fr))', gap: '10px', marginBottom: '28px' }}>
                                        {[
                                            {
                                                icon: Mail,
                                                label: 'Email',
                                                value: user?.email || '—',
                                                ok: !!user?.is_verified,
                                                okText: t('settings.verified') || 'Tasdiqlangan',
                                                failText: t('settings.not_verified') || 'Tasdiqlanmagan',
                                            },
                                            {
                                                icon: MessageCircle,
                                                label: 'Telegram',
                                                value: user?.telegram_id ? `ID: ${user.telegram_id}` : t('settings.not_linked') || "Bog'lanmagan",
                                                ok: !!user?.telegram_id,
                                                okText: t('settings.linked') || "Bog'langan",
                                                failText: t('settings.not_linked') || "Bog'lanmagan",
                                            },
                                            {
                                                icon: Chrome,
                                                label: 'Google',
                                                value: user?.google_id || user?.social_accounts?.google ? user?.email : t('settings.not_linked') || "Bog'lanmagan",
                                                ok: !!(user?.google_id || user?.social_accounts?.google),
                                                okText: t('settings.linked') || "Bog'langan",
                                                failText: t('settings.not_linked') || "Bog'lanmagan",
                                            },
                                        ].map((item) => (
                                            <div key={item.label} style={{
                                                padding: '14px',
                                                borderRadius: 'var(--radius-lg)',
                                                backgroundColor: item.ok ? 'var(--color-success-bg)' : 'var(--color-bg-secondary)',
                                                border: `1px solid ${item.ok ? 'var(--color-accent-green)' : 'var(--color-border-muted)'}`,
                                            }}>
                                                <div className="flex items-center gap-2" style={{ marginBottom: '6px' }}>
                                                    <item.icon style={{ width: '14px', height: '14px', color: item.ok ? 'var(--color-accent-green)' : 'var(--color-text-muted)' }} />
                                                    <span style={{ fontSize: 'var(--font-size-sm)', fontWeight: 'var(--font-weight-medium)', color: 'var(--color-text-primary)' }}>{item.label}</span>
                                                    {item.ok
                                                        ? <ShieldCheck style={{ width: '12px', height: '12px', color: 'var(--color-accent-green)', marginLeft: 'auto' }} />
                                                        : <ShieldAlert style={{ width: '12px', height: '12px', color: 'var(--color-text-muted)', marginLeft: 'auto' }} />
                                                    }
                                                </div>
                                                <p style={{ fontSize: 'var(--font-size-xs)', color: 'var(--color-text-muted)', marginBottom: '2px', wordBreak: 'break-all' }}>{item.value}</p>
                                                <p style={{ fontSize: 'var(--font-size-xs)', color: item.ok ? 'var(--color-accent-green)' : 'var(--color-text-muted)', fontWeight: 'var(--font-weight-medium)' }}>
                                                    {item.ok ? item.okText : item.failText}
                                                </p>
                                            </div>
                                        ))}
                                    </div>

                                    {/* Parolni o'zgartirish */}
                                    <h3 style={{ fontSize: 'var(--font-size-base)', fontWeight: 'var(--font-weight-semibold)', color: 'var(--color-text-primary)', marginBottom: '14px' }}>
                                        {t('settings.change_password')}
                                    </h3>
                                    <form
                                        onSubmit={(e) => { e.preventDefault(); handlePasswordChange(); }}
                                        style={{ display: 'flex', flexDirection: 'column', gap: '14px', marginBottom: '20px' }}
                                        autoComplete="on"
                                    >
                                        {/* Joriy parol */}
                                        <div>
                                            <label className="input-label">{t('settings.current_password')}</label>
                                            <div style={{ position: 'relative' }}>
                                                <input
                                                    type={showPasswords.current ? 'text' : 'password'}
                                                    value={passwordData.currentPassword}
                                                    onChange={(e) => setPasswordData({ ...passwordData, currentPassword: e.target.value })}
                                                    className={inputStyle}
                                                    autoComplete="current-password"
                                                    style={{ paddingRight: '44px' }}
                                                />
                                                <button type="button" onClick={() => setShowPasswords(p => ({ ...p, current: !p.current }))}
                                                    style={{ position: 'absolute', right: '12px', top: '50%', transform: 'translateY(-50%)', background: 'none', border: 'none', cursor: 'pointer', color: 'var(--color-text-muted)', padding: '4px' }}>
                                                    {showPasswords.current ? <EyeOff className="w-4 h-4" /> : <Eye className="w-4 h-4" />}
                                                </button>
                                            </div>
                                        </div>

                                        {/* Yangi parol */}
                                        <div>
                                            <label className="input-label">{t('settings.new_password')}</label>
                                            <div style={{ position: 'relative' }}>
                                                <input
                                                    type={showPasswords.new ? 'text' : 'password'}
                                                    value={passwordData.newPassword}
                                                    onChange={(e) => setPasswordData({ ...passwordData, newPassword: e.target.value })}
                                                    className={inputStyle}
                                                    autoComplete="new-password"
                                                    style={{ paddingRight: '44px' }}
                                                />
                                                <button type="button" onClick={() => setShowPasswords(p => ({ ...p, new: !p.new }))}
                                                    style={{ position: 'absolute', right: '12px', top: '50%', transform: 'translateY(-50%)', background: 'none', border: 'none', cursor: 'pointer', color: 'var(--color-text-muted)', padding: '4px' }}>
                                                    {showPasswords.new ? <EyeOff className="w-4 h-4" /> : <Eye className="w-4 h-4" />}
                                                </button>
                                            </div>
                                            {/* Parol kuchi */}
                                            {passwordData.newPassword && (() => {
                                                const s = getPasswordStrength(passwordData.newPassword);
                                                return (
                                                    <div style={{ marginTop: '8px' }}>
                                                        <div style={{ display: 'flex', gap: '4px', marginBottom: '4px' }}>
                                                            {[1,2,3,4,5].map(i => (
                                                                <div key={i} style={{
                                                                    flex: 1, height: '4px', borderRadius: '2px',
                                                                    backgroundColor: i <= s.score ? s.color : 'var(--color-border-muted)',
                                                                    transition: 'background-color 0.2s',
                                                                }} />
                                                            ))}
                                                        </div>
                                                        <p style={{ fontSize: 'var(--font-size-xs)', color: s.color, fontWeight: 'var(--font-weight-medium)' }}>{s.label}</p>
                                                    </div>
                                                );
                                            })()}
                                        </div>

                                        {/* Parolni tasdiqlash */}
                                        <div>
                                            <label className="input-label">{t('settings.confirm_password')}</label>
                                            <div style={{ position: 'relative' }}>
                                                <input
                                                    type={showPasswords.confirm ? 'text' : 'password'}
                                                    value={passwordData.confirmPassword}
                                                    onChange={(e) => setPasswordData({ ...passwordData, confirmPassword: e.target.value })}
                                                    className={inputStyle}
                                                    autoComplete="new-password"
                                                    style={{
                                                        paddingRight: '44px',
                                                        borderColor: passwordData.confirmPassword && passwordData.newPassword !== passwordData.confirmPassword
                                                            ? 'var(--color-error)' : undefined,
                                                    }}
                                                />
                                                <button type="button" onClick={() => setShowPasswords(p => ({ ...p, confirm: !p.confirm }))}
                                                    style={{ position: 'absolute', right: '12px', top: '50%', transform: 'translateY(-50%)', background: 'none', border: 'none', cursor: 'pointer', color: 'var(--color-text-muted)', padding: '4px' }}>
                                                    {showPasswords.confirm ? <EyeOff className="w-4 h-4" /> : <Eye className="w-4 h-4" />}
                                                </button>
                                            </div>
                                            {passwordData.confirmPassword && passwordData.newPassword !== passwordData.confirmPassword && (
                                                <p style={{ fontSize: 'var(--font-size-xs)', color: 'var(--color-error)', marginTop: '4px' }}>{t('settings.passwords_mismatch')}</p>
                                            )}
                                        </div>

                                        <button type="submit" disabled={isSaving} className="btn btn-primary btn-lg" style={{ alignSelf: 'flex-start' }}>
                                            <Lock className="w-4 h-4" />
                                            {isSaving ? t('settings.changing_password') : t('settings.change_password')}
                                        </button>
                                    </form>

                                    {/* Barcha qurilmalardan chiqish */}
                                    <div style={{ marginTop: '24px', paddingTop: '24px', borderTop: '1px solid var(--color-border-muted)' }}>
                                        <div className="flex items-start justify-between" style={{ gap: '16px', flexWrap: 'wrap' }}>
                                            <div>
                                                <h3 style={{ fontWeight: 'var(--font-weight-medium)', color: 'var(--color-text-primary)', marginBottom: '4px' }}>
                                                    {t('settings.logout_all') || 'Barcha qurilmalardan chiqish'}
                                                </h3>
                                                <p style={{ fontSize: 'var(--font-size-sm)', color: 'var(--color-text-muted)' }}>
                                                    {t('settings.logout_all_desc') || 'Barcha faol sessiyalar yakunlanadi. Joriy qurilmadan ham chiqiladi.'}
                                                </p>
                                            </div>
                                            <button
                                                onClick={handleLogoutAllDevices}
                                                disabled={isLoggingOutAll}
                                                className="btn btn-secondary btn-sm"
                                                style={{ flexShrink: 0, display: 'flex', alignItems: 'center', gap: '6px' }}
                                            >
                                                <LogOut className="w-4 h-4" />
                                                {isLoggingOutAll ? (t('settings.saving') || 'Yuborilmoqda...') : (t('settings.logout_all_btn') || 'Chiqish')}
                                            </button>
                                        </div>
                                    </div>

                                    {/* Xavfli zona */}
                                    <div style={{ marginTop: '24px', paddingTop: '24px', borderTop: '1px solid var(--color-border-muted)' }}>
                                        <h3 style={{ fontWeight: 'var(--font-weight-medium)', color: 'var(--color-error)', marginBottom: '8px' }}>{t('settings.danger_zone')}</h3>
                                        <p style={{ fontSize: 'var(--font-size-sm)', color: 'var(--color-text-secondary)', marginBottom: '16px' }}>{t('settings.delete_warning')}</p>
                                        <button
                                            onClick={() => { setShowDeleteModal(true); setDeletePasswordInput(''); setMessage({ type: '', text: '' }); }}
                                            className="btn btn-danger btn-md"
                                        >
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
                                        <p style={{ fontSize: 'var(--font-size-3xl)', fontWeight: 'var(--font-weight-bold)', color: '#ffffff' }}>{Number(user?.balance ?? 0).toLocaleString('uz-UZ')} UZS</p>
                                    </div>

                                    {/* Actions */}
                                    <div className="grid grid-cols-2" style={{ gap: '12px', marginBottom: '24px' }}>
                                        <button
                                            className="text-center"
                                            onClick={() => window.open(`https://t.me/${import.meta.env.VITE_TELEGRAM_BOT_USERNAME || 'wibestorebot'}?start=topup`, '_blank')}
                                            style={{
                                                padding: '16px',
                                                borderRadius: 'var(--radius-lg)',
                                                backgroundColor: 'var(--color-bg-secondary)',
                                                border: '1px solid var(--color-border-default)',
                                                cursor: 'pointer',
                                                transition: 'all 0.15s ease',
                                            }}
                                        >
                                            <ArrowDownCircle className="mx-auto" style={{ width: '24px', height: '24px', color: 'var(--color-accent-green)', marginBottom: '8px' }} />
                                            <p style={{ fontWeight: 'var(--font-weight-medium)', color: 'var(--color-text-primary)' }}>{t('settings.topup_balance') || 'Hisobni to\'ldirish'}</p>
                                            <p style={{ fontSize: 'var(--font-size-xs)', color: 'var(--color-text-muted)', marginTop: '4px', display: 'flex', alignItems: 'center', justifyContent: 'center', gap: '4px' }}>
                                                <Send style={{ width: '10px', height: '10px', color: '#2AABEE' }} /> Telegram bot
                                            </p>
                                        </button>
                                        <button
                                            className="text-center"
                                            onClick={() => window.open(`https://t.me/${import.meta.env.VITE_TELEGRAM_BOT_USERNAME || 'wibestorebot'}?start=withdraw`, '_blank')}
                                            style={{
                                                padding: '16px',
                                                borderRadius: 'var(--radius-lg)',
                                                backgroundColor: 'var(--color-bg-secondary)',
                                                border: '1px solid var(--color-border-default)',
                                                cursor: 'pointer',
                                                transition: 'all 0.15s ease',
                                            }}
                                        >
                                            <ArrowUpCircle className="mx-auto" style={{ width: '24px', height: '24px', color: 'var(--color-accent-blue)', marginBottom: '8px' }} />
                                            <p style={{ fontWeight: 'var(--font-weight-medium)', color: 'var(--color-text-primary)' }}>{t('settings.withdraw_balance') || 'Pul yechish'}</p>
                                            <p style={{ fontSize: 'var(--font-size-xs)', color: 'var(--color-text-muted)', marginTop: '4px', display: 'flex', alignItems: 'center', justifyContent: 'center', gap: '4px' }}>
                                                <Send style={{ width: '10px', height: '10px', color: '#2AABEE' }} /> Telegram bot
                                            </p>
                                        </button>
                                    </div>

                                    {/* Info */}
                                    <div style={{
                                        padding: '14px 16px',
                                        borderRadius: 'var(--radius-lg)',
                                        backgroundColor: 'var(--color-info-bg)',
                                        border: '1px solid var(--color-accent-blue)',
                                        display: 'flex',
                                        alignItems: 'flex-start',
                                        gap: '10px',
                                    }}>
                                        <Send style={{ width: '16px', height: '16px', color: '#2AABEE', flexShrink: 0, marginTop: '2px' }} />
                                        <div>
                                            <p style={{ fontWeight: 'var(--font-weight-medium)', color: 'var(--color-text-primary)', fontSize: 'var(--font-size-sm)' }}>
                                                {t('settings.wallet_via_telegram') || 'Hisob to\'ldirish va pul yechish Telegram bot orqali amalga oshiriladi'}
                                            </p>
                                            <p style={{ fontSize: 'var(--font-size-xs)', color: 'var(--color-text-muted)', marginTop: '2px' }}>
                                                @{import.meta.env.VITE_TELEGRAM_BOT_USERNAME || 'wibestorebot'}
                                            </p>
                                        </div>
                                    </div>
                                </div>
                            )}
                        </div>
                    </div>
                </div>
            </div>

            {/* Hisobni o'chirish modali */}
            {showDeleteModal && (
                <div
                    className="modal-overlay"
                    onClick={() => setShowDeleteModal(false)}
                    style={{ zIndex: 1000 }}
                >
                    <div
                        className="modal-container"
                        onClick={(e) => e.stopPropagation()}
                        style={{ maxWidth: '420px' }}
                    >
                        <div style={{ padding: '24px' }}>
                            <div className="flex items-center gap-3" style={{ marginBottom: '16px' }}>
                                <div style={{ width: '40px', height: '40px', borderRadius: 'var(--radius-full)', backgroundColor: 'var(--color-error-bg)', display: 'flex', alignItems: 'center', justifyContent: 'center', flexShrink: 0 }}>
                                    <Trash2 style={{ width: '18px', height: '18px', color: 'var(--color-error)' }} />
                                </div>
                                <div>
                                    <h3 style={{ fontWeight: 'var(--font-weight-bold)', color: 'var(--color-text-primary)', fontSize: 'var(--font-size-base)' }}>{t('settings.delete_account')}</h3>
                                    <p style={{ fontSize: 'var(--font-size-sm)', color: 'var(--color-text-muted)' }}>{t('settings.delete_confirm')}</p>
                                </div>
                            </div>

                            {message.text && (
                                <div className="flex items-center gap-2" style={{ padding: '10px 14px', borderRadius: 'var(--radius-md)', marginBottom: '14px', backgroundColor: 'var(--color-error-bg)', border: '1px solid var(--color-error)', color: 'var(--color-error)', fontSize: 'var(--font-size-sm)' }}>
                                    <AlertCircle className="w-4 h-4 flex-shrink-0" />
                                    <span>{message.text}</span>
                                </div>
                            )}

                            <form onSubmit={(e) => { e.preventDefault(); handleDeleteAccount(); }}>
                                <label className="input-label">{t('settings.current_password')}</label>
                                <input
                                    type="password"
                                    value={deletePasswordInput}
                                    onChange={(e) => setDeletePasswordInput(e.target.value)}
                                    className="input input-lg"
                                    autoComplete="current-password"
                                    placeholder="••••••••"
                                    style={{ marginBottom: '16px' }}
                                />
                                <div className="flex gap-3">
                                    <button type="button" onClick={() => setShowDeleteModal(false)} className="btn btn-secondary btn-md flex-1" disabled={isSaving}>
                                        {t('settings.cancel')}
                                    </button>
                                    <button type="submit" className="btn btn-danger btn-md flex-1" disabled={isSaving || !deletePasswordInput.trim()}>
                                        <Trash2 className="w-4 h-4" />
                                        {isSaving ? t('settings.saving') : t('settings.delete_account')}
                                    </button>
                                </div>
                            </form>
                        </div>
                    </div>
                </div>
            )}
        </div>
    );
};

export default SettingsPage;
