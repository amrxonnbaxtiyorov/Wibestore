"""
WibeStore Backend - Telegram Notification Utility

Xarid jarayonida haridor va sotuvchiga Telegram bot orqali xabar yuboradi.
"""

import json
import logging
import os
import urllib.error
import urllib.request

logger = logging.getLogger("apps.payments")

BOT_TOKEN = os.getenv("BOT_TOKEN", "") or os.getenv("TELEGRAM_BOT_TOKEN", "")
SITE_URL = os.getenv("SITE_URL", "https://wibestore.net").rstrip("/")
TELEGRAM_BOT_LINK = os.getenv("TELEGRAM_BOT_LINK", "https://t.me/wibestorebot")


def _fmt_price(amount) -> str:
    """Narxni formatlash: 150000 → '150 000 so'm'"""
    try:
        return f"{int(amount):,}".replace(",", " ") + " so'm"
    except Exception:
        return f"{amount} so'm"


def _send_message(chat_id: int, text: str, reply_markup: dict = None) -> bool:
    """Telegram Bot API orqali xabar yuborish (sinxron)."""
    if not BOT_TOKEN:
        logger.warning("Telegram BOT_TOKEN sozlanmagan — xabar yuborilmadi (chat_id=%s)", chat_id)
        return False
    if not chat_id:
        logger.debug("Telegram chat_id bo'sh — xabar yuborilmadi")
        return False

    url = f"https://api.telegram.org/bot{BOT_TOKEN}/sendMessage"
    payload: dict = {
        "chat_id": chat_id,
        "text": text,
        "parse_mode": "HTML",
        "disable_web_page_preview": True,
    }
    if reply_markup:
        payload["reply_markup"] = json.dumps(reply_markup)

    body = json.dumps(payload).encode("utf-8")
    req = urllib.request.Request(
        url,
        data=body,
        headers={"Content-Type": "application/json"},
        method="POST",
    )
    try:
        with urllib.request.urlopen(req, timeout=10) as resp:
            return resp.status == 200
    except urllib.error.HTTPError as e:
        raw = e.read().decode() if e.fp else ""
        logger.warning("Telegram xabar yuborilmadi (chat=%s, status=%s): %s", chat_id, e.code, raw[:200])
    except Exception as e:
        logger.warning("Telegram xabar yuborilmadi (chat=%s): %s", chat_id, e)
    return False


def notify_purchase_created(escrow, chat_room_id: str = None) -> None:
    """
    Xarid amalga oshirilganda haridor, sotuvchi va adminlarga xabar yuborish.
    chat_room_id: to'g'ridan-to'g'ri chat xonasiga havola uchun ID (ixtiyoriy)
    """
    listing = escrow.listing
    buyer = escrow.buyer
    seller = escrow.seller
    price_str = _fmt_price(escrow.amount)
    earnings_str = _fmt_price(escrow.seller_earnings)
    escrow_id = str(escrow.id)
    if chat_room_id:
        chat_link = f"{SITE_URL}/chat/{chat_room_id}"
    else:
        chat_link = _get_chat_link(escrow)

    # ── Xaridorga xabar ──────────────────────────────────────────────────
    if buyer.telegram_id:
        buyer_text = (
            f"🛒 <b>Xarid muvaffaqiyatli amalga oshirildi!</b>\n\n"
            f"📦 Akkaunt: <b>{listing.title}</b>\n"
            f"💰 To'langan summa: <b>{price_str}</b>\n"
            f"🔒 Mablag' escrow himoyasida saqlanmoqda\n\n"
            f"━━━━━━━━━━━━━━━━━━━━\n"
            f"📋 <b>SAVDO TARTIBI:</b>\n"
            f"1️⃣ Admin onlayn bo'lguncha login/parollar berilmaydi\n"
            f"2️⃣ Admin chatga yozganidan so'ng akkaunt ma'lumotlari avtomatik yuboriladi\n"
            f"3️⃣ Akkauntni tekshirib, tasdiqlash tugmasini bosing\n\n"
            f"⚠️ <b>MUHIM OGOHLANTIRISHLAR:</b>\n"
            f"❌ Admin tasdig'isiz hech qachon login/parolni bermang!\n"
            f"❌ Telegram, WhatsApp orqali ma'lumot almashib bo'lmaydi!\n"
            f"━━━━━━━━━━━━━━━━━━━━\n\n"
            f"🌐 <a href='{chat_link}'>Chatni ochish</a>"
        )
        _send_message(buyer.telegram_id, buyer_text)

    # ── Sotuvchiga xabar ─────────────────────────────────────────────────
    if seller.telegram_id:
        seller_text = (
            f"🎉 <b>Akkauntingiz sotildi!</b>\n\n"
            f"📦 Akkaunt: <b>{listing.title}</b>\n"
            f"💰 Xarid summasi: <b>{price_str}</b>\n"
            f"💵 Sizga tushadigan summa: <b>{earnings_str}</b>\n\n"
            f"━━━━━━━━━━━━━━━━━━━━\n"
            f"👥 <b>Haridor va admin saytdagi chatda sizni kutmoqda!</b>\n\n"
            f"📋 <b>SAVDO TARTIBI:</b>\n"
            f"1️⃣ Quyidagi tugma orqali chatga kiring\n"
            f"2️⃣ Admin chatga kirganidan so'ng akkaunt ma'lumotlari avtomatik yuboriladi\n"
            f"3️⃣ Haridor tasdiqlagan so'ng mablag' hisobingizga o'tkaziladi\n\n"
            f"⚠️ Login/parolni faqat sayt chat orqali yuboring!\n"
            f"━━━━━━━━━━━━━━━━━━━━\n\n"
            f"🌐 <a href='{chat_link}'>Chatga o'tish →</a>"
        )
        seller_keyboard = {
            "inline_keyboard": [
                [{"text": "📨 Chatga o'tish", "url": chat_link}],
                [{"text": "✅ Akkauntni topshirdim", "callback_data": f"escrow_seller_ok:{escrow_id}"}],
            ]
        }
        _send_message(seller.telegram_id, seller_text, reply_markup=seller_keyboard)

    # ── Adminlarga xabar ─────────────────────────────────────────────────
    for admin_tg_id in _get_admin_telegram_ids():
        if admin_tg_id in (buyer.telegram_id, seller.telegram_id):
            continue
        admin_text = (
            f"🔔 <b>Yangi xarid keldi!</b>\n\n"
            f"📦 {listing.title}\n"
            f"👤 Haridor: {buyer.display_name or buyer.email}\n"
            f"🛒 Sotuvchi: {seller.display_name or seller.email}\n"
            f"💰 Summa: <b>{price_str}</b>\n\n"
            f"Admin sifatida chatga kiring va savdoni nazorat qiling.\n"
            f"Admin yozgandan so'ng akkaunt ma'lumotlari avtomatik yuboriladi.\n\n"
            f"🌐 <a href='{chat_link}'>Chatni ochish</a>"
        )
        _send_message(admin_tg_id, admin_text)


