# WibeStore — Frontend AI Coding Prompt

> Bu promptni boshqa AI'ga to'liq bering. AI WibeStore loyihasining har bir tomonini tushunib, xatosiz kod yoza olishi kerak.

---

## 1. LOYIHA NIMA?

**WibeStore** — O'zbekiston uchun o'yin akkauntlari savdo platformasi (gaming account marketplace).

- Sotuvchi (seller) o'yin akkountini e'lon qiladi → Xaridor (buyer) uni sotib oladi
- O'yinlar: PUBG, Free Fire, Brawl Stars, Mobile Legends, Genshin Impact va boshqalar
- Asosiy foydalanuvchilar: **mobil qurilma** (telefon) foydalanuvchilari
- Bozor: O'zbekiston — valyuta **UZS (so'm)**, tillar **O'zbek / Rus / Ingliz**
- To'lov tizimlari: **Payme, Click, PayNet**
- Obuna rejalari: **Free → Premium → Pro**

---

## 2. TECH STACK

```
Frontend:
  React 19           → UI framework
  Vite 7             → build tool, dev server (port 5173)
  Tailwind CSS 4     → utility classes
  React Query 5      → server state (useQuery, useMutation, useInfiniteQuery)
  Axios              → HTTP client
  React Router v7    → routing (lazy-loaded pages)
  Lucide React       → icon library

Backend (tayyor, faqat API orqali muloqot):
  Django 5.1 + DRF   → REST API  (base: /api/v1)
  Django Channels    → WebSocket (ws://)
  Celery + Redis     → background jobs
  PostgreSQL 16      → production DB

Auth:
  JWT (access + refresh tokens)
  Google OAuth
  Telegram login (phone + code)
```

---

## 3. FAYL TUZILMASI

```
src/
├── App.jsx                    ← routing + provider stack
├── main.jsx                   ← entry point
├── index.css                  ← BUTUN dizayn tizimi (3400+ qator)
│
├── pages/                     ← sahifalar (lazy loaded)
│   ├── HomePage.jsx
│   ├── ProductsPage.jsx
│   ├── GamePage.jsx
│   ├── AccountDetailPage.jsx
│   ├── SellPage.jsx
│   ├── ProfilePage.jsx
│   ├── SettingsPage.jsx
│   ├── CoinsPage.jsx
│   ├── StatisticsPage.jsx
│   ├── ChatPage.jsx
│   ├── ChatRoomPage.jsx
│   ├── PremiumPage.jsx
│   ├── TopAccountsPage.jsx
│   ├── SellerProfilePage.jsx
│   ├── LoginPage.jsx
│   ├── SignupPage.jsx
│   ├── ForgotPasswordPage.jsx
│   ├── ResetPasswordPage.jsx
│   ├── TermsPage.jsx
│   ├── FAQPage.jsx
│   ├── NotFoundPage.jsx
│   ├── ServerErrorPage.jsx
│   └── admin/
│       ├── AdminLayout.jsx
│       ├── AdminLogin.jsx
│       ├── AdminDashboard.jsx
│       ├── AdminAccounts.jsx
│       ├── AdminUsers.jsx
│       ├── AdminReports.jsx
│       ├── AdminPremium.jsx
│       ├── AdminFinance.jsx
│       ├── AdminSettings.jsx
│       └── AdminTradeChats.jsx
│
├── components/
│   ├── Navbar.jsx             ← navigation (search, theme, lang, user menu)
│   ├── Footer.jsx
│   ├── Logo.jsx
│   ├── AccountCard.jsx        ← asosiy listing karta komponenti
│   ├── GameCard.jsx
│   ├── ReviewList.jsx
│   ├── ReviewModal.jsx
│   ├── AvatarEditModal.jsx
│   ├── LoginModal.jsx
│   ├── ChatWidget.jsx
│   ├── NotificationWidget.jsx
│   ├── GoogleLoginButton.jsx
│   ├── CommandPalette.jsx     ← Cmd+K palette
│   ├── ToastProvider.jsx      ← global toast/notification
│   ├── SkeletonLoader.jsx
│   ├── EmptyState.jsx
│   ├── ConfirmDialog.jsx
│   ├── ErrorBoundary.jsx
│   ├── ScrollToTop.jsx
│   ├── CookieConsent.jsx
│   ├── BuyerRulesQuiz.jsx
│   ├── SellerRulesQuiz.jsx
│   ├── OnboardingTour.jsx
│   ├── GuardLoading.jsx
│   ├── AuthGuard.jsx
│   └── ui/
│       ├── Button.jsx
│       ├── Input.jsx
│       ├── Modal.jsx
│       ├── Card.jsx
│       ├── PageHeader.jsx
│       └── Pagination.jsx
│
├── context/
│   ├── AuthContext.jsx        ← user auth state
│   ├── ThemeContext.jsx       ← light/dark mode
│   ├── LanguageContext.jsx    ← i18n (uz/ru/en)
│   ├── ChatContext.jsx        ← chat conversations
│   ├── NotificationContext.jsx
│   ├── CoinContext.jsx
│   └── GoogleAuthContext.jsx
│
├── hooks/
│   └── index.js               ← barcha API hook'larning markaziy export'i
│
├── lib/
│   ├── apiClient.js           ← Axios + JWT interceptors
│   └── displayUtils.js        ← capitalizeFirst, getDisplayInitial, resolveImageUrl
│
├── locales/
│   ├── uz.json                ← O'zbek (asosiy til)
│   ├── ru.json                ← Rus
│   └── en.json                ← Ingliz
│
└── data/
    └── mockData.js            ← formatPrice, premiumPlans, paymentMethods, COMMISSION_RATE
```

