# WibeStore — FEATURE_PROMPT.md Bajarilish Holati

**Sana:** 2026-03-23
**Versiya:** 2.0
**Loyiha:** WibeStore

---

## UMUMIY XULOSA

| Blok | Nomi | Backend | Frontend | Holati |
|------|------|---------|----------|--------|
| БЛОК 1 | Telegram Bot Аналитика | ✅ 100% | ✅ 100% | TAYYOR |
| БЛОК 2 | Telegram уведомления (покупка) | ✅ 100% | — | TAYYOR |
| БЛОК 3 | Telegram уведомления (чат) | ✅ 100% | — | TAYYOR |
| БЛОК 4 | Верификация продавца | ✅ 100% | ✅ 100% | TAYYOR |
| БЛОК 5 | Trade Admin Panel | ✅ 100% | ✅ 100% | TAYYOR |
| БЛОК 6 | Уведомления о новых чатах | ✅ 100% | — | TAYYOR |
| БЛОК 7 | UX улучшения | ✅ 100% | ⚠️ 85% | XATOLAR BOR |
| БЛОК 8 | Безопасность | ✅ 100% | — | TAYYOR |
| БЛОК 9 | Миграции и конфиг | ✅ 100% | — | TAYYOR |
| БЛОК 10 | Тестирование | ✅ 100% | — | TAYYOR |

**Umumiy backend:** ✅ 100% tayyor
**Umumiy frontend:** ⚠️ ~90% tayyor (i18n muammolari + buglar)

---

## БЛОК 1 — Telegram Bot Аналитика для Администраторов

### 1.1 Backend — TelegramBotStat Model ✅
- **Fayl:** `wibestore_backend/apps/accounts/models.py` (223-254 qatorlar)
- Barcha maydonlar mavjud: telegram_id, telegram_username, first/last_name, user FK, is_blocked, registration_completed, registration_otp_code, total_commands_sent
- Meta: db_table, ordering, unique_together — barchasi to'g'ri

### 1.2 Backend — API Endpointlar ✅
- **Fayl:** `wibestore_backend/apps/admin_panel/views.py`
- `GET /api/v1/admin-panel/telegram/stats/` — ✅ AdminTelegramStatsView (405-qator)
- `GET /api/v1/admin-panel/telegram/users/` — ✅ AdminTelegramUsersView (430-qator)
- `GET /api/v1/admin-panel/telegram/users/<id>/` — ✅ AdminTelegramUserDetailView (462-qator)
- `PATCH /api/v1/admin-panel/telegram/users/<id>/` — ✅ (RetrieveUpdateAPIView)
- `GET /api/v1/admin-panel/telegram/registrations/by-date/` — ✅ (473-qator)
- `GET /api/v1/admin-panel/deposits/` — ✅ AdminDepositsView (499-qator)
- `PATCH /api/v1/admin-panel/deposits/<uuid>/` — ✅ AdminDepositDetailView (526-qator)
- `GET /api/v1/admin-panel/deposits/stats/` — ✅ AdminDepositStatsView (540-qator)

### 1.3 Frontend — AdminTelegramPanel ✅ (funksional, i18n muammo)
- **Fayl:** `src/pages/admin/AdminTelegramPanel.jsx`
- 4 ta tab barchasi ishlaydi:
  - ✅ Обзор бота (stat kartochkalar, grafik)
  - ✅ Пользователи бота (jadval, filtrlar, modal)
  - ✅ Пополнения (approve/reject, screenshot modal)
  - ✅ Аналитика регистраций (date picker, grafik, jadval)
- ⚠️ **MUAMMO:** 40+ ta hardcoded ruscha string — `t()` funktsiyasi ishlatilmagan

### 1.3 Hooklar ✅
- `useAdminTelegramStats` — ✅
- `useAdminTelegramUsers` — ✅
- `useAdminTelegramUser` — ✅
- `useAdminUpdateTelegramUser` — ✅
- `useAdminRegistrationsByDate` — ✅
- `useAdminDeposits` — ✅
- `useAdminDeposit` — ✅
- `useAdminUpdateDeposit` — ✅
- `useAdminDepositStats` — ✅

