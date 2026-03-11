import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import apiClient from '../lib/apiClient';

const ADMIN_BASE = '/admin-panel';

/**
 * Hook для получения dashboard статистики (admin)
 */
export const useAdminDashboard = () => {
    return useQuery({
        queryKey: ['admin', 'dashboard'],
        queryFn: async () => {
            const { data } = await apiClient.get(`${ADMIN_BASE}/dashboard/`);
            return data?.data ?? data;
        },
        staleTime: 2 * 60 * 1000,
    });
};

/**
 * Hook для получения fraud/dispute статистики (admin)
 */
export const useAdminFraudStats = () => {
    return useQuery({
        queryKey: ['admin', 'fraud-stats'],
        queryFn: async () => {
            const { data } = await apiClient.get(`${ADMIN_BASE}/stats/fraud/`);
            return data?.data ?? data;
        },
        staleTime: 1 * 60 * 1000,
    });
};

/**
 * Hook для получения списка пользователей (admin)
 */
export const useAdminUsers = (filters = {}) => {
    return useQuery({
        queryKey: ['admin', 'users', filters],
        queryFn: async () => {
            const params = new URLSearchParams(filters);
            const { data } = await apiClient.get(`${ADMIN_BASE}/users/?${params}`);
            return data?.results ?? data;
        },
        staleTime: 1 * 60 * 1000,
    });
};

/**
 * Hook для бана/разбана пользователя (admin)
 */
export const useAdminBanUser = (userId) => {
    const queryClient = useQueryClient();
    return useMutation({
        mutationFn: async (action) => {
            const { data } = await apiClient.post(`${ADMIN_BASE}/users/${userId}/ban/`, { action });
            return data;
        },
        onSuccess: () => {
            queryClient.invalidateQueries({ queryKey: ['admin', 'users'] });
            queryClient.invalidateQueries({ queryKey: ['admin', 'dashboard'] });
        },
    });
};

/**
 * Hook для получения pending listings (admin)
 */
export const useAdminPendingListings = () => {
    return useQuery({
        queryKey: ['admin', 'listings', 'pending'],
        queryFn: async () => {
            const { data } = await apiClient.get(`${ADMIN_BASE}/listings/pending/`);
            return data?.results ?? data ?? [];
        },
        staleTime: 1 * 60 * 1000,
    });
};

/**
 * Hook для получения всех listings с фильтром по status (admin)
 */
export const useAdminAllListings = (filters = {}) => {
    const { status } = filters;
    return useQuery({
        queryKey: ['admin', 'listings', 'all', status],
        queryFn: async () => {
            const params = new URLSearchParams();
            if (status && status !== 'all') params.set('status', status);
            const url = `${ADMIN_BASE}/listings/${params.toString() ? `?${params}` : ''}`;
            const { data } = await apiClient.get(url);
            return Array.isArray(data) ? data : (data?.results ?? data ?? []);
        },
        staleTime: 1 * 60 * 1000,
    });
};

/**
 * Hook для удаления listing (admin)
 */
export const useAdminDeleteListing = () => {
    const queryClient = useQueryClient();
    return useMutation({
        mutationFn: async (listingId) => {
            const { data } = await apiClient.delete(`${ADMIN_BASE}/listings/${listingId}/delete/`);
            return data;
        },
        onSuccess: (_, listingId) => {
            queryClient.invalidateQueries({ queryKey: ['admin', 'listings'] });
            queryClient.invalidateQueries({ queryKey: ['listings', listingId] });
            queryClient.invalidateQueries({ queryKey: ['listings'] });
        },
    });
};

/**
 * Hook для одобрения listing (admin)
 */
export const useAdminApproveListing = () => {
    const queryClient = useQueryClient();
    return useMutation({
        mutationFn: async (listingId) => {
            const { data } = await apiClient.post(`${ADMIN_BASE}/listings/${listingId}/approve/`);
            return data;
        },
        onSuccess: (_, listingId) => {
            queryClient.invalidateQueries({ queryKey: ['admin', 'listings'] });
            queryClient.invalidateQueries({ queryKey: ['listings', listingId] });
        },
    });
};

/**
 * Hook для отклонения listing (admin)
 */
