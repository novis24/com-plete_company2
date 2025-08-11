from django.urls import path
from a_rtchat.consumers import ChatConsumer

websocket_urlpatterns = [
    path('ws/chat/<str:room_type>/<int:room_id>/', ChatConsumer.as_asgi()),
]