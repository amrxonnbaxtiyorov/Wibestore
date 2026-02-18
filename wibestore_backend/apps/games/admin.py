"""
WibeStore Backend - Games Admin
"""

from django.contrib import admin
from django.db.models import Count, Q

from .models import Category, Game


@admin.register(Game)
class GameAdmin(admin.ModelAdmin):
    list_display = ["name", "slug", "icon", "is_active", "sort_order", "get_active_listings", "created_at"]
    list_filter = ["is_active"]
    search_fields = ["name", "slug"]
    prepopulated_fields = {"slug": ("name",)}
    list_editable = ["is_active", "sort_order"]
    ordering = ["sort_order", "name"]

    def get_queryset(self, request):
        qs = super().get_queryset(request)
        return qs.annotate(
            _active_listings_count=Count(
                "listings", filter=Q(listings__status="active")
            )
        )

    @admin.display(description="Active Listings", ordering="_active_listings_count")
    def get_active_listings(self, obj):
        return getattr(obj, "_active_listings_count", 0)


@admin.register(Category)
class CategoryAdmin(admin.ModelAdmin):
    list_display = ["name", "slug", "parent"]
    search_fields = ["name"]
    prepopulated_fields = {"slug": ("name",)}
