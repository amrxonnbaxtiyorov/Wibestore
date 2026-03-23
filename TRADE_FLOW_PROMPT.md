# WibeStore — Savdo Jarayoni va Telegram Bot Integratsiyasi

**Versiya:** 3.0
**Loyiha:** WibeStore (c:\WibeStore\Wibestore)
**Stek:** React 19 + Vite 7 + TailwindCSS 4 + Django 5.1 + DRF + Django Channels + Celery + Redis + PostgreSQL 16 + Telegram Bot (python-telegram-bot)

---

## MUHIM — Umumiy Qoidalar

- Barcha o'zgarishlar mavjud kod bilan orqaga mos bo'lishi kerak
- Ishlaydigan komponentlarni qayta yozmaslik — faqat qo'shish va kengaytirish
- Backend: `apps/<appname>/models.py | views.py | serializers.py | services.py | tasks.py` arxitekturasiga rioya qilish
- Frontend: barcha hooklarni `src/hooks/index.js` orqali eksport qilish, stillar — faqat `src/index.css` dagi mavjud CSS-o'zgaruvchilar orqali
- Barcha UI stringlarni `src/locales/ru.json`, `src/locales/uz.json`, `src/locales/en.json` ga qo'shish
- Telegram Bot: barcha yangi handlerlarni `telegram_bot/bot.py` yoki `payment_bot/` ichiga qo'shish, mavjud strukturani saqlash
- Har bir blok tugagandan keyin: `git add . && git commit -m "feat: ..." && git push`

---

## MAVJUD TIZIM HAQIDA MUHIM MA'LUMOT

### Mavjud Fayllar (o'zgartirish kerak):
- **Backend EscrowTransaction modeli:** `wibestore_backend/apps/payments/models.py` — statuslar: `pending_payment`, `paid`, `delivered`, `confirmed`, `disputed`, `refunded`, `cancelled`
- **Backend EscrowService:** `wibestore_backend/apps/payments/services.py` — `create_escrow()`, `confirm_buyer_received()`, `seller_mark_delivered()`, `admin_release_payment()`
- **Backend Telegram bildirishnomalari:** `wibestore_backend/apps/payments/telegram_notify.py` — 7 ta funksiya mavjud
- **Backend SellerVerification modeli:** `wibestore_backend/apps/payments/models.py` — pasport + video
- **Frontend TradePage:** `src/pages/TradePage.jsx` — savdo timeline va statuslar
- **Telegram Bot:** `telegram_bot/bot.py` — asosiy bot (3684 qator)
- **Payment Bot:** `payment_bot/` — to'lov boti (handlers, keyboards, states)
- **API client:** `src/lib/apiClient.js` — Axios + JWT refresh interceptors

### Mavjud API endpointlar:
- `POST /api/v1/payments/purchase/` — listing sotib olish (escrow yaratish)
- `POST /api/v1/payments/escrow/{id}/confirm/` — haridor tasdiqlaydi
- `POST /api/v1/payments/escrow/{id}/dispute/` — nizo ochish
- `GET /api/v1/payments/escrow/{id}/` — escrow tafsilotlari
- `GET /api/v1/payments/balance/` — balans

---

## BLOK 1 — To'lov Qilingandan Keyin Telegram Bildirishnomalar (Savdo Boshlanishi)

### 1.1 Backend — Savdo boshlanishi bildirishnomalari

**Fayl:** `wibestore_backend/apps/payments/telegram_notify.py`

