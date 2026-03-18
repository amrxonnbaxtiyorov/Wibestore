# WibeStore — Техническое задание на доработку платформы
**Версия:** 2.0
**Проект:** WibeStore (c:\WibeStore\Wibestore)
**Стек:** React 19 + Vite 7 + TailwindCSS 4 + Django 5.1 + DRF + Django Channels + Celery + Redis + PostgreSQL 16 + Telegram Bot (python-telegram-bot)

---

## ВАЖНО — Общие правила реализации

- Все изменения должны быть обратно совместимы с существующим кодом
- Не переписывать рабочие компоненты — только дополнять
- Backend: соблюдать архитектуру `apps/<appname>/models.py | views.py | serializers.py | services.py | tasks.py`
- Frontend: все хуки экспортировать через `src/hooks/index.js`, стили — только через существующие CSS-переменные из `src/index.css`
- Все строки в UI — добавить в `src/locales/ru.json`, `src/locales/uz.json`, `src/locales/en.json`
- Telegram Bot: все новые handlers добавлять в `telegram_bot/bot.py`, сохраняя существующую структуру
- После каждого блока задач: `git add . && git commit -m "feat: ..." && git push`

---

## БЛОК 1 — Telegram Bot Аналитика для Администраторов

### 1.1 Backend — Модель статистики бота

**Файл:** `wibestore_backend/apps/accounts/models.py`

Добавить модель `TelegramBotStat`:
```python
class TelegramBotStat(BaseModel):
    """Статистика взаимодействия пользователей с Telegram ботом."""
    telegram_id = models.BigIntegerField(db_index=True)
    telegram_username = models.CharField(max_length=100, blank=True, default="")
    telegram_first_name = models.CharField(max_length=100, blank=True, default="")
    telegram_last_name = models.CharField(max_length=100, blank=True, default="")
    user = models.ForeignKey(
        settings.AUTH_USER_MODEL,
        on_delete=models.SET_NULL,
        null=True, blank=True,
        related_name="telegram_bot_stats"
    )
    # Активность
    first_interaction_at = models.DateTimeField(auto_now_add=True)
    last_interaction_at = models.DateTimeField(auto_now=True)
    is_blocked = models.BooleanField(default=False)  # True если пользователь заблокировал бота
    blocked_at = models.DateTimeField(null=True, blank=True)
    unblocked_at = models.DateTimeField(null=True, blank=True)
    # Регистрация
    registration_completed = models.BooleanField(default=False)
    registration_date = models.DateTimeField(null=True, blank=True)
    registration_otp_code = models.CharField(max_length=10, blank=True, default="")  # OTP код с которым зарегистрировался
    # Источник
    referral_code_used = models.CharField(max_length=20, blank=True, default="")
    # Команды
    total_commands_sent = models.PositiveIntegerField(default=0)

    class Meta:
        db_table = "telegram_bot_stats"
        ordering = ["-last_interaction_at"]
        verbose_name = "Статистика Telegram бота"
        verbose_name_plural = "Статистика Telegram бота"
        unique_together = [("telegram_id",)]
```

### 1.2 Backend — API эндпоинты для аналитики бота

**Файл:** `wibestore_backend/apps/admin_panel/views.py`

Добавить следующие эндпоинты (только для `is_staff=True`):