def notify_seller_confirmed(escrow) -> None:
    """Sotuvchi akkauntni topshirganini tasdiqlagandan so'ng barcha tomonlarga xabar."""
    listing = escrow.listing
    buyer = escrow.buyer
    seller = escrow.seller
    escrow_id = str(escrow.id)
    chat_link = _get_chat_link(escrow)

    if buyer.telegram_id:
        buyer_text = (
            f"📬 <b>Sotuvchi akkauntni topshirdi!</b>\n\n"
            f"📦 Akkaunt: <b>{listing.title}</b>\n\n"
            f"Endi akkauntni tekshiring:\n"
            f"✔️ Login va parol ishlayaptimi?\n"
            f"✔️ Akkaunt to'liq qo'lingizga o'tdimi?\n\n"
            f"Hammasi yaxshi bo'lsa — tasdiqlang.\n"
            f"Muammo bo'lsa — quyidagi tugmani bosing.\n\n"
            f"⚠️ Tasdiqlashdan oldin akkauntni sinab ko'ring!"
        )
        buyer_keyboard = {
            "inline_keyboard": [
                [{"text": "✅ Akkauntni to'liq oldim", "callback_data": f"escrow_buyer_ok:{escrow_id}"}],
                [{"text": "❌ Muammo bor", "callback_data": f"escrow_buyer_no:{escrow_id}"}],
            ]
        }
        _send_message(buyer.telegram_id, buyer_text, reply_markup=buyer_keyboard)

    for admin_tg_id in _get_admin_telegram_ids():
        if admin_tg_id in (buyer.telegram_id, seller.telegram_id):
            continue
        _send_message(admin_tg_id, (
            f"🔔 Sotuvchi akkauntni topshirganini tasdiqladi.\n"
            f"📦 {listing.title}\n"
            f"🌐 <a href='{chat_link}'>Chat</a>"
        ))


def notify_buyer_confirmed(escrow) -> None:
    """Haridor akkauntni qabul qilganini tasdiqlagandan so'ng barcha tomonlarga xabar."""
    listing = escrow.listing
    seller = escrow.seller
    buyer = escrow.buyer
    earnings_str = _fmt_price(escrow.seller_earnings)

    if seller.telegram_id:
        seller_text = (
            f"✅ <b>Haridor akkauntni qabul qildi!</b>\n\n"
            f"📦 Akkaunt: <b>{listing.title}</b>\n"
            f"💵 Sizga: <b>{earnings_str}</b> o'tkazilishi jarayonida\n\n"
            f"Xarid muvaffaqiyatli yakunlandi!\n"
            f"🌐 <a href='{SITE_URL}'>Saytga kiring</a>"
        )
        _send_message(seller.telegram_id, seller_text)

    if buyer.telegram_id:
        _send_message(buyer.telegram_id, (
            f"✅ <b>Xarid yakunlandi!</b>\n\n"
            f"📦 {listing.title}\n\n"
            "Siz akkauntni qabul qilganingizni tasdiqladingiz.\n"
            "Mablag' sotuvchiga o'tkazilmoqda. 🎉"
        ))

    for admin_tg_id in _get_admin_telegram_ids():
        if admin_tg_id in (buyer.telegram_id, seller.telegram_id):
            continue
        _send_message(admin_tg_id, (
            f"✅ Haridor akkauntni tasdiqladi.\n"
            f"📦 {listing.title}\n"
            "Mablag' sotuvchiga o'tkazildi."
        ))


def _get_admin_telegram_ids() -> list:
    """Barcha aktiv admin foydalanuvchilarning telegram_id larini qaytaradi."""
    try:
        from django.contrib.auth import get_user_model
        User = get_user_model()
        return list(
            User.objects.filter(is_staff=True, is_active=True)
            .exclude(telegram_id__isnull=True)
            .values_list("telegram_id", flat=True)
        )
    except Exception:
        return []


def _answer_callback_query(callback_query_id: str, text: str = "") -> bool:
    """Answer a Telegram callback query."""
    if not BOT_TOKEN or not callback_query_id:
        return False
    url = f"https://api.telegram.org/bot{BOT_TOKEN}/answerCallbackQuery"
    payload = {"callback_query_id": callback_query_id, "text": text, "show_alert": False}
    body = __import__("json").dumps(payload).encode("utf-8")
    req = __import__("urllib.request", fromlist=["request"]).Request(
        url, data=body, headers={"Content-Type": "application/json"}, method="POST"
    )
    try:
        import urllib.request as _ur
        with _ur.urlopen(req, timeout=10) as resp:
            return resp.status == 200
    except Exception:
        return False


def _get_chat_link(escrow) -> str:
    base = f"{SITE_URL}/chat"
    try:
        from apps.messaging.models import ChatRoom
        room = (
            ChatRoom.objects.filter(listing=escrow.listing, is_active=True)
            .filter(participants=escrow.buyer)
            .filter(participants=escrow.seller)
            .first()
        )
        if room:
            return f"{SITE_URL}/chat/{room.id}"
    except Exception:
        pass
    return base


def notify_credentials_sent(escrow) -> None:
    """Admin chatga yozganidan so'ng akkaunt ma'lumotlari yuborilganda haridor va sotuvchiga xabar."""
    listing = escrow.listing
    buyer = escrow.buyer
    seller = escrow.seller
    escrow_id = str(escrow.id)
    chat_link = _get_chat_link(escrow)

    if buyer.telegram_id:
        buyer_text = (
            f"🔑 <b>Akkaunt ma'lumotlari yuborildi!</b>\n\n"
            f"📦 Akkaunt: <b>{listing.title}</b>\n\n"
            "Admin chatga kirdi va akkaunt ma'lumotlari chatga yuborildi.\n\n"
            "✅ Akkauntga kiring va tekshiring\n"
            "✅ Hammasi yaxshi bo'lsa — tasdiqlang\n"
            "❌ Muammo bo'lsa — quyidagi tugmani bosing\n\n"
            "⚠️ Tasdiqlashdan oldin akkauntni sinab ko'ring!"
        )
        buyer_keyboard = {
            "inline_keyboard": [[
                {"text": "✅ Akkauntni to'liq oldim", "callback_data": f"escrow_buyer_ok:{escrow_id}"},
                {"text": "❌ Muammo bor", "callback_data": f"escrow_buyer_no:{escrow_id}"},
            ]]
        }
        _send_message(buyer.telegram_id, buyer_text, reply_markup=buyer_keyboard)

    if seller.telegram_id:
        _send_message(seller.telegram_id, (
            f"🔔 <b>Akkaunt ma'lumotlari xaridorga yuborildi!</b>\n\n"
            f"📦 {listing.title}\n\n"
            "Haridor hozir akkauntni tekshirmoqda.\n"
            f"🌐 <a href='{chat_link}'>Chatni ochish</a>"
        ))


def notify_both_parties_confirmation(escrow, confirmed_by: str) -> None:
    """Kim tasdiqlagan — barcha tomonlarga chat va bot orqali yuborish."""
    listing = escrow.listing
    buyer = escrow.buyer
    seller = escrow.seller
    who = "Haridor" if confirmed_by == "buyer" else "Sotuvchi"
    detail = (
        "Haridor akkauntni to'liq olganini tasdiqladi."
        if confirmed_by == "buyer"
        else "Sotuvchi akkauntni topshirganini tasdiqladi."
    )
    msg = f"✅ <b>{who} tasdiqlaganini bildirdi</b>\n\n📦 {listing.title}\n\n{detail}"
    if buyer.telegram_id:
        _send_message(buyer.telegram_id, msg)
    if seller.telegram_id:
        _send_message(seller.telegram_id, msg)
    for admin_tg_id in _get_admin_telegram_ids():
        if admin_tg_id in (buyer.telegram_id, seller.telegram_id):
            continue
        _send_message(admin_tg_id, msg)


