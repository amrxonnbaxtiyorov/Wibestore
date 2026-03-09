# WibeStore

Gaming Accounts Marketplace — React (frontend) + Django (backend).

## Tuzilishi

- **Frontend** — React 19, Vite 7, Tailwind 4 (loyiha ildizi)
- **Backend** — `wibestore_backend/` — Django 5, DRF, JWT, Celery, Channels
- **Telegram bot** — `telegram_bot/` — OTP, ro'yxatdan o'tish
- **Wallet top-up** — `wallet_topup/` — alohida servis

## Backend bilan to'liq ishlatish (local)

Sayt barcha ma'lumotlarni backend API orqali oladi (o'yinlar, e'lonlar, auth, to'lovlar). Lokal ishlatish uchun:

1. **Backend ni ishga tushiring** (port 8000):
   ```bash
   cd wibestore_backend
   cp .env.example .env
   # .env da kamida: SECRET_KEY, DATABASE_URL (PostgreSQL), REDIS_URL, JWT_SECRET_KEY, CORS_ALLOWED_ORIGINS
   pip install -r requirements.txt
   python manage.py migrate
   python manage.py runserver
   ```

2. **Frontend ni ishga tushiring** (port 5173):
   ```bash
   cp .env.example .env
   # Lokal uchun VITE_API_BASE_URL ni bo'sh qoldiring — Vite /api ni localhost:8000 ga proxy qiladi
   npm install
   npm run dev
   ```

3. **Yoki ikkalasini bir terminalda:**
   ```bash
   npm run dev:all
   ```
   (Backend 8000, frontend 5173 da ochiladi.)

4. Brauzerda `http://localhost:5173` oching. API so'rovlar `/api/v1/...` orqali backend ga ketadi.

5. Backend ishlayotganini tekshirish: [http://localhost:8000/health/](http://localhost:8000/health/) — `{"status":"ok"}` qaytarishi kerak.  
   API hujjatlari: [http://localhost:8000/api/v1/docs/](http://localhost:8000/api/v1/docs/).

Batafsil backend sozlash: `wibestore_backend/README.md`

## Tez ishga tushirish (alohida)

### Frontend

```bash
cp .env.example .env   # Production da VITE_API_BASE_URL ni to'ldiring
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
