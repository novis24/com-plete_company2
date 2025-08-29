from django.contrib import admin
from django.contrib.auth.admin import UserAdmin, GroupAdmin
from django.contrib.auth.models import Group
from django.utils.translation import gettext_lazy as _

from .models import CustomUser, GroupChat, PrivateChat, Message


# --- Rename Group model globally ---
Group._meta.verbose_name = _("Role")
Group._meta.verbose_name_plural = _(" Roles")


# --- Custom User Admin ---
@admin.register(CustomUser)
class CustomUserAdmin(UserAdmin):
    CustomUser._meta.verbose_name = _("System Users")
    model = CustomUser
    list_display = (
        "userid",
        "username",
        "first_name",
        "middle_name",
        "last_name",
        "is_active",
        "is_staff",
    )
    list_filter = ("is_staff", "is_superuser", "is_active")
    search_fields = ("username", "first_name", "last_name")
    ordering = ("userid",)

    fieldsets = (
        (None, {"fields": ("userid", "username", "password")}),
        (_("Personal info"), {"fields": ("first_name", "middle_name", "last_name")}),
        (_("Permissions"), {
            "fields": (
                "is_active",
                "is_staff",
                "is_superuser",
                "groups",
                "user_permissions",
            ),
        }),
        (_("Important dates"), {"fields": ("last_login",)}),
    )

    add_fieldsets = (
        (None, {
            "classes": ("wide",),
            "fields": ("userid", "username", "password1", "password2", "is_active", "is_staff"),
        }),
    )


# --- GroupChat Admin ---
@admin.register(GroupChat)
class GroupChatAdmin(admin.ModelAdmin):
    list_display = ('name', 'created_at')
    filter_horizontal = ('members',)


# --- PrivateChat & Message Admin ---
admin.site.register(PrivateChat)
admin.site.register(Message)


# --- Re-register Group with new name ---
# First unregister default GroupAdmin
admin.site.unregister(Group)

# Then register with our custom version (but still inherit GroupAdmin)
@admin.register(Group)
class CustomGroupAdmin(GroupAdmin):
    pass
