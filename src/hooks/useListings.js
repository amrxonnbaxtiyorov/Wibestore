import { useQuery, useMutation, useQueryClient, useInfiniteQuery } from '@tanstack/react-query';
import apiClient from '../lib/apiClient';

/** Filterdan faqat aniq qiymatlar qoldiradi (URL va cache uchun, "undefined" yuborilmaydi) */
function cleanFilters(filters) {
    const out = {};
    for (const [k, v] of Object.entries(filters || {})) {
        if (v === undefined || v === null) continue;
        if (typeof v === 'string' && v.trim() === '') continue;
        out[k] = v;
    }
    return out;
}

/**
 * Hook для получения списка listing'ов с фильтрами
 */
export const useListings = (filters = {}) => {
    const safeFilters = cleanFilters(filters);
    return useInfiniteQuery({
        queryKey: ['listings', safeFilters],
        queryFn: async ({ pageParam = 1 }) => {
            const limit = safeFilters.limit ?? 24;
            const rest = { ...safeFilters };
            delete rest.limit;
            const params = new URLSearchParams({ page: String(pageParam), limit: String(limit), ...rest });
            const { data } = await apiClient.get(`/listings/?${params}`);
            return data;
        },
        initialPageParam: 1,
        getNextPageParam: (lastPage) => {
            if (lastPage?.next) {
                try {
                    const url = new URL(lastPage.next);
                    const page = url.searchParams.get('page');
                    return page ? Number(page) : undefined;
                } catch {
                    return undefined;
                }
            }
            return undefined;
        },
        staleTime: 3 * 60 * 1000, // 3 daqiqa — tez qayta ko'rsatish
        gcTime: 10 * 60 * 1000, // 10 daqiqa cache
        retry: 2,
        retryDelay: (attemptIndex) => Math.min(1000 * 2 ** attemptIndex, 5000),
    });
};

/**
 * Compare listings by IDs (max 4)
 */
export const useCompareListings = (ids = []) => {
    const idList = Array.isArray(ids) ? ids.filter(Boolean).slice(0, 4) : [];
    return useQuery({
        queryKey: ['listings', 'compare', idList.join(',')],
        queryFn: async () => {
            const { data } = await apiClient.get(`/listings/compare/?ids=${idList.join(',')}`);
            return data;
        },
        enabled: idList.length > 0,
        staleTime: 2 * 60 * 1000,
    });
};

/**
 * Apply promo code (returns discount, final_amount)
 */
export const useApplyPromo = () => {
    return useMutation({
        mutationFn: async ({ code, amount, listing_id }) => {
            const { data } = await apiClient.post('/listings/promo/apply/', {
                code: code?.trim?.()?.toUpperCase?.() || code,
                ...(amount != null && { amount }),
                ...(listing_id && { listing_id }),
            });
            return data;
        },
    });
};

/**
 * Hook для получения конкретного listing'а по ID
 */
export const useListing = (id) => {
    return useQuery({
        queryKey: ['listings', id],
        queryFn: async () => {
            const { data } = await apiClient.get(`/listings/${id}/`);
            return data;
        },
        enabled: !!id,
        staleTime: 2 * 60 * 1000,
        gcTime: 10 * 60 * 1000,
        retry: 2,
        retryDelay: (attemptIndex) => Math.min(1000 * 2 ** attemptIndex, 5000),
    });
};

/**
 * Hook для создания listing'а
 */
export const useCreateListing = () => {
    const queryClient = useQueryClient();

    return useMutation({
        mutationFn: async (listingData) => {
            const { data } = await apiClient.post('/listings/', listingData);
            return data;
        },
        onSuccess: () => {
            // Инвалидация кэша listings и профиля
            queryClient.invalidateQueries(['listings']);
            queryClient.invalidateQueries(['profile', 'listings']);
        },
    });
};

/**
 * Hook для обновления listing'а
 */
export const useUpdateListing = (id) => {
    const queryClient = useQueryClient();

    return useMutation({
        mutationFn: async (updates) => {
            const { data } = await apiClient.patch(`/listings/${id}/`, updates);
            return data;
        },
        onSuccess: () => {
            queryClient.invalidateQueries(['listings', id]);
            queryClient.invalidateQueries(['listings']);
            queryClient.invalidateQueries(['profile', 'listings']);
        },
    });
};

/**
 * Hook для удаления listing'а
 */
export const useDeleteListing = () => {
    const queryClient = useQueryClient();

    return useMutation({
        mutationFn: async (listingId) => {
            await apiClient.delete(`/listings/${listingId}/`);
        },
        onSuccess: (data, listingId) => {
            queryClient.invalidateQueries(['listings', listingId]);
            queryClient.invalidateQueries(['listings']);
            queryClient.invalidateQueries(['profile', 'listings']);
        },
    });
};

/**
 * Hook для добавления в избранное
 */
export const useAddToFavorites = () => {
    const queryClient = useQueryClient();

    return useMutation({
        mutationFn: async (listingId) => {
            const { data } = await apiClient.post(`/listings/${listingId}/favorite/`);
            return data;
        },
        onSuccess: (data, listingId) => {
            // Оптимистичное обновление
            queryClient.invalidateQueries(['listings', listingId]);
            queryClient.invalidateQueries(['profile', 'favorites']);
        },
    });
};

/**
 * Hook для удаления из избранного
 */
export const useRemoveFromFavorites = () => {
    const queryClient = useQueryClient();

    return useMutation({
        mutationFn: async (listingId) => {
            await apiClient.delete(`/listings/${listingId}/favorite/`);
        },
        onSuccess: (data, listingId) => {
            queryClient.invalidateQueries(['listings', listingId]);
            queryClient.invalidateQueries(['profile', 'favorites']);
        },
    });
};

/**
 * Hook для регистрации просмотра listing'а
 */
export const useTrackView = () => {
    const queryClient = useQueryClient();

    return useMutation({
        mutationFn: async (listingId) => {
            await apiClient.post(`/listings/${listingId}/view/`);
        },
        onSuccess: (data, listingId) => {
            queryClient.invalidateQueries(['listings', listingId]);
        },
    });
};

export default {
    useListings,
    useListing,
    useCreateListing,
    useUpdateListing,
    useDeleteListing,
    useAddToFavorites,
    useRemoveFromFavorites,
    useTrackView,
    useCompareListings,
    useApplyPromo,
};
