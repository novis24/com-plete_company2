from django.contrib.auth.models import User
from django.db import models 

class GroupChat(models.Model):
    name = models.CharField(max_length=100)
    members = models.ManyToManyField(User, related_name='chat_groups')
    created_at = models.DateTimeField(auto_now_add=True)
    
    def __str__(self):
        return self.name
    
class PrivateChat(models.Model):
    user1 = models.ForeignKey(User, on_delete=models.CASCADE, related_name='private_chats_1')
    user2 = models.ForeignKey(User, on_delete=models.CASCADE, related_name='private_chats_2')
    created_at = models.DateTimeField(auto_now_add=True)

    def __str__(self):
        return f"{self.user1.username} & {self.user2.username}"

    def get_other_user(self, current_user):
        return self.user2 if self.user1 == current_user else self.user1
    
class Message(models.Model):
    sender = models.ForeignKey(
        User, 
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
        User, 
        null=True, 
        blank=True, 
        on_delete=models.SET_NULL,
        related_name='deleted_messages'  # Unique related_name for deleted_by
    )
    
    def __str__(self):
        return f"From {self.sender.username} at {self.timestamp}"

    class Meta:
        ordering = ['timestamp']  # Optional: ensures messages are ordered by timestamp
    def mark_as_read(self):
        if not self.read:
            self.read = True
            self.save()