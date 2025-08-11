# a_rtchat/views.py

from django.shortcuts import render, get_object_or_404
from django.http import JsonResponse, HttpResponseBadRequest, HttpResponseForbidden
from django.contrib.auth.decorators import login_required
from django.views.decorators.http import require_POST
from django.views.decorators.csrf import csrf_exempt
from django.db.models import Q, Count, Max
from django.contrib.auth.models import User
from django.utils import timezone
import json
from .models import Message, Group, PrivateChat

# This helper function fetches all chats and sorts them by recent activity.
def get_all_chats(user):
    """
    Fetches all chats for a user, annotates them with last message time and unread count,
    and returns a sorted list of dictionaries.
    """
    # Get all groups the user is a member of with annotations.
    groups = Group.objects.filter(members=user).annotate(
        last_message_time=Max('chat_messages__timestamp'),
        unread_count=Count('chat_messages', filter=Q(chat_messages__read=False) & ~Q(chat_messages__sender=user))
    )

    # Get all private chats for the user with annotations.
    private_chats = PrivateChat.objects.filter(
        Q(user1=user) | Q(user2=user)
    ).annotate(
        last_message_time=Max('private_chat_messages__timestamp'),
        unread_count=Count('private_chat_messages', filter=Q(private_chat_messages__read=False) & ~Q(private_chat_messages__sender=user))
    )

    # Combine and process all chats into a single list.
    all_chats = []
    
    for group in groups:
        last_message = group.chat_messages.order_by('-timestamp').first()
        all_chats.append({
            'chat_type': 'group',
            'id': group.id,
            'name': group.name,
            'last_message': last_message,
            'unread_count': group.unread_count,
            'timestamp': group.last_message_time or group.created_at
        })
    
    for private_chat in private_chats:
        last_message = private_chat.private_chat_messages.order_by('-timestamp').first()
        other_user = private_chat.user2 if private_chat.user1 == user else private_chat.user1
        all_chats.append({
            'chat_type': 'private',
            'id': private_chat.id,
            'other_user': other_user,
            'last_message': last_message,
            'unread_count': private_chat.unread_count,
            'timestamp': private_chat.last_message_time or private_chat.created_at
        })
    
    # Sort all chats by most recent activity.
    all_chats.sort(key=lambda x: x['timestamp'] or timezone.now(), reverse=True)
    
    return all_chats

@login_required
def home(request):
    """
    The main view for the chat application, displaying a list of all chats.
    """
    return render(request, 'a_rtchat/chat_area.html', {
        'all_chats': get_all_chats(request.user),
        'active_group': None,
        'active_private_chat': None,
        'other_username': None,
        'room_name': None,
        'messages': None,
        'chat_type': None,
        'available_users': User.objects.exclude(id=request.user.id),
    })

@login_required
def chat_area(request, chat_type, chat_id):
    """
    Displays the messages for a specific chat.
    """
    active_group = None
    active_private_chat = None
    messages = []
    room_name = None
    other_username = None

    if chat_type == 'group':
        active_group = get_object_or_404(Group, id=chat_id, members=request.user)
        messages = Message.objects.filter(group=active_group).order_by('timestamp')
        room_name = f'group_{active_group.id}'
        # Mark messages as read.
        Message.objects.filter(group=active_group, sender__ne=request.user, read=False).update(read=True)

    elif chat_type == 'private':
        active_private_chat = get_object_or_404(PrivateChat, Q(user1=request.user) | Q(user2=request.user), id=chat_id)
        other_user = active_private_chat.get_other_user(request.user)
        messages = Message.objects.filter(private_chat=active_private_chat).order_by('timestamp')
        room_name = f'private_{active_private_chat.id}'
        other_username = other_user.username if other_user else 'Unknown User'
        # Mark messages as read.
        Message.objects.filter(private_chat=active_private_chat, sender__ne=request.user, read=False).update(read=True)
        
    else:
        return HttpResponseBadRequest("Invalid chat type")
    
    return render(request, 'a_rtchat/chat_area.html', {
        'all_chats': get_all_chats(request.user),
        'active_group': active_group,
        'active_private_chat': active_private_chat,
        'other_username': other_username,
        'room_name': room_name,
        'messages': messages,
        'chat_type': chat_type,
        'available_users': User.objects.exclude(id=request.user.id),
    })

