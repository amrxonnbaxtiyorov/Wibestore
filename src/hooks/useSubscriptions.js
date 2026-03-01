import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import apiClient from '../lib/apiClient';

/**
 * Hook для получения планов подписок
 */
export const useSubscriptionPlans = () => {
    return useQuery({
        queryKey: ['subscriptions', 'plans'],
        queryFn: async () => {
            const { data } = await apiClient.get('/subscriptions/plans/');
            return data;
        },
        staleTime: 10 * 60 * 1000, // 10 minutes
    });
};

/**
 * Hook для получения моих подписок
 */
export const useMySubscriptions = () => {
    return useQuery({
        queryKey: ['subscriptions', 'my'],
        queryFn: async () => {
            const { data } = await apiClient.get('/subscriptions/my/');
            return data;
        },
        staleTime: 5 * 60 * 1000,
    });
};

/**
 * Hook для покупки подписки
 */
export const usePurchaseSubscription = () => {
    const queryClient = useQueryClient();

    return useMutation({
        mutationFn: async (planId) => {
            const { data } = await apiClient.post('/subscriptions/purchase/', { plan_id: planId });
            return data;
        },
        onSuccess: () => {
            queryClient.invalidateQueries({ queryKey: ['subscriptions', 'my'] });
            queryClient.invalidateQueries({ queryKey: ['profile'] });
        },
    });
};

/**
 * Hook для отмены подписки
 */
export const useCancelSubscription = () => {
    const queryClient = useQueryClient();

    return useMutation({
        mutationFn: async (subscriptionId) => {
            await apiClient.post(`/subscriptions/${subscriptionId}/cancel/`);
        },
        onSuccess: () => {
            queryClient.invalidateQueries({ queryKey: ['subscriptions', 'my'] });
        },
    });
};

export default { useSubscriptionPlans, useMySubscriptions, usePurchaseSubscription, useCancelSubscription };