```
GET /api/v1/admin-panel/telegram/stats/
  Ответ:
  {
    "total_bot_users": 1234,
    "active_today": 45,
    "blocked_users": 23,
    "registered_users": 890,  # завершили регистрацию
    "pending_registration": 344,  # открыли бота но не завершили
    "new_today": 12,
    "new_this_week": 87,
    "new_this_month": 320
  }

GET /api/v1/admin-panel/telegram/users/?page=1&search=&date_from=&date_to=&status=all|active|blocked|registered
  Ответ: пагинированный список TelegramBotStat с полями:
  - telegram_id, telegram_username, first_name, last_name
  - user (uuid, email, username если есть связанный аккаунт)
  - first_interaction_at, last_interaction_at
  - is_blocked, registration_completed, registration_date
  - registration_otp_code (OTP код с которым зарегистрировался)
  - total_commands_sent

GET /api/v1/admin-panel/telegram/registrations/by-date/?date_from=2025-01-01&date_to=2025-12-31
  Ответ: массив объектов { "date": "2025-03-15", "count": 23 } — количество регистраций по дням

GET /api/v1/admin-panel/telegram/users/<telegram_id>/
  Детальная информация о пользователе бота

PATCH /api/v1/admin-panel/telegram/users/<telegram_id>/
  Редактирование: is_blocked, admin_note

GET /api/v1/admin-panel/deposits/?page=1&status=all|pending|approved|rejected&date_from=&date_to=&search=
  Пагинированный список DepositRequest с полями:
  - id, telegram_id, telegram_username, amount
  - screenshot (URL), sent_at, status
  - reviewed_by (admin email), reviewed_at, admin_note
  - user (связанный аккаунт)
  - transaction (ID транзакции)

PATCH /api/v1/admin-panel/deposits/<uuid>/
  Изменение статуса: status=approved|rejected, admin_note, amount

GET /api/v1/admin-panel/deposits/stats/
  Ответ:
  {
    "pending_count": 5,
    "pending_total_amount": 1500000,
    "approved_today_count": 12,
    "approved_today_total": 3200000,
    "rejected_today_count": 2
  }
```

### 1.3 Frontend — Страница AdminTelegramPanel

**Файл:** `src/pages/admin/AdminTelegramPanel.jsx`

Создать новую страницу с вкладками:

**Вкладка 1: Обзор бота (Overview)**
- Карточки со статистикой: всего пользователей бота, заблокировали бота, зарегистрировались, активны сегодня
- График "Регистрации по дням" — date range picker (от/до), bar chart через встроенный SVG или recharts
- Топ-5 активных пользователей за неделю

**Вкладка 2: Пользователи бота**
- Таблица со всеми пользователями бота
- Колонки: Telegram ID, Username, Имя, Связанный аккаунт, Дата первого входа, Дата регистрации, OTP код, Статус (активен/заблокировал бота)
- Фильтры: поиск по username/имени/telegram_id, фильтр по статусу, date range
- Кнопка "Подробнее" → модалка с полной информацией и возможностью редактирования заметки

**Вкладка 3: Пополнения (Депозиты)**
- Таблица DepositRequest: пользователь, сумма, скриншот (иконка → открыть в модалке), дата, статус, действия
- Кнопки "Одобрить" / "Отклонить" с полем суммы и заметки
- Фильтры: статус, дата, поиск
- Карточки статистики вверху: ожидают подтверждения (с суммой), одобрено сегодня, отклонено

**Вкладка 4: Аналитика регистраций**
- Date range picker
- График регистраций по дням
- Таблица: дата, количество зарегистрировавшихся, список OTP кодов которые использовались

**Добавить в навигацию AdminLayout:**
```jsx
{ path: '/admin/telegram', icon: Send, label: 'Telegram Бот' }
```

**Добавить хуки в `src/hooks/index.js`:**
```js
useAdminTelegramStats()        // GET /admin-panel/telegram/stats/
useAdminTelegramUsers(filters) // GET /admin-panel/telegram/users/
useAdminTelegramUser(id)       // GET /admin-panel/telegram/users/<id>/
useAdminUpdateTelegramUser()   // PATCH
useAdminRegistrationsByDate(dateFrom, dateTo)  // GET /admin-panel/telegram/registrations/by-date/
useAdminDeposits(filters)      // GET /admin-panel/deposits/
useAdminDeposit(id)            // GET /admin-panel/deposits/<id>/
useAdminUpdateDeposit()        // PATCH
useAdminDepositStats()         // GET /admin-panel/deposits/stats/
```

---

## БЛОК 2 — Telegram уведомления при покупке аккаунта

### 2.1 Backend — Сервис Telegram уведомлений

**Файл:** `wibestore_backend/apps/payments/telegram_notify.py`

Уже существует частично. Дополнить следующими функциями:

