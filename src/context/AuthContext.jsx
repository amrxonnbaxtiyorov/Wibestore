import { createContext, useContext, useState, useEffect, useCallback } from 'react';
import apiClient, { setTokens, getStoredTokens, removeTokens } from '../lib/apiClient';
import { createPublicClient } from '../lib/apiClient';

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
                // Получаем данные текущего пользователя
                const { data } = await apiClient.get('/auth/me/');
                setUser(data);
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
            setUser(null);
        };

        window.addEventListener('wibe-logout', handleLogout);
        return () => window.removeEventListener('wibe-logout', handleLogout);
    }, []);

    // Login функция
    const login = async (email, password) => {
        try {
            const publicClient = createPublicClient();
            const { data } = await publicClient.post('/auth/login/', { email, password });
            
            // Backend returns: { success: true, data: { user, tokens } } or legacy { access, refresh }
            const payload = data.data || data;
            const tokens = payload.tokens || { access: payload.access, refresh: payload.refresh };
            setTokens({ access: tokens.access, refresh: tokens.refresh });
            
            let userData = payload.user;
            if (!userData && tokens.access) {
                const { data: me } = await apiClient.get('/auth/me/');
                userData = me;
            }
            setUser(userData);
            return userData;
        } catch (error) {
            console.error('[Auth] Login failed:', error);
            throw error.response?.data?.error || error.response?.data || new Error('Login failed');
        }
    };

    // Register функция
    const register = async (userData) => {
        try {
            const publicClient = createPublicClient();
            const { data } = await publicClient.post('/auth/register/', userData);
            
            // Backend returns: { success: true, data: { user, tokens: { access, refresh } } }
            const { user: newUser, tokens } = data.data || data;
            
            // Сохраняем токены
            setTokens({ access: tokens.access, refresh: tokens.refresh });
            setUser(newUser);
            
            return newUser;
        } catch (error) {
            console.error('[Auth] Register failed:', error);
            throw error.response?.data?.error || error.response?.data || new Error('Register failed');
        }
    };

    // Google OAuth login/register
    const loginWithGoogle = async (credential) => {
        try {
            const publicClient = createPublicClient();
            const { data } = await publicClient.post('/auth/google/', { access_token: credential });
            
            // Backend returns: { success: true, data: { user, tokens: { access, refresh } } }
            const { user: userData, tokens } = data.data || data;
            
            // Сохраняем токены
            setTokens({ access: tokens.access, refresh: tokens.refresh });
            setUser(userData);
            
            return userData;
        } catch (error) {
            console.error('[Auth] Google login failed:', error);
            if (error.response?.status === 405) {
                throw new Error(
                    "Backend manzili sozlanmagan (405). Railway → Frontend → Variables → VITE_API_BASE_URL = https://BACKEND.railway.app/api/v1, keyin Redeploy. Vaqtinchalik: F12 → Console → localStorage.setItem('wibe_api_base_url', 'https://BACKEND.railway.app/api/v1'); location.reload();"
                );
            }
            throw error.response?.data?.error || error.response?.data || new Error('Google login failed');
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
            setUser(null);
        }
    };

    // Refresh данных пользователя
    const refreshUser = useCallback(async () => {
        try {
            const { data } = await apiClient.get('/auth/me/');
            setUser(data);
            return data;
        } catch (error) {
            console.error('[Auth] Failed to refresh user:', error);
            throw error;
        }
    }, []);

    // Update профиля
    const updateProfile = async (updates) => {
        try {
            const { data } = await apiClient.patch('/auth/me/', updates);
            setUser(data);
            return data;
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
    const confirmResetPassword = async (uid, token, newPassword) => {
        try {
            const publicClient = createPublicClient();
            await publicClient.post('/auth/password/reset/confirm/', {
                uid,
                token,
                new_password: newPassword,
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
        loginWithGoogle,
        register,
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