---

## БЛОК 2 — Telegram уведомления при покупке

### 2.1 Backend — Telegram Notify Funktsiyalar ✅
- **Fayl:** `wibestore_backend/apps/payments/telegram_notify.py` (1154 qator)
- `notify_buyer_purchase_success()` — ✅ (878-qator)
- `notify_seller_account_sold()` — ✅ (906-qator)
- `notify_seller_deliver_account()` — ✅ (936-qator)
- `notify_seller_confirm_transfer()` — ✅ (968-qator)
- `notify_buyer_confirm_received()` — ✅ (997-qator)
- `notify_trade_completed()` — ✅ (540-qator)
- `notify_trade_cancelled()` — ✅ (709-qator)
- Yordamchi funksiyalar: `_fmt_price()`, `_send_message()`, `_get_admin_telegram_ids()` — ✅

### 2.2 Backend — EscrowService Integratsiya ✅
- **Fayl:** `wibestore_backend/apps/payments/services.py` (95-176 qatorlar)
- Escrow yaratilganda → `notify_purchase_created()` + `notify_admin_new_trade()` — ✅
- Barcha chaqiruvlar `try/except` ichida — ✅
- `seller_confirm_transfer()` — ✅ (177-qator)
- `confirm_delivery()` — ✅ (221-qator)
- `release_payment()` — ✅ (246-qator)
- `refund_escrow()` — ✅ (395-qator)

### 2.3 Backend — Telegram Bot Callback Handlerlar ✅
- **Fayl:** `telegram_bot/bot.py` (3684 qator)
- `seller_confirm_transfer` callback — ✅ (2349-qator)
- `buyer_confirm_received` callback — ✅ (2384-qator)
- `buyer_open_dispute` callback — ✅ (2420-qator)
- `seller_cancel_trade` callback — ✅
- `buyer_cancel_trade` callback — ✅

---

## БЛОК 3 — Telegram уведомления о сообщениях в чате

### 3.1 Backend — Consumer Integratsiya ✅
- **Fayl:** `wibestore_backend/apps/messaging/consumers.py` (192-212 qatorlar)
- `notify_recipient_telegram()` metodi — ✅
- `notify_new_chat_message()` va `notify_new_chat_message_sync()` chaqiriladi — ✅

### 3.2 Backend — Messaging Services ✅
- **Fayl:** `wibestore_backend/apps/messaging/services.py`
- `create_order_chat_for_escrow()` — ✅ (16-qator)
- `notify_admin_new_trade_chat()` — ✅ (156-qator)
- `post_system_message_to_order_chat()` — ✅ (192-qator)

### 3.3 Celery Task ✅
- Telegram xabar bildirishnomasi Celery orqali yuboriladi — ✅

---

## БЛОК 4 — Верификация продавца после сделки

### 4.1 Model ✅
- **Fayl:** `wibestore_backend/apps/payments/models.py` (129-210 qatorlar)
- `SellerVerification` model barcha maydonlar bilan — ✅
- status: submitted, approved, rejected — ✅
- passport_front/back_file_id, circle_video_file_id, location_lat/lng — ✅

### 4.2 Telegram Bot Verification Flow ✅
- **Fayl:** `telegram_bot/bot.py` (2486-2807 qatorlar)
- `_cb_start_verification()` — ✅ (2486-qator)
- Passport front qabul qilish — ✅ (2513-qator)
- Passport back qabul qilish — ✅ (2557-qator)
- Video note qabul qilish — ✅ (2595-qator)
- Location qabul qilish — ✅ (2638-qator)
- Admin tasdiqlash/rad etish — ✅ (2753, 2803 qatorlar)

### 4.3 Admin API ✅
- `GET /api/v1/admin-panel/seller-verifications/` — ✅ (565-qator)
- `GET /api/v1/admin-panel/seller-verifications/<uuid>/` — ✅ (581-qator)
- `POST .../approve/` — ✅ (593-qator) — balansga pul o'tkazadi
- `POST .../reject/` — ✅ (649-qator) — Telegram orqali xabar yuboradi