```python
def notify_buyer_purchase_success(escrow: EscrowTransaction) -> None:
    """
    Покупателю при успешной покупке:
    - С баланса списано: {сумма} UZS
    - Куплен аккаунт: {название листинга} ({игра})
    - Продавец: @{username}
    - Сделка #{escrow_id[:8]}
    - Кнопка: [Открыть сделку на сайте]
    """

def notify_seller_account_sold(escrow: EscrowTransaction) -> None:
    """
    Продавцу при продаже его аккаунта:
    - Ваш аккаунт "{название}" куплен!
    - Покупатель: @{username}
    - Сумма к получению: {seller_earnings} UZS (после комиссии {commission}%)
    - Сделка #{escrow_id[:8]}
    - Кнопка: [Передать аккаунт на сайте] → ссылка на профиль/сделку
    - Кнопка: [Открыть чат со службой поддержки]
    Примечание: деньги будут зачислены после подтверждения покупателем получения аккаунта.
    """

def notify_seller_deliver_account(escrow: EscrowTransaction) -> None:
    """
    Напоминание продавцу передать аккаунт:
    - Войдите в ваш профиль на сайте
    - Найдите сделку #{escrow_id[:8]}
    - Нажмите "Передать аккаунт" и введите данные
    Кнопка: [Передать аккаунт] → deep link на сайт
    """

def notify_seller_confirm_transfer(escrow: EscrowTransaction) -> None:
    """
    Продавцу: подтвердить передачу аккаунта через Telegram:
    - Вы передали аккаунт "{название}" покупателю?
    - Inline кнопки:
      ✅ Да, аккаунт передан  (callback: seller_confirm_transfer_{escrow_id})
      ❌ Отменить сделку      (callback: seller_cancel_trade_{escrow_id})
    """

def notify_buyer_confirm_received(escrow: EscrowTransaction) -> None:
    """
    Покупателю: подтвердить получение аккаунта:
    - Продавец передал данные аккаунта "{название}"
    - Проверьте аккаунт и подтвердите получение
    - Inline кнопки:
      ✅ Аккаунт получен, всё ок  (callback: buyer_confirm_received_{escrow_id})
      ⚠️ Есть проблема / Спор     (callback: buyer_open_dispute_{escrow_id})
      ❌ Отменить сделку           (callback: buyer_cancel_trade_{escrow_id})
    """

def notify_trade_completed(escrow: EscrowTransaction) -> None:
    """
    Обоим участникам — сделка завершена:
    - Покупателю: "Сделка завершена! Наслаждайтесь аккаунтом ✅"
    - Продавцу: "Сделка завершена! {seller_earnings} UZS зачислено на ваш баланс ✅"
    """

def notify_trade_cancelled(escrow: EscrowTransaction, cancelled_by: str) -> None:
    """
    Обоим участникам — сделка отменена:
    - Кем отменена: buyer/seller/admin
    - Покупателю: деньги возвращены на баланс
    - Продавцу: аккаунт снова активен на сайте
    """
```

### 2.2 Backend — Интеграция уведомлений в EscrowService

**Файл:** `wibestore_backend/apps/payments/services.py`

В `EscrowService` после изменения статуса escrow вызывать соответствующие функции:

- При создании escrow (статус `paid`) → `notify_buyer_purchase_success()` + `notify_seller_account_sold()`
- При передаче аккаунта продавцом (статус `delivered`) → `notify_seller_confirm_transfer()` + `notify_buyer_confirm_received()`
- При подтверждении покупателем (статус `confirmed`) → `notify_trade_completed()` — запрос верификации продавца
- При отмене → `notify_trade_cancelled()`

Все вызовы Telegram функций оборачивать в `try/except` чтобы ошибка бота не прерывала основную транзакцию.

### 2.3 Backend — Обработка Telegram callback кнопок

**Файл:** `telegram_bot/bot.py`

Добавить callback handlers для inline кнопок:

