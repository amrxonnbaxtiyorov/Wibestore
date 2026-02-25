import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import apiClient from '../lib/apiClient';

/**
 * Hook для получения списка уведомлений
 */
export const useNotifications = () => {
    return useQuery({
        queryKey: ['notifications'],
        queryFn: async () => {
            const { data } = await apiClient.get('/notifications/');
            return data;
        },
        staleTime: 30 * 1000, // 30 seconds
        refetchInterval: 15 * 1000, // Refetch every 15 seconds
    });
};

/**
 * Hook для отметки уведомления как прочитанного
 */
export const useMarkNotificationRead = () => {
    const queryClient = useQueryClient();

    return useMutation({
        mutationFn: async (notificationId) => {
            const { data } = await apiClient.post(`/notifications/${notificationId}/read/`);
            return data;
        },
        onSuccess: () => {
            queryClient.invalidateQueries(['notifications']);
        },
    });
};

/**
 * Hook для отметки всех уведомлений как прочитанных
 */
export const useMarkAllNotificationsRead = () => {
    const queryClient = useQueryClient();

    return useMutation({
        mutationFn: async () => {
            await apiClient.post('/notifications/read-all/');
        },
        onSuccess: () => {
            queryClient.invalidateQueries(['notifications']);
        },
    });
};

export default { useNotifications, useMarkNotificationRead, useMarkAllNotificationsRead };
