# Payment Bot System — To'liq Texnik Hujjat

> **WibeStore** loyihasi uchun Telegram bot orqali qo'lda to'lov tizimi
> **Stack:** Python 3.11+ · aiogram 3.x · SQLAlchemy 2.x · SQLite/PostgreSQL
> **Sana:** 2026-03-07

---

## Mundarija

1. [Arxitektura tavsifi](#1-arxitektura-tavsifi)
2. [Bot ishlash mantiqi](#2-bot-ishlash-mantiqi)
3. [Ma'lumotlar bazasi tuzilishi](#3-malumotlar-bazasi-tuzilishi)
4. [Modullar tavsifi](#4-modullar-tavsifi)
5. [O'rnatish bo'yicha yo'riqnoma](#5-ornatish-boyicha-yoriqnoma)
6. [Ishga tushirish bo'yicha yo'riqnoma](#6-ishga-tushirish-boyicha-yoriqnoma)
7. [Administrator uchun yo'riqnoma](#7-administrator-uchun-yoriqnoma)
8. [To'lov oqimi (Payment Flow)](#8-tolov-oqimi-payment-flow)
9. [Xatolar va oldini olish](#9-xatolar-va-oldini-olish)

---

## 1. Arxitektura tavsifi

### Arxitektura diagrammasi

```
┌─────────────────────────────────────────────────────────────────┐
│                        Telegram API                              │
└────────────────────────────┬────────────────────────────────────┘
                             │ Polling (HTTPS)
┌────────────────────────────▼────────────────────────────────────┐
│                     aiogram 3.x Dispatcher                       │
│  ┌──────────────┐  ┌──────────────┐  ┌──────────────────────┐  │
│  │  Middleware  │  │   Routers    │  │    FSM Storage       │  │
│  │ (Throttling) │  │ start/payment│  │  (MemoryStorage)     │  │
│  └──────────────┘  │ /admin       │  └──────────────────────┘  │
│                    └──────┬───────┘                              │
└───────────────────────────┼─────────────────────────────────────┘
                            │
┌───────────────────────────▼─────────────────────────────────────┐
│                        Services Layer                            │
│  ┌───────────────────────┐  ┌──────────────────────────────┐   │
│  │   payment_service.py  │  │  notification_service.py     │   │
│  │  (biznes-mantiq)      │  │  (admin xabardor qilish)     │   │
│  └───────────┬───────────┘  └──────────────────────────────┘   │
└──────────────┼──────────────────────────────────────────────────┘
               │
┌──────────────▼──────────────────────────────────────────────────┐
│                      Repository Layer                            │
│  ┌─────────────────────┐  ┌────────────────────────────────┐   │
│  │   user_repo.py      │  │   payment_repo.py              │   │
│  └──────────┬──────────┘  └───────────────┬────────────────┘   │
└─────────────┼─────────────────────────────┼────────────────────┘
              │                             │
┌─────────────▼─────────────────────────────▼────────────────────┐
│          SQLAlchemy 2.x (async) + SQLite / PostgreSQL            │
└─────────────────────────────────────────────────────────────────┘
```

### Dizayn tamoyillari

| Tamoyil | Amalga oshirish |
|---------|-----------------|
| **Separation of Concerns** | Handlers → Services → Repositories — har qatlam o'z vazifasini bajaradi |
| **Repository Pattern** | DB operatsiyalari Repo sinflarda, Handler'lar DB ni bilmaydi |
| **FSM (Finite State Machine)** | aiogram FSM orqali to'lov oqimi holatlari boshqariladi |
| **Anti-Spam** | ThrottlingMiddleware — har foydalanuvchi uchun 1.5s interval |
| **Idempotency** | Bir vaqtda faqat bitta PENDING to'lov ruxsat etiladi |

---

## 2. Bot ishlash mantiqi

### Foydalanuvchi nuqtai nazaridan

```
/start
  └─► Salom xabari + Asosiy menyu

"💳 To'lov qilish"
  ├─► [Tekshirish: kutilayotgan to'lov bormi?]
  │     └─► Ha: "⏳ Kuting" xabari
  └─► Yo'q: To'lov turi tanlash (HUMO | VISA/MC)
              └─► Karta rekvizitlari ko'rsatiladi
                    └─► "Chek rasmini yuboring"
                          ├─► [Rasm emas?] → Xatoyi xabar
                          └─► [Rasm] → Chek qabul qilindi ✅
                                          Admin xabardor qilinadi
                                          └─► Admin tasdiqlaydimi?
                                                ├─► ✅ Tasdiqlash → Foydalanuvchiga "Tasdiqlandi"
                                                └─► ❌ Rad etish  → Foydalanuvchiga "Rad etildi" + Qayta urinish
```

### FSM Holatlari

```
[Idle]
   │
   │  "💳 To'lov qilish"
   ▼
[PaymentFlow.choosing_type]
   │
   │  HUMO / VISA_MC tanlash
   ▼
[PaymentFlow.waiting_receipt]
   │
   │  Rasm yuborish
   ▼
[Idle] ← To'lov yaratildi, FSM tozalandi
```

### Admin nuqtai nazaridan

```
Yangi to'lov → Adminlarga rasm + ma'lumot xabari
                    │
                    ├─► [✅ Tasdiqlash] tugmasi
                    │         └─► payment.status = APPROVED
                    │             Foydalanuvchiga xabar
                    │             Sayt API chaqiriladi (agar sozlangan bo'lsa)
                    │
                    └─► [❌ Rad etish] tugmasi
                              └─► payment.status = REJECTED
                                  Foydalanuvchiga xabar + "Qayta urinish" tugmasi
```

---

## 3. Ma'lumotlar bazasi tuzilishi

### ERD (Entity Relationship Diagram)

```
users
─────────────────────────────────
id          INTEGER   PK AI
telegram_id BIGINT    UNIQUE NOT NULL
username    VARCHAR(64)
first_name  VARCHAR(128)
last_name   VARCHAR(128)
is_banned   BOOLEAN   DEFAULT FALSE
created_at  TIMESTAMP DEFAULT NOW()

        │ 1:M
        │
payments
─────────────────────────────────
id               INTEGER   PK AI
user_id          INTEGER   FK → users.id (CASCADE)
payment_type     ENUM      (HUMO | VISA_MC)
receipt_file_id  VARCHAR(256)    ← Telegram file_id
receipt_path     VARCHAR(512)    ← Serverda saqlangan yo'l
status           ENUM      (PENDING | APPROVED | REJECTED)
admin_message_id BIGINT          ← Admin xabar ID
admin_chat_id    BIGINT          ← Admin chat ID
admin_note       TEXT
reviewed_by      BIGINT          ← Admin telegram_id
created_at       TIMESTAMP DEFAULT NOW()
reviewed_at      TIMESTAMP
```

### To'lov statusi aylanishi

```
      [PENDING]
      /        \
[APPROVED]  [REJECTED]
```

> **MUHIM:** Tasdiqlangan yoki rad etilgan to'lovni qayta o'zgartirib bo'lmaydi.

---

## 4. Modullar tavsifi

### `bot/` — Bot mantiqi

| Fayl/papka | Maqsad |
|------------|--------|
| `main.py` | Bot va Dispatcher ishga tushirish, lifecycle hooks |
| `config.py` | `.env` dan barcha sozlamalarni o'qish |
| `handlers/start.py` | `/start`, `/cancel`, `/help`, asosiy menyu |
| `handlers/payment.py` | To'lov FSM oqimi (tanlash → chek qabul → admin xabardor) |
| `handlers/admin.py` | Admin buyruqlari + inline approve/reject |
| `keyboards/reply.py` | Reply klaviaturalar (asosiy menyu, bekor qilish) |
| `keyboards/inline.py` | Inline klaviaturalar (to'lov turi, admin tugmalari) |
| `middlewares/throttling.py` | Spam himoyasi: har foydalanuvchi uchun interval cheki |
| `states/payment.py` | FSM holatlari: `PaymentFlow.choosing_type`, `waiting_receipt` |
| `services/payment_service.py` | To'lov biznes-mantiqi (yaratish, tasdiqlash, rad etish) |
| `services/notification_service.py` | Adminlarga xabar yuborish |
| `utils/helpers.py` | Yordamchi funksiyalar (rasm yuklab olish, vaqt formatlash) |

### `database/` — Ma'lumotlar qatlami

| Fayl/papka | Maqsad |
|------------|--------|
| `models.py` | SQLAlchemy modellari: `User`, `Payment`, `PaymentType`, `PaymentStatus` |
| `connection.py` | Engine, sessiya fabrikasi, `init_db()`, `close_db()`, `get_session()` |
| `repositories/user_repo.py` | `UserRepository`: CRUD foydalanuvchilar uchun |
| `repositories/payment_repo.py` | `PaymentRepository`: to'lovlar bilan barcha DB operatsiyalari |

---

## 5. O'rnatish bo'yicha yo'riqnoma

### Talablar

- Python **3.11** yoki yangi
- pip yoki poetry

### Qadam 1: Papkaga kirish

```bash
cd payment_bot
```

### Qadam 2: Virtual muhit yaratish

```bash
python -m venv .venv

# Linux / macOS:
source .venv/bin/activate

# Windows (PowerShell):
.venv\Scripts\Activate.ps1

# Windows (CMD):
.venv\Scripts\activate.bat
```

### Qadam 3: Paketlarni o'rnatish

```bash
pip install -r requirements.txt
```

### Qadam 4: `.env` faylini sozlash

```bash
cp .env.example .env
```

`.env` faylini oching va to'ldiring:

```env
# Telegram @BotFather dan oling
BOT_TOKEN=1234567890:AAHxxx...

# Adminlar (vergul bilan, masalan: 123456,789012)
ADMIN_IDS=123456789

# HUMO karta
HUMO_CARD_NUMBER=9860 0803 0123 4567
HUMO_CARD_HOLDER=Abdullayev Akbar

# VISA/MC karta
VISA_CARD_NUMBER=4169 7388 1234 5678
VISA_CARD_HOLDER=Abdullayev Akbar
```

### Qadam 5: Ma'lumotlar bazasini tekshirish

Bot birinchi marta ishga tushganda jadvallar avtomatik yaratiladi. Qo'shimcha amal shart emas.

---

## 6. Ishga tushirish bo'yicha yo'riqnoma

### Lokal ishga tushirish

```bash
cd payment_bot
python -m bot.main
```

Yoki:

```bash
cd payment_bot
python bot/main.py
```

### Production: Systemd (Linux)

`/etc/systemd/system/payment_bot.service`:

```ini
[Unit]
Description=WibeStore Payment Bot
After=network.target

[Service]
Type=simple
User=ubuntu
WorkingDirectory=/opt/payment_bot
ExecStart=/opt/payment_bot/.venv/bin/python -m bot.main
Restart=on-failure
RestartSec=5s
EnvironmentFile=/opt/payment_bot/.env

[Install]
WantedBy=multi-user.target
```

```bash
sudo systemctl daemon-reload
sudo systemctl enable payment_bot
sudo systemctl start payment_bot
sudo systemctl status payment_bot
```

### Production: Docker

`Dockerfile`:

```dockerfile
FROM python:3.11-slim

WORKDIR /app
COPY requirements.txt .
RUN pip install --no-cache-dir -r requirements.txt

COPY . .
RUN mkdir -p receipts logs

CMD ["python", "-m", "bot.main"]
```

```bash
docker build -t payment_bot .
docker run -d \
  --name payment_bot \
  --env-file .env \
  -v $(pwd)/receipts:/app/receipts \
  -v $(pwd)/logs:/app/logs \
  payment_bot
```

### Production: PostgreSQL ulash

`.env` da:

```env
DATABASE_URL=postgresql+asyncpg://username:password@localhost:5432/payment_bot
```

`requirements.txt` ga qo'shing:

```
asyncpg==0.29.0
```

---

## 7. Administrator uchun yo'riqnoma

### Admin kim?

`ADMIN_IDS` da ko'rsatilgan Telegram ID egasi. Botda buyruqlar va inline tugmalar orqali ishlaydi.

### Admin buyruqlari

| Buyruq | Vazifasi |
|--------|----------|
| `/admin` | Bosh panel — statistika va buyruqlar ro'yxati |
| `/pending` | Hali ko'rib chiqilmagan to'lovlar ro'yxati |
| `/stats` | To'lovlar statistikasi (PENDING / APPROVED / REJECTED) |
| `/ban <telegram_id>` | Foydalanuvchini bloklash |
| `/unban <telegram_id>` | Foydalanuvchini blokdan chiqarish |

### To'lovni ko'rib chiqish

Yangi to'lov kelib tushganda admin:

1. Bot rasmli xabar yuboradi:
   - Foydalanuvchi username / ID
   - To'lov turi
   - Vaqt
   - Chek rasmi

2. Xabarda ikkita tugma mavjud:
   - **✅ Tasdiqlash** — to'lovni tasdiqlaydi
   - **❌ Rad etish** — to'lovni rad etadi

3. Tasdiqlanganda:
   - Xabar matniga "✅ TASDIQLANDI (Admin)" qo'shiladi
   - Foydalanuvchiga "To'lov tasdiqlandi" xabari ketadi
   - Sayt API chaqiriladi (sozlangan bo'lsa)

4. Rad etilganda:
   - Xabar matniga "❌ RAD ETILDI (Admin)" qo'shiladi
   - Foydalanuvchiga "To'lov rad etildi" + "Qayta yuborish" tugmasi keladi

### Muhim qoidalar

- Bitta to'lovni faqat **bir marta** ko'rib chiqsa bo'ladi
- Tasdiqlangan/rad etilgan to'lovni qayta o'zgartirib bo'lmaydi
- Bir necha admin bo'lsa, hammasi xabar oladi, lekin faqat birinchi bosgani qaror qabul qiladi

---

## 8. To'lov oqimi (Payment Flow)

### Batafsil sequence diagram

```
Foydalanuvchi          Bot               Admin          Sayt API
     │                  │                  │                │
     │── /start ────────►│                  │                │
     │◄── Menyu ─────────│                  │                │
     │                  │                  │                │
     │── "💳 To'lov" ───►│                  │                │
     │   [PENDING bor?]  │                  │                │
     │◄── Ha: Kuting ────│                  │                │
     │   [Yo'q: davom]   │                  │                │
     │◄── Tur tanlash ───│                  │                │
     │                  │                  │                │
     │── HUMO tanlash ──►│                  │                │
     │◄── Rekvizitlar ───│                  │                │
     │   [FSM: waiting_receipt]             │                │
     │                  │                  │                │
     │── 📸 Chek rasm ──►│                  │                │
     │   [DB: PENDING]   │                  │                │
     │◄── "Qabul qilindi"│                  │                │
     │                  │── 📸 Chek + ─────►│                │
     │                  │   [✅][❌] ────────►│                │
     │                  │                  │                │
     │                  │                  │── ✅ Bosildi    │
     │                  │   [DB: APPROVED] │                │
     │◄── ✅ Tasdiqlandi─│                  │                │
     │                  │────────────────────────────────────►│
     │                  │   POST /api/v1/bot/payment/approve/ │
     │                  │◄─────────────────────────────────── │
     │                  │                  │                │
```

### To'lov statusi o'zgarishi

```sql
-- Yangi to'lov
INSERT INTO payments (user_id, payment_type, receipt_file_id, status)
VALUES (1, 'HUMO', 'BQACAgI...', 'PENDING');

-- Tasdiqlash
UPDATE payments SET status='APPROVED', reviewed_by=123456, reviewed_at=NOW()
WHERE id=1 AND status='PENDING';

-- Rad etish
UPDATE payments SET status='REJECTED', reviewed_by=123456, reviewed_at=NOW()
WHERE id=1 AND status='PENDING';
```

---

## 9. Xatolar va oldini olish

### Mumkin bo'lgan xatolar

| Xato | Sabab | Yechim |
|------|-------|--------|
| `ValueError: BOT_TOKEN o'rnatilmagan` | `.env` da `BOT_TOKEN` yo'q | `.env` faylni to'ldiring |
| `ValueError: ADMIN_IDS o'rnatilmagan` | Admin ID ko'rsatilmagan | `ADMIN_IDS=123456789` qo'shing |
| `TelegramForbiddenError` | Admin bot bilan chat boshlamamagan | Admin `/start` yuboring |
| `aiohttp.ClientConnectorError` | Sayt API ga ulanib bo'lmadi | `SITE_API_URL` ni tekshiring |
| `sqlalchemy.exc.OperationalError` | DB fayli yo'q yoki buzilgan | `payment_bot/` papkasida ishga tushiring |
| Chek rasm saqlanmadi | `receipts/` papkasi yo'q | Papka avtomatik yaratiladi, ruxsatni tekshiring |

### Xavfsizlik choralari

| Xavf | Himoya |
|------|--------|
| **Spam / flood** | `ThrottlingMiddleware` — 1.5s interval |
| **Ikki chek yuborish** | `has_pending()` tekshiruvi — faqat bitta PENDING |
| **Admin buyruqlarini oddiy user ishlatishi** | `_is_admin()` tekshiruvi barcha admin handlerda |
| **Noto'g'ri fayl turi** | `F.photo` filteri — faqat rasmlar qabul qilinadi |
| **SQL injection** | SQLAlchemy ORM parametr binding |
| **Race condition** | `approve()`/`reject()` da `status=PENDING` sharti |

### Loglash

```
logs/bot.log — barcha xabarlar (rotatsiya: 10MB × 5 ta fayl)

Namuna:
2026-03-07 12:00:00 | INFO     | bot.handlers.payment | To'lov #42 yaratildi: user=123456 type=HUMO
2026-03-07 12:01:00 | INFO     | bot.handlers.admin   | To'lov tasdiqlandi: payment_id=42 admin=789012
2026-03-07 12:01:01 | WARNING  | bot.handlers.admin   | Foydalanuvchi 123456 ga xabar yuborib bo'lmadi: ...
```

Log darajasini `.env` da o'zgartirish:

```env
LOG_LEVEL=DEBUG   # Batafsil (ishlab chiqish)
LOG_LEVEL=INFO    # Oddiy (production)
LOG_LEVEL=WARNING # Faqat ogohlantirishlar
```

### Muhim eslatmalar

1. **Bot Token** — hech kimga bermang, `.env` faylni GitHubga yuklamang
2. **Admin ID** — Telegram ID ni `@userinfobot` botidan bilib olish mumkin
3. **Backup** — `payments.db` faylini muntazam nusxalang
4. **Production** — SQLite o'rniga PostgreSQL ishlatish tavsiya etiladi
5. **Cheklar** — `receipts/` papkasi disk joy egallaydi, eski fayllarni tozalang

---

## Loyiha tuzilishi

```
payment_bot/
├── bot/
│   ├── __init__.py
│   ├── main.py                      # Kirish nuqtasi
│   ├── config.py                    # Sozlamalar (.env dan)
│   ├── handlers/
│   │   ├── __init__.py
│   │   ├── start.py                 # /start, /help, /cancel
│   │   ├── payment.py               # To'lov FSM oqimi
│   │   └── admin.py                 # Admin buyruqlari + inline
│   ├── keyboards/
│   │   ├── __init__.py
│   │   ├── reply.py                 # Reply klaviaturalar
│   │   └── inline.py                # Inline klaviaturalar
│   ├── middlewares/
│   │   ├── __init__.py
│   │   └── throttling.py            # Anti-spam
│   ├── states/
│   │   ├── __init__.py
│   │   └── payment.py               # FSM holatlari
│   ├── services/
│   │   ├── __init__.py
│   │   ├── payment_service.py       # Biznes-mantiq
│   │   └── notification_service.py  # Admin xabardor qilish
│   └── utils/
│       ├── __init__.py
│       └── helpers.py               # Yordamchi funksiyalar
├── database/
│   ├── __init__.py
│   ├── connection.py                # DB ulanishi
│   ├── models.py                    # SQLAlchemy modellari
│   └── repositories/
│       ├── __init__.py
│       ├── user_repo.py             # User CRUD
│       └── payment_repo.py          # Payment CRUD
├── receipts/                        # Chek rasmlari (gitignore)
├── logs/                            # Log fayllar (gitignore)
├── .env                             # Sozlamalar (gitignore)
├── .env.example                     # Namuna sozlamalar
├── .gitignore
├── requirements.txt
└── payment_bot_system.md            # Bu hujjat
```

---

*WibeStore Payment Bot — 2026. Barcha huquqlar himoyalangan.*
