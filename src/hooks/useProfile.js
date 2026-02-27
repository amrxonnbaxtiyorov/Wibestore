import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import apiClient from '../lib/apiClient';

/**
 * Hook для получения данных профиля текущего пользователя
 */
export const useProfile = () => {
    return useQuery({
        queryKey: ['profile'],
        queryFn: async () => {
            const { data } = await apiClient.get('/profile/');
            return data;
        },
        staleTime: 5 * 60 * 1000, // 5 minutes
        retry: (failureCount, error) => {
            // Don't retry on 401/403
            if ([401, 403].includes(error.response?.status)) {
                return false;
            }
            return failureCount < 3;
        },
    });
};

/**
 * Hook для обновления профиля
 */
export const useUpdateProfile = () => {
    const queryClient = useQueryClient();

    return useMutation({
        mutationFn: async (updates) => {
            const { data } = await apiClient.patch('/profile/', updates);
            return data;
        },
        onSuccess: () => {
            queryClient.invalidateQueries(['profile']);
        },
    });
};

/**
 * Hook для получения списка listing'ов пользователя
 */
export const useProfileListings = (status) => {
    return useQuery({
        queryKey: ['profile', 'listings', status],
        queryFn: async () => {
            const params = status ? `?status=${status}` : '';
            const { data } = await apiClient.get(`/profile/listings/${params}`);
            return data;
        },
        enabled: true,
        staleTime: 2 * 60 * 1000, // 2 minutes
    });
};

/**
 * Hook для получения избранных listing'ов пользователя
 */
export const useProfileFavorites = () => {
    return useQuery({
        queryKey: ['profile', 'favorites'],
        queryFn: async () => {
            const { data } = await apiClient.get('/profile/favorites/');
            return data;
        },
        staleTime: 5 * 60 * 1000, // 5 minutes
    });
};

/**
 * Hook для получения истории покупок пользователя
 */
export const useProfilePurchases = () => {
    return useQuery({
        queryKey: ['profile', 'purchases'],
        queryFn: async () => {
            const { data } = await apiClient.get('/profile/purchases/');
            return data;
        },
        staleTime: 5 * 60 * 1000, // 5 minutes
    });
};

/**
 * Hook для получения истории продаж пользователя
 */
export const useProfileSales = () => {
    return useQuery({
        queryKey: ['profile', 'sales'],
        queryFn: async () => {
            const { data } = await apiClient.get('/profile/sales/');
            return data;
        },
        staleTime: 5 * 60 * 1000, // 5 minutes
    });
};

/**
 * Hook для получения уведомлений пользователя
 */
export const useProfileNotifications = () => {
    return useQuery({
        queryKey: ['profile', 'notifications'],
        queryFn: async () => {
            const { data } = await apiClient.get('/profile/notifications/');
            return data;
        },
        staleTime: 1 * 60 * 1000, // 1 minute
        refetchInterval: 30 * 1000, // Refetch every 30 seconds
    });
};

/**
 * Seller dashboard: sales, views, conversion
 */
export const useSellerDashboard = () => {
    return useQuery({
        queryKey: ['profile', 'dashboard'],
        queryFn: async () => {
            const { data } = await apiClient.get('/profile/dashboard/');
            return data;
        },
        staleTime: 2 * 60 * 1000,
    });
};

/**
 * Referral code and stats
 */
export const useReferral = () => {
    return useQuery({
        queryKey: ['profile', 'referral'],
        queryFn: async () => {
            const { data } = await apiClient.get('/profile/referral/');
            return data;
        },
        staleTime: 5 * 60 * 1000,
    });
};

/**
 * Saved searches (alerts)
 */
export const useSavedSearches = () => {
    return useQuery({
        queryKey: ['profile', 'saved-searches'],
        queryFn: async () => {
            const { data } = await apiClient.get('/profile/saved-searches/');
            return data;
        },
        staleTime: 2 * 60 * 1000,
    });
};

export const useCreateSavedSearch = () => {
    const queryClient = useQueryClient();
    return useMutation({
        mutationFn: async (body) => {
            const { data } = await apiClient.post('/profile/saved-searches/', body);
            return data;
        },
        onSuccess: () => queryClient.invalidateQueries(['profile', 'saved-searches']),
    });
};

export const useDeleteSavedSearch = (id) => {
    const queryClient = useQueryClient();
    return useMutation({
        mutationFn: async () => {
            await apiClient.delete(`/profile/saved-searches/${id}/`);
        },
        onSuccess: () => queryClient.invalidateQueries(['profile', 'saved-searches']),
    });
};

export default {
    useProfile,
    useUpdateProfile,
    useProfileListings,
    useProfileFavorites,
    useProfilePurchases,
    useProfileSales,
    useProfileNotifications,
    useSellerDashboard,
    useReferral,
    useSavedSearches,
    useCreateSavedSearch,
    useDeleteSavedSearch,
};
