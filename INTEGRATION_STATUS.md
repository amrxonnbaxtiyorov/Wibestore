# WibeStore — статус интеграции (по INTEGRATION_PROMPT.md)

Краткий отчёт о выполненных задачах интеграции Frontend + Backend.

---

## Выполнено

### 1. API и авторизация
- **API Client** (`src/lib/apiClient.js`): базовый URL из env (`VITE_API_BASE_URL`), относительный `/api/v1` по умолчанию для proxy; JWT в заголовках; refresh при 401; retry при 502/503/504 и сетевых ошибках (до 3 попыток с экспоненциальной задержкой); глобальная обработка ошибок в интерцепторах.
- **Авторизация**: хранение токенов (localStorage); автоматическая подстановка Bearer; refresh при 401; logout при неудачном refresh; отправка refresh в теле при logout (`/auth/logout/`).
- **Backend Login**: ответ приведён к формату `{ success, data: { user, tokens } }` как у Register и Google.
- **AuthGuard / AdminGuard / GuestGuard**: защищённые маршруты для `/profile`, `/settings`, `/sell`, `/coins`; админ-маршруты под AdminGuard; `/login`, `/signup`, `/admin/login` под GuestGuard.
- **.env.example** (frontend): `VITE_API_BASE_URL`, `VITE_WS_BASE_URL`, `VITE_GOOGLE_CLIENT_ID`, `VITE_SENTRY_DSN`.

### 2. Data fetching (React Query)
- **QueryClient** (`src/lib/reactQuery.js`): retry, staleTime, gcTime, глобальный onError.
- **Хуки**: useGames, useGame, useGameListings; useListings, useListing, useCreateListing, useUpdateListing, useDeleteListing, useAddToFavorites, useRemoveFromFavorites, useTrackView; useProfile, useUpdateProfile, useProfileListings, useProfileFavorites, useProfilePurchases, useProfileSales, useProfileNotifications; useChats, useChat, useSendMessage; useNotifications; usePayments; useSubscriptions; useReviews; useReports; useUpload; useAdmin* (dashboard, users, pending listings, approve/reject, reports, resolve, disputes, ban user).

### 3. Admin API
- **useAdmin.js** приведён к реальным эндпоинтам бэкенда: `admin-panel/dashboard/`, `admin-panel/listings/pending/`, `admin-panel/listings/{id}/approve/`, `admin-panel/listings/{id}/reject/`, `admin-panel/reports/`, `admin-panel/reports/{id}/resolve/`, `admin-panel/users/`, `admin-panel/users/{id}/ban/`, disputes.
- **AdminDashboard**: использует useAdminDashboard, useAdminPendingListings, useAdminReports для реальных данных с fallback на мок.

### 4. CORS и безопасность (backend)
- В `config/settings/base.py`: `CORS_ALLOW_HEADERS` с `accept`, `authorization`, `content-type`, `user-agent`, `x-csrftoken`, `x-requested-with`.
- В dev: `CORS_ALLOW_ALL_ORIGINS = True` (development.py).
- Rate limiting: в DRF заданы throttle (auth, anon, user).

### 5. Frontend proxy и статика
- **vite.config.js**: proxy для `/api`, `/ws`, `/media` на `localhost:8000`.

### 6. Docker
- **Frontend Dockerfile** (корень): multi-stage (Node 20 alpine build + Nginx serve), build args для VITE_*.
- **nginx.conf** (корень): раздача статики SPA (try_files).
- **docker-compose.yml** (корень): backend, frontend, postgres, redis, celery-worker, celery-beat.

### 7. Ошибки и мониторинг
- **ErrorBoundary**: убрана отправка на несуществующий `/api/v1/log-error/`; оставлена отправка в Sentry при наличии `VITE_SENTRY_DSN` и `window.Sentry`.
- **Backend**: в `config/urls.py` есть `health/` и `health/detailed/` (БД, cache, Celery).

### 8. Типы API
- **apiTypes.js**: JSDoc типы для User, Tokens, Game, Listing, Review, Chat, Message, Notification, Transaction, Subscription, PaginatedResponse, ApiError, ValidationError.

---

## Частично или требуется доработка

- **CSRF**: бэкенд использует JWT; для сессионных/форм при необходимости добавить выдачу и проверку CSRF (например, для cookie-based flow).
- **Sentry (frontend)**: инициализация и `captureException` завязаны на `window.Sentry` — нужно подключить `@sentry/react` и инициализировать в `main.jsx` при наличии `VITE_SENTRY_DSN`.
- **Admin UI**: AdminAccounts и AdminReports страницы можно перевести на useAdminPendingListings + useAdminApproveListing/useAdminRejectListing и useAdminReports/useAdminResolveReport (как в AdminDashboard).
- **WebSocket**: бэкенд (Channels, ChatConsumer, NotificationConsumer) и фронт (useWebSocket, useChatWebSocket, useNotificationWebSocket) уже есть; достаточно проверить роутинг и JWT в query для WS.
- **Payments / Email / Seed / E2E / CI-CD**: по документу — отдельные этапы; бэкенд содержит заготовки (payments, email, seed_data); CI/CD и E2E можно добавить по чеклисту.

---

## Запуск

- **Локально (dev)**  
  - Backend: `cd wibestore_backend && python manage.py runserver` (или через docker-compose только backend).  
  - Frontend: `npm run dev` (Vite proxy на :8000).
- **Полный стек (Docker)**  
  - В корне: `docker-compose up -d`.  
  - Frontend: http://localhost:3000, API: http://localhost:8000.  
  - У backend должен быть настроен `.env` (например, из `wibestore_backend/.env.example`).

После изменений имеет смысл прогнать тесты бэкенда и при необходимости — миграции и seed.
