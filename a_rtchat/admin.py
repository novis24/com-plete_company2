from django.contrib import admin
from django.contrib.auth.admin import UserAdmin
from .models import GroupChat, Message, PrivateChat, CustomUser

# ----------------------------
# CustomUser Admin
# ----------------------------
class CustomUserAdmin(UserAdmin):
    list_display = ('username', 'first_name', 'middle_name', 'last_name', 'is_staff', 'is_active')
    list_filter = ('is_staff', 'is_active')
    fieldsets = (
        (None, {'fields': ('username', 'password')}),
        ('Personal info', {'fields': ('first_name', 'middle_name', 'last_name')}),
        ('Permissions', {'fields': ('is_staff', 'is_active', 'is_superuser', 'groups', 'user_permissions')}),
        ('Important dates', {'fields': ('last_login', )}),
    )
    add_fieldsets = (
        (None, {
            'classes': ('wide',),
            'fields': ('username', 'first_name', 'middle_name', 'last_name', 'password1', 'password2', 'is_staff', 'is_active')}
        ),
    )
    search_fields = ('username', 'first_name', 'middle_name', 'last_name')
    ordering = ('username',)

# Register CustomUser
admin.site.register(CustomUser, CustomUserAdmin)

# ----------------------------
# GroupChat Admin
# ----------------------------
@admin.register(GroupChat)
class GroupChatAdmin(admin.ModelAdmin):
    list_display = ('name', 'created_at')
    filter_horizontal = ('members',)  

# ----------------------------
# Message & PrivateChat Admin
# ----------------------------
admin.site.register(Message)
admin.site.register(PrivateChat)
