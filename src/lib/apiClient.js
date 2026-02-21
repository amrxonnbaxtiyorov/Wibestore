import axios from 'axios';

/**
 * WibeStore API Client
 * Централизованный клиент для всех API запросов
 * 
 * Features:
 * - Автоматическое добавление JWT токена
 * - Refresh токена при 401 ошибке
 * - Global error handling
 * - Request/response интерцепторы
 * - Retry logic для временных ошибок
 */

// Базовый URL из environment variables (relative для proxy в dev)
const API_BASE_URL = import.meta.env.VITE_API_BASE_URL || '/api/v1';

// Retry logic для временных ошибок (502, 503, network)
const RETRYABLE_STATUSES = [502, 503, 504];
const MAX_RETRIES = 3;

const apiClient = axios.create({
  baseURL: API_BASE_URL,
  headers: {
    'Content-Type': 'application/json',
  },
  timeout: 30000, // 30 секунд
});

// Флаг для предотвращения множественных refresh запросов
let isRefreshing = false;
// Очередь запросов, ожидающих refresh
let refreshSubscribers = [];

// Добавление подписчика на refresh
const subscribeTokenRefresh = (resolve, reject) => {
  refreshSubscribers.push({ resolve, reject });
};

// Выполнение всех ожидающих запросов после refresh
const onTokenRefreshed = (newToken) => {
  refreshSubscribers.forEach(({ resolve }) => {
    resolve(newToken);
  });
  refreshSubscribers = [];
};

// Ошибка refresh для всех ожидающих запросов
const onRefreshFailed = (error) => {
  refreshSubscribers.forEach(({ reject }) => {
    reject(error);
  });
  refreshSubscribers = [];
};

// Получение токенов из localStorage
const getTokens = () => {
  try {
    const tokens = localStorage.getItem('wibeTokens');
    return tokens ? JSON.parse(tokens) : null;
  } catch {
    return null;
  }
};

// Сохранение токенов в localStorage
const saveTokens = (tokens) => {
  try {
    localStorage.setItem('wibeTokens', JSON.stringify(tokens));
  } catch (error) {
    console.error('[API] Failed to save tokens:', error);
  }
};

// Очистка токенов и logout
const clearTokensAndLogout = () => {
  localStorage.removeItem('wibeTokens');
  localStorage.removeItem('wibeUser');
  
  // Dispatch custom event for auth context
  window.dispatchEvent(new CustomEvent('wibe-logout'));
  
  // Redirect to login
  if (!window.location.pathname.includes('/login')) {
    window.location.href = '/login?redirect=' + encodeURIComponent(window.location.pathname);
  }
};

// Request interceptor - добавляем токен к запросам
apiClient.interceptors.request.use(
  (config) => {
    const tokens = getTokens();
    
    if (tokens?.access) {
      config.headers.Authorization = `Bearer ${tokens.access}`;
    }
    
    return config;
  },
  (error) => {
    return Promise.reject(error);
  }
);

// Response interceptor - обрабатываем ошибки и refresh токена
apiClient.interceptors.response.use(
  (response) => response,
  async (error) => {
    const originalRequest = error.config;

    // Если ошибка 401 и запрос еще не был повторен
    if (error.response?.status === 401 && !originalRequest._retry) {
      // Если уже идет refresh, добавляем запрос в очередь
      if (isRefreshing) {
        originalRequest._retry = true;
        
        return new Promise((resolve, reject) => {
          subscribeTokenRefresh((newToken) => {
            originalRequest.headers.Authorization = `Bearer ${newToken}`;
            resolve(apiClient(originalRequest));
          }, reject);
        });
      }

      originalRequest._retry = true;
      isRefreshing = true;

      const tokens = getTokens();
      
      if (!tokens?.refresh) {
        clearTokensAndLogout();
        return Promise.reject(error);
      }

      try {
        // Пытаемся refreshнуть токен
        const response = await axios.post(`${API_BASE_URL}/auth/refresh/`, {
          refresh: tokens.refresh,
        });

        const { access, refresh: newRefresh } = response.data;
        const refresh = newRefresh ?? tokens.refresh;

        saveTokens({ access, refresh });
        
        // Уведомляем ожидающие запросы
        onTokenRefreshed(access);
        
        // Повторяем оригинальный запрос с новым токеном
        originalRequest.headers.Authorization = `Bearer ${access}`;
        return apiClient(originalRequest);
      } catch (refreshError) {
        // Refresh не удался - logout
        onRefreshFailed(refreshError);
        clearTokensAndLogout();
        return Promise.reject(refreshError);
      } finally {
        isRefreshing = false;
      }
    }

    // Обработка 403 ошибки (нет доступа)
    if (error.response?.status === 403) {
      console.error('[API] Access denied:', error.response.data);
    }

    // Обработка 500 ошибки (серверная ошибка)
    if (error.response?.status === 500) {
      console.error('[API] Server error:', error.response.data);
    }

    // Обработка network ошибок
    if (!error.response) {
      console.error('[API] Network error:', error.message);
    }

    // Retry для временных ошибок (502, 503, 504, network)
    const retryCount = originalRequest._retryCount ?? 0;
    const shouldRetry =
      retryCount < MAX_RETRIES &&
      (RETRYABLE_STATUSES.includes(error.response?.status) || !error.response);
    if (shouldRetry) {
      originalRequest._retryCount = retryCount + 1;
      const delay = Math.min(1000 * 2 ** retryCount, 10000);
      return new Promise((resolve) => {
        setTimeout(() => resolve(apiClient(originalRequest)), delay);
      });
    }

    return Promise.reject(error);
  }
);

// Экспорт базового клиента и хелперов
export default apiClient;

// Хелперы для работы с токенами
export const setTokens = saveTokens;
export const getStoredTokens = getTokens;
export const removeTokens = () => {
  localStorage.removeItem('wibeTokens');
};

// Хелпер для получения публичного клиента (без авторизации)
export const createPublicClient = () => {
  return axios.create({
    baseURL: API_BASE_URL,
    headers: {
      'Content-Type': 'application/json',
    },
    timeout: 30000,
  });
};

// Экспорт базового URL
export { API_BASE_URL };
