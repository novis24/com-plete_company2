from django.db import models 
from django.contrib.auth.models import AbstractBaseUser, PermissionsMixin, BaseUserManager
from django.conf import settings
from django.core.validators import RegexValidator
class CustomUserManager(BaseUserManager):
    def create_user(self, userid, username, password=None, **extra_fields):
        if not userid:
            raise ValueError("Users must have a userid")
        user = self.model(userid=userid, username=username, **extra_fields)
        user.set_password(password)
        user.save(using=self._db)
        return user

    def create_superuser(self, username, password=None, **extra_fields):
        extra_fields.setdefault('is_staff', True)
        extra_fields.setdefault('is_superuser', True)
        return self.create_user(username, password, **extra_fields)


class CustomUser(AbstractBaseUser, PermissionsMixin):
    userid = models.CharField(
        max_length=150,
        primary_key=True,  # <-- now the real PK
        unique=True,
        validators=[
            RegexValidator(
                regex=r"^UTEL/CC/UGCL-\d{4}/\d{4}$",
                message="UserID must follow format UTEL/CC/UGCL-XXXX/YYYY",
            )
        ],
    )
    username = models.CharField(max_length=300, unique=True)
    first_name = models.CharField(max_length=200, blank=True)
    middle_name = models.CharField(max_length=200, blank=True)
    last_name = models.CharField(max_length=200, blank=True)
    is_active = models.BooleanField(default=True)
    is_staff = models.BooleanField(default=False)
    is_superuser = models.BooleanField(default=False)

    objects = CustomUserManager()

    USERNAME_FIELD = 'username'
    REQUIRED_FIELDS = []  # for createsuperuser; username is already required
    
    def __str__(self):
        return f"{self.first_name} {self.middle_name} {self.last_name}".strip()


class GroupChat(models.Model):
    name = models.CharField(max_length=100)
    members = models.ManyToManyField(settings.AUTH_USER_MODEL, related_name='chat_groups')
    created_at = models.DateTimeField(auto_now_add=True)
    
    def __str__(self):
        return self.name or f"GroupChat #{self.pk}"
    
class PrivateChat(models.Model):
    user1 = models.ForeignKey(settings.AUTH_USER_MODEL, on_delete=models.CASCADE, related_name='private_chats_1')
    user2 = models.ForeignKey(settings.AUTH_USER_MODEL, on_delete=models.CASCADE, related_name='private_chats_2')
    created_at = models.DateTimeField(auto_now_add=True)

    def __str__(self):
        user1 = self.user1.first_name if self.user1 else "Unknown"
        user2 = self.user2.first_name if self.user2 else "Unknown"
        return f"{user1} & {user2}"

    def get_other_user(self, current_user):
        return self.user2 if self.user1 == current_user else self.user1
    
class Message(models.Model):
    sender = models.ForeignKey(
        settings.AUTH_USER_MODEL, 
        on_delete=models.CASCADE,
        related_name='sent_messages'  # Unique related_name for sender
    )
    group = models.ForeignKey(
        GroupChat, 
        on_delete=models.CASCADE, 
        null=True, 
        blank=True, 
        related_name='chat_messages'
    )
    private_chat = models.ForeignKey(
        PrivateChat, 
        on_delete=models.CASCADE, 
        null=True, 
        blank=True, 
        related_name='private_chat_messages'
    )
    message = models.TextField()
    timestamp = models.DateTimeField(auto_now_add=True)
    read = models.BooleanField(default=False)
    is_pinned = models.BooleanField(default=False)
    reply_to = models.ForeignKey(
        'self', 
        null=True, 
        blank=True, 
        on_delete=models.SET_NULL,
        related_name='replies'  # Unique related_name for replies
    )
    deleted = models.BooleanField(default=False)
    deleted_by = models.ForeignKey(
        settings.AUTH_USER_MODEL, 
        null=True, 
        blank=True, 
        on_delete=models.SET_NULL,
        related_name='deleted_messages'  # Unique related_name for deleted_by
    )
    def __str__(self):
        sender_name = self.sender.first_name if self.sender else "Unknown"
        timestamp = self.timestamp.strftime('%Y-%m-%d %H:%M') if self.timestamp else "Unknown time"
        return f"From {sender_name} at {timestamp}"

    class Meta:
        ordering = ['timestamp']  # Optional: ensures messages are ordered by timestamp
    def mark_as_read(self):
        if not self.read:
            self.read = True
            self.save()