### 4.3 Frontend — Verifikatsiya Tabi ✅
- **Fayl:** `src/pages/admin/AdminTradePanel.jsx`
- "Верификации продавцов" tab — ✅
- Jadval + detail modal — ✅
- Approve/Reject tugmalari — ✅

---

## БЛОК 5 — Торговый Admin Panel

### 5.1 Backend — Trade API ✅
- **Fayl:** `wibestore_backend/apps/admin_panel/views.py` (683-854 qatorlar)
- `GET /api/v1/admin-panel/trades/` — ✅ (683-qator)
- `GET /api/v1/admin-panel/trades/<uuid>/` — ✅ (706-qator)
- `POST .../complete/` — ✅ (718-qator)
- `POST .../refund/` — ✅ (758-qator)
- `POST .../resolve-dispute/` — ✅ (787-qator)
- `GET /api/v1/admin-panel/trades/stats/` — ✅ (835-qator)

### 5.2 Frontend — AdminTradePanel ✅ (funksional, i18n muammo)
- **Fayl:** `src/pages/admin/AdminTradePanel.jsx`
- Tab 1: Barcha savdolar (stat kartochkalar, jadval, filtrlar) — ✅
- Tab 2: Savdo detallari (side panel, buyer/seller info, timeline, tugmalar) — ✅
- Tab 3: Verifikatsiyalar — ✅
- ⚠️ **MUAMMO:** 50+ ta hardcoded ruscha string

### 5.3 Telegram Admin Bildirishnomalar ✅
- `notify_admin_new_trade()` — ✅ (1032-qator)
- `notify_admin_dispute_opened()` — ✅ (1073-qator)
- `notify_admin_seller_verification_submitted()` — ✅ (1108-qator)

### 5.4 Admin Bot Callbacklar ✅
- `admin_complete_trade` callback — ✅ (3281-qator)
- `admin_refund_trade` callback — ✅ (3321-qator)
- `admin_approve_verification` callback — ✅ (2753-qator)
- `admin_reject_verification` callback — ✅ (2803-qator)

---

## БЛОК 6 — Уведомления о новых чатах ✅

- `notify_admin_new_trade_chat()` — ✅ (`messaging/services.py` 156-qator)
- Escrow uchun chat yaratilganda admin xabardor qilinadi — ✅

---

## БЛОК 7 — UX Улучшения

### 7.1 TradePage ✅ (funksional, muammolar bor)
- **Fayl:** `src/pages/TradePage.jsx`
- Route: `/trade/:escrowId` — ✅ (App.jsx)
- Timeline (paid → delivered → confirmed) — ✅
- Akkaunt va ishtirokchilar ma'lumoti — ✅
- Rol va statusga qarab tugmalar — ✅
- Polling (30 sek) — ✅
- ⚠️ **MUAMMO:** Dispute formi muvaffaqiyatdan keyin yopilmaydi
- ⚠️ **MUAMMO:** Mutation xatoliklari toast bilan ko'rsatilmaydi
- ⚠️ **MUAMMO:** 15+ hardcoded ruscha string

### 7.2 Saytda bildirishnomalar ✅
- **Fayl:** `wibestore_backend/apps/notifications/services.py`
- Escrow status o'zgarganda Notification yaratiladi — ✅

### 7.3 Balans Navbarda ✅ (qisman)
- **Fayl:** `src/components/Navbar.jsx`
- Balans avatar yonida ko'rsatiladi — ✅
- `refetchInterval: 60000` — ✅
- ⚠️ **MUAMMO:** Loading holati yo'q (0 ko'rsatadi yuklanayotganda)
- ⚠️ **MUAMMO:** Animatsiya faqat `transition: color 0.3s` — keyframe yo'q

