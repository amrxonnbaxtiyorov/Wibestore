import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import apiClient from '../lib/apiClient';

/**
 * Hook для получения отзывов listing'а
 */
export const useListingReviews = (listingId) => {
    return useQuery({
        queryKey: ['reviews', 'listing', listingId],
        queryFn: async () => {
            const { data } = await apiClient.get(`/listings/${listingId}/reviews/`);
            return data;
        },
        enabled: !!listingId,
        staleTime: 5 * 60 * 1000,
    });
};

/**
 * Hook для создания отзыва
 */
export const useCreateReview = () => {
    const queryClient = useQueryClient();

    return useMutation({
        mutationFn: async ({ escrow_id, listing_id, rating, comment }) => {
            const { data } = await apiClient.post('/reviews/', { escrow_id, rating, comment });
            return data;
        },
        onSuccess: (_data, variables) => {
            if (variables.listing_id) {
                queryClient.invalidateQueries({ queryKey: ['reviews', 'listing', variables.listing_id] });
                queryClient.invalidateQueries({ queryKey: ['listings', variables.listing_id] });
            }
            queryClient.invalidateQueries({ queryKey: ['reviews'] });
        },
    });
};

/**
 * Hook для обновления отзыва
 */
export const useUpdateReview = (reviewId) => {
    const queryClient = useQueryClient();

    return useMutation({
        mutationFn: async ({ rating, comment }) => {
            const { data } = await apiClient.put(`/reviews/${reviewId}/`, { rating, comment });
            return data;
        },
        onSuccess: () => {
            queryClient.invalidateQueries({ queryKey: ['reviews', reviewId] });
        },
    });
};

/**
 * Hook для удаления отзыва
 */
export const useDeleteReview = (reviewId) => {
    const queryClient = useQueryClient();

    return useMutation({
        mutationFn: async () => {
            await apiClient.delete(`/reviews/${reviewId}/`);
        },
        onSuccess: () => {
            queryClient.invalidateQueries({ queryKey: ['reviews', reviewId] });
        },
    });
};

/**
 * Hook для ответа на отзыв (продавец)
 */
export const useReviewResponse = () => {
    const queryClient = useQueryClient();

    return useMutation({
        mutationFn: async ({ reviewId, reply }) => {
            const { data } = await apiClient.post(`/reviews/${reviewId}/reply/`, { reply });
            return data;
        },
        onSuccess: (_data, variables) => {
            queryClient.invalidateQueries({ queryKey: ['reviews', variables.reviewId] });
        },
    });
};

/**
 * Hook для отметки отзыва как полезного
 */
export const useMarkReviewHelpful = () => {
    const queryClient = useQueryClient();

    return useMutation({
        mutationFn: async (reviewId) => {
            const { data } = await apiClient.post(`/reviews/${reviewId}/helpful/`);
            return data;
        },
        onSuccess: (_data, reviewId) => {
            queryClient.invalidateQueries({ queryKey: ['reviews', reviewId] });
        },
    });
};

export default {
    useListingReviews,
    useCreateReview,
    useUpdateReview,
    useDeleteReview,
    useReviewResponse,
    useMarkReviewHelpful,
};
