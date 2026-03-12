"""
WibeStore Backend - Payments Admin
"""

from decimal import Decimal

from django.contrib import admin
from django.utils import timezone
from django.utils.html import format_html

from .models import DepositRequest, EscrowTransaction, PaymentMethod, Transaction


@admin.register(PaymentMethod)
class PaymentMethodAdmin(admin.ModelAdmin):
    list_display = ["name", "code", "icon", "is_active", "created_at"]
    list_filter = ["is_active"]
    search_fields = ["name", "code"]
    list_editable = ["is_active"]


@admin.register(Transaction)
class TransactionAdmin(admin.ModelAdmin):
    list_display = [
        "id",
        "user",
        "type",
        "amount",
        "currency",
        "status",
        "payment_method",
        "created_at",
    ]
    list_filter = ["type", "status", "currency", "created_at"]
    search_fields = ["user__email", "provider_transaction_id", "description"]
    readonly_fields = ["id", "created_at", "updated_at"]
    raw_id_fields = ["user", "payment_method"]
    date_hierarchy = "created_at"


@admin.register(EscrowTransaction)
class EscrowTransactionAdmin(admin.ModelAdmin):
    list_display = [
        "id",
        "listing",
        "buyer",
        "seller",
        "amount",
        "commission_amount",
        "seller_earnings",
        "status",
        "created_at",
    ]
    list_filter = ["status", "created_at"]
    search_fields = [
        "buyer__email",
        "seller__email",
        "listing__title",
    ]
    readonly_fields = [
        "id",
        "commission_amount",
        "seller_earnings",
        "created_at",
        "updated_at",
    ]
    raw_id_fields = ["listing", "buyer", "seller", "dispute_resolved_by"]
    date_hierarchy = "created_at"


