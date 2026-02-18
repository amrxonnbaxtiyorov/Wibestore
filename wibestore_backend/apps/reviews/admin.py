"""
WibeStore Backend - Reviews Admin
"""

from django.contrib import admin

from .models import Review


@admin.register(Review)
class ReviewAdmin(admin.ModelAdmin):
    list_display = [
        "id",
        "reviewer",
        "reviewee",
        "listing",
        "rating",
        "is_moderated",
        "created_at",
    ]
    list_filter = ["rating", "is_moderated", "created_at"]
    search_fields = [
        "reviewer__email",
        "reviewee__email",
        "comment",
    ]
    readonly_fields = ["id", "created_at"]
    raw_id_fields = ["reviewer", "reviewee", "listing", "escrow"]
    date_hierarchy = "created_at"
