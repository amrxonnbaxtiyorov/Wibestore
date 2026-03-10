import { useQuery, useMutation, useQueryClient, useInfiniteQuery } from '@tanstack/react-query';
import apiClient from '../lib/apiClient';

/**
 * Hook для получения списка чатов пользователя
 */
export const useChats = () => {
    return useQuery({
        queryKey: ['chats'],
        queryFn: async () => {
            const { data } = await apiClient.get('/chats/');
            return data;
        },
        staleTime: 1 * 60 * 1000, // 1 minute
        refetchInterval: 30 * 1000, // Refetch every 30 seconds
    });
};

/**
 * Hook для получения конкретного чата
 */
export const useChat = (chatId) => {
    return useQuery({
        queryKey: ['chats', chatId],
        queryFn: async () => {
            const { data } = await apiClient.get(`/chats/${chatId}/`);
            return data;
        },
        enabled: !!chatId,
        staleTime: 1 * 60 * 1000,
    });
};

/**
 * Hook для получения сообщений чата
 */
export const useChatMessages = (chatId) => {
    return useInfiniteQuery({
        queryKey: ['chats', chatId, 'messages'],
        queryFn: async ({ pageParam = 1 }) => {
            const { data } = await apiClient.get(`/chats/${chatId}/messages/?page=${pageParam}`);
            return data;
        },
        enabled: !!chatId,
        initialPageParam: 1,
        getNextPageParam: (lastPage) => {
            if (lastPage?.next) {
                try {
                    const url = new URL(lastPage.next);
                    return url.searchParams.get('page') || undefined;
                } catch {
                    return undefined;
                }
            }
            return undefined;
        },
        staleTime: 2 * 1000, // chat: tez-tez yangilanadi
        refetchInterval: 2 * 1000, // saytni yangilamasdan ham xabarlar kelsin (polling)
        refetchOnWindowFocus: true,
        gcTime: 24 * 60 * 60 * 1000, // 24h cache (yozishmalar yo'qolib ketmasin)
    });
};

/**
 * Hook для создания нового чата
 */
export const useCreateChat = () => {
    const queryClient = useQueryClient();

    return useMutation({
        mutationFn: async ({ participantId, listingId, initialMessage } = {}) => {
            const payload = {
                participant_id: participantId,
            };
            if (listingId) payload.listing_id = listingId;
            if (initialMessage) payload.initial_message = initialMessage;

            const { data } = await apiClient.post('/chats/create/', payload);
            return data;
        },
        onSuccess: () => {
            queryClient.invalidateQueries({ queryKey: ['chats'] });
        },
    });
};

/**
 * Hook для отправки сообщения (backend: POST /chats/:roomId/send/ body: { content })
 */
export const useSendMessage = (chatId) => {
    const queryClient = useQueryClient();

    return useMutation({
        mutationFn: async (text) => {
            const { data } = await apiClient.post(`/chats/${chatId}/send/`, { content: text });
            return data;
        },
        onMutate: async (text) => {
            // Optimistic UI: darhol xabarni listga qo'shamiz
            await queryClient.cancelQueries({ queryKey: ['chats', chatId, 'messages'] });
            const previous = queryClient.getQueryData(['chats', chatId, 'messages']);

            let currentUser = null;
            try {
                currentUser = JSON.parse(localStorage.getItem('wibeUser') || 'null');
            } catch {
                currentUser = null;
            }

            const optimisticMessage = {
                id: `optimistic-${Date.now()}`,
                content: String(text ?? '').trim(),
                created_at: new Date().toISOString(),
                sender: currentUser ? {
                    id: currentUser.id,
                    display_name: currentUser.display_name || currentUser.name || currentUser.email,
                } : null,
                is_read: true,
            };

            queryClient.setQueryData(['chats', chatId, 'messages'], (old) => {
                if (!old) return old;
                if (!old.pages || old.pages.length === 0) return old;

                const lastIdx = old.pages.length - 1;
                const lastPage = old.pages[lastIdx];
                const currentResults = Array.isArray(lastPage?.results)
                    ? lastPage.results
                    : (Array.isArray(lastPage) ? lastPage : []);

                const nextLastPage = Array.isArray(lastPage)
                    ? [...currentResults, optimisticMessage]
                    : { ...lastPage, results: [...currentResults, optimisticMessage] };

                return {
                    ...old,
                    pages: [...old.pages.slice(0, lastIdx), nextLastPage],
                };
            });

            return { previous, optimisticId: optimisticMessage.id };
        },
        onError: (_err, _text, ctx) => {
            if (ctx?.previous) {
                queryClient.setQueryData(['chats', chatId, 'messages'], ctx.previous);
            }
        },
        onSuccess: (res, _text, ctx) => {
            // Optimistic message'ni backend qaytargan message bilan almashtiramiz
            const realMessage = res?.data ?? null;
            if (realMessage && ctx?.optimisticId) {
                queryClient.setQueryData(['chats', chatId, 'messages'], (old) => {
                    if (!old?.pages?.length) return old;
                    const pages = old.pages.map((p) => {
                        const arr = Array.isArray(p?.results) ? p.results : (Array.isArray(p) ? p : null);
                        if (!arr) return p;
                        const replaced = arr.map((m) => (m?.id === ctx.optimisticId ? realMessage : m));
                        return Array.isArray(p) ? replaced : { ...p, results: replaced };
                    });
                    return { ...old, pages };
                });
            }
            queryClient.invalidateQueries({ queryKey: ['chats'] });
        },
        onSettled: () => {
            queryClient.invalidateQueries({ queryKey: ['chats', chatId, 'messages'] });
        },
    });
};

export default {
    useChats,
    useChat,
    useChatMessages,
    useCreateChat,
    useSendMessage,
};