---

## 4. ROUTING VA PROVIDER STACK

### Provider tartibi (App.jsx)
```jsx
<ErrorBoundary>
  <ToastProvider>
    <Router>
      <ThemeProvider>
        <LanguageProvider>
          <AuthProvider>
            <CoinProvider>
              <ChatProvider>
                <NotificationProvider>
                  {/* routes */}
                </NotificationProvider>
              </ChatProvider>
            </CoinProvider>
          </AuthProvider>
        </LanguageProvider>
      </ThemeProvider>
    </Router>
  </ToastProvider>
</ErrorBoundary>
```

### Barcha marshrutlar
```
PUBLIC (hamma ko'ra oladi):
  /                    → HomePage
  /products            → ProductsPage
  /game/:gameId        → GamePage
  /account/:accountId  → AccountDetailPage
  /premium             → PremiumPage
  /top                 → TopAccountsPage
  /seller/:userId      → SellerProfilePage
  /terms               → TermsPage
  /faq                 → FAQPage
  /500                 → ServerErrorPage
  *                    → NotFoundPage (404)

AUTH REQUIRED (AuthGuard):
  /profile             → ProfilePage
  /sell                → SellPage
  /settings            → SettingsPage
  /statistics          → StatisticsPage
  /coins               → CoinsPage
  /chat                → ChatPage
  /chat/:roomId        → ChatRoomPage

GUEST ONLY (GuestGuard — kirgan bo'lsa redirect /profile):
  /login               → LoginPage
  /signup              → SignupPage
  /forgot-password     → ForgotPasswordPage
  /reset-password      → ResetPasswordPage

ADMIN (AdminGuard):
  /admin               → AdminDashboard
  /admin/login         → AdminLogin
  /admin/accounts      → AdminAccounts
  /admin/users         → AdminUsers
  /admin/reports       → AdminReports
  /admin/premium       → AdminPremium
  /admin/finance       → AdminFinance
  /admin/settings      → AdminSettings
  /admin/trade-chats   → AdminTradeChats
```

### Barcha sahifalar lazy load:
```jsx
const HomePage = lazy(() => import('./pages/HomePage'));
// Fallback: <GuardLoading /> (skeleton shimmer)
```

---

## 5. DIZAYN TIZIMI — `src/index.css` (3400+ qator)

> **QOIDA №1:** Hech qachon rang, font-size, spacing'ni hardcode qilma.
> Faqat CSS o'zgaruvchilarini ishlat: `var(--color-accent-blue)` ✓ | `#0969da` ✗

### Rang o'zgaruvchilari (light & dark theme qo'llab-quvvatlanadi)

```css
/* FONLAR */
--color-bg-primary          /* sahifa asosiy foni:  #ffffff / #0d1117 */
--color-bg-secondary        /* karta/panel foni:    #f6f8fa / #161b22 */
--color-bg-tertiary         /* hover foni:          #eaeef2 / #21262d */
--color-bg-elevated         /* modal/dropdown foni: #ffffff / #1c2128 */
--color-bg-overlay          /* overlay:             rgba(0,0,0,0.5) */

/* MATN */
--color-text-primary        /* asosiy matn:         #1f2328 / #f0f6fc */
--color-text-secondary      /* ikkinchi:            #656d76 / #8b949e */
--color-text-muted          /* hint/placeholder:    #8c959f / #6e7681 */
--color-text-link           /* link:                #0969da / #58a6ff */
--color-text-inverse        /* qora ustida oq:      #ffffff / #0d1117 */

/* CHEGARA */
--color-border-default      /* standart:            #d0d7de / #30363d */
--color-border-muted        /* yengil:              #d8dee4 / #21262d */
--color-border-strong       /* kuchli:              #8c959f / #8b949e */

/* ACCENT RANGLAR */
--color-accent-blue         /* CTA asosiy:          #0969da / #58a6ff */
--color-accent-green        /* muvaffaqiyat:        #1a7f37 / #3fb950 */
--color-accent-orange       /* ogohlantirish:       #bc6c19 / #d29922 */
--color-accent-red          /* xavf:                #cf222e / #f85149 */
--color-accent-purple       /* secondary:           #8250df / #d2a8ff */

/* HOLAT RANGLAR */
--color-success             /* #1a7f37 / #3fb950 */
--color-success-bg          /* #dafbe1 / #0f2817 */
--color-success-text        /* muted success text */
--color-warning             /* #9a6700 / #d29922 */
--color-warning-bg          /* #fff8c5 / #272115 */
--color-warning-text        /* muted warning text */
--color-error               /* #cf222e / #f85149 */
--color-error-bg            /* #ffebe9 / #2d0f0e */
--color-error-text          /* muted error text */
--color-info-bg             /* #ddf4ff / #0c2d4a */
--color-info-text           /* muted info text */

/* PREMIUM / PRO */
--color-premium-gold        /* #9a6700 */
--color-premium-gold-light  /* #d4a72c */
--color-premium-gradient    /* linear-gradient(135deg, #d4a72c, #f0d060, #d4a72c) */
--color-pro-purple          /* #6f42c1 */
--color-pro-gradient        /* linear-gradient(135deg, #6f42c1, #0969da) */

/* BREND */
--color-primary             /* #0969da (asosiy brend rangi) */
--color-primary-hover       /* #0860ca */
```

