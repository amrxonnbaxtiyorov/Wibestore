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

// Allowed API domains for security (prevent MITM attacks)
const ALLOWED_API_DOMAINS = [
  'localhost',
  '127.0.0.1',
  'wibestore.net',
  'api.wibestore.net',
  'wibestore.uz',
  'api.wibestore.uz',
  'railway.app',  // Railway backend
].filter(Boolean);

/**
 * Validate API URL for security
 * Only allows predefined domains to prevent MITM attacks
 */
function validateApiUrl(url) {
  if (!url || typeof url !== 'string') return false;
  
  // Allow relative URLs (for Vite proxy in development)
  if (!url.startsWith('http')) return true;
  
  try {
    const urlObj = new URL(url);
    const hostname = urlObj.hostname.toLowerCase();
    
    // Check if hostname matches allowed domains
    return ALLOWED_API_DOMAINS.some(allowed => 
      hostname === allowed || hostname.endsWith(`.${allowed}`)
    );
  } catch {
    return false;
  }
}

/**
 * Get effective API base URL
 * SECURITY: Runtime override removed to prevent MITM attacks
 * Use environment variables only
 */
function getEffectiveBaseURL() {
  // Always use build-time configured URL
  return API_BASE_URL;
}

/**
 * Check if API URL is likely wrong (for debugging only)
 * Does NOT allow override, just logs warning
 */
export function isApiUrlLikelyWrong() {
  if (typeof window === 'undefined') return false;
  
  const base = getEffectiveBaseURL();
  
  // In production, if using relative URL on custom domain, might need absolute
  if (!base.startsWith('http') && window.location.hostname !== 'localhost') {
    console.warn('[API] Using relative API URL in production. Consider setting VITE_API_BASE_URL environment variable.');
    return true;
  }
  
  return false;
}

// Retry logic для временных ошибок (502, 503, network) — kamroq urinish, tezroq xato
const RETRYABLE_STATUSES = [502, 503, 504];
const MAX_RETRIES = 2;

const apiClient = axios.create({
  baseURL: API_BASE_URL,
  headers: {
    'Content-Type': 'application/json',
  },
  timeout: 15000, // 15 soniya (mobil foydalanuvchilar uchun optimallashtirildi)
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

// Request interceptor - добавляем токен
apiClient.interceptors.request.use(
  (config) => {
    // SECURITY: Validate API URL before each request
    if (!validateApiUrl(config.baseURL)) {
      console.error('[API] Invalid API URL detected. Request blocked for security.');
      throw new Error('Invalid API URL configuration');
    }
    
    const tokens = getTokens();

    if (tokens?.access) {
      config.headers.Authorization = `Bearer ${tokens.access}`;
    }

    // FormData (masalan avatar yuklash) uchun Content-Type o'chiriladi — brauzer multipart/form-data + boundary qo'yadi
    if (config.data instanceof FormData) {
      delete config.headers['Content-Type'];
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
      console.error('[API] Access denied:', error.response?.data);
    }

    // Обработка 500 ошибки (серверная ошибка)
    if (error.response?.status === 500) {
      console.error('[API] Server error:', error.response?.data);
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

    // 502/503/504 — foydalanuvchiga tushunarli xabar
    const status = error.response?.status;
    if (status === 502 || status === 503 || status === 504) {
      error.message = "Server vaqtincha ishlamayapti. Bir necha soniyadan keyin qayta urinib ko'ring.";
    } else if (!error.response) {
      error.message = "Internet yoki server bilan bog'lanishda xatolik. Qayta urinib ko'ring.";
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
  const client = axios.create({
    baseURL: getEffectiveBaseURL(),
    headers: {
      'Content-Type': 'application/json',
    },
    timeout: 30000,
  });
  client.interceptors.request.use((config) => {
    // SECURITY: Validate API URL
    if (!validateApiUrl(config.baseURL)) {
      console.error('[API] Invalid API URL detected. Request blocked for security.');
      throw new Error('Invalid API URL configuration');
    }
    config.baseURL = getEffectiveBaseURL();
    return config;
  }, (err) => Promise.reject(err));
  
  // 502/503/504 va tarmoq xatolari uchun tushunarli xabar
  client.interceptors.response.use(
    (res) => res,
    (err) => {
      const status = err.response?.status;
      if (status === 502 || status === 503 || status === 504) {
        err.message = "Server vaqtincha ishlamayapti. Bir necha soniyadan keyin qayta urinib ko'ring.";
      } else if (!err.response) {
        err.message = "Internet yoki server bilan bog'lanishda xatolik. Qayta urinib ko'ring.";
      }
      return Promise.reject(err);
    }
  );
  return client;
};

// Экспорт базового URL и хелперов для UI
export { API_BASE_URL, getEffectiveBaseURL };
