# Saytni 0 dan ishga tushirish (Fresh launch)

Barcha sotuvlar, sotuvdagi akkauntlar va statistikani tozalab, saytni yangi ochilgandek qilish.

---

## 1. Backend (Django) — barcha ma'lumotlarni nolga qaytarish

Loyiha root'ida emas, **backend** papkasida bajariladi:

```bash
cd wibestore_backend
python manage.py reset_to_zero --full --no-input
```

Bu buyruq:

- Barcha **listing**larni (sotuvdagi akkauntlar) o'chiradi va ulangan ma'lumotlarni ham (rasmlar, favoriteler, ko'rishlar, escrow, sharhlar, reportlar) CASCADE orqali tozalaydi.
- Barcha **transaction**larni (to'lovlar, komissiyalar) o'chiradi.
- Barcha **foydalanuvchilar** uchun statistikani nolga tushuradi: `total_sales=0`, `total_purchases=0`, `balance=0`, `rating=5.00`.

**Qo'shimcha (ixtiyoriy):**

```bash
# Chat va xabarlarni ham tozalash
python manage.py reset_to_zero --full --include-chats --no-input

# Bildirishnomalarni ham tozalash
python manage.py reset_to_zero --full --include-notifications --no-input

# Faqat listinglarni o'chirish (statistika va transactionlar qoladi)
python manage.py reset_to_zero --listings-only --no-input
```

Tasdiq so'ramasdan ishlatish uchun `--no-input` kerak. Tasdiq bilan ishlatmoqchi bo'lsangiz, `--no-input` ni olib tashlang va so'rovda `yes` yozing.

---

## 2. Frontend — cache tozalash

Frontend har safar yuklanganda quyidagi localStorage kalitlarini o'chiradi (eski sotuvlar/sharhlar cache'i bo'lmasin):

- `wibeListings`
- `wibeReviews`
- `wibeSellerRatings`

Statistika va ro'yxatlar endi faqat **API** dan keladi; sayt "0" dan boshlangan ko'rinishda ishlaydi.

---

## 3. Qisqa tartib (lokal yoki server)

1. **Backend:** `cd wibestore_backend` → `python manage.py migrate` (agar kerak bo'lsa) → `python manage.py reset_to_zero --full --no-input`
2. **Frontend:** Qayta build/deploy qiling yoki brauzerda sahifani yangilang — cache avtomatik tozalanadi.
3. Sayt tayyor: sotuvlar 0, statistika 0, balanslar 0.

**Railway (production):** Backend servisida "Settings" → "Deploy" yoki one-off run orqali:
`python manage.py migrate && python manage.py reset_to_zero --full --no-input` (yoki Railway CLI/Shell orqali backend papkada shu buyruqlarni bajarish).

---

## 4. Eslatmalar

- **Migratsiyalar:** `reset_to_zero` ishlatishdan oldin migratsiyalarni qo'llang: `cd wibestore_backend` → `python manage.py migrate`. Agar `no such column: listings.warranty_days` kabi xato chiqsa, demak migrate qilinmagan — avval `migrate`, keyin `reset_to_zero`.
- **Seed data:** Keyin test ma'lumot kiritmoqchi bo'lsangiz, `python manage.py seed_data` (yoki loyihadagi boshqa seed skriptlar) ishlatishingiz mumkin; ular yangi listing va user'lar yaratadi, lekin `reset_to_zero` dan keyin DB yana "toza" bo'ladi.
