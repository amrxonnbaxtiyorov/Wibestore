import { createContext, useContext, useState, useCallback, useEffect } from 'react';
import uz from '../locales/uz.json';
import ru from '../locales/ru.json';
import en from '../locales/en.json';

const translations = { uz, ru, en };

const LanguageContext = createContext();

export const languages = [
    {
        code: 'uz',
        name: "O'zbek",
        flag: '🇺🇿',
        flagUrl: 'https://flagcdn.com/w320/uz.png',
    },
    {
        code: 'ru',
        name: 'Русский',
        flag: '🇷🇺',
        flagUrl: 'https://flagcdn.com/w320/ru.png',
    },
    {
        code: 'en',
        name: 'English',
        flag: '🇺🇸',
        flagUrl: 'https://flagcdn.com/w320/us.png', // AQSh bayrog'i — ingliz tili (avvalgi ko'rinish)
    },
];

export const LanguageProvider = ({ children }) => {
    const [language, setLanguageState] = useState(() => {
        return localStorage.getItem('wibeLanguage') || 'uz';
    });

    const setLanguage = useCallback((lang) => {
        setLanguageState(lang);
        localStorage.setItem('wibeLanguage', lang);
    }, []);

    // Sync <html lang="..."> attribute so browsers/SEO crawlers know the page language
    useEffect(() => {
        document.documentElement.lang = language;
    }, [language]);

    // Helper function to get nested translation by dot-path
    // Returns undefined (not the key) when not found, so `t('x') || 'fallback'` works
    const t = useCallback((key) => {
        const resolve = (lang) => {
            const keys = key.split('.');
            let result = translations[lang];
            for (const k of keys) {
                if (result && typeof result === 'object' && k in result) {
                    result = result[k];
                } else {
                    return undefined;
                }
            }
            return typeof result === 'string' ? result : undefined;
        };
        return resolve(language) ?? resolve('uz') ?? resolve('en');
    }, [language]);

    return (
        <LanguageContext.Provider value={{ language, setLanguage, t, languages }}>
            {children}
        </LanguageContext.Provider>
    );
};

export const useLanguage = () => {
    const context = useContext(LanguageContext);
    if (!context) {
        throw new Error('useLanguage must be used within a LanguageProvider');
    }
    return context;
};
