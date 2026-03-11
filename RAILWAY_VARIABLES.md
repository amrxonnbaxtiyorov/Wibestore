# Railway — Barcha servislar uchun Variables (copy-paste tayyor)

Quyida **har bir servis** uchun Railway Variables bo‘limiga **nom = qiymat** ko‘rinishida kiritishingiz mumkin. Reference’lar `${{Servis.VARIABLE}}` ko‘rinishida.

**Eslatma:** Railway’da Postgres va Redis servislari odatda o‘z `RAILWAY_PRIVATE_DOMAIN`, `RAILWAY_TCP_PROXY_*` va boshqa o‘zgaruvchilarni o‘zlari yaratadi. Siz faqat **Backend, Frontend, Telegram Bot** va kerak bo‘lsa **Postgres/Redis** qo‘lda o‘zgaruvchilarini to‘ldirasiz.

---

## 1. Redis servisi — to‘g‘ridan-to‘g‘ri joylash (copy-paste)

Redis servisi → Variables → Raw Editor (yoki bittadan Name/Value). Quyidagi blokni nusxalab joylashtiring:

```
REDIS_PASSWORD="<your-redis-password>"
REDIS_PUBLIC_URL="redis://default:${{REDIS_PASSWORD}}@${{RAILWAY_TCP_PROXY_DOMAIN}}:${{RAILWAY_TCP_PROXY_PORT}}"
REDIS_URL="redis://${{REDISUSER}}:${{REDIS_PASSWORD}}@${{REDISHOST}}:${{REDISPORT}}"
REDISHOST="${{RAILWAY_PRIVATE_DOMAIN}}"
REDISPASSWORD="${{REDIS_PASSWORD}}"
REDISPORT="6379"
REDISUSER="default"
```

---

## 2. Postgres servisi — to‘g‘ridan-to‘g‘ri joylash (copy-paste)

Postgres servisi → Variables. Quyidagi blokni nusxalab joylashtiring (typo tuzatilgan — ortiqcha `}` yo‘q):

```
DATABASE_PUBLIC_URL="postgresql://${{PGUSER}}:${{POSTGRES_PASSWORD}}@${{RAILWAY_TCP_PROXY_DOMAIN}}:${{RAILWAY_TCP_PROXY_PORT}}/${{PGDATABASE}}"
DATABASE_URL="postgresql://${{PGUSER}}:${{POSTGRES_PASSWORD}}@${{RAILWAY_PRIVATE_DOMAIN}}:5432/${{PGDATABASE}}"
PGDATA="/var/lib/postgresql/data/pgdata"
PGDATABASE="${{POSTGRES_DB}}"
PGHOST="${{RAILWAY_PRIVATE_DOMAIN}}"
PGPASSWORD="${{POSTGRES_PASSWORD}}"
PGPORT="5432"
PGUSER="${{POSTGRES_USER}}"
POSTGRES_DB="railway"
POSTGRES_PASSWORD="<your-postgres-password>"
POSTGRES_USER="postgres"
```

---

## 3. Backend servisi — to‘g‘ridan-to‘g‘ri joylash (copy-paste)

Backend servisi → Variables. Quyidagi blokni nusxalab joylashtiring.  
**SECRET_KEY** ni avval generatsiya qiling (pastdagi buyruq), keyin `SECRET_KEY="..."` o‘rniga chiqqan qiymatni qo‘ying.  
**DATABASE_URL** va **DATABASE_PUBLIC_URL** — Railway’da Reference ishlatishingiz kerak bo‘lsa: Add Variable → Add Reference → Postgres → DATABASE_URL / DATABASE_PUBLIC_URL.

