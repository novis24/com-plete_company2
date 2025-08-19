from django.contrib import admin
from . models import GroupChat, Message, PrivateChat 
# Register your models here.
admin.site.register(GroupChat)
admin.site.register(Message)
admin.site.register(PrivateChat)