### Spacing (faqat shu o'zgaruvchilarni ishlat)
```css
--space-1: 4px    --space-2: 8px    --space-3: 12px
--space-4: 16px   --space-5: 20px   --space-6: 24px
--space-8: 32px   --space-10: 40px  --space-12: 48px  --space-16: 64px
```

### Tipografiya
```css
--font-family: -apple-system, BlinkMacSystemFont, "Segoe UI", Helvetica, Arial, sans-serif;

--font-size-xs: 11px     --font-size-sm: 12px
--font-size-base: 14px   --font-size-lg: 16px
--font-size-xl: 20px     --font-size-2xl: 24px
--font-size-3xl: 32px    --font-size-display: 40px

--font-weight-regular: 400   --font-weight-medium: 500
--font-weight-semibold: 600  --font-weight-bold: 700

--line-height-xs: 14px   --line-height-sm: 16px
--line-height-base: 20px --line-height-lg: 24px
--line-height-display: 48px
```

### Border Radius
```css
--radius-sm: 4px    --radius-md: 6px
--radius-lg: 8px    --radius-xl: 12px
--radius-2xl: 16px  --radius-full: 9999px
```

### Transitions
```css
--transition-fast: 0.15s ease    --transition-base: 0.2s ease    --transition-slow: 0.3s ease
```

### Soyalar
```css
--shadow-xs   --shadow-sm   --shadow-md   --shadow-lg   --shadow-xl
```

---

## 6. TAYYOR CSS KOMPONENT CLASSLARI

> Bu classlarni CSS'da qayta yozma — allaqachon `src/index.css` da belgilangan.

### Tugmalar
```
.btn                           → base tugma (padding, border-radius, transition)

Variant:
  .btn-primary                 → ko'k (asosiy CTA)
  .btn-secondary               → kulrang (ikkinchi darajali)
  .btn-ghost                   → shaffof (tertiär)
  .btn-danger                  → qizil (o'chirish, chiqish)
  .btn-premium                 → oltin gradient (premium amallar)

O'lcham:
  .btn-sm                      → kichik (padding: 6px 12px)
  .btn-md                      → o'rta  (padding: 8px 16px) ← standart
  .btn-lg                      → katta  (padding: 10px 20px)
  .btn-xl                      → juda katta

Holat:
  .btn:disabled                → opacity 0.6, cursor not-allowed
  .btn.loading                 → spinner ko'rsatiladi
```

### Kartalar
```
.card                          → standart karta (bg-secondary, border, radius-lg)
.card-elevated                 → shadow-md bilan
.card-interactive              → hover effekti bor (cursor: pointer, translateY)
.card-selected                 → tanlangan holat (blue border)
```

### Badgelar
```
.badge                         → base badge

Rang variant:
  .badge-blue                  → ko'k
  .badge-green                 → yashil
  .badge-orange                → to'q sariq
  .badge-red                   → qizil
  .badge-purple                → binafsha
  .badge-yellow                → sariq
  .badge-premium               → oltin (Premium foydalanuvchi)
  .badge-pro                   → gradient binafsha (Pro foydalanuvchi)
  .badge-count                 → raqam uchun kichik doira
```

### Avatar
```
.avatar                        → asosiy (borderRadius: full, overflow: hidden)
.avatar-sm   (24px)
.avatar-md   (32px)
.avatar-lg   (40px)
.avatar-xl   (56px)
.avatar-2xl  (80px)
```

### Tablar
```
.tabs                          → tab container (flex, border-bottom)
.tab                           → individual tab button
.tab-active                    → aktiv tab (border-bottom: 2px solid blue)
.tab-icon                      → faqat icon tab (square)
```

### Input
```
.input                         → asosiy input (border, radius, bg)
.input-sm  .input-md  .input-lg → o'lchamlar
.input-label                   → label text
.input-helper                  → yordam matni (muted)
.input-error                   → xato holati input (red border)
.input-error-msg               → xato xabari matni
```