```
ALLOWED_HOSTS="backend-production-97516.up.railway.app,.railway.app"
CORS_ALLOWED_ORIGINS="https://frontend-production-76e67.up.railway.app"
CSRF_TRUSTED_ORIGINS="https://backend-production-97516.up.railway.app,https://frontend-production-76e67.up.railway.app"
DATABASE_PUBLIC_URL="${{Postgres.DATABASE_PUBLIC_URL}}"
DATABASE_URL="${{Postgres.DATABASE_URL}}"
REDIS_URL="redis://default:oDtIHqCCjcqaPaHQbqIdphOGKxDCdGXq@${{Redis.RAILWAY_PRIVATE_DOMAIN}}:6379"
SECRET_KEY="BURGA_GENERATSIA_QILINGAN_KALIT"
TELEGRAM_BOT_SECRET="wibestore-telegram-bot-secret-2024"
VITE_ADMIN_USERNAME="admin"
VITE_API_BASE_URL="https://backend-production-97516.up.railway.app/api/v1"
VITE_APP_ENV="production"
VITE_TELEGRAM_BOT_USERNAME="wibestorebot"
VITE_WS_BASE_URL="wss://backend-production-97516.up.railway.app"
```

**SECRET_KEY** generatsiya (terminalda bajarib, chiqqan qatorni `SECRET_KEY="..."` o‘rniga qo‘ying):
```bash
python -c "from django.core.management.utils import get_random_secret_key; print(get_random_secret_key())"
```

---

## 4. Frontend servisi — to‘g‘ridan-to‘g‘ri joylash (copy-paste)

Frontend servisi → Variables. Quyidagi blokni nusxalab joylashtiring. Keyin **Redeploy** qiling.

```
BACKEND_URL="https://backend-production-97516.up.railway.app/"
VITE_ADMIN_PASSWORD="<your-admin-password>"
VITE_ADMIN_USERNAME="admin"
VITE_API_BASE_URL="https://backend-production-97516.up.railway.app/api/v1"
VITE_APP_ENV="production"
VITE_APPWRITE_ENDPOINT="https://cloud.appwrite.io/v1"
VITE_APPWRITE_PROJECT_ID="appwrite_project_id"
VITE_EMAILJS_PUBLIC_KEY="emailjs_public_key"
VITE_EMAILJS_SERVICE_ID="emailjs_service_id"
VITE_EMAILJS_TEMPLATE_ID="emailjs_template_id"
VITE_GOOGLE_CLIENT_ID="481518038748-mraubsfrm6qicdr2dcuk3o4vodemn98h.apps.googleusercontent.com"
VITE_TELEGRAM_BOT_USERNAME="wibestorebot"
VITE_WS_BASE_URL="wss://backend-production-97516.up.railway.app"
```

---

## 5. Telegram Bot servisi — to‘g‘ridan-to‘g‘ri joylash (copy-paste)

Telegram Bot servisi → Variables. Quyidagi blokni nusxalab joylashtiring.

```
BOT_SECRET_KEY="<your-bot-secret-key>"
BOT_TOKEN="<your-telegram-bot-token>"
REGISTER_URL="https://frontend-production-76e67.up.railway.app/signup"
WEBSITE_URL="https://backend-production-97516.up.railway.app"
```

**Eslatma:** `BOT_SECRET_KEY` va Backend’dagi `TELEGRAM_BOT_SECRET` bir xil bo‘lishi shart.

---

## 6. Qisqa tartib (copy-paste qilish ketma-ketligi)

1. **Postgres** — agar template’dan qo‘shilgan bo‘lsa, faqat parol/o‘zgaruvchilarni tekshiring; xato bo‘lsa **DATABASE_PUBLIC_URL** dagi ortiqcha `}` ni olib tashlang.
2. **Redis** — template’dan bo‘lsa, `REDIS_PASSWORD` va boshqalarni tekshiring.
3. **Backend** — yuqoridagi 3-bo‘limdagi jadvaldan barcha o‘zgaruvchilarni qo‘ying; `DATABASE_URL` / `DATABASE_PUBLIC_URL` uchun Reference tanlang; `SECRET_KEY` ni generatsiya qilib qo‘ying.
4. **Frontend** — 4-bo‘limdagi jadvaldan barcha o‘zgaruvchilarni qo‘ying, keyin **Redeploy**.
5. **Telegram Bot** — 5-bo‘limdagi to‘rtta o‘zgaruvchini qo‘ying.

---

## 7. URL’lar xulosasi (bir xil bo‘lishi kerak)

