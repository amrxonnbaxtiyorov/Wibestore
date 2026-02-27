# WibeStore Frontend — Railway’da deploy qilish

## 1. Loyihani Railway’ga ulash

- Repo’ni Railway’ga import qiling yoki GitHub’dan deploy qiling.
- **Root Directory**: frontend uchun loyiha **ildizi** bo‘lishi kerak. Backend uchun **Root Directory** = `wibestore_backend` qo‘ying (shu papkadagi Dockerfile va entrypoint.sh har deployda migrate ishlatadi). Bitta repo’da ikkita Service: frontend (root), backend (`wibestore_backend`).

## 2. Build usuli

- **Dockerfile** ildizda bo‘lgani uchun Railway avtomatik **Docker** orqali build qiladi.
- `Dockerfile` ichida PORT qo‘llab-quvvatlanadi: Railway beradigan `PORT` (odatda 8080) bo‘yicha nginx ishlaydi.

## 3. Environment variables (muhim)

**Frontend Service → Variables** da quyidagilarni qo‘shing.

### 3.1 Runtime (container ishga tushganda) — 405 ni bartaraf qilish

| O‘zgaruvchi | Tavsif | Misol |
|-------------|--------|--------|
| `BACKEND_URL` | Backend ning **asosiy** manzili (protocol + host, yo‘l siz). Nginx `/api/*` so‘rovlarni shu hostga proxy qiladi. **Buni qo‘shmasangiz Google kirish 405 qaytaradi.** | `https://sizning-backend.railway.app` |

- Backend’ni avval deploy qiling, so‘ng uning **public URL**ini (slashsiz: `https://...railway.app`) `BACKEND_URL` ga yozing. Redeploy **kerak emas** — faqat **Redeploy** bosing (container qayta ishga tushadi).

### 3.2 Build vaqtida (Vite)

| O‘zgaruvchi | Tavsif | Misol |
|-------------|--------|--------|
| `VITE_API_BASE_URL` | Brauzer qaysi prefiksga so‘rov yuboradi. **BACKEND_URL** ishlatilsa, default `/api/v1` qoldiring (nginx proxy qiladi). | `/api/v1` yoki `https://...railway.app/api/v1` |
| `VITE_WS_BASE_URL` | WebSocket manzili | `wss://sizning-backend.railway.app` |
| `VITE_GOOGLE_CLIENT_ID` | Google OAuth Client ID | [GOOGLE_OAUTH_SETUP.md](./GOOGLE_OAUTH_SETUP.md) |
| `VITE_SENTRY_DSN` | Sentry DSN | (ixtiyoriy) |

- **HTTP/HTTPS**: production’da `https://` va `wss://` ishlating.

## 4. Port sozlamasi

- Container ichida nginx `PORT` o‘zgaruvchisi orqali ishlaydi (Railway uni o‘zi beradi).
- Qo‘shimcha port sozlash odatda kerak emas.

## 5. Xatoliklar va tekshirish

- **Blank sahifa / 404**:  
  - Brauzerda **backend** URL to‘g‘rimi tekshiring.  
  - `VITE_API_BASE_URL` va `VITE_WS_BASE_URL` aniq shu backend’ning public manziliga ishorat qilishi kerak.

- **Build xato**:  
  - Railway → **Deployments** → oxirgi deploy → **View Logs**.  
  - Xato matnini ko‘chirib, qayerda uzilganini aniqlang (masalan, `npm run build` yoki Docker qatlami).

- **CORS xatosi**:  
  - Backend’da frontend domeni (masalan `https://sizning-frontend.railway.app`) `CORS_ALLOWED_ORIGINS` ga qo‘shilgan bo‘lishi kerak.

- **O‘zgaruvchilar ishlamayapti**:  
  - `VITE_*` o‘zgaruvchilarini o‘zgartirgach **yangi deploy** (redeploy) qiling; build qayta ishlanadi.

- **Google kirish: "401 invalid client"**: **GOOGLE_OAUTH_SETUP.md** da Google Cloud Console va Railway sozlamalari batafsil. Authorized JavaScript origins ga frontend URL qo‘shing, `VITE_GOOGLE_CLIENT_ID` ni to‘g‘ri yozing va Redeploy qiling.

- **405 Method Not Allowed** (masalan `api/v1/auth/google/` da): Frontend container’da **BACKEND_URL** o‘rnatilmagan. **Yechim:** Railway → Frontend Service → **Variables** → `BACKEND_URL` = `https://sizning-backend.railway.app` (slashsiz) → **Save** → **Redeploy**. Keyin nginx `/api/*` ni backend’ga proxy qiladi va 405 ketadi.

- **503 Service Unavailable** ("Server vaqtincha ishlamayapti"): Backend vaqtincha javob bermayapti (qayta ishga tushmoqda, overload yoki uxlab qolgan). **Yechim:** Bir necha soniyadan keyin qayta urinib ko‘ring. Railway’da backend service **Deployments** va **Logs** ni tekshiring; kerak bo‘lsa backend ni **Redeploy** qiling.

## 6. Qisqa checklist

1. Backend Railway’da deploy qiling va public URL ni oling (masalan `https://xxx.railway.app`).
2. Frontend Service → **Variables**: `BACKEND_URL` = backend URL (slashsiz), `VITE_GOOGLE_CLIENT_ID` = Google Client ID, kerak bo‘lsa `VITE_WS_BASE_URL` = `wss://xxx.railway.app`.
3. **Redeploy** (yoki yangi deploy). Frontend sahifasini ochib, Google kirish va boshqa API’larni tekshiring.
