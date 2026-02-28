# 🚂 Railway'da deploy — Backend, Bot, Frontend va integratsiya

Log'dagi xatoliklar ko‘pincha **o‘rnatilmagan env o‘zgaruvchilar** tufayli bo‘ladi. Quyida har bir servis uchun majburiy qadamlari va Telegram integratsiyasi uchun sozlash keltirilgan.

---

## 1. Backend (Django) — Railway'da ishlashi uchun

### Xato: `connection to 127.0.0.1 port 5432 failed: Connection refused`

**Sabab:** Backend `DATABASE_URL` olmayapti yoki localhost default ishlatilmoqda. Railway konteynerida localhost’da Postgres yo‘q.

**Qilish kerak:**

1. **Postgres qo‘shing**  
   Railway loyihangizda: **+ New** → **Database** → **PostgreSQL**.  
   Avtomatik `DATABASE_PUBLIC_URL` (va ba’zan `DATABASE_URL`) yaratiladi.

2. **Backend servisiga DB ulang**  
   Backend servisini oching → **Variables** → **Reference** (yoki **+ New Variable**):
   - **Variant A:** **Add Reference** → Postgres servisini tanlang → `DATABASE_PUBLIC_URL` (yoki `DATABASE_URL`) ni tanlang. Backend entrypoint avtomatik ravishda `DATABASE_PUBLIC_URL` ni `DATABASE_URL` ga o‘tkazadi.
   - **Variant B:** Postgres servisidagi **Variables** dan `DATABASE_PUBLIC_URL` qiymatini nusxalab, Backend’da `DATABASE_URL` yoki `DATABASE_PUBLIC_URL` deb qo‘ying.

3. **Boshqa majburiy o‘zgaruvchilar (Backend)**

   | Variable | Tavsif |
   |----------|--------|
   | `DATABASE_URL` yoki `DATABASE_PUBLIC_URL` | Postgres connection string (Railway Postgres qo‘shganda beriladi) |
   | `SECRET_KEY` | Django secret (generatsiya: `python -c "from django.core.management.utils import get_random_secret_key; print(get_random_secret_key())"`) |
   | `TELEGRAM_BOT_SECRET` | Bot bilan bir xil maxfiy kalit (bot’dagi `BOT_SECRET_KEY` bilan bir xil) |
   | `CORS_ALLOWED_ORIGINS` | Frontend manzili, masalan `https://your-app.up.railway.app` |
   | `ALLOWED_HOSTS` | Ixtiyoriy — production’da `.railway.app` avtomatik qo‘shiladi; kerak bo‘lsa qo‘shimcha domenlar |

4. **Ixtiyoriy:** `FERNET_KEY` (maxfiy ma’lumotlar shifrlash uchun).

Backend ishga tushishi uchun **kamida** `DATABASE_URL` (yoki `DATABASE_PUBLIC_URL`) va `SECRET_KEY` kerak. `TELEGRAM_BOT_SECRET` Telegram ro‘yxatdan o‘tish uchun.

---

## 2. Telegram Bot — Railway'da

| Variable | Tavsif |
|----------|--------|
| `BOT_TOKEN` | @BotFather dan olingan token |
| `WEBSITE_URL` | **Backend** asosiy URL (masalan `https://your-backend.up.railway.app`). Localhost bo‘lmasin. |
| `BOT_SECRET_KEY` yoki `TELEGRAM_BOT_SECRET` | Backend’dagi `TELEGRAM_BOT_SECRET` bilan **bir xil** |
| `REGISTER_URL` | Frontend ro‘yxatdan o‘tish sahifasi (masalan `https://your-frontend.up.railway.app/register`) |

**Muhim:** Bot faqat **bitta** joyda ishlashi kerak (Railway yoki kompyuteringiz). Ikkovi bir vaqtda ishlasa `Conflict: only one bot instance` xatosi chiqadi.

---

## 3. Frontend (Vite/React)

Build va deploy paytida:

| Variable | Tavsif |
|----------|--------|
| `VITE_API_BASE_URL` | Backend API asosiy manzili (masalan `https://your-backend.up.railway.app/api/v1`) |
| `VITE_TELEGRAM_BOT_USERNAME` | (Ixtiyoriy) Bot username, masalan `wibestorebot` |

---

## 4. Integratsiya oqimi (qisqacha)

1. Foydalanuvchi botga `/start` yuboradi → bot telefon so‘raydi.
2. Foydalanuvchi telefon yuboradi → bot **Backend** ga `POST .../auth/telegram/otp/create/` so‘rov yuboradi (`BOT_SECRET_KEY` = Backend’dagi `TELEGRAM_BOT_SECRET`).
3. Backend kod (6 raqam) qaytaradi → bot foydalanuvchiga kod va **REGISTER_URL** (sayt) havolasini yuboradi.
4. Foydalanuvchi saytda (frontend) **xuddi shu telefon** va **kod**ni kiritadi → frontend `POST .../auth/register/telegram/` ga yuboradi.
5. Backend kodni tekshiradi, User yaratadi/ulaydi, JWT qaytaradi → frontend foydalanuvchini kirgan qilib saqlaydi.

---

## 5. Tez tekshirish

- **Backend:** `ValueError: Production requires a real database` → Postgres qo‘shing va `DATABASE_URL` / `DATABASE_PUBLIC_URL` o‘rnating.
- **Backend:** `SECRET_KEY o'rnatilmagan!` → Backend Variables’da `SECRET_KEY` qo‘ying.
- **Bot:** `BOT_SECRET_KEY o'rnatilmagan` → Bot Variables’da `BOT_SECRET_KEY` qo‘ying (Backend’dagi `TELEGRAM_BOT_SECRET` bilan bir xil).
- **Bot:** `Conflict: only one bot instance` → Botni faqat bitta joyda ishlating (Railway yoki lokal).
- **Bot:** Backend’ga ulanish xatosi / 403 → `WEBSITE_URL` backend URL bo‘lishi va `BOT_SECRET_KEY` = `TELEGRAM_BOT_SECRET` bo‘lishi kerak.

Batafsil tekshiruv ro‘yxati: [TELEGRAM_INTEGRATION_CHECKLIST.md](TELEGRAM_INTEGRATION_CHECKLIST.md).
