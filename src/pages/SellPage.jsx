import { useState, useEffect } from 'react';
import { Link, useNavigate } from 'react-router-dom';
import { Upload, X, Plus, DollarSign, Image, FileText, Tag, Shield, AlertCircle, CheckCircle, Search, ArrowLeft, Send, Loader2, Video, ExternalLink, Eye, EyeOff } from 'lucide-react';
import { useAuth } from '../context/AuthContext';
import { useLanguage } from '../context/LanguageContext';
import { useToast } from '../components/ToastProvider';
import { useCreateListing, useGames, useSEO } from '../hooks';
import apiClient from '../lib/apiClient';
import { resolveImageUrl } from '../lib/displayUtils';
import { CS2_WEAPON_TYPES, isCs2Game } from '../data/cs2WeaponTypes';
import SellerRulesQuiz from '../components/SellerRulesQuiz';

// Backend: logo = logotip, image = banner. Akkaunt sotishda o'yin uchun logoni ko'rsatamiz.
function getTopGamesForSell(apiGames) {
    const list = Array.isArray(apiGames) && apiGames.length > 0
        ? apiGames.map((g) => ({
            id: g.id,
            slug: g.slug,
            name: g.name,
            image: resolveImageUrl(g.logo || g.image || g.banner) || null,
            accountCount: g.active_listings_count ?? g.listings_count ?? 0,
        }))
        : [];
    const sorted = [...list].sort((a, b) => (b.accountCount ?? 0) - (a.accountCount ?? 0));
    return sorted;
}

