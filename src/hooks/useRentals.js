import { useQuery, useMutation, useQueryClient, useInfiniteQuery } from '@tanstack/react-query';
import apiClient from '../lib/apiClient';

/**
 * Browse rental listings with optional game filter
 */
export const useRentalListings = (filters = {}) => {
    const safeFilters = {};
    for (const [k, v] of Object.entries(filters)) {
        if (v !== undefined && v !== null && v !== '') safeFilters[k] = v;
    }

    return useInfiniteQuery({
        queryKey: ['rental-listings', safeFilters],
        queryFn: async ({ pageParam = 1 }) => {
            const params = new URLSearchParams({ page: String(pageParam), ...safeFilters });
            const { data } = await apiClient.get(`/listings/rentals/?${params}`);
            return data;
        },
        initialPageParam: 1,
        getNextPageParam: (lastPage) => {
            if (lastPage?.next) {
                try {
                    const url = new URL(lastPage.next);
                    return Number(url.searchParams.get('page')) || undefined;
                } catch { return undefined; }
            }
            return undefined;
        },
        staleTime: 2 * 60 * 1000,
    });
};

/**
 * Calculate promotion cost for given hours
 */
export const usePromotionCalculate = (hours) => {
    return useQuery({
        queryKey: ['promotion-calculate', hours],
        queryFn: async () => {
            const { data } = await apiClient.get(`/listings/rentals/promotion/calculate/?hours=${hours}`);
            return data;
        },
        enabled: !!hours && hours > 0,
        staleTime: 60 * 1000,
    });
};

/**
 * Create a promotion (deduct balance)
 */
export const useCreatePromotion = () => {
    const queryClient = useQueryClient();

    return useMutation({
        mutationFn: async ({ listing_id, hours }) => {
            const { data } = await apiClient.post('/listings/rentals/promotion/create/', {
                listing_id, hours,
            });
            return data;
        },
        onSuccess: () => {
            queryClient.invalidateQueries({ queryKey: ['rental-listings'] });
            queryClient.invalidateQueries({ queryKey: ['profile'] });
            queryClient.invalidateQueries({ queryKey: ['my-promotions'] });
        },
    });
};

/**
 * Get user's active promotions
 */
export const useMyPromotions = () => {
    return useQuery({
        queryKey: ['my-promotions'],
        queryFn: async () => {
            const { data } = await apiClient.get('/listings/rentals/my-promotions/');
            return data;
        },
        staleTime: 60 * 1000,
    });
};
