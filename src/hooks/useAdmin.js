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

// ========== BLOCK 1: Telegram Bot Analytics ==========

export function useAdminTelegramStats() {
  return useQuery({
    queryKey: ['admin-telegram-stats'],
    queryFn: () => apiClient.get('/admin-panel/telegram/stats/').then(r => r.data),
    refetchInterval: 60000,
  })
}

export function useAdminTelegramUsers(filters = {}) {
  return useQuery({
    queryKey: ['admin-telegram-users', filters],
    queryFn: () => apiClient.get('/admin-panel/telegram/users/', { params: filters }).then(r => r.data),
  })
}

export function useAdminTelegramUser(telegramId) {
  return useQuery({
    queryKey: ['admin-telegram-user', telegramId],
    queryFn: () => apiClient.get(`/admin-panel/telegram/users/${telegramId}/`).then(r => r.data),
    enabled: !!telegramId,
  })
}

export function useAdminUpdateTelegramUser() {
  const queryClient = useQueryClient()
  return useMutation({
    mutationFn: ({ telegramId, data }) => apiClient.patch(`/admin-panel/telegram/users/${telegramId}/`, data).then(r => r.data),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['admin-telegram-users'] })
      queryClient.invalidateQueries({ queryKey: ['admin-telegram-user'] })
    },
  })
}

export function useAdminRegistrationsByDate(dateFrom, dateTo) {
  return useQuery({
    queryKey: ['admin-registrations-by-date', dateFrom, dateTo],
    queryFn: () => apiClient.get('/admin-panel/telegram/registrations/by-date/', {
      params: { date_from: dateFrom, date_to: dateTo }
    }).then(r => r.data),
  })
}

export function useAdminDeposits(filters = {}) {
  return useQuery({
    queryKey: ['admin-deposits', filters],
    queryFn: () => apiClient.get('/admin-panel/deposits/', { params: filters }).then(r => r.data),
  })
}

export function useAdminDeposit(id) {
  return useQuery({
    queryKey: ['admin-deposit', id],
    queryFn: () => apiClient.get(`/admin-panel/deposits/${id}/`).then(r => r.data),
    enabled: !!id,
  })
}

export function useAdminUpdateDeposit() {
  const queryClient = useQueryClient()
  return useMutation({
    mutationFn: ({ id, data }) => apiClient.patch(`/admin-panel/deposits/${id}/`, data).then(r => r.data),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['admin-deposits'] })
      queryClient.invalidateQueries({ queryKey: ['admin-deposit-stats'] })
    },
  })
}

export function useAdminDepositStats() {
  return useQuery({
    queryKey: ['admin-deposit-stats'],
    queryFn: () => apiClient.get('/admin-panel/deposits/stats/').then(r => r.data),
    refetchInterval: 30000,
  })
}

// ========== BLOCK 5: Trade Management ==========

export function useAdminTrades(filters = {}) {
  return useQuery({
    queryKey: ['admin-trades', filters],
    queryFn: () => apiClient.get('/admin-panel/trades/', { params: filters }).then(r => r.data),
    refetchInterval: 30000,
  })
}

export function useAdminTrade(id) {
  return useQuery({
    queryKey: ['admin-trade', id],
    queryFn: () => apiClient.get(`/admin-panel/trades/${id}/`).then(r => r.data),
    enabled: !!id,
  })
}

export function useAdminTradeStats() {
  return useQuery({
    queryKey: ['admin-trade-stats'],
    queryFn: () => apiClient.get('/admin-panel/trades/stats/').then(r => r.data),
    refetchInterval: 30000,
  })
}

export function useAdminCompleteTrade() {
  const queryClient = useQueryClient()
  return useMutation({
    mutationFn: (id) => apiClient.post(`/admin-panel/trades/${id}/complete/`).then(r => r.data),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['admin-trades'] })
      queryClient.invalidateQueries({ queryKey: ['admin-trade-stats'] })
    },
  })
}

export function useAdminRefundTrade() {
  const queryClient = useQueryClient()
  return useMutation({
    mutationFn: (id) => apiClient.post(`/admin-panel/trades/${id}/refund/`).then(r => r.data),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['admin-trades'] })
      queryClient.invalidateQueries({ queryKey: ['admin-trade-stats'] })
    },
  })
}

export function useAdminResolveTradeDispute() {
  const queryClient = useQueryClient()
  return useMutation({
    mutationFn: ({ id, winner, note }) => apiClient.post(`/admin-panel/trades/${id}/resolve-dispute/`, { winner, note }).then(r => r.data),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['admin-trades'] })
    },
  })
}

// ========== BLOCK 4: Seller Verifications ==========

export function useAdminSellerVerifications(filters = {}) {
  return useQuery({
    queryKey: ['admin-seller-verifications', filters],
    queryFn: () => apiClient.get('/admin-panel/seller-verifications/', { params: filters }).then(r => r.data),
  })
}

export function useAdminApproveVerification() {
  const queryClient = useQueryClient()
  return useMutation({
    mutationFn: (id) => apiClient.post(`/admin-panel/seller-verifications/${id}/approve/`).then(r => r.data),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['admin-seller-verifications'] })
    },
  })
}

export function useAdminRejectVerification() {
  const queryClient = useQueryClient()
  return useMutation({
    mutationFn: ({ id, reason }) => apiClient.post(`/admin-panel/seller-verifications/${id}/reject/`, { reason }).then(r => r.data),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['admin-seller-verifications'] })
    },
  })
}

// ========== BLOCK 6: Withdrawal Management ==========

export function useAdminWithdrawals(filters = {}) {
  return useQuery({
    queryKey: ['admin-withdrawals', filters],
    queryFn: () => apiClient.get('/payments/withdrawals/', { params: { ...filters, admin: true } }).then(r => r.data),
    refetchInterval: 30000,
  })
}

export function useAdminApproveWithdrawal() {
  const queryClient = useQueryClient()
  return useMutation({
    mutationFn: (id) => apiClient.post(`/payments/withdrawal/${id}/approve/`).then(r => r.data),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['admin-withdrawals'] })
      queryClient.invalidateQueries({ queryKey: ['admin', 'dashboard'] })
    },
  })
}

export function useAdminRejectWithdrawal() {
  const queryClient = useQueryClient()
  return useMutation({
    mutationFn: ({ id, reason }) => apiClient.post(`/payments/withdrawal/${id}/reject/`, { reason }).then(r => r.data),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['admin-withdrawals'] })
      queryClient.invalidateQueries({ queryKey: ['admin', 'dashboard'] })
    },
  })
}

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