@admin.register(DepositRequest)
class DepositRequestAdmin(admin.ModelAdmin):
    """
    Hisob to'ldirish so'rovlari — Telegram bot orqali yuborilgan skrinshot so'rovlari.
    Admin: summani to'ldirib, tasdiqlash yoki rad etish mumkin.
    """

    list_display = [
        "short_id",
        "telegram_info",
        "phone_number",
        "user_link",
        "amount",
        "status_badge",
        "sent_at",
        "reviewed_by",
        "reviewed_at",
    ]
    list_filter = ["status", "sent_at"]
    search_fields = ["telegram_username", "phone_number", "telegram_id", "user__email"]
    readonly_fields = [
        "id",
        "telegram_id",
        "telegram_username",
        "phone_number",
        "sent_at",
        "status",
        "reviewed_by",
        "reviewed_at",
        "transaction",
        "screenshot_preview",
        "created_at",
        "updated_at",
    ]
    # Faqat amount va admin_note tahrirlash mumkin
    fields = [
        "id",
        "status",
        "telegram_id",
        "telegram_username",
        "phone_number",
        "user",
        "amount",
        "screenshot_preview",
        "sent_at",
        "reviewed_by",
        "reviewed_at",
        "admin_note",
        "transaction",
        "created_at",
        "updated_at",
    ]
    actions = ["action_approve", "action_reject"]
    date_hierarchy = "sent_at"
    ordering = ["-sent_at"]

    # ── Custom display columns ────────────────────────────────────────────

    def short_id(self, obj):
        return str(obj.id)[:8] + "…"
    short_id.short_description = "ID"

    def telegram_info(self, obj):
        username = f"@{obj.telegram_username}" if obj.telegram_username else "—"
        return format_html(
            "<b>{}</b><br><small>TG ID: {}</small>",
            username,
            obj.telegram_id,
        )
    telegram_info.short_description = "Telegram"

    def user_link(self, obj):
        if obj.user:
            url = f"/admin/accounts/user/{obj.user.id}/change/"
            return format_html('<a href="{}">{}</a>', url, obj.user.email)
        return format_html('<span style="color:#999">Topilmadi</span>')
    user_link.short_description = "Foydalanuvchi"

    def status_badge(self, obj):
        colors = {
            "pending":  ("🟡", "#f59e0b", "Kutilmoqda"),
            "approved": ("✅", "#10b981", "Tasdiqlandi"),
            "rejected": ("❌", "#ef4444", "Rad etildi"),
        }
        icon, color, label = colors.get(obj.status, ("❓", "#6b7280", obj.status))
        return format_html(
            '<span style="color:{};font-weight:bold">{} {}</span>',
            color, icon, label,
        )
    status_badge.short_description = "Holat"

    def screenshot_preview(self, obj):
        if obj.screenshot:
            return format_html(
                '<a href="{}" target="_blank">'
                '<img src="{}" style="max-width:480px;max-height:480px;border-radius:8px;border:1px solid #ddd;" />'
                '</a>',
                obj.screenshot.url,
                obj.screenshot.url,
            )
        return format_html('<span style="color:#999">Skrinshot yo\'q</span>')
    screenshot_preview.short_description = "Skrinshot"

    # ── Admin actions ─────────────────────────────────────────────────────

    def action_approve(self, request, queryset):
        """Tanlangan so'rovlarni tasdiqlash: balans qo'shish + Telegram xabar."""
        from apps.accounts.models import User
        from django.db import transaction as db_transaction

        from .telegram_notify import notify_deposit_approved

        approved = 0
        warnings = []

        for dr in queryset.filter(status=DepositRequest.STATUS_PENDING):
            if not dr.amount or dr.amount <= 0:
                warnings.append(
                    f"#{str(dr.id)[:8]}: Summa kiritilmagan — avval 'amount' maydonini to'ldiring."
                )
                continue

            # Foydalanuvchini topish
            user = dr.user
            if not user:
                try:
                    user = User.objects.get(telegram_id=dr.telegram_id)
                except User.DoesNotExist:
                    warnings.append(
                        f"#{str(dr.id)[:8]}: Foydalanuvchi topilmadi (Telegram ID: {dr.telegram_id})"
                    )
                    continue

            try:
                with db_transaction.atomic():
                    # Balansga qo'shish
                    user.balance = user.balance + Decimal(str(dr.amount))
                    user.save(update_fields=["balance"])

                    # Transaction yozuvi yaratish
                    txn = Transaction.objects.create(
                        user=user,
                        amount=dr.amount,
                        currency="UZS",
                        type="deposit",
                        status="completed",
                        description=f"Bot orqali hisob to'ldirish (DepositRequest #{str(dr.id)[:8]})",
                        processed_at=timezone.now(),
                    )

                    # DepositRequest yangilash
                    dr.status = DepositRequest.STATUS_APPROVED
                    dr.user = user
                    dr.reviewed_by = request.user
                    dr.reviewed_at = timezone.now()
                    dr.transaction = txn
                    dr.save()

                approved += 1

                # Telegram xabar (tranzaksiya tashqarisida — xato bo'lsa davom etadi)
                try:
                    notify_deposit_approved(dr, user.balance)
                except Exception as e:
                    self.message_user(
                        request,
                        f"#{str(dr.id)[:8]}: Telegram xabar yuborilmadi — {e}",
                        level="WARNING",
                    )

            except Exception as e:
                warnings.append(f"#{str(dr.id)[:8]}: Xatolik — {e}")

        if approved:
            self.message_user(
                request,
                f"✅ {approved} ta so'rov tasdiqlandi. Balanslar yangilandi va Telegram xabarlar yuborildi.",
            )
        for w in warnings:
            self.message_user(request, f"⚠️ {w}", level="WARNING")

    action_approve.short_description = "✅ Tasdiqlash (balans qo'shish + Telegram xabar)"

    def action_reject(self, request, queryset):
        """Tanlangan so'rovlarni rad etish + Telegram xabar."""
        from .telegram_notify import notify_deposit_rejected

        rejected = 0
        for dr in queryset.filter(status=DepositRequest.STATUS_PENDING):
            dr.status = DepositRequest.STATUS_REJECTED
            dr.reviewed_by = request.user
            dr.reviewed_at = timezone.now()
            dr.save()
            rejected += 1
            try:
                notify_deposit_rejected(dr)
            except Exception as e:
                self.message_user(
                    request,
                    f"#{str(dr.id)[:8]}: Telegram xabar yuborilmadi — {e}",
                    level="WARNING",
                )

        self.message_user(request, f"❌ {rejected} ta so'rov rad etildi. Foydalanuvchilarga Telegram xabar yuborildi.")

    action_reject.short_description = "❌ Rad etish (Telegram xabar yuborish)"