### Layout
```
.gh-container                  → max-width (1280px) + responsive padding (16px/24px/32px)
.page-enter                    → sahifa kirish animatsiyasi (fadeIn + slideUp)
.breadcrumbs                   → breadcrumb container
.breadcrumb-separator          → "/" belgisi
.breadcrumb-current            → joriy sahifa (bold)
```

### Boshqa
```
.skeleton                      → shimmer loading effekti
.divider                       → gorizontal chiziq
.truncate-2                    → 2 qatordan ortiq matnni kestirish
```

---

## 7. MA'LUMOT MODELLARI (API javoblari)

### Listing (e'lon)
```typescript
{
  id: number
  title: string
  description: string
  price: string               // "150000" — UZS, string
  original_price: string | null // chegirma oldidagi narx
  status: "active" | "pending" | "rejected" | "sold"
  is_premium: boolean
  views_count: number
  favorites_count: number
  is_favorited: boolean       // joriy foydalanuvchi yoqtirdimi
  game: {
    slug: string              // "pubg-mobile"
    name: string              // "PUBG Mobile"
    description: string
    icon: string | null       // URL
    banner: string | null     // URL
    listings_count: number
  }
  seller: {
    id: number
    display_name: string
    avatar: string | null     // to'liq URL
    rating: number            // 0.0 – 5.0
    total_sales: number
    plan: "free" | "premium" | "pro"
    is_premium: boolean
  }
  images: Array<{
    id: number
    image: string             // URL
    is_primary: boolean
    sort_order: number
  }>
  created_at: string          // ISO 8601
  updated_at: string
}
```

### User (foydalanuvchi)
```typescript
{
  id: number
  email: string
  display_name: string        // normalizeUser() bilan hisoblangan
  full_name: string | null
  username: string | null
  avatar: string | null       // to'liq URL (resolveImageUrl orqali)
  balance: string             // "25000" — UZS
  is_premium: boolean
  plan: "free" | "premium" | "pro"
  rating: number
  total_sales: number
  total_purchases: number
  telegram_id: string | null
  telegram_username: string | null
  is_staff: boolean
  referral_code: string | null
}
```

### Game
```typescript
{
  slug: string                // "free-fire"
  name: string                // "Free Fire"
  description: string
  icon: string | null         // URL
  banner: string | null       // URL
  listings_count: number
}
```

### Chat + Message
```typescript
// Chat
{
  id: number
  participants: User[]
  last_message: Message | null
  unread_count: number
  updated_at: string
}

// Message
{
  id: number
  sender: User
  content: string
  message_type: "text" | "image" | "system"
  is_read: boolean
  created_at: string
}
```

### Review
```typescript
{
  id: number
  rating: number              // 1 – 5
  comment: string
  author: User
  listing: Listing | null
  helpful_count: number
  seller_response: string | null
  created_at: string
}
```

### Transaction
```typescript
{
  id: number
  type: "deposit" | "withdraw" | "payment" | "refund"
  amount: string              // UZS
  status: "pending" | "completed" | "failed"
  payment_method: string      // "payme" | "click" | "paynet"
  description: string
  created_at: string
}
```

### Subscription
```typescript
{
  plan: "premium" | "pro"
  status: "active" | "expired" | "cancelled"
  expires_at: string | null
  price: number               // UZS
  features: string[]
}
```

---

## 8. API HOOK'LAR (`src/hooks/index.js`)

> Barcha hook'lar `src/hooks/index.js` dan import qilinadi.
> Hook'larni to'g'ridan-to'g'ri import qilma — faqat shu markaziy fayldan.

```js
import { useListings, useProfile, useCreateListing } from '../hooks';
```

### Listings
```js
useListings(filters)
// → useInfiniteQuery
// → data?.pages?.[0]?.results  ← TO'G'RI
// → data?.results              ← XATO (InfiniteQuery da ishlamaydi)
// filters: { game, status, min_price, max_price, search, ordering }

useListing(id)                  // bitta e'lon
useCreateListing()              // mutate(formData)
useUpdateListing(id)            // mutate(formData)
useDeleteListing()              // mutate(listingId) ← ID argument sifatida
useAddToFavorites(listingId)
useRemoveFromFavorites(listingId)
useTrackView(listingId)
useApplyPromo(code, amount, listing_id)
usePurchaseListing(listingId)
```

### Games
```js
useGames()                      // barcha o'yinlar ro'yxati
useGame(slug)                   // bitta o'yin
useGameListings(gameSlug, filters)
```

### Profile
```js
useProfile()                    // joriy user profili
useUpdateProfile()              // mutate(formData)
useProfileListings(status?)     // user e'lonlari
useProfileFavorites()           // yoqtirilganlar
useProfilePurchases()           // xaridlar
useProfileSales()               // sotuvlar
useSellerDashboard()            // analytics: active_listings, sold, views, conversion
useReferral()                   // referral code + stats
```

