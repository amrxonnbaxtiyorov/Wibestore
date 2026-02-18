"""
WibeStore Backend - Reports URL Configuration
"""

from django.urls import path

from . import views

app_name = "reports"

urlpatterns = [
    path("", views.CreateReportView.as_view(), name="create-report"),
    path("my/", views.MyReportsView.as_view(), name="my-reports"),
]