def notify_escrow_warning(escrow) -> None:
    """Tasdiqlash kutilayotganda ikkala tomonga eslatma."""
    listing = escrow.listing
    buyer = escrow.buyer
    seller = escrow.seller
    escrow_id = str(escrow.id)

    if buyer.telegram_id:
        buyer_keyboard = {
            "inline_keyboard": [[
                {"text": "✅ Akkauntni to'liq oldim", "callback_data": f"escrow_buyer_ok:{escrow_id}"},
                {"text": "❌ Muammo bor", "callback_data": f"escrow_buyer_no:{escrow_id}"},
            ]]
        }
        _send_message(buyer.telegram_id, (
            f"⏰ <b>Eslatma: Tasdiqlash kutilmoqda!</b>\n\n"
            f"📦 {listing.title}\n\n"
            "Siz hali akkauntni qabul qilganingizni tasdiqlamadingiz.\n"
            "💰 Mablag' escrowda saqlanmoqda.\n\n"
            "Agar akkauntni olgansiz — tasdiqlang.\n"
            "Muammo bo'lsa — quyidagi tugmani bosing."
        ), reply_markup=buyer_keyboard)

    if seller.telegram_id:
        _send_message(seller.telegram_id, (
            f"⏰ <b>Eslatma: Haridor hali tasdiqlamadi</b>\n\n"
            f"📦 {listing.title}\n\n"
            "Haridor hali akkauntni qabul qilganini tasdiqlamadi.\n"
            "💰 Mablag' escrowda saqlanmoqda.\n\n"
            f"🌐 <a href='{SITE_URL}/chat'>Chatni ochish</a>"
        ))


def notify_dispute_opened(escrow, reason: str = "") -> None:
    """Haridor shikoyat ochganida barcha tomonlarga xabar."""
    listing = escrow.listing
    seller = escrow.seller
    buyer = escrow.buyer
    reason_display = reason if reason else "Ko'rsatilmagan"

    if seller.telegram_id:
        seller_text = (
            f"⚠️ <b>Haridor shikoyat ochdi!</b>\n\n"
            f"📦 Akkaunt: <b>{listing.title}</b>\n"
            f"📝 Sabab: {reason_display}\n\n"
            f"Admin jamoamiz holatni tekshirib qaror qabul qiladi.\n"
            f"🌐 <a href='{SITE_URL}'>Saytga kiring</a>"
        )
        _send_message(seller.telegram_id, seller_text)

    for admin_tg_id in _get_admin_telegram_ids():
        if admin_tg_id == seller.telegram_id:
            continue
        _send_message(admin_tg_id, (
            f"🚨 <b>Shikoyat ochildi!</b>\n\n"
            f"📦 {listing.title}\n"
            f"👤 Haridor: {buyer.display_name or buyer.email}\n"
            f"📝 Sabab: {reason_display}"
        ))


def notify_escrow_released(escrow) -> None:
    """Admin tolov chiqarganida barcha tomonlarga xabar."""
    listing = escrow.listing
    seller = escrow.seller
    buyer = escrow.buyer
    earnings_str = _fmt_price(escrow.seller_earnings)

    if seller.telegram_id:
        seller_text = (
            f"💰 <b>To'lov hisobingizga o'tkazildi!</b>\n\n"
            f"📦 Akkaunt: <b>{listing.title}</b>\n"
            f"💵 Summa: <b>{earnings_str}</b>\n\n"
            f"Pul hisobingizda. Saytdan yechib olishingiz mumkin.\n"
            f"🌐 <a href='{SITE_URL}'>Saytga kiring</a>"
        )
        _send_message(seller.telegram_id, seller_text)

    if buyer.telegram_id:
        _send_message(buyer.telegram_id, (
            f"✅ Xarid yakunlandi. Mablag' sotuvchiga o'tkazildi.\n"
            f"📦 {listing.title}"
        ))


def notify_verification_request(escrow, verification) -> None:
    """Sotuvchiga shaxsini tasdiqlash so'rovi yuborish (akkaunt topshirilgandan so'ng)."""
    seller = escrow.seller
    listing = escrow.listing
    price_str = _fmt_price(escrow.amount)
    verification_id = str(verification.id)

    if not seller.telegram_id:
        return

    seller_name = seller.display_name or seller.email or "Sotuvchi"

    text = (
        f"🔐 <b>SHAXSINGIZNI TASDIQLANG</b>\n"
        f"━━━━━━━━━━━━━━━━━━━━\n\n"
        f"✅ <b>{listing.title}</b> akkauntingiz sotildi!\n"
        f"💰 Savdo narxi: <b>{price_str}</b>\n\n"
        f"Pulni olish uchun quyidagi hujjatlarni taqdim eting:\n\n"
        f"1️⃣ <b>Pasport/ID karta OLDI tomoni rasmi</b>\n"
        f"   ↳ Rasm tagiga to'liq ismingizni (F.I.SH) yozing\n\n"
        f"2️⃣ <b>Pasport/ID karta ORQA tomoni rasmi</b>\n\n"
        f"3️⃣ <b>Doira video (video xabar)</b>\n"
        f"   ↳ Quyidagini aytib, doira video yuboring:\n"
        f"   <i>«Men {seller_name} {listing.title} akkauntimni "
        f"Wibe Store saytida {price_str} ga sotdim. "
        f"Agar akkaunt bilan muammo bo'lsa, men tashlagan "
        f"hujjatlarim orqali qonuniy chora ko'rilishi mumkin»</i>\n\n"
        f"4️⃣ <b>Joriy joylashuv</b> (live location)\n\n"
        f"━━━━━━━━━━━━━━━━━━━━\n"
        f"🔒 <b>Maxfiylik kafolati:</b>\n"
        f"Bu ma'lumotlar faqat akkaunt bilan muammo "
        f"bo'lganda ishlatiladi va umuman hech kimga "
        f"berilmaydi. Sayt tomonidan maxfiy saqlanadi.\n\n"
        f"⬇️ Boshlash uchun quyidagi tugmani bosing:"
    )
    keyboard = {
        "inline_keyboard": [[
            {
                "text": "▶️ Hujjat taqdim etishni boshlash",
                "callback_data": f"start_verification:{verification_id}",
            }
        ]]
    }
    _send_message(seller.telegram_id, text, reply_markup=keyboard)


