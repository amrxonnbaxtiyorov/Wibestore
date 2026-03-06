# 🔴 WibeStore Loyihasidagi Barcha Xatolar va Tuzatish Promptlari

> Bu hujjatda WibeStore loyihasidagi **barcha topilgan xatolar** kategoriyalar bo'yicha batafsil yozilgan.
> Har bir xato uchun **tuzatish prompti** (ko'rsatma) berilgan.

---

## 📋 Xulosa

| Kategoriya | Xatolar soni |
|-----------|-------------|
| 🔐 Xavfsizlik | 7 |
| ⚛️ React / ESLint | 10 |
| 🎨 UI / Rang xatolari | 8 |
| 🔗 Routing / Link xatolari | 4 |
| 📊 Data / Ma'lumot xatolari | 3 |
| 🧠 Logika xatolari | 6 |
| **Jami** | **38** |

---

## 🔐 1. XAVFSIZLIK XATOLARI

### 1.1 Admin paroli — ✅ TUZATILGAN
**Fayl:** `src/pages/admin/AdminLogin.jsx`  
**Holat:** Admin login va parol endi **environment variable** orqali olinadi: `VITE_ADMIN_USERNAME` va `VITE_ADMIN_PASSWORD` (`.env` faylda). Kodda hardcode qolgan emas. `.gitignore` da `.env` mavjud.

---

### 1.2 Google OAuth Client ID ochiq kodda
**Fayl:** `src/main.jsx` (6-qator)
```javascript
const CLIENT_ID = "795812779281-bmg0muul5pukfrr3noi2kl32blq6i15k.apps.googleusercontent.com"
```
**Muammo:** Google OAuth client ID source kodda hardcode qilingan.

**✏️ Tuzatish prompti:**
> `main.jsx` faylidagi Google OAuth Client ID ni `.env` faylga `VITE_GOOGLE_CLIENT_ID` sifatida ko'chir va kodda `import.meta.env.VITE_GOOGLE_CLIENT_ID` orqali ishlatish kerak.

---

### 1.3 Appwrite Project ID va Endpoint ochiq kodda
**Fayl:** `src/lib/appwrite.js` (7-8 qator)
```javascript
client
    .setEndpoint('https://fra.cloud.appwrite.io/v1')
    .setProject('697b13ea0001d79ebd81');
```
**Muammo:** Appwrite konfiguratsiyasi kodda ochiq.

**✏️ Tuzatish prompti:**
> `appwrite.js` faylidagi Appwrite endpoint va project ID ni `.env` faylga `VITE_APPWRITE_ENDPOINT` va `VITE_APPWRITE_PROJECT_ID` sifatida ko'chir va `import.meta.env` orqali ishlatish kerak.

---

### 1.4 EmailJS kredentiallari ochiq kodda (2 ta faylda takrorlanmoqda)
**Fayllar:** `src/pages/LoginPage.jsx` (9-11 qator), `src/pages/SignupPage.jsx` (8-10 qator)
```javascript
const EMAILJS_SERVICE_ID = 'service_eh6ud1l';
const EMAILJS_TEMPLATE_ID = 'template_hukqqt4';
const EMAILJS_PUBLIC_KEY = 'Fe_UI6pb3qY22XkZd';
```
**Muammo:** EmailJS kredentiallari ikkita faylda takrorlangan va ochiq kodda.

**✏️ Tuzatish prompti:**
> EmailJS konstantalarini `LoginPage.jsx` va `SignupPage.jsx` fayllaridan olib tashla, ularni bitta `src/lib/emailService.js` faylga ko'chir va `.env` fayldagi environment variablelar orqali foydalanish kerak. Email yuborish funksiyalarini ham shu faylga centralizatsiya qilish kerak. `VITE_EMAILJS_SERVICE_ID`, `VITE_EMAILJS_TEMPLATE_ID`, `VITE_EMAILJS_PUBLIC_KEY` sifatida `.env`ga qo'sh.

---

### 1.5 Parollar localStorage da ochiq (plain text) saqlanmoqda
**Fayl:** `src/context/AuthContext.jsx` (78-95 qator)
```javascript
const newUser = {
    // ...
    password: userData.password, // ⚠️ Plain text parol!
};
registeredUsers.push(newUser);
localStorage.setItem('wibeRegisteredUsers', JSON.stringify(registeredUsers));
```
**Muammo:** Parollar shifrlenmagan holda localStorage da saqlanmoqda.

**✏️ Tuzatish prompti:**
> `AuthContext.jsx` faylidagi `register` funksiyasida parolni localStorage ga saqlashdan oldin hash qilish kerak. `btoa()` yoki sodda hash funksiyasi yordamida shifrlash kerak. Yoki yaxshisi, backend qo'shib, parollarni server tomonida bcrypt bilan hash qilish kerak. Hech qachon plain text parol saqlanmasin.

---

### 1.6 Parolni o'zgartirish joriy parolni tekshirmaydi
**Fayl:** `src/pages/SettingsPage.jsx` (60-84 qator)
```javascript
const handlePasswordChange = async () => {
    // ...
    // Joriy parolni tekshirish yo'q!
    setMessage({ type: 'success', text: 'Parol muvaffaqiyatli o\'zgartirildi!' });
};
```
**Muammo:** Parol o'zgartirish funksiyasi joriy parolni tekshirmaydi va yangi parolni haqiqatda saqlamaydi.

**✏️ Tuzatish prompti:**
> `SettingsPage.jsx` faylidagi `handlePasswordChange` funksiyasini tuzat: 1) localStorage dan `wibeRegisteredUsers` ni oqi, 2) joriy parolni tekshir (mos kelmasа xato ko'rsat), 3) yangi parolni `wibeRegisteredUsers` va `wibeUser` da yangilа. Hozirgi kod faqat "muvaffaqiyat" xabarini ko'rsatadi lekin hech nima saqlamaydi.

---

### 1.7 Admin sessiyasi faqat localStorage da saqlanmoqda
**Fayl:** `src/pages/admin/AdminLogin.jsx`
**Muammo:** Admin autentifikatsiyasi faqat `localStorage.setItem('wibeAdmin', 'true')` bilan amalga oshiriladi — bu osongina manipulyatsiya qilinishi mumkin.

**✏️ Tuzatish prompti:**
> Admin autentifikatsiyasini mustahkamlash kerak: JWT token yoki sessiya-based autentifikatsiya ishlat. Hozirgi holatda istalgan foydalanuvchi brauzer console dan `localStorage.setItem('wibeAdmin', 'true')` yozib admin panelga kirib ketishi mumkin. Backendga o'tguncha kamida admin login vaqtini va tokenni saqlash, har safar AdminLayout da tokenni validatsiya qilish kerak.

---

## ⚛️ 2. REACT / ESLINT XATOLARI

### 2.1 `setState` to'g'ridan-to'g'ri useEffect ichida chaqirilmoqda (8 ta joy)
**Fayllar va qatorlar:**

| Fayl | Qator | O'zgaruvchi |
|------|-------|-------------|
| `AccountCard.jsx` | 17 | `setIsLiked` |
| `Navbar.jsx` | 25 | `setIsMobileMenuOpen` |
| `ReviewList.jsx` | 17 | `setReviews` |
| `AuthContext.jsx` | 14 | `setUser` |
| `ChatContext.jsx` | 18 | `setConversations` |
| `NotificationContext.jsx` | 16 | `setNotifications` |
| `AccountDetailPage.jsx` | 28 | `setHasPurchased` |
| `ProductsPage.jsx` | 41 | `setUserListings` |
| `ProfilePage.jsx` | 34 | `setLikedAccounts` |

**Muammo:** `useEffect` ichida setState chaqirish cascading renders keltirib chiqaradi.

**✏️ Tuzatish prompti:**
> Yuqoridagi fayllarning barchasida `useEffect` ichidagi `setState` chaqiruvlarini tuzatish kerak. Imkon boricha `useState` ning lazy initialization (callback) funksiyasidan foydalanish kerak. Masalan `AccountCard.jsx` da: `useState(() => { const saved = localStorage.getItem(...); return saved ? JSON.parse(saved).includes(account.id) : false; })` qilish kerak. `Navbar.jsx` dagi location o'zgarishida menu yopish uchun esa `useSyncExternalStore` yoki shunchaki `key` prop ishlatish mumkin.

---

### 2.2 O'zgaruvchi e'lon qilinmasdan oldin ishlatilmoqda (2 ta)
**Fayllar:**
- `src/pages/admin/AdminAccounts.jsx` (16-qator) — `loadListings` funksiyasi `useEffect` ichida, e'lon qilinishidan oldin chaqirilmoqda
- `src/pages/admin/AdminPremium.jsx` (15-qator) — `loadUsers` funksiyasi xuddi shunday

**✏️ Tuzatish prompti:**
> `AdminAccounts.jsx` da `loadListings` funksiyasini `useEffect` dan oldin e'lon qilish kerak yoki `useCallback` bilan o'rab, `useEffect` dependency ga qo'shish kerak. Xuddi shunday `AdminPremium.jsx` da `loadUsers` ni ham `useEffect` dan oldin ko'chirish kerak.

---

### 2.3 Foydalanilmagan o'zgaruvchilar (4 ta)
| Fayl | Qator | O'zgaruvchi |
|------|-------|-------------|
| `appwrite.js` | 30 | `error` (catch blokida) |
| `AccountDetailPage.jsx` | 4 | `calculateCommission` (import) |
| `AccountDetailPage.jsx` | 57 | `review` |
| `PremiumPage.jsx` | 3 | `premiumPlans` (import) |

**✏️ Tuzatish prompti:**
> Foydalanilmagan importlar va o'zgaruvchilarni olib tashla: 1) `appwrite.js` da catch blockidagi `error` ni olib tashla (`catch (error)` → `catch`), 2) `AccountDetailPage.jsx` dan `calculateCommission` importini olib tashla va 57-qatordagi `review` o'zgaruvchisini ishlatish yoki olib tashlash kerak, 3) `PremiumPage.jsx` dan `premiumPlans` importini olib tashla.

