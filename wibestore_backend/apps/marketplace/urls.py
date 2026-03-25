"""
WibeStore Backend - Marketplace URL Configuration
"""

from django.urls import path

from . import views

app_name = "marketplace"

urlpatterns = [
    path("", views.ListingListCreateView.as_view(), name="listing-list-create"),
    path("promo/apply/", views.ApplyPromoView.as_view(), name="promo-apply"),
    path("<uuid:pk>/", views.ListingDetailView.as_view(), name="listing-detail"),
    path("<uuid:pk>/favorite/", views.ListingFavoriteView.as_view(), name="listing-favorite"),
    path("<uuid:pk>/view/", views.ListingViewCountView.as_view(), name="listing-view"),
    path("<uuid:pk>/images/", views.ListingImageUploadView.as_view(), name="listing-images"),
    path("<uuid:pk>/reviews/", views.ListingReviewsView.as_view(), name="listing-reviews"),
    # Video via Telegram
    path("<uuid:pk>/video-upload/", views.ListingVideoUploadTokenView.as_view(), name="listing-video-upload"),
    path("<uuid:pk>/video-view/", views.ListingVideoViewView.as_view(), name="listing-video-view"),
    path("video-webhook/", views.ListingVideoWebhookView.as_view(), name="listing-video-webhook"),
]