@login_required
def filter_chats(request, filter_type):
    """
    API endpoint to filter chats by type (groups or private chats).
    """
    chats = []
    user = request.user
    
    if filter_type == 'groups':
        groups = Group.objects.filter(members=user).annotate(
            unread_count=Count('chat_messages', filter=Q(chat_messages__read=False) & ~Q(chat_messages__sender=user))
        ).order_by('-created_at')
        
        for group in groups:
            chats.append({
                'chat_type': 'group',
                'id': group.id,
                'name': group.name,
                'unread_count': group.unread_count
            })
    
    elif filter_type == 'private':
        private_chats = PrivateChat.objects.filter(
            Q(user1=user) | Q(user2=user)
        ).annotate(
            unread_count=Count('private_chat_messages', filter=Q(private_chat_messages__read=False) & ~Q(private_chat_messages__sender=user))
        ).order_by('-created_at')
        
        for private_chat in private_chats:
            other_user = private_chat.get_other_user(user)
            chats.append({
                'chat_type': 'private',
                'id': private_chat.id,
                'other_username': other_user.username,
                'unread_count': private_chat.unread_count
            })
            
    else:
        return JsonResponse({'error': 'Invalid filter type'}, status=400)
        
    return JsonResponse({'chats': chats})

@csrf_exempt
@require_POST
def mark_messages_as_read(request):
    """
    Marks messages as read via an AJAX request.
    """
    try:
        data = json.loads(request.body)
        room_id = data.get('room_id')
        is_private = data.get('is_private')
        user = request.user

        if is_private:
            private_chat = get_object_or_404(PrivateChat, Q(user1=user) | Q(user2=user), id=room_id)
            Message.objects.filter(
                private_chat=private_chat,
                sender__ne=user,
                read=False
            ).update(read=True)
        else:
            group = get_object_or_404(Group, id=room_id, members=user)
            Message.objects.filter(
                group=group,
                sender__ne=user,
                read=False
            ).update(read=True)
            
        return JsonResponse({'success': True})
    except Exception as e:
        return JsonResponse({'success': False, 'error': str(e)}, status=400)

def get_messages(request, chat_type, chat_id):
    """
    API endpoint to retrieve messages for a specific chat.
    """
    try:
        messages_data = []
        messages = None

        if chat_type == 'private':
            chat = get_object_or_404(PrivateChat, Q(user1=request.user) | Q(user2=request.user), id=chat_id)
            messages = Message.objects.filter(private_chat=chat).order_by('timestamp')
        
        elif chat_type == 'group':
            group = get_object_or_404(Group, id=chat_id, members=request.user)
            messages = Message.objects.filter(group=group).order_by('timestamp')
        
        else:
            return JsonResponse({'error': 'Invalid chat type'}, status=400)

        if messages is not None:
            for message in messages:
                messages_data.append({
                    'sender': message.sender.username,
                    'message': message.message,
                    'timestamp': message.timestamp.strftime('%b. %d, %I:%M %p')
                })

        return JsonResponse({'messages': messages_data})

    except Exception as e:
        return JsonResponse({'error': f'An internal server error occurred: {str(e)}'}, status=500)

def search_users(request):
    """
    API endpoint for searching users.
    """
    query = request.GET.get('q', '')
    if len(query) < 2:
        return JsonResponse({'users': []})
    
    users = User.objects.filter(
        Q(username__icontains=query) | 
        Q(first_name__icontains=query) |
        Q(last_name__icontains=query)
    ).exclude(id=request.user.id).values('id', 'username')[:10]
    
    return JsonResponse({'users': list(users)})

@csrf_exempt
@require_POST
def create_private_chat(request):
    """
    API endpoint to create a new private chat.
    """
    if not request.user.is_authenticated:
        return JsonResponse({'success': False, 'error': 'User not authenticated'}, status=403)
    
    try:
        data = json.loads(request.body)
        user_id = data.get('user_id')
        other_user = get_object_or_404(User, id=user_id)
        
        chat = PrivateChat.objects.filter(
            (Q(user1=request.user) & Q(user2=other_user)) |
            (Q(user1=other_user) & Q(user2=request.user))
        ).first()
        
        if chat:
            return JsonResponse({'success': True, 'chat_id': chat.id, 'exists': True})
        
        chat = PrivateChat.objects.create(
            user1=request.user,
            user2=other_user
        )
        
        return JsonResponse({'success': True, 'chat_id': chat.id, 'exists': False})
    except Exception as e:
        return JsonResponse({'success': False, 'error': str(e)})

@csrf_exempt
@require_POST
def create_group_chat(request):
    """
    API endpoint to create a new group chat.
    """
    if not request.user.is_authenticated:
        return JsonResponse({'success': False, 'error': 'User not authenticated'}, status=403)
        
    try:
        data = json.loads(request.body)
        name = data.get('name')
        member_ids = data.get('members', [])
        
        group = Group.objects.create(name=name)
        group.members.add(request.user)
        
        members = User.objects.filter(id__in=member_ids)
        for member in members:
            group.members.add(member)
        
        return JsonResponse({'success': True, 'group_id': group.id})
    except Exception as e:
        return JsonResponse({'success': False, 'error': str(e)})
