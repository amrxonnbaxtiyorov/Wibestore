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
            queryClient.invalidateQueries(['admin', 'users']);
            queryClient.invalidateQueries(['admin', 'dashboard']);
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
            return data?.results ?? data;
        },
        staleTime: 1 * 60 * 1000,
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
            queryClient.invalidateQueries(['admin', 'listings']);
            queryClient.invalidateQueries(['listings', listingId]);
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
            queryClient.invalidateQueries(['admin', 'listings']);
            queryClient.invalidateQueries(['listings', listingId]);
        },
    });
};

/**
 * Hook для получения списка listing'ов (admin) — alias для pending
 */
export const useAdminListings = (filters = {}) => {
    return useAdminPendingListings();
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
            queryClient.invalidateQueries(['admin', 'reports']);
            queryClient.invalidateQueries(['admin', 'dashboard']);
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
            queryClient.invalidateQueries(['admin', 'disputes']);
            queryClient.invalidateQueries(['admin', 'dashboard']);
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

export default {
    useAdminDashboard,
    useAdminUsers,
    useAdminBanUser,
    useAdminPendingListings,
    useAdminListings,
    useAdminApproveListing,
    useAdminRejectListing,
    useAdminUpdateListing,
    useAdminReports,
    useAdminResolveReport,
    useAdminDisputes,
    useAdminResolveDispute,
    useAdminTransactions,
};
