# WibeStore Backend — Master TODO List (Updated)

> Generated from `DJANGO_BACKEND_PROMPT.md` cross-referenced with current codebase state.
> ✅ = Done | 🔧 = Needs Fixes/Improvements | ❌ = Missing/Not Started

---

## Phase 1: Project Foundation & Configuration

### 1.1 Project Structure
- ✅ Django project scaffolded (`config/`, `apps/`, `core/`)
- ✅ `manage.py` configured
- ✅ `pyproject.toml` with tool configs (black, ruff, isort, pytest, coverage)
- ✅ `requirements.txt` with all dependencies
- ✅ `nginx/nginx.conf` — Nginx reverse proxy config
- ✅ `entrypoint.sh` — Docker entrypoint script
- ✅ `conftest.py` — Pytest fixtures
- ✅ `tests/factories.py` — Factory Boy model factories
- ✅ `tests/test_accounts.py` — Account tests
- ✅ `tests/test_marketplace.py` — Marketplace tests
- ✅ `tests/test_payments.py` — Payment tests
- ✅ `tests/test_notifications.py` — Notification tests
- ✅ `tests/test_reviews.py` — Review tests
- ✅ `tests/test_reports.py` — Report tests
- ✅ `tests/test_admin_panel.py` — Admin panel tests
- ❌ `.env.example` — environment variable template file
- ❌ `.gitignore` — Git ignore rules
- ❌ `README.md` — project documentation
- ❌ `scripts/seed_data.py` — seed initial data (games, categories, plans)
- ❌ `scripts/create_superuser.py` — automated superuser creation
- ❌ `.pre-commit-config.yaml` — pre-commit hooks
- ❌ `.github/workflows/ci.yml` — GitHub Actions CI/CD pipeline

### 1.2 Settings Configuration
- ✅ `config/settings/base.py` — comprehensive base settings
- ✅ `config/settings/development.py` — dev overrides
- ✅ `config/settings/production.py` — production security + Sentry
- ✅ `config/settings/testing.py` — test-optimized settings
- ✅ `config/celery.py` — Celery configuration with beat schedule

### 1.3 Docker & Deployment
- ✅ `Dockerfile` — multi-stage build
- ✅ `docker-compose.yml` — dev stack (web, postgres, redis, celery, nginx)
- ✅ `nginx/nginx.conf` — Nginx reverse proxy with WebSocket support
- ✅ `entrypoint.sh` — Docker entrypoint
- ❌ `docker-compose.prod.yml` — production compose file

---

## Phase 2: Core Framework

### 2.1 Core Models & Utils
- ✅ `core/models.py` — `TimeStampedModel`, `UUIDModel`, `SoftDeleteModel`, `BaseModel`, `BaseSoftDeleteModel`
- ✅ `core/constants.py` — all choice constants
- ✅ `core/exceptions.py` — custom exceptions + handler
- ✅ `core/utils.py` — crypto, OTP, commission calc
- ✅ `core/validators.py` — phone, password, image, color validators
- ✅ `core/middleware.py` — request logging + CSP headers
- ✅ `core/pagination.py` — standard + cursor pagination
- ✅ `core/permissions.py` — IsOwner, IsAdmin, IsVerified etc.
- ✅ `core/serializers.py` — empty, success, error serializers
- ❌ `core/mixins.py` — reusable view/serializer mixins (field selection `?fields=`, expansion `?expand=`)
- ❌ `core/filters.py` — shared filter backends

