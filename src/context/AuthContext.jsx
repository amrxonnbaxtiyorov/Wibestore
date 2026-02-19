import { createContext, useContext, useState, useEffect, useCallback } from 'react';

const AuthContext = createContext(null);

export const AuthProvider = ({ children }) => {
    const [user, setUser] = useState(() => {
        // Lazy initialization - runs only once, not in effect
        const savedUser = localStorage.getItem('wibeUser');
        if (savedUser) {
            try {
                return JSON.parse(savedUser);
            } catch {
                localStorage.removeItem('wibeUser');
            }
        }
        return null;
    });
    const [isLoading, setIsLoading] = useState(false);

    // Listen for storage events (for Google OAuth login)
    useEffect(() => {
        const handleStorageChange = () => {
            const savedUser = localStorage.getItem('wibeUser');
            if (savedUser) {
                try {
                    setUser(JSON.parse(savedUser));
                } catch {
                    localStorage.removeItem('wibeUser');
                }
            } else {
                setUser(null);
            }
        };

        window.addEventListener('storage', handleStorageChange);
        return () => window.removeEventListener('storage', handleStorageChange);
    }, []);

    // Get all registered users
    const getRegisteredUsers = () => {
        return JSON.parse(localStorage.getItem('wibeRegisteredUsers') || '[]');
    };

    // Login function
    const login = (email, password) => {
        return new Promise((resolve, reject) => {
            setTimeout(() => {
                const registeredUsers = getRegisteredUsers();
                const foundUser = registeredUsers.find(
                    u => u.email.toLowerCase() === email.toLowerCase() && u.password === password
                );

                if (foundUser) {
                    const userData = { ...foundUser };
                    delete userData.password;
                    setUser(userData);
                    localStorage.setItem('wibeUser', JSON.stringify(userData));
                    resolve(userData);
                } else {
                    reject(new Error('Email yoki parol noto\'g\'ri'));
                }
            }, 500);
        });
    };

    // Register function
    const register = (userData) => {
        return new Promise((resolve, reject) => {
            setTimeout(() => {
                const registeredUsers = getRegisteredUsers();

                // Check if email already exists
                if (registeredUsers.some(u => u.email.toLowerCase() === userData.email.toLowerCase())) {
                    reject(new Error('Bu email allaqachon ro\'yxatdan o\'tgan'));
                    return;
                }

                const newUser = {
                    id: crypto.randomUUID(),
                    name: userData.name,
                    email: userData.email,
                    phone: userData.phone,
                    password: userData.password,
                    avatar: null,
                    rating: 5.0,
                    sales: 0,
                    purchases: 0,
                    isPremium: false,
                    premiumType: null,
                    premiumExpiry: null,
                    createdAt: new Date().toISOString().split('T')[0]
                };

                registeredUsers.push(newUser);
                localStorage.setItem('wibeRegisteredUsers', JSON.stringify(registeredUsers));

                // Also update wibeUsers for admin panel
                const wibeUsers = JSON.parse(localStorage.getItem('wibeUsers') || '[]');
                wibeUsers.push({
                    id: String(newUser.id),
                    name: newUser.name,
                    email: newUser.email,
                    isPremium: false,
                    premiumType: null,
                    premiumExpiry: null
                });
                localStorage.setItem('wibeUsers', JSON.stringify(wibeUsers));

                const userDataWithoutPassword = { ...newUser };
                delete userDataWithoutPassword.password;
                setUser(userDataWithoutPassword);
                localStorage.setItem('wibeUser', JSON.stringify(userDataWithoutPassword));

                resolve(userDataWithoutPassword);
            }, 500);
        });
    };

    // Google OAuth login/register
    const loginWithGoogle = (googleData) => {
        return new Promise((resolve) => {
            const registeredUsers = getRegisteredUsers();

            // Check if user with this email already exists
            const existingUser = registeredUsers.find(
                u => u.email.toLowerCase() === googleData.email.toLowerCase()
            );

            if (existingUser) {
                // User exists — update avatar from Google and log in
                existingUser.avatar = googleData.avatar || existingUser.avatar;
                existingUser.googleId = googleData.id;
                const idx = registeredUsers.findIndex(u => u.id === existingUser.id);
                if (idx !== -1) registeredUsers[idx] = existingUser;
                localStorage.setItem('wibeRegisteredUsers', JSON.stringify(registeredUsers));

                const userData = { ...existingUser };
                delete userData.password;
                setUser(userData);
                localStorage.setItem('wibeUser', JSON.stringify(userData));
                resolve(userData);
            } else {
                // New user — auto-register with Google data
                const newUser = {
                    id: crypto.randomUUID(),
                    googleId: googleData.id,
                    name: googleData.name,
                    email: googleData.email,
                    phone: '',
                    password: null, // Google users have no password
                    avatar: googleData.avatar || null,
                    rating: 5.0,
                    sales: 0,
                    purchases: 0,
                    isPremium: false,
                    premiumType: null,
                    premiumExpiry: null,
                    authProvider: 'google',
                    createdAt: new Date().toISOString().split('T')[0]
                };

                registeredUsers.push(newUser);
                localStorage.setItem('wibeRegisteredUsers', JSON.stringify(registeredUsers));

                // Also update wibeUsers for admin panel
                const wibeUsers = JSON.parse(localStorage.getItem('wibeUsers') || '[]');
                wibeUsers.push({
                    id: String(newUser.id),
                    name: newUser.name,
                    email: newUser.email,
                    isPremium: false,
                    premiumType: null,
                    premiumExpiry: null
                });
                localStorage.setItem('wibeUsers', JSON.stringify(wibeUsers));

                const userDataWithoutPassword = { ...newUser };
                delete userDataWithoutPassword.password;
                setUser(userDataWithoutPassword);
                localStorage.setItem('wibeUser', JSON.stringify(userDataWithoutPassword));
                resolve(userDataWithoutPassword);
            }
        });
    };

    // Logout function
    const logout = () => {
        setUser(null);
        localStorage.removeItem('wibeUser');
    };

    // Update user profile
    const updateProfile = (updates) => {
        const updatedUser = { ...user, ...updates };
        setUser(updatedUser);
        localStorage.setItem('wibeUser', JSON.stringify(updatedUser));

        // Also update in registered users
        const registeredUsers = getRegisteredUsers();
        const userIndex = registeredUsers.findIndex(u => u.id === user.id);
        if (userIndex !== -1) {
            registeredUsers[userIndex] = { ...registeredUsers[userIndex], ...updates };
            localStorage.setItem('wibeRegisteredUsers', JSON.stringify(registeredUsers));
        }

        return updatedUser;
    };

    const value = {
        user,
        isLoading,
        isAuthenticated: !!user,
        login,
        loginWithGoogle,
        register,
        logout,
        updateProfile
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