```python
async def seller_confirm_transfer_callback(update, context):
    """
    callback_data: seller_confirm_transfer_{escrow_id}
    - Обновляет escrow статус на 'delivered'
    - Отправляет покупателю уведомление notify_buyer_confirm_received()
    - Отвечает продавцу: "Отлично! Ожидаем подтверждения от покупателя."
    """

async def seller_cancel_trade_callback(update, context):
    """
    callback_data: seller_cancel_trade_{escrow_id}
    - Запрашивает подтверждение: "Вы уверены? Средства вернутся покупателю."
    - При подтверждении: отменяет escrow, уведомляет обе стороны
    """

async def buyer_confirm_received_callback(update, context):
    """
    callback_data: buyer_confirm_received_{escrow_id}
    - Обновляет escrow статус на 'confirmed'
    - Запускает процесс верификации продавца (Блок 4)
    - Уведомляет обе стороны о завершении
    """

async def buyer_open_dispute_callback(update, context):
    """
    callback_data: buyer_open_dispute_{escrow_id}
    - Предлагает ввести причину спора
    - Создаёт Report с типом 'scam'
    - Уведомляет admin
    """

async def buyer_cancel_trade_callback(update, context):
    """
    callback_data: buyer_cancel_trade_{escrow_id}
    - Запрашивает подтверждение и причину
    - При подтверждении: отменяет escrow
    """
```

---

## БЛОК 3 — Telegram уведомления о сообщениях в чате

### 3.1 Backend — Уведомление о новом сообщении

**Файл:** `wibestore_backend/apps/messaging/consumers.py`

В методе `save_message()` после сохранения сообщения:

```python
# Отправить Telegram уведомление получателю если он не онлайн в чате
await self.notify_recipient_telegram(message_data)
```

**Файл:** `wibestore_backend/apps/messaging/services.py`

```python
def send_telegram_chat_notification(room_id: str, sender, message_content: str) -> None:
    """
    Отправить уведомление в Telegram всем участникам чата
    кроме отправителя, если у них есть telegram_id.

    Сообщение:
    💬 Новое сообщение в WibeStore

    От: {sender.display_name}
    Сделка: {listing_title если есть}
    Сообщение: {message_content[:100]}...

    Кнопка: [Открыть чат] → deep link на ChatRoomPage
    """
```

Условие отправки: уведомление НЕ отправлять если:
- Получатель является отправителем
- У получателя нет `telegram_id`
- Получатель недавно (< 5 минут) читал этот чат (не отправлять спам при активном диалоге)

Реализовать через Celery задачу с задержкой 10 секунд (чтобы не спамить при быстром диалоге):
```python
# tasks.py
@shared_task
def send_chat_telegram_notification_task(room_id, sender_id, message_content):
    ...
```

---

## БЛОК 4 — Верификация продавца после сделки

### 4.1 Логика верификации (уже существует SellerVerification модель)

**Файл:** `telegram_bot/bot.py`

Когда покупатель подтверждает получение → запускается верификация продавца через бота:

**Шаг 1: Запрос живой локации**
```
Поздравляем с успешной продажей! 🎉

Для безопасности платформы WibeStore требует
верификацию после каждой сделки.

Пожалуйста, отправьте следующие материалы:
1️⃣ Живую геолокацию (Live Location на 15 минут)
2️⃣ Фото паспорта — лицевая сторона (с вашим именем)
3️⃣ Фото паспорта — обратная сторона
4️⃣ Круговое видео (video note) где вы произносите:
   "Я [имя] продал аккаунт [название] на WibeStore
    за [сумма] UZS. Аккаунт передан покупателю."

⚠️ Эти данные используются ТОЛЬКО в случае споров
и надёжно защищены.

[▶️ Начать верификацию]
```

**Шаг 2-5:** Пошаговый сбор данных — каждый шаг ждёт конкретный тип медиа.
Обновлять `SellerVerification.status` на каждом шаге.

**Шаг 6: Итог**
```
✅ Все материалы получены!

Данные на проверке у администратора WibeStore.
После проверки {seller_earnings} UZS будет
зачислено на ваш баланс.

Обычно проверка занимает до 30 минут.
```

### 4.2 Backend — Admin API для верификаций

**Файл:** `wibestore_backend/apps/admin_panel/views.py`

```
GET /api/v1/admin-panel/seller-verifications/?status=submitted|pending|approved|rejected
  Список верификаций с полными данными

GET /api/v1/admin-panel/seller-verifications/<uuid>/
  Детали верификации:
  - escrow данные (сумма, listing, buyer, seller)
  - passport_front_file_id, passport_back_file_id, circle_video_file_id
    → конвертировать в URL для отображения (скачать через Telegram Bot API)
  - location (lat, lng)
  - full_name

POST /api/v1/admin-panel/seller-verifications/<uuid>/approve/
  - Изменить статус на 'approved'
  - Зачислить seller_earnings на баланс продавца
  - Уведомить продавца через Telegram о зачислении
  - Создать Transaction(type='purchase', status='completed')

POST /api/v1/admin-panel/seller-verifications/<uuid>/reject/
  body: { "reason": "..." }
  - Изменить статус на 'rejected', сохранить admin_note
  - Предложить продавцу пройти верификацию снова
  - Уведомить через Telegram с причиной отказа
```

