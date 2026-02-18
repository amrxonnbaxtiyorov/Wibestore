"""
WibeStore Backend - Subscriptions URL Configuration
"""

from django.urls import path

from . import views

app_name = "subscriptions"

urlpatterns = [
    path("plans/", views.SubscriptionPlanListView.as_view(), name="plan-list"),
    path("purchase/", views.PurchaseSubscriptionView.as_view(), name="purchase"),
    path("my/", views.MySubscriptionView.as_view(), name="my-subscription"),
    path("cancel/", views.CancelSubscriptionView.as_view(), name="cancel"),
]
