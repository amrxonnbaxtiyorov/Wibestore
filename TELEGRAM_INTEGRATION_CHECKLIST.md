# ✅ Telegram integratsiyasi — mukammal tekshiruv ro'yxati

Ushbu hujjat backend, bot va frontend o'rtasidagi Telegram orqali ro'yxatdan o'tish oqimini tekshirish uchun ishlatiladi.

---

## 1. Oqim (end-to-end)

1. **Foydalanuvchi** Telegram'da botga `/start` yuboradi.
2. **Bot** telefon raqamini so'raydi (kontakt yoki matn).
3. **Foydalanuvchi** telefonni yuboradi → **Bot** raqamni normalizatsiya qiladi va **Backend** ga `POST /api/v1/auth/telegram/otp/create/` so'rov yuboradi (`secret_key`, `telegram_id`, `phone_number`).
4. **Backend** `TelegramRegistrationCode` yozuvini yaratadi (kod 10 daqiqa amal qiladi), kodni qaytaradi.
5. **Bot** foydalanuvchiga 6 xonali kodni yuboradi va saytda ro'yxatdan o'tish havolasini beradi.
6. **Foydalanuvchi** saytda (masalan `/register` yoki `/signup`) **xuddi shu telefon** va **botdan olgan kod**ni kiritadi.
7. **Frontend** `POST /api/v1/auth/register/telegram/` ga `{ "phone": "...", "code": "..." }` yuboradi (`withCredentials: true`).
8. **Backend** kodni tekshiradi:
   - Kod noto'g'ri / ishlatilgan / muddati tugagan → 400 xato.
   - To'g'ri bo'lsa: mavjud `User` (telegram_id yoki phone bo'yicha) qaytariladi yoki yangi `User` yaratiladi, JWT beriladi.
9. **Backend** javobda JWT ni **body** da va ixtiyoriy **httpOnly cookie** da qaytaradi.
10. **Frontend** `tokens` va `user` ni saqlaydi, foydalanuvchi tizimga kirdi deb hisoblanadi.

---

## 2. Backend (Django) tekshiruv

| Tekshiruv | Joyi | Holat |
|-----------|------|--------|
| `User.telegram_id` maydoni (unique, null) | `apps/accounts/models.py` | ✅ |
| `TelegramRegistrationCode` modeli (telegram_id, phone_number, code, is_used, expires_at) | `apps/accounts/models.py` | ✅ |
| Migratsiya `0003_telegram_registration` | `apps/accounts/migrations/` | ✅ |
| `AuthService._normalize_phone` | `apps/accounts/services.py` | ✅ |
| `AuthService.create_telegram_otp` — 10 min, eski kodlarni bekor qilish, telefon validatsiyasi (min 9 raqam) | `apps/accounts/services.py` | ✅ |
| `AuthService.validate_telegram_code_and_register` — kod/telefon tekshiruvi, User yaratish/ulash, kodni ishlatilgan qilish | `apps/accounts/services.py` | ✅ |
| `BotCreateOTPView`: secret tekshiruvi → create_telegram_otp, 403/400 | `apps/accounts/views.py` | ✅ |
| `TelegramRegisterView`: phone+code → JWT + cookie (httpOnly, Secure, SameSite=Lax) | `apps/accounts/views.py` | ✅ |
| URL: `telegram/otp/create/`, `register/telegram/` | `apps/accounts/urls.py` | ✅ |
| `TELEGRAM_BOT_SECRET` settings'dan | `config/settings/base.py` | ✅ |
| Auth throttle (rate limit) | views `throttle_scope = "auth"` | ✅ |
| CORS + credentials (frontend domeni) | `CORS_ALLOWED_ORIGINS`, `CORS_ALLOW_CREDENTIALS` | ✅ |

**Backend env (`.env` yoki production):**

- `TELEGRAM_BOT_SECRET` — bot bilan bir xil maxfiy kalit (masalan `wibestore-telegram-bot-secret-2024`).
- `CORS_ALLOWED_ORIGINS` — frontend manzili (masalan `https://wibestore.net`).

---

## 3. Bot (telegram_bot) tekshiruv