### 4.3 Frontend — Вкладка верификаций в AdminTradeChats

В `src/pages/admin/AdminTradeChats.jsx` добавить вкладку "Верификации продавцов":
- Таблица с ожидающими верификациями
- Для каждой строки: seller info, listing title, сумма, дата
- Кнопка "Проверить" → модальное окно с:
  - Фото паспорта (front/back) — загружать через Telegram File API
  - Video note placeholder (ссылка на скачивание)
  - Карта с локацией (Google Maps embed или Yandex)
  - ФИО из паспорта
  - Кнопки: "Одобрить и зачислить" | "Отклонить (с причиной)"

---

## БЛОК 5 — Торговый Admin Panel (Trade Panel)

### 5.1 Backend — Расширенные API для торгового панели

**Файл:** `wibestore_backend/apps/admin_panel/views.py`

```
GET /api/v1/admin-panel/trades/?status=all|paid|delivered|confirmed|disputed&search=
  Список всех escrow сделок с полями:
  - escrow: id, status, amount, commission_amount, seller_earnings, created_at
  - listing: id, title, game (name, icon), price
  - buyer: id, email, username, phone_number, telegram_id, telegram_username, avatar
  - seller: id, email, username, phone_number, telegram_id, telegram_username, avatar
  - chat_room: id (если существует)
  - seller_verification: status
  - buyer_confirmed_at, seller_paid_at, admin_released_at

GET /api/v1/admin-panel/trades/<uuid>/
  Детали сделки — всё вышеперечисленное

POST /api/v1/admin-panel/trades/<uuid>/complete/
  Принудительно завершить сделку (admin override):
  - Зачислить деньги продавцу
  - Статус → 'confirmed'
  - Уведомить оба стороны

POST /api/v1/admin-panel/trades/<uuid>/refund/
  Вернуть деньги покупателю:
  - Статус → 'refunded'
  - Зачислить amount на баланс buyer
  - Уведомить оба стороны

POST /api/v1/admin-panel/trades/<uuid>/resolve-dispute/
  body: { "winner": "buyer|seller", "note": "..." }
  - Закрыть спор в пользу winner
  - Если seller: зачислить seller_earnings
  - Если buyer: вернуть amount

GET /api/v1/admin-panel/trades/stats/
  {
    "active_trades": 12,
    "pending_delivery": 5,
    "disputed": 3,
    "completed_today": 23,
    "total_volume_today": 5800000,
    "avg_trade_duration_hours": 2.3
  }
```

### 5.2 Frontend — Страница AdminTradePanel

**Файл:** `src/pages/admin/AdminTradePanel.jsx`

Отдельная страница (не путать с AdminTradeChats который для чатов):

**Вкладка 1: Все сделки**
- Карточки статистики вверху: активные, ожидают передачи, споры, завершено сегодня
- Таблица сделок с фильтрами по статусу
- Каждая строка: аватары buyer/seller, название аккаунта, игра, сумма, статус, дата
- Кнопка "Детали" → side panel или модалка

**Вкладка 2: Детали сделки (side panel)**
- Полная информация о сделке
- Блок покупателя: аватар, имя, email, телефон, telegram (@username + ссылка)
- Блок продавца: аватар, имя, email, телефон, telegram (@username + ссылка)
- Информация об аккаунте: название, игра, цена, изображение
- Timeline статусов: когда создана, когда оплачена, когда передана, когда подтверждена
- Кнопка "Открыть чат сделки" → переход на AdminTradeChats с этим чатом
- Кнопки действий: "Завершить сделку" | "Вернуть деньги" | "Разрешить спор"

**Добавить маршрут в AdminLayout:**
```jsx
{ path: '/admin/trades', icon: ShoppingBag, label: 'Сделки' }
```

