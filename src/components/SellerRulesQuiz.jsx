import { useState } from 'react';
import { FileText, CheckCircle, AlertCircle, ChevronRight } from 'lucide-react';
import { useLanguage } from '../context/LanguageContext';
import {
    sellerRulesSectionsUz,
    getRandomQuizQuestions,
} from '../data/sellerRules';

/**
 * Sotuvchi qoidalarini to'liq o'qish + 5 ta tasodifiy savol.
 * Barcha savollar to'g'ri bo'lsa onPass() chaqiladi. Har safar /sell da qoidalar ko'rsatiladi.
 */
export default function SellerRulesQuiz({ onPass }) {
    const { t, language } = useLanguage();
    const [readConfirmed, setReadConfirmed] = useState(false);
    const [phase, setPhase] = useState('rules'); // 'rules' | 'quiz' | 'done'
    const [questions] = useState(() => getRandomQuizQuestions(5));
    const [answers, setAnswers] = useState({});
    const [submitError, setSubmitError] = useState(null);

    const isUz = language === 'uz' || !language;

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
            setSubmitError(t('seller_rules.answer_all') || "Barcha savollarga javob bering.");
            return;
        }
        const allCorrect = questions.every((q) => answers[q.id] === q.correctIndex);
        if (!allCorrect) {
            setSubmitError(t('seller_rules.quiz_fail') || "Ba'zi javoblar noto'g'ri. Qoidalarni qayta o'qing va urinib ko'ring.");
            return;
        }
        setPhase('done');
        onPass?.();
    };

    if (phase === 'rules') {
        return (
            <div className="seller-rules-quiz" style={{ maxWidth: '720px', margin: '0 auto' }}>
                <div className="text-center" style={{ marginBottom: '24px' }}>
                    <div className="inline-flex items-center gap-2" style={{
                        padding: '6px 14px', borderRadius: 'var(--radius-full)', backgroundColor: 'var(--color-info-bg)',
                        color: 'var(--color-accent-blue)', fontSize: '13px', marginBottom: '12px',
                    }}>
                        <FileText className="w-3.5 h-3.5" />
                        <span>{t('seller_rules.badge') || "Sotuvchi qoidalari"}</span>
                    </div>
                    <h2 style={{ fontSize: 'var(--font-size-xl)', fontWeight: 'var(--font-weight-bold)', color: 'var(--color-text-primary)', marginBottom: '8px' }}>
                        {t('seller_rules.title') || "Akkaunt joylashdan oldin qoidalarni o'qing"}
                    </h2>
                    <p style={{ color: 'var(--color-text-secondary)', fontSize: 'var(--font-size-sm)' }}>
                        {t('seller_rules.subtitle') || "Quyidagi qoidalarni to'liq o'qing. Keyin 5 ta savolga javob bering."}
                    </p>
                </div>

                <div style={{
                    border: '1px solid var(--color-border-default)',
                    borderRadius: 'var(--radius-xl)',
                    padding: '20px',
                    maxHeight: '360px',
                    overflowY: 'auto',
                    backgroundColor: 'var(--color-bg-secondary)',
                    marginBottom: '20px',
                }}>
                    {sellerRulesSectionsUz.map((section, idx) => (
                        <div key={idx} style={{ marginBottom: idx < sellerRulesSectionsUz.length - 1 ? '20px' : 0 }}>
                            <h3 style={{ fontSize: 'var(--font-size-base)', fontWeight: 'var(--font-weight-semibold)', color: 'var(--color-text-primary)', marginBottom: '10px' }}>
                                {section.title}
                            </h3>
                            <ul style={{ paddingLeft: '20px', color: 'var(--color-text-secondary)', lineHeight: 1.6, fontSize: 'var(--font-size-sm)' }}>
                                {section.items.map((item, i) => (
                                    <li key={i} style={{ marginBottom: '6px' }}>{item}</li>
                                ))}
                            </ul>
                        </div>
                    ))}
                </div>

                <label className="flex items-start gap-3" style={{ cursor: 'pointer', marginBottom: '16px' }}>
                    <input
                        type="checkbox"
                        checked={readConfirmed}
                        onChange={(e) => setReadConfirmed(e.target.checked)}
                        style={{ marginTop: '4px', width: '18px', height: '18px', accentColor: 'var(--color-accent-blue)' }}
                    />
                    <span style={{ color: 'var(--color-text-secondary)', fontSize: 'var(--font-size-sm)' }}>
                        {t('seller_rules.read_confirm') || "Men barcha qoidalarni to'liq o'qidim va qabul qilaman."}
                    </span>
                </label>

                <button
                    type="button"
                    onClick={handleStartQuiz}
                    disabled={!readConfirmed}
                    className="btn btn-primary btn-lg"
                    style={{ width: '100%', display: 'flex', alignItems: 'center', justifyContent: 'center', gap: '8px' }}
                >
                    {t('seller_rules.start_quiz') || "Savollarni boshlash"}
                    <ChevronRight className="w-5 h-5" />
                </button>
            </div>
        );
    }

    if (phase === 'quiz') {
        return (
            <div className="seller-rules-quiz" style={{ maxWidth: '720px', margin: '0 auto' }}>
                <div className="text-center" style={{ marginBottom: '24px' }}>
                    <h2 style={{ fontSize: 'var(--font-size-xl)', fontWeight: 'var(--font-weight-bold)', color: 'var(--color-text-primary)', marginBottom: '8px' }}>
                        {t('seller_rules.quiz_title') || "Qoidalar bo'yicha savollar (5 ta)"}
                    </h2>
                    <p style={{ color: 'var(--color-text-secondary)', fontSize: 'var(--font-size-sm)' }}>
                        {t('seller_rules.quiz_subtitle') || "Har bir savolga bitta javob tanlang. Barchasi to'g'ri bo'lishi kerak."}
                    </p>
                </div>

                <div style={{ display: 'flex', flexDirection: 'column', gap: '24px', marginBottom: '24px' }}>
                    {questions.map((q, index) => (
                        <div key={q.id} style={{
                            border: '1px solid var(--color-border-default)',
                            borderRadius: 'var(--radius-lg)',
                            padding: '20px',
                            backgroundColor: 'var(--color-bg-secondary)',
                        }}>
                            <p style={{ fontWeight: 'var(--font-weight-semibold)', color: 'var(--color-text-primary)', marginBottom: '12px' }}>
                                {index + 1}. {isUz ? q.questionUz : q.questionEn}
                            </p>
                            <div style={{ display: 'flex', flexDirection: 'column', gap: '8px' }}>
                                {(isUz ? q.optionsUz : q.optionsEn).map((opt, optIndex) => (
                                    <label key={optIndex} className="flex items-center gap-3" style={{ cursor: 'pointer' }}>
                                        <input
                                            type="radio"
                                            name={q.id}
                                            checked={answers[q.id] === optIndex}
                                            onChange={() => setAnswer(q.id, optIndex)}
                                            style={{ width: '18px', height: '18px', accentColor: 'var(--color-accent-blue)' }}
                                        />
                                        <span style={{ color: 'var(--color-text-secondary)', fontSize: 'var(--font-size-sm)' }}>{opt}</span>
                                    </label>
                                ))}
                            </div>
                        </div>
                    ))}
                </div>

                {submitError && (
                    <div className="flex items-center gap-2" style={{
                        padding: '12px 16px', borderRadius: 'var(--radius-md)', backgroundColor: 'var(--color-error-bg)',
                        color: 'var(--color-error)', marginBottom: '16px', fontSize: 'var(--font-size-sm)',
                    }}>
                        <AlertCircle className="w-4 h-4 flex-shrink-0" />
                        {submitError}
                    </div>
                )}

                <div style={{ display: 'flex', gap: '12px' }}>
                    <button type="button" onClick={() => setPhase('rules')} className="btn btn-secondary" style={{ flex: 1 }}>
                        {t('common.back') || 'Orqaga'}
                    </button>
                    <button type="button" onClick={handleSubmitQuiz} className="btn btn-primary" style={{ flex: 2 }}>
                        {t('seller_rules.submit_quiz') || "Javoblarni yuborish"}
                    </button>
                </div>
            </div>
        );
    }

    return null;
}
