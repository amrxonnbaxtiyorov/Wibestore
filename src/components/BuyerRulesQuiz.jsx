import { useState } from 'react';
import { FileText, AlertCircle, ChevronRight, X } from 'lucide-react';
import { useLanguage } from '../context/LanguageContext';
import {
    buyerRulesSectionsUz,
    getRandomBuyerQuizQuestions,
} from '../data/sellerRules';

/**
 * Xaridor qoidalari: to'liq o'qish + 5 ta tasodifiy savol.
 * Har safar "Sotib olish" bosilganda ko'rsatiladi (modal ichida). Barcha to'g'ri bo'lsa onPass().
 */
export default function BuyerRulesQuiz({ onPass, onClose, inModal = true }) {
    const { t, language } = useLanguage();
    const [readConfirmed, setReadConfirmed] = useState(false);
    const [phase, setPhase] = useState('rules');
    const [questions] = useState(() => getRandomBuyerQuizQuestions(5));
    const [answers, setAnswers] = useState({});
    const [submitError, setSubmitError] = useState(null);

    const lang = (language || 'uz').toLowerCase();
    const isRu = lang === 'ru';
    const isUz = lang === 'uz';
    const getQuestion = (q) => (isRu && q.questionRu ? q.questionRu : (isUz && q.questionUz ? q.questionUz : (q.questionEn || q.questionUz)));
    const getOptions = (q) => (isRu && q.optionsRu ? q.optionsRu : (isUz && q.optionsUz ? q.optionsUz : (q.optionsEn || q.optionsUz)));

    const handleStartQuiz = () => {
        if (!readConfirmed) return;
        setPhase('quiz');
        setSubmitError(null);
    };

    const setAnswer = (questionId, optionIndex) => {
        setAnswers((prev) => ({ ...prev, [questionId]: optionIndex }));
        setSubmitError(null);
    };

    const handleSubmitQuiz = () => {
        const allAnswered = questions.every((q) => typeof answers[q.id] === 'number');
        if (!allAnswered) {
            setSubmitError(t('buyer_rules.answer_all') || "Barcha savollarga javob bering.");
            return;
        }
        const allCorrect = questions.every((q) => answers[q.id] === q.correctIndex);
        if (!allCorrect) {
            setSubmitError(t('buyer_rules.quiz_fail') || "Ba'zi javoblar noto'g'ri. Qoidalarni qayta o'qing va urinib ko'ring.");
            return;
        }
        onPass?.();
    };

    const wrap = (content) => {
        if (!inModal) return content;
        return (
            <div className="modal-overlay" onClick={onClose}>
                <div className="modal-container modal-lg" style={{ maxHeight: '90vh', overflow: 'hidden', display: 'flex', flexDirection: 'column' }} onClick={(e) => e.stopPropagation()}>
                    <div className="modal-header" style={{ flexShrink: 0 }}>
                        <h3 style={{ fontSize: 'var(--font-size-lg)', fontWeight: 'var(--font-weight-bold)' }}>
                            {t('buyer_rules.title') || "Sotib olishdan oldin qoidalarni o'qing"}
                        </h3>
                        {onClose && (
                            <button type="button" onClick={onClose} aria-label="Yopish" style={{ background: 'none', border: 'none', cursor: 'pointer', padding: '4px', color: 'var(--color-text-muted)' }}>
                                <X className="w-5 h-5" />
                            </button>
                        )}
                    </div>
                    <div className="modal-body" style={{ overflowY: 'auto', flex: 1 }}>
                        {content}
                    </div>
                </div>
            </div>
        );
    };

    if (phase === 'rules') {
        return wrap(
            <div className="buyer-rules-quiz">
                <p style={{ color: 'var(--color-text-secondary)', fontSize: 'var(--font-size-sm)', marginBottom: '16px' }}>
                    {t('buyer_rules.subtitle') || "Quyidagi qoidalarni to'liq o'qing. Keyin 5 ta savolga javob bering."}
                </p>
                <div
                    key={`buyer-rules-${lang}`}
                    style={{
                    border: '1px solid var(--color-border-default)',
                    borderRadius: 'var(--radius-lg)',
                    padding: '16px',
                    maxHeight: '240px',
                    overflowY: 'auto',
                    backgroundColor: 'var(--color-bg-secondary)',
                    marginBottom: '16px',
                }}>
                    {buyerRulesSectionsUz.map((section, idx) => {
                        const title = (isRu && section.titleRu) ? section.titleRu : section.title;
                        const items = (isRu && section.itemsRu && section.itemsRu.length) ? section.itemsRu : section.items;
                        return (
                            <div key={idx} style={{ marginBottom: idx < buyerRulesSectionsUz.length - 1 ? '16px' : 0 }}>
                                <h4 style={{ fontSize: 'var(--font-size-sm)', fontWeight: 'var(--font-weight-semibold)', color: 'var(--color-text-primary)', marginBottom: '8px' }}>{title}</h4>
                                <ul style={{ paddingLeft: '18px', color: 'var(--color-text-secondary)', lineHeight: 1.5, fontSize: 'var(--font-size-sm)' }}>
                                    {items.map((item, i) => (
                                        <li key={i} style={{ marginBottom: '4px' }}>{item}</li>
                                    ))}
                                </ul>
                            </div>
                        );
                    })}
                </div>
                <p style={{ fontSize: 'var(--font-size-sm)', color: 'var(--color-text-muted)', marginBottom: '12px', padding: '8px 12px', borderRadius: 'var(--radius-md)', backgroundColor: 'var(--color-info-bg)' }}>
                    {t('detail.payment_via_telegram')}
                </p>
                <label className="flex items-start gap-3" style={{ cursor: 'pointer', marginBottom: '12px' }}>
                    <input type="checkbox" checked={readConfirmed} onChange={(e) => setReadConfirmed(e.target.checked)} style={{ marginTop: '4px', width: '18px', height: '18px', accentColor: 'var(--color-accent-blue)' }} />
                    <span style={{ color: 'var(--color-text-secondary)', fontSize: 'var(--font-size-sm)' }}>
                        {t('buyer_rules.read_confirm') || "Men barcha qoidalarni to'liq o'qidim va qabul qilaman."}
                    </span>
                </label>
                <button type="button" onClick={handleStartQuiz} disabled={!readConfirmed} className="btn btn-primary" style={{ width: '100%', display: 'flex', alignItems: 'center', justifyContent: 'center', gap: '8px' }}>
                    {t('buyer_rules.start_quiz') || "Savollarni boshlash"}
                    <ChevronRight className="w-4 h-4" />
                </button>
            </div>
        );
    }

    if (phase === 'quiz') {
        return wrap(
            <div className="buyer-rules-quiz">
                <p style={{ color: 'var(--color-text-secondary)', fontSize: 'var(--font-size-sm)', marginBottom: '12px' }}>
                    {t('buyer_rules.quiz_subtitle') || "Har bir savolga bitta javob tanlang. Barchasi to'g'ri bo'lishi kerak."}
                </p>
                <div style={{ display: 'flex', flexDirection: 'column', gap: '16px', marginBottom: '16px' }}>
                    {questions.map((q, index) => (
                        <div key={q.id} style={{ border: '1px solid var(--color-border-default)', borderRadius: 'var(--radius-md)', padding: '12px', backgroundColor: 'var(--color-bg-secondary)' }}>
                            <p style={{ fontWeight: 'var(--font-weight-semibold)', color: 'var(--color-text-primary)', marginBottom: '8px', fontSize: 'var(--font-size-sm)' }}>
                                {index + 1}. {getQuestion(q)}
                            </p>
                            <div style={{ display: 'flex', flexDirection: 'column', gap: '6px' }}>
                                {(getOptions(q) || q.optionsEn).map((opt, optIndex) => (
                                    <label key={optIndex} className="flex items-center gap-2" style={{ cursor: 'pointer', fontSize: 'var(--font-size-sm)' }}>
                                        <input type="radio" name={q.id} checked={answers[q.id] === optIndex} onChange={() => setAnswer(q.id, optIndex)} style={{ width: '16px', height: '16px', accentColor: 'var(--color-accent-blue)' }} />
                                        <span style={{ color: 'var(--color-text-secondary)' }}>{opt}</span>
                                    </label>
                                ))}
                            </div>
                        </div>
                    ))}
                </div>
                {submitError && (
                    <div className="flex items-center gap-2" style={{ padding: '10px 12px', borderRadius: 'var(--radius-md)', backgroundColor: 'var(--color-error-bg)', color: 'var(--color-error)', marginBottom: '12px', fontSize: 'var(--font-size-sm)' }}>
                        <AlertCircle className="w-4 h-4 flex-shrink-0" />
                        {submitError}
                    </div>
                )}
                <div style={{ display: 'flex', gap: '10px' }}>
                    <button type="button" onClick={() => setPhase('rules')} className="btn btn-secondary" style={{ flex: 1 }}>{t('common.back') || 'Orqaga'}</button>
                    <button type="button" onClick={handleSubmitQuiz} className="btn btn-primary" style={{ flex: 2 }}>{t('buyer_rules.submit_quiz') || "Javoblarni yuborish"}</button>
                </div>
            </div>
        );
    }

    return null;
}