### 5.3 Telegram уведомление администратору о новой сделке

**Файл:** `wibestore_backend/apps/payments/telegram_notify.py`

```python
def notify_admin_new_trade(escrow: EscrowTransaction) -> None:
    """
    Всем admin пользователям (is_staff=True AND telegram_id IS NOT NULL):

    🛍️ Новая сделка #{escrow_id[:8]}

    📦 Аккаунт: {listing.title}
    🎮 Игра: {listing.game.name}
    💰 Сумма: {amount} UZS

    👤 Покупатель: {buyer.display_name}
       📱 {buyer.phone_number}
       💬 @{buyer.telegram_username}

    👤 Продавец: {seller.display_name}
       📱 {seller.phone_number}
       💬 @{seller.telegram_username}

    Кнопки:
    [📋 Открыть в панели]  [💬 Чат сделки]
    """

def notify_admin_dispute_opened(escrow: EscrowTransaction, reason: str) -> None:
    """
    ⚠️ Открыт спор по сделке #{escrow_id[:8]}

    Причина: {reason}
    Покупатель: {buyer info}
    Продавец: {seller info}
    Аккаунт: {listing.title}
    Сумма: {amount} UZS

    Кнопки:
    [🔍 Рассмотреть спор]  [✅ Одобрить продавцу]  [↩️ Вернуть покупателю]
    """

def notify_admin_seller_verification_submitted(verification: SellerVerification) -> None:
    """
    🔍 Новая верификация продавца

    Продавец: {seller.display_name} (@{telegram_username})
    Сделка: #{escrow_id[:8]} — {listing.title}
    Сумма к зачислению: {seller_earnings} UZS

    Все документы получены. Требуется проверка.

    Кнопки:
    [✅ Одобрить и зачислить]  [❌ Отклонить]  [📋 Детали]
    """
```

### 5.4 Callback для admin в Telegram боте

**Файл:** `telegram_bot/bot.py`

```python
async def admin_complete_trade_callback(update, context):
    """callback_data: admin_complete_trade_{escrow_id}"""

async def admin_refund_trade_callback(update, context):
    """callback_data: admin_refund_trade_{escrow_id}"""

async def admin_approve_verification_callback(update, context):
    """callback_data: admin_approve_verification_{verification_id}"""

async def admin_reject_verification_callback(update, context):
    """callback_data: admin_reject_verification_{verification_id}"""
    # Запросить причину через следующее сообщение (ConversationHandler state)
```

---

## БЛОК 6 — Уведомления в AdminTradeChats о новых чатах

**Файл:** `wibestore_backend/apps/messaging/services.py`

При создании нового ChatRoom для escrow сделки:

```python
def notify_admin_new_trade_chat(chat_room, escrow) -> None:
    """
    Всем admin со telegram_id:

    💬 Новый торговый чат открыт

    Сделка: #{escrow_id[:8]}
    Аккаунт: {listing.title} ({game.name})
    Покупатель: @{buyer.telegram_username} / {phone}
    Продавец: @{seller.telegram_username} / {phone}

    Кнопка: [📋 Открыть чат в панели]
    """
```

---

## БЛОК 7 — Дополнительные улучшения для пользователей (UX)

### 7.1 Страница статуса сделки (для пользователей)

**Файл:** `src/pages/TradePage.jsx`

Новая страница `/trade/<escrow_id>`:
- Timeline сделки с текущим статусом
- Информация об аккаунте (название, игра, изображение)
- Блок продавца/покупателя (аватар, имя, рейтинг)
- Кнопки действий в зависимости от роли и статуса:
  - Продавец + статус `paid`: кнопка "Передать аккаунт" (открывает форму с данными)
  - Покупатель + статус `delivered`: кнопки "Подтвердить получение" | "Открыть спор"
  - Ссылка на чат с другой стороной
- Real-time обновление статуса через polling (каждые 30 сек) или WebSocket

**Маршрут:** добавить в `App.jsx`:
```jsx
<Route path="/trade/:escrowId" element={<AuthGuard><TradePage /></AuthGuard>} />
```

### 7.2 Уведомления о статусе сделки на сайте

**Файл:** `wibestore_backend/apps/notifications/services.py`