| Tekshiruv | Joyi | Holat |
|-----------|------|--------|
| `/start` → telefon so'rash | `bot.py` ConversationHandler | ✅ |
| Kontakt yoki matn orqali telefon olish | `bot.py` | ✅ |
| `_normalize_phone` (backend bilan bir xil mantiq) | `bot.py` | ✅ |
| `create_otp_via_api`: POST `/api/v1/auth/telegram/otp/create/`, body `secret_key`, `telegram_id`, `phone_number` | `bot.py` | ✅ |
| Xato: 403 → log + foydalanuvchiga tushuntirish | `bot.py` | ✅ |
| Kodni foydalanuvchiga yuborish + REGISTER_URL havolasi | `bot.py` | ✅ |

**Bot env (`.env` yoki Railway):**

- `BOT_TOKEN` — @BotFather token.
- `WEBSITE_URL` — backend asosiy URL (masalan `https://api.wibestore.net`). **Localhost emas** production uchun.
- `BOT_SECRET_KEY` yoki `TELEGRAM_BOT_SECRET` — backend'dagi `TELEGRAM_BOT_SECRET` bilan **bir xil**.
- `REGISTER_URL` — frontend ro'yxatdan o'tish sahifasi (masalan `https://wibestore.net/register`).

---

## 4. Frontend tekshiruv

| Tekshiruv | Joyi | Holat |
|-----------|------|--------|
| Signup sahifasida "Telegram orqali ro'yxatdan o'tish" bloki | `src/pages/SignupPage.jsx` | ✅ |
| Telefon (kamida 9 raqam) + 6 xonali kod validatsiyasi | `SignupPage.jsx` handleTelegramSignup | ✅ |
| Telefonni yuborishdan oldin normalizatsiya (+998...) | `SignupPage.jsx` | ✅ |
| `registerWithTelegram(phone, code)` | `src/context/AuthContext.jsx` | ✅ |
| So'rov: `POST /auth/register/telegram/`, body `{ phone, code }`, `withCredentials: true` | `AuthContext.jsx` | ✅ |
| Muvaffaqiyat: `tokens` va `user` ni saqlash, `setUser` / `setTokens` | `AuthContext.jsx` | ✅ |
| Xato: backend `error.message` yoki `detail` ni foydalanuvchiga ko'rsatish | `AuthContext.jsx` + `SignupPage.jsx` | ✅ |
| Login modalida Telegram tugmasi (bot havolasi) | `src/components/LoginModal.jsx` | ✅ |
| `VITE_TELEGRAM_BOT_USERNAME` (ixtiyoriy) | `.env` / build | ✅ |
| `VITE_API_BASE_URL` — production'da backend URL | frontend build env | ✅ |

---

## 5. Xavfsizlik

- Kod **10 daqiqa** amal qiladi, **bir marta** ishlatiladi.
- Bot–backend orasida **TELEGRAM_BOT_SECRET** orqali autentifikatsiya.
- JWT **httpOnly** cookie'da (XSS himoya); body'da ham qaytariladi (cookie cross-domain bo'lmasa).
- Auth endpoint'larda **throttle** (rate limit) qo'llanadi.
- Production'da **HTTPS** va to'g'ri **CORS** talab qilinadi.

---

## 6. Tez tekshirish (lokaldan)

1. Backend: `cd wibestore_backend && python manage.py runserver`
2. Bot: `cd telegram_bot && python bot.py` (bitta instance).
3. Frontend: `npm run dev`, `/register` ochib, Telegram blokida telefon + kodni kiriting.
4. Botda `/start` → telefon yuboring → kodni olib, saytda kiriting → ro'yxatdan o'tish muvaffaqiyatli bo'lishi kerak.

Agar "Backend ishlamayotgan" yoki 403 chiqsa: `TELEGRAM_BOT_SECRET` (backend) va `BOT_SECRET_KEY` (bot) **bir xil** ekanligini tekshiring.

---

## 7. Xulosa

Integratsiya **mukammal** qilib qo'yilgan: backend (OTP yaratish + ro'yxatdan o'tish + JWT/cookie), bot (kod olish + havola) va frontend (forma + API chaqiruvi + token/user saqlash) barchasi bog'langan. Production'da faqat env o'zgaruvchilarini to'g'ri o'rnatish va bitta bot instance ishlatish kifoya.