---

### 2.4 Fast Refresh ishlashiga to'sqinlik (3 ta Context fayl)
**Fayllar:**
- `AuthContext.jsx` (142-qator)
- `ChatContext.jsx` (162-qator)
- `NotificationContext.jsx` (5-qator)

**Muammo:** Bir faylda komponent va hook/funksiya eksport qilinsa, Fast Refresh ishlamaydi.

**✏️ Tuzatish prompti:**
> Har bir Context fayldan `useAuth`, `useChat`, `useNotifications` hookni alohida faylga ko'chirish kerak. Masalan `useAuth.js` fayl yaratib, u yerda `export const useAuth = () => useContext(AuthContext)` yozish kerak. Yoki ESLint konfigda bu qoidani o'chirish kerak: `react-refresh/only-export-components: off`.

---

## 🎨 3. UI / RANG XATOLARI

### 3.1 `text-white` oq fonda ko'rinmaydi (6 ta joy)
**Muammo:** Bir necha komponentlarda `text-white` class ishlatilgan, lekin fon oq (`bg-white` yoki `bg-slate-50`), shuning uchun matn ko'rinmaydi.

| Fayl | Qator | Element |
|------|-------|---------|
| `ReviewList.jsx` | 55 | `text-white` (Average rating) on `bg-slate-50` |
| `ReviewList.jsx` | 69 | `text-white` (Reviews count) on `bg-slate-50` |
| `ReviewList.jsx` | 90 | `text-white` (Reviewer name) on `bg-slate-50` |
| `ReviewModal.jsx` | 79 | `text-white` (Header "Baholash") on `bg-white` |
| `ReviewModal.jsx` | 96 | `text-white` (Seller name) on `bg-slate-50` |
| `NotificationWidget.jsx` | 60 | `text-white` (Header "Bildirishnomalar") on `bg-white` |
| `NotificationWidget.jsx` | 90 | `text-white` / `text-gray-300` on `bg-white` |

