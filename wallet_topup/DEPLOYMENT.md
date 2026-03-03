# Wallet Top-Up — Deployment Guide

## Overview

- **Backend**: FastAPI on port 8001 (async, PostgreSQL, Redis).
- **Bot**: aiogram 3 long-polling; subscribes to Redis for new pending transactions.
- **Web App**: Static build (React/Vite) served over HTTPS; opened from bot via `WebAppInfo` URL.

## Prerequisites

- Docker and Docker Compose (or run backend/bot manually with Python 3.12+, Node 20+ for frontend).
- PostgreSQL 16 and Redis 7.
- Telegram Bot Token and Web App URL (HTTPS in production).

## 1. Environment

### Backend (`wallet_topup/backend/.env`)

```env
TELEGRAM_BOT_TOKEN=<your_bot_token>
WEB_APP_URL=https://your-domain.com/wallet-app
DATABASE_URL=postgresql+asyncpg://user:pass@host:5432/wallet_topup_db
REDIS_URL=redis://host:6379/3
ADMIN_TELEGRAM_IDS=123456789,987654321
```

### Bot (`wallet_topup/bot/.env`)

```env
TELEGRAM_BOT_TOKEN=<same_token>
WEB_APP_URL=https://your-domain.com/wallet-app
BACKEND_URL=http://backend:8001   # or https://api.your-domain.com in production
REDIS_URL=redis://host:6379/3
ADMIN_TELEGRAM_IDS=123456789,987654321
```

### Frontend

Set `VITE_API_BASE_URL` to your backend API URL (e.g. `https://api.your-domain.com`) before building.

## 2. Database

- Backend creates tables on startup via `init_db()` (SQLAlchemy `create_all`).
- For production, prefer Alembic:

  ```bash
  cd wallet_topup/backend
  PYTHONPATH=<path_to_wallet_topup_parent> alembic upgrade head
  ```

- Seed payment methods (optional):

  ```bash
  PYTHONPATH=<path_to_wallet_topup_parent> python wallet_topup/backend/scripts/seed_payment_methods.py
  ```

## 3. Docker Compose (from repo root)

```bash
cd Wibestore
docker-compose -f wallet_topup/docker-compose.yml up -d
```

- Backend: http://localhost:8001  
- Postgres: localhost:5433 (host), 5432 (internal)  
- Redis: localhost:6380 (host), 6379 (internal)

Run migrations and seed (see above) if not using `create_all`.

## 4. Frontend (Web App) build and host

- Build:

  ```bash
  cd wallet_topup/frontend
  npm ci
  VITE_API_BASE_URL=https://api.your-domain.com npm run build
  ```

- Serve `dist/` over HTTPS (e.g. Nginx, Vercel, Cloudflare Pages). The Web App URL you set in Bot and Backend must point to this (e.g. `https://your-domain.com/wallet-app` or root).

## 5. Telegram Bot and Web App

1. Create bot via [@BotFather](https://t.me/BotFather); get token.
2. Set Web App URL in BotFather (Bot Settings → Menu Button or Configure Mini App) to your Web App URL, or use the “Open Payment Panel” button that sends `WebAppInfo(url=WEB_APP_URL)`.
3. Add admin Telegram IDs to `ADMIN_TELEGRAM_IDS` in both backend and bot.

## 6. Security checklist

- Validate Telegram Web App `initData` (HMAC-SHA256) on backend; never trust frontend for user identity.
- Use HTTPS for Backend and Web App in production.
- Keep `TELEGRAM_BOT_TOKEN` and `ADMIN_TELEGRAM_IDS` secret; do not commit `.env`.
- Admin API uses `X-Bot-Secret: <TELEGRAM_BOT_TOKEN>`; in production consider a separate `BOT_SECRET` and restrict admin routes by IP if needed.

## 7. Scaling

- Backend: stateless; run multiple instances behind a load balancer; shared PostgreSQL and Redis.
- Bot: run a single instance (long-polling) or use webhook (one endpoint).
- Redis: used for rate limiting and pub/sub (new pending); ensure Redis is available to both backend and bot.

## 8. Logging and errors

- Backend: structured logging; global exception handler returns standardized `ApiResponse` with `success: false` and `error.code` / `error.message`.
- Bot: logs to stdout; ensure admin actions and user notifications are logged for audit.