const SellPage = () => {
    const navigate = useNavigate();
    const { isAuthenticated } = useAuth();

    useSEO({
        title: "O'yin Akkaunt Sotish — WibeStore | Tez va Xavfsiz",
        description: "O'yin akkauntingizni WibeStore da tez va xavfsiz soting. PUBG Mobile, Steam, Free Fire, Roblox, Mobile Legends va boshqa o'yin akkauntlarini yuqori narxda soting.",
        canonical: 'https://wibestore.net/sell',
    });
    const { t } = useLanguage();
    const { addToast } = useToast();
    const [rulesPassed, setRulesPassed] = useState(false);
    const [step, setStep] = useState(1);
    const [isSubmitting, setIsSubmitting] = useState(false);
    const [submitted, setSubmitted] = useState(false);
    const [createdListingId, setCreatedListingId] = useState(null);
    const [showGameModal, setShowGameModal] = useState(false);
    const [modalGameSearch, setModalGameSearch] = useState('');
    const [showAccountPassword, setShowAccountPassword] = useState(false);
    
    // API hooks
    const { mutate: createListing, isPending: _isCreating } = useCreateListing();
    const { data: gamesData, isLoading: gamesLoading, isError: gamesError } = useGames();
    const [imageFiles, setImageFiles] = useState([]);

    const apiGamesList = Array.isArray(gamesData?.results) ? gamesData.results : (Array.isArray(gamesData) ? gamesData : []);
    const hasApiGames = apiGamesList.length > 0;
    const allGamesSorted = getTopGamesForSell(apiGamesList);
    const topGamesForSell = hasApiGames ? allGamesSorted.slice(0, 8) : [];
    const allGames = hasApiGames
        ? apiGamesList.map((g) => ({
            id: g.id,
            slug: g.slug,
            name: g.name,
            image: resolveImageUrl(g.logo || g.image || g.banner) || null,
          }))
        : [];

    const filteredModalGames = modalGameSearch
        ? allGames.filter(g => g.name.toLowerCase().includes(modalGameSearch.toLowerCase()))
        : allGames;

    const [formData, setFormData] = useState({
        gameId: '', gameSlug: '', title: '', description: '', price: '',
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

    const gamesReady = !gamesLoading && hasApiGames;
    const gamesFailed = !gamesLoading && !hasApiGames && (gamesError || gamesData !== undefined);

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
            const emailVal = formData.accountEmail.trim().toLowerCase();
            if (!emailVal) {
                newErrors.accountEmail = t('sell.err_enter_account_email') || 'Akkaunt emailini kiriting';
            } else if (!emailVal.endsWith('@gmail.com') && !emailVal.endsWith('@mail.com')) {
                newErrors.accountEmail = t('sell.err_invalid_account_email') || 'Login @gmail.com yoki @mail.com bilan tugashi kerak';
            }
            const pwdVal = formData.accountPassword.trim();
            if (!pwdVal) {
                newErrors.accountPassword = t('sell.err_enter_account_password') || 'Akkaunt parolini kiriting';
            } else if (pwdVal.length < 8) {
                newErrors.accountPassword = t('sell.err_password_too_short') || "Parol kamida 8 ta belgidan iborat bo'lishi kerak";
            }
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
        // Validate all steps before submitting
        const allErrors = {};
        if (!formData.gameId) allErrors.gameId = t('sell.err_select_game') || "O'yinni tanlang";
        if (!formData.title?.trim()) allErrors.title = t('sell.err_enter_title') || 'Sarlavha kiriting';
        if (!formData.price || formData.price <= 0) allErrors.price = t('sell.err_enter_price') || 'Narxni kiriting';
        if (!formData.description?.trim()) allErrors.description = t('sell.err_enter_description') || 'Tavsif kiriting';
        const emailVal = (formData.accountEmail || '').trim().toLowerCase();
        if (!emailVal) {
            allErrors.accountEmail = t('sell.err_enter_account_email') || 'Akkaunt emailini kiriting';
        } else if (!emailVal.endsWith('@gmail.com') && !emailVal.endsWith('@mail.com')) {
            allErrors.accountEmail = t('sell.err_invalid_account_email') || 'Login @gmail.com yoki @mail.com bilan tugashi kerak';
        }
        const pwdVal = (formData.accountPassword || '').trim();
        if (!pwdVal) {
            allErrors.accountPassword = t('sell.err_enter_account_password') || 'Akkaunt parolini kiriting';
        } else if (pwdVal.length < 8) {
            allErrors.accountPassword = t('sell.err_password_too_short') || "Parol kamida 8 ta belgidan iborat bo'lishi kerak";
        }
        if (Object.keys(allErrors).length > 0) {
            setErrors(allErrors);
            if (allErrors.gameId || allErrors.title || allErrors.price) setStep(1);
            else if (allErrors.description) setStep(2);
            return;
        }

        // gameId UUID bo'lishi kerak — mock game tanlangan bo'lsa (API yuklanmagan), xabar beramiz
        const uuidRegex = /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i;
        if (formData.gameId && !uuidRegex.test(formData.gameId)) {
            addToast({
                type: 'error',
                title: t('common.error') || 'Xatolik',
                message: t('sell.game_not_loaded') || "O'yinlar ro'yxati yuklanmadi. Sahifani yangilang.",
            });
            return;
        }

        setIsSubmitting(true);

        try {
            // Backend ListingCreateSerializer: game_id (UUID), title, description, price, account_*, va boshqalar
            const listingData = {
                game_id: formData.gameId,
                title: formData.title.trim(),
                description: formData.description.trim(),
                price: Number(formData.price),
                level: (formData.level || '').toString(),
                rank: (formData.rank || '').toString(),
                skins_count: parseInt(formData.skins, 10) || 0,
                features: Array.isArray(formData.features) ? formData.features : [],
                login_method: formData.loginMethod || 'email',
                account_email: (formData.accountEmail || '').toString(),
                account_password: (formData.accountPassword || '').toString(),
                account_additional_info: formData.additionalInfo?.trim()
                    ? { note: formData.additionalInfo.trim() }
                    : {},
            };
            
            createListing(listingData, {
                onSuccess: async (response) => {
                    const listingId = response?.data?.id || response?.id;

                    if (listingId && imageFiles.length > 0) {
                        try {
                            const fd = new FormData();
                            imageFiles.forEach(file => fd.append('images', file));
                            await apiClient.post(`/listings/${listingId}/images/`, fd);
                        } catch {
                            addToast({
                                type: 'warning',
                                title: t('sell.images_upload_warning_title') || 'Rasmlar',
                                message: t('sell.images_upload_warning') || 'Listing yaratildi, lekin rasmlar yuklanmadi. Profildan qayta yuklashingiz mumkin.',
                            });
                        }
                    }

                    addToast({
                        type: 'success',
                        title: t('common.success') || 'Muvaffaqiyatli!',
                        message: t('sell.success_listing_created') || 'Listing yaratildi. Moderatsiyadan keyin ko\'rinadi.',
                    });
                    if (listingId) setCreatedListingId(listingId);
                    setSubmitted(true);
                },
                onError: (error) => {
                    const data = error?.response?.data;
                    let message = error?.message || t('sell.error_listing_create') || "E'lon yaratishda xatolik yuz berdi";
                    if (data) {
                        // Backend custom format: { success: false, error: { code, message, details } }
                        if (data.error) {
                            const errObj = data.error;
                            if (errObj.message && errObj.message !== 'An error occurred.') {
                                message = errObj.message;
                            } else if (errObj.details?.detail) {
                                message = String(errObj.details.detail);
                            }
                        } else if (typeof data === 'string') {
                            message = data;
                        } else if (data.detail) {
                            message = typeof data.detail === 'string' ? data.detail : JSON.stringify(data.detail);
                        } else if (typeof data === 'object' && Object.keys(data).length > 0) {
                            const firstKey = Object.keys(data)[0];
                            const val = data[firstKey];
                            message = Array.isArray(val) ? val[0] : (typeof val === 'string' ? val : JSON.stringify(val));
                        }
                    }
                    addToast({
                        type: 'error',
                        title: t('common.error') || 'Xatolik',
                        message,
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
            gameId: '', gameSlug: '', title: '', description: '', price: '',
            weaponType: '', level: '', rank: '', skins: '', features: [], images: [],
            loginMethod: 'email', accountEmail: '', accountPassword: '', additionalInfo: ''
        });
        setImageFiles([]);
    };

    const cardStyle = {
        backgroundColor: 'var(--color-bg-primary)',
        border: '1px solid var(--color-border-default)',
        borderRadius: 'var(--radius-xl)',
        padding: '24px',
    };

    const errorStyle = { color: 'var(--color-error)', fontSize: 'var(--font-size-sm)', marginTop: '4px' };

    const handleVideoUpload = async () => {
        if (!createdListingId) return;
        try {
            const { data } = await apiClient.post(`/listings/${createdListingId}/video-upload/`);
            if (data?.deep_link) {
                window.open(data.deep_link, '_blank');
            }
        } catch {
            addToast({
                type: 'error',
                title: t('common.error') || 'Xatolik',
                message: t('sell.video_upload_error') || 'Video yuklash linkini olishda xatolik.',
            });
        }
    };

    if (submitted) {
        return (
            <div className="page-enter" style={{ minHeight: '100vh', paddingBottom: '64px', display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
                <div className="text-center" style={{ maxWidth: '440px', padding: '0 16px' }}>
                    <div style={{
                        width: '72px', height: '72px', borderRadius: 'var(--radius-full)',
                        backgroundColor: 'var(--color-success-bg)', display: 'flex', alignItems: 'center', justifyContent: 'center',
                        margin: '0 auto 20px',
                    }}>
                        <CheckCircle style={{ width: '36px', height: '36px', color: 'var(--color-accent-green)' }} />
                    </div>
                    <h1 style={{ fontSize: 'var(--font-size-2xl)', fontWeight: 'var(--font-weight-bold)', color: 'var(--color-text-primary)', marginBottom: '12px' }}>
                        {t('sell.success_title') || "E'lon yuborildi!"}
                    </h1>
                    <p style={{ color: 'var(--color-text-secondary)', marginBottom: '24px' }}>
                        {t('sell.success_description') || "Sizning e'loningiz moderatsiyaga yuborildi. 24 soat ichida tekshiriladi va tasdiqlangandan keyin saytda paydo bo'ladi."}
                    </p>

                    {/* Video yuklash bloki */}
                    {createdListingId && (
                        <div style={{
                            border: '2px dashed var(--color-accent-blue)',
                            borderRadius: 'var(--radius-xl)',
                            padding: '20px',
                            marginBottom: '24px',
                            backgroundColor: 'rgba(37,99,235,0.05)',
                        }}>
                            <Video style={{ width: '32px', height: '32px', color: 'var(--color-accent-blue)', margin: '0 auto 8px' }} />
                            <p style={{ fontWeight: 700, color: 'var(--color-text-primary)', marginBottom: '6px', fontSize: '15px' }}>
                                {t('sell.video_add_title') || "Video qo'shmoqchimisiz?"}
                            </p>
                            <p style={{ color: 'var(--color-text-secondary)', fontSize: '13px', marginBottom: '14px' }}>
                                {t('sell.video_add_desc') || "Telegram bot orqali akkauntingiz haqida video yuklang (10-300 MB). Haridorlar videoni ko'rib, ko'proq ishonadi."}
                            </p>
                            <button
                                onClick={handleVideoUpload}
                                className="btn btn-lg"
                                style={{
                                    width: '100%',
                                    background: 'linear-gradient(135deg, #2563eb, #1d4ed8)',
                                    color: '#fff',
                                    border: 'none',
                                    display: 'flex',
                                    alignItems: 'center',
                                    justifyContent: 'center',
                                    gap: '8px',
                                    fontWeight: 700,
                                    fontSize: '15px',
                                }}
                            >
                                <Send className="w-5 h-5" />
                                {t('sell.video_upload_btn') || 'Telegram orqali video yuklash'}
                                <ExternalLink className="w-4 h-4" style={{ opacity: 0.7 }} />
                            </button>
                        </div>
                    )}

                    <div style={{ display: 'flex', flexDirection: 'column', gap: '10px' }}>
                        <button onClick={() => navigate('/profile')} className="btn btn-primary btn-lg" style={{ width: '100%' }}>
                            {t('common.go_to_profile')}
                        </button>
                        <button onClick={resetForm} className="btn btn-secondary btn-lg" style={{ width: '100%' }}>
                            {t('sell.another_listing_btn') || "Yana e'lon berish"}
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
                            <h3 style={{ fontSize: 'var(--font-size-lg)', fontWeight: 'var(--font-weight-bold)' }}>{t('sell.select_game_title') || "O'yin tanlang"}</h3>
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
                                    placeholder={t('sell.search_game_placeholder') || "O'yin nomini qidiring..."}
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
                                        onClick={() => { setFormData({ ...formData, gameId: game.id, gameSlug: game.slug || '' }); setShowGameModal(false); setModalGameSearch(''); }}
                                        style={{
                                            padding: '12px', borderRadius: 'var(--radius-lg)',
                                            border: `2px solid ${formData.gameId === game.id ? 'var(--color-accent-blue)' : 'var(--color-border-default)'}`,
                                            backgroundColor: formData.gameId === game.id ? 'var(--color-info-bg)' : 'var(--color-bg-secondary)',
                                            cursor: 'pointer', textAlign: 'center', transition: 'all 0.15s ease',
                                        }}
                                    >
                                        {game.image ? (
                                            <img src={game.image} alt={game.name} style={{ width: '48px', height: '48px', borderRadius: 'var(--radius-md)', margin: '0 auto 8px', objectFit: 'cover' }} />
                                        ) : (
                                            <div style={{ width: '48px', height: '48px', borderRadius: 'var(--radius-md)', margin: '0 auto 8px', backgroundColor: 'var(--color-bg-tertiary)', display: 'flex', alignItems: 'center', justifyContent: 'center', fontSize: '20px' }}>{game.name?.charAt(0) || '🎮'}</div>
                                        )}
                                        <p className="truncate" style={{ fontSize: 'var(--font-size-xs)', color: 'var(--color-text-secondary)' }}>{game.name}</p>
                                    </button>
                                ))}
                            </div>
                            {filteredModalGames.length === 0 && (
                                <p className="text-center" style={{ color: 'var(--color-text-muted)', padding: '32px 0' }}>{t('sell.no_games_found') || 'Hech narsa topilmadi'}</p>
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
                        <span className="breadcrumb-current">{t('sell.page_title') || 'Akkaunt sotish'}</span>
                    </div>

                    {/* Header */}
                    <div className="text-center" style={{ paddingTop: '16px', marginBottom: '24px' }}>
                        <h1 style={{ fontSize: 'var(--font-size-2xl)', fontWeight: 'var(--font-weight-bold)', color: 'var(--color-text-primary)', marginBottom: '8px' }}>
                            {t('sell.page_title') || 'Akkaunt sotish'}
                        </h1>
                        <p style={{ color: 'var(--color-text-secondary)' }}>{t('sell.page_subtitle') || "O'yin akkauntingizni xavfsiz soting"}</p>
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

                    {/* Games loading / error — form shown only when games loaded from API */}
                    {gamesLoading && (
                        <div style={{ ...cardStyle, textAlign: 'center', padding: '48px 24px' }}>
                            <p style={{ color: 'var(--color-text-muted)', marginBottom: '12px' }}>O'yinlar yuklanmoqda...</p>
                            <div style={{ display: 'flex', gap: '8px', justifyContent: 'center', flexWrap: 'wrap' }}>
                                {[1, 2, 3, 4, 5, 6].map((i) => (
                                    <div key={i} style={{ width: '64px', height: '64px', borderRadius: 'var(--radius-lg)', backgroundColor: 'var(--color-bg-tertiary)', animation: 'pulse 1.5s ease-in-out infinite' }} />
                                ))}
                            </div>
                        </div>
                    )}
                    {gamesFailed && (
                        <div style={{ ...cardStyle, textAlign: 'center', padding: '48px 24px' }}>
                            <AlertCircle style={{ width: '48px', height: '48px', color: 'var(--color-accent-orange)', margin: '0 auto 16px' }} />
                            <p style={{ color: 'var(--color-text-primary)', marginBottom: '8px' }}>{t('sell.game_not_loaded') || "O'yinlar ro'yxati yuklanmadi."}</p>
                            <p style={{ color: 'var(--color-text-muted)', fontSize: 'var(--font-size-sm)', marginBottom: '16px' }}>Sahifani yangilang yoki keyinroq qayta urinib ko'ring.</p>
                            <button type="button" className="btn btn-primary btn-md" onClick={() => window.location.reload()}>
                                Sahifani yangilash
                            </button>
                        </div>
                    )}

                    {/* Form Card — only when games loaded from API */}
                    {gamesReady && <div style={cardStyle}>
                        {/* Step 1: Basic Info */}
                        {step === 1 && (
                            <div>
                                <h2 className="flex items-center gap-2" style={{ fontSize: 'var(--font-size-lg)', fontWeight: 'var(--font-weight-bold)', color: 'var(--color-text-primary)', marginBottom: '20px' }}>
                                    <Tag className="w-5 h-5" style={{ color: 'var(--color-accent-blue)' }} />
                                    {t('sell.step1_title') || "Asosiy ma'lumotlar"}
                                </h2>

                                {/* Game Selection */}
                                <div style={{ marginBottom: '20px' }}>
                                    <label className="input-label">{t('sell.game_label') || "O'yin *"}</label>
                                    <div className="grid grid-cols-3 sm:grid-cols-4" style={{ gap: '8px' }}>
                                        {topGamesForSell.map((game) => (
                                            <button key={game.id} type="button"
                                                onClick={() => setFormData({ ...formData, gameId: game.id, gameSlug: game.slug || '' })}
                                                style={{
                                                    padding: '10px', borderRadius: 'var(--radius-lg)',
                                                    border: `2px solid ${formData.gameId === game.id ? 'var(--color-accent-blue)' : 'var(--color-border-default)'}`,
                                                    backgroundColor: formData.gameId === game.id ? 'var(--color-info-bg)' : 'var(--color-bg-secondary)',
                                                    cursor: 'pointer', textAlign: 'center', transition: 'all 0.15s ease',
                                                }}
                                            >
                                                {game.image ? (
                                                    <img src={game.image} alt={game.name} style={{ width: '40px', height: '40px', borderRadius: 'var(--radius-md)', margin: '0 auto 6px', objectFit: 'cover' }} />
                                                ) : (
                                                    <div style={{ width: '40px', height: '40px', borderRadius: 'var(--radius-md)', margin: '0 auto 6px', backgroundColor: 'var(--color-bg-tertiary)', display: 'flex', alignItems: 'center', justifyContent: 'center', fontSize: '16px' }}>{game.name?.charAt(0) || '🎮'}</div>
                                                )}
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
                                    <label className="input-label">{t('sell.price_label') || "Narx (so'm) *"}</label>
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
                                {isCs2Game(formData.gameSlug || formData.gameId) && (
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
                                    {t('sell.step2_title') || "Batafsil ma'lumot"}
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
                                    <label className="input-label">{t('sell.features_label') || 'Xususiyatlar'}</label>
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
                                    <label className="input-label">{t('sell.skins_count_label') || 'Skinlar soni'}</label>
                                    <input type="text" value={formData.skins}
                                        onChange={(e) => setFormData({ ...formData, skins: e.target.value })}
                                        placeholder="50+" className="input input-lg" />
                                </div>

                                {/* Images upload */}
                                <div>
                                    <label className="input-label">{t('sell.images_label') || 'Rasmlar (max 5 ta)'}</label>

                                    {formData.images.length > 0 && (
                                        <div className="grid grid-cols-3 sm:grid-cols-5" style={{ gap: '10px', marginBottom: '12px' }}>
                                            {formData.images.map((img, index) => (
                                                <div key={index} className="relative group" style={{ aspectRatio: '1', borderRadius: 'var(--radius-lg)', overflow: 'hidden' }}>
                                                    <img src={img} alt={`Preview ${index + 1}`} style={{ width: '100%', height: '100%', objectFit: 'cover' }} />
                                                    <button type="button"
                                                        onClick={() => { setFormData(prev => ({ ...prev, images: prev.images.filter((_, i) => i !== index) })); setImageFiles(prev => prev.filter((_, i) => i !== index)); }}
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
                                                            setImageFiles(prev => [...prev, file]);
                                                        };
                                                        reader.readAsDataURL(file);
                                                    });
                                                    e.target.value = '';
                                                }}
                                            />
                                            <Upload style={{ width: '36px', height: '36px', color: 'var(--color-text-muted)', margin: '0 auto 10px' }} />
                                            <p style={{ color: 'var(--color-text-secondary)' }}>{t('sell.images_upload_prompt') || 'Rasmlarni yuklash uchun bosing'}</p>
                                            <p style={{ fontSize: 'var(--font-size-sm)', color: 'var(--color-text-muted)', marginTop: '4px' }}>PNG, JPG (max 5MB, {5 - formData.images.length} ta qoldi)</p>
                                        </label>
                                    )}
                                </div>

                                {/* Video upload via Telegram (ixtiyoriy) */}
                                <div style={{ marginTop: '20px' }}>
                                    <label className="input-label" style={{ display: 'flex', alignItems: 'center', gap: '6px' }}>
                                        <Video className="w-4 h-4" style={{ color: 'var(--color-accent-blue)' }} />
                                        {t('sell.video_label') || 'Video (ixtiyoriy)'}
                                    </label>
                                    <p style={{ fontSize: 'var(--font-size-sm)', color: 'var(--color-text-secondary)', marginBottom: '10px' }}>
                                        {t('sell.video_hint') || "Akkauntingiz haqida video qo'shing — haridorlar ko'proq ishonadi. Video Telegram bot orqali yuklanadi (10-300 MB)."}
                                    </p>
                                    <div
                                        style={{
                                            border: '2px dashed var(--color-border-default)',
                                            borderRadius: 'var(--radius-lg)',
                                            padding: '20px 16px',
                                            textAlign: 'center',
                                            backgroundColor: 'var(--color-bg-secondary)',
                                        }}
                                    >
                                        <Video style={{ width: '32px', height: '32px', color: 'var(--color-accent-blue)', margin: '0 auto 8px', opacity: 0.7 }} />
                                        <p style={{ color: 'var(--color-text-secondary)', fontSize: 'var(--font-size-sm)', marginBottom: '12px' }}>
                                            {t('sell.video_telegram_info') || "E'lon yaratilgandan so'ng video yuklash imkoniyati paydo bo'ladi. Video Telegram bot orqali yuklanadi."}
                                        </p>
                                        <div style={{
                                            display: 'inline-flex', alignItems: 'center', gap: '6px',
                                            padding: '8px 16px', borderRadius: 'var(--radius-lg)',
                                            backgroundColor: 'var(--color-bg-tertiary)',
                                            color: 'var(--color-text-muted)', fontSize: 'var(--font-size-sm)',
                                        }}>
                                            <Send className="w-4 h-4" />
                                            {t('sell.video_after_create') || "E'lon yaratilgandan keyin video qo'shish mumkin"}
                                        </div>
                                    </div>
                                </div>
                            </div>
                        )}

                        {/* Step 3: Account Details */}
                        {step === 3 && (
                            <div>
                                <h2 className="flex items-center gap-2" style={{ fontSize: 'var(--font-size-lg)', fontWeight: 'var(--font-weight-bold)', color: 'var(--color-text-primary)', marginBottom: '20px' }}>
                                    <Shield className="w-5 h-5" style={{ color: 'var(--color-accent-green)' }} />
                                    {t('sell.step3_title') || "Akkaunt ma'lumotlari"}
                                </h2>

                                {/* Warning */}
                                <div className="flex items-start gap-3" style={{
                                    padding: '14px 16px', marginBottom: '20px',
                                    borderRadius: 'var(--radius-md)',
                                    backgroundColor: 'var(--color-warning-bg)',
                                    border: '1px solid var(--color-accent-orange)',
                                }}>
                                    <AlertCircle className="w-4 h-4 mt-0.5 shrink-0" style={{ color: 'var(--color-accent-orange)' }} />
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
                                    <input type="email" value={formData.accountEmail}
                                        onChange={(e) => setFormData({ ...formData, accountEmail: e.target.value })}
                                        placeholder="example@gmail.com" className="input input-lg"
                                        autoComplete="off" />
                                    {errors.accountEmail
                                        ? <p style={errorStyle}>{errors.accountEmail}</p>
                                        : <p style={{ fontSize: 'var(--font-size-xs)', color: 'var(--color-text-muted)', marginTop: '4px' }}>
                                            {t('sell.email_domain_hint') || 'Faqat @gmail.com yoki @mail.com'}
                                          </p>
                                    }
                                </div>

                                {/* Account Password */}
                                <div style={{ marginBottom: '16px' }}>
                                    <label className="input-label">{t('sell.account_password_label')}</label>
                                    <div style={{ position: 'relative' }}>
                                        <input
                                            type={showAccountPassword ? 'text' : 'password'}
                                            value={formData.accountPassword}
                                            onChange={(e) => setFormData({ ...formData, accountPassword: e.target.value })}
                                            placeholder="••••••••" className="input input-lg"
                                            autoComplete="off"
                                            style={{ paddingRight: '44px' }}
                                        />
                                        <button type="button"
                                            onClick={() => setShowAccountPassword(p => !p)}
                                            style={{ position: 'absolute', right: '12px', top: '50%', transform: 'translateY(-50%)', background: 'none', border: 'none', cursor: 'pointer', color: 'var(--color-text-muted)', padding: '4px' }}>
                                            {showAccountPassword ? <EyeOff className="w-4 h-4" /> : <Eye className="w-4 h-4" />}
                                        </button>
                                    </div>
                                    {errors.accountPassword
                                        ? <p style={errorStyle}>{errors.accountPassword}</p>
                                        : <p style={{ fontSize: 'var(--font-size-xs)', color: 'var(--color-text-muted)', marginTop: '4px' }}>
                                            {t('sell.password_min_hint') || "Kamida 8 ta belgi"}
                                          </p>
                                    }
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
                                <button onClick={prevStep} className="btn btn-danger btn-md flex items-center gap-2">
                                    <span className="btn-icon-square"><ArrowLeft className="w-4 h-4" /></span>
                                    {t('sell.back_btn')}
                                </button>
                            ) : <div />}
                            {step < 3 ? (
                                <button onClick={nextStep} className="btn btn-primary btn-lg flex items-center gap-2">
                                    {t('sell.next_btn')}
                                    <span className="btn-icon-square"><ArrowLeft className="w-4 h-4" style={{ transform: 'rotate(180deg)' }} /></span>
                                </button>
                            ) : (
                                <button onClick={handleSubmit} disabled={isSubmitting} className="btn btn-success btn-lg flex items-center gap-2">
                                    <span className="btn-icon-square">
                                        {isSubmitting ? <Loader2 className="w-4 h-4 animate-spin" /> : <Send className="w-4 h-4" />}
                                    </span>
                                    {isSubmitting ? t('sell.submitting') : t('sell.submit_btn')}
                                </button>
                            )}
                        </div>
                    </div>
                    }

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