**✏️ Tuzatish prompti:**
> Quyidagi fayllardagi `text-white` classlarini `text-gray-800` ga o'zgartirish kerak, chunki ular oq fonda ko'rinmaydi: 1) `ReviewList.jsx`: 55-qatordagi `text-white` → `text-gray-800`, 69-qatordagi `text-white` → `text-gray-800`, 90-qatordagi `text-white` → `text-gray-800`; 2) `ReviewModal.jsx`: 79-qatordagi `text-white` → `text-gray-800`, 96-qatordagi `text-white` → `text-gray-800`; 3) `NotificationWidget.jsx`: 60-qatordagi `text-white` → `text-gray-800`, 90-qatordagi `text-white` → `text-gray-800` va `text-gray-300` → `text-gray-600`.

---

### 3.2 ChatWidget hardcoded dark theme ishlatilyapti
**Fayl:** `src/components/ChatWidget.jsx` (66, 68 qatorlar)
```jsx
<div className="... bg-[#1a1a2e] ...">
<div className="... from-purple-500/20 to-pink-500/20 ...">
```
**Muammo:** Chat widget doimo qorong'i rangda, purple gradient saqlanib qolgan (oldingi temadan).

**✏️ Tuzatish prompti:**
> `ChatWidget.jsx` faylidagi `bg-[#1a1a2e]` ni `bg-white border border-slate-200` ga o'zgartir. `from-purple-500/20 to-pink-500/20` ni `from-blue-500/10 to-blue-600/10` ga o'zgartir. `border-slate-200` classlarni `border-blue-100` ga o'zgartir. `focus:border-purple-500/50` ni `focus:border-blue-500/50` ga o'zgartir.