### Chat
```js
useChats()                      // suhbatlar ro'yxati
useChat(chatId)
useChatMessages(chatId)         // paginated
useCreateChat(userId)
useSendMessage(chatId, text)
useMarkChatRead(chatId)
```

### Notifications
```js
useNotifications()
useMarkNotificationRead(id)
useMarkAllNotificationsRead()
```

### Payments
```js
useTransactions()
useDeposit()                    // mutate({ amount, payment_method })
useWithdraw()                   // mutate({ amount })
```

### Subscriptions
```js
useSubscriptionPlans()
useMySubscriptions()
usePurchaseSubscription(planId)
useCancelSubscription(planId)
```

### Reviews
```js
useListingReviews(listingId)
useCreateReview(listingId)      // mutate({ rating, comment })
useUpdateReview(reviewId)
useDeleteReview(reviewId)
useReviewResponse()             // seller javob
useMarkReviewHelpful(reviewId)
```

### Upload
```js
useUploadImage(formData)        // bitta rasm
useUploadImages(formData)       // bir nechta rasm
```

### WebSocket
```js
useWebSocket()
useChatWebSocket()              // real-time chat
useNotificationWebSocket()      // real-time bildirishnomalar
```

### Admin
```js
useAdminDashboard()
useAdminUsers()
useAdminBanUser(userId)
useAdminAllListings()
useAdminApproveListing(listingId)
useAdminRejectListing(listingId)
useAdminDeleteListing(listingId)
useAdminReports()
useAdminResolveReport(reportId)
useAdminTransactions()
useAdminGrantSubscription(userId, plan)
```

---

## 9. KONTEKST HOOK'LAR

```js
// Auth — foydalanuvchi holati
const { user, isAuthenticated, isLoading, login, logout,
        loginWithGoogle, loginWithTelegram, register,
        updateProfile, refreshUser } = useAuth();

// i18n — tarjimalar
const { t, language, setLanguage } = useLanguage();
// t('nav.home')         → "Bosh sahifa"
// t('profile.balance')  → "Mablag'"
// t('noto_g_ri.kalit')  → "noto_g_ri.kalit" (fallback — key qaytadi)

// Toast — bildirishnomalar
const { addToast } = useToast();
addToast({ type: 'success', title: 'Saqlandi', message: 'Ma\'lumotlar yangilandi' });
addToast({ type: 'error',   title: 'Xatolik',  message: error?.message });
addToast({ type: 'warning', title: 'Diqqat',   message: '...' });
addToast({ type: 'info',    title: 'Axborot',  message: '...' });

// Theme
const { theme, toggleTheme } = useTheme();
// theme: 'light' | 'dark'
// localStorage da 'wibeTheme' kalit bilan saqlanadi
```

---

## 10. UTIL FUNKSIYALAR (`src/lib/displayUtils.js`)

```js
import { capitalizeFirst, getDisplayInitial,
         resolveImageUrl, resolveGameImageUrl } from '../lib/displayUtils';

capitalizeFirst('john doe')   // → 'John doe'
capitalizeFirst(null)         // → ''

getDisplayInitial('John Doe', 'U')   // → 'J'
getDisplayInitial('', 'U')           // → 'U'  (fallback)
getDisplayInitial(null, 'U')         // → 'U'

resolveImageUrl('/media/avatar.jpg')
// → 'http://localhost:8000/media/avatar.jpg'  (dev)
// → 'https://api.wibestore.uz/media/avatar.jpg'  (prod)
// null/undefined → null

resolveGameImageUrl(game.icon)   // o'yin rasmlari uchun

// Narx formatlash (src/data/mockData.js dan):
import { formatPrice } from '../data/mockData';
formatPrice(150000)   // → "150 000 so'm"
// yoki:
Number(150000).toLocaleString('uz-UZ')   // → "150 000"  (+ " UZS" qo'shib ber)
```

---

## 11. I18N — TARJIMA KALITLARI

```json
{
  "common": {
    "home": "Bosh sahifa", "back": "Orqaga", "save": "Saqlash",
    "cancel": "Bekor qilish", "delete": "O'chirish", "edit": "Tahrirlash",
    "loading": "Yuklanmoqda...", "error": "Xatolik", "success": "Muvaffaqiyat",
    "unknown_game": "Noma'lum o'yin", "confirm": "Tasdiqlash"
  },
  "nav": {
    "home": "Bosh sahifa", "products": "Mahsulotlar", "sell": "Sotish",
    "profile": "Profil", "settings": "Sozlamalar", "login": "Kirish",
    "logout": "Chiqish", "premium": "Premium", "top": "TOP"
  },
  "auth": {
    "login": "Kirish", "logout": "Chiqish", "register": "Ro'yxatdan o'tish",
    "email": "Email", "password": "Parol", "phone": "Telefon raqam",
    "code": "Tasdiqlash kodi", "forgot_password": "Parolni unutdingizmi?"
  },
  "profile": {
    "my_listings": "Mening e'lonlarim", "purchases": "Xaridlar",
    "sales": "Sotuvlar", "likes": "Yoqtirilganlar", "reviews": "Sharhlar",
    "balance": "Mablag'", "dashboard": "Dashboard", "referral": "Referral",
    "delete_confirm": "Bu e'lonni o'chirishni xohlaysizmi?",
    "deleted_success": "E'lon o'chirildi", "delete_error": "O'chirishda xatolik"
  },
  "status": {
    "pending": "Kutilmoqda", "approved": "Tasdiqlandi",
    "rejected": "Rad etildi", "sold": "Sotildi", "active": "Faol"
  },
  "sell": {
    "title": "E'lon sarlavhasi", "description": "Tavsif",
    "price": "Narx", "game": "O'yin", "images": "Rasmlar",
    "submit": "E'lon joylash", "success": "E'lon joylandi"
  },
  "products": {
    "filter": "Filtr", "sort": "Saralash", "search": "Qidirish",
    "no_results": "Natija topilmadi", "load_more": "Ko'proq yuklash"
  }
}
```

