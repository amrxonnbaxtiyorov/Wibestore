"""
WibeStore Backend - Marketplace Admin
"""

from django.contrib import admin

from .models import Favorite, Listing, ListingImage, ListingView


class ListingImageInline(admin.TabularInline):
    model = ListingImage
    extra = 1


@admin.register(Listing)
class ListingAdmin(admin.ModelAdmin):
    list_display = [
        "title",
        "seller",
        "game",
        "price",
        "status",
        "is_premium",
        "views_count",
        "favorites_count",
        "created_at",
    ]
    list_filter = ["status", "is_premium", "game", "created_at"]
    search_fields = ["title", "description", "seller__email"]
    readonly_fields = ["views_count", "favorites_count"]
    inlines = [ListingImageInline]
    actions = ["approve_listings", "reject_listings"]

    def approve_listings(self, request, queryset):
        from .services import ListingService
        for listing in queryset.filter(status="pending"):
            ListingService.approve_listing(listing, request.user)
    approve_listings.short_description = "Approve selected listings"

    def reject_listings(self, request, queryset):
        queryset.filter(status="pending").update(status="rejected")
    reject_listings.short_description = "Reject selected listings"


@admin.register(Favorite)
class FavoriteAdmin(admin.ModelAdmin):
    list_display = ["user", "listing", "created_at"]
    list_filter = ["created_at"]


@admin.register(ListingView)
class ListingViewAdmin(admin.ModelAdmin):
    list_display = ["listing", "user", "ip_address", "viewed_at"]
    list_filter = ["viewed_at"]