### 7.4 Profilda savdo tarixi ⚠️ BUG
- **Fayl:** `src/pages/ProfilePage.jsx`
- Xaridlar va Sotuvlar tablari — ✅
- Status ikonkalari — ✅
- 🔴 **KRITIK BUG:** Link `txn.id` ishlatadi, `txn.escrow_id` emas!
  - 488-qator: `<Link to={/trade/${txn.id}}>` → NOTO'G'RI
  - 538-qator: `<Link to={/trade/${txn.id}}>` → NOTO'G'RI
  - Route `/trade/:escrowId` kutadi, lekin `txn.id` = transaction ID

---

## БЛОК 8 — Безопасность ✅

### 8.1 Rate Limiting ✅
- Telegram callback idempotency Redis orqali — ✅
- Escrow status tekshiruvi — ✅

### 8.2 Admin Action Logging ✅
- **Fayl:** `wibestore_backend/apps/admin_panel/models.py` (10-30 qatorlar)
- `AdminAction` model — ✅
- `_log_admin_action()` helper — ✅ (views.py 857-871 qatorlar)
- Barcha admin amallarida chaqiriladi — ✅

### 8.3 Celery Tasklar ✅
- **Fayl:** `wibestore_backend/apps/payments/tasks.py`
- `remind_pending_deliveries()` — ✅ (131-qator)
- `auto_release_escrow_after_timeout()` — ✅ (175-qator)
- `release_escrow_payment()` — ✅ (47-qator)

---

## БЛОК 9 — Миграции и конфиг ✅

### 9.1 Settings ✅
- `ADMIN_TELEGRAM_IDS` — ✅ (base.py 522-qator)
- `TELEGRAM_BOT_SECRET` — ✅ (base.py 290-qator)
- Bot konfiguratsiya (BOT_TOKEN, WEBSITE_URL, etc.) — ✅

---

## БЛОК 10 — Тестирование ✅

### 10.1 Test Fayllar ✅
- `tests/test_admin_telegram.py` — ✅ (6 test klass)
- `tests/test_trade_notifications.py` — ✅ (9+ test)
- `tests/test_escrow_flow.py` — ✅ (9 test klass, 40+ test)

---

## TOPILGAN XATOLAR VA MUAMMOLAR

### 🔴 KRITIK (Darhol tuzatish kerak)

| # | Fayl | Muammo | Tafsilot |
|---|------|--------|----------|
| 1 | `ProfilePage.jsx:488,538` | **Trade link noto'g'ri** | `txn.id` o'rniga `txn.escrow_id` bo'lishi kerak |
| 2 | `AdminTelegramPanel.jsx` | **40+ hardcoded string** | Barcha matnlar ruscha, `t()` ishlatilmagan |
| 3 | `AdminTradePanel.jsx` | **50+ hardcoded string** | Barcha matnlar ruscha, `t()` ishlatilmagan |
| 4 | `TradePage.jsx` | **15+ hardcoded string** | Barcha matnlar ruscha, `t()` ishlatilmagan |

### 🟡 YUQORI (Tuzatish kerak)

| # | Fayl | Muammo | Tafsilot |
|---|------|--------|----------|
| 5 | `AdminTradeChats.jsx` | **20+ hardcoded string** | O'zbekcha hardcoded, `t()` ishlatilmagan |
| 6 | `TradePage.jsx` | **Dispute form yopilmaydi** | `showDisputeForm` muvaffaqiyatdan keyin reset qilinmaydi |
| 7 | `TradePage.jsx` | **Mutation xatolik ko'rsatilmaydi** | `confirmReceived`, `openDispute`, `deliverAccount` xatolikda toast yo'q |
| 8 | `Navbar.jsx` | **Balans loading holati yo'q** | Yuklanayotganda 0 ko'rsatadi |

### 🟢 O'RTA (Yaxshilash kerak)

| # | Fayl | Muammo | Tafsilot |
|---|------|--------|----------|
| 9 | `Navbar.jsx` | **Balans animatsiya zaif** | Faqat `transition: color 0.3s` — pulse/glow keyframe yo'q |
| 10 | Locale fayllar | **Tarjima kalitlari to'liq emas** | `admin_telegram`, `admin_trades`, `trade` bo'limlari kam |
| 11 | `Navbar.jsx` | **Balans error holati yo'q** | Profile fetch xatoligida hech narsa ko'rsatilmaydi |

