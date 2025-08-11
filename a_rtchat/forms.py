from django import forms
from django.core.validators import MinLengthValidator

class ChatMessageForm(forms.Form):
    message = forms.CharField(
        widget=forms.TextInput(attrs={
            'id': 'messageInput',
            'class': 'message-input',
            'placeholder': 'Type a message...',
            'autocomplete': 'off',
            'aria-label': 'Type your message',
        }),
        max_length=1000,
        min_length=1,
        required=True,
        validators=[MinLengthValidator(1)],
        error_messages={
            'required': 'Message cannot be empty',
            'min_length': 'Message is too short',
            'max_length': 'Message is too long (max 1000 characters)'
        }
    )