---

### 3.3 LoginPage dagi input ikonka pozitsiyasi noto'g'ri
**Fayl:** `src/pages/LoginPage.jsx` (147, 165 qatorlar)
```jsx
<Mail className="absolute left-93 ..." />
<Lock className="absolute left-85 ..." />
```
**Muammo:** `left-93` va `left-85` Tailwind CSS da standart classlar emas — ikonkalar noto'g'ri joyda ko'rinishi mumkin.

**✏️ Tuzatish prompti:**
> `LoginPage.jsx` faylidagi `left-93` ni `left-4` ga va `left-85` ni `left-4` ga o'zgartir. Bu standart Tailwind class bo'lib, ikonkalarni input maydonining chap tomoniga to'g'ri joylashtiradi.

---

### 3.4 SignupPage "Parolni tasdiqlang" label rangi noto'g'ri
**Fayl:** `src/pages/SignupPage.jsx` (205-qator)
```jsx
<label className="block text-sm font-medium text-gray-300 mb-2">
```
**Muammo:** `text-gray-300` rang oq fonda deyarli ko'rinmaydi. Boshqa labellar `text-gray-600`.

**✏️ Tuzatish prompti:**
> `SignupPage.jsx` faylidagi 205-qatordagi `text-gray-300` ni `text-gray-600` ga o'zgartirish kerak.

---

## 🔗 4. ROUTING / LINK XATOLARI

### 4.1 Footer dagi mavjud bo'lmagan sahifalarga linklar (4 ta)
**Fayl:** `src/components/Footer.jsx` (15-23 qatorlar)
```javascript
{ label: 'Yordam markazi', to: '/help' },       // ❌ Sahifa yo'q
{ label: 'Xavfsizlik', to: '/security' },         // ❌ Sahifa yo'q
{ label: 'Shikoyat qilish', to: '/report' },      // ❌ Sahifa yo'q
{ label: 'Maxfiylik siyosati', to: '/privacy' },  // ❌ Sahifa yo'q
{ label: 'Qaytarish siyosati', to: '/refund' },   // ❌ Sahifa yo'q
```
**Muammo:** Bu sahifalar `App.jsx` routing da mavjud emas — foydalanuvchi bosganida 404 sahifaga tushadi.

**✏️ Tuzatish prompti:**
> Footer.jsx dagi mavjud bo'lmagan linklar uchun ikkita variant bor: 1) Yangi sahifalar yaratish (`HelpPage.jsx`, `SecurityPage.jsx`, `ReportPage.jsx`, `PrivacyPage.jsx`, `RefundPage.jsx`) va ularni `App.jsx` routingga qo'shish; yoki 2) Bu linklar tugallangan bo'lmasa, ularni `Footer.jsx` dan olib tashlab, mavjud sahifalarga yo'naltirish kerak (masalan `/faq` yoki `/terms`).

---

### 4.2 SignupPage da `/privacy` sahifaga link
**Fayl:** `src/pages/SignupPage.jsx` (231-qator)
```jsx
<Link to="/privacy" className="...">Maxfiylik siyosati</Link>
```
**Muammo:** `/privacy` sahifasi yaratilmagan.