> Mavjud bo'lmagan kalit: `t('mavjud_emas')` → `"mavjud_emas"` (kalit o'zi qaytadi)
> Yangi matn qo'shsang — uchala faylga ham qo'sh: `uz.json`, `ru.json`, `en.json`

---

## 12. API CLIENT (`src/lib/apiClient.js`)

```js
import apiClient from '../lib/apiClient';

// Base URL: /api/v1  (Vite proxy orqali Django'ga yo'naltiriladi)
// Headers: Authorization: Bearer <access_token>  (avtomatik)

// GET
const { data } = await apiClient.get('/listings/');
const { data } = await apiClient.get('/listings/', { params: { game: 'pubg' } });

// POST
const { data } = await apiClient.post('/auth/login/', { phone, code });

// PATCH
const { data } = await apiClient.patch('/profile/', formData);
// FormData → Content-Type: multipart/form-data (avtomatik)

// DELETE
await apiClient.delete(`/listings/${id}/`);

// Token boshqaruv:
import { setTokens, getStoredTokens, removeTokens } from '../lib/apiClient';
setTokens({ access: '...', refresh: '...' })  // localStorage.wibeTokens
getStoredTokens()                              // → { access, refresh } | null
removeTokens()                                 // logout paytida
```

**Avtomatik xususiyatlar:**
- 401 → refresh token bilan yangi access token oladi, so'rovni qayta yuboradi
- 502/503/504 → 2 marta qayta urinadi (exponential backoff)
- `wibe-logout` custom event → AuthContext eshitadi va state tozalaydi
- FormData yuborilsa Content-Type avtomatik olib tashlanadi

---

## 13. RESPONSIVE DIZAYN QOIDALARI

### Breakpointlar (Tailwind)
```
sm: 640px    md: 768px    lg: 1024px    xl: 1280px
```

### Mobil birinchi — 320px dan ishlashi SHART

```jsx
// ✓ TO'G'RI — column → row
<div className="flex flex-col sm:flex-row gap-4">

// ✓ TO'G'RI — responsive font
<h1 style={{ fontSize: 'clamp(16px, 5vw, 28px)' }}>

// ✓ TO'G'RI — responsive padding
<div style={{ padding: 'clamp(12px, 4vw, 24px)' }}>

// ✓ TO'G'RI — gorizontal scroll (tabs, lists)
<div style={{ overflowX: 'auto', WebkitOverflowScrolling: 'touch' }}>
  <div style={{ display: 'flex', flexWrap: 'nowrap', gap: '8px' }}>
    {items.map(i => <Item key={i.id} style={{ flexShrink: 0 }} />)}
  </div>
</div>

// ✓ TO'G'RI — avatar + info + action layout
<div style={{ display: 'flex', flexDirection: 'column', gap: '16px' }}>
  <div style={{ display: 'flex', alignItems: 'center', gap: '12px' }}>
    {/* Avatar */}
    <div style={{ flex: 1, minWidth: 0 }}>{/* Info */}</div>
    <div style={{ flexShrink: 0 }}>{/* Actions */}</div>
  </div>
  <div>{/* Balance / Secondary info — pastki qatorda */}</div>
</div>

// ✗ XATO — mobilda overlap qiladi
<div style={{ display: 'flex', flexWrap: 'wrap' }}>
  <div style={{ flex: 1 }}>{/* info */}</div>
  <div style={{ marginLeft: 'auto' }}>{/* balance */}</div>
</div>
```

### Grid tizimi
```jsx
// Kartalar griди
<div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fill, minmax(280px, 1fr))', gap: '16px' }}>

// Stats griди
<div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fill, minmax(140px, 1fr))', gap: '12px' }}>
```

---

## 14. KOMPONENT YOZISH QOIDALARI

