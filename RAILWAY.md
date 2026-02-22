# WibeStore Frontend — Railway’da deploy qilish

## 1. Loyihani Railway’ga ulash

- Repo’ni Railway’ga import qiling yoki GitHub’dan deploy qiling.
- **Root Directory**: frontend uchun loyiha **ildizi** bo‘lishi kerak (yoki faqat frontend fayllari bo‘lgan joy). Agar backend boshqa papkada bo‘lsa, bitta repo’da ikkita **Service** yarating: biri frontend (root), ikkinchisi backend (`wibestore_backend`).

## 2. Build usuli

- **Dockerfile** ildizda bo‘lgani uchun Railway avtomatik **Docker** orqali build qiladi.
- `Dockerfile` ichida PORT qo‘llab-quvvatlanadi: Railway beradigan `PORT` (odatda 8080) bo‘yicha nginx ishlaydi.

## 3. Environment variables (muhim)

Build vaqtida Vite bu o‘zgaruvchilarni kod ichiga yozib qo‘yadi. Shuning uchun ularni **Railway → Frontend Service → Variables** da **build oldidan** qo‘shing:

| O‘zgaruvchi | Tavsif | Misol |
|-------------|--------|--------|
| `VITE_API_BASE_URL` | Backend API manzili | `https://sizning-backend.railway.app/api/v1` |
| `VITE_WS_BASE_URL` | WebSocket manzili | `wss://sizning-backend.railway.app` |
| `VITE_GOOGLE_CLIENT_ID` | Google OAuth Client ID (Kirish/Ro'yxatdan o'tish) | [GOOGLE_OAUTH_SETUP.md](./GOOGLE_OAUTH_SETUP.md) bo'yicha sozlang; bo'sh qoldirsangiz Google tugmasi ko'rinmaydi. **401 invalid client** bo'lsa, shu qo'llanmani bajargan holda Client ID va Authorized origins ni tekshiring. |
| `VITE_SENTRY_DSN` | Sentry DSN | (ixtiyoriy) |

- Backend’ni avval deploy qiling, so‘ng uning **public URL**ini (masalan `https://...railway.app`) olib, yuqoridagi `VITE_API_BASE_URL` va `VITE_WS_BASE_URL` ga qo‘ying.
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

- **405 Method Not Allowed** (masalan `api/v1/auth/google/` da): So‘rov frontend domeniga boradi (nginx faqat statik beradi, POST qabul qilmaydi). **Yechim:** Railway → Frontend Service → **Variables** → `VITE_API_BASE_URL` = **to‘liq backend URL** (masalan `https://sizning-backend.railway.app/api/v1`), nisbiy `/api/v1` emas → **Save** → **Redeploy**. Vaqtinchalik (qayta deploy qilmasdan): brauzerda F12 → Console → `localStorage.setItem('wibe_api_base_url', 'https://BACKEND.railway.app/api/v1'); location.reload();` (BACKEND o‘rniga backend service URL).

## 6. Qisqa checklist

1. Backend Railway’da deploy qiling va public URL ni oling.
2. Frontend Service’da `VITE_API_BASE_URL` va `VITE_WS_BASE_URL` ni backend URL ga qo‘ying.
3. O‘zgaruvchilarni saqlang va **Redeploy** bosing.
4. Frontend service’ning public URL ini ochib, sahifa va API chaqiriqlarini tekshiring.
