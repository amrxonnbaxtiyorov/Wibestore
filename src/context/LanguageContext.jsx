import { createContext, useContext, useState, useCallback } from 'react';
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
        flagUrl: 'https://flagcdn.com/w320/gb.png',
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

    // Helper function to get nested translation by dot-path
    const t = useCallback((key) => {
        const keys = key.split('.');
        let result = translations[language];
        for (const k of keys) {
            if (result && typeof result === 'object' && k in result) {
                result = result[k];
            } else {
                // Fallback to Uzbek, then return key
                let fallback = translations['uz'];
                for (const fk of keys) {
                    if (fallback && typeof fallback === 'object' && fk in fallback) {
                        fallback = fallback[fk];
                    } else {
                        return key; // Return key if not found
                    }
                }
                return fallback;
            }
        }
        return result;
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
