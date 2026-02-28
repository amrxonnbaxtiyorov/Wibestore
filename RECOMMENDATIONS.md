# WibeStore — qo‘shimcha funksiyalar va yaxshilashlar maslahati

Quyida saytni yanada foydalanuvchilar va sotuvchilar uchun qulayroq qilishga yordam beradigan qo‘shimchalar ro‘yxati.

---

## Yuqori ustuvorlik (tez ta’sir)

### 1. **Akkauntlarni solishtirish (Compare)**
- Navbarda "Solishtirish" bor, lekin sahifa/funksiya bo‘lmasa, qo‘shish ma’qul.
- **Nima:** 2–3 ta akkauntni bir sahifada narx, reyting, xususiyatlar bo‘yicha solishtirish.
- **Foyda:** Xaridor qaror qabul qilishi osonlashadi, vaqt tejaydi.

### 2. **E’lonni ijtimoiy tarmoqlarda ulashish**
- Akkaunt detali sahifasida "Ulashish" tugmasi (Telegram, nusxalash, havola).
- **Foyda:** Sotuvchilar o‘z e’lonini tezroq tarqatadi, trafik oshadi.

### 3. **"Narxga kuzatish" / xohishlar ro‘yxati**
- Foydalanuvchi akkauntni "Kuzatish"ga qo‘shadi; narx tushsa yoki yangi shartnom bo‘lsa bildirishnoma (email / in-app).
- **Foyda:** Qaytgan foydalanuvchilar ko‘payadi, savdolar oshadi.

### 4. **Sotuvchi reytingi va so‘nggi sharhlar**
- Sotuvchi kartasida aniq reyting (yulduzcha), sotuvlar soni, so‘nggi 1–2 ta sharh.
- **Foyda:** Ishonch oshadi, firibgarlikni kamaytiradi.

---

## O‘rta ustuvorlik (UX va trust)

### 5. **PWA (Progressive Web App)**
- Oflayn rejim, uy ekraniga qo‘shish, push-bildirishnomalar.
- **Foyda:** Mobil foydalanuvchilar uchun ilovaga o‘xshash tajriba.

### 6. **SEO yaxshilash**
- Har bir e’lon va sahifa uchun meta (title, description), Open Graph.
- Sitemap.xml, asosiy sahifalar uchun struktur ma’lumot (JSON-LD).
- **Foyda:** Qidiruv tizimlarida ko‘rinish yaxshilanadi.

### 7. **Sotuvchi dashboard**
- Sotuvchiga: "Bugun ko‘rilganlar", "Sotuvlar", "Daromad" (grafik/statistika).
- **Foyda:** Sotuvchilar platformada qolishga ko‘proq moyil bo‘ladi.

### 8. **Xabarlar / chat yaxshilash**
- Chatda: yuborilgan vaqt, "o‘qildi", fayl/rasm yuborish (agar backend qo‘llab-quvhatlasa).
- **Foyda:** Xaridor–sotuvchi muloqoti osonlashadi.

### 9. **2FA (ikki bosqichli autentifikatsiya)**
- Sozlamalarda 2FA uchun placeholder bor — uni to‘liq ulash (TOTP yoki SMS).
- **Foyda:** Hisob xavfsizligi oshadi.

---

## Pastroq ustuvorlik (yaxshi qo‘shimchalar)

### 10. **Qidiruvni saqlash**
- "Bu qidiruvni saqlash" — keyingi safar kirganda saqlangan filtrlardan birini tanlash.
- **Foyda:** Takroriy xaridorlar tez topadi.

### 11. **Bildirishnoma sozlamalari**
- Sozlamalarda: "Narx tushganda", "Yangi e’lon", "Xabar keldi" kabi turli bildirishnoma turlarini yoqish/o‘chirish.
- **Foyda:** Keraksiz bildirishnomalar kamayadi, foydalanuvchi nazorat qiladi.

### 12. **To‘lov tarixi**
- Profil yoki Sozlamalar: depozitlar, to‘lovlar, komissiyalar ro‘yxati (sana, summa, holat).
- **Foyda:** Shaffoflik va ishonch.

### 13. **Qisqa blog / yangiliklar**
- "Yangiliklar" yoki "Qo‘llanma" bo‘limi: platforma qoidalari, aksiyalar, qisqa maqolalar.
- **Foyda:** SEO va foydalanuvchilarni qayta qo‘nish.

### 14. **Tema: qorong‘u / yorug‘**
- ThemeContext bor — barcha sahifa va komponentlarda to‘liq qo‘llab-quvvatlash va saqlash.
- **Foyda:** Ko‘p foydalanuvchilar qorong‘u rejimni yoqtiradi.

### 15. **Accessibility (a11y)**
- Tugmalar/inputlar uchun `aria-label`, formlar uchun aniq `label`, fokus boshqaruvi.
- **Foyda:** Nogironlik imkoniyati bo‘lgan foydalanuvchilar va qidiruv tizimlari uchun yaxshiroq.

---

## Texnik qo‘shimchalar

- **Sentry (yoki boshqa error tracking):** Production’da xatolarni yig‘ish va `VITE_SENTRY_DSN` orqali ulash.
- **Analytics:** Google Analytics / Yandex.Metrika — sahifa ko‘rish, konversiya, qidiruv.
- **Backend:** Parol tiklash emailida frontend linki to‘g‘ri (`/reset-password?uid=...&token=...`), email shablonlari.

---

## Qisqacha tavsiya tartibi

| # | Funksiya              | Qiyinlik | Ta’sir   |
|---|------------------------|----------|----------|
| 1 | Solishtirish sahifasi  | O‘rta    | Yuqori   |
| 2 | Ulashish (share)       | Past     | Yuqori   |
| 3 | Narxga kuzatish       | O‘rta    | Yuqori   |
| 4 | Sotuvchi reytingi     | Past     | Yuqori   |
| 5 | SEO (meta, sitemap)   | Past     | O‘rta    |
| 6 | PWA                    | O‘rta    | O‘rta    |
| 7 | 2FA                    | Yuqori   | O‘rta    |

Agar birinchi qadamda bitta funksiyani tanlash kerak bo‘lsa, **akkauntlarni solishtirish** yoki **ulashish tugmasi** dan boshlash o‘rinli — ular foydalanuvchiga tez sezilarli foyda beradi va amalga oshirish nisbatan oson.
