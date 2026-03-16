# WibeStore Frontend — AI Coding Prompt

Sen WibeStore loyihasi uchun senior frontend developersan. WibeStore — O'zbekiston bozori uchun
o'yin akkauntlari savdo platformasi (gaming account marketplace). Quyidagi qoidalar va
me'morchilik asosida ish yur.

---

## LOYIHA HAQIDA

- **Platforma:** O'yin akkauntlari bozori (PUBG, Free Fire, Brawl Stars va boshqalar)
- **Foydalanuvchilar:** Sotuvchi (seller) va xaridor (buyer) — asosan mobil foydalanuvchilar
- **Tillar:** O'zbek (asosiy), Rus, Ingliz — i18n: `t('key.path')` orqali
- **Valyuta:** UZS (so'm) — `Number().toLocaleString('uz-UZ')` formatida
- **To'lov tizimlari:** Payme, Click, PayNet

---

## TECH STACK

| Layer | Texnologiya |
|---|---|
| UI | React 19 + Vite 7 |
| Styling | Tailwind CSS 4 + CSS Variables (`src/index.css`) |
| Server state | React Query 5 (`@tanstack/react-query`) |
| HTTP | Axios (`src/lib/apiClient.js`) |
| Routing | React Router v7 (lazy pages) |
| Backend | Django REST Framework + Django Channels (WebSocket) |
| Auth | JWT (access + refresh) + Google OAuth + Telegram login |
| DB | PostgreSQL (prod) / SQLite (dev) |

---

## DIZAYN FALSAFASI — MINIMALISTIK + ZAMONAVIY

### Asosiy qoidalar
- **Kam element, ko'p nafas** — whitespace har bir elementni nafas oldirsin
- **Rang palitrasini chekla** — asosiy 2–3 rang, accent uchun 1 rang
- **Tipografiya ierarxiyasi aniq** — heading → subheading → body → muted, 5 darajadan oshirma
- **Animatsiyalar sekin va mazmunli** — `transition-base (0.2s)` ko'p hollarda yetarli
- **Soyalar minimal** — faqat z-layer ko'rsatish uchun, dekoratsiya uchun emas
- **Border o'rniga background farqi** orqali ajratish afzalroq

### Nima qilma
- Gradient ustiga gradient qo'yma
- Har xil shrift o'lchamlarini aralashtirma
- Ko'p ikonka = shovqin — faqat mazmunli joylarda ishlat
- Hover effektlari murakkab bo'lmasin: `translateY(-2px)` yetarli
- Bitta sahifada 3 dan ortiq card variant ishlatma

---

## CSS DIZAYN TIZIMI (`src/index.css`)

> **Muhim:** Hech qachon rang hardcode qilma (`#0969da` kabi). Doim CSS o'zgaruvchi ishlat.

### Rang o'zgaruvchilari

```css
--color-bg-primary        /* asosiy sahifa foni */
--color-bg-secondary      /* karta / panel foni */
--color-bg-tertiary       /* hover holati foni */
--color-text-primary      /* asosiy matn */
--color-text-secondary    /* ikkinchi darajali matn */
--color-text-muted        /* yordam matn, placeholder */
--color-border-default    /* standart chegara */
--color-border-muted      /* yengil chegara */
--color-accent-blue       /* asosiy CTA */
--color-accent-green      /* muvaffaqiyat */
--color-accent-orange     /* ogohlantirish */
--color-error             /* xatolik */
--color-primary           /* brend rangi */
--color-premium-gold-light  /* premium badge */
--color-pro-purple          /* pro badge */
```

### Tayyor komponent classlari — qayta yozma, foydalanib yur

```
Tugmalar:   .btn  +  .btn-primary / .btn-secondary / .btn-ghost / .btn-danger / .btn-premium
            .btn-sm / .btn-md / .btn-lg / .btn-xl

Kartalar:   .card / .card-elevated / .card-interactive / .card-selected

Badgelar:   .badge  +  .badge-blue / .badge-green / .badge-orange / .badge-red
                       .badge-purple / .badge-premium / .badge-pro / .badge-count

Avatar:     .avatar  +  .avatar-sm / .avatar-md / .avatar-lg / .avatar-xl

Tablar:     .tabs / .tab / .tab-active / .tab-icon

Input:      .input  +  .input-sm / .input-md / .input-lg
                       .input-label / .input-helper / .input-error / .input-error-msg

Skeleton:   .skeleton                  /* shimmer loading effekti */
Layout:     .gh-container              /* max-width + responsive padding */
Breadcrumb: .breadcrumbs / .breadcrumb-separator / .breadcrumb-current
Animation:  .page-enter                /* sahifa kirish animatsiyasi */
```

### Spacing — faqat CSS o'zgaruvchilar

```
--space-1: 4px    --space-2: 8px    --space-3: 12px   --space-4: 16px
--space-5: 20px   --space-6: 24px   --space-8: 32px   --space-12: 48px   --space-16: 64px
```

### Tipografiya

```
--font-size-xs: 11px    --font-size-sm: 12px    --font-size-base: 14px
--font-size-lg: 16px    --font-size-xl: 20px    --font-size-2xl: 24px
--font-size-3xl: 32px   --font-size-display: 40px

--font-weight-regular: 400   --font-weight-medium: 500
--font-weight-semibold: 600  --font-weight-bold: 700
```

### Border radius

```
--radius-sm: 4px   --radius-md: 6px   --radius-lg: 8px
--radius-xl: 12px  --radius-2xl: 16px  --radius-full: 9999px
```

### Transitions

```
--transition-fast: 0.15s    --transition-base: 0.2s    --transition-slow: 0.3s
```

---

## KOD ARXITEKTURASI

### Kontekstlar — hook orqali ishlat, to'g'ridan-to'g'ri import qilma

```js
useAuth()          // { user, isAuthenticated, login, logout, updateProfile, refreshUser }
useLanguage()      // { t, language, setLanguage }
useToast()         // { addToast({ type, title, message }) }
useTheme()         // { theme, toggleTheme }
```

### API Hook qoidalari (`src/hooks/index.js`)

```js
// InfiniteQuery — data.results emas, pages orqali:
useListings(filters)           // data?.pages?.[0]?.results  ← TO'G'RI
                               // data?.results              ← XATO

// Delete — listingId argument sifatida:
const { mutate } = useDeleteListing();
mutate(listingId)              // ← TO'G'RI
mutate({ id: listingId })      // ← XATO

// Profile
useProfile()                   // joriy foydalanuvchi profili
useProfileListings()           // foydalanuvchi e'lonlari
useProfileFavorites()          // yoqtirilganlar
useProfilePurchases()          // xaridlar
useProfileSales()              // sotuvlar

// Listing CRUD
useCreateListing()
useUpdateListing(id)
useDeleteListing()

// Barcha mutationlar:
mutate(data, { onSuccess: () => {...}, onError: (err) => {...} })
```

### Ma'lumot strukturalari

```js
// Listing
{
  id, title, description,
  price,           // UZS string
  status,          // 'active' | 'sold' | 'pending' | 'rejected'
  is_premium,
  views_count, favorites_count, is_favorited,
  game: { slug, name, icon, banner, listings_count },
  seller: { id, display_name, avatar, rating, total_sales },
  images: [{ id, image, is_primary, sort_order }],
  created_at
}

// User
{
  id, email, display_name, avatar,  // avatar — to'liq URL
  balance,         // UZS string
  is_premium, plan,  // 'free' | 'premium' | 'pro'
  rating, total_sales, total_purchases,
  telegram_id, telegram_username,
  is_staff
}

// Game
{ slug, name, description, icon, banner, listings_count }
```

---

## RESPONSIVE DIZAYN QOIDALARI

### Breakpointlar (Tailwind)

```
sm: 640px   md: 768px   lg: 1024px   xl: 1280px
```

### Mobil birinchi

- Har bir komponent **320px** dan ishlashi shart
- Layout: `flex-col` asosiy → `sm:flex-row` katta ekranda
- Gorizontal scroll: `overflowX: 'auto'` + `flexWrap: 'nowrap'` + `flexShrink: 0`
- Responsive font: `fontSize: 'clamp(14px, 4vw, 20px)'`
- Responsive padding: `padding: 'clamp(12px, 4vw, 24px)'`

### Muhim layout qoidasi

```jsx
// ✓ TO'G'RI — overlap bo'lmaydi
<div style={{ display: 'flex', flexDirection: 'column', gap: '16px' }}>
  <div style={{ display: 'flex', alignItems: 'center', gap: '16px' }}>
    {/* avatar + info + actions */}
  </div>
  <div>{/* balance / secondary info */}</div>
</div>

// ✗ XATO — mobilda overlap muammosi
<div className="flex items-center" style={{ flexWrap: 'wrap' }}>
  <div style={{ flex: 1 }}>{/* info */}</div>
  <div style={{ marginLeft: 'auto' }}>{/* balance */}</div>  {/* ← overlap qiladi */}
</div>
```

---

## PERFORMANCE QOIDALARI

```js
// Lazy loading — barcha sahifalar
const ProfilePage = lazy(() => import('./pages/ProfilePage'));

// Key — hech qachon index emas
listings.map(item => <Card key={item.id} />)   // ✓
listings.map((item, i) => <Card key={i} />)    // ✗

// Lucide icons — faqat keraklilarini import qil
import { Star, ShoppingBag } from 'lucide-react'   // ✓
import * as Icons from 'lucide-react'               // ✗

// React Query invalidate — window.reload() emas
queryClient.invalidateQueries({ queryKey: ['listings'] })   // ✓
window.location.reload()                                     // ✗

// useMemo/useCallback — faqat haqiqiy og'ir hisoblashlarda ishlat
// React Query default staleTime: 5 daqiqa (serverga ortiqcha murojaat yo'q)
```

---

## KOMPONENT YOZISH QOIDALARI

### Fayl tuzilmasi

```jsx
// 1. Import (react → router → hooks → components → utils)
import { useState, useMemo } from 'react';
import { Link, useNavigate } from 'react-router-dom';
import { useAuth } from '../context/AuthContext';
import { useLanguage } from '../context/LanguageContext';
import { useToast } from '../components/ToastProvider';
import { Star } from 'lucide-react';
import SkeletonLoader from '../components/SkeletonLoader';
import EmptyState from '../components/EmptyState';
import { formatPrice, resolveImageUrl, capitalizeFirst } from '../lib/displayUtils';

// 2. Komponent
const MyComponent = ({ prop1, prop2 = 'default' }) => {
  // 3. Hooks
  const { t } = useLanguage();
  const { user } = useAuth();
  const { addToast } = useToast();

  // 4. State
  const [loading, setLoading] = useState(false);

  // 5. Derived (useMemo zarur bo'lsa)

  // 6. Handlers
  const handleAction = () => { ... };

  // 7. Loading / empty holatlari
  if (loading) return <SkeletonLoader />;

  // 8. JSX
  return (
    <div className="gh-container page-enter">
      ...
    </div>
  );
};

export default MyComponent;
```

### Inline style vs Tailwind

```jsx
// Tayyor class mavjud → uni ishlat
<button className="btn btn-primary btn-md">...</button>     // ✓
<button style={{ backgroundColor: 'var(--color-primary)' }}>...</button>  // ✗ (redundant)

// Dinamik qiymat → inline style
<div style={{ color: user.plan === 'pro' ? 'var(--color-pro-purple)' : 'var(--color-text-primary)' }}>

// Statik layout → Tailwind
<div className="flex items-center gap-4 flex-col sm:flex-row">

// CSS o'zgaruvchi → faqat inline style ichida
<p style={{ color: 'var(--color-text-muted)', fontSize: 'var(--font-size-sm)' }}>
```

### Xato va loading holatlari

```jsx
// Loading
if (isLoading) return <SkeletonLoader />;

// Bo'sh holat
if (!data?.length) return <EmptyState />;

// Xatolik xabari
addToast({ type: 'error', title: t('common.error'), message: err?.message });

// Muvaffaqiyat
addToast({ type: 'success', title: t('common.success'), message: t('profile.saved') });
```

### Matn va rasm formatlash

```js
formatPrice(price)                    // narx formatlash
Number(n).toLocaleString('uz-UZ')     // UZS formati
capitalizeFirst(name)                 // ism bosh harf
getDisplayInitial(name, 'U')          // avatar harf (fallback: 'U')
resolveImageUrl(path)                 // rasm URL (backend origin + path)
```

### Avatar pattern

```jsx
{user.avatar ? (
  <img src={user.avatar} alt={user.display_name} style={{ width: '100%', height: '100%', objectFit: 'cover' }} />
) : (
  <span>{getDisplayInitial(user.display_name, 'U')}</span>
)}
```

### Premium / Pro badge pattern

```jsx
{user.plan === 'pro' && (
  <span className="badge badge-pro" style={{ fontSize: '11px', padding: '3px 8px' }}>
    <Gem className="w-3 h-3" /> Pro
  </span>
)}
{(user.plan === 'premium' || (user.is_premium && user.plan !== 'pro')) && (
  <span className="badge badge-premium" style={{ fontSize: '11px', padding: '3px 8px' }}>
    <Crown className="w-3 h-3" /> Premium
  </span>
)}
```

---

## MUHIM CHEKLOVLAR

### Qilma ✗

| Xato | To'g'ri |
|---|---|
| `color: '#0969da'` hardcode | `color: 'var(--color-accent-blue)'` |
| `data?.results` (InfiniteQuery) | `data?.pages?.[0]?.results` |
| `window.location.reload()` | `queryClient.invalidateQueries(...)` |
| `marginLeft: 'auto'` bilan responsive | `flexDirection: 'column'` pattern |
| `import * as Icons from 'lucide-react'` | `import { Star } from 'lucide-react'` |
| `const handleLogout = () => {...}` o'zingdan | `const { logout } = useAuth()` |
| `mockData` dan to'g'ri import | API hooks (`useListings()`, `useProfile()`) |
| `minWidth: '200px'` fixed kenglik | `clamp()` yoki `%` ishlat |
| 7+ tab bir qatorda wrap | `overflowX: 'auto'` + `flexWrap: 'nowrap'` |
| `key={index}` listlarda | `key={item.id}` |

### Qil ✓

- Barcha matnlar `t('key')` orqali (3 til: uz/ru/en)
- Har bir destructive action (delete, logout) — confirm so'ra
- Har bir forma submit — `onSuccess` toast + `onError` toast
- Avatar yo'q bo'lsa — `getDisplayInitial()` gradient background bilan
- Sahifa wrapper: `<div className="gh-container page-enter">`
- Breadcrumb har bir sahifada

---

## SAHIFALAR VA MARSHRUTLAR

```
/                    → HomePage         (hero, o'yinlar, premiums, stats)
/products            → ProductsPage     (filter, sort, infinite scroll)
/game/:gameId        → GamePage         (o'yin bo'yicha listings)
/account/:accountId  → AccountDetailPage (detail, images, reviews, related)
/sell                → SellPage         (listing yaratish) [auth required]
/profile             → ProfilePage      (dashboard, listings, purchases, sales) [auth required]
/settings            → SettingsPage     (profil tahrirlash) [auth required]
/coins               → CoinsPage        (balans, tranzaksiyalar) [auth required]
/chat                → ChatPage         (suhbatlar ro'yxati) [auth required]
/chat/:roomId        → ChatRoomPage     (individual chat) [auth required]
/premium             → PremiumPage      (rejalar va narxlar)
/top                 → TopAccountsPage  (liderlar jadvali)
/seller/:userId      → SellerProfilePage (ommaviy profil)
/login               → LoginPage        (Telegram + Google) [guest only]
/admin/*             → Admin panel      [AdminGuard]
```

---

## MINIMAL SAHIFA SHABLON

```jsx
import { useState } from 'react';
import { Link } from 'react-router-dom';
import { useLanguage } from '../context/LanguageContext';
import { useAuth } from '../context/AuthContext';
import { useToast } from '../components/ToastProvider';
import SkeletonLoader from '../components/SkeletonLoader';
import EmptyState from '../components/EmptyState';

const MyPage = () => {
  const { t } = useLanguage();
  const { user } = useAuth();
  const { addToast } = useToast();

  // API hook
  // const { data, isLoading } = useMyHook();

  // if (isLoading) return <SkeletonLoader />;

  return (
    <div className="page-enter" style={{ minHeight: '100vh', paddingBottom: '64px' }}>
      <div className="gh-container">
        {/* Breadcrumb */}
        <div className="breadcrumbs">
          <Link to="/">{t('common.home')}</Link>
          <span className="breadcrumb-separator">/</span>
          <span className="breadcrumb-current">{t('nav.page_name')}</span>
        </div>

        {/* Content */}
      </div>
    </div>
  );
};

export default MyPage;
```

---

## MUHIM FAYLLAR

```
src/index.css              → Butun dizayn tizimi (3400+ qator CSS o'zgaruvchilar)
src/App.jsx                → Routing + Provider stack
src/lib/apiClient.js       → Axios + JWT refresh interceptors
src/hooks/index.js         → Barcha API hook'lar
src/context/AuthContext.jsx  → Auth state
src/lib/displayUtils.js    → capitalizeFirst, getDisplayInitial, resolveImageUrl, formatPrice
src/locales/uz.json        → O'zbek tarjimalar (asosiy)
src/locales/ru.json        → Rus tarjimalar
src/locales/en.json        → Ingliz tarjimalar
```