| Qayerda | Qaysi URL |
|---------|-----------|
| Backend (asl domen) | `https://backend-production-97516.up.railway.app` |
| Frontend | `https://frontend-production-76e67.up.railway.app` |
| API base (Frontend/Backend) | `https://backend-production-97516.up.railway.app/api/v1` |
| WebSocket | `wss://backend-production-97516.up.railway.app` |
| Ro‘yxatdan o‘tish (Bot) | `https://frontend-production-76e67.up.railway.app/signup` |

Agar Backend domeningiz boshqa bo‘lsa (masalan `exemplary-fascination-production-9514.up.railway.app`), yuqoridagi **backend-production-97516** o‘rniga o‘sha domenni barcha joyda almashtiring.

---

## 8. 502 Bad Gateway yoki "Application failed to respond"

Agar Backend sahifasi 502 qaytarsa yoki frontend akkauntlar/o‘yinlarni ko‘rsatmasa, batafsil qadamlar: **[RAILWAY_502_TROUBLESHOOTING.md](../RAILWAY_502_TROUBLESHOOTING.md)**.

---

## 9. "Bog'lanish xatosi" chiqsa (Frontend sahifada)

Bu xabar frontend backend API’ga so‘rov yuborayotganda javob olmasa ko‘rinadi.

**Tekshiring:**

1. **Frontend** servisida `VITE_API_BASE_URL` va `VITE_WS_BASE_URL` **Backend** ning haqiqiy URL’i (yuqoridagi jadvaldagidek). Backend domeni Frontend domenidan **boshqa** (alohida servis).
2. O‘zgaruvchilarni o‘zgartirgach **Frontend** ni **Redeploy** qiling — Vite env’ni faqat build vaqtida o‘qiydi, shuning uchun yangi build kerak.
3. Backend servisi ishlayotganini tekshiring: brauzerda `https://YOUR_BACKEND_URL/api/v1/` ochib ko‘ring (401 yoki JSON javob bo‘lsa backend ishlayapti).
4. CORS: Backend’da `CORS_ALLOWED_ORIGINS` da Frontend manzilingiz (masalan `https://frontend-production-76e67.up.railway.app`) bo‘lishi kerak.

**Variables to‘g‘ri bo‘lsa ham:** (1) Frontend Variables o‘zgartirgach **Redeploy** qiling — Vite env faqat build vaqtida o‘qiladi. (2) Brauzerda **F12 → Console** da `[WibeStore] ... Hozir ishlatilayotgan API:` qatorida qaysi URL ishlatilayotganini ko‘ring; to‘liq backend URL bo‘lmasa Frontend’ni qayta build qiling. (3) Backend’da `CORS_ALLOWED_ORIGINS` da frontend domeni aniq (https, slashsiz) bo‘lishi va Backend Redeploy qilingan bo‘lishi kerak.

---

## 10. Frontend build (Railway / Linux)

- **Node:** Loyiha `engines.node >= 20` va `.nvmrc` (22) qo‘llaydi; Railway’da Node 20 yoki 22 ishlatiladi.
- **Build:** `npm run build` (Vite). Lock file bo‘lsa `npm ci --omit=optional`, bo‘lmasa `npm install --omit=optional` — optional (masalan sharp) Linux container’da build xatosiz ishlashi uchun.
- **Ikkita deploy usuli:**
  1. **Dockerfile** (tavsiya): Root’dagi `Dockerfile` frontend uchun. Barcha `VITE_*` o‘zgaruvchilarni **Build time variables** (yoki Docker build args) orqali bering; default bo‘sh, build baribir muvaffaqiyatli bo‘ladi.
  2. **Nixpacks:** `nixpacks.toml` bor; `npm run build` va `npm run start` (Vite preview). Railway o‘zgaruvchilarni build vaqtida avtomatik beradi.
- **Start:** Dockerfile’da nginx + `entrypoint.sh` (PORT va BACKEND_URL). Nixpacks’da `npm run start` — `vite preview --host 0.0.0.0 --port $PORT`.
- **Barqarorlik:** Unicode qo‘shtirnoqlardan saqlanish uchun `node scripts/fix-unicode-quotes.js` ni CI yoki lokal build oldidan işlatish mumkin.
