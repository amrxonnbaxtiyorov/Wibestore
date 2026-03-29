/**
 * Admin Authentication Hook
 * Centralized admin authentication with session validation
 */

import { useState, useEffect, useCallback } from 'react';
import { useNavigate } from 'react-router-dom';

const ADMIN_SESSION_KEY = 'adminAuth';

/**
 * Hash function for session tokens (simple obfuscation)
 * Note: This is client-side only. For production, use JWT from backend.
 */
const hashToken = (data) => btoa(`${data}:${Date.now()}:${Math.random()}`);

/**
 * Validate admin session
 * @param {object} session - Session object from localStorage
 * @returns {boolean} True if session is valid
 */
const isValidSession = (session) => {
    if (!session || !session.isAuthenticated) return false;
    
    // Check if session has expired
    if (session.expiresAt) {
        const now = new Date();
        const expiresAt = new Date(session.expiresAt);
        if (now > expiresAt) return false;
    }
    
    // Validate session token format
    if (!session.sessionToken || typeof session.sessionToken !== 'string') return false;
    
    return true;
};

/**
 * Get current admin session
 * @returns {object|null} Session object or null if not authenticated
 */
export const getAdminSession = () => {
    try {
        const authData = localStorage.getItem(ADMIN_SESSION_KEY);
        if (!authData) return null;
        
        const session = JSON.parse(authData);
        if (!isValidSession(session)) {
            // Invalid session - clear it
            localStorage.removeItem(ADMIN_SESSION_KEY);
            return null;
        }
        
        return session;
    } catch {
        localStorage.removeItem(ADMIN_SESSION_KEY);
        return null;
    }
};

/**
 * Set admin session after successful login
 * @param {string} username - Admin username
 * @param {number} expiresInHours - Session expiration in hours (default: 8)
 * @returns {object} Session object
 */
export const setAdminSession = (username, expiresInHours = 8) => {
    const sessionToken = hashToken(`${username}`);
    const now = new Date();
    const expiresAt = new Date(now.getTime() + expiresInHours * 60 * 60 * 1000);
    
    const session = {
        isAuthenticated: true,
        username,
        sessionToken,
        loginTime: now.toISOString(),
        expiresAt: expiresAt.toISOString(),
    };
    
    localStorage.setItem(ADMIN_SESSION_KEY, JSON.stringify(session));
    return session;
};

/**
 * Clear admin session (logout)
 */
export const clearAdminSession = () => {
    localStorage.removeItem(ADMIN_SESSION_KEY);
};

/**
 * Refresh admin session expiration
 * @param {number} extendHours - Hours to extend session (default: 8)
 * @returns {boolean} True if session was refreshed
 */
export const refreshAdminSession = (extendHours = 8) => {
    const session = getAdminSession();
    if (!session) return false;
    
    const expiresAt = new Date(Date.now() + extendHours * 60 * 60 * 1000);
    session.expiresAt = expiresAt.toISOString();
    
    localStorage.setItem(ADMIN_SESSION_KEY, JSON.stringify(session));
    return true;
};

/**
 * React hook for admin authentication
 * @returns {object} Admin auth state and methods
 */
export const useAdminAuth = () => {
    const navigate = useNavigate();
    const [session, setSession] = useState(null);
    const [isLoading, setIsLoading] = useState(true);
    const [isAuthenticated, setIsAuthenticated] = useState(false);

    // Check authentication on mount
    useEffect(() => {
        const checkAuth = () => {
            const currentSession = getAdminSession();
            setSession(currentSession);
            setIsAuthenticated(!!currentSession);
            setIsLoading(false);
        };

        checkAuth();

        // Listen for storage changes (logout from other tabs)
        const handleStorageChange = (e) => {
            if (e.key === ADMIN_SESSION_KEY) {
                checkAuth();
            }
        };

        window.addEventListener('storage', handleStorageChange);
        return () => window.removeEventListener('storage', handleStorageChange);
    }, []);

    // Admin kirish endi asosiy sayt orqali (staff hisob + JWT). Frontendda parol tekshirilmaydi.
    const login = useCallback(() => ({
        success: false,
        error: "Admin panelga kirish uchun asosiy saytda staff hisob bilan kiring (/login).",
    }), []);

    // Logout function
    const logout = useCallback(() => {
        clearAdminSession();
        setSession(null);
        setIsAuthenticated(false);
        navigate('/amirxon/login');
    }, [navigate]);

    // Check if session is about to expire (within 30 minutes)
    const isSessionExpiringSoon = useCallback(() => {
        if (!session?.expiresAt) return false;
        const expiresAt = new Date(session.expiresAt);
        const now = new Date();
        const thirtyMinutes = 30 * 60 * 1000;
        return (expiresAt - now) < thirtyMinutes;
    }, [session]);

    return {
        session,
        isLoading,
        isAuthenticated,
        username: session?.username,
        login,
        logout,
        refreshSession: () => refreshAdminSession(),
        isSessionExpiringSoon,
    };
};

export default useAdminAuth;