---

## FRONTEND HOOKLAR HOLATI

| Hook | Fayl | Holat |
|------|------|-------|
| `useAdminTelegramStats` | `hooks/useAdmin.js` | ✅ |
| `useAdminTelegramUsers` | `hooks/useAdmin.js` | ✅ |
| `useAdminTelegramUser` | `hooks/useAdmin.js` | ✅ |
| `useAdminUpdateTelegramUser` | `hooks/useAdmin.js` | ✅ |
| `useAdminRegistrationsByDate` | `hooks/useAdmin.js` | ✅ |
| `useAdminDeposits` | `hooks/useAdmin.js` | ✅ |
| `useAdminDeposit` | `hooks/useAdmin.js` | ✅ |
| `useAdminUpdateDeposit` | `hooks/useAdmin.js` | ✅ |
| `useAdminDepositStats` | `hooks/useAdmin.js` | ✅ |
| `useAdminTrades` | `hooks/useAdmin.js` | ✅ |
| `useAdminTrade` | `hooks/useAdmin.js` | ✅ |
| `useAdminTradeStats` | `hooks/useAdmin.js` | ✅ |
| `useAdminCompleteTrade` | `hooks/useAdmin.js` | ✅ |
| `useAdminRefundTrade` | `hooks/useAdmin.js` | ✅ |
| `useAdminResolveTradeDispute` | `hooks/useAdmin.js` | ✅ |
| `useAdminSellerVerifications` | `hooks/useAdmin.js` | ✅ |
| `useAdminApproveVerification` | `hooks/useAdmin.js` | ✅ |
| `useAdminRejectVerification` | `hooks/useAdmin.js` | ✅ |

---

## ROUTELAR HOLATI

| Route | Komponent | Guard | Holat |
|-------|-----------|-------|-------|
| `/admin/telegram` | AdminTelegramPanel | AdminGuard | ✅ |
| `/admin/trades` | AdminTradePanel | AdminGuard | ✅ |
| `/admin/trade-chats` | AdminTradeChats | AdminGuard | ✅ |
| `/trade/:escrowId` | TradePage | AuthGuard | ✅ |

---

## BACKEND FAYL XARITASI

| Fayl | Qatorlar | Holat |
|------|----------|-------|
| `apps/accounts/models.py` | TelegramBotStat (223-254) | ✅ |
| `apps/admin_panel/views.py` | 872 qator, 15+ view | ✅ |
| `apps/admin_panel/urls.py` | Barcha routelar | ✅ |
| `apps/admin_panel/models.py` | AdminAction (10-30) | ✅ |
| `apps/admin_panel/serializers.py` | 6+ serializer | ✅ |
| `apps/payments/telegram_notify.py` | 1154 qator, 15+ funksiya | ✅ |
| `apps/payments/services.py` | EscrowService integratsiya | ✅ |
| `apps/payments/models.py` | SellerVerification, DepositRequest | ✅ |
| `apps/payments/tasks.py` | 3 Celery task | ✅ |
| `apps/messaging/consumers.py` | Telegram notify integratsiya | ✅ |
| `apps/messaging/services.py` | Chat + admin notify | ✅ |
| `telegram_bot/bot.py` | 3684 qator, 40+ handler | ✅ |

---

## XULOSA

**Backend:** Barcha 10 ta blok to'liq implementatsiya qilingan. API endpointlar, modellar, serializerlar, Celery tasklar, Telegram bot handlerlar — hammasi ishlaydi.

**Frontend:** Funksional jihatdan tayyor, lekin **i18n (tarjima)** muammolari va bir nechta buglar mavjud:
- 125+ ta hardcoded string (ruscha/o'zbekcha) `t()` funktsiyasiz
- 1 ta kritik bug (ProfilePage trade link)
- 2 ta UX muammo (TradePage dispute form, Navbar balance loading)

**Tavsiya:** Avval kritik buglarni tuzatish, keyin i18n stringlarni locale fayllarga ko'chirish.
