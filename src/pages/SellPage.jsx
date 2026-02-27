import { useState, useEffect } from 'react';
import { Link, useNavigate } from 'react-router-dom';
import { Upload, X, Plus, DollarSign, Image, FileText, Tag, Shield, AlertCircle, CheckCircle, Search } from 'lucide-react';
import { useAuth } from '../context/AuthContext';
import { useLanguage } from '../context/LanguageContext';
import { useToast } from '../components/ToastProvider';
import { useCreateListing, useUploadImage, useGames } from '../hooks';
import getGamesList from '../data/gamesList';
import { CS2_WEAPON_TYPES, isCs2Game } from '../data/cs2WeaponTypes';
import SellerRulesQuiz from '../components/SellerRulesQuiz';

// Eng ko'p sotilgan / ko'p e'lon bor o'yinlar (API yoki mock bo'yicha)
function getTopGamesForSell(apiGames, mockGames) {
    const list = Array.isArray(apiGames) && apiGames.length > 0
        ? apiGames.map((g) => ({
            id: g.slug ?? g.id,
            name: g.name,
            image: g.image || (g.banner ? (typeof g.banner === 'string' ? g.banner : g.banner?.url) : null) || '/img/icons/placeholder.png',
            accountCount: g.active_listings_count ?? g.listings_count ?? 0,
        }))
        : mockGames;
    const sorted = [...list].sort((a, b) => (b.accountCount ?? 0) - (a.accountCount ?? 0));
    return sorted;
}