Muvaffaqiyatli to'lov amalga oshirilgandan so'ng (EscrowTransaction statusi `paid` bo'lganda) ikkala tomonga ham Telegram bot orqali xabar yuborish:

#### Sotuvchiga xabar:
```
🎉 Sizning akkauntingiz sotildi!

📦 Akkaunt: {listing_title}
🎮 O'yin: {game_name}
💰 Narx: {price} so'm
👤 Haridor: @{buyer_username}

📋 Savdo ID: #{escrow_id}
📅 Sana: {datetime}

⚠️ Iltimos, akkaunt ma'lumotlarini haridorga yetkazing va savdoni tasdiqlang.

[✅ Tasdiqlash] [❌ Bekor qilish]
```

#### Haridorga xabar:
```
🛒 To'lov muvaffaqiyatli amalga oshirildi!

📦 Akkaunt: {listing_title}
🎮 O'yin: {game_name}
💰 Narx: {price} so'm
👤 Sotuvchi: @{seller_username}

📋 Savdo ID: #{escrow_id}
📅 Sana: {datetime}

⏳ Sotuvchi akkaunt ma'lumotlarini yuborishi kutilmoqda...
Akkauntni qabul qilganingizdan so'ng tasdiqlang yoki muammo bo'lsa bekor qiling.

[✅ Tasdiqlash] [❌ Bekor qilish]
```

### 1.2 Backend — Inline keyboard callback data formati

**Fayl:** `telegram_bot/bot.py` yoki `payment_bot/handlers/trade_callbacks.py`

Callback data formati:
```
trade_confirm_{escrow_id}_{user_type}   # user_type = "buyer" | "seller"
trade_cancel_{escrow_id}_{user_type}
```

Har bir tugma bosilganda:
1. Foydalanuvchi identifikatsiyasi tekshiriladi (telegram_id → user)
2. Faqat tegishli foydalanuvchi o'z tugmasini bosa oladi
3. Harakat EscrowTransaction modeliga yoziladi

### 1.3 Backend — EscrowTransaction modelini kengaytirish

**Fayl:** `wibestore_backend/apps/payments/models.py`

Mavjud EscrowTransaction modeliga yangi maydonlar qo'shish:

```python
# Sotuvchi tasdiqlashi
seller_confirmed = models.BooleanField(default=False)
seller_confirmed_at = models.DateTimeField(null=True, blank=True)
seller_cancelled = models.BooleanField(default=False)
seller_cancelled_at = models.DateTimeField(null=True, blank=True)
seller_cancel_reason = models.TextField(blank=True, default="")

# Haridor tasdiqlashi
buyer_confirmed = models.BooleanField(default=False)
buyer_confirmed_at = models.DateTimeField(null=True, blank=True)
buyer_cancelled = models.BooleanField(default=False)
buyer_cancelled_at = models.DateTimeField(null=True, blank=True)
buyer_cancel_reason = models.TextField(blank=True, default="")

# Telegram xabar IDlari (keyinchalik tugmalarni o'chirish uchun)
seller_telegram_message_id = models.BigIntegerField(null=True, blank=True)
buyer_telegram_message_id = models.BigIntegerField(null=True, blank=True)
```

### 1.4 Migratsiya

```bash
cd wibestore_backend
python manage.py makemigrations payments
python manage.py migrate
```

---

## BLOK 2 — Ikki Tomonlama Tasdiqlash / Bekor Qilish Tizimi

### 2.1 Backend — Savdo tasdiqlash/bekor qilish logikasi

**Fayl:** `wibestore_backend/apps/payments/services.py`

`EscrowService` ichiga yangi metodlar qo'shish:

#### `seller_confirm_trade(escrow_id, user)`:
```python
def seller_confirm_trade(self, escrow_id, user):
    """Sotuvchi savdoni tasdiqlaydi"""
    escrow = EscrowTransaction.objects.get(id=escrow_id, seller=user)

    if escrow.status not in ['paid', 'delivered']:
        raise ValidationError("Bu savdoni hozir tasdiqlab bo'lmaydi")

    escrow.seller_confirmed = True
    escrow.seller_confirmed_at = timezone.now()
    escrow.save()

    # Haridorga Telegram xabar yuborish
    notify_trade_party_confirmed(escrow, confirmed_by="seller")

    # Agar ikki tomon ham tasdiqlagan bo'lsa → savdoni yakunlash
    if escrow.buyer_confirmed and escrow.seller_confirmed:
        self._complete_trade(escrow)

    return escrow
```

#### `buyer_confirm_trade(escrow_id, user)`:
```python
def buyer_confirm_trade(self, escrow_id, user):
    """Haridor savdoni tasdiqlaydi"""
    escrow = EscrowTransaction.objects.get(id=escrow_id, buyer=user)

    if escrow.status not in ['paid', 'delivered']:
        raise ValidationError("Bu savdoni hozir tasdiqlab bo'lmaydi")

    escrow.buyer_confirmed = True
    escrow.buyer_confirmed_at = timezone.now()
    escrow.save()

    # Sotuvchiga Telegram xabar yuborish
    notify_trade_party_confirmed(escrow, confirmed_by="buyer")

    # Agar ikki tomon ham tasdiqlagan bo'lsa → savdoni yakunlash
    if escrow.buyer_confirmed and escrow.seller_confirmed:
        self._complete_trade(escrow)

    return escrow
```

#### `seller_cancel_trade(escrow_id, user, reason="")`:
```python
def seller_cancel_trade(self, escrow_id, user, reason=""):
    """Sotuvchi savdoni bekor qiladi"""
    escrow = EscrowTransaction.objects.get(id=escrow_id, seller=user)

    escrow.seller_cancelled = True
    escrow.seller_cancelled_at = timezone.now()
    escrow.seller_cancel_reason = reason
    escrow.save()

    # Haridorga bekor qilinganini bildirish
    notify_trade_cancelled(escrow, cancelled_by="seller", reason=reason)

    # Agar ikki tomon ham bekor qilgan bo'lsa → savdoni bekor qilish va pul qaytarish
    if escrow.buyer_cancelled and escrow.seller_cancelled:
        self._cancel_and_refund_trade(escrow)
    # Agar faqat bir tomon bekor qilgan bo'lsa → ikkinchi tomonga bildirish
    # va uning ham javobini kutish

    return escrow
```

#### `buyer_cancel_trade(escrow_id, user, reason="")`:
```python
def buyer_cancel_trade(self, escrow_id, user, reason=""):
    """Haridor savdoni bekor qiladi"""
    escrow = EscrowTransaction.objects.get(id=escrow_id, buyer=user)

    escrow.buyer_cancelled = True
    escrow.buyer_cancelled_at = timezone.now()
    escrow.buyer_cancel_reason = reason
    escrow.save()

    # Sotuvchiga bekor qilinganini bildirish
    notify_trade_cancelled(escrow, cancelled_by="buyer", reason=reason)

    # Agar ikki tomon ham bekor qilgan bo'lsa → savdoni bekor qilish va pul qaytarish
    if escrow.buyer_cancelled and escrow.seller_cancelled:
        self._cancel_and_refund_trade(escrow)

    return escrow
```

### 2.2 Savdo holatlari logikasi

```
SAVDO HOLATLARI:

1. To'lov qilindi (paid) → Ikkala tomonga Telegram xabar [Tasdiqlash] [Bekor qilish]

2a. Ikkala tomon TASDIQLADI → Savdo muvaffaqiyatli → BLOK 3 ga o'tish (Verifikatsiya)
2b. Ikkala tomon BEKOR QILDI → Savdo bekor → Pul haridorga qaytariladi
2c. Bir tomon tasdiqladi, bir tomon bekor qildi → Nizo (dispute) → Admin hal qiladi
2d. Bir tomon tasdiqladi, ikkinchisi hali javob bermagan → Kutish holati

TIMEOUT: Agar 24 soat ichida javob bo'lmasa → Celery task orqali admin ga bildirish
```

### 2.3 Backend — API endpointlar

**Fayl:** `wibestore_backend/apps/payments/views.py`

Yangi endpointlar:
```
POST /api/v1/payments/escrow/{id}/seller-confirm/
  Body: {} (bo'sh)
  Response: { "status": "confirmed", "both_confirmed": true/false }

POST /api/v1/payments/escrow/{id}/seller-cancel/
  Body: { "reason": "Akkauntni boshqaga sotdim" }  # ixtiyoriy
  Response: { "status": "cancelled", "both_cancelled": true/false }

POST /api/v1/payments/escrow/{id}/buyer-confirm/
  Body: {}
  Response: { "status": "confirmed", "both_confirmed": true/false }

POST /api/v1/payments/escrow/{id}/buyer-cancel/
  Body: { "reason": "Akkaunt ishlamadi" }  # ixtiyoriy
  Response: { "status": "cancelled", "both_cancelled": true/false }

GET /api/v1/payments/escrow/{id}/trade-status/
  Response: {
    "escrow_id": "uuid",
    "status": "paid",
    "seller_confirmed": false,
    "buyer_confirmed": true,
    "seller_cancelled": false,
    "buyer_cancelled": false,
    "both_confirmed": false,
    "both_cancelled": false,
    "waiting_for": "seller"  # yoki "buyer" yoki "both" yoki "none"
  }
```

### 2.4 Telegram Bot — Callback handlerlar

**Fayl:** `telegram_bot/bot.py` yoki `payment_bot/handlers/trade_callbacks.py`

```python
async def handle_trade_callback(update: Update, context: ContextTypes.DEFAULT_TYPE):
    query = update.callback_query
    data = query.data  # "trade_confirm_{escrow_id}_seller" yoki "trade_cancel_{escrow_id}_buyer"

    parts = data.split("_")
    action = parts[1]      # "confirm" | "cancel"
    escrow_id = parts[2]   # UUID
    user_type = parts[3]   # "buyer" | "seller"

    # API ga so'rov yuborish
    response = await api_client.post(
        f"/api/v1/payments/escrow/{escrow_id}/{user_type}-{action}/",
        headers={"Authorization": f"Bearer {user_token}"}
    )

    if response["both_confirmed"]:
        await query.edit_message_text(
            "✅ Savdo muvaffaqiyatli yakunlandi!\n\n"
            "Ikkala tomon ham tasdiqladi. Endi sotuvchi verifikatsiyadan o'tishi kerak."
        )
    elif response["both_cancelled"]:
        await query.edit_message_text(
            "❌ Savdo bekor qilindi.\n\n"
            "Ikkala tomon ham bekor qildi. Pul haridorga qaytariladi."
        )
    elif action == "confirm":
        await query.edit_message_text(
            f"✅ Siz savdoni tasdiqladingiz.\n\n"
            f"⏳ {other_party} tomonning javobini kutilmoqda..."
        )
    elif action == "cancel":
        await query.edit_message_text(
            f"❌ Siz savdoni bekor qildingiz.\n\n"
            f"⏳ {other_party} tomonning javobini kutilmoqda..."
        )
```

### 2.5 Telegram bildirishnomalari — Savdo holati o'zgarganda

**Fayl:** `wibestore_backend/apps/payments/telegram_notify.py`

#### Bir tomon tasdiqlagan/bekor qilganda ikkinchisiga xabar:

Tasdiqlash xabari:
```
✅ {user_type} savdoni tasdiqladi!

📋 Savdo ID: #{escrow_id}
📦 Akkaunt: {listing_title}

⏳ Endi sizning javobingiz kutilmoqda.
Iltimos, savdoni tasdiqlang yoki bekor qiling.

[✅ Tasdiqlash] [❌ Bekor qilish]
```

Bekor qilish xabari:
```
⚠️ {user_type} savdoni bekor qildi!

📋 Savdo ID: #{escrow_id}
📦 Akkaunt: {listing_title}
📝 Sabab: {reason}

Agar siz ham bekor qilsangiz, savdo tugaydi va pul qaytariladi.
Agar tasdiqlamoqchi bo'lsangiz, admin bilan bog'lanishingiz kerak.

[✅ Tasdiqlash] [❌ Bekor qilish]
```

#### Ikki tomon ham tasdiqlanganda:
```
🎉 Savdo muvaffaqiyatli yakunlandi!

📋 Savdo ID: #{escrow_id}
📦 Akkaunt: {listing_title}
🎮 O'yin: {game_name}
💰 Narx: {price} so'm

✅ Haridor tasdiqladi: {buyer_confirmed_at}
✅ Sotuvchi tasdiqladi: {seller_confirmed_at}

📋 Keyingi qadam: Sotuvchi verifikatsiyadan o'tishi kerak.
```

#### Ikki tomon ham bekor qilganda:
```
❌ Savdo bekor qilindi!

📋 Savdo ID: #{escrow_id}
📦 Akkaunt: {listing_title}
💰 {price} so'm haridorga qaytariladi.

Savdo #{escrow_id} yakunlandi.
```

---

## BLOK 3 — Sotuvchi Verifikatsiyasi (Savdo tugagandan keyin)

### 3.1 Verifikatsiya jarayoni

Savdo muvaffaqiyatli tugagandan so'ng (ikki tomon ham tasdiqlagan), sotuvchiga Telegram bot orqali verifikatsiya jarayoni boshlanadi:

#### 3.1.1 Sotuvchiga yuborilgan xabar:
```
📋 Savdo muvaffaqiyatli tugadi!

Endi pulni olish uchun quyidagi ma'lumotlarni yuboring:

1️⃣ ID karta (pasport) OLD TOMONI rasmi
2️⃣ ID karta (pasport) ORQA TOMONI rasmi
3️⃣ Dumaloq video (Telegram circle video)

⚠️ Videoda quyidagilarni aytishingiz kerak:

"Men wibestore.net da akkauntimni sotdim.
Agar akkauntdan muammo chiqsa va savdodan keyin
akkauntda muammo chiqsa, menga qonuniy jazo
qo'llashlari mumkin. Bergan ma'lumotlarimni
wibestore.net faqat shu sotilgan akkaunt bo'yicha
muammo bo'lsa ishlatishi uchun huquqni beraman."

⬇️ Boshlash uchun ID kartangizning old tomonini yuboring:
```

### 3.2 Backend — SellerVerification modelini yangilash

**Fayl:** `wibestore_backend/apps/payments/models.py`

Mavjud `SellerVerification` modeliga yangi maydonlar qo'shish yoki yangilash:

```python
class SellerVerification(BaseModel):
    escrow = models.ForeignKey(EscrowTransaction, on_delete=models.CASCADE, related_name="verifications")
    seller = models.ForeignKey(settings.AUTH_USER_MODEL, on_delete=models.CASCADE, related_name="seller_verifications")

    # Hujjatlar
    id_card_front = models.CharField(max_length=500, blank=True, default="")  # Telegram file_id
    id_card_back = models.CharField(max_length=500, blank=True, default="")   # Telegram file_id
    circle_video = models.CharField(max_length=500, blank=True, default="")   # Telegram file_id (dumoloq video)

    # Video tekshirish
    video_text_verified = models.BooleanField(default=False)  # Admin videodagi matnni tekshirdimi

    # Holat
    STATUS_CHOICES = [
        ('pending', 'Kutilmoqda'),
        ('id_front_uploaded', 'ID karta old tomoni yuklandi'),
        ('id_back_uploaded', 'ID karta orqa tomoni yuklandi'),
        ('video_uploaded', 'Video yuklandi'),
        ('submitted', 'Yuborildi'),
        ('approved', 'Tasdiqlandi'),
        ('rejected', 'Rad etildi'),
    ]
    status = models.CharField(max_length=30, choices=STATUS_CHOICES, default='pending')

    # Admin ko'rib chiqishi
    reviewed_by = models.ForeignKey(
        settings.AUTH_USER_MODEL, on_delete=models.SET_NULL,
        null=True, blank=True, related_name="reviewed_verifications"
    )
    reviewed_at = models.DateTimeField(null=True, blank=True)
    admin_note = models.TextField(blank=True, default="")
    rejection_reason = models.TextField(blank=True, default="")

    # Telegram ma'lumotlari
    seller_telegram_id = models.BigIntegerField(null=True, blank=True)
    verification_message_id = models.BigIntegerField(null=True, blank=True)

    class Meta:
        db_table = "seller_verifications"
        ordering = ["-created_at"]
```

### 3.3 Telegram Bot — 3 bosqichli verifikatsiya

**Fayl:** `telegram_bot/bot.py` yoki `payment_bot/handlers/verification.py`

ConversationHandler holatlar:
```python
VERIFICATION_STATES = {
    WAITING_ID_FRONT: 1,    # ID karta old rasmi kutilmoqda
    WAITING_ID_BACK: 2,     # ID karta orqa rasmi kutilmoqda
    WAITING_CIRCLE_VIDEO: 3  # Dumaloq video kutilmoqda
}
```

#### Bosqich 1: ID karta old tomoni
```python
async def handle_id_front(update, context):
    photo = update.message.photo[-1]  # eng yuqori sifat
    file_id = photo.file_id

    # DB ga saqlash
    verification.id_card_front = file_id
    verification.status = 'id_front_uploaded'
    verification.save()

    await update.message.reply_text(
        "✅ ID kartaning old tomoni qabul qilindi!\n\n"
        "2️⃣ Endi ID kartaning ORQA TOMONINI yuboring:"
    )
    return WAITING_ID_BACK
```

#### Bosqich 2: ID karta orqa tomoni
```python
async def handle_id_back(update, context):
    photo = update.message.photo[-1]
    file_id = photo.file_id

    verification.id_card_back = file_id
    verification.status = 'id_back_uploaded'
    verification.save()

    await update.message.reply_text(
        "✅ ID kartaning orqa tomoni qabul qilindi!\n\n"
        "3️⃣ Endi DUMALOQ VIDEO yuboring.\n\n"
        "⚠️ Videoda quyidagilarni aytishingiz SHART:\n\n"
        "\"Men wibestore.net da akkauntimni sotdim. "
        "Agar akkauntdan muammo chiqsa va savdodan keyin "
        "akkauntda muammo chiqsa, menga qonuniy jazo "
        "qo'llashlari mumkin. Bergan ma'lumotlarimni "
        "wibestore.net faqat shu sotilgan akkaunt bo'yicha "
        "muammo bo'lsa ishlatishi uchun huquqni beraman.\"\n\n"
        "📹 Telegramning o'zidan dumaloq video yuboring!"
    )
    return WAITING_CIRCLE_VIDEO
```

#### Bosqich 3: Dumaloq video
```python
async def handle_circle_video(update, context):
    # Telegram circle video = video_note
    if update.message.video_note:
        file_id = update.message.video_note.file_id
    elif update.message.video:
        # Oddiy video ham qabul qilinadi, lekin dumaloq tavsiya etiladi
        file_id = update.message.video.file_id
    else:
        await update.message.reply_text("❌ Iltimos, dumaloq video yuboring!")
        return WAITING_CIRCLE_VIDEO

    verification.circle_video = file_id
    verification.status = 'submitted'
    verification.save()

    await update.message.reply_text(
        "✅ Barcha hujjatlar qabul qilindi!\n\n"
        "⏳ Admin tekshiruvidan o'tishingizni kuting.\n"
        "Tasdiqlangandan so'ng pulingiz hisobingizga o'tkaziladi."
    )

    # Admin ga yuborish
    await send_verification_to_admin(verification)

    return ConversationHandler.END
```

### 3.4 Admin ga verifikatsiya xabari

**Fayl:** `telegram_bot/bot.py` yoki `payment_bot/handlers/admin.py`

Admin Telegram botga keladigan xabar:

```
📋 YANGI VERIFIKATSIYA SO'ROVI

👤 Sotuvchi: {seller_username} (@{seller_telegram_username})
📱 Telefon: {seller_phone}
🆔 Telegram ID: {seller_telegram_id}

📦 Savdo: #{escrow_id}
🎮 Akkaunt: {listing_title}
💰 Narx: {price} so'm
👤 Haridor: @{buyer_username}

📅 Savdo sanasi: {trade_date}
✅ Ikki tomon tasdiqlagan: {confirmed_date}

[📸 ID karta (old)] [📸 ID karta (orqa)] [📹 Video ko'rish]
[✅ Tasdiqlash] [❌ Rad etish]
```

Tugmalar uchun callback data:
```
verify_view_id_front_{verification_id}
verify_view_id_back_{verification_id}
verify_view_video_{verification_id}
verify_approve_{verification_id}
verify_reject_{verification_id}
```

### 3.5 Admin tasdiqlash/rad etish handleri

```python
async def handle_verify_approve(update, context):
    query = update.callback_query
    verification_id = query.data.split("_")[-1]

    # Backend API orqali tasdiqlash
    response = await api_client.post(
        f"/api/v1/payments/verification/{verification_id}/approve/",
        data={"admin_telegram_id": query.from_user.id}
    )

    if response.ok:
        # Sotuvchi hisobiga pul avtomatik o'tkaziladi
        await query.edit_message_text(
            f"✅ Verifikatsiya tasdiqlandi!\n\n"
            f"💰 {price} so'm sotuvchi hisobiga o'tkazildi.\n"
            f"Komisiya: {commission} so'm\n"
            f"Sotuvchi oladi: {seller_earnings} so'm"
        )

        # Sotuvchiga xabar yuborish
        await bot.send_message(
            chat_id=seller_telegram_id,
            text=(
                f"🎉 Verifikatsiya tasdiqlandi!\n\n"
                f"💰 {seller_earnings} so'm hisobingizga o'tkazildi.\n"
                f"📋 Savdo: #{escrow_id}\n\n"
                f"💳 Pulni yechish uchun /withdraw buyrug'ini yuboring."
            )
        )
```

### 3.6 Backend — Verifikatsiya API endpointlar

**Fayl:** `wibestore_backend/apps/payments/views.py`

```
POST /api/v1/payments/verification/{id}/approve/
  Faqat admin
  Body: { "admin_telegram_id": 123456, "note": "Hammasi to'g'ri" }
  Harakat:
    1. SellerVerification.status = "approved"
    2. EscrowTransaction.status = "confirmed"
    3. Sotuvchi balansiga pul qo'shish (narx - komisiya)
    4. Listing.status = "sold"
    5. Sotuvchiga Telegram xabar yuborish
  Response: { "status": "approved", "seller_balance": 150000 }

POST /api/v1/payments/verification/{id}/reject/
  Faqat admin
  Body: { "admin_telegram_id": 123456, "reason": "Video noto'g'ri" }
  Harakat:
    1. SellerVerification.status = "rejected"
    2. Sotuvchiga Telegram xabar yuborish (sabab bilan)
    3. Qayta yuborish imkoniyatini berish
  Response: { "status": "rejected" }
```

---

## BLOK 4 — Avtomatik Pul O'tkazish va Balans Boshqarish

### 4.1 Backend — Pul o'tkazish logikasi

**Fayl:** `wibestore_backend/apps/payments/services.py`

Admin verifikatsiyani tasdiqlagandan so'ng avtomatik:

```python
def release_funds_to_seller(escrow):
    """Admin tasdiqlangandan so'ng sotuvchiga pul o'tkazish"""
    with transaction.atomic():
        # Komisiya hisoblash
        platform_commission = escrow.amount * Decimal('0.05')  # 5% komisiya
        seller_earnings = escrow.amount - platform_commission

        # Sotuvchi balansini yangilash
        seller_profile = escrow.seller.profile
        seller_profile.balance += seller_earnings
        seller_profile.save()

        # Tranzaksiya yozuvi
        Transaction.objects.create(
            user=escrow.seller,
            type='payment',
            amount=seller_earnings,
            status='completed',
            description=f"Savdo #{escrow.id} dan daromad",
            metadata={
                'escrow_id': str(escrow.id),
                'original_amount': str(escrow.amount),
                'commission': str(platform_commission),
                'commission_rate': '5%'
            }
        )

        # Escrow statusni yangilash
        escrow.status = 'confirmed'
        escrow.seller_earnings = seller_earnings
        escrow.platform_commission = platform_commission
        escrow.save()

        return seller_earnings
```

### 4.2 Muhim qoida

**Pul faqat admin verifikatsiyani tasdiqlagandan so'ng o'tkaziladi.** Boshqa hech qanday holatda sotuvchiga pul o'tkazilmaydi. Jarayon:

```
To'lov → Ikki tomon tasdiqlash → Verifikatsiya → Admin tasdiqlash → PUL O'TKAZISH
```

---

## BLOK 5 — Pul Yechish (Withdrawal) Tizimi

### 5.1 Backend — WithdrawalRequest modeli

**Fayl:** `wibestore_backend/apps/payments/models.py`

```python
class WithdrawalRequest(BaseModel):
    user = models.ForeignKey(settings.AUTH_USER_MODEL, on_delete=models.CASCADE, related_name="withdrawal_requests")

    # Miqdor
    amount = models.DecimalField(max_digits=12, decimal_places=2)
    currency = models.CharField(max_length=10, default="UZS")

    # Karta ma'lumotlari
    card_number = models.CharField(max_length=20)  # HUMO/UZCARD/VISA
    card_holder_name = models.CharField(max_length=200)
    card_type = models.CharField(max_length=20, choices=[
        ('humo', 'HUMO'),
        ('uzcard', 'UZCARD'),
        ('visa', 'VISA'),
        ('mastercard', 'MasterCard'),
    ])

    # Holat
    STATUS_CHOICES = [
        ('pending', 'Kutilmoqda'),
        ('processing', 'Jarayonda'),
        ('completed', 'Bajarildi'),
        ('rejected', 'Rad etildi'),
    ]
    status = models.CharField(max_length=20, choices=STATUS_CHOICES, default='pending')

    # Admin
    reviewed_by = models.ForeignKey(
        settings.AUTH_USER_MODEL, on_delete=models.SET_NULL,
        null=True, blank=True, related_name="reviewed_withdrawals"
    )
    reviewed_at = models.DateTimeField(null=True, blank=True)
    admin_note = models.TextField(blank=True, default="")
    rejection_reason = models.TextField(blank=True, default="")

    # Telegram
    user_telegram_id = models.BigIntegerField(null=True, blank=True)
    admin_message_id = models.BigIntegerField(null=True, blank=True)

    class Meta:
        db_table = "withdrawal_requests"
        ordering = ["-created_at"]
```

### 5.2 Telegram Bot — Pul yechish jarayoni

**Fayl:** `payment_bot/handlers/withdrawal.py`

#### Foydalanuvchi `/withdraw` buyrug'ini yuboradi:

```
💳 Pul yechish

💰 Joriy balans: {balance} so'm

Qancha miqdor yechmoqchisiz?
Minimal: 10,000 so'm
Maksimal: {balance} so'm

Miqdorni kiriting:
```

#### Foydalanuvchi miqdor kiritgandan so'ng:

```
💳 Qaysi karta turini tanlang:

[HUMO] [UZCARD] [VISA] [MasterCard]
```

#### Karta tanlangandan so'ng:

```
💳 Karta raqamini kiriting:
Masalan: 8600 1234 5678 9012
```

#### Karta raqami kiritilgandan so'ng:

```
💳 Karta egasining to'liq ismini kiriting:
Masalan: ALIYEV JASUR
```

#### Tasdiqlash:

```
📋 Pul yechish so'rovi

💰 Miqdor: {amount} so'm
💳 Karta: {card_type} {card_number}
👤 Karta egasi: {card_holder_name}

Tasdiqlaysizmi?

[✅ Tasdiqlash] [❌ Bekor qilish]
```

### 5.3 Admin ga pul yechish so'rovi

Foydalanuvchi tasdiqlangandan so'ng adminga xabar:

```
💳 YANGI PUL YECHISH SO'ROVI

👤 Foydalanuvchi: {username} (@{telegram_username})
📱 Telefon: {phone}
🆔 Telegram ID: {telegram_id}

💰 Miqdor: {amount} so'm
💳 Karta: {card_type} {card_number}
👤 Karta egasi: {card_holder_name}

📊 Foydalanuvchi ma'lumotlari:
  💰 Joriy balans: {balance} so'm
  📦 Jami savdolar: {total_trades}
  ✅ Muvaffaqiyatli: {successful_trades}

[👤 Profil ko'rish] [📋 Savdolar tarixi] [📸 Verifikatsiya ma'lumotlari]
[✅ Tasdiqlash] [❌ Rad etish]
```

### 5.4 Admin tugmalari callback data formati:

```
withdrawal_view_profile_{withdrawal_id}
withdrawal_view_trades_{withdrawal_id}
withdrawal_view_verification_{withdrawal_id}
withdrawal_approve_{withdrawal_id}
withdrawal_reject_{withdrawal_id}
```

### 5.5 Admin tasdiqlash handleri

```python
async def handle_withdrawal_approve(update, context):
    query = update.callback_query
    withdrawal_id = query.data.split("_")[-1]

    # Backend API orqali tasdiqlash
    response = await api_client.post(
        f"/api/v1/payments/withdrawal/{withdrawal_id}/approve/",
        data={"admin_telegram_id": query.from_user.id}
    )

    if response.ok:
        await query.edit_message_text(
            f"✅ Pul yechish tasdiqlandi!\n\n"
            f"💰 {amount} so'm → {card_type} {card_number}\n"
            f"👤 {card_holder_name}\n\n"
            f"⚠️ Iltimos, kartaga o'tkazmani amalga oshiring."
        )

        # Foydalanuvchiga xabar
        await bot.send_message(
            chat_id=user_telegram_id,
            text=(
                f"✅ Pul yechish so'rovingiz tasdiqlandi!\n\n"
                f"💰 {amount} so'm {card_type} kartangizga o'tkazilmoqda.\n"
                f"💳 Karta: {card_number}\n\n"
                f"⏳ O'tkazma 1-24 soat ichida amalga oshiriladi."
            )
        )
```

### 5.6 Backend — Withdrawal API endpointlar

**Fayl:** `wibestore_backend/apps/payments/views.py`

```
POST /api/v1/payments/withdraw/
  Body: {
    "amount": 50000,
    "card_number": "8600123456789012",
    "card_holder_name": "ALIYEV JASUR",
    "card_type": "humo"
  }
  Tekshirish:
    - amount <= user.profile.balance
    - amount >= 10000 (minimal)
    - card_number formatini tekshirish
  Harakat:
    1. WithdrawalRequest yaratish
    2. Foydalanuvchi balansidan miqdorni ushlab turish (freeze)
    3. Admin ga Telegram xabar yuborish
  Response: { "id": "uuid", "status": "pending", "amount": 50000 }

POST /api/v1/payments/withdrawal/{id}/approve/
  Faqat admin
  Harakat:
    1. WithdrawalRequest.status = "completed"
    2. Foydalanuvchi balansidan miqdorni yechish (freeze dan emas, haqiqiy yechish)
    3. Transaction yozuvi yaratish (type='withdrawal')
    4. Foydalanuvchiga Telegram xabar
  Response: { "status": "completed" }

POST /api/v1/payments/withdrawal/{id}/reject/
  Faqat admin
  Body: { "reason": "Karta ma'lumotlari noto'g'ri" }
  Harakat:
    1. WithdrawalRequest.status = "rejected"
    2. Foydalanuvchi balansini qaytarish (unfreeze)
    3. Foydalanuvchiga Telegram xabar (sabab bilan)
  Response: { "status": "rejected" }

GET /api/v1/payments/withdrawals/
  Foydalanuvchi o'z withdrawal tarixini ko'rishi
  Filter: ?status=pending|completed|rejected

GET /api/v1/admin-panel/withdrawals/
  Admin panel uchun barcha withdrawal so'rovlari
  Filter: ?status=pending|completed|rejected&search=&date_from=&date_to=
```

---

## BLOK 6 — Frontend O'zgarishlar

### 6.1 TradePage.jsx yangilash

**Fayl:** `src/pages/TradePage.jsx`

Mavjud TradePage ga quyidagilarni qo'shish:

1. **Savdo holati ko'rsatish** — yangi timeline bosqichlari:
   ```
   1. To'lov ✅ → 2. Haridor tasdiqlash ⏳ → 3. Sotuvchi tasdiqlash ⏳ → 4. Verifikatsiya ⏳ → 5. Pul o'tkazish ⏳
   ```

2. **Tasdiqlash / Bekor qilish tugmalari** — frontend da ham ko'rsatish:
   - Haridor uchun: "Tasdiqlash" va "Bekor qilish" tugmalari
   - Sotuvchi uchun: "Tasdiqlash" va "Bekor qilish" tugmalari
   - Tugma bosilganda API ga so'rov + toast notification

3. **Real-time yangilanish** — `useQuery` bilan polling (har 10 sekundda)

4. **Holat indikatorlari:**
   - Haridor tasdiqladi: ✅ yashil badge
   - Sotuvchi tasdiqladi: ✅ yashil badge
   - Kutilmoqda: ⏳ sariq badge
   - Bekor qilindi: ❌ qizil badge

### 6.2 Yangi hooks

**Fayl:** `src/hooks/index.js`

```javascript
// Savdo tasdiqlash
export const useConfirmTrade = () => useMutation({
    mutationFn: ({ escrowId, userType }) =>
        apiClient.post(`/api/v1/payments/escrow/${escrowId}/${userType}-confirm/`),
    onSuccess: () => queryClient.invalidateQueries(['escrow'])
})

// Savdo bekor qilish
export const useCancelTrade = () => useMutation({
    mutationFn: ({ escrowId, userType, reason }) =>
        apiClient.post(`/api/v1/payments/escrow/${escrowId}/${userType}-cancel/`, { reason }),
    onSuccess: () => queryClient.invalidateQueries(['escrow'])
})

// Pul yechish
export const useCreateWithdrawal = () => useMutation({
    mutationFn: (data) => apiClient.post('/api/v1/payments/withdraw/', data),
    onSuccess: () => queryClient.invalidateQueries(['balance', 'withdrawals'])
})

// Pul yechish tarixi
export const useWithdrawals = (params) => useQuery({
    queryKey: ['withdrawals', params],
    queryFn: () => apiClient.get('/api/v1/payments/withdrawals/', { params })
})

// Savdo holati
export const useTradeStatus = (escrowId) => useQuery({
    queryKey: ['trade-status', escrowId],
    queryFn: () => apiClient.get(`/api/v1/payments/escrow/${escrowId}/trade-status/`),
    refetchInterval: 10000  // har 10 sekundda
})
```

### 6.3 ProfilePage — Pul yechish bo'limi

**Fayl:** `src/pages/ProfilePage.jsx`

Profil sahifasida "Balans" bo'limiga qo'shish:
- Joriy balans ko'rsatish
- "Pul yechish" tugmasi
- Withdrawal tarix jadvali (status, miqdor, karta, sana)

### 6.4 Admin Panel — Withdrawal boshqaruvi

**Fayl:** `src/pages/admin/AdminFinance.jsx`

Admin finance panelga yangi tab qo'shish: "Pul yechish so'rovlari"
- Pending so'rovlar ro'yxati
- Har bir so'rov uchun: foydalanuvchi ma'lumotlari, miqdor, karta, tasdiqlash/rad etish tugmalari
- Completed/Rejected tarix

---

## BLOK 7 — Celery Tasks va Avtomatizatsiya

### 7.1 Celery tasklari

**Fayl:** `wibestore_backend/apps/payments/tasks.py`

```python
@shared_task
def check_pending_trade_confirmations():
    """24 soatdan oshgan javobsiz savdolarni tekshirish"""
    threshold = timezone.now() - timedelta(hours=24)
    pending_escrows = EscrowTransaction.objects.filter(
        status='paid',
        created_at__lt=threshold,
    ).exclude(
        Q(buyer_confirmed=True) & Q(seller_confirmed=True)
    )

    for escrow in pending_escrows:
        # Admin ga bildirish
        notify_admin_pending_trade(escrow)
        # Ikki tomonga eslatma yuborish
        send_trade_reminder(escrow)

@shared_task
def check_pending_withdrawals():
    """48 soatdan oshgan ko'rib chiqilmagan withdrawal so'rovlarni tekshirish"""
    threshold = timezone.now() - timedelta(hours=48)
    pending = WithdrawalRequest.objects.filter(
        status='pending',
        created_at__lt=threshold
    )

    for withdrawal in pending:
        notify_admin_pending_withdrawal(withdrawal)
```

### 7.2 Celery Beat jadval

**Fayl:** `wibestore_backend/config/celery.py`

```python
CELERY_BEAT_SCHEDULE = {
    'check-pending-trades': {
        'task': 'apps.payments.tasks.check_pending_trade_confirmations',
        'schedule': crontab(hour='*/6'),  # har 6 soatda
    },
    'check-pending-withdrawals': {
        'task': 'apps.payments.tasks.check_pending_withdrawals',
        'schedule': crontab(hour='*/12'),  # har 12 soatda
    },
}
```

---

## BLOK 8 — i18n (Tarjimalar)

### 8.1 Yangi tarjima kalitlari

**Fayllar:** `src/locales/uz.json`, `src/locales/ru.json`, `src/locales/en.json`

```json
{
  "trade": {
    "confirm_title": "Savdoni tasdiqlang",
    "cancel_title": "Savdoni bekor qilish",
    "seller_confirmed": "Sotuvchi tasdiqladi",
    "buyer_confirmed": "Haridor tasdiqladi",
    "seller_cancelled": "Sotuvchi bekor qildi",
    "buyer_cancelled": "Haridor bekor qildi",
    "waiting_confirmation": "Tasdiqlash kutilmoqda",
    "both_confirmed": "Ikki tomon ham tasdiqladi",
    "both_cancelled": "Ikki tomon ham bekor qildi",
    "trade_completed": "Savdo muvaffaqiyatli yakunlandi",
    "trade_cancelled": "Savdo bekor qilindi",
    "verification_required": "Verifikatsiya talab qilinadi",
    "verification_pending": "Verifikatsiya tekshirilmoqda",
    "verification_approved": "Verifikatsiya tasdiqlandi",
    "funds_released": "Pul o'tkazildi",
    "confirm_button": "Tasdiqlash",
    "cancel_button": "Bekor qilish",
    "cancel_reason_placeholder": "Bekor qilish sababini kiriting..."
  },
  "withdrawal": {
    "title": "Pul yechish",
    "balance": "Joriy balans",
    "amount": "Miqdor",
    "card_number": "Karta raqami",
    "card_holder": "Karta egasi",
    "card_type": "Karta turi",
    "min_amount": "Minimal miqdor: 10,000 so'm",
    "submit": "So'rov yuborish",
    "pending": "Kutilmoqda",
    "completed": "Bajarildi",
    "rejected": "Rad etildi",
    "history": "Yechish tarixi",
    "no_withdrawals": "Hali pul yechish so'rovlari yo'q",
    "insufficient_balance": "Balans yetarli emas"
  }
}
```

---

## BLOK 9 — Xavfsizlik va Tekshirishlar

### 9.1 Xavfsizlik qoidalari

1. **Foydalanuvchi tekshirish:** Har bir API so'rovda JWT token orqali foydalanuvchi autentifikatsiyasi
2. **Ruxsat tekshirish:** Haridor faqat o'z savdosini tasdiqlashi/bekor qilishi mumkin, xuddi shunday sotuvchi ham
3. **Admin ruxsatlari:** Verifikatsiya tasdiqlash va withdrawal tasdiqlash faqat `is_staff=True` foydalanuvchilar uchun
4. **Rate limiting:** Telegram callback lar uchun rate limit (1 harakat/5 sekund)
5. **Atomic transactions:** Pul o'tkazish operatsiyalari `transaction.atomic()` ichida
6. **Double-spend himoya:** Bir savdoni ikki marta tasdiqlab bo'lmaydi
7. **Balans tekshirish:** Withdrawal miqdori balansdan oshmasligi kerak
8. **Telegram ID verifikatsiya:** Bot callback larda telegram_id ni backend dagi user bilan moslashtirish

### 9.2 Telegram Bot xavfsizlik

```python
# Admin tekshirish
ADMIN_TELEGRAM_IDS = [123456789, 987654321]  # .env dan olish

async def is_admin(telegram_id):
    return telegram_id in ADMIN_TELEGRAM_IDS

# Callback xavfsizlik
async def verify_callback_user(callback_query, escrow, expected_user_type):
    """Callback ni yuborgan foydalanuvchi haqiqatdan ham tegishli tomon ekanligini tekshirish"""
    telegram_id = callback_query.from_user.id
    user = await get_user_by_telegram_id(telegram_id)

    if expected_user_type == "buyer" and user != escrow.buyer:
        await callback_query.answer("❌ Siz bu savdoning haridori emassiz!", show_alert=True)
        return False
    if expected_user_type == "seller" and user != escrow.seller:
        await callback_query.answer("❌ Siz bu savdoning sotuvchisi emassiz!", show_alert=True)
        return False
    return True
```

---

## BLOK 10 — Migratsiyalar va Konfiguratsiya

### 10.1 Yangi migratsiyalar

```bash
cd wibestore_backend
python manage.py makemigrations payments
python manage.py migrate
```

### 10.2 .env yangi o'zgaruvchilar

```env
# Mavjudlarga qo'shish
TRADE_CONFIRMATION_TIMEOUT_HOURS=24
WITHDRAWAL_MIN_AMOUNT=10000
WITHDRAWAL_REVIEW_TIMEOUT_HOURS=48
PLATFORM_COMMISSION_RATE=0.05
```

### 10.3 URL routing

**Fayl:** `wibestore_backend/apps/payments/urls.py`

Yangi URL lar qo'shish:
```python
# Savdo tasdiqlash/bekor qilish
path('escrow/<uuid:pk>/seller-confirm/', SellerConfirmTradeView.as_view()),
path('escrow/<uuid:pk>/seller-cancel/', SellerCancelTradeView.as_view()),
path('escrow/<uuid:pk>/buyer-confirm/', BuyerConfirmTradeView.as_view()),
path('escrow/<uuid:pk>/buyer-cancel/', BuyerCancelTradeView.as_view()),
path('escrow/<uuid:pk>/trade-status/', TradeStatusView.as_view()),

# Verifikatsiya
path('verification/<uuid:pk>/approve/', VerificationApproveView.as_view()),
path('verification/<uuid:pk>/reject/', VerificationRejectView.as_view()),

# Withdrawal
path('withdraw/', CreateWithdrawalView.as_view()),
path('withdrawal/<uuid:pk>/approve/', WithdrawalApproveView.as_view()),
path('withdrawal/<uuid:pk>/reject/', WithdrawalRejectView.as_view()),
path('withdrawals/', WithdrawalListView.as_view()),
```

---

## TO'LIQ SAVDO JARAYONI DIAGRAMMASI

```
HARIDOR                          TIZIM                           SOTUVCHI
   |                               |                               |
   |--- To'lov qiladi ------------>|                               |
   |                               |--- Telegram xabar ----------->|
   |<-- Telegram xabar ------------|   [Tasdiqlash] [Bekor qilish] |
   |   [Tasdiqlash] [Bekor qilish] |                               |
   |                               |                               |
   |--- Tasdiqlash / Bekor ------->|<-- Tasdiqlash / Bekor --------|
   |                               |                               |
   |    AGAR IKKI TOMON TASDIQLASA:|                               |
   |                               |--- Verifikatsiya so'rovi ---->|
   |                               |   (ID karta + video)          |
   |                               |<-- Hujjatlar yuborildi -------|
   |                               |                               |
   |                          ADMIN TEKSHIRUVI                     |
   |                               |                               |
   |    AGAR ADMIN TASDIQLASA:     |                               |
   |                               |--- Pul o'tkazildi ----------->|
   |                               |   (balansga)                  |
   |                               |                               |
   |    SOTUVCHI PUL YECHMOQCHI:   |                               |
   |                               |<-- /withdraw buyrug'i --------|
   |                               |--- Admin ga so'rov            |
   |                          ADMIN TASDIQLAYDI                    |
   |                               |--- Kartaga o'tkazildi ------->|
   |                               |                               |

   AGAR IKKI TOMON BEKOR QILSA:
   |<-- Pul qaytarildi ------------|                               |

   AGAR BIR TOMON TASDIQLASA, BIRI BEKOR QILSA:
   |                          NIZO (DISPUTE)                       |
   |                          ADMIN HAL QILADI                     |
```

---

## BAJARISH TARTIBI

1. **BLOK 1** — EscrowTransaction modelini kengaytirish + Telegram bildirishnomalar
2. **BLOK 2** — Ikki tomonlama tasdiqlash/bekor qilish tizimi
3. **BLOK 3** — Sotuvchi verifikatsiyasi (ID + video + joylashuv + telefon raqam + jonli joylashuv)
4. **BLOK 4** — Avtomatik pul o'tkazish
5. **BLOK 5** — Pul yechish (withdrawal) tizimi
6. **BLOK 6** — Frontend o'zgarishlar (TradePage, ProfilePage, AdminPanel)
7. **BLOK 7** — Celery tasks va avtomatizatsiya
8. **BLOK 8** — i18n tarjimalar
9. **BLOK 9** — Xavfsizlik tekshiruvlari
10. **BLOK 10** — Migratsiyalar va konfiguratsiya

**Har bir blok tugagandan so'ng:**
```bash
git add . && git commit -m "feat: BLOK N - qisqa tavsif" && git push
```