def notify_verification_submitted(escrow, verification, admin_tg_ids: list) -> None:
    """Admin(lar)ga sotuvchi hujjatlari yuborilganligi haqida xabar."""
    seller = escrow.seller
    listing = escrow.listing
    price_str = _fmt_price(escrow.amount)
    verification_id = str(verification.id)
    seller_name = seller.display_name or seller.email or "Sotuvchi"
    lat = verification.location_latitude
    lng = verification.location_longitude
    location_str = f"{lat:.5f}, {lng:.5f}" if lat and lng else "—"
    maps_link = (
        f"https://maps.google.com/?q={lat},{lng}"
        if lat and lng else ""
    )

    caption = (
        f"🔐 <b>Sotuvchi hujjatlari — tasdiqlash kerak</b>\n"
        f"━━━━━━━━━━━━━━━━━━━━\n\n"
        f"👤 Sotuvchi: <b>{seller_name}</b>\n"
        f"📝 To'liq ism (F.I.SH): <b>{verification.full_name or '—'}</b>\n"
        f"📦 Akkaunt: <b>{listing.title}</b>\n"
        f"💰 Narx: <b>{price_str}</b>\n"
        f"🆔 Telegram ID: <code>{seller.telegram_id}</code>\n"
        f"📍 Joylashuv: {location_str}"
    )
    if maps_link:
        caption += f"\n🗺️ <a href='{maps_link}'>Xaritada ko'rish</a>"

    caption += (
        f"\n\n━━━━━━━━━━━━━━━━━━━━\n"
        f"Tasdiqlash uchun hujjatlarni tekshiring va qaror qabul qiling:"
    )

    keyboard = {
        "inline_keyboard": [[
            {"text": "✅ Tasdiqlash", "callback_data": f"verify_approve:{verification_id}"},
            {"text": "❌ Rad etish", "callback_data": f"verify_reject:{verification_id}"},
        ]]
    }

    for admin_id in admin_tg_ids:
        _send_message(admin_id, caption, reply_markup=keyboard)


def notify_verification_approved(escrow, verification) -> None:
    """Sotuvchiga hujjatlari tasdiqlanganligi va pul hisobiga o'tkazilganligi haqida xabar."""
    seller = escrow.seller
    listing = escrow.listing
    earnings_str = _fmt_price(escrow.seller_earnings)

    if not seller.telegram_id:
        return

    text = (
        f"✅ <b>Hujjatlaringiz tasdiqlandi!</b>\n\n"
        f"📦 Akkaunt: <b>{listing.title}</b>\n"
        f"💰 Summa: <b>{earnings_str}</b> hisobingizga o'tkazildi!\n\n"
        f"🎉 Savdo muvaffaqiyatli yakunlandi!\n"
        f"🌐 <a href='{SITE_URL}'>Saytga kiring</a>"
    )
    _send_message(seller.telegram_id, text)


def notify_verification_rejected(verification) -> None:
    """Sotuvchiga hujjatlari rad etilganligi va qayta yuborish kerakligi haqida xabar."""
    from apps.payments.models import SellerVerification  # avoid circular
    seller = verification.seller
    note = verification.admin_note

    if not seller.telegram_id:
        return

    reason = note or "Ko`rsatilmagan"
    text = (
        f"❌ <b>Hujjatlaringiz rad etildi</b>\n\n"
        f"📝 Sabab: {reason}\n\n"
        f"Hujjatlaringiz soxta yoki noto'g'ri topildi.\n"
        f"Iltimos, haqiqiy hujjatlar bilan qayta yuboring.\n\n"
        f"⬇️ Qayta yuborish uchun quyidagi tugmani bosing:"
    )
    keyboard = {
        "inline_keyboard": [[
            {
                "text": "🔄 Qayta hujjat yuborish",
                "callback_data": f"start_verification:{verification.id}",
            }
        ]]
    }
    _send_message(seller.telegram_id, text, reply_markup=keyboard)


def notify_trade_completed(escrow) -> None:
    """
    Savdo to'liq yakunlanganda (status=confirmed) barcha tomonlarga xabar yuborish.
    Adminga batafsil: haridor va sotuvchi ma'lumotlari, narx, va akkauntga havolalar.
    """
    listing = escrow.listing
    buyer = escrow.buyer
    seller = escrow.seller
    price_str = _fmt_price(escrow.amount)
    earnings_str = _fmt_price(escrow.seller_earnings)
    commission_str = _fmt_price(escrow.commission_amount)

    def _user_info(u) -> str:
        lines = [f"<b>{u.display_name}</b>"]
        if u.email:
            lines.append(f"📧 {u.email}")
        if u.phone_number:
            lines.append(f"📞 {u.phone_number}")
        if u.telegram_id:
            lines.append(f"🆔 Telegram ID: <code>{u.telegram_id}</code>")
        if u.username:
            lines.append(f"👤 @{u.username}")
        return "\n".join(lines)

    # ── Adminga batafsil xabar ────────────────────────────────────────────
    listing_url = f"{SITE_URL}/account/{listing.id}"
    buyer_url = f"{SITE_URL}/seller/{buyer.id}"
    seller_url = f"{SITE_URL}/seller/{seller.id}"
    game_name = listing.game.name if listing.game else "—"

    admin_text = (
        f"🎉 <b>SAVDO MUVAFFAQIYATLI YAKUNLANDI!</b>\n"
        f"━━━━━━━━━━━━━━━━━━━━\n\n"
        f"📦 <b>Akkaunt:</b> {listing.title}\n"
        f"🎮 O'yin: {game_name}\n"
        f"💰 Xarid narxi: <b>{price_str}</b>\n"
        f"💵 Sotuvchiga o'tkazildi: <b>{earnings_str}</b>\n"
        f"📊 Komissiya: <b>{commission_str}</b>\n\n"
        f"━━━━━━━━━━━━━━━━━━━━\n"
        f"🛒 <b>HARIDOR:</b>\n{_user_info(buyer)}\n\n"
        f"━━━━━━━━━━━━━━━━━━━━\n"
        f"💼 <b>SOTUVCHI:</b>\n{_user_info(seller)}\n"
        f"━━━━━━━━━━━━━━━━━━━━"
    )
    admin_keyboard = {
        "inline_keyboard": [
            [
                {"text": "📦 Akkauntni ko'rish", "url": listing_url},
            ],
            [
                {"text": "👤 Haridorni ko'rish", "url": buyer_url},
                {"text": "🏪 Sotuvchini ko'rish", "url": seller_url},
            ],
        ]
    }
    for admin_tg_id in _get_admin_telegram_ids():
        if admin_tg_id in (buyer.telegram_id, seller.telegram_id):
            continue
        _send_message(admin_tg_id, admin_text, reply_markup=admin_keyboard)

    # ── Sotuvchiga xabar ─────────────────────────────────────────────────
    if seller.telegram_id:
        _send_message(seller.telegram_id, (
            f"💰 <b>To'lov hisobingizga o'tkazildi!</b>\n\n"
            f"📦 Akkaunt: <b>{listing.title}</b>\n"
            f"💵 Summa: <b>{earnings_str}</b> hisobingizda.\n\n"
            f"🎉 Savdo muvaffaqiyatli yakunlandi!\n"
            f"🌐 <a href='{SITE_URL}'>Saytga kiring</a>"
        ))

    # ── Xaridorga xabar ───────────────────────────────────────────────────
    if buyer.telegram_id:
        _send_message(buyer.telegram_id, (
            f"✅ <b>Xarid to'liq yakunlandi!</b>\n\n"
            f"📦 Akkaunt: <b>{listing.title}</b>\n\n"
            f"Mablag' sotuvchiga o'tkazildi. Savdo muvaffaqiyatli! 🎉\n"
            f"🌐 <a href='{listing_url}'>Akkauntni ko'rish</a>"
        ))


