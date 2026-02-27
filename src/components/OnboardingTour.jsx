import { useState, useEffect } from 'react';
import { Link } from 'react-router-dom';
import { useLanguage } from '../context/LanguageContext';

const STORAGE_KEY = 'wibestore_onboarding_done';

export default function OnboardingTour() {
    const { t } = useLanguage();
    const [visible, setVisible] = useState(false);
    const [step, setStep] = useState(0);

    useEffect(() => {
        try {
            if (localStorage.getItem(STORAGE_KEY) === 'true') return;
            const timer = setTimeout(() => setVisible(true), 800);
            return () => clearTimeout(timer);
        } catch {
            setVisible(false);
        }
    }, []);

    const finish = () => {
        try {
            localStorage.setItem(STORAGE_KEY, 'true');
        } catch {}
        setVisible(false);
    };

    const steps = [
        { title: t('onboarding.welcome_title') || 'Welcome to WibeStore', body: t('onboarding.welcome_body') || 'Buy and sell game accounts safely with escrow protection.' },
        { title: t('onboarding.buy_title') || 'How to buy', body: t('onboarding.buy_body') || 'Browse products, choose an account, pay via escrow. You get the account after confirming delivery.' },
        { title: t('onboarding.sell_title') || 'How to sell', body: t('onboarding.sell_body') || 'Create a listing, set price and details. When sold, we hold the payment until the buyer confirms.' },
    ];

    if (!visible) return null;

    return (
        <div
            role="dialog"
            aria-label="Onboarding"
            style={{
                position: 'fixed',
                inset: 0,
                zIndex: 9999,
                backgroundColor: 'rgba(0,0,0,0.5)',
                display: 'flex',
                alignItems: 'center',
                justifyContent: 'center',
                padding: 24,
            }}
            onClick={(e) => e.target === e.currentTarget && finish()}
        >
            <div
                className="card"
                style={{
                    maxWidth: 420,
                    width: '100%',
                    padding: 24,
                    backgroundColor: 'var(--color-bg-primary)',
                    border: '1px solid var(--color-border-default)',
                    borderRadius: 'var(--radius-xl)',
                    boxShadow: 'var(--shadow-lg)',
                }}
                onClick={(e) => e.stopPropagation()}
            >
                <h2 style={{ fontSize: '1.25rem', fontWeight: 700, marginBottom: 8 }}>
                    {steps[step]?.title}
                </h2>
                <p style={{ color: 'var(--color-text-muted)', marginBottom: 24, lineHeight: 1.5 }}>
                    {steps[step]?.body}
                </p>
                <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', flexWrap: 'wrap', gap: 12 }}>
                    <div style={{ display: 'flex', gap: 6 }}>
                        {steps.map((_, i) => (
                            <button
                                key={i}
                                type="button"
                                aria-label={`Step ${i + 1}`}
                                style={{
                                    width: 8,
                                    height: 8,
                                    borderRadius: '50%',
                                    border: 'none',
                                    padding: 0,
                                    backgroundColor: i === step ? 'var(--color-primary)' : 'var(--color-border-default)',
                                    cursor: 'pointer',
                                }}
                                onClick={() => setStep(i)}
                            />
                        ))}
                    </div>
                    <div style={{ display: 'flex', gap: 8 }}>
                        {step < steps.length - 1 ? (
                            <>
                                <button type="button" className="btn btn-ghost btn-sm" onClick={finish}>
                                    {t('onboarding.skip') || 'Skip'}
                                </button>
                                <button type="button" className="btn btn-primary btn-sm" onClick={() => setStep((s) => s + 1)}>
                                    {t('onboarding.next') || 'Next'}
                                </button>
                            </>
                        ) : (
                            <>
                                <Link to="/products" className="btn btn-primary btn-sm" style={{ textDecoration: 'none' }} onClick={finish}>
                                    {t('onboarding.browse') || 'Browse products'}
                                </Link>
                                <button type="button" className="btn btn-secondary btn-sm" onClick={finish}>
                                    {t('common.got_it') || 'Got it'}
                                </button>
                            </>
                        )}
                    </div>
                </div>
            </div>
        </div>
    );
}
