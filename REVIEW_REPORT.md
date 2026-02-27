# WibeStore sayt tekshiruvi — kamchiliklar va muammolar

## 1. Kritik / tez tuzatish kerak

### 1.1 ~~Parolni tiklash sahifasi (ForgotPasswordPage) — mock~~ ✅ Tuzatildi
- **Muammo:** `/forgot-password` sahifasida form yuborilganda haqiqiy API chaqirilmaydi edi.
- **Tuzatildi:** ForgotPasswordPage endi `useAuth().resetPassword(email)` chaqiradi; xato bo‘lsa foydalanuvchiga ko‘rsatiladi.

### 1.2 ~~Parol uzunligi nomuvofiqlik~~ ✅ Tuzatildi
- **Tuzatildi:** Hammada parol **8 ta** belgidan kam bo‘lmasligi qabul qilindi. SettingsPage validatsiyasi 8 ga o‘zgartirildi, uz/en/ru tarjimalarida "kamida 8 ta belgi" qo‘yildi.

---

## 2. Tarjimalar (i18n)

### 2.1 ~~Yo‘q kalitlar (sort_views, load_more)~~ ✅ Tuzatildi
- **products.sort_views** va **products.load_more** — uz, en, ru locale’larga qo‘shildi.

### 2.2 ~~ErrorBoundary matnlari~~ ✅ Tuzatildi
- **Tuzatildi:** `error_boundary` bo‘limi uz/en/ru locale’larga qo‘shildi. ErrorBoundary `localStorage['wibeLanguage']` orqali tilni oladi va mos matnlarni ko‘rsatadi.

---

## 3. Foydalanuvchi tajribasi (UX)

### 3.1 Login sahifasi — redirect
- **Holat:** AuthGuard `state={{ from: location, redirect: location.pathname }}` yuboradi. LoginPage `location.state?.from?.pathname` dan redirect oladi — to‘g‘ri ishlaydi.
- **Taklif:** Agar `state.redirect` ham saqlanib, keyingi qadamlar uchun ishlatish mumkin (masalan, "Siz … sahifaga yo‘naltirilmoqdasiz" ko‘rsatish).

### 3.2 Sozlamalar — profil
- **Holat:** Profil saqlashda faqat `full_name` va `phone_number` yuboriladi; email faqat "Emailni o‘zgartirish" (tasdiqlash kodi) orqali o‘zgaradi — to‘g‘ri.
- **Eslatma:** Backend `PATCH /auth/me/` da email qabul qilmasligi yoki frontend tomonidan yuborilmasligi kerak, aks holda tasdiqlashsiz email o‘zgarishi mumkin.

---

## 4. Xavfsizlik va API

### 4.1 API client
- **Yaxshi:** Base URL ataması faqat env orqali; refresh token, 401 da logout, retry logikasi mavjud.
- **Yaxshi:** `validateApiUrl` va ruxsat berilgan domenlar ro‘yxati bor.

### 4.2 Auth
- **Yaxshi:** AuthGuard, AdminGuard, GuestGuard to‘g‘ri qo‘llanilgan; token localStorage’da; 401 dan keyin tozalash va login’ga yo‘naltirish.

---

## 5. Boshqa kuzatishlar

### 5.1 Console.log / error
- AuthContext va apiClient da `console.error` ishlatiladi — development va monitoring uchun maqul. Production’da Sentry yoki boshqa xizmat orqali yig‘ilsa yaxshi.

### 5.2 Accessibility (a11y)
- App.jsx da "Skip to content" va `main id="main-content" role="main"` mavjud — yaxshi.
- Ba’zi tugmalar/inputlar da `aria-label` bor; barcha interfeys elementlari uchun tekshirib, yetishmasa qo‘shish tavsiya etiladi.

### 5.3 Statistics sahifa
- `/statistics` AuthGuard’siz — ochiq statistika sahifasi bo‘lishi mumkin. Agar faqat kirgan foydalanuvchilar uchun bo‘lishi kerak bo‘lsa, AuthGuard qo‘shish kerak.

---

## 6. Qisqacha tavsiyalar (bajarilganlar belgilandi)

| Tartib | Narsa | Holat |
|--------|--------|--------|
| 1 | ForgotPasswordPage | ✅ API bilan ulandi |
| 2 | Parol uzunligi | ✅ 8 ga birlashtirildi |
| 3 | products.sort_views, load_more | ✅ Tarjimalar qo‘shildi |
| 4 | ErrorBoundary | ✅ error_boundary i18n qo‘shildi |
| 5 | ProfilePage listing image | ✅ images[0].image ishlatiladi |
| 6 | Login ?redirect= | ✅ Query param qo‘llaniladi |
| 7 | Reset password confirm | ✅ /reset-password sahifa va route |
| 8 | SellPage i18n | ✅ Validatsiya va featureOptions t() |
| 9 | AdminLogin i18n | ✅ admin.* tarjimalar |
| 10 | Statistics | Kerak bo‘lsa AuthGuard qo‘shish (ixtiyoriy) |

---

*Hisobot yangilandi: 2026-02-28*
