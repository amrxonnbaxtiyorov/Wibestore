# Bot ↔ Backend integratsiyasi (Railway / production)

Agar bot "Backend bilan bog'lanib bo'lmadi" yoki "Backend ishlamayotgan bo'lishi mumkin" deb yuborsa — quyidagilarni tekshiring.

## 1. Railway **Bot** servisi — Environment Variables

| O'zgaruvchi | Qiymat | Majburiy |
|-------------|--------|----------|
| `BOT_TOKEN` | @BotFather tokeningiz | Ha |
| **`WEBSITE_URL`** | **Backend ning to'liq manzili** | Ha |
| **`BOT_SECRET_KEY`** | **Backend dagi `TELEGRAM_BOT_SECRET` bilan bir xil** | Ha |
| `REGISTER_URL` | Frontend ro'yxatdan o'tish sahifasi (masalan `https://wibestore.net/signup`) | Ixtiyoriy |

### WEBSITE_URL qanday bo'lishi kerak

- **Noto'g'ri:** `http://localhost:8000` — bot Railway'da ishlaganda localhost bot o'zining ichida, backend emas.
- **To'g'ri:** Backend deploy qilingan manzil, masalan:
  - `https://your-backend.up.railway.app`
  - yoki `https://api.wibestore.net`
  - **Slash** oxirida bo'lmasin: `https://...app` (yo'q `https://...app/`).

### BOT_SECRET_KEY

- Backend (Django) loyihasida **TELEGRAM_BOT_SECRET** ga qo'yilgan qiymat bilan **aynan bir xil** bo'lishi kerak.
- Masalan: Backend'da `TELEGRAM_BOT_SECRET=wibestore-telegram-secret-2024` bo'lsa, Bot'da ham `BOT_SECRET_KEY=wibestore-telegram-secret-2024` bo'lishi kerak.

---

## 2. Railway **Backend** servisi — Environment Variables

| O'zgaruvchi | Qiymat |
|-------------|--------|
| `TELEGRAM_BOT_SECRET` | Ixtiyoriy uzun maxfiy satr (bot bilan bir xil qiymat) |

Backend ishlashi uchun bu o'zgaruvchi **qo'yilishi shart** (bot kod yaratish so'rovini qabul qilishi uchun).

---

## 3. Tekshirish

1. Backend ishlayotganini: brauzerda oching  
   `https://YOUR_BACKEND_URL/health/`  
   — `{"status":"ok"}` kelishi kerak.

2. Bot logida (Railway → Bot servisi → Logs):
   - Agar `Backend ga ulanish xatosi` ko'rsa — **WEBSITE_URL** noto'g'ri yoki backend murojaat qabul qilmayapti.
   - Agar `403` yoki `BOT_SECRET_KEY ... bir xil bo'lishi kerak` ko'rsa — **BOT_SECRET_KEY** va backend **TELEGRAM_BOT_SECRET** bir xil emas.

3. Faqat **bitta** bot instance ishlashi kerak (bitta token = bitta process). Conflict bo‘lsa [BOT_CONFLICT_FIX.md](BOT_CONFLICT_FIX.md) ga qarang.

---

## 4. Qisqacha

- **Bot:** `WEBSITE_URL` = backend ning haqiqiy URL (https://...), `BOT_SECRET_KEY` = backend dagi secret bilan bir xil.
- **Backend:** `TELEGRAM_BOT_SECRET` = bot dagi secret bilan bir xil.
- **Bitta instance:** Token faqat bitta joyda (yoki faqat Railway, yoki faqat kompyuter).

## 5. Railway — to'liq tekshiruv

Barcha servislar va integratsiya uchun batafsil ro'yxat: [RAILWAY_CHECKLIST.md](RAILWAY_CHECKLIST.md).
