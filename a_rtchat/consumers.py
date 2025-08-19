import json
from channels.generic.websocket import AsyncWebsocketConsumer
from channels.db import database_sync_to_async
from django.contrib.auth.models import User
from .models import Message, GroupChat, PrivateChat
from django.utils import timezone # Import timezone for formatting

class ChatConsumer(AsyncWebsocketConsumer):
    async def connect(self):
        self.user = self.scope['user']
        if not self.user.is_authenticated:
            await self.close()
            return
            
        self.room_type = self.scope['url_route']['kwargs']['room_type']
        self.room_id = self.scope['url_route']['kwargs']['room_id']
        self.room_group_name = f'chat_{self.room_type}_{self.room_id}'

        await self.channel_layer.group_add(
            self.room_group_name,
            self.channel_name
        )

        await self.accept()

    async def disconnect(self, close_code):
        await self.channel_layer.group_discard(
            self.room_group_name,
            self.channel_name
        )

    async def receive(self, text_data):
        text_data_json = json.loads(text_data)
        message_content = text_data_json['message']
        sender_username = self.scope['user'].username
        
        message_obj = await self.save_message(
            sender=self.scope['user'],
            message=message_content,
            room_type=self.room_type,
            room_id=self.room_id
        )
        
        # Ensure the message was saved successfully
        if message_obj is None:
            return

        timestamp = message_obj.timestamp.strftime('%b. %d, %I:%M %p')

        await self.channel_layer.group_send(
            self.room_group_name,
            {
                'type': 'chat_message',
                'message': message_content,
                'sender': sender_username,
                'timestamp': timestamp,
            }
        )

    async def chat_message(self, event):
        message = event['message']
        sender = event['sender']
        timestamp = event['timestamp']

        # Add the 'type' field back into the data being sent to the client
        await self.send(text_data=json.dumps({
            'type': 'chat_message',  # <-- This is the crucial fix
            'message': message,
            'sender': sender,
            'timestamp': timestamp
        }))

    @database_sync_to_async
    def save_message(self, sender, message, room_type, room_id):
        try:
            if room_type == 'private':
                chat = PrivateChat.objects.get(id=room_id)
                new_message = Message.objects.create(
                    sender=sender,
                    message=message,
                    private_chat=chat
                )
                return new_message
            elif room_type == 'group':
                chat = GroupChat.objects.get(id=room_id)
                new_message = Message.objects.create(
                    sender=sender,
                    message=message,
                    group=chat
                )
                return new_message
        except (PrivateChat.DoesNotExist, GroupChat.DoesNotExist) as e:
            print(f"Error saving message: Chat room does not exist. Error: {e}")
            return None
        except Exception as e:
            print(f"An unexpected error occurred while saving the message: {e}")
            return None