При каждом изменении статуса escrow создавать Notification:
- Покупателю: "Ваша покупка обработана" / "Продавец передал аккаунт" / "Сделка завершена"
- Продавцу: "Ваш аккаунт куплен!" / "Покупатель подтвердил получение" / "Деньги зачислены"

### 7.3 Баланс в хедере (реальное время)

**Файл:** `src/components/Navbar.jsx`

- Показывать баланс пользователя рядом с аватаром: `💰 {balance} UZS`
- Обновлять через `useProfile()` с refetchInterval: 60000
- При изменении баланса — мигающая анимация (CSS transition)

### 7.4 История сделок в профиле пользователя

**Файл:** `src/pages/ProfilePage.jsx`

В разделе "Покупки" и "Продажи" — показывать статус каждой сделки:
- Иконка статуса рядом с каждой транзакцией
- Ссылка "Открыть сделку" → `/trade/<escrow_id>`
- Фильтр по статусу

---

## БЛОК 8 — Безопасность и технические улучшения

### 8.1 Rate limiting для Telegram callback

В `telegram_bot/bot.py` добавить проверку:
- Один и тот же callback не может быть обработан дважды (idempotency через Redis/DB flag)
- Защита от replay attacks: проверять что escrow статус соответствует ожидаемому перед переходом

```python
async def is_callback_already_processed(callback_id: str) -> bool:
    """Проверить в Redis была ли уже обработана эта кнопка."""
    # TTL: 1 час
```

### 8.2 Логирование действий администратора

**Файл:** `wibestore_backend/apps/admin_panel/models.py`

```python
class AdminAction(BaseModel):
    """Лог всех действий администратора."""
    admin = models.ForeignKey(settings.AUTH_USER_MODEL, on_delete=models.CASCADE)
    action_type = models.CharField(max_length=50)  # approve_trade, reject_verification, ban_user...
    target_type = models.CharField(max_length=50)  # EscrowTransaction, SellerVerification, User...
    target_id = models.CharField(max_length=36)    # UUID
    details = models.JSONField(default=dict)
    ip_address = models.GenericIPAddressField(null=True, blank=True)

    class Meta:
        db_table = "admin_actions"
        ordering = ["-created_at"]
```

Логировать все действия из admin_panel views автоматически через декоратор или middleware.

### 8.3 Celery задача — напоминание о незавершённых сделках

**Файл:** `wibestore_backend/apps/payments/tasks.py`

```python
@shared_task
def remind_pending_deliveries():
    """
    Каждый час: найти escrow со статусом 'paid' старше 2 часов.
    Отправить напоминание продавцу через Telegram.
    Если старше 12 часов — уведомить admin.
    """

@shared_task
def auto_release_escrow_after_timeout():
    """
    Каждый час: если покупатель не подтвердил в течение 48 часов
    после перехода в 'delivered' — автоматически завершить сделку.
    """
```

Добавить в `config/celery.py` beat schedule:
```python
"remind-pending-deliveries": {
    "task": "apps.payments.tasks.remind_pending_deliveries",
    "schedule": crontab(minute=0),  # каждый час
},
"auto-release-escrow": {
    "task": "apps.payments.tasks.auto_release_escrow_after_timeout",
    "schedule": crontab(minute=30),  # каждый час в :30
},
```

---

## БЛОК 9 — Миграции и конфигурация

### 9.1 Django миграции

После добавления/изменения моделей:
```bash
python manage.py makemigrations accounts payments admin_panel messaging
python manage.py migrate
```

### 9.2 Переменные окружения

Добавить в `.env.example`:
```env
# Admin Telegram IDs (через запятую — кому слать admin уведомления)
ADMIN_TELEGRAM_IDS=123456789,987654321

# Задержка уведомлений в чате (секунды, default: 10)
CHAT_NOTIFICATION_DELAY_SECONDS=10

# Timeout для автозавершения сделки (часы, default: 48)
ESCROW_AUTO_RELEASE_HOURS=48

# Timeout для напоминания продавцу (часы, default: 2)
DELIVERY_REMINDER_HOURS=2
```

### 9.3 Настройки Django

