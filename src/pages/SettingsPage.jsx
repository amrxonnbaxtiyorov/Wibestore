import { useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { Settings, User, Lock, Bell, Globe, CreditCard, Shield, Trash2, Camera, Save, AlertCircle, CheckCircle } from 'lucide-react';
import { useAuth } from '../context/AuthContext';

const SettingsPage = () => {
    const navigate = useNavigate();
    const { user, isAuthenticated, updateProfile, logout } = useAuth();
    const [activeTab, setActiveTab] = useState('profile');
    const [isSaving, setIsSaving] = useState(false);
    const [message, setMessage] = useState({ type: '', text: '' });

    const [profileData, setProfileData] = useState({
        name: user?.name || '',
        email: user?.email || '',
        phone: user?.phone || '',
        bio: user?.bio || ''
    });

    const [passwordData, setPasswordData] = useState({
        currentPassword: '',
        newPassword: '',
        confirmPassword: ''
    });

    const [notifications, setNotifications] = useState({
        email: true,
        push: true,
        sales: true,
        messages: true,
        updates: false
    });

    const [language, setLanguage] = useState('uz');

    if (!isAuthenticated) {
        navigate('/login');
        return null;
    }

    const tabs = [
        { id: 'profile', label: 'Profil', icon: User },
        { id: 'security', label: 'Xavfsizlik', icon: Lock },
        { id: 'notifications', label: 'Bildirishnomalar', icon: Bell },
        { id: 'language', label: 'Til', icon: Globe },
        { id: 'wallet', label: 'Hamyon', icon: CreditCard },
    ];

    const handleProfileSave = async () => {
        setIsSaving(true);
        setMessage({ type: '', text: '' });

        await new Promise(resolve => setTimeout(resolve, 1000));

        updateProfile(profileData);
        setMessage({ type: 'success', text: 'Profil muvaffaqiyatli yangilandi!' });
        setIsSaving(false);
    };

    const handlePasswordChange = async () => {
        setMessage({ type: '', text: '' });

        if (!passwordData.currentPassword || !passwordData.newPassword || !passwordData.confirmPassword) {
            setMessage({ type: 'error', text: 'Barcha maydonlarni to\'ldiring' });
            return;
        }

        if (passwordData.newPassword !== passwordData.confirmPassword) {
            setMessage({ type: 'error', text: 'Yangi parollar bir xil emas' });
            return;
        }

        if (passwordData.newPassword.length < 6) {
            setMessage({ type: 'error', text: 'Parol kamida 6 ta belgidan iborat bo\'lishi kerak' });
            return;
        }

        setIsSaving(true);
        await new Promise(resolve => setTimeout(resolve, 1000));

        setMessage({ type: 'success', text: 'Parol muvaffaqiyatli o\'zgartirildi!' });
        setPasswordData({ currentPassword: '', newPassword: '', confirmPassword: '' });
        setIsSaving(false);
    };

    const handleDeleteAccount = () => {
        if (window.confirm('Hisobingizni o\'chirishni xohlaysizmi? Bu amalni qaytarib bo\'lmaydi!')) {
            logout();
            navigate('/');
        }
    };

    return (
        <div className="min-h-screen pt-24 pb-16">
            <div className="max-w-4xl mx-auto px-4 sm:px-6 lg:px-8">
                {/* Header */}
                <div className="mb-8">
                    <h1 className="text-2xl font-bold text-white flex items-center gap-3">
                        <Settings className="w-7 h-7 text-purple-400" />
                        Sozlamalar
                    </h1>
                    <p className="text-gray-400 mt-1">Hisobingiz sozlamalarini boshqaring</p>
                </div>

                <div className="flex flex-col lg:flex-row gap-6">
                    {/* Sidebar */}
                    <div className="lg:w-64 flex-shrink-0">
                        <div className="bg-[#1e1e32] rounded-2xl p-4 border border-white/5">
                            <nav className="space-y-1">
                                {tabs.map((tab) => (
                                    <button
                                        key={tab.id}
                                        onClick={() => {
                                            setActiveTab(tab.id);
                                            setMessage({ type: '', text: '' });
                                        }}
                                        className={`w-full flex items-center gap-3 px-4 py-3 rounded-xl text-left transition-colors ${activeTab === tab.id
                                                ? 'bg-purple-500/20 text-purple-400'
                                                : 'text-gray-400 hover:bg-[#25253a] hover:text-white'
                                            }`}
                                    >
                                        <tab.icon className="w-5 h-5" />
                                        {tab.label}
                                    </button>
                                ))}
                            </nav>
                        </div>
                    </div>

                    {/* Content */}
                    <div className="flex-1">
                        <div className="bg-[#1e1e32] rounded-2xl p-6 lg:p-8 border border-white/5">
                            {/* Message */}
                            {message.text && (
                                <div className={`flex items-center gap-3 p-4 rounded-xl mb-6 ${message.type === 'success'
                                        ? 'bg-green-500/10 border border-green-500/30 text-green-400'
                                        : 'bg-red-500/10 border border-red-500/30 text-red-400'
                                    }`}>
                                    {message.type === 'success' ? (
                                        <CheckCircle className="w-5 h-5 flex-shrink-0" />
                                    ) : (
                                        <AlertCircle className="w-5 h-5 flex-shrink-0" />
                                    )}
                                    <span>{message.text}</span>
                                </div>
                            )}

                            {/* Profile Tab */}
                            {activeTab === 'profile' && (
                                <div className="space-y-6">
                                    <h2 className="text-xl font-bold text-white">Profil ma'lumotlari</h2>

                                    {/* Avatar */}
                                    <div className="flex items-center gap-4">
                                        <div className="relative">
                                            <div className="w-20 h-20 bg-gradient-to-br from-purple-500 to-pink-500 rounded-2xl flex items-center justify-center text-3xl font-bold text-white">
                                                {user?.name?.charAt(0)?.toUpperCase() || 'U'}
                                            </div>
                                            <button className="absolute -bottom-1 -right-1 w-8 h-8 bg-purple-500 rounded-xl flex items-center justify-center hover:bg-purple-600 transition-colors">
                                                <Camera className="w-4 h-4 text-white" />
                                            </button>
                                        </div>
                                        <div>
                                            <p className="text-white font-medium">{user?.name}</p>
                                            <p className="text-sm text-gray-400">{user?.email}</p>
                                        </div>
                                    </div>

                                    {/* Form */}
                                    <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                                        <div>
                                            <label className="block text-sm font-medium text-gray-300 mb-2">Ism</label>
                                            <input
                                                type="text"
                                                value={profileData.name}
                                                onChange={(e) => setProfileData({ ...profileData, name: e.target.value })}
                                                className="w-full px-4 py-3 bg-[#25253a] border border-white/10 rounded-xl text-white focus:outline-none focus:border-purple-500/50"
                                            />
                                        </div>
                                        <div>
                                            <label className="block text-sm font-medium text-gray-300 mb-2">Email</label>
                                            <input
                                                type="email"
                                                value={profileData.email}
                                                onChange={(e) => setProfileData({ ...profileData, email: e.target.value })}
                                                className="w-full px-4 py-3 bg-[#25253a] border border-white/10 rounded-xl text-white focus:outline-none focus:border-purple-500/50"
                                            />
                                        </div>
                                        <div className="md:col-span-2">
                                            <label className="block text-sm font-medium text-gray-300 mb-2">Telefon</label>
                                            <input
                                                type="tel"
                                                value={profileData.phone}
                                                onChange={(e) => setProfileData({ ...profileData, phone: e.target.value })}
                                                placeholder="+998 90 123 45 67"
                                                className="w-full px-4 py-3 bg-[#25253a] border border-white/10 rounded-xl text-white placeholder:text-gray-500 focus:outline-none focus:border-purple-500/50"
                                            />
                                        </div>
                                        <div className="md:col-span-2">
                                            <label className="block text-sm font-medium text-gray-300 mb-2">Bio</label>
                                            <textarea
                                                value={profileData.bio}
                                                onChange={(e) => setProfileData({ ...profileData, bio: e.target.value })}
                                                placeholder="O'zingiz haqingizda..."
                                                rows={3}
                                                className="w-full px-4 py-3 bg-[#25253a] border border-white/10 rounded-xl text-white placeholder:text-gray-500 focus:outline-none focus:border-purple-500/50 resize-none"
                                            />
                                        </div>
                                    </div>

                                    <button
                                        onClick={handleProfileSave}
                                        disabled={isSaving}
                                        className="flex items-center gap-2 px-6 py-3 bg-gradient-to-r from-purple-500 to-pink-500 rounded-xl text-white font-semibold hover:opacity-90 transition-opacity disabled:opacity-50"
                                    >
                                        <Save className="w-4 h-4" />
                                        {isSaving ? 'Saqlanmoqda...' : 'Saqlash'}
                                    </button>
                                </div>
                            )}

                            {/* Security Tab */}
                            {activeTab === 'security' && (
                                <div className="space-y-6">
                                    <h2 className="text-xl font-bold text-white">Xavfsizlik</h2>

                                    <div className="space-y-4">
                                        <div>
                                            <label className="block text-sm font-medium text-gray-300 mb-2">Joriy parol</label>
                                            <input
                                                type="password"
                                                value={passwordData.currentPassword}
                                                onChange={(e) => setPasswordData({ ...passwordData, currentPassword: e.target.value })}
                                                className="w-full px-4 py-3 bg-[#25253a] border border-white/10 rounded-xl text-white focus:outline-none focus:border-purple-500/50"
                                            />
                                        </div>
                                        <div>
                                            <label className="block text-sm font-medium text-gray-300 mb-2">Yangi parol</label>
                                            <input
                                                type="password"
                                                value={passwordData.newPassword}
                                                onChange={(e) => setPasswordData({ ...passwordData, newPassword: e.target.value })}
                                                className="w-full px-4 py-3 bg-[#25253a] border border-white/10 rounded-xl text-white focus:outline-none focus:border-purple-500/50"
                                            />
                                        </div>
                                        <div>
                                            <label className="block text-sm font-medium text-gray-300 mb-2">Parolni tasdiqlash</label>
                                            <input
                                                type="password"
                                                value={passwordData.confirmPassword}
                                                onChange={(e) => setPasswordData({ ...passwordData, confirmPassword: e.target.value })}
                                                className="w-full px-4 py-3 bg-[#25253a] border border-white/10 rounded-xl text-white focus:outline-none focus:border-purple-500/50"
                                            />
                                        </div>
                                    </div>

                                    <button
                                        onClick={handlePasswordChange}
                                        disabled={isSaving}
                                        className="flex items-center gap-2 px-6 py-3 bg-gradient-to-r from-purple-500 to-pink-500 rounded-xl text-white font-semibold hover:opacity-90 transition-opacity disabled:opacity-50"
                                    >
                                        <Lock className="w-4 h-4" />
                                        {isSaving ? 'O\'zgartirilmoqda...' : 'Parolni o\'zgartirish'}
                                    </button>

                                    {/* 2FA */}
                                    <div className="mt-8 pt-6 border-t border-white/5">
                                        <div className="flex items-center justify-between">
                                            <div>
                                                <h3 className="text-white font-medium">Ikki bosqichli autentifikatsiya (2FA)</h3>
                                                <p className="text-sm text-gray-400 mt-1">Qo'shimcha xavfsizlik uchun 2FA yoqing</p>
                                            </div>
                                            <button className="px-4 py-2 bg-[#25253a] rounded-xl text-gray-400 hover:text-white transition-colors">
                                                Yoqish
                                            </button>
                                        </div>
                                    </div>

                                    {/* Delete Account */}
                                    <div className="mt-8 pt-6 border-t border-white/5">
                                        <h3 className="text-red-400 font-medium mb-2">Xavfli zona</h3>
                                        <p className="text-sm text-gray-400 mb-4">Hisobni o'chirsangiz, barcha ma'lumotlaringiz yo'qoladi.</p>
                                        <button
                                            onClick={handleDeleteAccount}
                                            className="flex items-center gap-2 px-4 py-2 bg-red-500/10 border border-red-500/30 rounded-xl text-red-400 hover:bg-red-500/20 transition-colors"
                                        >
                                            <Trash2 className="w-4 h-4" />
                                            Hisobni o'chirish
                                        </button>
                                    </div>
                                </div>
                            )}

                            {/* Notifications Tab */}
                            {activeTab === 'notifications' && (
                                <div className="space-y-6">
                                    <h2 className="text-xl font-bold text-white">Bildirishnomalar</h2>

                                    <div className="space-y-4">
                                        {[
                                            { key: 'email', label: 'Email bildirishnomalar', desc: 'Muhim yangiliklar emailga yuboriladi' },
                                            { key: 'push', label: 'Push bildirishnomalar', desc: 'Brauzer bildirishnomalari' },
                                            { key: 'sales', label: 'Sotuvlar', desc: 'Akkaunt sotilganda xabar' },
                                            { key: 'messages', label: 'Xabarlar', desc: 'Yangi xabar kelganda' },
                                            { key: 'updates', label: 'Yangilanishlar', desc: 'Sayt yangiliklari va aksiyalar' },
                                        ].map((item) => (
                                            <div key={item.key} className="flex items-center justify-between p-4 bg-[#25253a] rounded-xl">
                                                <div>
                                                    <p className="text-white font-medium">{item.label}</p>
                                                    <p className="text-sm text-gray-400">{item.desc}</p>
                                                </div>
                                                <button
                                                    onClick={() => setNotifications({ ...notifications, [item.key]: !notifications[item.key] })}
                                                    className={`w-12 h-6 rounded-full transition-colors ${notifications[item.key] ? 'bg-purple-500' : 'bg-gray-600'
                                                        }`}
                                                >
                                                    <div className={`w-5 h-5 bg-white rounded-full transition-transform ${notifications[item.key] ? 'translate-x-6' : 'translate-x-0.5'
                                                        }`} />
                                                </button>
                                            </div>
                                        ))}
                                    </div>
                                </div>
                            )}

                            {/* Language Tab */}
                            {activeTab === 'language' && (
                                <div className="space-y-6">
                                    <h2 className="text-xl font-bold text-white">Tilni tanlang</h2>

                                    <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
                                        {[
                                            { code: 'uz', name: "O'zbek", flag: '🇺🇿' },
                                            { code: 'ru', name: 'Русский', flag: '🇷🇺' },
                                            { code: 'en', name: 'English', flag: '🇺🇸' },
                                        ].map((lang) => (
                                            <button
                                                key={lang.code}
                                                onClick={() => setLanguage(lang.code)}
                                                className={`p-4 rounded-xl border-2 transition-all ${language === lang.code
                                                        ? 'border-purple-500 bg-purple-500/10'
                                                        : 'border-white/10 hover:border-white/20'
                                                    }`}
                                            >
                                                <div className="text-3xl mb-2">{lang.flag}</div>
                                                <p className="text-white font-medium">{lang.name}</p>
                                            </button>
                                        ))}
                                    </div>

                                    <p className="text-sm text-gray-500">Til o'zgartirilgandan keyin sahifa qayta yuklanadi.</p>
                                </div>
                            )}

                            {/* Wallet Tab */}
                            {activeTab === 'wallet' && (
                                <div className="space-y-6">
                                    <h2 className="text-xl font-bold text-white">Hamyon</h2>

                                    {/* Balance */}
                                    <div className="bg-gradient-to-r from-purple-500/20 to-pink-500/20 rounded-2xl p-6 border border-purple-500/30">
                                        <p className="text-gray-400 text-sm mb-1">Joriy balans</p>
                                        <p className="text-3xl font-bold text-white">0 so'm</p>
                                    </div>

                                    {/* Actions */}
                                    <div className="grid grid-cols-2 gap-4">
                                        <button className="p-4 bg-[#25253a] rounded-xl text-center hover:bg-[#2a2a45] transition-colors">
                                            <CreditCard className="w-6 h-6 text-green-400 mx-auto mb-2" />
                                            <p className="text-white font-medium">Pul qo'shish</p>
                                        </button>
                                        <button className="p-4 bg-[#25253a] rounded-xl text-center hover:bg-[#2a2a45] transition-colors">
                                            <Shield className="w-6 h-6 text-blue-400 mx-auto mb-2" />
                                            <p className="text-white font-medium">Pul yechish</p>
                                        </button>
                                    </div>

                                    {/* Cards */}
                                    <div>
                                        <h3 className="text-white font-medium mb-3">Bog'langan kartalar</h3>
                                        <div className="text-center py-8 bg-[#25253a] rounded-xl">
                                            <CreditCard className="w-10 h-10 text-gray-600 mx-auto mb-3" />
                                            <p className="text-gray-400">Hozircha karta bog'lanmagan</p>
                                            <button className="mt-3 text-purple-400 text-sm hover:underline">
                                                + Karta qo'shish
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
