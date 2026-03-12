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

BOT_TOKEN = os.getenv("BOT_TOKEN", "")
SITE_URL = os.getenv("SITE_URL", "https://wibestore.uz").rstrip("/")
TELEGRAM_BOT_LINK = os.getenv("TELEGRAM_BOT_LINK", "https://t.me/wibestoreuz_bot")


def _fmt_price(amount) -> str:
    """Narxni formatlash: 150000 → '150 000 so'm'"""
    try:
        return f"{int(amount):,}".replace(",", " ") + " so'm"
    except Exception:
        return f"{amount} so'm"


def _send_message(chat_id: int, text: str, reply_markup: dict = None) -> bool:
    """Telegram Bot API orqali xabar yuborish (sinxron)."""
    if not BOT_TOKEN or not chat_id:
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


def notify_purchase_created(escrow) -> None:
    """
    Xarid amalga oshirilganda haridor, sotuvchi va adminlarga xabar yuborish.
    escrow: EscrowTransaction instance
    """
    listing = escrow.listing
    buyer = escrow.buyer
    seller = escrow.seller
    price_str = _fmt_price(escrow.amount)
    earnings_str = _fmt_price(escrow.seller_earnings)
    escrow_id = str(escrow.id)
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
            f"📋 <b>SAVDO TARTIBI:</b>\n"
            f"1️⃣ Admin chatga kirganidan so'ng akkaunt ma'lumotlari avtomatik yuboriladi\n"
            f"2️⃣ Haridor tasdiqlagan so'ng mablag' hisobingizga o'tkaziladi\n"
            f"3️⃣ Agar haridor 24 soat ichida tasdiqlamasa — avtomatik chiqariladi\n\n"
            f"⚠️ Login/parolni faqat sayt chat orqali yuboring!\n"
            f"━━━━━━━━━━━━━━━━━━━━\n\n"
            f"🌐 <a href='{chat_link}'>Chatni ochish</a>"
        )
        seller_keyboard = {
            "inline_keyboard": [[
                {
                    "text": "✅ Akkauntni topshirdim",
                    "callback_data": f"escrow_seller_ok:{escrow_id}",
                },
            ]]
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
            "inline_keyboard": [[
                {"text": "✅ Akkauntni to'liq oldim", "callback_data": f"escrow_buyer_ok:{escrow_id}"},
                {"text": "❌ Muammo bor", "callback_data": f"escrow_buyer_no:{escrow_id}"},
            ]]
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
