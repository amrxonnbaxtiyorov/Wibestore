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
 * Normalize listing detail response — backend ba'zan { data } yoki { listing } qaytarishi mumkin
 */
function normalizeListingResponse(data) {
    if (data == null) return null;
    if (typeof data === 'object' && !Array.isArray(data) && (data.data != null || data.listing != null)) {
        return data.data ?? data.listing ?? null;
    }
    return data;
}

/**
 * Hook для получения конкретного listing'а по ID
 */
export const useListing = (id) => {
    return useQuery({
        queryKey: ['listings', id],
        queryFn: async () => {
            const res = await apiClient.get(`/listings/${id}/`);
            const body = res?.data;
            return normalizeListingResponse(body);
        },
        enabled: !!id,
        staleTime: 2 * 60 * 1000,
        gcTime: 10 * 60 * 1000,
        retry: (failureCount, err) => {
            // 404 yoki 403 da qayta urinmaslik
            const status = err?.response?.status;
            if (status === 404 || status === 403) return false;
            return failureCount < 2;
        },
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
            queryClient.invalidateQueries({ queryKey: ['listings'] });
            queryClient.invalidateQueries({ queryKey: ['profile', 'listings'] });
            queryClient.invalidateQueries({ queryKey: ['admin', 'listings'] });
            queryClient.invalidateQueries({ queryKey: ['admin', 'dashboard'] });
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
            queryClient.invalidateQueries({ queryKey: ['listings', id] });
            queryClient.invalidateQueries({ queryKey: ['listings'] });
            queryClient.invalidateQueries({ queryKey: ['profile', 'listings'] });
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
        onSuccess: (_data, listingId) => {
            queryClient.invalidateQueries({ queryKey: ['listings', listingId] });
            queryClient.invalidateQueries({ queryKey: ['listings'] });
            queryClient.invalidateQueries({ queryKey: ['profile', 'listings'] });
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
        onSuccess: (_data, listingId) => {
            queryClient.invalidateQueries({ queryKey: ['listings', listingId] });
            queryClient.invalidateQueries({ queryKey: ['profile', 'favorites'] });
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
        onSuccess: (_data, listingId) => {
            queryClient.invalidateQueries({ queryKey: ['listings', listingId] });
            queryClient.invalidateQueries({ queryKey: ['profile', 'favorites'] });
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
        onSuccess: (_data, listingId) => {
            queryClient.invalidateQueries({ queryKey: ['listings', listingId] });
        },
    });
};

/**
 * Video yuklash uchun Telegram deep link olish
 */
export const useRequestVideoUpload = () => {
    return useMutation({
        mutationFn: async (listingId) => {
            const { data } = await apiClient.post(`/listings/${listingId}/video-upload/`);
            return data;
        },
    });
};

/**
 * Video holati (yuklangan yoki yo'q)
 */
export const useVideoStatus = (listingId) => {
    return useQuery({
        queryKey: ['video-status', listingId],
        queryFn: async () => {
            const { data } = await apiClient.get(`/listings/${listingId}/video-upload/`);
            return data;
        },
        enabled: !!listingId,
        refetchInterval: 5000, // Poll every 5s while on page
    });
};

/**
 * Video ko'rish uchun Telegram deep link olish
 */
export const useRequestVideoView = () => {
    return useMutation({
        mutationFn: async (listingId) => {
            const { data } = await apiClient.post(`/listings/${listingId}/video-view/`);
            return data;
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
    useApplyPromo,
    useRequestVideoUpload,
    useVideoStatus,
    useRequestVideoView,
};
