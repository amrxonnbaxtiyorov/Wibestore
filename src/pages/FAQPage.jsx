import { useState } from 'react';
import { Link } from 'react-router-dom';
import { HelpCircle, ChevronDown, Search, ShoppingBag, CreditCard, Shield, User, MessageCircle } from 'lucide-react';
import { useLanguage } from '../context/LanguageContext';

const FAQPage = () => {
    const { t } = useLanguage();
    const [openIndex, setOpenIndex] = useState(null);
    const [activeCategory, setActiveCategory] = useState('all');
    const [searchQuery, setSearchQuery] = useState('');

    const categories = [
        { id: 'all', label: t('faq.all') || 'All', icon: HelpCircle },
        { id: 'buying', label: t('faq.buying') || 'Buying', icon: ShoppingBag },
        { id: 'selling', label: t('faq.selling') || 'Selling', icon: CreditCard },
        { id: 'security', label: t('faq.security') || 'Security', icon: Shield },
        { id: 'account', label: t('faq.account') || 'Account', icon: User },
    ];

    const faqs = [
        { category: 'buying', question: t('faq.q1') || 'How do I buy an account?', answer: t('faq.a1') || 'Select an account, click "Buy", choose payment method and complete payment. Account details will be sent after confirmation.' },
        { category: 'buying', question: t('faq.q2') || 'How does payment work?', answer: t('faq.a2') || 'We accept Google Pay, Visa Card, Mastercard and Apple Pay. All payments are secure and encrypted.' },
        { category: 'buying', question: t('faq.q3') || 'What if the account doesn\'t work?', answer: t('faq.a3') || 'Click "Report" within 48 hours. Our moderators will review and if confirmed, a full refund will be issued.' },
        { category: 'buying', question: t('faq.q4') || 'How long to verify an account?', answer: t('faq.a4') || 'You have 48 hours after purchase to verify the account. Issues within this period are eligible for refund.' },
        { category: 'selling', question: t('faq.q5') || 'How do I sell my account?', answer: t('faq.a5') || 'Go to "Sell" page, fill in account details and submit. After moderation, your listing will appear on the site.' },
        { category: 'selling', question: t('faq.q6') || 'What is the commission?', answer: t('faq.a6') || 'Free plan: 10%, Premium: 8%, Pro: 5%. Pro plan is the most beneficial!' },
        { category: 'selling', question: t('faq.q7') || 'When do I receive payment?', answer: t('faq.a7') || 'Within 1-3 business days after the buyer confirms the account.' },
        { category: 'selling', question: t('faq.q8') || 'Why was my listing rejected?', answer: t('faq.a8') || 'Listings are rejected for: incorrect info, low-quality images, or prohibited content.' },
        { category: 'security', question: t('faq.q9') || 'What is Escrow?', answer: t('faq.a9') || 'Escrow holds payment until the buyer confirms the account. This protects both parties.' },
        { category: 'security', question: t('faq.q10') || 'How to protect against fraud?', answer: t('faq.a10') || 'Only trade through the platform. Never pay outside. Report suspicious listings. Our moderators work 24/7.' },
        { category: 'security', question: t('faq.q11') || 'Is my data safe?', answer: t('faq.a11') || 'Yes, we use SSL encryption and secure servers. Account details are only shown after purchase confirmation.' },
        { category: 'account', question: t('faq.q12') || 'I forgot my password', answer: t('faq.a12') || 'Click "Forgot password?" on the login page. A reset link will be sent to your email.' },
        { category: 'account', question: t('faq.q13') || 'How to delete my account?', answer: t('faq.a13') || 'Go to Settings > Delete Account. Note: deleted accounts cannot be restored.' },
        { category: 'account', question: t('faq.q14') || 'How to cancel Premium?', answer: t('faq.a14') || 'Go to Settings > Subscription and click "Cancel". You can use Premium features until period ends.' },
    ];

    const filteredFaqs = faqs.filter(faq => {
        const matchesCategory = activeCategory === 'all' || faq.category === activeCategory;
        const matchesSearch = faq.question.toLowerCase().includes(searchQuery.toLowerCase()) ||
            faq.answer.toLowerCase().includes(searchQuery.toLowerCase());
        return matchesCategory && matchesSearch;
    });

    return (
        <div className="page-enter" style={{ minHeight: '100vh', paddingBottom: '64px' }}>
            <div className="gh-container" style={{ maxWidth: '800px' }}>
                {/* Breadcrumbs */}
                <div className="breadcrumbs">
                    <Link to="/">{t('common.home')}</Link>
                    <span className="breadcrumb-separator">/</span>
                    <span className="breadcrumb-current">FAQ</span>
                </div>

                {/* Header */}
                <div className="text-center" style={{ paddingTop: '32px', marginBottom: '40px' }}>
                    <div
                        className="badge badge-blue inline-flex items-center gap-2"
                        style={{ padding: '6px 14px', marginBottom: '20px', fontSize: '13px' }}
                    >
                        <HelpCircle className="w-3.5 h-3.5" />
                        <span>{t('faq.badge') || 'Help Center'}</span>
                    </div>
                    <h1 style={{
                        fontSize: 'clamp(28px, 4vw, 36px)',
                        fontWeight: 'var(--font-weight-bold)',
                        color: 'var(--color-text-primary)',
                        marginBottom: '12px',
                    }}>
                        {t('faq.title') || 'Frequently Asked Questions'}
                    </h1>
                    <p style={{ color: 'var(--color-text-secondary)', fontSize: 'var(--font-size-lg)' }}>
                        {t('faq.subtitle') || 'Find answers or contact us'}
                    </p>
                </div>

                {/* Search */}
                <div className="relative" style={{ marginBottom: '24px' }}>
                    <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4" style={{ color: 'var(--color-text-muted)' }} />
                    <input
                        type="text"
                        value={searchQuery}
                        onChange={(e) => setSearchQuery(e.target.value)}
                        placeholder={t('faq.search') || 'Search questions...'}
                        className="input input-md"
                        style={{ paddingLeft: '36px' }}
                    />
                </div>

                {/* Categories */}
                <div className="flex flex-wrap justify-center gap-2" style={{ marginBottom: '32px' }}>
                    {categories.map((cat) => (
                        <button
                            key={cat.id}
                            onClick={() => setActiveCategory(cat.id)}
                            className={`btn btn-sm flex items-center gap-2 ${activeCategory === cat.id ? 'btn-primary' : 'btn-secondary'}`}
                        >
                            <cat.icon className="w-3.5 h-3.5" />
                            {cat.label}
                        </button>
                    ))}
                </div>

                {/* FAQ List */}
                <div style={{ display: 'flex', flexDirection: 'column', gap: '8px', marginBottom: '48px' }}>
                    {filteredFaqs.length > 0 ? (
                        filteredFaqs.map((faq, index) => (
                            <div
                                key={index}
                                className="faq-item-hover"
                                style={{
                                    borderRadius: 'var(--radius-lg)',
                                    border: '1px solid var(--color-border-default)',
                                    backgroundColor: 'var(--color-bg-primary)',
                                    overflow: 'hidden',
                                }}
                            >
                                <button
                                    onClick={() => setOpenIndex(openIndex === index ? null : index)}
                                    className="w-full flex items-center justify-between text-left"
                                    style={{
                                        padding: '16px 20px',
                                        background: 'none',
                                        border: 'none',
                                        cursor: 'pointer',
                                    }}
                                >
                                    <span style={{
                                        fontWeight: 'var(--font-weight-semibold)',
                                        color: 'var(--color-text-primary)',
                                        fontSize: 'var(--font-size-base)',
                                        paddingRight: '16px',
                                    }}>
                                        {faq.question}
                                    </span>
                                    <ChevronDown
                                        className="w-4 h-4 flex-shrink-0"
                                        style={{
                                            color: 'var(--color-text-muted)',
                                            transition: 'transform 0.2s ease',
                                            transform: openIndex === index ? 'rotate(180deg)' : 'rotate(0deg)',
                                        }}
                                    />
                                </button>
                                {openIndex === index && (
                                    <div
                                        className="animate-fadeIn"
                                        style={{
                                            padding: '0 20px 16px',
                                            color: 'var(--color-text-secondary)',
                                            fontSize: 'var(--font-size-sm)',
                                            lineHeight: 'var(--line-height-lg)',
                                            borderTop: '1px solid var(--color-border-muted)',
                                            paddingTop: '16px',
                                        }}
                                    >
                                        {faq.answer}
                                    </div>
                                )}
                            </div>
                        ))
                    ) : (
                        <div className="text-center" style={{ padding: '64px 16px' }}>
                            <HelpCircle className="w-12 h-12 mx-auto" style={{ color: 'var(--color-text-muted)', marginBottom: '16px' }} />
                            <p style={{ color: 'var(--color-text-secondary)' }}>
                                {t('faq.no_results') || 'No questions found'}
                            </p>
                        </div>
                    )}
                </div>

                {/* Contact CTA */}
                <div
                    className="text-center"
                    style={{
                        padding: '40px 32px',
                        borderRadius: 'var(--radius-xl)',
                        backgroundColor: 'var(--color-accent-blue)',
                        position: 'relative',
                        overflow: 'hidden',
                    }}
                >
                    <div style={{ position: 'absolute', inset: 0, opacity: 0.06, pointerEvents: 'none' }}>
                        <div style={{ position: 'absolute', top: '-30%', right: '-10%', width: '250px', height: '250px', background: '#fff', borderRadius: '50%', filter: 'blur(60px)' }} />
                    </div>
                    <div style={{ position: 'relative' }}>
                        <MessageCircle className="w-10 h-10 mx-auto" style={{ color: '#ffffff', marginBottom: '16px' }} />
                        <h3 style={{ fontSize: 'var(--font-size-xl)', fontWeight: 'var(--font-weight-bold)', color: '#ffffff', marginBottom: '8px' }}>
                            {t('faq.contact_title') || "Didn't find your answer?"}
                        </h3>
                        <p style={{ color: 'rgba(255,255,255,0.85)', marginBottom: '24px' }}>
                            {t('faq.contact_subtitle') || 'Our support team is here to help you'}
                        </p>
                        <div className="flex flex-wrap justify-center gap-3">
                            <a
                                href="https://t.me/wibestoreuz"
                                className="btn btn-lg"
                                style={{
                                    backgroundColor: '#ffffff',
                                    color: 'var(--color-accent-blue)',
                                    textDecoration: 'none',
                                    fontWeight: 'var(--font-weight-semibold)',
                                }}
                            >
                                💬 Telegram
                            </a>
                            <a
                                href="mailto:support@wibestore.uz"
                                className="btn btn-lg"
                                style={{
                                    backgroundColor: 'transparent',
                                    border: '2px solid rgba(255,255,255,0.3)',
                                    color: '#ffffff',
                                    textDecoration: 'none',
                                    fontWeight: 'var(--font-weight-semibold)',
                                }}
                            >
                                📧 Email
                            </a>
                        </div>
                    </div>
                </div>
            </div>
        </div>
    );
};

export default FAQPage;
