"""
WibeStore Backend - Messaging URL Configuration
"""

from django.urls import path

from . import views

app_name = "messaging"

urlpatterns = [
    path("", views.ChatRoomListView.as_view(), name="room-list"),
    path("create/", views.ChatRoomCreateView.as_view(), name="room-create"),
    path("<uuid:room_id>/messages/", views.ChatRoomMessagesView.as_view(), name="room-messages"),
    path("<uuid:room_id>/send/", views.SendMessageView.as_view(), name="send-message"),
]
