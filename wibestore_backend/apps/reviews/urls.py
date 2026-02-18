"""
WibeStore Backend - Reviews URL Configuration
"""

from django.urls import path

from . import views

app_name = "reviews"

urlpatterns = [
    path("", views.CreateReviewView.as_view(), name="create-review"),
    path("user/<uuid:user_id>/", views.UserReviewsView.as_view(), name="user-reviews"),
    path("<uuid:pk>/reply/", views.ReviewReplyView.as_view(), name="review-reply"),
]