### 2.2 Accounts App
- ✅ `models.py` — User, PasswordHistory, UserManager
- ✅ `serializers.py` — all auth serializers
- ✅ `views.py` — Register, Login, Logout, Refresh, Google, Password Reset/Confirm, Email Verify/Resend, OTP, Me
- ✅ `profile_views.py` — Profile, MyListings, MyFavorites, MyPurchases, MySales, MyNotifications
- ✅ `services.py` — AuthService, UserService
- ✅ `tasks.py` — welcome email, verification, password reset, cleanup
- ✅ `signals.py` — post_save user logging
- ✅ `throttling.py` — AuthRateThrottle
- ✅ `permissions.py` — IsAccountOwner, IsAuthenticatedAndVerified
- ✅ `selectors.py` — active users, by email, top sellers
- ✅ `admin.py` — UserAdmin
- ✅ `urls.py` + `profile_urls.py`
- 🔧 `services.py`: `calculate_user_rating()` uses `Avg` correctly (imported from django.db.models.Avg) — already correct
- ❌ `views.py`: Missing `ChangePasswordView` endpoint (serializer exists but view may need verification)
- ❌ `views.py`: Missing `DeleteAccountView` endpoint (soft delete)

### 2.3 Games App
- ✅ `models.py` — Game, Category
- ✅ `serializers.py` — GameSerializer, GameListSerializer, CategorySerializer
- ✅ `views.py` — GameListView, GameDetailView, GameListingsView
- ✅ `admin.py` — GameAdmin, CategoryAdmin (with proper annotation)
- ✅ `urls.py`
- ❌ `views.py`: Missing `CategoryListView` endpoint
- ❌ `services.py` — Missing services file

### 2.4 Marketplace App
- ✅ `models.py` — Listing, ListingImage, Favorite, ListingView
- ✅ `serializers.py` — all listing serializers
- ✅ `views.py` — CRUD, favorite, view count
- ✅ `services.py` — create, approve, reject, mark_as_sold
- ✅ `selectors.py` — active listings, premium, search
- ✅ `permissions.py` — IsListingOwner
- ✅ `tasks.py` — admin notification, auto-approve, archive
- ✅ `admin.py` — ListingAdmin, FavoriteAdmin, ListingViewAdmin
- ✅ `urls.py`
- ❌ `views.py`: Missing `ListingImageUploadView` — separate image upload endpoint
- ❌ `filters.py`: Missing proper FilterSet class for advanced filtering

### 2.5 Payments App
- ✅ `models.py` — PaymentMethod, Transaction, EscrowTransaction
- ✅ `serializers.py` — all serializers
- ✅ `views.py` — deposit, withdraw, purchase, transactions, webhook
- ✅ `services.py` — PaymentService, EscrowService (full escrow flow)
- ✅ `webhooks.py` — Payme, Click, Paynet handlers
- ✅ `tasks.py` — process deposit/withdrawal, release escrow, email
- ✅ `admin.py` — PaymentMethodAdmin, TransactionAdmin, EscrowTransactionAdmin
- ✅ `urls.py` — including escrow confirm, dispute, methods, balance
- 🔧 `views.py`: EscrowConfirmDeliveryView, EscrowDisputeView, PaymentMethodsListView, BalanceView referenced in urls.py but need implementation verification
- 🔧 `services.py:169` — `seller.total_sales += 1` in `release_payment()` may conflict with `mark_as_sold()` (double-counting)

### 2.6 Subscriptions App
- ✅ `models.py` — SubscriptionPlan, UserSubscription
- ✅ `serializers.py` — all serializers
- ✅ `views.py` — plan list, purchase, my subscription, cancel
- ✅ `services.py` — purchase, cancel, get_user_plan
- ✅ `tasks.py` — expiration check, warning notifications
- ✅ `admin.py` — SubscriptionPlanAdmin, UserSubscriptionAdmin
- ✅ `urls.py`

### 2.7 Messaging App
- ✅ `models.py` — ChatRoom, Message
- ✅ `serializers.py` — all serializers
- ✅ `views.py` — room list/create, messages, send
- ✅ `consumers.py` — ChatConsumer (WebSocket)
- ✅ `routing.py`
- ✅ `admin.py` — ChatRoomAdmin, MessageAdmin
- ✅ `urls.py`

