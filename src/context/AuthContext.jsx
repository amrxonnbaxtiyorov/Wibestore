import { createContext, useContext, useState, useEffect, useCallback } from 'react';
import apiClient, { setTokens, getStoredTokens, removeTokens } from '../lib/apiClient';
import { createPublicClient } from '../lib/apiClient';

const API_BASE_URL = import.meta.env.VITE_API_BASE_URL || '/api/v1';

/** API dan kelgan user obyektini frontend uchun normalizatsiya: name (ism), avatar (to'liq URL) */
function normalizeUser(data) {
    if (!data) return null;
    const name = data.display_name ?? data.full_name ?? data.name ?? data.username ?? ((data.email ? data.email.split('@')[0] : '') || 'User');
    let avatar = data.avatar ?? null;
    if (avatar && typeof avatar === 'string' && avatar.startsWith('/') && !avatar.startsWith('//')) {
        const origin = typeof window !== 'undefined' ? window.location.origin : '';
        const apiOrigin = API_BASE_URL.startsWith('http') ? new URL(API_BASE_URL).origin : origin;
        avatar = `${apiOrigin}${avatar}`;
    }
    return { ...data, name, avatar };
}

const AuthContext = createContext(null);

export const AuthProvider = ({ children }) => {
    const [user, setUser] = useState(null);
    const [isLoading, setIsLoading] = useState(true);
    const [isInitialized, setIsInitialized] = useState(false);

    // Проверка авторизации при загрузке
    useEffect(() => {
        const checkAuth = async () => {
            const tokens = getStoredTokens();
            
            if (!tokens?.access) {
                setIsLoading(false);
                setIsInitialized(true);
                return;
            }

            try {
                const { data } = await apiClient.get('/auth/me/');
                setUser(normalizeUser(data));
            } catch (error) {
                console.error('[Auth] Failed to fetch user:', error);
                // Токен недействителен - очищаем
                removeTokens();
                setUser(null);
            } finally {
                setIsLoading(false);
                setIsInitialized(true);
            }
        };

        checkAuth();

        // Слушаем событие logout из apiClient
        const handleLogout = () => {
            localStorage.removeItem('wibeUser');
            setUser(null);
        };

        window.addEventListener('wibe-logout', handleLogout);
        return () => window.removeEventListener('wibe-logout', handleLogout);
    }, []);

    // Login функция (email/password — hozir ishlatilmaydi, faqat Telegram)
    const login = async (_email, _password) => {
        throw new Error('Kirish faqat Telegram orqali. Telefon raqam va kodni kiriting.');
    };

    // Telegram orqali kirish (telefon + botdan olingan kod)
    const loginWithTelegram = async (phone, code) => {
        try {
            const publicClient = createPublicClient();
            const { data } = await publicClient.post('/auth/register/telegram/', {
                phone: String(phone).trim(),
                code: String(code).trim(),
            }, { withCredentials: true });
            const payload = data?.data || data;
            const tokens = payload?.tokens || {};
            if (tokens.access) setTokens({ access: tokens.access, refresh: tokens.refresh || '' });
            const userData = payload?.user;
            const normalized = normalizeUser(userData);
            setUser(normalized);
            if (normalized) localStorage.setItem('wibeUser', JSON.stringify(normalized));
            return normalized;
        } catch (error) {
            console.error('[Auth] Telegram login failed:', error);
            const res = error.response?.data;
            const msg = res?.error?.message || (typeof res?.error === 'string' ? res.error : null) || res?.detail;
            throw new Error(msg || 'Kod noto\'g\'ri yoki muddati tugagan. Botdan yangi kod oling.');
        }
    };

    // Register функция
    const register = async (userData) => {
        try {
            const publicClient = createPublicClient();
            const { data } = await publicClient.post('/auth/register/', userData);
            
            // Backend returns: { success: true, data: { user, tokens: { access, refresh } } }
            const { user: newUser, tokens } = data.data || data;
            const normalized = normalizeUser(newUser);
            setTokens({ access: tokens.access, refresh: tokens.refresh });
            setUser(normalized);
            if (normalized) localStorage.setItem('wibeUser', JSON.stringify(normalized));
            return normalized;
        } catch (error) {
            console.error('[Auth] Register failed:', error);
            throw error.response?.data?.error || error.response?.data || new Error('Register failed');
        }
    };

    // Telegram orqali ro'yxatdan o'tish (botdan kod olib, telefon + kod yuborish)
    const registerWithTelegram = async (phone, code) => {
        try {
            const publicClient = createPublicClient();
            const { data } = await publicClient.post('/auth/register/telegram/', {
                phone: String(phone).trim(),
                code: String(code).trim(),
            }, { withCredentials: true });

            const payload = data?.data || data;
            const tokens = payload?.tokens || {};
            if (tokens.access) setTokens({ access: tokens.access, refresh: tokens.refresh || '' });
            const newUser = payload?.user;
            const normalized = normalizeUser(newUser);
            setUser(normalized);
            if (normalized) localStorage.setItem('wibeUser', JSON.stringify(normalized));
            return normalized;
        } catch (error) {
            console.error('[Auth] Telegram register failed:', error);
            const res = error.response?.data;
            const msg = res?.error?.message || (typeof res?.error === 'string' ? res.error : null) || res?.detail;
            throw new Error(msg || 'Kod noto\'g\'ri yoki muddati tugagan. Botdan yangi kod oling.');
        }
    };

    // Google OAuth login/register
    const loginWithGoogle = async (credential) => {
        try {
            const publicClient = createPublicClient();
            const { data } = await publicClient.post('/auth/google/', { access_token: credential });
            
            const { user: userData, tokens } = data.data || data;
            const normalized = normalizeUser(userData);
            setTokens({ access: tokens.access, refresh: tokens.refresh });
            setUser(normalized);
            if (normalized) localStorage.setItem('wibeUser', JSON.stringify(normalized));
            return normalized;
        } catch (error) {
            console.error('[Auth] Google login failed:', error);
            const data = error.response?.data;
            const status = error.response?.status;
            if (status === 405) {
                throw new Error("Xatolik yuz berdi. Keyinroq qayta urinib ko'ring.");
            }
            const msg = data?.error?.message || (typeof data?.error === 'string' ? data.error : null) || data?.detail;
            if (msg && typeof msg === 'string') {
                throw new Error(msg);
            }
            throw new Error(error.message || "Google orqali kirish amalga oshmadi.");
        }
    };

    // Logout функция
    const logout = async () => {
        const tokens = getStoredTokens();
        try {
            // Уведомляем сервер о logout (blacklist refresh токена)
            if (tokens?.refresh) {
                await apiClient.post('/auth/logout/', { refresh: tokens.refresh });
            }
        } catch (error) {
            console.error('[Auth] Logout request failed:', error);
        } finally {
            removeTokens();
            localStorage.removeItem('wibeUser');
            setUser(null);
        }
    };

    // Refresh данных пользователя
    const refreshUser = useCallback(async () => {
        try {
            const { data } = await apiClient.get('/auth/me/');
            setUser(normalizeUser(data));
            return normalizeUser(data);
        } catch (error) {
            console.error('[Auth] Failed to refresh user:', error);
            throw error;
        }
    }, []);

    // Update профиля
    const updateProfile = async (updates) => {
        try {
            const isFormData = updates instanceof FormData;
            const config = isFormData ? {} : {};
            const { data } = await apiClient.patch('/auth/me/', updates, config);
            setUser(normalizeUser(data));
            return normalizeUser(data);
        } catch (error) {
            console.error('[Auth] Profile update failed:', error);
            throw error.response?.data || new Error('Profile update failed');
        }
    };

    // Reset пароля
    const resetPassword = async (email) => {
        try {
            const publicClient = createPublicClient();
            await publicClient.post('/auth/password/reset/', { email });
            return true;
        } catch (error) {
            console.error('[Auth] Password reset failed:', error);
            throw error.response?.data || new Error('Password reset failed');
        }
    };

    // Confirm reset пароля
    const confirmResetPassword = async (_uid, token, newPassword) => {
        try {
            const publicClient = createPublicClient();
            await publicClient.post('/auth/password/reset/confirm/', {
                token,
                password: newPassword,
                password_confirm: newPassword,
            });
            return true;
        } catch (error) {
            console.error('[Auth] Password reset confirm failed:', error);
            throw error.response?.data || new Error('Password reset confirm failed');
        }
    };

    const value = {
        user,
        isLoading,
        isInitialized,
        isAuthenticated: !!user,
        login,
        loginWithTelegram,
        loginWithGoogle,
        register,
        registerWithTelegram,
        logout,
        updateProfile,
        refreshUser,
        resetPassword,
        confirmResetPassword,
    };

    return (
        <AuthContext.Provider value={value}>
            {children}
        </AuthContext.Provider>
    );
};

export const useAuth = () => {
    const context = useContext(AuthContext);
    if (!context) {
        throw new Error('useAuth must be used within an AuthProvider');
    }
    return context;
};

export default AuthContext;
