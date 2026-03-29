import { Navigate, useLocation } from 'react-router-dom';
import { useAuth } from '../hooks';
import GuardLoading from './GuardLoading';

/**
 * AuthGuard - Защищенный маршрут для авторизованных пользователей
 * 
 * Usage:
 * <AuthGuard>
 *   <ProfilePage />
 * </AuthGuard>
 */
const AuthGuard = ({ children }) => {
    const { user, isLoading, isInitialized } = useAuth();
    const location = useLocation();

    if (isLoading || !isInitialized) {
        return <GuardLoading />;
    }

    // Если пользователь не авторизован - редирект на login
    if (!user) {
        return <Navigate to="/login" state={{ from: location, redirect: location.pathname }} replace />;
    }

    return children;
};

/**
 * AdminGuard - Защищенный маршрут для администраторов
 * 
 * Usage:
 * <AdminGuard>
 *   <AdminDashboard />
 * </AdminGuard>
 */
export const AdminGuard = ({ children }) => {
    const { user, isLoading, isInitialized } = useAuth();
    const location = useLocation();

    if (isLoading || !isInitialized) {
        return <GuardLoading />;
    }

    if (!user) {
        return <Navigate to="/admin/login" state={{ from: location }} replace />;
    }

    if (!user.is_staff) {
        return <Navigate to="/" replace />;
    }

    return children;
};

/**
 * GuestGuard - Маршрут только для неавторизованных (login, signup)
 * Редиректит на главную если пользователь уже авторизован
 */
export const GuestGuard = ({ children }) => {
    const { user, isLoading, isInitialized } = useAuth();

    if (isLoading || !isInitialized) {
        return <GuardLoading />;
    }

    if (user) {
        return <Navigate to="/" replace />;
    }

    return children;
};

export default AuthGuard;
