"""
WibeStore Backend - Reports Admin
"""

from django.contrib import admin

from .models import Report, SuspiciousActivity


@admin.register(Report)
class ReportAdmin(admin.ModelAdmin):
    list_display = [
        "id",
        "reporter",
        "reported_user",
        "reported_listing",
        "reason",
        "status",
        "created_at",
    ]
    list_filter = ["status", "reason", "created_at"]
    search_fields = [
        "reporter__email",
        "reported_user__email",
        "description",
    ]
    readonly_fields = ["id", "created_at"]
    raw_id_fields = ["reporter", "reported_user", "reported_listing", "resolved_by"]
    date_hierarchy = "created_at"


@admin.register(SuspiciousActivity)
class SuspiciousActivityAdmin(admin.ModelAdmin):
    list_display = ["activity_type", "user", "ip_address", "resolved", "resolved_by", "created_at"]
    list_filter = ["activity_type", "resolved"]
    search_fields = ["user__email", "ip_address"]
