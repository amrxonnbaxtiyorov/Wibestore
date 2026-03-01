import { QueryClient, MutationCache, QueryCache } from '@tanstack/react-query';

/**
 * Настройка React Query Client
 * 
 * Global configuration для всех запросов:
 * - Retry logic с экспоненциальной задержкой
 * - Stale time настройки
 * - Cache time настройки
 * - Global error handler via QueryCache/MutationCache (React Query v5 compatible)
 */

// Глобальный обработчик ошибок
const globalErrorHandler = (error) => {
  console.error('[React Query] Global error:', error);

  // Логирование в Sentry (если настроен)
  if (import.meta.env.VITE_SENTRY_DSN) {
    try {
      if (typeof window !== 'undefined' && window.Sentry) {
        window.Sentry.captureException(error);
      }
    } catch {
      // Sentry may be unavailable; ignore
    }
  }

  // Показываем toast для критических ошибок
  if (error.response?.status === 500) {
    window.dispatchEvent(new CustomEvent('wibe-toast', {
      detail: {
        type: 'error',
        title: 'Server xatosi',
        message: "Server xatolik yuz berdi. Keyinroq qayta urinib ko'ring.",
      },
    }));
  }

  if (!error.response && !error.message?.includes('Network Error')) {
    window.dispatchEvent(new CustomEvent('wibe-toast', {
      detail: {
        type: 'error',
        title: "Bog'lanish xatosi",
        message: "Internet yoki server bilan bog'lanishda xatolik. Qayta urinib ko'ring.",
      },
    }));
  }
};

// Создаем QueryClient с настройками
// React Query v5: onError moved to QueryCache/MutationCache
const queryClient = new QueryClient({
  queryCache: new QueryCache({
    onError: globalErrorHandler,
  }),
  mutationCache: new MutationCache({
    onError: globalErrorHandler,
  }),
  defaultOptions: {
    queries: {
      // Retry logic: 3 попытки для временных ошибок
      retry: (failureCount, error) => {
        // Не retry при 401/403
        if ([401, 403].includes(error.response?.status)) {
          return false;
        }

        // Не retry при 404
        if (error.response?.status === 404) {
          return false;
        }

        // Максимум 3 попытки
        return failureCount < 3;
      },

      // Экспоненциальная задержка между retry
      retryDelay: (attemptIndex) => {
        return Math.min(1000 * 2 ** attemptIndex, 30000);
      },

      // Данные считаются устаревшими через 5 минут
      staleTime: 5 * 60 * 1000,

      // Кэш хранится 30 минут
      gcTime: 30 * 60 * 1000,

      // Не refetch при mount по умолчанию
      refetchOnMount: false,

      // Refetch при reconnect
      refetchOnReconnect: true,

      // Refetch при window focus (для свежих данных)
      refetchOnWindowFocus: false,
    },

    mutations: {
      // Retry для мутаций: только для временных ошибок
      retry: (failureCount, error) => {
        if ([400, 401, 403, 404].includes(error.response?.status)) {
          return false;
        }
        return failureCount < 2;
      },

      retryDelay: (attemptIndex) => {
        return Math.min(1000 * 2 ** attemptIndex, 10000);
      },
    },
  },
});

export default queryClient;
