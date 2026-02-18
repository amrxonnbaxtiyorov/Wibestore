"""
WibeStore Backend - Games URL Configuration
"""

from django.urls import path

from . import views

app_name = "games"

urlpatterns = [
    path("", views.GameListView.as_view(), name="game-list"),
    path("categories/", views.CategoryListView.as_view(), name="category-list"),
    path("<slug:slug>/", views.GameDetailView.as_view(), name="game-detail"),
    path("<slug:slug>/listings/", views.GameListingsView.as_view(), name="game-listings"),
]