export const useAdminRejectListing = () => {
    const queryClient = useQueryClient();
    return useMutation({
        mutationFn: async ({ listingId, reason }) => {
            const { data } = await apiClient.post(`${ADMIN_BASE}/listings/${listingId}/reject/`, { reason: reason ?? '' });
            return data;
        },
        onSuccess: (_, { listingId }) => {
            queryClient.invalidateQueries({ queryKey: ['admin', 'listings'] });
            queryClient.invalidateQueries({ queryKey: ['listings', listingId] });
        },
    });
};

/**
 * Hook для получения списка listing'ов (admin) — all with optional status filter
 */
export const useAdminListings = (filters = {}) => {
    return useAdminAllListings(filters);
};

/**
 * Hook для обновления listing'а (admin) — используйте useAdminApproveListing / useAdminRejectListing
 */
export const useAdminUpdateListing = (listingId) => {
    const approve = useAdminApproveListing();
    const reject = useAdminRejectListing();
    return {
        approve: () => approve.mutateAsync(listingId),
        reject: (reason) => reject.mutateAsync({ listingId, reason }),
        ...approve,
    };
};

/**
 * Hook для получения reports (admin)
 */
export const useAdminReports = () => {
    return useQuery({
        queryKey: ['admin', 'reports'],
        queryFn: async () => {
            const { data } = await apiClient.get(`${ADMIN_BASE}/reports/`);
            return data?.results ?? data;
        },
        staleTime: 1 * 60 * 1000,
    });
};

/**
 * Hook для резолва report (admin)
 */
export const useAdminResolveReport = () => {
    const queryClient = useQueryClient();
    return useMutation({
        mutationFn: async ({ reportId, action, note }) => {
            const { data } = await apiClient.post(`${ADMIN_BASE}/reports/${reportId}/resolve/`, { action, note });
            return data;
        },
        onSuccess: () => {
            queryClient.invalidateQueries({ queryKey: ['admin', 'reports'] });
            queryClient.invalidateQueries({ queryKey: ['admin', 'dashboard'] });
        },
    });
};

/**
 * Hook для получения disputes (admin)
 */
export const useAdminDisputes = () => {
    return useQuery({
        queryKey: ['admin', 'disputes'],
        queryFn: async () => {
            const { data } = await apiClient.get(`${ADMIN_BASE}/disputes/`);
            return data?.results ?? data;
        },
        staleTime: 1 * 60 * 1000,
    });
};

/**
 * Hook для резолва dispute (admin)
 */
export const useAdminResolveDispute = () => {
    const queryClient = useQueryClient();
    return useMutation({
        mutationFn: async ({ disputeId, action, resolution }) => {
            const { data } = await apiClient.post(`${ADMIN_BASE}/disputes/${disputeId}/resolve/`, { action, resolution });
            return data;
        },
        onSuccess: () => {
            queryClient.invalidateQueries({ queryKey: ['admin', 'disputes'] });
            queryClient.invalidateQueries({ queryKey: ['admin', 'dashboard'] });
        },
    });
};

/**
 * Hook для получения транзакций (admin) — если backend добавит endpoint
 */
export const useAdminTransactions = (filters = {}) => {
    return useQuery({
        queryKey: ['admin', 'transactions', filters],
        queryFn: async () => {
            const params = new URLSearchParams(filters);
            const { data } = await apiClient.get(`${ADMIN_BASE}/transactions/?${params}`).catch(() => ({ data: [] }));
            return data?.results ?? data ?? [];
        },
        staleTime: 1 * 60 * 1000,
    });
};

/**
 * Hook for granting/revoking subscription (admin)
 */
export const useAdminGrantSubscription = () => {
    const queryClient = useQueryClient();
    return useMutation({
        mutationFn: async ({ userId, planSlug, months = 1 }) => {
            const { data } = await apiClient.post(`${ADMIN_BASE}/users/${userId}/subscription/`, {
                plan_slug: planSlug,
                months,
            });
            return data;
        },
        onSuccess: () => {
            queryClient.invalidateQueries({ queryKey: ['admin', 'users'] });
            queryClient.invalidateQueries({ queryKey: ['admin', 'dashboard'] });
        },
    });
};

export default {
    useAdminDashboard,
    useAdminFraudStats,
    useAdminUsers,
    useAdminBanUser,
    useAdminPendingListings,
    useAdminAllListings,
    useAdminListings,
    useAdminApproveListing,
    useAdminRejectListing,
    useAdminDeleteListing,
    useAdminUpdateListing,
    useAdminReports,
    useAdminResolveReport,
    useAdminDisputes,
    useAdminResolveDispute,
    useAdminTransactions,
    useAdminGrantSubscription,
};