### Fayl shablon (barcha page/component shu tartibda)
```jsx
// 1. React import
import { useState, useEffect, useMemo, useCallback } from 'react';

// 2. Router
import { Link, useNavigate, useParams } from 'react-router-dom';

// 3. Context hooks
import { useAuth } from '../context/AuthContext';
import { useLanguage } from '../context/LanguageContext';
import { useToast } from '../components/ToastProvider';

// 4. API hooks
import { useListings, useDeleteListing } from '../hooks';

// 5. Icons (faqat keraklilarini)
import { Star, ShoppingBag, Heart } from 'lucide-react';

// 6. Components
import SkeletonLoader from '../components/SkeletonLoader';
import EmptyState from '../components/EmptyState';

// 7. Utils
import { formatPrice } from '../data/mockData';
import { capitalizeFirst, resolveImageUrl, getDisplayInitial } from '../lib/displayUtils';

// ─────────────────────────
const MyPage = () => {
  // Context
  const { t } = useLanguage();
  const { user, isAuthenticated } = useAuth();
  const { addToast } = useToast();
  const navigate = useNavigate();

  // Local state
  const [activeTab, setActiveTab] = useState('all');

  // API
  const { data, isLoading, isError } = useSomeHook();

  // Derived
  const items = useMemo(() => data?.results ?? [], [data]);

  // Handlers
  const handleDelete = (id) => {
    if (!window.confirm(t('common.confirm'))) return;
    deleteMutation(id, {
      onSuccess: () => addToast({ type: 'success', title: t('common.success'), message: t('profile.deleted_success') }),
      onError: (err) => addToast({ type: 'error', title: t('common.error'), message: err?.message }),
    });
  };

  // Guards
  if (isLoading) return <SkeletonLoader />;
  if (isError)   return <EmptyState />;

  return (
    <div className="page-enter" style={{ minHeight: '100vh', paddingBottom: '64px' }}>
      <div className="gh-container">
        {/* Breadcrumb */}
        <div className="breadcrumbs">
          <Link to="/">{t('common.home')}</Link>
          <span className="breadcrumb-separator">/</span>
          <span className="breadcrumb-current">{t('nav.my_page')}</span>
        </div>

        {/* Content */}
      </div>
    </div>
  );
};

export default MyPage;
```

### Inline style vs Tailwind qoidasi
```jsx
// CSS class mavjud → classni ishlat
<button className="btn btn-primary btn-md">...</button>           // ✓
<button style={{ background: 'var(--color-primary)' }}>...</button> // ✗

// Dinamik qiymat → inline style
<div style={{ color: isPro ? 'var(--color-pro-purple)' : 'var(--color-text-primary)' }}>

// Statik layout → Tailwind
<div className="flex items-center gap-4 flex-col sm:flex-row">

// CSS o'zgaruvchi → faqat inline style ichida
<p style={{ color: 'var(--color-text-muted)', fontSize: 'var(--font-size-sm)' }}>
```

### Avatar pattern
```jsx
<div
  className="avatar avatar-lg"
  style={{
    background: user.avatar ? 'transparent'
      : user.plan === 'pro' ? 'var(--color-pro-gradient)'
      : user.is_premium ? 'var(--color-premium-gradient)'
      : 'linear-gradient(135deg, var(--color-accent-blue), var(--color-accent-purple))',
    color: '#fff',
    display: 'flex', alignItems: 'center', justifyContent: 'center',
    fontSize: '24px', fontWeight: 'var(--font-weight-bold)',
  }}
>
  {user.avatar
    ? <img src={user.avatar} alt={user.display_name} style={{ width: '100%', height: '100%', objectFit: 'cover' }} />
    : getDisplayInitial(user.display_name, 'U')
  }
</div>
```

### Premium/Pro badge pattern
```jsx
{user.plan === 'pro' && (
  <span className="badge badge-pro" style={{ fontSize: '11px', padding: '3px 8px', gap: '3px' }}>
    <Gem className="w-3 h-3" /> Pro
  </span>
)}
{(user.plan === 'premium' || (user.is_premium && user.plan !== 'pro')) && (
  <span className="badge badge-premium" style={{ fontSize: '11px', padding: '3px 8px', gap: '3px' }}>
    <Crown className="w-3 h-3" /> Premium
  </span>
)}
```

### Loading / Empty / Error pattern
```jsx
if (isLoading) return (
  <div style={{ padding: '32px' }}>
    <SkeletonLoader />
  </div>
);

if (!data?.length) return (
  <EmptyState
    icon={<Package className="w-12 h-12" />}
    title={t('products.no_results')}
    description={t('products.no_results_hint')}
  />
);
```

---

## 15. PERFORMANCE QOIDALARI

