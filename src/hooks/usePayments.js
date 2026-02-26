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

export default { useTransactions, useDeposit, useWithdraw };
