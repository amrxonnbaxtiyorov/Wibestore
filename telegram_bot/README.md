# 🤖 Telegram Bot — WibeStore ro'yxatdan o'tish (OTP)

Bot orqali foydalanuvchi telefon raqamini yuboradi → 6 xonali kod oladi → saytda telefon + kodni kiritib ro'yxatdan o'tadi.

## Oqim

```
Foydalanuvchi     Telegram Bot              WibeStore Backend        Sayt (frontend)
     │                  │                           │                        │
     │── /start ───────►│                           │                        │
     │◄── "Telefon?" ───│                           │                        │
     │                  │                           │                        │
     │── +998901234567 ─►│                           │                        │
     │                  │── POST /api/v1/auth/      │                        │
     │                  │   telegram/otp/create/ ──►│                        │
     │                  │   {secret_key, telegram_id, phone_number}          │
     │                  │◄── {code: "123456"}       │                        │
     │◄── "Kodingiz: 123456" (10 min)                │                        │
     │                  │                           │                        │
     │────────────────────────────────────────────── Saytda /signup ────────►│
     │                  │                           │◄── POST register/telegram
     │                  │                           │    {phone, code}       │
     │                  │                           │── User yaratadi, JWT    │
     │                  │                           │    (httpOnly cookie) ──►│
```

## O'rnatish

### 1. Backend (WibeStore)

- `TELEGRAM_BOT_SECRET` yoki `BOT_SECRET_KEY` ni `.env` ga qo'shing (bot create-otp uchun).
- Migratsiya: `python manage.py migrate` (accounts 0003_telegram_registration).

### 2. Bot

```bash
cd telegram_bot
pip install python-telegram-bot==20.7 requests
```

`.env` yoki muhit o'zgaruvchilari:

| O'zgaruvchi | Tavsif |
|-------------|--------|
| `BOT_TOKEN` | @BotFather dan olingan token |
| `WEBSITE_URL` | Backend asosiy URL (masalan `http://localhost:8000`) |
| `BOT_SECRET_KEY` yoki `TELEGRAM_BOT_SECRET` | Backend bilan bir xil maxfiy kalit |
| `REGISTER_URL` | Frontend ro'yxatdan o'tish sahifasi (masalan `http://localhost:5173/signup`). `/register` ham `/signup` ga yo'naltiradi. |

### 3. Ishga tushirish

```bash
# Terminal 1 — backend
cd wibestore_backend && python manage.py runserver

# Terminal 2 — bot
cd telegram_bot && python bot.py
```

Frontendda `/signup` (yoki `/register`) sahifasida telefon + kod kiritiladi, so'rov `POST /api/v1/auth/register/telegram/` ga yuboriladi.

## API (WibeStore backend)

| Method | URL | Tavsif |
|--------|-----|--------|
| POST | `/api/v1/auth/telegram/otp/create/` | Bot uchun kod yaratish (secret_key, telegram_id, phone_number) |
| POST | `/api/v1/auth/register/telegram/` | Ro'yxatdan o'tish: phone, code → User + JWT (va httpOnly cookie) |

## Conflict: "only one bot instance running"

Agar logda `Conflict: terminated by other getUpdates request` ko'rsa — **bitta token bilan faqat bitta bot instance** ishlashi kerak. Quyilarni tekshiring:

- **Railway:** Bitta Telegram Bot servisi bo'lsin, replica 1.
- **Lokal:** Botni Railway'da ishlatayotgan bo'lsangiz, kompyuteringizda `python bot.py` ishlamasin (yoki aksincha).
- **Webhook:** Agar oldin webhook ishlatilgan bo'lsa, @BotFather orqali webhook ni o'chirib, keyin polling qayta ishga tushiring.

## Xavfsizlik

- Kod **10 daqiqa** amal qiladi, **bir marta** ishlatiladi.
- JWT access token **httpOnly** cookie'da (XSS himoya).
- Registratsiya endpoint'i **rate limit** (auth throttle).
- Production'da **HTTPS** va `TELEGRAM_BOT_SECRET` maxfiy saqlanishi kerak.
