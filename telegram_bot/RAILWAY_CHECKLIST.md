# Railway — Hammasi mukammal ishlashi va integratsiya tekshiruvi

Ushbu ro'yxat bo'yicha tekshirilsa, bot, backend va frontend bir-biri bilan to'g'ri ishlaydi.

---

## 1. Telegram Bot servisi (Railway)

| O'zgaruvchi | Qanday qiymat | Majburiy |
|-------------|----------------|----------|
| `BOT_TOKEN` | @BotFather tokeningiz | Ha |
| `WEBSITE_URL` | Backend ning **to'liq URL** (masalan `https://wibestore-backend.up.railway.app`) — **oxirida / bo'lmasin** | Ha |
| `BOT_SECRET_KEY` | Backend dagi `TELEGRAM_BOT_SECRET` bilan **bir xil** | Ha |
| `REGISTER_URL` | Frontend ro'yxat sahifasi (masalan `https://wibestore.uz/signup`) | Yaxshiroq |

- Build: **Dockerfile** ishlatiladi (`railway.toml` tufayli) — Railpack/mise xatosi bo'lmaydi.
- Bitta token = bitta instance (ikkala joyda ishlamang, Conflict bo'ladi).

---

## 2. Backend servisi (Railway)

| O'zgaruvchi | Qanday qiymat |
|-------------|----------------|
| `TELEGRAM_BOT_SECRET` | Bot dagi `BOT_SECRET_KEY` bilan **bir xil** (masalan `wibestore-telegram-bot-secret-2024`) |
| `DATABASE_URL` yoki `DATABASE_PUBLIC_URL` | Railway Postgres ulangan bo'lsa avtomatik |
| `SECRET_KEY` | Kuchli kalit (production uchun majburiy) |
| `CORS_ALLOWED_ORIGINS` | Frontend URL(lar), masalan `https://wibestore.uz,https://your-app.up.railway.app` |
| `ALLOWED_HOSTS` | `localhost,127.0.0.1,.railway.app` (yoki o'z domainingiz) |

---

## 3. Frontend (Railway yoki boshqa hosting)

| O'zgaruvchi | Qanday qiymat |
|-------------|----------------|
| `VITE_API_BASE_URL` | Backend API manzili, masalan `https://wibestore-backend.up.railway.app/api/v1` |
| `VITE_TELEGRAM_BOT_USERNAME` | Bot username (masalan `wibestorebot`) — /signup da “Telegram orqali” uchun |
| `VITE_WS_BASE_URL` | WebSocket uchun backend URL (agar chat/notifications ishlatilsa) |

---

## 4. Integratsiya tekshiruvi

1. **Backend ishlayaptimi**  
   Brauzerda: `https://YOUR_BACKEND_URL/health/`  
   Kutiladi: `{"status":"ok"}`

2. **Bot → Backend**  
   Botda `/start` → telefon raqam yuboring → kod kelishi kerak.  
   Agar “Backend bilan bog'lanib bo'lmadi” yoki xato bo'lsa:
   - Bot servisida `WEBSITE_URL` = backend ning **https://...** manzili (slashsiz).
   - `BOT_SECRET_KEY` va backend `TELEGRAM_BOT_SECRET` **bir xil** bo'lishi kerak.

3. **Frontend → Backend**  
   Saytda ro'yxatdan o'tish / login ishlashi kerak.  
   Agar CORS yoki 404 bo'lsa: Backend da `CORS_ALLOWED_ORIGINS` da frontend manzili bo'lishi kerak.

4. **Telegram ro'yxatdan o'tish**  
   Botdan kod oling → Frontend `/signup` sahifasida telefon + kod kiriting → “Telegram orqali ro'yxatdan o'tish” tugmasi.  
   Agar API xato bersa: Frontend da `VITE_API_BASE_URL` to'g'ri backend ga yo'naltirilganligini tekshiring.

---

## 5. Qisqacha

| Qism | Asosiy sozlama |
|------|-----------------|
| Bot | `WEBSITE_URL` = backend URL, `BOT_SECRET_KEY` = backend secret |
| Backend | `TELEGRAM_BOT_SECRET` = bot secret, `CORS_ALLOWED_ORIGINS` = frontend |
| Frontend | `VITE_API_BASE_URL` = backend `/api/v1` |

Bular to'g'ri bo'lsa, Railway'da hamma narsa mukammal ishlashi va integratsiya joyida bo'lishi kerak.