В `wibestore_backend/config/settings/base.py`:
```python
# Telegram Admin Settings
ADMIN_TELEGRAM_IDS = [int(x) for x in os.getenv("ADMIN_TELEGRAM_IDS", "").split(",") if x]
CHAT_NOTIFICATION_DELAY_SECONDS = int(os.getenv("CHAT_NOTIFICATION_DELAY_SECONDS", "10"))
ESCROW_AUTO_RELEASE_HOURS = int(os.getenv("ESCROW_AUTO_RELEASE_HOURS", "48"))
DELIVERY_REMINDER_HOURS = int(os.getenv("DELIVERY_REMINDER_HOURS", "2"))
```

---

## БЛОК 10 — Тестирование

### 10.1 Backend тесты

Для каждого нового API эндпоинта написать базовые тесты:
- `tests/test_admin_telegram.py` — аналитика бота
- `tests/test_trade_notifications.py` — Telegram уведомления
- `tests/test_escrow_flow.py` — полный флоу сделки

### 10.2 Проверочный чеклист

Перед завершением каждого блока проверить:
- [ ] API возвращает правильный статус код
- [ ] Telegram уведомления не блокируют основной поток (try/except)
- [ ] Admin эндпоинты защищены `IsAdminUser` пермишном
- [ ] Пагинация работает корректно
- [ ] Фронтенд хуки экспортированы из `hooks/index.js`
- [ ] i18n строки добавлены в все три локали
- [ ] Нет N+1 запросов (использовать `select_related`, `prefetch_related`)
- [ ] Новые маршруты добавлены в `App.jsx` и `AdminLayout.jsx`

---

## Порядок реализации (приоритет)

1. **БЛОК 1** — Telegram аналитика (самостоятельный, без зависимостей)
2. **БЛОК 2** — Уведомления при покупке (критично для бизнеса)
3. **БЛОК 5** — Trade Panel (нужен для управления сделками)
4. **БЛОК 3** — Уведомления в чате (улучшение UX)
5. **БЛОК 4** — Верификация продавца (зависит от БЛОК 2)
6. **БЛОК 6** — Уведомления о новых чатах (зависит от БЛОК 3)
7. **БЛОК 7** — UX улучшения (последний)
8. **БЛОК 8** — Безопасность и технические задачи (параллельно)
9. **БЛОК 9** — Миграции и конфиг (по мере добавления моделей)
10. **БЛОК 10** — Тестирование (в конце каждого блока)

---

## Справочная информация по проекту

### Существующие модели (не создавать заново)
- `accounts.User` — пользователь (telegram_id, balance, is_staff)
- `payments.EscrowTransaction` — сделка (escrow)
- `payments.DepositRequest` — заявки на пополнение
- `payments.SellerVerification` — верификация продавца (уже реализована)
- `payments.Transaction` — транзакции
- `messaging.ChatRoom` — чат комната
- `messaging.Message` — сообщения
- `notifications.Notification` — уведомления на сайте

### Существующие сервисы Telegram (расширять, не заменять)
- `payments/telegram_notify.py` — уже содержит `notify_credentials_sent()`
- `telegram_bot/bot.py` — основной файл бота (136KB, ConversationHandler структура)

### Паттерны React Query в проекте
```js
// Список с фильтрами:
const { data, isLoading } = useQuery({
  queryKey: ['admin-trades', filters],
  queryFn: () => apiClient.get('/api/v1/admin-panel/trades/', { params: filters }),
})

// Мутация:
const mutation = useMutation({
  mutationFn: (data) => apiClient.post(`/api/v1/admin-panel/trades/${id}/complete/`, data),
  onSuccess: () => queryClient.invalidateQueries(['admin-trades']),
})
```

### CSS переменные (использовать существующие)
```css
var(--color-bg-primary)      /* основной фон */
var(--color-text-primary)    /* основной текст */
var(--color-accent-blue)     /* акцентный синий */
var(--color-success-text)    /* зелёный текст */
var(--color-warning-text)    /* жёлтый текст */
var(--color-error-text)      /* красный текст */
var(--color-border-default)  /* граница */
var(--color-info-bg)         /* синий фон */
```

### Структура API ответов
```json
{
  "success": true,
  "data": { ... },
  "message": "Операция выполнена успешно",
  "pagination": { "count": 100, "next": "...", "previous": "..." }
}
```
