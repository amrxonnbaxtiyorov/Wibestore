# WibeStore — Полный промпт для улучшений

> Проект: WibeStore — маркетплейс игровых аккаунтов (Узбекистан)
> Стек: React 19 + Vite 7 + Tailwind CSS 4 (фронтенд), Django 5.1 + DRF + Channels + Celery (бэкенд), python-telegram-bot (бот)
> Все изменения вносить без нарушения существующей логики. Перед каждым изменением читать файл.

---

## 1. Улучшение интерфейса чата (ChatPage.jsx + ChatRoomPage.jsx)

**Файлы:**
- `src/pages/ChatPage.jsx`
- `src/pages/ChatRoomPage.jsx`
- `src/index.css`

**Задача:** Полностью переработать визуальное оформление чата — типографику, цвета пузырьков, поле ввода.

**Детальные требования:**

### 1.1 Пузырьки сообщений
- **Исходящие сообщения (sent):**
  - Фон: `var(--color-accent-blue)` → заменить на насыщенный синий `#2563EB`
  - Текст: `#FFFFFF` (белый, жирность 450)
  - Тень: `0 1px 2px rgba(0,0,0,0.15)`
  - Border-radius: `18px 18px 4px 18px`
- **Входящие сообщения (received):**
  - Фон: `var(--color-bg-secondary)` (не tertiary)
  - Текст: `var(--color-text-primary)`, font-weight: 400
  - Граница: `1px solid var(--color-border-muted)`
  - Border-radius: `18px 18px 18px 4px`
- **Отступы внутри пузырька:** `10px 14px`
- **Максимальная ширина пузырька:** `72%` (не более)

### 1.2 Метки времени и статус прочтения
- Время: `font-size: 11px`, `color: rgba(255,255,255,0.7)` для sent, `var(--color-text-muted)` для received
- Галочки прочтения: ✓ (серая) / ✓✓ (синяя) — `font-size: 12px`, выровнять по правому краю
- Время и галочки в одной строке с `gap: 4px`, `align-items: center`

### 1.3 Поле ввода сообщения
- Минимальная высота: `44px`, максимальная: `120px` (авторасширение через `textarea`)
- Фон: `var(--color-bg-secondary)`
- Граница: `1.5px solid var(--color-border-default)` → при фокусе: `var(--color-accent-blue)`
- Border-radius: `22px`
- Padding: `10px 16px`
- Font-size: `14px`, line-height: `1.5`
- Кнопка отправки: круглая 40px, `background: var(--color-accent-blue)`, иконка `Send` белого цвета, с transition `transform 0.15s` (при hover: `scale(1.05)`)
- Кнопка отправки неактивна (серая) когда поле пустое

### 1.4 Шапка чата (ChatRoom header)
- Высота: `64px`
- Фон: `var(--color-bg-primary)` с `border-bottom: 1px solid var(--color-border-default)`
- Аватар: 40px, с зелёной точкой онлайн (8px, `border: 2px solid var(--color-bg-primary)`)
- Имя пользователя: `font-size: 15px`, `font-weight: 600`
- Статус: `font-size: 12px`, `color: var(--color-accent-green)` если онлайн

### 1.5 Список чатов (sidebar)
- Ширина: `320px` (оставить как есть)
- Превью последнего сообщения: обрезать до 40 символов
- Непрочитанные: badge `background: var(--color-accent-blue)`, `color: #fff`, `font-size: 11px`, `min-width: 20px`, `height: 20px`, `border-radius: 10px`
- Время последнего сообщения: `font-size: 11px`, `color: var(--color-text-muted)`
- Активный чат: `background: var(--color-bg-secondary)` с `border-left: 3px solid var(--color-accent-blue)`

### 1.6 Дата-разделители
- Добавить дата-сепараторы между группами сообщений разных дней
- Дизайн: текст по центру, по бокам горизонтальные линии
- Текст: "Сегодня", "Вчера", или дата `DD.MM.YYYY`
- `font-size: 12px`, `color: var(--color-text-muted)`, `padding: 8px 0`

---

## 2. Telegram-уведомления при входящем сообщении в чате

**Файлы:**
- `wibestore_backend/apps/messaging/views.py` (SendMessageView)
- `wibestore_backend/apps/payments/telegram_notify.py`
- `telegram_bot/bot.py`

