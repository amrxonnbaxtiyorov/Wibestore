"""
WibeStore Backend - Marketplace URL Configuration
"""

from django.urls import path

from . import views

app_name = "marketplace"

urlpatterns = [
    path("", views.ListingListCreateView.as_view(), name="listing-list-create"),
    path("<uuid:pk>/", views.ListingDetailView.as_view(), name="listing-detail"),
    path("<uuid:pk>/favorite/", views.ListingFavoriteView.as_view(), name="listing-favorite"),
    path("<uuid:pk>/view/", views.ListingViewCountView.as_view(), name="listing-view"),
    path("<uuid:pk>/images/", views.ListingImageUploadView.as_view(), name="listing-images"),
    path("<uuid:pk>/reviews/", views.ListingReviewsView.as_view(), name="listing-reviews"),
]