def notify_trade_confirmation_request(escrow, chat_link: str = "") -> None:
    """
    Xarid amalga oshirilgandan so'ng sotuvchi VA haridorga tasdiqlash tugmalari bilan xabar yuborish.
    chat_link: chat_room_id yoki to'liq URL
    """
    listing = escrow.listing
    buyer = escrow.buyer
    seller = escrow.seller
    escrow_id = str(escrow.id)
    price_str = _fmt_price(escrow.amount)
    if chat_link:
        chat_url = (
            chat_link if chat_link.startswith("http")
            else f"{SITE_URL}/chat/{chat_link}"
        )
    else:
        chat_url = _get_chat_link(escrow)

    # ── Sotuvchiga ───────────────────────────────────────────────────────
    if seller.telegram_id:
        seller_text = (
            f"🎉 <b>Akkauntingiz sotildi!</b>\n\n"
            f"📦 Akkaunt: <b>{listing.title}</b>\n"
            f"💰 Summa: <b>{price_str}</b>\n\n"
            f"Admin chatga kirganidan so'ng akkaunt ma'lumotlarini topshiring.\n"
            f"Haridor qabul qilgach — quyida <b>Tasdiqlash</b> tugmasini bosing.\n\n"
            f"🌐 <a href='{chat_url}'>Chatga o'tish →</a>"
        )
        seller_keyboard = {
            "inline_keyboard": [
                [{"text": "💬 Chatga o'tish", "url": chat_url}],
                [
                    {"text": "✅ Savdoni tasdiqlash", "callback_data": f"trade_seller_ok:{escrow_id}"},
                    {"text": "❌ Bekor qilish", "callback_data": f"trade_cancel:{escrow_id}"},
                ],
            ]
        }
        _send_message(seller.telegram_id, seller_text, reply_markup=seller_keyboard)

    # ── Haridorga ────────────────────────────────────────────────────────
    if buyer.telegram_id:
        buyer_text = (
            f"🛒 <b>Xarid muvaffaqiyatli amalga oshirildi!</b>\n\n"
            f"📦 Akkaunt: <b>{listing.title}</b>\n"
            f"💰 To'langan summa: <b>{price_str}</b>\n\n"
            f"Admin chatga kirganidan so'ng akkaunt ma'lumotlarini tekshiring.\n"
            f"Hammasi yaxshi bo'lsa — <b>Tasdiqlash</b> tugmasini bosing.\n\n"
            f"🌐 <a href='{chat_url}'>Chatga o'tish</a>"
        )
        buyer_keyboard = {
            "inline_keyboard": [
                [{"text": "💬 Chatga o'tish", "url": chat_url}],
                [
                    {"text": "✅ Savdoni tasdiqlash", "callback_data": f"trade_buyer_ok:{escrow_id}"},
                    {"text": "❌ Bekor qilish", "callback_data": f"trade_cancel:{escrow_id}"},
                ],
            ]
        }
        _send_message(buyer.telegram_id, buyer_text, reply_markup=buyer_keyboard)


def notify_trade_both_confirmed(escrow) -> None:
    """Ikkala tomon tasdiqlaganda — savdo yakunlandi xabari."""
    listing = escrow.listing
    seller = escrow.seller
    buyer = escrow.buyer
    earnings_str = _fmt_price(escrow.seller_earnings)

    if seller.telegram_id:
        _send_message(seller.telegram_id, (
            f"✅ <b>Savdo muvaffaqiyatli yakunlandi!</b>\n\n"
            f"📦 Akkaunt: <b>{listing.title}</b>\n"
            f"💵 Sizga: <b>{earnings_str}</b> o'tkazildi!\n\n"
            f"🎉 Rahmat! Baxtli savdolar!\n"
            f"🌐 <a href='{SITE_URL}'>Saytga kiring</a>"
        ))

    if buyer.telegram_id:
        _send_message(buyer.telegram_id, (
            f"✅ <b>Savdo muvaffaqiyatli yakunlandi!</b>\n\n"
            f"📦 Akkaunt: <b>{listing.title}</b>\n\n"
            f"Ikkala tomon ham tasdiqlaganidan so'ng savdo yakunlandi. 🎉\n"
            f"🌐 <a href='{SITE_URL}'>Saytga kiring</a>"
        ))

    for admin_tg_id in _get_admin_telegram_ids():
        if admin_tg_id in (buyer.telegram_id, seller.telegram_id):
            continue
        _send_message(admin_tg_id, (
            f"✅ <b>Savdo yakunlandi (ikkala tomon tasdiqladi)</b>\n\n"
            f"📦 {listing.title}\n"
            f"💵 Sotuvchiga: {earnings_str}"
        ))


def notify_trade_cancelled(escrow, cancelled_by: str) -> None:
    """Savdo bekor qilinganda ikkala tomonga xabar."""
    listing = escrow.listing
    seller = escrow.seller
    buyer = escrow.buyer
    who = "Sotuvchi" if cancelled_by == "seller" else "Haridor"

    msg_seller = (
        f"❌ <b>Savdo bekor qilindi</b>\n\n"
        f"📦 Akkaunt: <b>{listing.title}</b>\n"
        f"{who} tomonidan savdo bekor qilindi.\n\n"
        f"{'Haridor puli qaytarildi.' if cancelled_by == 'seller' else 'Pulingiz hisobingizga qaytarildi.'}\n"
        f"🌐 <a href='{SITE_URL}'>Saytga kiring</a>"
    )
    msg_buyer = (
        f"❌ <b>Savdo bekor qilindi</b>\n\n"
        f"📦 Akkaunt: <b>{listing.title}</b>\n"
        f"{who} tomonidan savdo bekor qilindi.\n\n"
        f"{'Pulingiz hisobingizga qaytarildi.' if cancelled_by == 'buyer' else 'Haridor puli qaytarildi.'}\n"
        f"🌐 <a href='{SITE_URL}'>Saytga kiring</a>"
    )

    if seller.telegram_id:
        _send_message(seller.telegram_id, msg_seller)
    if buyer.telegram_id:
        _send_message(buyer.telegram_id, msg_buyer)
    for admin_tg_id in _get_admin_telegram_ids():
        if admin_tg_id in (buyer.telegram_id, seller.telegram_id):
            continue
        _send_message(admin_tg_id, (
            f"❌ <b>Savdo bekor qilindi</b>\n\n"
            f"📦 {listing.title}\n"
            f"Kim bekor qildi: {who}"
        ))


def notify_deposit_approved(deposit_request, new_balance) -> None:
    """Admin hisob to'ldirishni tasdiqlaganda foydalanuvchiga Telegram xabar."""
    telegram_id = deposit_request.telegram_id
    if not telegram_id:
        return
    amount_str = _fmt_price(deposit_request.amount) if deposit_request.amount else "—"
    balance_str = _fmt_price(new_balance)
    text = (
        f"✅ <b>Hisob to'ldirish tasdiqlandi!</b>\n\n"
        f"💰 Qo'shilgan summa: <b>{amount_str}</b>\n"
        f"📊 Yangi balans: <b>{balance_str}</b>\n\n"
        f"🎉 Rahmat! Saytga kirib xarid qilishingiz mumkin.\n"
        f"🌐 <a href='{SITE_URL}'>{SITE_URL}</a>"
    )
    _send_message(telegram_id, text)


def notify_deposit_rejected(deposit_request) -> None:
    """Admin hisob to'ldirishni rad etganda foydalanuvchiga Telegram xabar."""
    telegram_id = deposit_request.telegram_id
    if not telegram_id:
        return
    text = (
        f"❌ <b>Hisob to'ldirish so'rovi rad etildi.</b>\n\n"
        f"Agar to'lov qilgan bo'lsangiz, to'lov chekingizni qayta yuboring "
        f"yoki admin bilan bog'laning.\n\n"
        f"🌐 <a href='{SITE_URL}'>{SITE_URL}</a>"
    )
    _send_message(telegram_id, text)


