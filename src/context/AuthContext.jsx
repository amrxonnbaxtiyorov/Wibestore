import { createContext, useContext, useState, useEffect } from 'react';

const AuthContext = createContext(null);

export const AuthProvider = ({ children }) => {
    const [user, setUser] = useState(null);
    const [isLoading, setIsLoading] = useState(true);

    // Check for existing session on mount
    useEffect(() => {
        const savedUser = localStorage.getItem('wibeUser');
        if (savedUser) {
            try {
                setUser(JSON.parse(savedUser));
            } catch {
                localStorage.removeItem('wibeUser');
            }
        }
        setIsLoading(false);
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
                    id: Date.now(),
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
