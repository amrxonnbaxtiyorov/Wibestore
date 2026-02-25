import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import apiClient from '../lib/apiClient';

/**
 * Hook для получения списка жалоб (admin)
 */
export const useReports = () => {
    return useQuery({
        queryKey: ['reports'],
        queryFn: async () => {
            const { data } = await apiClient.get('/reports/my/');
            return data;
        },
        staleTime: 1 * 60 * 1000,
    });
};

/**
 * Hook для создания жалобы
 */
export const useCreateReport = () => {
    const queryClient = useQueryClient();

    return useMutation({
        mutationFn: async ({ reported_user_id, reported_listing_id, reason, description }) => {
            const { data } = await apiClient.post('/reports/', {
                reported_user_id,
                reported_listing_id,
                reason,
                description,
            });
            return data;
        },
        onSuccess: () => {
            queryClient.invalidateQueries(['reports']);
        },
    });
};

/**
 * Hook для обновления статуса жалобы (admin)
 */
export const useUpdateReport = (reportId) => {
    const queryClient = useQueryClient();

    return useMutation({
        mutationFn: async ({ status, resolution }) => {
            const { data } = await apiClient.patch(`/reports/${reportId}/`, { status, resolution });
            return data;
        },
        onSuccess: () => {
            queryClient.invalidateQueries(['reports', reportId]);
            queryClient.invalidateQueries(['reports']);
        },
    });
};

export default { useReports, useCreateReport, useUpdateReport };
