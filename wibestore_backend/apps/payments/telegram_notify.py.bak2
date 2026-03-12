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
    Xarid amalga oshirilganda haridor va sotuvchiga xabar yuborish.
    escrow: EscrowTransaction instance
    """
    listing = escrow.listing
    buyer = escrow.buyer
    seller = escrow.seller
    price_str = _fmt_price(escrow.amount)
    earnings_str = _fmt_price(escrow.seller_earnings)
    escrow_id = str(escrow.id)

    # ── Xaridorga xabar ──────────────────────────────────────────────────
    if buyer.telegram_id:
        buyer_text = (
            f"🛒 <b>Xarid muvaffaqiyatli amalga oshirildi!</b>\n\n"
            f"📦 Akkaunt: <b>{listing.title}</b>\n"
            f"💰 To'langan summa: <b>{price_str}</b>\n"
            f"🔒 Mablag' escrow himoyasida saqlanmoqda\n\n"
            f"━━━━━━━━━━━━━━━━━━━━\n"
            f"⚠️ <b>MUHIM OGOHLANTIRISHLAR:</b>\n"
            f"❌ Admin tasdig'isiz hech qachon login/parolni so'ramang!\n"
            f"❌ Shubhali harakatlarga rozi bo'lmang!\n"
            f"❌ Telegram, WhatsApp orqali ma'lumot almashib bo'lmaydi!\n"
            f"✅ Barcha muloqot <b>faqat sayt chat</b> orqali bo'lishi shart\n"
            f"✅ Muammo bo'lsa bot orqali shikoyat bering\n"
            f"━━━━━━━━━━━━━━━━━━━━\n\n"
            f"Sotuvchi akkauntni topshirgandan so'ng siz tasdiqlashingiz so'raladi.\n\n"
            f"🌐 <a href='{SITE_URL}/chat'>Chatni ochish</a>"
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
            f"📋 <b>Qilishingiz kerak:</b>\n"
            f"1️⃣ <a href='{SITE_URL}'>Saytga kiring</a>\n"
            f"2️⃣ Chatda haridorga akkaunt ma'lumotlarini yuboring\n"
            f"3️⃣ Quyidagi tugma orqali akkaunt topshirilganini tasdiqlang\n\n"
            f"⚠️ <b>Eslatma:</b> Admin mavjud bo'lmasa login/parolni "
            f"haridorga bering, lekin faqat sayt chat orqali!\n"
            f"━━━━━━━━━━━━━━━━━━━━"
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


def notify_seller_confirmed(escrow) -> None:
    """
    Sotuvchi akkauntni topshirganini tasdiqlagandan so'ng xaridorga xabar.
    """
    listing = escrow.listing
    buyer = escrow.buyer
    escrow_id = str(escrow.id)

    if buyer.telegram_id:
        buyer_text = (
            f"📬 <b>Sotuvchi akkauntni topshirdi!</b>\n\n"
            f"📦 Akkaunt: <b>{listing.title}</b>\n\n"
            f"Endi akkauntni tekshiring:\n"
            f"✔️ Login va parol ishlayaptimi?\n"
            f"✔️ Akkaunt to'liq qo'lingizga o'tdimi?\n\n"
            f"Hammasi yaxshi bo'lsa — tasdiqlang.\n"
            f"Muammo bo'lsa — «Muammo bor» tugmasini bosing.\n\n"
            f"⚠️ <b>Diqqat:</b> Tasdiqlashdan oldin akkauntni sinab ko'ring!"
        )
        buyer_keyboard = {
            "inline_keyboard": [[
                {
                    "text": "✅ Akkauntni to'liq oldim",
                    "callback_data": f"escrow_buyer_ok:{escrow_id}",
                },
                {
                    "text": "❌ Muammo bor",
                    "callback_data": f"escrow_buyer_no:{escrow_id}",
                },
            ]]
        }
        _send_message(buyer.telegram_id, buyer_text, reply_markup=buyer_keyboard)


def notify_buyer_confirmed(escrow) -> None:
    """
    Haridor akkauntni qabul qilganini tasdiqlagandan so'ng sotuvchiga xabar.
    """
    listing = escrow.listing
    seller = escrow.seller
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


def notify_dispute_opened(escrow, reason: str = "") -> None:
    """Haridor shikoyat ochganida sotuvchiga xabar."""
    listing = escrow.listing
    seller = escrow.seller

    if seller.telegram_id:
        seller_text = (
            f"⚠️ <b>Haridor shikoyat ochdi!</b>\n\n"
            f"📦 Akkaunt: <b>{listing.title}</b>\n"
            f"📝 Sabab: {reason or 'Ko\'rsatilmagan'}\n\n"
            f"Admin jamoamiz holatni tekshirib qaror qabul qiladi.\n"
            f"Sayt admin bilan ham bog'laning.\n\n"
            f"🌐 <a href='{SITE_URL}'>Saytga kiring</a>"
        )
        _send_message(seller.telegram_id, seller_text)


def notify_escrow_released(escrow) -> None:
    """Admin tolov chiqarganida sotuvchiga xabar."""
    listing = escrow.listing
    seller = escrow.seller
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
