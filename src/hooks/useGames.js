import { useQuery, useInfiniteQuery } from '@tanstack/react-query';
import apiClient from '../lib/apiClient';

/**
 * Hook для получения списка игр
 */
export const useGames = () => {
    return useQuery({
        queryKey: ['games'],
        queryFn: async () => {
            const { data } = await apiClient.get('/games/');
            return data;
        },
        staleTime: 10 * 60 * 1000, // 10 minutes
    });
};

/**
 * Hook для получения конкретной игры по slug
 */
export const useGame = (slug) => {
    return useQuery({
        queryKey: ['games', slug],
        queryFn: async () => {
            const { data } = await apiClient.get(`/games/${slug}/`);
            return data;
        },
        enabled: !!slug,
        staleTime: 5 * 60 * 1000, // 5 minutes
    });
};

/**
 * Hook для получения списка listing'ов игры
 */
export const useGameListings = (slug, filters = {}) => {
    return useInfiniteQuery({
        queryKey: ['games', slug, 'listings', filters],
        queryFn: async ({ pageParam = 1 }) => {
            const params = new URLSearchParams({ page: String(pageParam), ...filters });
            const { data } = await apiClient.get(`/games/${slug}/listings/?${params}`);
            return data;
        },
        enabled: !!slug,
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
        staleTime: 2 * 60 * 1000, // 2 minutes
    });
};

export default { useGames, useGame, useGameListings };
