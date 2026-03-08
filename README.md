# WibeStore

Gaming Accounts Marketplace — React (frontend) + Django (backend).

## Tuzilishi

- **Frontend** — React 19, Vite 7, Tailwind 4 (loyiha ildizi)
- **Backend** — `wibestore_backend/` — Django 5, DRF, JWT, Celery, Channels
- **Telegram bot** — `telegram_bot/` — OTP, ro'yxatdan o'tish
- **Wallet top-up** — `wallet_topup/` — alohida servis

## Tez ishga tushirish

### Frontend

```bash
cp .env.example .env   # VITE_API_BASE_URL, VITE_WS_BASE_URL va b. ni sozlang
npm install
npm run dev
```

### Backend

```bash
cd wibestore_backend
cp .env.example .env   # SECRET_KEY, DATABASE_URL, REDIS va b. ni to'ldiring
pip install -r requirements.txt
python manage.py migrate
python manage.py runserver
```

Batafsil: `wibestore_backend/README.md`

### Docker (barcha servislar)

```bash
docker-compose up -d
```

Frontend: port 3000 (yoki PORT), backend: 8000. Nginx template: `nginx.proxy.template`, `entrypoint.sh`.

## Muhim fayllar

| Fayl | Vazifasi |
|------|----------|
| `.env.example` | Frontend env namuna |
| `wibestore_backend/.env.example` | Backend env namuna |
| `docker-compose.yml` | Frontend, backend, Postgres, Redis, Celery |
| `MUAMMOLAR_VA_TAVSIYALAR.md` | Tahlil hisoboti va tavsiyalar |

## API

Backend Swagger: `/api/v1/docs/` (backend ishlaganda).