const SellPage = () => {
    const navigate = useNavigate();
    const { isAuthenticated } = useAuth();
    const { t } = useLanguage();
    const { addToast } = useToast();
    const [rulesPassed, setRulesPassed] = useState(false);
    const [step, setStep] = useState(1);
    const [isSubmitting, setIsSubmitting] = useState(false);
    const [submitted, setSubmitted] = useState(false);
    const [showGameModal, setShowGameModal] = useState(false);
    const [modalGameSearch, setModalGameSearch] = useState('');
    
    // API hooks
    const { mutate: createListing, isLoading: _isCreating } = useCreateListing();
    const { mutate: _uploadImage, isLoading: _isUploading } = useUploadImage();
    const { data: gamesData } = useGames();

    const mockGames = getGamesList();
    const allGamesSorted = getTopGamesForSell(gamesData?.results ?? gamesData, mockGames);
    const topGamesForSell = allGamesSorted.slice(0, 8);
    const allGames = Array.isArray(gamesData?.results ?? gamesData) && (gamesData?.results ?? gamesData).length > 0
        ? (gamesData.results ?? gamesData).map((g) => ({
            id: g.slug ?? g.id,
            name: g.name,
            image: g.image || (g.banner ? (typeof g.banner === 'string' ? g.banner : g.banner?.url) : null) || '/img/icons/placeholder.png',
          }))
        : mockGames;

    const filteredModalGames = modalGameSearch
        ? allGames.filter(g => g.name.toLowerCase().includes(modalGameSearch.toLowerCase()))
        : allGames;

    const [formData, setFormData] = useState({
        gameId: '', title: '', description: '', price: '',
        weaponType: '', level: '', rank: '', skins: '', features: [], images: [],
        loginMethod: 'email', accountEmail: '', accountPassword: '', additionalInfo: ''
    });

    const [errors, setErrors] = useState({});

    useEffect(() => {
        if (!isAuthenticated) navigate('/login');
    }, [isAuthenticated, navigate]);

    if (!isAuthenticated) return null;

    if (!rulesPassed) {
        return (
            <div className="page-enter" style={{ minHeight: '100vh', paddingBottom: '64px', display: 'flex', flexDirection: 'column' }}>
                <div className="gh-container" style={{ maxWidth: '720px', flex: 1, display: 'flex', flexDirection: 'column', minHeight: 0, maxHeight: 'calc(100vh - 120px)' }}>
                    <div className="breadcrumbs" style={{ flexShrink: 0 }}>
                        <Link to="/">{t('common.home')}</Link>
                        <span className="breadcrumb-separator">/</span>
                        <span className="breadcrumb-current">{t('nav.sell') || 'Sotish'}</span>
                    </div>
                    <div style={{ flex: 1, minHeight: 0, display: 'flex', flexDirection: 'column' }}>
                        <SellerRulesQuiz onPass={() => setRulesPassed(true)} />
                    </div>
                </div>
            </div>
        );
    }

    const featureOptions = [
        { value: 'Original email', labelKey: 'sell.feature_original_email' },
        { value: "Email o'zgartirish mumkin", labelKey: 'sell.feature_email_change' },
        { value: "Telefon bog'langan", labelKey: 'sell.feature_phone_linked' },
        { value: "Google bog'langan", labelKey: 'sell.feature_google_linked' },
        { value: "Ban yo'q", labelKey: 'sell.feature_no_ban' },
        { value: 'Hech qachon sotilmagan', labelKey: 'sell.feature_never_sold' },
        { value: 'Premium/VIP', labelKey: 'sell.feature_premium_vip' },
        { value: 'Maxsus skinlar', labelKey: 'sell.feature_skins' },
        { value: '2FA yoqilgan', labelKey: 'sell.feature_2fa' },
        { value: 'Hamma qurollar ochiq', labelKey: 'sell.feature_all_weapons' },
    ];

    const validateStep = (stepNum) => {
        const newErrors = {};
        if (stepNum === 1) {
            if (!formData.gameId) newErrors.gameId = t('sell.err_select_game') || "O'yinni tanlang";
            if (!formData.title.trim()) newErrors.title = t('sell.err_enter_title') || 'Sarlavha kiriting';
            if (!formData.price || formData.price <= 0) newErrors.price = t('sell.err_enter_price') || 'Narxni kiriting';
        }
        if (stepNum === 2) {
            if (!formData.description.trim()) newErrors.description = t('sell.err_enter_description') || 'Tavsif kiriting';
        }
        if (stepNum === 3) {
            if (!formData.accountEmail.trim()) newErrors.accountEmail = t('sell.err_enter_account_email') || 'Akkaunt emailini kiriting';
            if (!formData.accountPassword.trim()) newErrors.accountPassword = t('sell.err_enter_account_password') || 'Akkaunt parolini kiriting';
        }
        setErrors(newErrors);
        return Object.keys(newErrors).length === 0;
    };

    const nextStep = () => { if (validateStep(step)) setStep(step + 1); };
    const prevStep = () => setStep(step - 1);

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
        
        try {
            // Prepare data for API
            const listingData = {
                game: formData.gameId,
                title: formData.title,
                description: formData.description,
                price: formData.price,
                ...(formData.weaponType && { weapon_type: formData.weaponType }),
                level: formData.level || '',
                rank: formData.rank || '',
                skins_count: parseInt(formData.skins) || 0,
                features: formData.features,
                login_method: formData.loginMethod,
                account_email: formData.accountEmail,
                account_password: formData.accountPassword,
            };
            
            createListing(listingData, {
                onSuccess: () => {
                    addToast({
                        type: 'success',
                        title: t('common.success') || 'Muvaffaqiyatli!',
                        message: t('sell.success_listing_created') || 'Listing yaratildi. Moderatsiyadan keyin ko\'rinadi.',
                    });
                    setSubmitted(true);
                },
                onError: (error) => {
                    addToast({
                        type: 'error',
                        title: t('common.error') || 'Xatolik',
                        message: error?.message || t('sell.error_listing_create') || 'Listing yaratishda xatolik yuz berdi',
                    });
                },
                onSettled: () => {
                    setIsSubmitting(false);
                }
            });
        } catch (error) {
            addToast({
                type: 'error',
title: t('common.error') || 'Xatolik',
                        message: error?.message || t('settings.generic_error') || 'Noma\'lum xatolik',
            });
            setIsSubmitting(false);
        }
    };

    const resetForm = () => {
        setSubmitted(false);
        setStep(1);
        setFormData({
            gameId: '', title: '', description: '', price: '',
            weaponType: '', level: '', rank: '', skins: '', features: [], images: [],
            loginMethod: 'email', accountEmail: '', accountPassword: '', additionalInfo: ''
        });
    };

    const cardStyle = {
        backgroundColor: 'var(--color-bg-primary)',
        border: '1px solid var(--color-border-default)',
        borderRadius: 'var(--radius-xl)',
        padding: '24px',
    };

    const errorStyle = { color: 'var(--color-error)', fontSize: 'var(--font-size-sm)', marginTop: '4px' };

    if (submitted) {
        return (
            <div className="page-enter" style={{ minHeight: '100vh', paddingBottom: '64px', display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
                <div className="text-center" style={{ maxWidth: '400px', padding: '0 16px' }}>
                    <div style={{
                        width: '72px', height: '72px', borderRadius: 'var(--radius-full)',
                        backgroundColor: 'var(--color-success-bg)', display: 'flex', alignItems: 'center', justifyContent: 'center',
                        margin: '0 auto 20px',
                    }}>
                        <CheckCircle style={{ width: '36px', height: '36px', color: 'var(--color-accent-green)' }} />
                    </div>
                    <h1 style={{ fontSize: 'var(--font-size-2xl)', fontWeight: 'var(--font-weight-bold)', color: 'var(--color-text-primary)', marginBottom: '12px' }}>
                        E&apos;lon yuborildi!
                    </h1>
                    <p style={{ color: 'var(--color-text-secondary)', marginBottom: '28px' }}>
                        Sizning e'loningiz moderatsiyaga yuborildi. 24 soat ichida tekshiriladi va tasdiqlangandan keyin saytda paydo bo'ladi.
                    </p>
                    <div style={{ display: 'flex', flexDirection: 'column', gap: '10px' }}>
                        <button onClick={() => navigate('/profile')} className="btn btn-primary btn-lg" style={{ width: '100%' }}>
                            Profilga o'tish
                        </button>
                        <button onClick={resetForm} className="btn btn-secondary btn-lg" style={{ width: '100%' }}>
                            Yana e'lon berish
                        </button>
                    </div>
                </div>
            </div>
        );
    }

    return (
        <>
            {/* Game Selection Modal */}
            {showGameModal && (
                <div className="modal-overlay">
                    <div className="modal-container modal-lg" onClick={e => e.stopPropagation()}>
                        <div className="modal-header">
                            <h3 style={{ fontSize: 'var(--font-size-lg)', fontWeight: 'var(--font-weight-bold)' }}>O&apos;yin tanlang</h3>
                            <button onClick={() => { setShowGameModal(false); setModalGameSearch(''); }}
                                style={{ background: 'none', border: 'none', cursor: 'pointer', padding: '4px', color: 'var(--color-text-muted)' }}>
                                <X className="w-5 h-5" />
                            </button>
                        </div>
                        <div style={{ padding: '16px', borderBottom: '1px solid var(--color-border-muted)' }}>
                            <div className="relative">
                                <Search className="absolute left-4 top-1/2 -translate-y-1/2 w-4 h-4" style={{ color: 'var(--color-text-muted)' }} />
                                <input
                                    type="text" value={modalGameSearch}
                                    onChange={(e) => setModalGameSearch(e.target.value)}
                                    placeholder="O'yin nomini qidiring..."
                                    className="input input-lg"
                                    style={{ paddingLeft: '40px' }}
                                    autoFocus
                                />
                            </div>
                        </div>
                        <div className="modal-body" style={{ maxHeight: '50vh', overflowY: 'auto' }}>
                            <div className="grid grid-cols-3 sm:grid-cols-4" style={{ gap: '10px' }}>
                                {filteredModalGames.map((game) => (
                                    <button
                                        key={game.id} type="button"
                                        onClick={() => { setFormData({ ...formData, gameId: game.id }); setShowGameModal(false); setModalGameSearch(''); }}
                                        style={{
                                            padding: '12px', borderRadius: 'var(--radius-lg)',
                                            border: `2px solid ${formData.gameId === game.id ? 'var(--color-accent-blue)' : 'var(--color-border-default)'}`,
                                            backgroundColor: formData.gameId === game.id ? 'var(--color-info-bg)' : 'var(--color-bg-secondary)',
                                            cursor: 'pointer', textAlign: 'center', transition: 'all 0.15s ease',
                                        }}
                                    >
                                        <img src={game.image} alt={game.name} style={{ width: '48px', height: '48px', borderRadius: 'var(--radius-md)', margin: '0 auto 8px', objectFit: 'cover' }} />
                                        <p className="truncate" style={{ fontSize: 'var(--font-size-xs)', color: 'var(--color-text-secondary)' }}>{game.name}</p>
                                    </button>
                                ))}
                            </div>
                            {filteredModalGames.length === 0 && (
                                <p className="text-center" style={{ color: 'var(--color-text-muted)', padding: '32px 0' }}>Hech narsa topilmadi</p>
                            )}
                        </div>
                    </div>
                </div>
            )}

            <div className="page-enter" style={{ minHeight: '100vh', paddingBottom: '64px' }}>
                <div className="gh-container" style={{ maxWidth: '720px' }}>
                    {/* Breadcrumbs */}
                    <div className="breadcrumbs">
                        <Link to="/">{t('common.home')}</Link>
                        <span className="breadcrumb-separator">/</span>
                        <span className="breadcrumb-current">Akkaunt sotish</span>
                    </div>

                    {/* Header */}
                    <div className="text-center" style={{ paddingTop: '16px', marginBottom: '24px' }}>
                        <h1 style={{ fontSize: 'var(--font-size-2xl)', fontWeight: 'var(--font-weight-bold)', color: 'var(--color-text-primary)', marginBottom: '8px' }}>
                            Akkaunt sotish
                        </h1>
                        <p style={{ color: 'var(--color-text-secondary)' }}>O&apos;yin akkauntingizni xavfsiz soting</p>
                    </div>

                    {/* Progress Steps */}
                    <div className="flex items-center justify-center" style={{ marginBottom: '24px' }}>
                        {[1, 2, 3].map((s, i) => (
                            <div key={s} className="flex items-center">
                                <div style={{
                                    width: '36px', height: '36px', borderRadius: 'var(--radius-full)',
                                    display: 'flex', alignItems: 'center', justifyContent: 'center',
                                    fontWeight: 'var(--font-weight-bold)', fontSize: 'var(--font-size-sm)',
                                    backgroundColor: step >= s ? 'var(--color-accent-blue)' : 'var(--color-bg-tertiary)',
                                    color: step >= s ? '#ffffff' : 'var(--color-text-muted)',
                                    transition: 'all 0.2s ease',
                                }}>
                                    {step > s ? <CheckCircle className="w-4 h-4" /> : s}
                                </div>
                                {i < 2 && (
                                    <div style={{
                                        width: '48px', height: '2px',
                                        backgroundColor: step > s ? 'var(--color-accent-blue)' : 'var(--color-border-muted)',
                                        transition: 'background-color 0.2s ease',
                                    }} />
                                )}
                            </div>
                        ))}
                    </div>

                    {/* Form Card */}
                    <div style={cardStyle}>
                        {/* Step 1: Basic Info */}
                        {step === 1 && (
                            <div>
                                <h2 className="flex items-center gap-2" style={{ fontSize: 'var(--font-size-lg)', fontWeight: 'var(--font-weight-bold)', color: 'var(--color-text-primary)', marginBottom: '20px' }}>
                                    <Tag className="w-5 h-5" style={{ color: 'var(--color-accent-blue)' }} />
                                    Asosiy ma'lumotlar
                                </h2>

                                {/* Game Selection */}
                                <div style={{ marginBottom: '20px' }}>
                                    <label className="input-label">O'yin *</label>
                                    <div className="grid grid-cols-3 sm:grid-cols-4" style={{ gap: '8px' }}>
                                        {topGamesForSell.map((game) => (
                                            <button key={game.id} type="button"
                                                onClick={() => setFormData({ ...formData, gameId: game.id })}
                                                style={{
                                                    padding: '10px', borderRadius: 'var(--radius-lg)',
                                                    border: `2px solid ${formData.gameId === game.id ? 'var(--color-accent-blue)' : 'var(--color-border-default)'}`,
                                                    backgroundColor: formData.gameId === game.id ? 'var(--color-info-bg)' : 'var(--color-bg-secondary)',
                                                    cursor: 'pointer', textAlign: 'center', transition: 'all 0.15s ease',
                                                }}
                                            >
                                                <img src={game.image} alt={game.name} style={{ width: '40px', height: '40px', borderRadius: 'var(--radius-md)', margin: '0 auto 6px', objectFit: 'cover' }} />
                                                <p className="truncate" style={{ fontSize: 'var(--font-size-xs)', color: 'var(--color-text-secondary)' }}>{game.name}</p>
                                            </button>
                                        ))}
                                    </div>

                                    <button type="button" onClick={() => setShowGameModal(true)}
                                        className="flex items-center justify-center gap-2"
                                        style={{
                                            width: '100%', marginTop: '10px', padding: '12px',
                                            borderRadius: 'var(--radius-lg)', border: '2px dashed var(--color-border-default)',
                                            color: 'var(--color-text-muted)', cursor: 'pointer', backgroundColor: 'transparent',
                                            transition: 'all 0.15s ease', fontSize: 'var(--font-size-sm)',
                                        }}
                                    >
                                        <Plus className="w-4 h-4" />
                                        {t('sell.more_games_btn') || "Boshqa o'yinlarni ko'rish"} ({allGames.length} ta)
                                    </button>
                                    {errors.gameId && <p style={errorStyle}>{errors.gameId}</p>}
                                </div>

                                {/* Title */}
                                <div style={{ marginBottom: '16px' }}>
                                    <label className="input-label">Sarlavha *</label>
                                    <input type="text" value={formData.title}
                                        onChange={(e) => setFormData({ ...formData, title: e.target.value })}
                                        placeholder="Masalan: Level 50, 100+ skin, Maxsus qurollar"
                                        className="input input-lg" />
                                    {errors.title && <p style={errorStyle}>{errors.title}</p>}
                                </div>

                                {/* Price */}
                                <div style={{ marginBottom: '16px' }}>
                                    <label className="input-label">Narx (so'm) *</label>
                                    <div className="relative">
                                        <DollarSign className="absolute left-4 top-1/2 -translate-y-1/2 w-4 h-4" style={{ color: 'var(--color-text-muted)' }} />
                                        <input type="number" value={formData.price}
                                            onChange={(e) => setFormData({ ...formData, price: e.target.value })}
                                            placeholder="500000"
                                            className="input input-lg"
                                            style={{ paddingLeft: '40px' }} />
                                    </div>
                                    {errors.price && <p style={errorStyle}>{errors.price}</p>}
                                    <p style={{ fontSize: 'var(--font-size-sm)', color: 'var(--color-text-muted)', marginTop: '4px' }}>
                                        Komissiya: 10% (siz olasiz: {formData.price ? (formData.price * 0.9).toLocaleString() : 0} so'm)
                                    </p>
                                </div>

                                {/* Qurol turi — faqat CS2 / skin uchun */}
                                {isCs2Game(formData.gameId) && (
                                    <div style={{ marginBottom: '16px' }}>
                                        <label className="input-label">{t('sell.weapon_type') || 'Qurol turi (skin)'}</label>
                                        <select
                                            value={formData.weaponType}
                                            onChange={(e) => setFormData({ ...formData, weaponType: e.target.value })}
                                            className="input input-lg"
                                            style={{ width: '100%' }}
                                        >
                                            <option value="">{t('sell.weapon_type_placeholder') || "Tanlang (ixtiyoriy)"}</option>
                                            {CS2_WEAPON_TYPES.map((w) => (
                                                <option key={w.id} value={w.id}>{w.nameUz}</option>
                                            ))}
                                        </select>
                                    </div>
                                )}

                                {/* Level & Rank */}
                                <div className="grid grid-cols-2" style={{ gap: '12px' }}>
                                    <div>
                                        <label className="input-label">Level</label>
                                        <input type="text" value={formData.level}
                                            onChange={(e) => setFormData({ ...formData, level: e.target.value })}
                                            placeholder="50" className="input input-lg" />
                                    </div>
                                    <div>
                                        <label className="input-label">Rank/Darajasi</label>
                                        <input type="text" value={formData.rank}
                                            onChange={(e) => setFormData({ ...formData, rank: e.target.value })}
                                            placeholder="Diamond" className="input input-lg" />
                                    </div>
                                </div>
                            </div>
                        )}

                        {/* Step 2: Details */}
                        {step === 2 && (
                            <div>
                                <h2 className="flex items-center gap-2" style={{ fontSize: 'var(--font-size-lg)', fontWeight: 'var(--font-weight-bold)', color: 'var(--color-text-primary)', marginBottom: '20px' }}>
                                    <FileText className="w-5 h-5" style={{ color: 'var(--color-accent-blue)' }} />
                                    Batafsil ma'lumot
                                </h2>

                                {/* Description */}
                                <div style={{ marginBottom: '20px' }}>
                                    <label className="input-label">Tavsif *</label>
                                    <textarea
                                        value={formData.description}
                                        onChange={(e) => setFormData({ ...formData, description: e.target.value })}
                                        placeholder={t('sell.placeholder_description') || "Akkaunt haqida batafsil ma'lumot: skinlar, qurollar, yutuqlar..."}
                                        rows={5}
                                        className="input"
                                        style={{ height: 'auto', padding: '12px 16px', resize: 'none' }}
                                    />
                                    {errors.description && <p style={errorStyle}>{errors.description}</p>}
                                </div>

                                {/* Features */}
                                <div style={{ marginBottom: '20px' }}>
                                    <label className="input-label">Xususiyatlar</label>
                                    <div className="flex flex-wrap" style={{ gap: '8px' }}>
                                        {featureOptions.map((opt) => (
                                            <button key={opt.value} type="button" onClick={() => toggleFeature(opt.value)}
                                                style={{
                                                    padding: '6px 14px', borderRadius: 'var(--radius-full)',
                                                    fontSize: 'var(--font-size-sm)',
                                                    backgroundColor: formData.features.includes(opt.value) ? 'var(--color-accent-blue)' : 'var(--color-bg-tertiary)',
                                                    color: formData.features.includes(opt.value) ? '#ffffff' : 'var(--color-text-secondary)',
                                                    border: `1px solid ${formData.features.includes(opt.value) ? 'var(--color-accent-blue)' : 'var(--color-border-default)'}`,
                                                    cursor: 'pointer', transition: 'all 0.15s ease',
                                                }}
                                            >
                                                {t(opt.labelKey)}
                                            </button>
                                        ))}
                                    </div>
                                </div>

                                {/* Skins count */}
                                <div style={{ marginBottom: '20px' }}>
                                    <label className="input-label">Skinlar soni</label>
                                    <input type="text" value={formData.skins}
                                        onChange={(e) => setFormData({ ...formData, skins: e.target.value })}
                                        placeholder="50+" className="input input-lg" />
                                </div>

                                {/* Images upload */}
                                <div>
                                    <label className="input-label">Rasmlar (max 5 ta)</label>

                                    {formData.images.length > 0 && (
                                        <div className="grid grid-cols-3 sm:grid-cols-5" style={{ gap: '10px', marginBottom: '12px' }}>
                                            {formData.images.map((img, index) => (
                                                <div key={index} className="relative group" style={{ aspectRatio: '1', borderRadius: 'var(--radius-lg)', overflow: 'hidden' }}>
                                                    <img src={img} alt={`Preview ${index + 1}`} style={{ width: '100%', height: '100%', objectFit: 'cover' }} />
                                                    <button type="button"
                                                        onClick={() => setFormData(prev => ({ ...prev, images: prev.images.filter((_, i) => i !== index) }))}
                                                        style={{
                                                            position: 'absolute', top: '4px', right: '4px',
                                                            width: '22px', height: '22px', borderRadius: 'var(--radius-full)',
                                                            backgroundColor: 'var(--color-error)', color: '#fff',
                                                            display: 'flex', alignItems: 'center', justifyContent: 'center',
                                                            border: 'none', cursor: 'pointer', opacity: 0,
                                                        }}
                                                        className="group-hover:opacity-100 transition-opacity"
                                                    >
                                                        <X className="w-3 h-3" />
                                                    </button>
                                                </div>
                                            ))}
                                        </div>
                                    )}

                                    {formData.images.length < 5 && (
                                        <label style={{
                                            display: 'block', border: '2px dashed var(--color-border-default)',
                                            borderRadius: 'var(--radius-lg)', padding: '32px 16px', textAlign: 'center',
                                            cursor: 'pointer', transition: 'all 0.15s ease',
                                        }}>
                                            <input type="file" accept="image/*" multiple className="hidden" style={{ display: 'none' }}
                                                onChange={(e) => {
                                                    const files = Array.from(e.target.files);
                                                    const remainingSlots = 5 - formData.images.length;
                                                    const filesToAdd = files.slice(0, remainingSlots);
                                                    filesToAdd.forEach(file => {
                                                        if (file.size > 5 * 1024 * 1024) { alert(t('sell.image_size_error') || 'Rasm hajmi 5MB dan oshmasligi kerak'); return; }
                                                        const reader = new FileReader();
                                                        reader.onload = (event) => {
                                                            setFormData(prev => ({ ...prev, images: [...prev.images, event.target.result] }));
                                                        };
                                                        reader.readAsDataURL(file);
                                                    });
                                                    e.target.value = '';
                                                }}
                                            />
                                            <Upload style={{ width: '36px', height: '36px', color: 'var(--color-text-muted)', margin: '0 auto 10px' }} />
                                            <p style={{ color: 'var(--color-text-secondary)' }}>Rasmlarni yuklash uchun bosing</p>
                                            <p style={{ fontSize: 'var(--font-size-sm)', color: 'var(--color-text-muted)', marginTop: '4px' }}>PNG, JPG (max 5MB, {5 - formData.images.length} ta qoldi)</p>
                                        </label>
                                    )}
                                </div>
                            </div>
                        )}

                        {/* Step 3: Account Details */}
                        {step === 3 && (
                            <div>
                                <h2 className="flex items-center gap-2" style={{ fontSize: 'var(--font-size-lg)', fontWeight: 'var(--font-weight-bold)', color: 'var(--color-text-primary)', marginBottom: '20px' }}>
                                    <Shield className="w-5 h-5" style={{ color: 'var(--color-accent-green)' }} />
                                    Akkaunt ma'lumotlari
                                </h2>

                                {/* Warning */}
                                <div className="flex items-start gap-3" style={{
                                    padding: '14px 16px', marginBottom: '20px',
                                    borderRadius: 'var(--radius-md)',
                                    backgroundColor: 'var(--color-warning-bg)',
                                    border: '1px solid var(--color-accent-orange)',
                                }}>
                                    <AlertCircle className="w-4 h-4 mt-0.5 flex-shrink-0" style={{ color: 'var(--color-accent-orange)' }} />
                                    <div style={{ fontSize: 'var(--font-size-sm)' }}>
                                        <p style={{ fontWeight: 'var(--font-weight-semibold)', color: 'var(--color-accent-orange)', marginBottom: '4px' }}>{t('sell.important')}</p>
                                        <p style={{ color: 'var(--color-text-secondary)' }}>{t('sell.escrow_notice')}</p>
                                    </div>
                                </div>

                                {/* Login Method */}
                                <div style={{ marginBottom: '16px' }}>
                                    <label className="input-label">{t('sell.login_method')}</label>
                                    <div className="grid grid-cols-3" style={{ gap: '8px' }}>
                                        {['email', 'google', 'facebook'].map((method) => (
                                            <button key={method} type="button"
                                                onClick={() => setFormData({ ...formData, loginMethod: method })}
                                                style={{
                                                    padding: '10px', borderRadius: 'var(--radius-lg)',
                                                    border: `2px solid ${formData.loginMethod === method ? 'var(--color-accent-blue)' : 'var(--color-border-default)'}`,
                                                    backgroundColor: formData.loginMethod === method ? 'var(--color-info-bg)' : 'var(--color-bg-secondary)',
                                                    color: formData.loginMethod === method ? 'var(--color-text-accent)' : 'var(--color-text-secondary)',
                                                    cursor: 'pointer', textTransform: 'capitalize', fontSize: 'var(--font-size-sm)',
                                                    fontWeight: 'var(--font-weight-medium)', transition: 'all 0.15s ease',
                                                }}
                                            >
                                                {method}
                                            </button>
                                        ))}
                                    </div>
                                </div>

                                {/* Account Email */}
                                <div style={{ marginBottom: '16px' }}>
                                    <label className="input-label">{t('sell.account_email_label')}</label>
                                    <input type="text" value={formData.accountEmail}
                                        onChange={(e) => setFormData({ ...formData, accountEmail: e.target.value })}
                                        placeholder="akkaunt@email.com" className="input input-lg" />
                                    {errors.accountEmail && <p style={errorStyle}>{errors.accountEmail}</p>}
                                </div>

                                {/* Account Password */}
                                <div style={{ marginBottom: '16px' }}>
                                    <label className="input-label">{t('sell.account_password_label')}</label>
                                    <input type="password" value={formData.accountPassword}
                                        onChange={(e) => setFormData({ ...formData, accountPassword: e.target.value })}
                                        placeholder="••••••••" className="input input-lg" />
                                    {errors.accountPassword && <p style={errorStyle}>{errors.accountPassword}</p>}
                                </div>

                                {/* Additional Info */}
                                <div>
                                    <label className="input-label">{t('sell.additional_info')}</label>
                                    <textarea
                                        value={formData.additionalInfo}
                                        onChange={(e) => setFormData({ ...formData, additionalInfo: e.target.value })}
                                        placeholder="Masalan: email paroli, bog'langan telefon, va h.k."
                                        rows={3}
                                        className="input"
                                        style={{ height: 'auto', padding: '12px 16px', resize: 'none' }}
                                    />
                                </div>
                            </div>
                        )}

                        {/* Navigation Buttons */}
                        <div className="flex items-center justify-between" style={{ marginTop: '24px', paddingTop: '20px', borderTop: '1px solid var(--color-border-muted)' }}>
                            {step > 1 ? (
                                <button onClick={prevStep} className="btn btn-ghost btn-md">{t('sell.back_btn')}</button>
                            ) : <div />}
                            {step < 3 ? (
                                <button onClick={nextStep} className="btn btn-primary btn-lg">{t('sell.next_btn')}</button>
                            ) : (
                                <button onClick={handleSubmit} disabled={isSubmitting} className="btn btn-success btn-lg">
                                    {isSubmitting ? t('sell.submitting') : t('sell.submit_btn')}
                                </button>
                            )}
                        </div>
                    </div>

                    {/* Info */}
                    <div className="flex items-start gap-3" style={{
                        marginTop: '20px', padding: '16px',
                        borderRadius: 'var(--radius-lg)',
                        backgroundColor: 'var(--color-info-bg)',
                        border: '1px solid var(--color-accent-blue)',
                    }}>
                        <Shield className="w-4 h-4 mt-0.5" style={{ color: 'var(--color-accent-green)' }} />
                        <div style={{ fontSize: 'var(--font-size-sm)' }}>
                            <p style={{ fontWeight: 'var(--font-weight-medium)', color: 'var(--color-text-primary)', marginBottom: '4px' }}>{t('sell.safe_selling')}</p>
                            <p style={{ color: 'var(--color-text-secondary)' }}>{t('sell.escrow_safe')}</p>
                        </div>
                    </div>
                </div>
            </div>
        </>
    );
};

export default SellPage;