### 2.8 Notifications App
- ✅ `models.py` — NotificationType, Notification
- ✅ `serializers.py` — all serializers
- ✅ `views.py` — list, mark read, mark all read, unread count
- ✅ `services.py` — create, notify admins, mark all, WebSocket push
- ✅ `consumers.py` — NotificationConsumer
- ✅ `routing.py`
- ✅ `admin.py` — NotificationTypeAdmin, NotificationAdmin
- ✅ `urls.py`
- ✅ `tasks.py` — cleanup old notifications

### 2.9 Reviews App
- ✅ `models.py` — Review
- ✅ `serializers.py` — ReviewSerializer, CreateReviewSerializer, ReviewReplySerializer
- ✅ `views.py` — user reviews, create review, reply
- ✅ `admin.py` — ReviewAdmin
- ✅ `urls.py`
- ❌ `services.py` — ReviewService (rating recalculation logic)

### 2.10 Reports App
- ✅ `models.py` — Report
- ✅ `serializers.py` — ReportSerializer, CreateReportSerializer
- ✅ `views.py` — create report, my reports
- ✅ `admin.py` — ReportAdmin
- ✅ `urls.py`

### 2.11 Admin Panel App
- ✅ `views.py` — dashboard, pending listings, approve/reject, disputes, reports, users, ban
- ✅ `urls.py`
- ❌ `tasks.py` — `calculate_daily_statistics` (referenced in celery beat but needs implementation)
- ❌ `serializers.py` — AdminDashboardSerializer, admin-specific serializers

---

## Phase 3: Remaining Work Items (Priority Order)

### 3.1 Bug Fixes (HIGH PRIORITY)
1. 🔧 `apps/payments/services.py` — `seller.total_sales += 1` double-counting in `release_payment()` vs `mark_as_sold()`
2. 🔧 `tests/factories.py` — CategoryFactory has `game` field but Category model doesn't have `game` FK
3. 🔧 `tests/factories.py` — ListingFactory uses `server` and `account_age_months` which are not in model

### 3.2 Missing Views/Endpoints (HIGH PRIORITY)
- ❌ `ChangePasswordView` — dedicated change password endpoint
- ❌ `DeleteAccountView` — soft delete account
- ❌ `CategoryListView` — list categories
- ❌ `ListingImageUploadView` — image upload for listings
- ❌ Health check endpoints (`/health/`, `/health/detailed/`)

### 3.3 Missing Service Files (MEDIUM PRIORITY)
- ❌ `apps/reviews/services.py` — ReviewService  
- ❌ `apps/games/services.py` — GameService
- ❌ `apps/admin_panel/tasks.py` — `calculate_daily_statistics`
- ❌ `apps/admin_panel/serializers.py` — admin serializers

### 3.4 Missing Infrastructure Files (MEDIUM PRIORITY)
- ❌ `.env.example` — environment variable template
- ❌ `.gitignore` — Git ignore rules
- ❌ `README.md` — project documentation
- ❌ `core/filters.py` — shared filter backends
- ❌ `marketplace/filters.py` — listing FilterSet

### 3.5 Missing Scripts (LOW PRIORITY)
- ❌ `scripts/seed_data.py` — seed games, categories, plans
- ❌ `scripts/create_superuser.py` — automated superuser

### 3.6 CI/CD & Tooling (LOW PRIORITY)
- ❌ `.github/workflows/ci.yml` — GitHub Actions
- ❌ `.pre-commit-config.yaml` — pre-commit hooks

---

## Execution Order

1. **Fix critical bugs** (Phase 3.1) — prevent runtime errors
2. **Implement missing views/endpoints** (Phase 3.2) — complete the API
3. **Create missing service files** (Phase 3.3) — business logic
4. **Create infrastructure files** (Phase 3.4) — documentation & tooling
5. **Create scripts** (Phase 3.5) — utilities
6. **Setup CI/CD** (Phase 3.6) — automation
