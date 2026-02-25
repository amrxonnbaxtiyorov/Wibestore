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