**✏️ Tuzatish prompti:**
> `SignupPage.jsx` dagi `/privacy` linkini `/terms` ga o'zgartir yoki yangi `PrivacyPage.jsx` sahifa yaratib `App.jsx` ga qo'shish kerak.

---

### 4.3 Admin routes uchun lazy komponet ishlatilmagan
**Fayl:** `src/App.jsx` (50-56 qatorlar)
```jsx
<Route path="/admin/reports" element={<AdminLayout><AdminDashboard /></AdminLayout>} />
<Route path="/admin/finance" element={<AdminLayout><AdminDashboard /></AdminLayout>} />
<Route path="/admin/settings" element={<AdminLayout><AdminDashboard /></AdminLayout>} />
```
**Muammo:** `/admin/reports`, `/admin/finance`, `/admin/settings` routes hammasi `AdminDashboard` ni ko'rsatadi — alohida sahifalari yo'q.

**✏️ Tuzatish prompti:**
> Admin panel uchun `AdminReports.jsx`, `AdminFinance.jsx`, `AdminSettings.jsx` sahifalarini yaratish kerak yoki hozircha bu routelarni olib tashlash va admin sidebar dan bu menyularni yashirish kerak.

---

### 4.4 SettingsPage da navigate render paytida chaqiriladi
**Fayl:** `src/pages/SettingsPage.jsx` (36-39 qatorlar)
```jsx
if (!isAuthenticated) {
    navigate('/login'); // ⚠️ Render paytida side-effect!
    return null;
}
```
**Muammo:** `navigate()` render paytida chaqirilyapti — bu React 19 da ogohlantirish beradi.

**✏️ Tuzatish prompti:**
> `SettingsPage.jsx` dagi navigate chaqiruvini `useEffect` ichiga o'tkazish kerak: `useEffect(() => { if (!isAuthenticated) navigate('/login'); }, [isAuthenticated, navigate]);` qilib, render qismida esa `if (!isAuthenticated) return null;` qoldirish kerak.

---

## 📊 5. DATA / MA'LUMOT XATOLARI

### 5.1 MockData dagi ma'lumot nomuvofiqligi
**Fayl:** `src/data/mockData.js` (407-qator)
```javascript
// Account id=4 da `gameName` o'rniga `name` property ishlatilgan
{
    id: 4,
    gameId: 'standoff2',
    name: 'Standoff 2',      // ❌ Noto'g'ri! Boshqa accountlarda `gameName`
    title: 'Elite Account...',
}
```
**Muammo:** Account id=4 da `gameName` o'rniga `name` ishlatilgan. `AccountCard.jsx` `account.gameName` ni ko'rsatadi — bu account uchun game nomi ko'rinmaydi.

**✏️ Tuzatish prompti:**
> `mockData.js` faylidagi account id=4 dagi `name: 'Standoff 2'` ni `gameName: 'Standoff 2'` ga o'zgartirish kerak. Barcha accountlarda bir xil `gameName` property bo'lishi shart.

---

### 5.2 Premium planlar emoji buzilgan
**Fayl:** `src/data/mockData.js` (544, 558, 576, 582, 588 qatorlar)
```javascript
icon: 'в­ђ',     // ⚠️ Buzilgan emoji (⭐ bo'lishi kerak)
icon: 'рџ'Ћ',    // ⚠️ Buzilgan emoji (💎 bo'lishi kerak)
icon: 'рџ'і',    // ⚠️ Buzilgan emoji
icon: 'рџ"±',    // ⚠️ Buzilgan emoji
```
**Muammo:** Premium planlar va to'lov usullari emojilar encoding xatosi bor — noto'g'ri characterlar ko'rinadi.

**✏️ Tuzatish prompti:**
> `mockData.js` faylidagi buzilgan emojilarni tuzatish kerak: premiumPlans[0].icon ni `'⭐'` ga, premiumPlans[1].icon ni `'💎'` ga, paymentMethods[0].icon ni `'💳'` ga, paymentMethods[1].icon ni `'📱'` ga, paymentMethods[2].icon ni `'🏦'` ga o'zgartirish kerak.

