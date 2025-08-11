
from django.urls import path
from . import views

app_name = 'a_rtchat'

urlpatterns = [
    path('', views.home, name='home'),
    path('chat/<str:chat_type>/<int:chat_id>/', views.chat_area, name='chat_area'),
    path('filter/<str:filter_type>/', views.filter_chats, name='filter_chats'),
    path('get_messages/<str:chat_type>/<int:chat_id>/', views.get_messages, name='get_messages'),
    path('mark_messages_as_read/', views.mark_messages_as_read, name='mark_messages_as_read'),
    path('search_users/', views.search_users, name='search_users'),
    path('create_private_chat/', views.create_private_chat, name='create_private_chat'),
    path('create_group_chat/', views.create_group_chat, name='create_group_chat'),
]