def notify_balance_topup(user, amount) -> None:
    """Balans to'ldirilganda foydalanuvchiga Telegram xabar."""
    if not getattr(user, "telegram_id", None):
        return
    from decimal import Decimal
    text = (
        f"✅ <b>Balans to'ldirildi!</b>\n\n"
        f"💰 Miqdor: <b>{_fmt_price(amount)}</b>\n"
        f"👤 Hisob: {getattr(user, 'display_name', None) or getattr(user, 'email', '') or 'Foydalanuvchi'}"
    )
    _send_message(user.telegram_id, text)


def notify_withdrawal_request(user, amount, card_number: str) -> None:
    """Pul yechish so'rovi yaratilganda adminlarga Telegram xabar yuborish."""
    user_name = getattr(user, "display_name", None) or getattr(user, "email", "") or "Noma'lum"
    user_phone = getattr(user, "phone_number", "") or "—"
    user_tg = getattr(user, "telegram_id", None)
    user_username = getattr(user, "username", "") or "—"

    text = (
        f"📤 <b>YANGI PUL YECHISH SO'ROVI!</b>\n"
        f"━━━━━━━━━━━━━━━━━━━━\n\n"
        f"👤 <b>Foydalanuvchi:</b>\n"
        f"   📝 Ism: {user_name}\n"
        f"   📱 Telefon: {user_phone}\n"
        f"   👤 Username: @{user_username}\n"
    )
    if user_tg:
        text += f"   🆔 Telegram ID: <code>{user_tg}</code>\n"
    text += (
        f"\n💰 <b>Summa:</b> {_fmt_price(amount)}\n"
        f"💳 <b>Karta:</b> <code>{card_number}</code>\n"
        f"━━━━━━━━━━━━━━━━━━━━"
    )

    # Agar sotuvchining tekshirilgan savdolari bo'lsa, info qo'shamiz
    try:
        from .models import SellerVerification
        verifications = SellerVerification.objects.filter(
            seller=user, status=SellerVerification.STATUS_APPROVED,
        ).select_related("escrow", "escrow__listing").order_by("-created_at")[:5]
        if verifications:
            text += "\n\n📋 <b>So'nggi tasdiqlangan savdolar:</b>"
            for v in verifications:
                listing_title = v.escrow.listing.title if v.escrow and v.escrow.listing else "—"
                text += f"\n   • {listing_title}"
    except Exception:
        pass

    keyboard = {
        "inline_keyboard": [[
            {"text": "👤 Profilni ko'rish", "url": f"{SITE_URL}/seller/{user.id}"},
        ]]
    }

    for admin_tg_id in _get_admin_telegram_ids():
        _send_message(admin_tg_id, text, reply_markup=keyboard)


def notify_withdrawal_processed(user, amount, status: str) -> None:
    """Pul yechish so'rovi yakunlanganda foydalanuvchiga Telegram xabar."""
    if not getattr(user, "telegram_id", None):
        return
    icon = "✅" if status == "completed" else "❌"
    status_text = "muvaffaqiyatli" if status == "completed" else "rad etildi"
    text = (
        f"{icon} <b>Pul yechish {status_text}!</b>\n\n"
        f"💸 Miqdor: <b>{_fmt_price(amount)}</b>"
    )
    _send_message(user.telegram_id, text)


def notify_new_chat_message_sync(message_id: str) -> None:
    """
    Yangi chat xabarida qabul qiluvchiga Telegram xabarnoma yuborish.
    Faqat o'qilmagan (user chatda online bo'lmagan) xabarlar uchun.
    Antispam: bir xabar yuboruvchidan faqat birinchi o'qilmagan xabar uchun.
    """
    try:
        from apps.messaging.models import Message
        from django.conf import settings as _settings

        msg = (
            Message.objects
            .select_related("sender", "room", "room__listing")
            .get(id=message_id)
        )

        # Agar xabar allaqachon o'qilgan bo'lsa — user chatda online edi, notification kerak emas
        if msg.is_read:
            logger.debug("Chat notification skipped (already read): msg=%s", message_id)
            return

        room = msg.room
        sender = msg.sender

        # Antispam: faqat birinchi o'qilmagan xabar uchun (loop tashqarisida — barcha recipient uchun bir xil)
        unread_from_sender = Message.objects.filter(
            room=room,
            sender=sender,
            is_read=False,
        ).count()
        if unread_from_sender > 1:
            logger.debug(
                "Chat notification skipped (antispam, %d unread): msg=%s",
                unread_from_sender, message_id,
            )
            return

        recipients = list(room.participants.exclude(id=sender.id))
        if not recipients:
            return

        frontend_url = getattr(_settings, "FRONTEND_URL", SITE_URL).rstrip("/")

        sender_name = (
            getattr(sender, "display_name", None)
            or getattr(sender, "full_name", None)
            or getattr(sender, "username", None)
            or "Foydalanuvchi"
        )
        preview = msg.content[:80] + ("..." if len(msg.content) > 80 else "")
        chat_url = f"{frontend_url}/chat/{room.id}"

        # Listing nomi (agar savdo chati bo'lsa)
        listing_info = ""
        if room.listing_id and room.listing:
            listing_info = f"📦 {room.listing.title}\n"

        text = (
            f"💬 <b>Yangi xabar!</b>\n\n"
            f"👤 <b>{sender_name}</b> sizga xabar yozdi:\n"
            f"{listing_info}"
            f"<i>{preview}</i>\n\n"
            f"<a href='{chat_url}'>💬 Chatga o'tish →</a>"
        )

        sent_count = 0
        for recipient in recipients:
            tg_id = getattr(recipient, "telegram_id", None)
            if not tg_id:
                logger.debug(
                    "Chat notification skipped (no telegram_id): user=%s",
                    recipient.id,
                )
                continue

            ok = _send_message(tg_id, text)
            if ok:
                sent_count += 1
                logger.info(
                    "Chat notification sent: msg=%s → telegram_id=%s (user=%s)",
                    message_id, tg_id, recipient.id,
                )
            else:
                logger.warning(
                    "Chat notification FAILED: msg=%s → telegram_id=%s (user=%s)",
                    message_id, tg_id, recipient.id,
                )

        if sent_count == 0 and recipients:
            logger.debug(
                "Chat notification: no recipients with telegram_id for msg=%s",
                message_id,
            )
    except Exception as e:
        logger.error("Failed to send chat notification: %s", e, exc_info=True)


def notify_listing_approved(listing) -> None:
    """Admin akkauntni tasdiqlaganda sotuvchiga Telegram xabar yuborish."""
    seller = listing.seller
    if not getattr(seller, "telegram_id", None):
        return
    listing_url = f"{SITE_URL}/account/{listing.id}"
    text = (
        f"✅ <b>Akkauntingiz tasdiqlandi!</b>\n\n"
        f"📦 Akkaunt: <b>{listing.title}</b>\n"
        f"💰 Narx: <b>{_fmt_price(listing.price)}</b>\n\n"
        f"Akkauntingiz hozir sotuvda va xaridorlar ko'ra oladi.\n\n"
        f"🌐 <a href='{listing_url}'>Akkauntni ko'rish →</a>"
    )
    _send_message(seller.telegram_id, text)


