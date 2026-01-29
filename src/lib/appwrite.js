import { Client, Account } from 'appwrite';

// Appwrite configuration
const client = new Client();

client
    .setEndpoint('https://fra.cloud.appwrite.io/v1')
    .setProject('697b13ea0001d79ebd81');

export const account = new Account(client);

// Google OAuth login
export const loginWithGoogle = async () => {
    try {
        account.createOAuth2Session(
            'google',
            window.location.origin + '/', // Success redirect
            window.location.origin + '/login' // Failure redirect
        );
    } catch (error) {
        console.error('Google OAuth error:', error);
        throw error;
    }
};

// Get current session
export const getCurrentUser = async () => {
    try {
        return await account.get();
    } catch (error) {
        return null;
    }
};

// Logout
export const logoutAppwrite = async () => {
    try {
        await account.deleteSession('current');
    } catch (error) {
        console.error('Logout error:', error);
    }
};

export default client;
