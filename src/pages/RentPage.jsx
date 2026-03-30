import { useState, useEffect } from 'react';
import { Link, useNavigate } from 'react-router-dom';
import { Upload, X, Plus, Image, FileText, Shield, AlertCircle, CheckCircle, Search, ArrowLeft, Loader2, Key, Clock, Wallet, Trash2 } from 'lucide-react';
import { useAuth } from '../context/AuthContext';
import { useLanguage } from '../context/LanguageContext';
import { useToast } from '../components/ToastProvider';
import { useCreateListing, useGames, useSEO } from '../hooks';
import apiClient from '../lib/apiClient';
import { resolveImageUrl } from '../lib/displayUtils';
import { formatPrice } from '../data/mockData';
import SellerRulesQuiz from '../components/SellerRulesQuiz';

function getTopGamesForRent(apiGames) {
    const list = Array.isArray(apiGames) && apiGames.length > 0
        ? apiGames.map((g) => ({
            id: g.id, slug: g.slug, name: g.name,
            image: resolveImageUrl(g.logo || g.image || g.banner) || null,
            accountCount: g.active_listings_count ?? g.listings_count ?? 0,
        }))
        : [];
    return [...list].sort((a, b) => (b.accountCount ?? 0) - (a.accountCount ?? 0));
}

const MAX_TIME_SLOTS = 5;