```jsx
// ✓ Faqat kerakli icon import
import { Star, ShoppingBag } from 'lucide-react';
// ✗ Hech qachon
import * as Icons from 'lucide-react';

// ✓ List key — har doim unique ID
items.map(item => <Card key={item.id} />);
// ✗ Index key
items.map((item, i) => <Card key={i} />);

// ✓ React Query invalidate
import { useQueryClient } from '@tanstack/react-query';
const queryClient = useQueryClient();
queryClient.invalidateQueries({ queryKey: ['listings'] });
// ✗ Sahifani qayta yuklash
window.location.reload();

// ✓ Lazy page load
const ProfilePage = lazy(() => import('./pages/ProfilePage'));
// ✗ To'g'ri import
import ProfilePage from './pages/ProfilePage';

// ✓ useMemo — faqat og'ir hisoblashlarda
const filtered = useMemo(() => items.filter(complex), [items]);
// ✗ Oddiy operatsiya uchun useMemo shart emas
const count = items.length; // useMemo kerak emas

// Rasm — har doim lazy + aspect-ratio
<img
  src={resolveImageUrl(image.url)}
  loading="lazy"
  style={{ width: '100%', aspectRatio: '16/9', objectFit: 'cover' }}
/>
```

---

## 16. XATOLAR VA MUHIM CHEKLOVLAR

### Qilma ✗ → Qil ✓

| Xato pattern | To'g'ri pattern |
|---|---|
| `color: '#0969da'` | `color: 'var(--color-accent-blue)'` |
| `data?.results` (InfiniteQuery) | `data?.pages?.[0]?.results` |
| `mutate({ id: listingId })` | `mutate(listingId)` — (useDeleteListing) |
| `window.location.reload()` | `queryClient.invalidateQueries(...)` |
| `marginLeft: 'auto'` responsive | `flexDirection: 'column'` → row |
| `minWidth: '200px'` mobil | `clamp(120px, 40vw, 200px)` |
| `import * as Icons from 'lucide-react'` | `import { Star } from 'lucide-react'` |
| `const handleLogout = () => navigate(...)` | `const { logout } = useAuth()` |
| `import data from '../data/mockData'` (API uchun) | API hook ishlat |
| `key={index}` | `key={item.id}` |
| 7+ tab bitta qatorda | `overflowX: 'auto'` + `flexWrap: 'nowrap'` |
| `import { useLanguage } from '../context/LanguageContext'` kerak emas emas... | Kerak, har doim import |

### Doim qil ✓
- Barcha ko'rinadigan matn → `t('key')` (3 til!)
- Destructive action (delete/logout/ban) → `window.confirm()` yoki `<ConfirmDialog />`
- Har bir mutation → `onSuccess` + `onError` toast
- Auth required sahifa → `AuthGuard` bilan o'rab
- Sahifa wrapper → `<div className="page-enter">`
- Container → `<div className="gh-container">`
- Breadcrumb → har bir sahifada

---

## 17. DIZAYN FALSAFASI — MINIMALISTIK

### Qoidalar
1. **Kam element, ko'p nafas** — whitespace birinchi darajali dizayn elementi
2. **Rang palitrasini chekla** — sahifada 2–3 rang, accent uchun 1 ta
3. **Tipografiya ierarxiyasi** — heading → sub → body → muted (5 darajadan oshirma)
4. **Animatsiya mazmunli** — faqat foydalanuvchini yo'naltiruvchi, `transition-base (0.2s)` yetarli
5. **Soya minimal** — z-layer uchun, dekoratsiya uchun emas
6. **Border o'rniga background farqi** ajratish uchun afzal

### Nima qilma
- Gradient ustiga gradient
- 3+ card variant bitta sahifada
- Ortiqcha ikonka — har bir narsaga icon qo'yma
- Hover effektini murakkablashtirma: `translateY(-2px)` yetarli
- Har xil font-size aralashtirma

---

## 18. THEME — QORONG'U/YORUG' REJIM

```jsx
// ThemeContext — data-theme attributi document.documentElement ga qo'yiladi
// localStorage.wibeTheme → 'light' | 'dark'

// CSS CSS o'zgaruvchilar avtomatik o'zgaradi:
// [data-theme="dark"] { --color-bg-primary: #0d1117; }
// [data-theme="light"] { --color-bg-primary: #ffffff; }

// Shunday komponentlar yozilsa — theme avtomatik ishlaydi
<div style={{ backgroundColor: 'var(--color-bg-primary)', color: 'var(--color-text-primary)' }}>
```

---

## 19. MUHIM FAYLLAR — QACHON QAYSI FAYLNI OCHASIZ

| Vazifa | Fayl |
|---|---|
| Rang/spacing o'zgartirish | `src/index.css` |
| Yangi sahifa qo'shish | `src/pages/NewPage.jsx` + `src/App.jsx` (route) |
| Yangi API hook | `src/hooks/index.js` |
| Tarjima qo'shish | `src/locales/uz.json` + `ru.json` + `en.json` |
| Auth logikasi | `src/context/AuthContext.jsx` |
| API base URL / interceptor | `src/lib/apiClient.js` |
| Listing karta ko'rinishi | `src/components/AccountCard.jsx` |
| Global bildirishnomalar | `src/components/ToastProvider.jsx` |
| Narx formatlash | `src/data/mockData.js` → `formatPrice()` |
| Rasm URL | `src/lib/displayUtils.js` → `resolveImageUrl()` |
