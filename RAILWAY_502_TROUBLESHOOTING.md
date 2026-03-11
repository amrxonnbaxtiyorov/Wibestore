# 502 Bad Gateway — Backend ishlamasa (Railway)

**Belgilar:** Brauzerda "502 Bad Gateway" yoki "Application failed to respond"; frontend ochiladi lekin akkauntlar/o‘yinlar chiqmaydi (0 ta), admin sahifasi ochilmaydi.

**Asosiy sabab:** Backend (Django) Railway’da ishga tushmayapti yoki port ochilmayapti. Frontend API so‘rovlari backend’ga boradi → javob kelmaydi → 502.

---

## 1. Tezkor tekshirish

### 1.1 Backend haqiqatan ishlayaptimi?

Brauzerda quyidagi manzilni oching (o‘rniga **o‘z backend domeningizni** yozing):

```
https://SIZNING-BACKEND.up.railway.app/health/
```

Misol: `https://exemplary-fascination-production-9514.up.railway.app/health/`

- **200 OK va `{"status":"ok"}`** → backend ishlayapti; muammo boshqa joyda (masalan, frontend boshqa URL’ga so‘rov yuborayapti).
- **502 / ochilmaydi** → backend container ishga tushmagan yoki port ochilmagan (quyidagi qadamlar kerak).

### 1.2 Frontend qaysi backend’ga so‘rov yuboradi?

Frontend build paytida **VITE_API_BASE_URL** qo‘llaniladi. Agar frontend `exemplary-fascination-production-9514...` ga so‘rov yuborsa, lekin sizda boshqa backend servisi ishlab turgan bo‘lsa (masalan `backend-production-97516...`), URL’larni **birlashtirish** kerak: yoki frontendni to‘g‘ri backend URL bilan qayta build qiling, yoki shu URL’dagi backend’ni to‘g‘ri sozlang.

---

## 2. Railway’da backend loglarini ko‘rish

1. [Railway Dashboard](https://railway.app/dashboard) → loyihangiz → **Backend** servisi.
2. **Deployments** → oxirgi deployment → **View Logs** (yoki **Deploy Logs**).
3. Quyidagilarni qidiring:

| Log matni | Sabab | Yechim |
|-----------|--------|--------|
| `FATAL: DATABASE_URL yoki DATABASE_PUBLIC_URL kerak` | Entrypoint: DB o‘zgaruvchisi yo‘q | Backend servisida **Variables** ga `DATABASE_URL` yoki `DATABASE_PUBLIC_URL` qo‘shing (Postgres Reference) |
| `Production requires a real database` | Django production.py: DB yo‘q yoki localhost | Xuddi shu: Backend → Variables → Postgres’dan Reference (DATABASE_URL / DATABASE_PUBLIC_URL) |
| `migrate failed` / `FATAL: migrate still failed` | Migratsiyalar xato berdi | DB ulanishini tekshiring; kerak bo‘lsa `railway run python manage.py migrate` lokal yoki Railway CLI orqali |
| `ModuleNotFoundError` / `ImportError` | Kod yoki dependency yetishmayapti | `requirements.txt` va Dockerfile to‘g‘ri ekanini tekshiring; qayta deploy |
| `Address already in use` / bind xatosi | Port band | Entrypoint `0.0.0.0:$PORT` ishlatadi; Railway `PORT` beradi — odatda muammo bo‘lmasa kerak |

---

## 3. Backend servisi uchun majburiy o‘zgaruvchilar (Railway Variables)

Backend servisi → **Variables** (yoki **Settings → Variables**):

| O‘zgaruvchi | Majburiy | Izoh |
|-------------|----------|------|
| **DATABASE_URL** yoki **DATABASE_PUBLIC_URL** | **Ha** | Postgres plugin qo‘shilgach: Add Variable → **Add Reference** → Postgres → `DATABASE_URL` yoki `DATABASE_PUBLIC_URL` tanlang. |
| **SECRET_KEY** | Ha (production) | `python -c "from django.core.management.utils import get_random_secret_key; print(get_random_secret_key())"` dan generatsiya qiling. |
| **ALLOWED_HOSTS** | Yaxshi | Masalan: `sizning-backend.up.railway.app,.railway.app` |
| **CORS_ALLOWED_ORIGINS** | Ha (frontend bor bo‘lsa) | Frontend manzili, masalan: `https://frontend-production-76e67.up.railway.app` |
| **CSRF_TRUSTED_ORIGINS** | Ha | Backend va frontend URL’lari, masalan: `https://sizning-backend.up.railway.app,https://sizning-frontend.up.railway.app` |

Postgres **Reference** qo‘shish:

1. Backend servisi → Variables → **New Variable** → **Add Reference**.
2. **Postgres** servisini tanlang → **DATABASE_PUBLIC_URL** yoki **DATABASE_URL**.
3. Saqlang va **Redeploy** qiling.

---

## 4. Frontend va backend URL’larini moslashtirish

- Frontend brauzerda **qaysi backend**’ga so‘rov yuborayotganini bilish: DevTools → Network → XHR/fetch → biror API so‘rovini oching → Request URL (masalan `https://exemplary-fascination-production-9514.../api/v1/listings/`).
- Bu URL **sizning haqiqiy backend** domeningiz bilan bir xil bo‘lishi kerak.

Agar backend boshqa domenda ishlasa (masalan `backend-production-97516.up.railway.app`):

1. **Frontend** build oldidan **Variables** da (yoki `.env.production` da) quyidagilarni o‘rnating:
   - `VITE_API_BASE_URL=https://backend-production-97516.up.railway.app/api/v1`
   - `VITE_WS_BASE_URL=wss://backend-production-97516.up.railway.app`
2. Keyin frontendni **qayta build** va deploy qiling (Railway’da Redeploy yetmaydi — build env o‘zgarmaguncha yangi build kerak).

Agar backend **exemplary-fascination-production-9514** bo‘lsa, 502 bo‘layotgan bo‘lsa, avval shu backend’ning loglarini ko‘ring va yuqoridagi Variables (ayniqsa DATABASE_URL / DATABASE_PUBLIC_URL) to‘g‘ri ekanini tekshiring.

---

## 5. Qisqacha tekshiruv ro‘yxati

- [ ] Railway’da **Postgres** plugin qo‘shilgan va Backend servisi bilan bir loyihada.
- [ ] Backend servisida **Variables** da **DATABASE_URL** yoki **DATABASE_PUBLIC_URL** (Postgres Reference) mavjud.
- [ ] **SECRET_KEY** o‘rnatilgan (production uchun).
- [ ] **CORS_ALLOWED_ORIGINS** va **CSRF_TRUSTED_ORIGINS** da frontend va backend URL’lari to‘g‘ri.
- [ ] Backend **Deploy Logs** da “FATAL” yoki “ValueError” yo‘q; oxirida “Starting gunicorn on port ...” ko‘rinadi.
- [ ] Brauzerda `https://BACKEND-DOMAIN/health/` 200 qaytaradi.
- [ ] Frontend build **VITE_API_BASE_URL** va **VITE_WS_BASE_URL** backend’ning haqiqiy domeniga yo‘naltirilgan.

Bular bajarilgach 502 odatda ketadi va frontend akkauntlar/o‘yinlarni ko‘rsata boshlaydi.
