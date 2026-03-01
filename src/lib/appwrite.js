import { Client, Account } from 'appwrite';

// Appwrite configuration from environment variables
const APPWRITE_ENDPOINT = import.meta.env.VITE_APPWRITE_ENDPOINT || '';
const APPWRITE_PROJECT_ID = import.meta.env.VITE_APPWRITE_PROJECT_ID || '';

const client = new Client();

// Only configure if environment variables are set
if (APPWRITE_ENDPOINT && APPWRITE_PROJECT_ID) {
    client
        .setEndpoint(APPWRITE_ENDPOINT)
        .setProject(APPWRITE_PROJECT_ID);
}

export const account = new Account(client);

// Check if Appwrite is configured
export const isAppwriteConfigured = () => !!(APPWRITE_ENDPOINT && APPWRITE_PROJECT_ID);

// Google OAuth login
export const loginWithGoogle = async () => {
    if (!isAppwriteConfigured()) {
        console.warn('[Appwrite] Not configured. Skipping Google OAuth.');
        throw new Error('Appwrite is not configured. Set VITE_APPWRITE_ENDPOINT and VITE_APPWRITE_PROJECT_ID.');
    }
    try {
        account.createOAuth2Session(
            'google',
            window.location.origin + '/', // Success redirect
            window.location.origin + '/login' // Failure redirect
        );
    } catch (err) {
        console.error('Google OAuth error:', err);
        throw err;
    }
};

// Get current session
export const getCurrentUser = async () => {
    if (!isAppwriteConfigured()) return null;
    try {
        return await account.get();
    } catch {
        return null;
    }
};

// Logout
export const logoutAppwrite = async () => {
    if (!isAppwriteConfigured()) return;
    try {
        await account.deleteSession('current');
    } catch (err) {
        console.error('Logout error:', err);
    }
};

export default client;
