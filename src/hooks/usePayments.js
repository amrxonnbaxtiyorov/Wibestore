import { useQuery, useMutation } from '@tanstack/react-query';
import apiClient from '../lib/apiClient';

/**
 * Hook для получения списка транзакций
 */
export const useTransactions = () => {
    return useQuery({
        queryKey: ['transactions'],
        queryFn: async () => {
            const { data } = await apiClient.get('/payments/transactions/');
            return data;
        },
        staleTime: 1 * 60 * 1000,
    });
};

/**
 * Hook для создания депозита
 */
export const useDeposit = () => {
    return useMutation({
        mutationFn: async ({ amount, method }) => {
            const { data } = await apiClient.post('/payments/deposit/', {
                amount,
                payment_method: method,
            });
            return data;
        },
    });
};

/**
 * Hook для создания вывода средств
 */
export const useWithdraw = () => {
    return useMutation({
        mutationFn: async ({ amount, method }) => {
            const { data } = await apiClient.post('/payments/withdraw/', {
                amount,
                payment_method: method,
            });
            return data;
        },
    });
};

/**
 * Hook для xarid (listingni balance orqali sotib olish — escrow).
 * Muvaffaqiyatda data.chat_room_id qaytadi — shu chat ochiladi.
 */
export const usePurchaseListing = () => {
    return useMutation({
        mutationFn: async ({ listing_id }) => {
            const { data } = await apiClient.post('/payments/purchase/', {
                listing_id,
                payment_method: 'balance',
            });
            return data;
        },
    });
};

/**
 * Savdo tasdiqlash (sotuvchi/haridor)
 */
export const useConfirmTrade = () => {
    return useMutation({
        mutationFn: async ({ escrowId, userType }) => {
            const { data } = await apiClient.post(`/payments/escrow/${escrowId}/${userType}-confirm-trade/`);
            return data;
        },
    });
};

/**
 * Savdo bekor qilish (sotuvchi/haridor)
 */
export const useCancelTrade = () => {
    return useMutation({
        mutationFn: async ({ escrowId, userType, reason }) => {
            const { data } = await apiClient.post(`/payments/escrow/${escrowId}/${userType}-cancel/`, { reason });
            return data;
        },
    });
};

/**
 * Savdo holati (polling bilan)
 */
export const useTradeStatus = (escrowId) => {
    return useQuery({
        queryKey: ['trade-status', escrowId],
        queryFn: async () => {
            const { data } = await apiClient.get(`/payments/escrow/${escrowId}/trade-status/`);
            return data;
        },
        refetchInterval: 10000,
        enabled: !!escrowId,
    });
};

/**
 * Pul yechish so'rovi yaratish
 */
export const useCreateWithdrawal = () => {
    return useMutation({
        mutationFn: async (withdrawalData) => {
            const { data } = await apiClient.post('/payments/withdrawal/create/', withdrawalData);
            return data;
        },
    });
};

/**
 * Pul yechish tarixi
 */
export const useWithdrawals = (params) => {
    return useQuery({
        queryKey: ['withdrawals', params],
        queryFn: async () => {
            const { data } = await apiClient.get('/payments/withdrawals/', { params });
            return data;
        },
        staleTime: 1 * 60 * 1000,
    });
};

export default {
    useTransactions, useDeposit, useWithdraw, usePurchaseListing,
    useConfirmTrade, useCancelTrade, useTradeStatus,
    useCreateWithdrawal, useWithdrawals,
};
