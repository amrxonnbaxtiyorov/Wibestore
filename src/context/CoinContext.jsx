import { createContext, useContext, useState, useEffect, useCallback } from 'react';

const CoinContext = createContext(null);

export const CoinProvider = ({ children }) => {
    const [coinState, setCoinState] = useState(() => {
        try {
            const saved = localStorage.getItem('wibeCoinState');
            if (saved) {
                const parsed = JSON.parse(saved);
                // Check if it's a new month
                const currentMonth = new Date().getMonth();
                const savedMonth = parsed.lastResetMonth;
                if (currentMonth !== savedMonth) {
                    return {
                        balance: parsed.balance,
                        monthlyTransactions: 0,
                        monthlyEarned: 0,
                        lastResetMonth: currentMonth,
                        history: parsed.history || []
                    };
                }
                return parsed;
            }
        } catch {
            // localStorage o'qishda xato bo'lsa default qiymat qaytariladi
        }
        return {
            balance: 0,
            monthlyTransactions: 0,
            monthlyEarned: 0,
            lastResetMonth: new Date().getMonth(),
            history: []
        };
    });

    useEffect(() => {
        try {
            localStorage.setItem('wibeCoinState', JSON.stringify(coinState));
        } catch {
            // localStorage yozishda xato bo'lsa ignore qilinadi
        }
    }, [coinState]);

    // Add coins for selling/buying account (max 5 transactions = 100 coins per month)
    const addCoins = useCallback((amount, reason) => {
        setCoinState(prev => {
            if (prev.monthlyTransactions >= 5) {
                return prev; // Max 5 transactions per month
            }
            const newHistory = [...prev.history, {
                id: crypto.randomUUID(),
                amount,
                reason,
                date: new Date().toISOString(),
                type: 'earned'
            }];
            return {
                ...prev,
                balance: prev.balance + amount,
                monthlyTransactions: prev.monthlyTransactions + 1,
                monthlyEarned: prev.monthlyEarned + amount,
                history: newHistory
            };
        });
    }, []);

    // Spend coins (for premium) — returns Promise<boolean> for reliable result
    const spendCoins = useCallback((amount, reason) => {
        return new Promise((resolve) => {
            setCoinState(prev => {
                if (prev.balance < amount) {
                    resolve(false);
                    return prev;
                }
                resolve(true);
                return {
                    ...prev,
                    balance: prev.balance - amount,
                    history: [...prev.history, {
                        id: crypto.randomUUID(),
                        amount: -amount,
                        reason,
                        date: new Date().toISOString(),
                        type: 'spent'
                    }]
                };
            });
        });
    }, []);

    // Can earn more coins this month?
    const canEarnCoins = coinState.monthlyTransactions < 5;

    // Get discount based on subscription type
    const getVoucherDiscount = (subscriptionType) => {
        if (subscriptionType === 'premium') return 50;
        if (subscriptionType === 'pro') return 20;
        return 0;
    };

    const value = {
        balance: coinState.balance,
        monthlyEarned: coinState.monthlyEarned,
        monthlyTransactions: coinState.monthlyTransactions,
        history: coinState.history,
        addCoins,
        spendCoins,
        canEarnCoins,
        getVoucherDiscount,
        COINS_PER_TRANSACTION: 20,
        MAX_MONTHLY_TRANSACTIONS: 5,
        PREMIUM_COST_IN_COINS: 100
    };

    return (
        <CoinContext.Provider value={value}>
            {children}
        </CoinContext.Provider>
    );
};

export const useCoins = () => {
    const context = useContext(CoinContext);
    if (!context) {
        throw new Error('useCoins must be used within a CoinProvider');
    }
    return context;
};

export default CoinContext;