def notify_listing_rejected(listing, reason: str = "") -> None:
    """Admin akkauntni rad etganda sotuvchiga Telegram xabar yuborish."""
    seller = listing.seller
    if not getattr(seller, "telegram_id", None):
        return
    reason_text = reason if reason else "Ko'rsatilmagan"
    text = (
        f"❌ <b>Akkauntingiz rad etildi</b>\n\n"
        f"📦 Akkaunt: <b>{listing.title}</b>\n"
        f"📝 Sabab: {reason_text}\n\n"
        f"Muammoni bartaraf etib, akkauntni qayta yuborishingiz mumkin.\n\n"
        f"🌐 <a href='{SITE_URL}/sell'>Qayta yuborish →</a>"
    )
    _send_message(seller.telegram_id, text)


def notify_buyer_purchase_success(escrow) -> None:
    """
    Block 2.1: Notify buyer about successful purchase.
    Delegates to notify_purchase_created which covers buyer + seller + admin notification.
    """
    buyer = escrow.buyer
    if not getattr(buyer, "telegram_id", None):
        return
    listing = escrow.listing
    price_str = _fmt_price(escrow.amount)
    trade_link = f"{SITE_URL}/trade/{escrow.id}"
    text = (
        f"🛒 <b>Xarid muvaffaqiyatli amalga oshirildi!</b>\n\n"
        f"📦 Akkaunt: <b>{listing.title if listing else '—'}</b>\n"
        f"🎮 O'yin: {listing.game.name if listing and listing.game else '—'}\n"
        f"💰 Balansingizdan yechildi: <b>{price_str}</b>\n"
        f"🔒 Mablag' escrow himoyasida saqlanmoqda\n\n"
        f"Sotuvchi: @{getattr(escrow.seller, 'username', '') or escrow.seller.display_name}\n"
        f"Savdo: #{str(escrow.id)[:8]}"
    )
    keyboard = {
        "inline_keyboard": [[
            {"text": "🔗 Saytda ochish", "url": trade_link},
        ]]
    }
    _send_message(buyer.telegram_id, text, reply_markup=keyboard)


def notify_seller_account_sold(escrow) -> None:
    """
    Block 2.1: Notify seller that their account has been sold.
    Delegates to notify_purchase_created which covers buyer + seller + admin notification.
    """
    seller = escrow.seller
    if not getattr(seller, "telegram_id", None):
        return
    listing = escrow.listing
    price_str = _fmt_price(escrow.amount)
    earnings_str = _fmt_price(escrow.seller_earnings)
    trade_link = f"{SITE_URL}/trade/{escrow.id}"
    text = (
        f"🎉 <b>Akkauntingiz sotildi!</b>\n\n"
        f"📦 Akkaunt: <b>{listing.title if listing else '—'}</b>\n"
        f"🎮 O'yin: {listing.game.name if listing and listing.game else '—'}\n"
        f"💰 Xarid summasi: <b>{price_str}</b>\n"
        f"💵 Sizga tushadigan summa: <b>{earnings_str}</b>\n\n"
        f"Haridor: @{getattr(escrow.buyer, 'username', '') or escrow.buyer.display_name}\n"
        f"Savdo: #{str(escrow.id)[:8]}\n\n"
        f"⚠️ Pul akkaunt tekshirilgandan keyin o'tkaziladi."
    )
    keyboard = {
        "inline_keyboard": [[
            {"text": "📦 Akkauntni topshirish", "url": trade_link},
        ]]
    }
    _send_message(seller.telegram_id, text, reply_markup=keyboard)


def notify_seller_deliver_account(escrow) -> None:
    """
    Block 2.1 / Block 8.3: Reminder to seller to deliver account.
    Called from Celery task when escrow has been in 'paid' status for > DELIVERY_REMINDER_HOURS.
    """
    try:
        seller = escrow.seller
        if not getattr(seller, "telegram_id", None):
            return
        listing_title = escrow.listing.title if escrow.listing else "—"
        trade_link = f"{SITE_URL}/trade/{escrow.id}"
        text = (
            f"⏰ <b>Eslatma: Akkaunt topshirilmadi!</b>\n\n"
            f"📦 Akkaunt: <b>{listing_title}</b>\n"
            f"💰 Savdo miqdori: {escrow.amount} UZS\n\n"
            f"Haridoringiz sizning akkauntingizni kutmoqda.\n"
            f"Iltimos, akkauntni imkon qadar tezroq topshiring.\n\n"
            f"🔑 Savdo: #{str(escrow.id)[:8]}"
        )
        keyboard = {
            "inline_keyboard": [[
                {"text": "📦 Akkauntni topshirish", "url": trade_link},
            ]]
        }
        _send_message(seller.telegram_id, text, reply_markup=keyboard)
    except Exception as e:
        import logging
        logging.getLogger("apps.payments.telegram_notify").warning(
            "notify_seller_deliver_account failed: %s", e
        )


def notify_seller_confirm_transfer(escrow) -> None:
    """
    Block 2.1: Ask seller to confirm transfer via Telegram inline buttons.
    """
    try:
        seller = escrow.seller
        if not getattr(seller, "telegram_id", None):
            return
        listing_title = escrow.listing.title if escrow.listing else "—"
        escrow_id = str(escrow.id)
        text = (
            f"📦 <b>Akkauntni topshirdingizmi?</b>\n\n"
            f"«{listing_title}» akkauntini haridorga topshirdingizmi?\n\n"
            f"🔑 Savdo: #{escrow_id[:8]}"
        )
        keyboard = {
            "inline_keyboard": [[
                {"text": "✅ Ha, akkaunt topshirildi", "callback_data": f"seller_confirm_transfer_{escrow_id}"},
                {"text": "❌ Savdoni bekor qilish", "callback_data": f"seller_cancel_trade_{escrow_id}"},
            ]]
        }
        _send_message(seller.telegram_id, text, reply_markup=keyboard)
    except Exception as e:
        import logging
        logging.getLogger("apps.payments.telegram_notify").warning(
            "notify_seller_confirm_transfer failed: %s", e
        )


def notify_buyer_confirm_received(escrow) -> None:
    """
    Block 2.1: Ask buyer to confirm receiving account via Telegram inline buttons.
    """
    try:
        buyer = escrow.buyer
        if not getattr(buyer, "telegram_id", None):
            return
        listing_title = escrow.listing.title if escrow.listing else "—"
        escrow_id = str(escrow.id)
        text = (
            f"📦 <b>Sotuvchi akkauntni topshirdi!</b>\n\n"
            f"«{listing_title}» akkauntining ma'lumotlari yuborildi.\n"
            f"Akkauntni tekshiring va tasdiqlang.\n\n"
            f"🔑 Savdo: #{escrow_id[:8]}"
        )
        keyboard = {
            "inline_keyboard": [
                [
                    {"text": "✅ Akkaunt olindi, hammasi yaxshi", "callback_data": f"buyer_confirm_received_{escrow_id}"},
                ],
                [
                    {"text": "⚠️ Muammo bor / Nizo", "callback_data": f"buyer_open_dispute_{escrow_id}"},
                    {"text": "❌ Savdoni bekor qilish", "callback_data": f"buyer_cancel_trade_{escrow_id}"},
                ],
            ]
        }
        _send_message(buyer.telegram_id, text, reply_markup=keyboard)
    except Exception as e:
        import logging
        logging.getLogger("apps.payments.telegram_notify").warning(
            "notify_buyer_confirm_received failed: %s", e
        )


