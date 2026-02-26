# Log va xatoliklar

## log.txt dagi xatolar

### 1. SSL_do_handshake() failed (502)

**Belgi:**  
`SSL_do_handshake() failed (SSL: error:0A000438:SSL routines::tlsv1 alert internal error:SSL alert number 80) while SSL handshaking to upstream`

**Sabab:** Frontend (masalan Railway) `https://66.33.22.1:443` ga proxy qilganda SSL handshake muvaffaqiyatsiz. Bu **infrastruktura/backend** sozlamalari bilan bog‘liq, frontend kodida emas.

**Qanday tuzatish kerak:**
- Backend (Django/Node va b.) **HTTPS** da to‘g‘ri ishlayotganiga va sertifikat to‘g‘ri ekaniga ishonch hosil qiling.
- Proxy (nginx / Railway) da backend uchun **upstream** manzili to‘g‘ri (host nomi yoki to‘g‘ri IP) va SSL verify kerak bo‘lsa moslashtirilgan bo‘lsin.
- Agar backend faqat HTTP da ishlasa, proxy backend ga **http://** orqali ulanishi kerak (SSL emas).

### 2. API URL da `game=undefined`, `search=undefined`

**Belgi:**  
So‘rovlar shunday chiqardi:  
`/api/v1/listings/?page=1&game=undefined&search=undefined&min_price=undefined&max_price=10000000&ordering=-created_at`

**Tuzatildi (frontend):**
- `useListings` da `cleanFilters()`: `undefined`, `null`, bo‘sh string URL ga yuborilmaydi.
- Endi faqat berilgan (aniq) parametrlar yuboriladi, masalan:  
  `/api/v1/listings/?page=1&limit=24&ordering=-created_at`

Bu logdagi “noto‘g‘ri” URL xatolarini kamaytiradi va backend uchun ham yaxshiroq.

### 3. nginx [notice] — xato emas

`[notice] 1#1: using the "epoll" event method`, `start worker process` va sh.k. — nginx ishga tushishi haqidagi **informatsion** xabarlar. Bular xato emas, tuzatish talab qilmaydi.

---

## Boshqa mahsulotlar sahifasi (to'liq yaxshilangan)

- **Cache:** staleTime 3 min, gcTime 10 min; bitta listing uchun ham retry + cache.
- **Prefetch:** Bosh sahifa yuklanganda `['listings', { ordering: '-created_at' }]` prefetch — /products cache dan tez.
- **Limit:** Products 24 ta/sahifa, bosh sahifa 8 ta; cleanFilters va queryFn to'g'ri.
- **Retry:** useListings/useListing 2 marta, apiClient MAX_RETRIES=2 — 502 da tez xato.
- **URL:** /products?search=... debounce 400ms; Clear all/filters URL ni tozalaydi.
- **Badge:** O'yin filtri slug/id bo'yicha to'g'ri; skeleton 12 ta.

---

## Django backend tuzatishlar (2026)

- **seed_data buyrug‘i:** `apps/core/management/commands/` dan asosiy **core** app ga ko‘chirildi (`core/management/commands/seed_data.py`). Endi `python manage.py seed_data` ishlaydi.
- **Production xavfsizlik:** Production sozlamalarida default **SECRET_KEY** ishlatilsa dastur ishga tushmaydi (ValueError). **FERNET_KEY** bo‘lmasa yoki dummy bo‘lsa ogohlantirish chiqadi.
- **PasswordHistory:** Django admin da ro‘yxatdan o‘tkazildi (Accounts → Password histories).
- **Hujjatlashtirish:** `.env.example` va settings da production uchun SECRET_KEY, FERNET_KEY, DATABASE_URL majburiy ekani ko‘rsatilgan.

### Django admin 500 (Games va boshqa sahifalar)