const RentPage = () => {
    const navigate = useNavigate();
    const { isAuthenticated } = useAuth();
    const { t } = useLanguage();
    const { addToast } = useToast();

    useSEO({
        title: t('rent.page_title') || "Akkauntni ijaraga berish — WibeStore",
        description: t('rent.page_subtitle') || "O'yin akkauntingizni ijarada qo'ying va daromad oling",
        canonical: 'https://wibestore.net/rent',
    });

    const [rulesPassed, setRulesPassed] = useState(false);
    const [step, setStep] = useState(1);
    const [isSubmitting, setIsSubmitting] = useState(false);
    const [submitted, setSubmitted] = useState(false);
    const [showGameModal, setShowGameModal] = useState(false);
    const [modalGameSearch, setModalGameSearch] = useState('');
    const [imageFiles, setImageFiles] = useState([]);

    const { mutate: createListing } = useCreateListing();
    const { data: gamesData, isLoading: gamesLoading, isError: gamesError } = useGames();

    const apiGamesList = Array.isArray(gamesData?.results) ? gamesData.results : (Array.isArray(gamesData) ? gamesData : []);
    const hasApiGames = apiGamesList.length > 0;
    const gamesFailed = !gamesLoading && !hasApiGames && (gamesError || gamesData !== undefined);
    const topGamesForRent = hasApiGames ? getTopGamesForRent(apiGamesList).slice(0, 8) : [];
    const allGames = hasApiGames
        ? apiGamesList.map((g) => ({ id: g.id, slug: g.slug, name: g.name, image: resolveImageUrl(g.logo || g.image || g.banner) || null }))
        : [];
    const filteredModalGames = modalGameSearch
        ? allGames.filter(g => g.name.toLowerCase().includes(modalGameSearch.toLowerCase()))
        : allGames;

    const [formData, setFormData] = useState({
        gameId: '', gameSlug: '', title: '', description: '',
        deposit: '', level: '', rank: '', skins: '', features: [],
        loginMethod: 'email', accountEmail: '', accountPassword: '', additionalInfo: '',
        timeSlots: [{ label: '', price: '' }],
        rentalPeriodDays: '',
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
                        <Link to="/">{t('common.home') || 'Bosh sahifa'}</Link>
                        <span className="breadcrumb-separator">/</span>
                        <span className="breadcrumb-current">{t('rent.page_title') || 'Arenda'}</span>
                    </div>
                    <div style={{ flex: 1, minHeight: 0, display: 'flex', flexDirection: 'column' }}>
                        <SellerRulesQuiz onPass={() => setRulesPassed(true)} />
                    </div>
                </div>
            </div>
        );
    }

    // Time slots management
    const addTimeSlot = () => {
        if (formData.timeSlots.length >= MAX_TIME_SLOTS) return;
        // Require all existing slots to be filled before adding another
        const lastSlot = formData.timeSlots[formData.timeSlots.length - 1];
        if (!lastSlot.label.trim() || !lastSlot.price) {
            setErrors(prev => ({
                ...prev,
                [`slot_label_${formData.timeSlots.length - 1}`]: !lastSlot.label.trim() ? 'Vaqtni kiriting' : undefined,
                [`slot_price_${formData.timeSlots.length - 1}`]: !lastSlot.price ? 'Narxni kiriting' : undefined,
            }));
            return;
        }
        setFormData(prev => ({ ...prev, timeSlots: [...prev.timeSlots, { label: '', price: '' }] }));
    };
    const removeTimeSlot = (index) => {
        if (formData.timeSlots.length > 1) {
            setFormData(prev => ({ ...prev, timeSlots: prev.timeSlots.filter((_, i) => i !== index) }));
        }
    };
    const updateTimeSlot = (index, field, value) => {
        setFormData(prev => ({
            ...prev,
            timeSlots: prev.timeSlots.map((slot, i) => i === index ? { ...slot, [field]: value } : slot),
        }));
    };

    const featureOptions = [
        { value: 'Original email', labelKey: 'sell.feature_original_email' },
        { value: "Email o'zgartirish mumkin", labelKey: 'sell.feature_email_change' },
        { value: "Ban yo'q", labelKey: 'sell.feature_no_ban' },
        { value: 'Premium/VIP', labelKey: 'sell.feature_premium_vip' },
        { value: 'Maxsus skinlar', labelKey: 'sell.feature_skins' },
    ];

    const validateStep = (stepNum) => {
        const newErrors = {};
        if (stepNum === 1) {
            if (!formData.gameId) newErrors.gameId = "O'yinni tanlang";
            if (!formData.title.trim()) newErrors.title = 'Sarlavha kiriting';
            const validSlots = formData.timeSlots.filter(s => s.label.trim() && s.price);
            if (validSlots.length === 0) newErrors.timeSlots = "Kamida 1 ta vaqt va narx kiriting";
            formData.timeSlots.forEach((slot, i) => {
                if (slot.label.trim() && !slot.price) newErrors[`slot_price_${i}`] = 'Narxni kiriting';
                if (!slot.label.trim() && slot.price) newErrors[`slot_label_${i}`] = 'Vaqtni kiriting';
            });
            if (!formData.rentalPeriodDays) newErrors.rentalPeriodDays = 'Ijara muddatini tanlang';
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

    const nextStep = () => { if (validateStep(step)) setStep(step + 1); };
    const prevStep = () => setStep(step - 1);
    const toggleFeature = (f) => setFormData(prev => ({
        ...prev,
        features: prev.features.includes(f) ? prev.features.filter(x => x !== f) : [...prev.features, f]
    }));

    const handleSubmit = async () => {
        if (!validateStep(3)) return;
        const uuidRegex = /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i;
        if (formData.gameId && !uuidRegex.test(formData.gameId)) {
            addToast({ type: 'error', title: 'Xatolik', message: "O'yinlar yuklanmadi." });
            return;
        }
        setIsSubmitting(true);

        const validSlots = formData.timeSlots.filter(s => s.label.trim() && s.price);
        const minPrice = Math.min(...validSlots.map(s => Number(s.price)));

        try {
            const listingData = {
                listing_type: 'rent',
                game_id: formData.gameId,
                title: formData.title.trim(),
                description: formData.description.trim(),
                price: minPrice,
                rental_period_days: parseInt(formData.rentalPeriodDays, 10),
                rental_time_slots: validSlots.map(s => ({ label: s.label.trim(), price: Number(s.price) })),
                rental_deposit: formData.deposit ? Number(formData.deposit) : null,
                level: (formData.level || '').toString(),
                rank: (formData.rank || '').toString(),
                skins_count: parseInt(formData.skins, 10) || 0,
                features: Array.isArray(formData.features) ? formData.features : [],
                login_method: formData.loginMethod || 'email',
                account_email: (formData.accountEmail || '').toString(),
                account_password: (formData.accountPassword || '').toString(),
                account_additional_info: formData.additionalInfo?.trim() ? { note: formData.additionalInfo.trim() } : {},
            };
            createListing(listingData, {
                onSuccess: async (response) => {
                    const listingId = response?.data?.id || response?.id;
                    if (listingId && imageFiles.length > 0) {
                        try {
                            const fd = new FormData();
                            imageFiles.forEach(file => fd.append('images', file));
                            await apiClient.post(`/listings/${listingId}/images/`, fd);
                        } catch { /* silently handle image upload errors */ }
                    }
                    addToast({ type: 'success', title: 'Muvaffaqiyat', message: "Arenda e'loningiz moderatsiyaga yuborildi." });
                    setSubmitted(true);
                },
                onError: (error) => {
                    const data = error?.response?.data;
                    let message = "E'lon yaratishda xatolik";
                    if (data?.error?.details) {
                        const firstKey = Object.keys(data.error.details)[0];
                        const val = data.error.details[firstKey];
                        message = Array.isArray(val) ? val[0] : String(val);
                    } else if (data?.error?.message) {
                        message = data.error.message;
                    }
                    addToast({ type: 'error', title: 'Xatolik', message });
                },
                onSettled: () => setIsSubmitting(false),
            });
        } catch {
            setIsSubmitting(false);
        }
    };

    const cardStyle = {
        backgroundColor: 'var(--color-bg-primary)',
        border: '1px solid var(--color-border-default)',
        borderRadius: 'var(--radius-xl)',
        padding: '24px',
    };
    const errorStyle = { color: 'var(--color-error)', fontSize: 'var(--font-size-sm)', marginTop: '4px' };
    const selectedGame = allGames.find(g => g.id === formData.gameId);

    if (submitted) {
        return (
            <div className="page-enter" style={{ minHeight: '100vh', paddingBottom: '64px', display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
                <div className="text-center" style={{ maxWidth: '440px', padding: '0 16px' }}>
                    <div style={{ width: '72px', height: '72px', borderRadius: 'var(--radius-full)', backgroundColor: 'var(--color-success-bg)', display: 'flex', alignItems: 'center', justifyContent: 'center', margin: '0 auto 20px' }}>
                        <CheckCircle style={{ width: '36px', height: '36px', color: 'var(--color-accent-green)' }} />
                    </div>
                    <h1 style={{ fontSize: 'var(--font-size-2xl)', fontWeight: 'var(--font-weight-bold)', color: 'var(--color-text-primary)', marginBottom: '12px' }}>
                        E'lon yuborildi!
                    </h1>
                    <p style={{ color: 'var(--color-text-secondary)', marginBottom: '24px' }}>
                        Arenda e'loningiz moderatsiyaga yuborildi. Tez orada ko'rib chiqiladi.
                    </p>
                    <div style={{ display: 'flex', flexDirection: 'column', gap: '10px' }}>
                        <button onClick={() => navigate('/profile')} className="btn btn-primary btn-lg" style={{ width: '100%' }}>Profilga o'tish</button>
                        <button onClick={() => { setSubmitted(false); setStep(1); setFormData({ gameId: '', gameSlug: '', title: '', description: '', deposit: '', level: '', rank: '', skins: '', features: [], loginMethod: 'email', accountEmail: '', accountPassword: '', additionalInfo: '', timeSlots: [{ label: '', price: '' }], rentalPeriodDays: '' }); setImageFiles([]); }} className="btn btn-secondary btn-lg" style={{ width: '100%' }}>
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
                            <h3 style={{ fontSize: 'var(--font-size-lg)', fontWeight: 'var(--font-weight-bold)' }}>O'yin tanlang</h3>
                            <button onClick={() => { setShowGameModal(false); setModalGameSearch(''); }} style={{ background: 'none', border: 'none', cursor: 'pointer', padding: '4px', color: 'var(--color-text-muted)' }}>
                                <X className="w-5 h-5" />
                            </button>
                        </div>
                        <div style={{ padding: '16px', borderBottom: '1px solid var(--color-border-muted)' }}>
                            <div className="relative">
                                <Search className="absolute left-4 top-1/2 -translate-y-1/2 w-4 h-4" style={{ color: 'var(--color-text-muted)' }} />
                                <input type="text" value={modalGameSearch} onChange={(e) => setModalGameSearch(e.target.value)}
                                    placeholder="O'yin nomini qidiring..." className="input input-lg" style={{ paddingLeft: '40px' }} autoFocus />
                            </div>
                        </div>
                        <div className="modal-body" style={{ maxHeight: '50vh', overflowY: 'auto' }}>
                            <div className="grid grid-cols-3 sm:grid-cols-4" style={{ gap: '10px' }}>
                                {filteredModalGames.map((game) => (
                                    <button key={game.id} type="button"
                                        onClick={() => { setFormData({ ...formData, gameId: game.id, gameSlug: game.slug || '' }); setShowGameModal(false); setModalGameSearch(''); }}
                                        style={{
                                            padding: '12px', borderRadius: 'var(--radius-lg)',
                                            border: `2px solid ${formData.gameId === game.id ? '#a855f7' : 'var(--color-border-default)'}`,
                                            backgroundColor: formData.gameId === game.id ? 'rgba(168,85,247,0.08)' : 'var(--color-bg-secondary)',
                                            cursor: 'pointer', textAlign: 'center', transition: 'all 0.15s ease',
                                        }}>
                                        {game.image
                                            ? <img src={game.image} alt={game.name} style={{ width: '48px', height: '48px', borderRadius: 'var(--radius-md)', margin: '0 auto 8px', objectFit: 'cover' }} />
                                            : <div style={{ width: '48px', height: '48px', borderRadius: 'var(--radius-md)', margin: '0 auto 8px', backgroundColor: 'var(--color-bg-tertiary)', display: 'flex', alignItems: 'center', justifyContent: 'center', fontSize: '20px' }}>{game.name?.charAt(0)}</div>
                                        }
                                        <p className="truncate" style={{ fontSize: 'var(--font-size-xs)', color: 'var(--color-text-secondary)' }}>{game.name}</p>
                                    </button>
                                ))}
                            </div>
                            {filteredModalGames.length === 0 && <p className="text-center" style={{ color: 'var(--color-text-muted)', padding: '32px 0' }}>O'yin topilmadi</p>}
                        </div>
                    </div>
                </div>
            )}

            <div className="page-enter" style={{ minHeight: '100vh', paddingBottom: '64px' }}>
                <div className="gh-container" style={{ maxWidth: '720px' }}>
                    <div className="breadcrumbs">
                        <Link to="/">{t('common.home') || 'Bosh sahifa'}</Link>
                        <span className="breadcrumb-separator">/</span>
                        <span className="breadcrumb-current">Arenda</span>
                    </div>

                    {/* Header */}
                    <div className="text-center" style={{ paddingTop: '16px', marginBottom: '24px' }}>
                        <div style={{ display: 'inline-flex', alignItems: 'center', gap: '8px', padding: '6px 16px', borderRadius: 'var(--radius-full)', backgroundColor: 'rgba(168,85,247,0.12)', color: '#a855f7', fontWeight: 700, fontSize: '13px', marginBottom: '12px' }}>
                            <Key className="w-4 h-4" />
                            Arenda
                        </div>
                        <h1 style={{ fontSize: 'var(--font-size-2xl)', fontWeight: 'var(--font-weight-bold)', color: 'var(--color-text-primary)', marginBottom: '8px' }}>
                            Akkauntni ijaraga berish
                        </h1>
                        <p style={{ color: 'var(--color-text-secondary)' }}>O'yin akkauntingizni ijarada qo'ying va daromad oling</p>
                    </div>

                    {/* Progress Steps */}
                    <div className="flex items-center justify-center" style={{ marginBottom: '24px' }}>
                        {[1, 2, 3].map((s, i) => (
                            <div key={s} className="flex items-center">
                                <div style={{
                                    width: '36px', height: '36px', borderRadius: 'var(--radius-full)',
                                    display: 'flex', alignItems: 'center', justifyContent: 'center',
                                    fontWeight: 'var(--font-weight-bold)', fontSize: 'var(--font-size-sm)',
                                    backgroundColor: step >= s ? '#a855f7' : 'var(--color-bg-tertiary)',
                                    color: step >= s ? '#ffffff' : 'var(--color-text-muted)',
                                    transition: 'all 0.2s',
                                }}>{s}</div>
                                {i < 2 && <div style={{ width: '48px', height: '2px', backgroundColor: step > s ? '#a855f7' : 'var(--color-bg-tertiary)', margin: '0 6px', transition: 'all 0.3s' }} />}
                            </div>
                        ))}
                    </div>

                    {/* Games loading / error state */}
                    {gamesLoading && step === 1 && (
                        <div style={{ ...cardStyle, textAlign: 'center', padding: '48px 24px' }}>
                            <p style={{ color: 'var(--color-text-muted)', marginBottom: '12px' }}>O'yinlar yuklanmoqda...</p>
                            <div style={{ display: 'flex', gap: '8px', justifyContent: 'center', flexWrap: 'wrap' }}>
                                {[1, 2, 3, 4].map((i) => (
                                    <div key={i} style={{ width: '64px', height: '64px', borderRadius: 'var(--radius-lg)', backgroundColor: 'var(--color-bg-tertiary)', animation: 'pulse 1.5s ease-in-out infinite' }} />
                                ))}
                            </div>
                        </div>
                    )}
                    {gamesFailed && step === 1 && (
                        <div style={{ ...cardStyle, textAlign: 'center', padding: '48px 24px' }}>
                            <AlertCircle style={{ width: '48px', height: '48px', color: 'var(--color-accent-orange)', margin: '0 auto 16px' }} />
                            <p style={{ color: 'var(--color-text-primary)', marginBottom: '8px' }}>O'yinlar ro'yxati yuklanmadi.</p>
                            <p style={{ color: 'var(--color-text-muted)', fontSize: 'var(--font-size-sm)', marginBottom: '16px' }}>Sahifani yangilang yoki keyinroq qayta urinib ko'ring.</p>
                            <button type="button" className="btn btn-primary btn-md" onClick={() => window.location.reload()}>
                                Sahifani yangilash
                            </button>
                        </div>
                    )}

                    {/* Step 1: Game + Time Slots */}
                    {step === 1 && !gamesLoading && !gamesFailed && (
                        <div style={cardStyle}>
                            <h2 style={{ fontSize: 'var(--font-size-lg)', fontWeight: 'var(--font-weight-bold)', marginBottom: '20px', color: 'var(--color-text-primary)' }}>
                                Asosiy ma'lumotlar
                            </h2>

                            {/* Game Selection */}
                            <label style={{ display: 'block', marginBottom: '16px' }}>
                                <span style={{ display: 'block', fontSize: 'var(--font-size-sm)', fontWeight: 600, marginBottom: '6px', color: 'var(--color-text-secondary)' }}>O'yin *</span>
                                {hasApiGames && (
                                    <div className="grid grid-cols-4" style={{ gap: '8px', marginBottom: '8px' }}>
                                        {topGamesForRent.map((game) => (
                                            <button key={game.id} type="button"
                                                onClick={() => setFormData({ ...formData, gameId: game.id, gameSlug: game.slug || '' })}
                                                style={{
                                                    padding: '10px 6px', borderRadius: 'var(--radius-lg)',
                                                    border: `2px solid ${formData.gameId === game.id ? '#a855f7' : 'var(--color-border-default)'}`,
                                                    backgroundColor: formData.gameId === game.id ? 'rgba(168,85,247,0.08)' : 'var(--color-bg-secondary)',
                                                    cursor: 'pointer', textAlign: 'center', transition: 'all 0.15s ease',
                                                }}>
                                                {game.image
                                                    ? <img src={game.image} alt={game.name} style={{ width: '40px', height: '40px', borderRadius: 'var(--radius-md)', margin: '0 auto 6px', objectFit: 'cover' }} />
                                                    : <div style={{ width: '40px', height: '40px', borderRadius: 'var(--radius-md)', margin: '0 auto 6px', backgroundColor: 'var(--color-bg-tertiary)', display: 'flex', alignItems: 'center', justifyContent: 'center', fontSize: '16px' }}>{game.name?.charAt(0)}</div>
                                                }
                                                <p className="truncate" style={{ fontSize: '11px', color: 'var(--color-text-secondary)' }}>{game.name}</p>
                                            </button>
                                        ))}
                                    </div>
                                )}
                                <button type="button" onClick={() => setShowGameModal(true)} className="btn btn-secondary btn-sm" style={{ width: '100%' }}>
                                    {selectedGame ? `${selectedGame.name} (o'zgartirish)` : "Boshqa o'yinlarni ko'rish"}
                                </button>
                                {errors.gameId && <p style={errorStyle}>{errors.gameId}</p>}
                            </label>

                            {/* Title */}
                            <label style={{ display: 'block', marginBottom: '16px' }}>
                                <span style={{ display: 'block', fontSize: 'var(--font-size-sm)', fontWeight: 600, marginBottom: '6px', color: 'var(--color-text-secondary)' }}>Sarlavha *</span>
                                <input type="text" value={formData.title} onChange={e => setFormData({ ...formData, title: e.target.value })}
                                    placeholder="Masalan: PUBG 77 lvl Conqueror akkaunt arenda" className="input input-lg" style={{ width: '100%' }} />
                                {errors.title && <p style={errorStyle}>{errors.title}</p>}
                            </label>

                            {/* Custom Time Slots */}
                            <div style={{ marginBottom: '16px' }}>
                                <span style={{ display: 'flex', alignItems: 'center', gap: '6px', fontSize: 'var(--font-size-sm)', fontWeight: 600, marginBottom: '10px', color: 'var(--color-text-secondary)' }}>
                                    <Clock className="w-4 h-4" /> Ijara vaqti va narxlari * <span style={{ fontWeight: 400, fontSize: '12px', color: 'var(--color-text-muted)' }}>(max {MAX_TIME_SLOTS} ta)</span>
                                </span>

                                <div style={{ display: 'flex', flexDirection: 'column', gap: '10px' }}>
                                    {formData.timeSlots.map((slot, index) => (
                                        <div key={index} style={{
                                            display: 'flex', gap: '8px', alignItems: 'flex-start',
                                            padding: '12px', borderRadius: 'var(--radius-lg)',
                                            backgroundColor: 'var(--color-bg-secondary)',
                                            border: '1px solid var(--color-border-default)',
                                        }}>
                                            <div style={{ flex: 1 }}>
                                                <input
                                                    type="text"
                                                    value={slot.label}
                                                    onChange={e => updateTimeSlot(index, 'label', e.target.value)}
                                                    placeholder="Masalan: 1 soat, 1 kun, Kechdan tongacha"
                                                    className="input input-md"
                                                    style={{ width: '100%', marginBottom: errors[`slot_label_${index}`] ? '2px' : 0 }}
                                                />
                                                {errors[`slot_label_${index}`] && <p style={{ ...errorStyle, marginTop: '2px' }}>{errors[`slot_label_${index}`]}</p>}
                                            </div>
                                            <div style={{ width: '160px', flexShrink: 0 }}>
                                                <input
                                                    type="number"
                                                    min={0}
                                                    value={slot.price}
                                                    onChange={e => updateTimeSlot(index, 'price', e.target.value)}
                                                    placeholder="Narx (so'm)"
                                                    className="input input-md"
                                                    style={{ width: '100%', marginBottom: errors[`slot_price_${index}`] ? '2px' : 0 }}
                                                />
                                                {errors[`slot_price_${index}`] && <p style={{ ...errorStyle, marginTop: '2px' }}>{errors[`slot_price_${index}`]}</p>}
                                            </div>
                                            {formData.timeSlots.length > 1 && (
                                                <button type="button" onClick={() => removeTimeSlot(index)}
                                                    style={{ padding: '8px', background: 'none', border: 'none', cursor: 'pointer', color: 'var(--color-accent-red)', flexShrink: 0 }}
                                                    title="O'chirish">
                                                    <Trash2 style={{ width: '16px', height: '16px' }} />
                                                </button>
                                            )}
                                        </div>
                                    ))}
                                </div>

                                {formData.timeSlots.length < MAX_TIME_SLOTS && (
                                    <button type="button" onClick={addTimeSlot}
                                        className="btn btn-ghost btn-sm" style={{ marginTop: '8px', color: '#a855f7', display: 'flex', alignItems: 'center', gap: '4px' }}>
                                        <Plus style={{ width: '14px', height: '14px' }} /> Vaqt qo'shish
                                    </button>
                                )}

                                {errors.timeSlots && <p style={errorStyle}>{errors.timeSlots}</p>}

                                <p style={{ fontSize: '12px', color: 'var(--color-text-muted)', marginTop: '6px' }}>
                                    Har bir qatorga vaqtni (masalan: "1 soat", "12 soat", "Kechdan tongacha", "1 kun") va narxini yozing
                                </p>
                            </div>

                            {/* Deposit */}
                            <label style={{ display: 'block', marginBottom: '16px' }}>
                                <span style={{ display: 'flex', alignItems: 'center', gap: '6px', fontSize: 'var(--font-size-sm)', fontWeight: 600, marginBottom: '6px', color: 'var(--color-text-secondary)' }}>
                                    <Wallet className="w-4 h-4" /> Kafolat depozit (so'm)
                                </span>
                                <input type="number" min={0} value={formData.deposit} onChange={e => setFormData({ ...formData, deposit: e.target.value })}
                                    placeholder="100 000" className="input input-lg" style={{ width: '100%' }} />
                                <p style={{ fontSize: '12px', color: 'var(--color-text-muted)', marginTop: '4px' }}>
                                    Akkaunt qaytarilmasa ushlanadigan summa
                                </p>
                            </label>

                            {/* Rental Period */}
                            <label style={{ display: 'block', marginBottom: '16px' }}>
                                <span style={{ display: 'flex', alignItems: 'center', gap: '6px', fontSize: 'var(--font-size-sm)', fontWeight: 600, marginBottom: '6px', color: 'var(--color-text-secondary)' }}>
                                    <Clock className="w-4 h-4" /> Ijara muddati (max) *
                                </span>
                                <select
                                    value={formData.rentalPeriodDays}
                                    onChange={e => setFormData({ ...formData, rentalPeriodDays: e.target.value })}
                                    className="input input-lg"
                                    style={{ width: '100%' }}
                                >
                                    <option value="">Tanlang...</option>
                                    <option value="1">1 kun</option>
                                    <option value="3">3 kun</option>
                                    <option value="7">7 kun (1 hafta)</option>
                                    <option value="14">14 kun (2 hafta)</option>
                                    <option value="30">30 kun (1 oy)</option>
                                </select>
                                {errors.rentalPeriodDays && <p style={errorStyle}>{errors.rentalPeriodDays}</p>}
                                <p style={{ fontSize: '12px', color: 'var(--color-text-muted)', marginTop: '4px' }}>
                                    Akkaunt qancha muddat ijaraga berilishi mumkin
                                </p>
                            </label>

                            {/* Level / Rank */}
                            <div className="grid grid-cols-2" style={{ gap: '12px', marginBottom: '16px' }}>
                                <label>
                                    <span style={{ display: 'block', fontSize: 'var(--font-size-sm)', fontWeight: 600, marginBottom: '6px', color: 'var(--color-text-secondary)' }}>Daraja</span>
                                    <input type="text" value={formData.level} onChange={e => setFormData({ ...formData, level: e.target.value })} placeholder="77" className="input input-md" style={{ width: '100%' }} />
                                </label>
                                <label>
                                    <span style={{ display: 'block', fontSize: 'var(--font-size-sm)', fontWeight: 600, marginBottom: '6px', color: 'var(--color-text-secondary)' }}>Reyting</span>
                                    <input type="text" value={formData.rank} onChange={e => setFormData({ ...formData, rank: e.target.value })} placeholder="Conqueror" className="input input-md" style={{ width: '100%' }} />
                                </label>
                            </div>

                            <div style={{ display: 'flex', justifyContent: 'flex-end' }}>
                                <button type="button" onClick={nextStep} className="btn btn-lg" style={{ background: '#a855f7', color: '#fff', border: 'none', padding: '12px 32px', fontWeight: 700 }}>
                                    Keyingi
                                </button>
                            </div>
                        </div>
                    )}

                    {/* Step 2: Description + Images */}
                    {step === 2 && (
                        <div style={cardStyle}>
                            <h2 style={{ fontSize: 'var(--font-size-lg)', fontWeight: 'var(--font-weight-bold)', marginBottom: '20px', color: 'var(--color-text-primary)' }}>
                                Batafsil ma'lumot
                            </h2>
                            <label style={{ display: 'block', marginBottom: '16px' }}>
                                <span style={{ display: 'block', fontSize: 'var(--font-size-sm)', fontWeight: 600, marginBottom: '6px', color: 'var(--color-text-secondary)' }}>Tavsif *</span>
                                <textarea value={formData.description} onChange={e => setFormData({ ...formData, description: e.target.value })}
                                    placeholder="Akkaunt haqida batafsil yozing..."
                                    className="input" style={{ width: '100%', minHeight: '120px', resize: 'vertical' }} />
                                {errors.description && <p style={errorStyle}>{errors.description}</p>}
                            </label>

                            {/* Features */}
                            <div style={{ marginBottom: '16px' }}>
                                <span style={{ display: 'block', fontSize: 'var(--font-size-sm)', fontWeight: 600, marginBottom: '8px', color: 'var(--color-text-secondary)' }}>Xususiyatlar</span>
                                <div className="flex flex-wrap" style={{ gap: '8px' }}>
                                    {featureOptions.map(({ value, labelKey }) => (
                                        <button key={value} type="button" onClick={() => toggleFeature(value)}
                                            className={`btn btn-sm ${formData.features.includes(value) ? '' : 'btn-ghost'}`}
                                            style={{
                                                backgroundColor: formData.features.includes(value) ? 'rgba(168,85,247,0.12)' : undefined,
                                                color: formData.features.includes(value) ? '#a855f7' : undefined,
                                                border: formData.features.includes(value) ? '1px solid rgba(168,85,247,0.3)' : undefined,
                                            }}>
                                            {t(labelKey) || value}
                                        </button>
                                    ))}
                                </div>
                            </div>

                            {/* Images */}
                            <div style={{ marginBottom: '16px' }}>
                                <span style={{ display: 'block', fontSize: 'var(--font-size-sm)', fontWeight: 600, marginBottom: '8px', color: 'var(--color-text-secondary)' }}>Rasmlar (max 5)</span>
                                <div className="flex flex-wrap" style={{ gap: '8px' }}>
                                    {imageFiles.map((file, i) => (
                                        <div key={i} className="relative" style={{ width: '80px', height: '80px', borderRadius: 'var(--radius-md)', overflow: 'hidden', border: '1px solid var(--color-border-default)' }}>
                                            <img src={URL.createObjectURL(file)} alt="" style={{ width: '100%', height: '100%', objectFit: 'cover' }} />
                                            <button onClick={() => setImageFiles(prev => prev.filter((_, idx) => idx !== i))}
                                                style={{ position: 'absolute', top: '2px', right: '2px', width: '20px', height: '20px', borderRadius: '50%', backgroundColor: 'rgba(0,0,0,0.6)', color: '#fff', border: 'none', cursor: 'pointer', display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
                                                <X className="w-3 h-3" />
                                            </button>
                                        </div>
                                    ))}
                                    {imageFiles.length < 5 && (
                                        <label style={{ width: '80px', height: '80px', borderRadius: 'var(--radius-md)', border: '2px dashed var(--color-border-default)', display: 'flex', alignItems: 'center', justifyContent: 'center', cursor: 'pointer', backgroundColor: 'var(--color-bg-secondary)' }}>
                                            <Plus className="w-5 h-5" style={{ color: 'var(--color-text-muted)' }} />
                                            <input type="file" accept="image/*" multiple hidden onChange={e => {
                                                const files = Array.from(e.target.files || []).slice(0, 5 - imageFiles.length);
                                                setImageFiles(prev => [...prev, ...files]);
                                            }} />
                                        </label>
                                    )}
                                </div>
                            </div>

                            <div style={{ display: 'flex', justifyContent: 'space-between' }}>
                                <button type="button" onClick={prevStep} className="btn btn-ghost btn-lg"><ArrowLeft className="w-4 h-4" /> Orqaga</button>
                                <button type="button" onClick={nextStep} className="btn btn-lg" style={{ background: '#a855f7', color: '#fff', border: 'none', padding: '12px 32px', fontWeight: 700 }}>Keyingi</button>
                            </div>
                        </div>
                    )}

                    {/* Step 3: Account Details */}
                    {step === 3 && (
                        <div style={cardStyle}>
                            <h2 style={{ fontSize: 'var(--font-size-lg)', fontWeight: 'var(--font-weight-bold)', marginBottom: '20px', color: 'var(--color-text-primary)' }}>
                                Akkaunt ma'lumotlari
                            </h2>

                            <div style={{
                                padding: '14px', borderRadius: 'var(--radius-lg)',
                                backgroundColor: 'var(--color-warning-bg)', border: '1px solid var(--color-warning)',
                                display: 'flex', gap: '10px', alignItems: 'flex-start', marginBottom: '20px',
                            }}>
                                <Shield className="w-5 h-5 shrink-0" style={{ color: 'var(--color-warning)', marginTop: '2px' }} />
                                <div>
                                    <p style={{ fontWeight: 600, color: 'var(--color-text-primary)', marginBottom: '4px' }}>Xavfsiz berish</p>
                                    <p style={{ fontSize: 'var(--font-size-sm)', color: 'var(--color-text-secondary)' }}>
                                        Bu ma'lumotlar faqat ijara tasdiqlangandan keyin ijarachiga ko'rsatiladi.
                                    </p>
                                </div>
                            </div>

                            <label style={{ display: 'block', marginBottom: '16px' }}>
                                <span style={{ display: 'block', fontSize: 'var(--font-size-sm)', fontWeight: 600, marginBottom: '6px', color: 'var(--color-text-secondary)' }}>Kirish usuli</span>
                                <select value={formData.loginMethod} onChange={e => setFormData({ ...formData, loginMethod: e.target.value })} className="select select-lg" style={{ width: '100%' }}>
                                    <option value="email">Email</option>
                                    <option value="social">Google / Facebook</option>
                                    <option value="phone">Telefon</option>
                                    <option value="username">Username</option>
                                </select>
                            </label>

                            <label style={{ display: 'block', marginBottom: '16px' }}>
                                <span style={{ display: 'block', fontSize: 'var(--font-size-sm)', fontWeight: 600, marginBottom: '6px', color: 'var(--color-text-secondary)' }}>Akkaunt email/login *</span>
                                <input type="text" value={formData.accountEmail} onChange={e => setFormData({ ...formData, accountEmail: e.target.value })} className="input input-lg" style={{ width: '100%' }} />
                                {errors.accountEmail && <p style={errorStyle}>{errors.accountEmail}</p>}
                            </label>

                            <label style={{ display: 'block', marginBottom: '16px' }}>
                                <span style={{ display: 'block', fontSize: 'var(--font-size-sm)', fontWeight: 600, marginBottom: '6px', color: 'var(--color-text-secondary)' }}>Akkaunt paroli *</span>
                                <input type="password" value={formData.accountPassword} onChange={e => setFormData({ ...formData, accountPassword: e.target.value })} className="input input-lg" style={{ width: '100%' }} />
                                {errors.accountPassword && <p style={errorStyle}>{errors.accountPassword}</p>}
                            </label>

                            <label style={{ display: 'block', marginBottom: '24px' }}>
                                <span style={{ display: 'block', fontSize: 'var(--font-size-sm)', fontWeight: 600, marginBottom: '6px', color: 'var(--color-text-secondary)' }}>Qo'shimcha ma'lumot</span>
                                <textarea value={formData.additionalInfo} onChange={e => setFormData({ ...formData, additionalInfo: e.target.value })} className="input" style={{ width: '100%', minHeight: '80px', resize: 'vertical' }} placeholder="2FA kodi, telefon raqami va hokazo..." />
                            </label>

                            <div style={{ display: 'flex', justifyContent: 'space-between' }}>
                                <button type="button" onClick={prevStep} className="btn btn-ghost btn-lg"><ArrowLeft className="w-4 h-4" /> Orqaga</button>
                                <button type="button" onClick={handleSubmit} disabled={isSubmitting} className="btn btn-lg"
                                    style={{ background: isSubmitting ? 'var(--color-bg-tertiary)' : '#a855f7', color: '#fff', border: 'none', padding: '12px 32px', fontWeight: 700, display: 'flex', alignItems: 'center', gap: '8px' }}>
                                    {isSubmitting && <Loader2 className="w-4 h-4 animate-spin" />}
                                    {isSubmitting ? 'Yuborilmoqda...' : "Arenda e'lonini yuborish"}
                                </button>
                            </div>
                        </div>
                    )}
                </div>
            </div>
        </>
    );
};

export default RentPage;
