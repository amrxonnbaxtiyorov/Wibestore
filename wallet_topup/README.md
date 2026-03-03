# Wallet Top-Up (WibeStore)

Telegram bot + Web App for **wallet top-up only**: manual payment with receipt upload and admin approval.

## Stack

| Component | Tech |
|-----------|------|
| Backend | Python, FastAPI (async), PostgreSQL, SQLAlchemy, Redis, Alembic |
| Bot | aiogram 3.x |
| Web App | React, Vite, Telegram Web App SDK (script) |
| Security | Telegram initData HMAC-SHA256 validation, rate limit, admin-only actions |

## User flow

1. User opens bot → taps **💰 Open Payment Panel** (opens Web App).
2. In Web App: select **currency** (UZS / USDT) → **payment method** (cards from backend) → **amount** → **upload receipt** → **Submit**.
3. Backend validates initData, rate limit, no duplicate pending; stores transaction and publishes to Redis.
4. Bot receives new pending, fetches transaction from backend, sends to all admins with **✅ Confirm** / **❌ Reject**.
5. Admin confirms → balance updated, user notified; reject → user notified.

## Project layout

```
wallet_topup/
├── backend/          # FastAPI
│   ├── main.py
│   ├── config.py
│   ├── database/
│   ├── models/
│   ├── schemas/
│   ├── services/
│   ├── security/
│   ├── middleware/
│   ├── api/
│   └── alembic/
├── bot/              # aiogram 3
│   ├── main.py
│   ├── handlers/
│   ├── keyboards/
│   └── services/
├── frontend/         # React Web App
│   ├── src/
│   └── package.json
├── docker-compose.yml
├── DEPLOYMENT.md
└── README.md
```

## Quick start (local)

Run from **repo root** (Wibestore) so `wallet_topup` package is found.

1. **Backend**

   ```bash
   cd wallet_topup/backend
   pip install -r requirements.txt
   cp .env.example .env   # set TELEGRAM_BOT_TOKEN, ADMIN_TELEGRAM_IDS, DATABASE_URL, REDIS_URL
   PYTHONPATH=../.. alembic upgrade head
   PYTHONPATH=../.. python -m wallet_topup.backend.scripts.seed_payment_methods  # optional
   PYTHONPATH=../.. uvicorn wallet_topup.backend.main:app --reload --port 8001
   ```

2. **Bot**

   ```bash
   cd wallet_topup/bot
   pip install -r requirements.txt
   cp .env.example .env
   PYTHONPATH=../.. python -m wallet_topup.bot.main
   ```

3. **Frontend (dev)**

   ```bash
   cd wallet_topup/frontend
   npm i
   npm run dev
   ```

   For Telegram Web App, use a tunnel (e.g. ngrok) and set the tunnel URL in Bot and Backend as `WEB_APP_URL`.

## Bot token and URL (from your message)

- Bot token: `8674334131:AAE08Keom_XZKjE2ooU0RYbhgijM1ZCug7Q`
- Bot URL: https://t.me/wibestorepaybot

Set `WEB_APP_URL` to the URL where the frontend is hosted (HTTPS in production).

## See also

- [DEPLOYMENT.md](./DEPLOYMENT.md) for production deployment, Docker, and security.
