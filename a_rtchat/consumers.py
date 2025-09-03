import json
from channels.generic.websocket import AsyncWebsocketConsumer
from channels.db import database_sync_to_async
from django.utils.timezone import localtime
from .models import Message, GroupChat, PrivateChat


class ChatConsumer(AsyncWebsocketConsumer):
    async def connect(self):
        self.user = self.scope["user"]
        if not self.user.is_authenticated:
            await self.close()
            return

        self.room_type = self.scope["url_route"]["kwargs"]["room_type"]
        self.room_id = self.scope["url_route"]["kwargs"]["room_id"]
        self.room_group_name = f"chat_{self.room_type}_{self.room_id}"

        await self.channel_layer.group_add(self.room_group_name, self.channel_name)
        await self.accept()

    async def disconnect(self, close_code):
        await self.channel_layer.group_discard(self.room_group_name, self.channel_name)

    async def receive(self, text_data):
        data = json.loads(text_data)
        message_content = data.get("message", "").strip()
        if not message_content:
            return

        sender_first_name = self.user.first_name or self.user.username
        sender_username = self.user.username

        # Save message in DB
        message_obj = await self.save_message(
            sender=self.user,
            message=message_content,
            room_type=self.room_type,
            room_id=self.room_id,
        )
        if not message_obj:
            return

        # Format timestamp with timezone offset (localtime)
        timestamp = localtime(message_obj.timestamp).isoformat()

        # Broadcast message
        await self.channel_layer.group_send(
            self.room_group_name,
            {
                "type": "chat_message",
                "message": message_content,
                "sender_first_name": sender_first_name,
                "sender_username": sender_username,
                "timestamp": timestamp,
                "room_type": self.room_type,
            },
        )

    async def chat_message(self, event):
        await self.send(text_data=json.dumps(event))

    @database_sync_to_async
    def save_message(self, sender, message, room_type, room_id):
        try:
            if room_type == "private":
                chat = PrivateChat.objects.get(id=room_id)
                return Message.objects.create(
                    sender=sender, message=message, private_chat=chat
                )
            elif room_type == "group":
                chat = GroupChat.objects.get(id=room_id)
                return Message.objects.create(
                    sender=sender, message=message, group=chat
                )
        except Exception as e:
            print(f"Error saving message: {e}")
            return None