**Задача:** Когда пользователь A отправляет сообщение пользователю B через чат на сайте, и пользователь B имеет привязанный Telegram-аккаунт — отправить ему уведомление в Telegram.

**Реализация:**

### 2.1 В SendMessageView (бэкенд)
После успешного сохранения сообщения вызывать асинхронный Celery-таск:
```python
# После message.save() в SendMessageView
from apps.payments.telegram_notify import notify_new_chat_message
notify_new_chat_message.delay(str(message.id))
```

### 2.2 Новая функция в telegram_notify.py
```python
@shared_task(name="apps.payments.telegram_notify.notify_new_chat_message")
def notify_new_chat_message(message_id: str) -> None:
    """
    Отправить Telegram-уведомление получателю нового сообщения в чате.
    Уведомление отправляется только если:
    - Получатель привязал Telegram (user.telegram_id не None)
    - Получатель не является отправителем
    - Это первое непрочитанное сообщение от данного отправителя (антиспам)
    """
    from apps.messaging.models import Message
    from django.contrib.auth import get_user_model
    User = get_user_model()

    try:
        msg = Message.objects.select_related('sender', 'room').get(id=message_id)
        room = msg.room
        sender = msg.sender

        # Найти получателей (все участники кроме отправителя)
        recipients = room.participants.exclude(id=sender.id)

        for recipient in recipients:
            if not recipient.telegram_id:
                continue

            # Антиспам: отправлять только если нет других непрочитанных уведомлений от того же отправителя
            unread_count = Message.objects.filter(
                room=room,
                sender=sender,
                is_read=False
            ).count()

            if unread_count > 1:
                continue  # Уже есть непрочитанные — не спамить

            sender_name = getattr(sender, 'display_name', None) or sender.username or 'Пользователь'
            preview = msg.content[:80] + ('...' if len(msg.content) > 80 else '')

            # Ссылка на чат
            frontend_url = getattr(settings, 'FRONTEND_URL', 'https://wibestore.net').rstrip('/')
            chat_url = f"{frontend_url}/chat/{room.id}"

            text = (
                f"💬 <b>Yangi xabar!</b>\n\n"
                f"👤 <b>{sender_name}</b> sizga xabar yozdi:\n"
                f"<i>{preview}</i>\n\n"
                f"<a href='{chat_url}'>💬 Xabarni ko'rish →</a>"
            )

            _send_message(recipient.telegram_id, text)
    except Exception as e:
        logger.error("Failed to send chat notification: %s", e)
```

### 2.3 Антиспам логика
- Отправлять уведомление только при **первом** непрочитанном сообщении от пользователя
- Не отправлять повторно, пока предыдущее не прочитано
- Кнопка "Открыть чат" со ссылкой на конкретную комнату

---

## 3. Кнопки Submit/Cancel на шаге 3 страницы продажи

**Файл:** `src/pages/SellPage.jsx`

