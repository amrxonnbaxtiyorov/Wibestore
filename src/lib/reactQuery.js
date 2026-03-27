import { QueryClient, MutationCache, QueryCache } from '@tanstack/react-query';
import uz from '../locales/uz.json';
import en from '../locales/en.json';
import ru from '../locales/ru.json';

const LOCALES = { uz, en, ru };

/** Tarjima kalitini joriy tilga o'giradi (toast va ErrorBoundary uchun) */
function t(key) {
  const lang = (typeof window !== 'undefined' && localStorage.getItem('wibeLanguage')) || 'uz';
  const resolve = (locale) => {
    const parts = key.split('.');
    let v = LOCALES[locale];
    for (const p of parts) v = v?.[p];
    return typeof v === 'string' ? v : undefined;
  };
  return resolve(lang) ?? resolve('uz') ?? resolve('en') ?? key;
}

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
const globalErrorHandler = (error, query) => {
  // Skip toast for silent queries (background polling like chats)
  if (query?.meta?.silent) return;
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

  // Показываем toast для критических ошибок (i18n)
  if (error.response?.status === 500) {
    window.dispatchEvent(new CustomEvent('wibe-toast', {
      detail: {
        type: 'error',
        title: t('common.server_error_title'),
        message: t('common.server_error_message'),
      },
    }));
  }

  // So'rov backend'ga yetmadi (URL noto'g'ri, backend ishlamayapti, tarmoq yoki CORS)
  if (!error.response) {
    const apiBase = import.meta.env.VITE_API_BASE_URL || '/api/v1';
    console.warn('[WibeStore] Bog\'lanish xatosi. Hozir ishlatilayotgan API:', apiBase, '| Backend ishlayaptimi va CORS (Backend CORS_ALLOWED_ORIGINS da frontend URL bormi?) tekshiring.');
    window.dispatchEvent(new CustomEvent('wibe-toast', {
      detail: {
        type: 'error',
        title: t('common.connection_error_title'),
        message: t('common.connection_error_message'),
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
