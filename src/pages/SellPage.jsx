import { useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { Upload, X, Plus, DollarSign, Image, FileText, Tag, Shield, AlertCircle, CheckCircle } from 'lucide-react';
import { useAuth } from '../context/AuthContext';
import { games } from '../data/mockData';

const SellPage = () => {
    const navigate = useNavigate();
    const { user, isAuthenticated } = useAuth();
    const [step, setStep] = useState(1);
    const [isSubmitting, setIsSubmitting] = useState(false);
    const [submitted, setSubmitted] = useState(false);

    const [formData, setFormData] = useState({
        gameId: '',
        title: '',
        description: '',
        price: '',
        level: '',
        rank: '',
        skins: '',
        features: [],
        images: [],
        loginMethod: 'email',
        accountEmail: '',
        accountPassword: '',
        additionalInfo: ''
    });

    const [errors, setErrors] = useState({});

    // Redirect if not logged in
    if (!isAuthenticated) {
        navigate('/login');
        return null;
    }

    const featureOptions = [
        'Original email',
        'Email o\'zgartirish mumkin',
        'Telefon bog\'langan',
        'Google bog\'langan',
        'Ban yo\'q',
        'Hech qachon sotilmagan',
        'Premium/VIP',
        'Maxsus skinlar',
        '2FA yoqilgan',
        'Hamma qurollar ochiq'
    ];

    const validateStep = (stepNum) => {
        const newErrors = {};

        if (stepNum === 1) {
            if (!formData.gameId) newErrors.gameId = 'O\'yinni tanlang';
            if (!formData.title.trim()) newErrors.title = 'Sarlavha kiriting';
            if (!formData.price || formData.price <= 0) newErrors.price = 'Narxni kiriting';
        }

        if (stepNum === 2) {
            if (!formData.description.trim()) newErrors.description = 'Tavsif kiriting';
        }

        if (stepNum === 3) {
            if (!formData.accountEmail.trim()) newErrors.accountEmail = 'Akkaunt emailini kiriting';
            if (!formData.accountPassword.trim()) newErrors.accountPassword = 'Akkaunt parolini kiriting';
        }

        setErrors(newErrors);
        return Object.keys(newErrors).length === 0;
    };

    const nextStep = () => {
        if (validateStep(step)) {
            setStep(step + 1);
        }
    };

    const prevStep = () => {
        setStep(step - 1);
    };

    const toggleFeature = (feature) => {
        setFormData(prev => ({
            ...prev,
            features: prev.features.includes(feature)
                ? prev.features.filter(f => f !== feature)
                : [...prev.features, feature]
        }));
    };

    const handleSubmit = async () => {
        if (!validateStep(3)) return;

        setIsSubmitting(true);

        // Simulate API call
        await new Promise(resolve => setTimeout(resolve, 1500));

        // Save to localStorage for demo
        const listings = JSON.parse(localStorage.getItem('wibeListings') || '[]');
        const newListing = {
            id: Date.now(),
            ...formData,
            sellerId: user.id,
            sellerName: user.name,
            status: 'pending',
            createdAt: new Date().toISOString()
        };
        listings.push(newListing);
        localStorage.setItem('wibeListings', JSON.stringify(listings));

        setIsSubmitting(false);
        setSubmitted(true);
    };

    if (submitted) {
        return (
            <div className="min-h-screen pt-24 pb-16 flex items-center justify-center">
                <div className="text-center max-w-md px-4">
                    <div className="w-20 h-20 bg-green-500/20 rounded-full flex items-center justify-center mx-auto mb-6">
                        <CheckCircle className="w-10 h-10 text-green-400" />
                    </div>
                    <h1 className="text-2xl font-bold text-white mb-4">E'lon yuborildi!</h1>
                    <p className="text-gray-400 mb-8">
                        Sizning e'loningiz moderatsiyaga yuborildi. 24 soat ichida tekshiriladi va tasdiqlangandan keyin saytda paydo bo'ladi.
                    </p>
                    <div className="space-y-3">
                        <button
                            onClick={() => navigate('/profile')}
                            className="w-full py-4 rounded-xl font-semibold text-white bg-gradient-to-r from-purple-500 to-pink-500"
                        >
                            Profilga o'tish
                        </button>
                        <button
                            onClick={() => {
                                setSubmitted(false);
                                setStep(1);
                                setFormData({
                                    gameId: '',
                                    title: '',
                                    description: '',
                                    price: '',
                                    level: '',
                                    rank: '',
                                    skins: '',
                                    features: [],
                                    images: [],
                                    loginMethod: 'email',
                                    accountEmail: '',
                                    accountPassword: '',
                                    additionalInfo: ''
                                });
                            }}
                            className="w-full py-4 rounded-xl font-semibold text-gray-300 bg-[#25253a] hover:bg-[#2a2a45]"
                        >
                            Yana e'lon berish
                        </button>
                    </div>
                </div>
            </div>
        );
    }

    return (
        <div className="min-h-screen pt-24 pb-16">
            <div className="max-w-3xl mx-auto px-4 sm:px-6 lg:px-8">
                {/* Header */}
                <div className="text-center mb-8">
                    <h1 className="text-3xl font-bold text-white mb-2">Akkaunt sotish</h1>
                    <p className="text-gray-400">O'yin akkauntingizni xavfsiz soting</p>
                </div>

                {/* Progress Steps */}
                <div className="flex items-center justify-center mb-8">
                    {[1, 2, 3].map((s, i) => (
                        <div key={s} className="flex items-center">
                            <div className={`w-10 h-10 rounded-full flex items-center justify-center font-bold transition-all ${step >= s
                                ? 'bg-gradient-to-r from-purple-500 to-pink-500 text-white'
                                : 'bg-[#25253a] text-gray-500'
                                }`}>
                                {s}
                            </div>
                            {i < 2 && (
                                <div className={`w-16 h-1 ${step > s ? 'bg-purple-500' : 'bg-[#25253a]'}`} />
                            )}
                        </div>
                    ))}
                </div>

                {/* Form */}
                <div className="bg-[#1e1e32] rounded-2xl p-6 lg:p-8 border border-white/5">
                    {/* Step 1: Basic Info */}
                    {step === 1 && (
                        <div className="space-y-6">
                            <h2 className="text-xl font-bold text-white flex items-center gap-2">
                                <Tag className="w-5 h-5 text-purple-400" />
                                Asosiy ma'lumotlar
                            </h2>

                            {/* Game Selection */}
                            <div>
                                <label className="block text-sm font-medium text-gray-300 mb-2">O'yin *</label>
                                <div className="grid grid-cols-3 sm:grid-cols-4 gap-3">
                                    {games.map((game) => (
                                        <button
                                            key={game.id}
                                            type="button"
                                            onClick={() => setFormData({ ...formData, gameId: game.id })}
                                            className={`p-3 rounded-xl border-2 transition-all ${formData.gameId === game.id
                                                ? 'border-purple-500 bg-purple-500/10'
                                                : 'border-white/10 hover:border-white/20'
                                                }`}
                                        >
                                            <img src={game.image} alt={game.name} className="w-12 h-12 rounded-lg mx-auto mb-2 object-cover" />
                                            <p className="text-xs text-center text-gray-300 truncate">{game.name}</p>
                                        </button>
                                    ))}
                                </div>
                                {errors.gameId && <p className="text-red-400 text-sm mt-1">{errors.gameId}</p>}
                            </div>

                            {/* Title */}
                            <div>
                                <label className="block text-sm font-medium text-gray-300 mb-2">Sarlavha *</label>
                                <input
                                    type="text"
                                    value={formData.title}
                                    onChange={(e) => setFormData({ ...formData, title: e.target.value })}
                                    placeholder="Masalan: Level 50, 100+ skin, Maxsus qurollar"
                                    className="w-full px-4 py-3 bg-[#25253a] border border-white/10 rounded-xl text-white placeholder:text-gray-500 focus:outline-none focus:border-purple-500/50"
                                />
                                {errors.title && <p className="text-red-400 text-sm mt-1">{errors.title}</p>}
                            </div>

                            {/* Price */}
                            <div>
                                <label className="block text-sm font-medium text-gray-300 mb-2">Narx (so'm) *</label>
                                <div className="relative">
                                    <DollarSign className="absolute left-4 top-1/2 -translate-y-1/2 w-5 h-5 text-gray-500" />
                                    <input
                                        type="number"
                                        value={formData.price}
                                        onChange={(e) => setFormData({ ...formData, price: e.target.value })}
                                        placeholder="500000"
                                        className="w-full pl-12 pr-4 py-3 bg-[#25253a] border border-white/10 rounded-xl text-white placeholder:text-gray-500 focus:outline-none focus:border-purple-500/50"
                                    />
                                </div>
                                {errors.price && <p className="text-red-400 text-sm mt-1">{errors.price}</p>}
                                <p className="text-sm text-gray-500 mt-1">Komissiya: 10% (siz olasiz: {formData.price ? (formData.price * 0.9).toLocaleString() : 0} so'm)</p>
                            </div>

                            {/* Level & Rank */}
                            <div className="grid grid-cols-2 gap-4">
                                <div>
                                    <label className="block text-sm font-medium text-gray-300 mb-2">Level</label>
                                    <input
                                        type="text"
                                        value={formData.level}
                                        onChange={(e) => setFormData({ ...formData, level: e.target.value })}
                                        placeholder="50"
                                        className="w-full px-4 py-3 bg-[#25253a] border border-white/10 rounded-xl text-white placeholder:text-gray-500 focus:outline-none focus:border-purple-500/50"
                                    />
                                </div>
                                <div>
                                    <label className="block text-sm font-medium text-gray-300 mb-2">Rank/Darajasi</label>
                                    <input
                                        type="text"
                                        value={formData.rank}
                                        onChange={(e) => setFormData({ ...formData, rank: e.target.value })}
                                        placeholder="Diamond"
                                        className="w-full px-4 py-3 bg-[#25253a] border border-white/10 rounded-xl text-white placeholder:text-gray-500 focus:outline-none focus:border-purple-500/50"
                                    />
                                </div>
                            </div>
                        </div>
                    )}

                    {/* Step 2: Details */}
                    {step === 2 && (
                        <div className="space-y-6">
                            <h2 className="text-xl font-bold text-white flex items-center gap-2">
                                <FileText className="w-5 h-5 text-cyan-400" />
                                Batafsil ma'lumot
                            </h2>

                            {/* Description */}
                            <div>
                                <label className="block text-sm font-medium text-gray-300 mb-2">Tavsif *</label>
                                <textarea
                                    value={formData.description}
                                    onChange={(e) => setFormData({ ...formData, description: e.target.value })}
                                    placeholder="Akkaunt haqida batafsil ma'lumot: skinlar, qurollar, yutuqlar..."
                                    rows={5}
                                    className="w-full px-4 py-3 bg-[#25253a] border border-white/10 rounded-xl text-white placeholder:text-gray-500 focus:outline-none focus:border-purple-500/50 resize-none"
                                />
                                {errors.description && <p className="text-red-400 text-sm mt-1">{errors.description}</p>}
                            </div>

                            {/* Features */}
                            <div>
                                <label className="block text-sm font-medium text-gray-300 mb-2">Xususiyatlar</label>
                                <div className="flex flex-wrap gap-2">
                                    {featureOptions.map((feature) => (
                                        <button
                                            key={feature}
                                            type="button"
                                            onClick={() => toggleFeature(feature)}
                                            className={`px-4 py-2 rounded-full text-sm transition-all ${formData.features.includes(feature)
                                                ? 'bg-purple-500 text-white'
                                                : 'bg-[#25253a] text-gray-400 hover:bg-[#2a2a45]'
                                                }`}
                                        >
                                            {feature}
                                        </button>
                                    ))}
                                </div>
                            </div>

                            {/* Skins count */}
                            <div>
                                <label className="block text-sm font-medium text-gray-300 mb-2">Skinlar soni</label>
                                <input
                                    type="text"
                                    value={formData.skins}
                                    onChange={(e) => setFormData({ ...formData, skins: e.target.value })}
                                    placeholder="50+"
                                    className="w-full px-4 py-3 bg-[#25253a] border border-white/10 rounded-xl text-white placeholder:text-gray-500 focus:outline-none focus:border-purple-500/50"
                                />
                            </div>

                            {/* Images upload */}
                            <div>
                                <label className="block text-sm font-medium text-gray-300 mb-2">Rasmlar (max 5 ta)</label>

                                {/* Image previews */}
                                {formData.images.length > 0 && (
                                    <div className="grid grid-cols-3 sm:grid-cols-5 gap-3 mb-4">
                                        {formData.images.map((img, index) => (
                                            <div key={index} className="relative group aspect-square">
                                                <img
                                                    src={img}
                                                    alt={`Preview ${index + 1}`}
                                                    className="w-full h-full object-cover rounded-xl border border-white/10"
                                                />
                                                <button
                                                    type="button"
                                                    onClick={() => {
                                                        setFormData(prev => ({
                                                            ...prev,
                                                            images: prev.images.filter((_, i) => i !== index)
                                                        }));
                                                    }}
                                                    className="absolute -top-2 -right-2 w-6 h-6 bg-red-500 rounded-full flex items-center justify-center text-white opacity-0 group-hover:opacity-100 transition-opacity"
                                                >
                                                    <X className="w-4 h-4" />
                                                </button>
                                            </div>
                                        ))}
                                    </div>
                                )}

                                {/* Upload button */}
                                {formData.images.length < 5 && (
                                    <label className="block border-2 border-dashed border-white/10 rounded-xl p-8 text-center hover:border-purple-500/50 transition-colors cursor-pointer">
                                        <input
                                            type="file"
                                            accept="image/*"
                                            multiple
                                            className="hidden"
                                            onChange={(e) => {
                                                const files = Array.from(e.target.files);
                                                const remainingSlots = 5 - formData.images.length;
                                                const filesToAdd = files.slice(0, remainingSlots);

                                                filesToAdd.forEach(file => {
                                                    if (file.size > 5 * 1024 * 1024) {
                                                        alert('Rasm hajmi 5MB dan oshmasligi kerak');
                                                        return;
                                                    }

                                                    const reader = new FileReader();
                                                    reader.onload = (event) => {
                                                        setFormData(prev => ({
                                                            ...prev,
                                                            images: [...prev.images, event.target.result]
                                                        }));
                                                    };
                                                    reader.readAsDataURL(file);
                                                });

                                                e.target.value = '';
                                            }}
                                        />
                                        <Upload className="w-10 h-10 text-gray-500 mx-auto mb-3" />
                                        <p className="text-gray-400">Rasmlarni yuklash uchun bosing</p>
                                        <p className="text-sm text-gray-500 mt-1">PNG, JPG (max 5MB, {5 - formData.images.length} ta qoldi)</p>
                                    </label>
                                )}
                            </div>
                        </div>
                    )}

                    {/* Step 3: Account Details */}
                    {step === 3 && (
                        <div className="space-y-6">
                            <h2 className="text-xl font-bold text-white flex items-center gap-2">
                                <Shield className="w-5 h-5 text-green-400" />
                                Akkaunt ma'lumotlari
                            </h2>

                            <div className="p-4 bg-yellow-500/10 border border-yellow-500/30 rounded-xl">
                                <div className="flex items-start gap-3">
                                    <AlertCircle className="w-5 h-5 text-yellow-400 mt-0.5 flex-shrink-0" />
                                    <div className="text-sm text-yellow-300">
                                        <p className="font-medium mb-1">Muhim!</p>
                                        <p className="text-yellow-200/80">Bu ma'lumotlar faqat xarid tasdiqlangandan keyin xaridorga ko'rsatiladi. Bizning escrow tizimimiz sizni himoya qiladi.</p>
                                    </div>
                                </div>
                            </div>

                            {/* Login Method */}
                            <div>
                                <label className="block text-sm font-medium text-gray-300 mb-2">Kirish usuli</label>
                                <div className="grid grid-cols-3 gap-3">
                                    {['email', 'google', 'facebook'].map((method) => (
                                        <button
                                            key={method}
                                            type="button"
                                            onClick={() => setFormData({ ...formData, loginMethod: method })}
                                            className={`p-3 rounded-xl border-2 transition-all capitalize ${formData.loginMethod === method
                                                ? 'border-purple-500 bg-purple-500/10 text-white'
                                                : 'border-white/10 text-gray-400 hover:border-white/20'
                                                }`}
                                        >
                                            {method}
                                        </button>
                                    ))}
                                </div>
                            </div>

                            {/* Account Email */}
                            <div>
                                <label className="block text-sm font-medium text-gray-300 mb-2">Akkaunt email/login *</label>
                                <input
                                    type="text"
                                    value={formData.accountEmail}
                                    onChange={(e) => setFormData({ ...formData, accountEmail: e.target.value })}
                                    placeholder="akkaunt@email.com"
                                    className="w-full px-4 py-3 bg-[#25253a] border border-white/10 rounded-xl text-white placeholder:text-gray-500 focus:outline-none focus:border-purple-500/50"
                                />
                                {errors.accountEmail && <p className="text-red-400 text-sm mt-1">{errors.accountEmail}</p>}
                            </div>

                            {/* Account Password */}
                            <div>
                                <label className="block text-sm font-medium text-gray-300 mb-2">Akkaunt paroli *</label>
                                <input
                                    type="password"
                                    value={formData.accountPassword}
                                    onChange={(e) => setFormData({ ...formData, accountPassword: e.target.value })}
                                    placeholder="••••••••"
                                    className="w-full px-4 py-3 bg-[#25253a] border border-white/10 rounded-xl text-white placeholder:text-gray-500 focus:outline-none focus:border-purple-500/50"
                                />
                                {errors.accountPassword && <p className="text-red-400 text-sm mt-1">{errors.accountPassword}</p>}
                            </div>

                            {/* Additional Info */}
                            <div>
                                <label className="block text-sm font-medium text-gray-300 mb-2">Qo'shimcha ma'lumot</label>
                                <textarea
                                    value={formData.additionalInfo}
                                    onChange={(e) => setFormData({ ...formData, additionalInfo: e.target.value })}
                                    placeholder="Masalan: email paroli, bog'langan telefon, va h.k."
                                    rows={3}
                                    className="w-full px-4 py-3 bg-[#25253a] border border-white/10 rounded-xl text-white placeholder:text-gray-500 focus:outline-none focus:border-purple-500/50 resize-none"
                                />
                            </div>
                        </div>
                    )}

                    {/* Navigation Buttons */}
                    <div className="flex items-center justify-between mt-8 pt-6 border-t border-white/5">
                        {step > 1 ? (
                            <button
                                onClick={prevStep}
                                className="px-6 py-3 rounded-xl font-medium text-gray-400 hover:text-white transition-colors"
                            >
                                Orqaga
                            </button>
                        ) : (
                            <div />
                        )}

                        {step < 3 ? (
                            <button
                                onClick={nextStep}
                                className="px-8 py-3 rounded-xl font-semibold text-white bg-gradient-to-r from-purple-500 to-pink-500 hover:opacity-90 transition-opacity"
                            >
                                Keyingi
                            </button>
                        ) : (
                            <button
                                onClick={handleSubmit}
                                disabled={isSubmitting}
                                className="px-8 py-3 rounded-xl font-semibold text-white bg-gradient-to-r from-green-500 to-emerald-500 hover:opacity-90 transition-opacity disabled:opacity-50"
                            >
                                {isSubmitting ? 'Yuborilmoqda...' : 'E\'lonni yuborish'}
                            </button>
                        )}
                    </div>
                </div>

                {/* Info */}
                <div className="mt-8 p-4 bg-[#1e1e32] rounded-xl border border-white/5">
                    <div className="flex items-start gap-3">
                        <Shield className="w-5 h-5 text-green-400 mt-0.5" />
                        <div className="text-sm text-gray-400">
                            <p className="text-white font-medium mb-1">Xavfsiz sotish</p>
                            <p>Escrow tizimi orqali pulingiz xavfsiz. Xaridor akkauntni tasdiqlaguncha pul saytda saqlanadi.</p>
                        </div>
                    </div>
                </div>
            </div>
        </div>
    );
};

export default SellPage;