def notify_admin_new_trade(escrow) -> None:
    """
    Block 5.3: Notify all admin users when a new trade is created.
    """
    try:
        buyer = escrow.buyer
        seller = escrow.seller
        listing = escrow.listing
        escrow_id = str(escrow.id)
        trade_link = f"{SITE_URL}/amirxon/trades"
        chat_link = f"{SITE_URL}/amirxon/trade-chats"

        text = (
            f"🛍️ <b>Yangi savdo #{escrow_id[:8]}</b>\n\n"
            f"📦 Akkaunt: <b>{listing.title if listing else '—'}</b>\n"
            f"🎮 O'yin: {listing.game.name if listing and listing.game else '—'}\n"
            f"💰 Miqdor: {escrow.amount} UZS\n\n"
            f"👤 Харidор: {getattr(buyer, 'display_name', '') or buyer.email}\n"
            f"   📱 {buyer.phone_number or '—'}\n"
            f"   💬 @{getattr(buyer, 'telegram_username', '') or '—'}\n\n"
            f"👤 Sotuvchi: {getattr(seller, 'display_name', '') or seller.email}\n"
            f"   📱 {seller.phone_number or '—'}\n"
            f"   💬 @{getattr(seller, 'telegram_username', '') or '—'}"
        )
        keyboard = {
            "inline_keyboard": [[
                {"text": "📋 Panelda ochish", "url": trade_link},
                {"text": "💬 Savdo chati", "url": chat_link},
            ]]
        }
        for admin_id in _get_admin_telegram_ids():
            if admin_id in (getattr(buyer, "telegram_id", None), getattr(seller, "telegram_id", None)):
                continue
            _send_message(admin_id, text, reply_markup=keyboard)
    except Exception as e:
        import logging
        logging.getLogger("apps.payments.telegram_notify").warning(
            "notify_admin_new_trade failed: %s", e
        )


def notify_admin_dispute_opened(escrow, reason: str = "") -> None:
    """
    Block 5.3: Notify admins when a dispute is opened.
    """
    try:
        buyer = escrow.buyer
        seller = escrow.seller
        listing = escrow.listing
        escrow_id = str(escrow.id)
        trade_link = f"{SITE_URL}/amirxon/trades"

        text = (
            f"⚠️ <b>Savdoda nizo ochildi #{escrow_id[:8]}</b>\n\n"
            f"Sabab: {reason or '—'}\n\n"
            f"📦 Akkaunt: {listing.title if listing else '—'}\n"
            f"💰 Miqdor: {escrow.amount} UZS\n\n"
            f"🛒 Харidор: {getattr(buyer, 'display_name', '') or buyer.email}\n"
            f"💼 Sotuvchi: {getattr(seller, 'display_name', '') or seller.email}"
        )
        keyboard = {
            "inline_keyboard": [[
                {"text": "🔍 Nizoni ko'rish", "url": trade_link},
                {"text": "✅ Sotuvchi foydasiga", "callback_data": f"admin_complete_trade_{escrow_id}"},
                {"text": "↩️ Харidorga qaytarish", "callback_data": f"admin_refund_trade_{escrow_id}"},
            ]]
        }
        for admin_id in _get_admin_telegram_ids():
            _send_message(admin_id, text, reply_markup=keyboard)
    except Exception as e:
        import logging
        logging.getLogger("apps.payments.telegram_notify").warning(
            "notify_admin_dispute_opened failed: %s", e
        )


def notify_admin_seller_verification_submitted(verification) -> None:
    """
    Block 5.3: Notify admins when seller submits verification documents.
    """
    try:
        escrow = verification.escrow
        seller = verification.seller
        listing = escrow.listing if escrow else None
        verification_id = str(verification.id)
        escrow_id = str(escrow.id)[:8] if escrow else "—"
        panel_link = f"{SITE_URL}/amirxon/trades"

        text = (
            f"🔍 <b>Yangi sotuvchi tasdiqlanishi</b>\n\n"
            f"Sotuvchi: {getattr(seller, 'display_name', '') or seller.email}\n"
            f"   (@{getattr(seller, 'telegram_username', '') or '—'})\n\n"
            f"Savdo: #{escrow_id} — {listing.title if listing else '—'}\n"
            f"To'lov miqdori: {escrow.seller_earnings if escrow else '—'} UZS\n\n"
            f"Barcha hujjatlar qabul qilindi. Tekshirish talab qilinadi."
        )
        keyboard = {
            "inline_keyboard": [[
                {"text": "✅ Tasdiqlash va o'tkazish", "callback_data": f"admin_approve_verification_{verification_id}"},
                {"text": "❌ Rad etish", "callback_data": f"admin_reject_verification_{verification_id}"},
                {"text": "📋 Batafsil", "url": panel_link},
            ]]
        }
        for admin_id in _get_admin_telegram_ids():
            _send_message(admin_id, text, reply_markup=keyboard)
    except Exception as e:
        import logging
        logging.getLogger("apps.payments.telegram_notify").warning(
            "notify_admin_seller_verification_submitted failed: %s", e
        )


def notify_trade_party_confirmed(escrow, confirmed_by: str = "seller") -> None:
    """Bir tomon tasdiqladi — ikkinchisiga xabar yuborish."""
    try:
        listing = escrow.listing
        escrow_id = str(escrow.id)[:8]
        if confirmed_by == "seller":
            # Haridorga xabar
            chat_id = getattr(escrow.buyer, "telegram_id", None)
            who = "Sotuvchi"
        else:
            # Sotuvchiga xabar
            chat_id = getattr(escrow.seller, "telegram_id", None)
            who = "Haridor"

        if not chat_id:
            return

        text = (
            f"✅ <b>{who} savdoni tasdiqladi!</b>\n\n"
            f"📋 Savdo ID: #{escrow_id}\n"
            f"📦 Akkaunt: {listing.title}\n\n"
            f"⏳ Endi sizning javobingiz kutilmoqda.\n"
            f"Iltimos, savdoni tasdiqlang yoki bekor qiling."
        )
        keyboard = {
            "inline_keyboard": [[
                {"text": "✅ Tasdiqlash", "callback_data": f"trade_{'buyer' if confirmed_by == 'seller' else 'seller'}_ok:{escrow.id}"},
                {"text": "❌ Bekor qilish", "callback_data": f"trade_cancel:{escrow.id}"},
            ]]
        }
        _send_message(chat_id, text, reply_markup=keyboard)
    except Exception as e:
        import logging
        logging.getLogger("apps.payments.telegram_notify").warning(
            "notify_trade_party_confirmed failed: %s", e
        )


try:
    from celery import shared_task

    @shared_task(name="apps.payments.telegram_notify.notify_new_chat_message")
    def notify_new_chat_message(message_id: str) -> None:
        """Celery task: yangi chat xabarida qabul qiluvchiga Telegram xabarnoma."""
        notify_new_chat_message_sync(message_id)

except ImportError:
    def notify_new_chat_message(message_id: str) -> None:  # type: ignore[misc]
        notify_new_chat_message_sync(message_id)