**Задача:** На 3-м шаге (Akkaunt ma'lumotlari) кнопки "E'lonni yuborish" и "Orqaga" должны иметь иконки в квадратных контейнерах.

**Требования к дизайну кнопок:**

### 3.1 Кнопка "Назад" (шаг 3)
```jsx
<button onClick={prevStep} className="btn btn-ghost btn-md flex items-center gap-2">
  <span className="btn-icon-square">
    <ArrowLeft className="w-4 h-4" />
  </span>
  {t('sell.back_btn')}
</button>
```

### 3.2 Кнопка "Отправить объявление" (шаг 3)
```jsx
<button onClick={handleSubmit} disabled={isSubmitting} className="btn btn-success btn-lg flex items-center gap-2">
  <span className="btn-icon-square">
    {isSubmitting ? <Loader2 className="w-4 h-4 animate-spin" /> : <Send className="w-4 h-4" />}
  </span>
  {isSubmitting ? t('sell.submitting') : t('sell.submit_btn')}
</button>
```

### 3.3 CSS класс для квадратных иконок кнопок (добавить в src/index.css)
```css
.btn-icon-square {
  display: inline-flex;
  align-items: center;
  justify-content: center;
  width: 28px;
  height: 28px;
  border-radius: var(--radius-md);
  background: rgba(255, 255, 255, 0.15);
  flex-shrink: 0;
}
.btn-ghost .btn-icon-square {
  background: var(--color-bg-tertiary);
}
```

### 3.4 Импорты
Добавить в SellPage.jsx: `import { ArrowLeft, Send, Loader2 } from 'lucide-react';`

---

## 4. Система ответа администратора в Telegram боте

**Файл:** `telegram_bot/bot.py`

**Текущее поведение:** Когда пользователь пишет в поддержку (кнопка "Admin bilan bog'lanish"), сообщение уходит администратору, но у администратора нет возможности ответить из бота.

**Задача:** Добавить возможность администратору ответить пользователю прямо из Telegram-бота.

### 4.1 Логика хранения сессий поддержки
В памяти (или Redis) хранить маппинг `admin_msg_id → user_telegram_id`:
```python
# Словарь для сессий поддержки (в production лучше Redis)
SUPPORT_SESSIONS: dict[int, int] = {}  # admin_message_id → user_telegram_id
```

### 4.2 Изменение обработчика support_msg_handler
После получения сообщения от пользователя — отправить администраторам с инлайн-кнопкой "Ответить":
```python
# Для каждого admin_telegram_id:
sent = await context.bot.send_message(
    chat_id=admin_id,
    text=(
        f"📩 <b>Yangi so'rov!</b>\n\n"
        f"👤 Foydalanuvchi: <b>{user.display_name}</b>\n"
        f"🆔 Telegram ID: <code>{user_tg_id}</code>\n\n"
        f"💬 Xabar:\n<i>{user_message}</i>"
    ),
    parse_mode="HTML",
    reply_markup=InlineKeyboardMarkup([[
        InlineKeyboardButton("↩️ Javob yozish", callback_data=f"support_reply:{user_tg_id}")
    ]])
)
# Сохранить сессию
SUPPORT_SESSIONS[sent.message_id] = user_tg_id
```

### 4.3 Новый callback-обработчик `support_reply:{user_tg_id}`
```python
async def support_reply_callback(update: Update, context: ContextTypes.DEFAULT_TYPE):
    """Администратор нажал 'Ответить' — переводим в режим ввода ответа."""
    query = update.callback_query
    await query.answer()

    if query.from_user.id not in ADMIN_TELEGRAM_IDS:
        return

    _, user_tg_id = query.data.split(":")
    context.user_data["reply_to_user"] = int(user_tg_id)

    await query.message.reply_text(
        "✏️ <b>Javobingizni yozing:</b>\n"
        "<i>Xabaringiz foydalanuvchiga «Admin javobi» sifatida yuboriladi.</i>",
        parse_mode="HTML"
    )
    return WAITING_ADMIN_REPLY
```

### 4.4 Обработчик ввода ответа администратором
```python
async def admin_reply_message_handler(update: Update, context: ContextTypes.DEFAULT_TYPE):
    """Отправить ответ администратора пользователю."""
    admin = update.message.from_user
    reply_text = update.message.text
    target_user_id = context.user_data.get("reply_to_user")

    if not target_user_id:
        await update.message.reply_text("❌ Xatolik: foydalanuvchi topilmadi.")
        return ConversationHandler.END

    # Отправить ответ пользователю
    try:
        await context.bot.send_message(
            chat_id=target_user_id,
            text=(
                f"📬 <b>Admin javobi:</b>\n\n"
                f"{reply_text}\n\n"
                f"<i>— WibeStore qo'llab-quvvatlash jamoasi</i>"
            ),
            parse_mode="HTML"
        )
        await update.message.reply_text("✅ Javob muvaffaqiyatli yuborildi!")
    except Exception as e:
        await update.message.reply_text(f"❌ Yuborishda xatolik: {e}")

    context.user_data.pop("reply_to_user", None)
    return ConversationHandler.END
```

### 4.5 Добавить состояние и обработчик в ConversationHandler
```python
WAITING_ADMIN_REPLY = 20  # новое состояние

# В ConversationHandler states добавить:
WAITING_ADMIN_REPLY: [MessageHandler(filters.TEXT & ~filters.COMMAND, admin_reply_message_handler)],

# В application.add_handler:
application.add_handler(CallbackQueryHandler(support_reply_callback, pattern=r"^support_reply:"))
```

---

## 5. Кнопка "Mening saytdagi akkauntim" → ссылка на профиль

**Файл:** `telegram_bot/bot.py`

**Задача:** Когда пользователь нажимает "Mening saytdagi akkauntim", бот должен показать ссылку на его профиль на сайте.

**Текущее поведение:** Показывает статистику аккаунта (баланс, продажи и т.д.) в тексте.

**Новое поведение:** После статистики добавить инлайн-кнопку с ссылкой:

```python
frontend_url = os.getenv("FRONTEND_URL", "https://wibestore.net").rstrip("/")
profile_url = f"{frontend_url}/profile"

# Добавить к существующему ответу кнопку:
reply_markup = InlineKeyboardMarkup([[
    InlineKeyboardButton(
        "🌐 Saytda profilimni ko'rish →",
        url=profile_url
    )
]])
```

Если пользователь авторизован через Telegram и у него есть `telegram_id` — сгенерировать прямую ссылку `/profile` (пользователь уже будет авторизован на сайте через JWT).

---

## 6. Удалить секцию "Taklif qilish" (Referral) из ProfilePage

**Файл:** `src/pages/ProfilePage.jsx`

**Задача:** Убрать вкладку "referral" и связанный контент из страницы профиля.

**Что удалить:**
1. Вкладку "referral" из массива `tabs` (около строки 120-130):
   ```jsx
   // Удалить эту вкладку:
   { id: 'referral', label: t('profile.referral_tab') || 'Dostlarni taklif qilish', icon: Users }
   ```
2. Блок `{activeTab === 'referral' && (...)}` (около строк 379-434)
3. Импорт хука `useReferral` если больше не используется
4. Проверить и убрать импорт `Referral`-иконки если не нужна

**Что оставить:** Все остальные вкладки (listings, purchases, sales, wallet, notifications, settings).

---

## 7. Согласование цен подписок: сайт ↔ Telegram бот

**Файлы:**
- `src/pages/PremiumPage.jsx`
- `telegram_bot/bot.py`
- `telegram_bot/.env` (или `.env.example`)
- `wibestore_backend/apps/payments/views.py` (Plans API)

**Текущие цены:**
- Сайт: берёт из API `/api/v1/auth/telegram/plans/` (fallback 50000 / 100000)
- Бот: `PREMIUM_PRICE_UZS=50000`, `PRO_PRICE_UZS=100000` из env

**Задача:** Убедиться что цены идут из **одного источника** — Plans API.

### 7.1 В боте — всегда брать цены из API
```python
async def _get_plans_from_api() -> dict:
    """Получить актуальные цены планов из API."""
    import aiohttp
    api_url = f"{API_BASE_URL}/auth/telegram/plans/"
    try:
        async with aiohttp.ClientSession() as session:
            async with session.get(api_url) as resp:
                if resp.status == 200:
                    return await resp.json()
    except Exception as e:
        logger.error("Failed to fetch plans: %s", e)
    # Fallback из env
    return {
        "premium": {"price_monthly": int(os.getenv("PREMIUM_PRICE_UZS", "50000"))},
        "pro": {"price_monthly": int(os.getenv("PRO_PRICE_UZS", "100000"))},
    }
```

### 7.2 В Plans API (бэкенд) — убедиться что возвращает корректные данные
Проверить `wibestore_backend/apps/payments/views.py` — эндпоинт `/api/v1/auth/telegram/plans/` должен возвращать:
```json
{
  "plans": [
    {"slug": "premium", "name": "Premium", "price_monthly": 50000, "commission": 8},
    {"slug": "pro", "name": "Pro", "price_monthly": 100000, "commission": 5}
  ]
}
```

---

## 8. Логика торгового чата (EscrowChat) — исправление и улучшение

**Файлы:**
- `src/pages/ChatRoomPage.jsx`
- `wibestore_backend/apps/messaging/views.py`
- `wibestore_backend/apps/payments/telegram_notify.py`

**Задача:** Исправить и улучшить поток торгового чата.

### 8.1 Исправление AdminOrderChatsView (бэкенд)
```python
class AdminOrderChatsView(generics.ListAPIView):
    """GET /api/v1/chat/admin/order-chats/ — список торговых чатов для администратора."""
    permission_classes = [permissions.IsAdminUser]
    serializer_class = ChatRoomSerializer

    def get_queryset(self):
        return ChatRoom.objects.filter(
            listing__isnull=False,
            is_active=True
        ).select_related(
            'listing__game', 'listing__seller'
        ).prefetch_related('participants').order_by('-last_message_at')
```

### 8.2 Автодобавление администратора в торговый чат
При создании торгового чата (после покупки) — автоматически добавить всех активных администраторов:
```python
# В EscrowService.create_chat_room() или в create_escrow_transaction view:
from django.contrib.auth import get_user_model
User = get_user_model()
admins = User.objects.filter(is_staff=True, is_active=True)
for admin in admins:
    chat_room.participants.add(admin)
```

### 8.3 Инструкция администратора в чате
При первом входе администратора в торговый чат — показать системное сообщение:
```python
# В _maybe_send_credentials() или при добавлении администратора:
admin_intro_msg = Message.objects.create(
    room=chat_room,
    sender=admin_user,
    content=(
        "🛡️ Moderator sifatida chat ga kirdim.\n"
        "Bu yerda xaridor va sotuvchi o'rtasidagi savdoni kuzataman.\n"
        "Muammo bo'lsa — murojaat qiling."
    ),
    message_type="system"
)
```

### 8.4 Отображение системных сообщений в ChatRoomPage.jsx
```jsx
{msg.message_type === 'system' ? (
  <div className="text-center" style={{ padding: '8px 0' }}>
    <span style={{
      fontSize: '12px',
      color: 'var(--color-text-muted)',
      backgroundColor: 'var(--color-bg-secondary)',
      padding: '4px 12px',
      borderRadius: 'var(--radius-full)',
      border: '1px solid var(--color-border-muted)'
    }}>
      🛡️ {msg.content}
    </span>
  </div>
) : (
  // Обычное сообщение
)}
```

---

## 9. Полная доработка Telegram бота — поток сделки

**Файл:** `telegram_bot/bot.py`

**Задача:** Привести все шаги торговой сделки в порядок, добавить недостающие хендлеры.

### 9.1 Уведомление покупателю при новом сообщении в торговом чате
```python
# В notify_new_chat_message (telegram_notify.py):
# Если сообщение в торговом чате (room.listing не None) — добавить ссылку на чат:
if room.listing:
    chat_url = f"{frontend_url}/chat/{room.id}"
    text += f"\n\n<a href='{chat_url}'>💬 Savdo chatini ochish →</a>"
```

### 9.2 Принятие округлённых видео (video_note) для верификации продавца
```python
# В VerifyVideoHandler — добавить обработку video_note:
async def verify_video_handler(update: Update, context: ContextTypes.DEFAULT_TYPE):
    msg = update.message

    if msg.video:
        file_id = msg.video.file_id
        file_type = "video"
    elif msg.video_note:  # Круглое видео
        file_id = msg.video_note.file_id
        file_type = "video_note"
    elif msg.document and msg.document.mime_type.startswith("video/"):
        file_id = msg.document.file_id
        file_type = "video"
    else:
        await msg.reply_text("❌ Iltimos, video yuboring (oddiy yoki doira shaklida).")
        return VERIFY_VIDEO

    context.user_data["verification_video"] = {"file_id": file_id, "type": file_type}
    # ... продолжить верификацию
```

### 9.3 Принятие ID-карты (документов) — фронт и обратная сторона
```python
async def verify_passport_handler(update: Update, context: ContextTypes.DEFAULT_TYPE):
    """Принимает фото паспорта/ID-карты."""
    msg = update.message

    if msg.photo:
        file_id = msg.photo[-1].file_id  # Высокое качество
    elif msg.document and msg.document.mime_type.startswith("image/"):
        file_id = msg.document.file_id
    else:
        await msg.reply_text(
            "❌ Iltimos, pasport yoki ID kartaning rasmini yuboring.\n"
            "📸 Rasm aniq va to'liq ko'rinishi kerak."
        )
        return VERIFY_PASSPORT_FRONT  # или BACK

    # Сохранить file_id и продолжить
```

### 9.4 Подтверждение сделки — финальный поток
Убедиться что при `trade_seller_ok` и `trade_buyer_ok` оба подтвердили:
```python
async def trade_confirm_callback(update: Update, context: ContextTypes.DEFAULT_TYPE):
    query = update.callback_query
    await query.answer()

    action, escrow_id = query.data.split(":", 1)  # trade_seller_ok:UUID

    # Получить эскроу из API
    escrow = await _get_escrow_from_api(escrow_id)
    if not escrow:
        await query.message.reply_text("❌ Savdo topilmadi.")
        return

    if action == "trade_seller_ok":
        # Пометить что продавец подтвердил
        await _update_escrow_api(escrow_id, {"seller_confirmed": True})
        await query.message.edit_text("✅ Siz tasdiqlаdingiz. Xaridor tasdiqini kutmoqda...")

    elif action == "trade_buyer_ok":
        # Пометить что покупатель подтвердил
        await _update_escrow_api(escrow_id, {"buyer_confirmed": True})
        await query.message.edit_text("✅ Siz tasdiqlаdingiz. To'lov chiqarilmoqda...")

    elif action == "trade_cancel":
        # Открыть спор
        await _open_dispute_via_api(escrow_id)
        await query.message.edit_text("⚠️ Nizo ochildi. Moderator tez orada hal qiladi.")
```

---

## 10. Telegram-уведомления для сайта — полный поток

**Файл:** `wibestore_backend/apps/payments/telegram_notify.py`

**Задача:** Убедиться что все ключевые события отправляют уведомления в Telegram.

### Чеклист уведомлений:

| Событие | Кому | Статус |
|---------|------|--------|
| Новый заказ создан | Продавец + Покупатель + Админ | ✅ есть |
| Продавец отправил данные | Покупатель | ✅ есть |
| Покупатель подтвердил | Продавец | ✅ есть |
| Деньги переведены | Продавец | ✅ есть |
| Новое сообщение в чате | Получатель | ❌ нужно добавить (см. п.2) |
| Спор открыт | Продавец + Покупатель + Админ | ✅ есть |
| Верификация одобрена | Продавец | ✅ есть |
| Верификация отклонена | Продавец | ✅ есть |
| Пользователь написал в поддержку | Администраторы | ✅ есть |
| Администратор ответил | Пользователь | ❌ нужно добавить (см. п.4) |
| Баланс пополнен | Пользователь | проверить |
| Вывод обработан | Пользователь | проверить |

### 10.1 Проверить notify_balance_topup
```python
def notify_balance_topup(user, amount: Decimal) -> None:
    if not user.telegram_id:
        return
    text = (
        f"✅ <b>Balans to'ldirildi!</b>\n\n"
        f"💰 Miqdor: <b>{_fmt_price(amount)}</b>\n"
        f"👤 Hisob: {getattr(user, 'display_name', user.email)}"
    )
    _send_message(user.telegram_id, text)
```

### 10.2 Проверить notify_withdrawal_processed
```python
def notify_withdrawal_processed(user, amount: Decimal, status: str) -> None:
    if not user.telegram_id:
        return
    icon = "✅" if status == "completed" else "❌"
    status_text = "muvaffaqiyatli" if status == "completed" else "rad etildi"
    text = (
        f"{icon} <b>Pul yechish {status_text}!</b>\n\n"
        f"💸 Miqdor: <b>{_fmt_price(amount)}</b>"
    )
    _send_message(user.telegram_id, text)
```

---

## Порядок выполнения задач

1. **Сначала** — п.6 (удалить referral из ProfilePage) — самое простое
2. **Затем** — п.3 (кнопки с иконками в SellPage шаг 3)
3. **Затем** — п.1 (улучшение UI чата — ChatPage + ChatRoomPage)
4. **Затем** — п.5 (кнопка "мой аккаунт" в боте → ссылка)
5. **Затем** — п.7 (синхронизация цен подписок)
6. **Затем** — п.2 (уведомления в Telegram при новом сообщении)
7. **Затем** — п.4 (система ответа администратора в боте)
8. **Затем** — п.8 (логика торгового чата)
9. **Затем** — п.9 (полная доработка бота — поток сделки)
10. **Наконец** — п.10 (проверка всех уведомлений)

## Важные правила при реализации

- Перед каждым изменением файла — **обязательно прочитать его целиком**
- Не нарушать существующую логику эскроу-транзакций
- После каждого пункта — `git add`, `git commit`, `git push`
- Тестировать на dev-сервере перед отправкой
- Все тексты для пользователей — на **узбекском** языке (бот) или через i18n (сайт)
- Все тексты для администраторов в боте — допустимо на узбекском или русском

## Технические детали

- **Django settings:** `FRONTEND_URL`, `ADMIN_TELEGRAM_IDS`, `BOT_TOKEN` — из env
- **WebSocket URL для чата:** `ws://host/ws/chat/{room_id}/?token={jwt}`
- **API base:** `/api/v1/`
- **Telegram bot framework:** `python-telegram-bot >= 20.x` (async)
- **Celery broker:** Redis
- **CSS переменные:** все цвета — через `var(--color-*)`, не хардкодить hex