---

### 5.3 Account rasm yo'llari noto'g'ri yoki bir xil
**Fayl:** `src/data/mockData.js`
```javascript
// 3 ta account bir xil rasm ishlatadi:
id: 3, image: '/img/Pubg/pg.jpg',     // ❌ Free Fire account lekin PUBG rasmi
id: 4, image: '/img/Pubg/pg.jpg',     // ❌ Standoff 2 account lekin PUBG rasmi
id: 10, image: '/accounts/steam2.jpg', // ❌ Bu fayl mavjud emasligini tekshirish kerak
```

**✏️ Tuzatish prompti:**
> `mockData.js` dagi accountlar uchun rasmlarni to'g'rilash kerak: 1) Free Fire account (id=3) uchun `/img/FireFree/fire.jpg` yoki mos rasm qo'yish, 2) Standoff 2 va boshqa accountlar uchun noto'g'ri rasmlarni to'g'ri game rasmlariga almashtirish, 3) `/accounts/steam2.jpg` fayli mavjudligini tekshirish — mavjud bo'lmasa to'g'ri rasmga o'zgartirish kerak.

---

## 🧠 6. LOGIKA XATOLARI

### 6.1 CoinContext.spendCoins da stale closure
**Fayl:** `src/context/CoinContext.jsx` (62-qator)
```javascript
const spendCoins = (amount, reason) => {
    if (coinState.balance < amount) return false; // ⚠️ Stale closure!
    setCoinState(prev => ({...}));
    return true;
};
```
**Muammo:** `coinState.balance` stale bo'lishi mumkin — funksiya yaratilgan paytdagi qiymatni ishlatadi, hozirgi emas.

**✏️ Tuzatish prompti:**
> `CoinContext.jsx` dagi `spendCoins` funksiyasini `useCallback` bilan o'rash kerak va `coinState.balance` ni dependency ga qo'shish kerak. Yoki yaxshisi, `setCoinState` ning callback formasida balance tekshiruvini qilish: `setCoinState(prev => { if (prev.balance < amount) return prev; return {...prev, balance: prev.balance - amount, ...}; });` lekin bu holatda `return false` ni boshqarish kerak bo'ladi — `useRef` bilan natijayi qaytarish mumkin.

---

### 6.2 Navbar dropdown tashqariga bosnganda yopilmaydi
**Fayl:** `src/components/Navbar.jsx`
**Muammo:** User dropdown menyu tashqi joyga bosganda yopilmaydi — faqat boshqa sahifaga o'tganda yopiladi.

**✏️ Tuzatish prompti:**
> `Navbar.jsx` ga `useRef` va `useEffect` qo'shib, tashqi click handler yaratish kerak: `const dropdownRef = useRef(null); useEffect(() => { const handler = (e) => { if (dropdownRef.current && !dropdownRef.current.contains(e.target)) setIsUserMenuOpen(false); }; document.addEventListener('mousedown', handler); return () => document.removeEventListener('mousedown', handler); }, []);` va dropdown wrapper div ga `ref={dropdownRef}` qo'shish kerak.

---

### 6.3 Notification bildirishnomalari barcha foydalanuvchilar uchun bir xil
**Fayl:** `src/context/NotificationContext.jsx`
**Muammo:** Bildirishnomalar `wibeNotifications` key bilan saqlanadi — user-specific emas. Har bir foydalanuvchi bir xil notificationlarni ko'radi.

**✏️ Tuzatish prompti:**
> `NotificationContext.jsx` da localStorage keyni user-specific qilish kerak: `wibeNotifications` o'rniga `wibeNotifications_${userId}` ishlatish kerak. `saveNotifications` va lazy initialization funksiyalarida ham user id ni hisobga olish kerak. `AuthContext` dan `user` ni olish kerak.

---

### 6.4 Telegram bilan kirish tugmasi ishlamaydi
**Fayl:** `src/pages/LoginPage.jsx` (233-238 qatorlar)
```jsx
<button className="...">
    <svg .../>
    Telegram bilan kirish
</button>
```
**Muammo:** Telegram login tugmasiga `onClick` handler yo'q — tugma hech narsa qilmaydi.