- **Sabab:** `/admin/games/game/` da GameAdmin `get_queryset()` ichida `Count` + `filter=Q(...)` annotatsiyasi murakkab JOIN keltirib, ba’zan 500 yoki noto‘g‘ri natija berardi.
- **Tuzatish:** GameAdmin da annotatsiya olib tashlandi; “Active Listings” endi `obj.listings.filter(status="active").count()` orqali hisoblanadi (admin uchun N+1 maqbul).
- **Seed_data:** Game va SubscriptionPlan, Category modellariga moslashtirildi (modelda yo‘q bo‘lgan `name_uz`, `name_ru`, `category`, `price` olib tashlandi).

### Admin 500 davom etsa (Games / boshqa sahifalar)

- **Ehtimoliy sabab:** Production DB da jadval yo‘q yoki migratsiyalar qo‘llanmagan. Loyihada `apps/*/migrations/` papkalari bo‘sh edi.
- **Qilingan:** Barcha applar uchun `migrations/__init__.py` qo‘shildi. Game admin: `list_editable` va “Active Listings” ustuni olib tashlandi, xatolik logga yoziladi.
- **Siz qilishingiz kerak:** Backend (yoki Railway) da bir marta: `python manage.py makemigrations`, keyin `python manage.py migrate`. Keyin backend ni qayta ishga tushiring (redeploy). Agar 500 davom etsa, Railway → Deployments → View logs da aniq xato matnini ko‘ring.

---

## log.txt — backend 500 va Redis/DB xatolari (tuzatilgan)

### 1. Redis ConnectionError: localhost:6379 Connection refused

**Belgi (log.txt):**  
`redis.exceptions.ConnectionError: Error 111 connecting to localhost:6379. Connection refused`  
`GET /api/v1/games/ 500`, `GET /api/v1/listings/ 500`

**Sabab:** Production (Railway) da Redis servisi yo‘q, lekin cache/session Redis ga ulanishga urinadi (default `redis://localhost:6379`).

**Tuzatish (production.py):**  
- Redis faqat REDIS_URL **berilgan va localhost emas** bo‘lsa ishlatiladi.  
- REDIS_URL bo‘sh yoki localhost bo‘lsa cache = **LocMemCache**, CHANNEL_LAYERS = **InMemoryChannelLayer**, AXES = **AxesDatabaseHandler**.  
- Shuning uchun Redis bo‘lmasa ham backend 500 bermaydi.

**Siz qilishingiz kerak:** Railway da **REDIS_URL** o‘rnatmasangiz, hozirgi o‘zgarishlar yetadi. Agar Redis ishlatmoqchi bo‘lsangiz, Railway Redis plugin qo‘shib, REDIS_URL ni o‘shanda berilgan qiymatga o‘rnating.

### 2. relation "listings" / "games" does not exist

**Belgi (log.txt):**  
`django.db.utils.ProgrammingError: relation "listings" does not exist`  
`psycopg.errors.UndefinedTable: relation "games" does not exist`  
`GET /api/v1/listings/ 500`, `GET /api/v1/games/ 500`

**Sabab:** Migratsiyalar qo‘llanmagan, PostgreSQL da `listings`, `games` va boshqa jadvallar yaratilmagan.

**Tuzatish:**  
- **entrypoint.sh** da deploy vaqtida avval `python manage.py makemigrations --noinput` (kerak bo‘lsa), keyin `python manage.py migrate --noinput` ishlatiladi.  
- Birinchi deployda migratsiyalar yaratiladi va jadvallar paydo bo‘ladi.

**Siz qilishingiz kerak:** Backend ni **qayta deploy** qiling (yangi entrypoint ishlashi kerak). Agar jadvalar hali bo‘lmasa, Railway logda “Applying migrations” va “Creating migrations” xabarlarini tekshiring.

### 3. 401 (Unauthorized) — xato emas

Logda `GET /api/v1/listings/ 401`, `GET /api/v1/games/ 401` — token muddati tugagan yoki yo‘q bo‘lganda normal javob. Keyin `/auth/refresh/` so‘rov yuboriladi. Tuzatish talab qilmaydi.