**✏️ Tuzatish prompti:**
> `LoginPage.jsx` dagi Telegram login tugmasini ikkita variantda tuzatish mumkin: 1) Telegram Login Widget integratsiya qilish (Telegram Bot Token bilan), yoki 2) Bu funksiyani hali tayyor emas bo'lsa, tugmaga `disabled` atribut va "Tez orada!" tooltip qo'shish, rangini `opacity-50` qilish kerak.

---

### 6.5 Wallet (hamyon) funksiyalari ishlamaydi
**Fayl:** `src/pages/SettingsPage.jsx` (358-391 qatorlar)
**Muammo:** "Pul qo'shish" va "Pul yechish" tugmalari hech narsa qilmaydi — `onClick` handler yo'q.

**✏️ Tuzatish prompti:**
> `SettingsPage.jsx` dagi Wallet tabidagi "Pul qo'shish" va "Pul yechish" tugmalariga `onClick` handler qo'shish kerak. Hozircha backend tayyor emas bo'lsa, "Tez orada ishga tushiriladi" degan xabar modal ko'rsatish yoki `alert()` qo'yish kerak, hamda tugmalar ustiga tooltip qo'shish kerak.

---

### 6.6 `ReviewModal.jsx` da `Date.now()` render paytida chaqiriladi
**Fayl:** `src/components/ReviewModal.jsx` (21-qator)
```javascript
const review = {
    id: Date.now(), // ⚠️ Impure function render paytida!
    // ...
};
```
**Muammo:** `Date.now()` impure funksiya — render paytida chaqirish xato.

**✏️ Tuzatish prompti:**
> `ReviewModal.jsx` dagi `handleSubmit` funksiyasida `id: Date.now()` ni `crypto.randomUUID()` yoki `Math.random().toString(36).substr(2, 9)` ga almashtirish kerak. Bu ESLint `react-hooks/purity` xatosini ham tuzatadi.

---

## 📝 UMUMIY TUZATISH PROMPT (Barcha xatolarni birga tuzatish uchun)

> **Katta prompt:**
>
> WibeStore loyihasidagi quyidagi xatolarni tuzat:
>
> **Xavfsizlik:**
> 1. Admin credentiallarni `.env` faylga ko'chir (`AdminLogin.jsx`)
> 2. Google OAuth Client ID ni `.env` ga ko'chir (`main.jsx`)
> 3. Appwrite konfigni `.env` ga ko'chir (`appwrite.js`)
> 4. EmailJS constantlarini bitta `lib/emailService.js` faylga ko'chir va `.env` dan o'qi
> 5. Parollarni hash qilib saqlash (`AuthContext.jsx`)
> 6. Parol o'zgartirish funksiyasida joriy parolni tekshirish va yangi parolni saqlash (`SettingsPage.jsx`)
>
> **React xatolar:**
> 7. `useEffect` ichidagi `setState` chaqiruvlarni lazy initialization yoki boshqa pattern ga o'tkazish (9 ta fayl)
> 8. `AdminAccounts.jsx` va `AdminPremium.jsx` da funksiyalarni `useEffect` dan oldin e'lon qil
> 9. Foydalanilmagan importlarni olib tashla (4 ta)
>
> **UI:**
> 10. `text-white` → `text-gray-800` o'zgartir oq fondli joyda (ReviewList, ReviewModal, NotificationWidget)
> 11. ChatWidget da hardcoded dark ranglarni blue/white theme ga o'zgartir
> 12. LoginPage da `left-93`/`left-85` → `left-4` ga o'zgartir
> 13. SignupPage da `text-gray-300` → `text-gray-600` (confirm password label)
>
> **Routing:**
> 14. Footer dagi mavjud bo'lmagan linklar uchun sahifalar yarat yoki olib tashla
> 15. SettingsPage da navigate ni useEffect ichiga o'tkaz
>
> **Data:**
> 16. MockData account id=4 da `name` → `gameName` ga o'zgartir
> 17. Buzilgan emojilarni tuzat
>
> **Logika:**
> 18. CoinContext.spendCoins stale closure ni tuzat
> 19. Navbar dropdown ga outside click handler qo'sh
> 20. Telegram login tugmasini ishlamaydigan holda disable qil yoki to'liq implement qil
> 21. Wallet tugmalariga handler qo'sh
