// ================================
// Utility: Get CSRF Token
// ================================
function getCookie(name) {
    let cookieValue = null;
    if (document.cookie && document.cookie !== '') {
        const cookies = document.cookie.split(';');
        for (let cookie of cookies) {
            cookie = cookie.trim();
            if (cookie.startsWith(name + '=')) {
                cookieValue = decodeURIComponent(cookie.substring(name.length + 1));
                break;
            }
        }
    }
    return cookieValue;
}

// ================================
// Chat List Updates
// ================================
function updateLastMessage(chatListItem, message) {
    const lastMessageSpan = chatListItem.querySelector('.last-message');
    if (lastMessageSpan) lastMessageSpan.textContent = message.message.substring(0, 30);
}

function updateUnreadCount(chatListItem) {
    const unreadMarker = chatListItem.querySelector('.unread-marker');
    if (unreadMarker) {
        unreadMarker.textContent = parseInt(unreadMarker.textContent, 10) + 1;
        unreadMarker.style.display = 'inline-block';
    } else {
        const newUnreadMarker = document.createElement('span');
        newUnreadMarker.className = 'unread-marker';
        newUnreadMarker.textContent = '1';
        newUnreadMarker.style.display = 'inline-block';
        chatListItem.appendChild(newUnreadMarker);
    }
}

function markMessagesAsRead(chatListItem) {
    if (!chatListItem) return;

    const unreadMarker = chatListItem.querySelector('.unread-marker');
    if (unreadMarker) unreadMarker.remove();

    const room_id = chatListItem.dataset.room;
    const is_private = chatListItem.dataset.type === 'private';
    const csrfToken = getCookie('csrftoken');

    fetch('/mark_messages_as_read/', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json', 'X-CSRFToken': csrfToken },
        body: JSON.stringify({ room_id, is_private })
    }).catch(err => console.error('Error marking as read:', err));
}

// ================================
// Display Messages (centralized)
// ================================
function displayMessage(message, senderFirstName, senderUsername, currentUsername, timestamp, chatType) {
    const chatMessages = document.getElementById('chatMessages');
    
    // Remove "no messages" message if it exists
    const emptyMessage = chatMessages.querySelector('.empty');
    if (emptyMessage) {
        emptyMessage.remove();
    }

    const messageElement = document.createElement('div');
    messageElement.classList.add('message');

    // Alignment
    const isSent = senderUsername === currentUsername;
    messageElement.classList.add(isSent ? 'sent' : 'received');

    // Group chat: show sender name if not current user
    let messageHTML = '';
    if (chatType === "group" && !isSent) {
        messageHTML = `<strong>${senderFirstName}:</strong> ${message}`;
    } else {
        messageHTML = message;
    }

    messageElement.innerHTML = `
        <div class="message-content">${messageHTML}</div>
        <div class="timestamp">${timestamp}</div>
    `;

    chatMessages.appendChild(messageElement);
    chatMessages.scrollTop = chatMessages.scrollHeight;
}

// ================================
// WebSocket Connection
// ================================
function connectToRoom(roomType, roomId) {
    if (window.chatSocket) window.chatSocket.close();

    const ws_scheme = window.location.protocol === "https:" ? "wss" : "ws";
    const chatSocket = new WebSocket(`${ws_scheme}://${window.location.host}/ws/chat/${roomType}/${roomId}/`);

    chatSocket.onmessage = function(e) {
        const data = JSON.parse(e.data);
        const currentUsername = document.getElementById('chatAppContent').dataset.username;

        if (data.type === 'chat_message') {
            const senderFirstName = (data.sender_first_name || data.sender || 'unknown').toLowerCase();
            const senderUsername = data.sender_username || data.sender || 'unknown';

            displayMessage(data.message, senderFirstName, senderUsername, currentUsername, data.timestamp, data.room_type);
        } else if (data.type === 'notification') {
            const chatList = document.getElementById('chatList');
            const chatListItem = chatList.querySelector(
                `.contact-item[data-room="${data.room_id}"][data-type="${data.room_type}"]`
            );
            if (chatListItem) {
                if (data.unread_count) {
                    let unreadMarker = chatListItem.querySelector('.unread-marker');
                    if (!unreadMarker) {
                        unreadMarker = document.createElement('span');
                        unreadMarker.className = 'unread-marker';
                        chatListItem.appendChild(unreadMarker);
                    }
                    unreadMarker.textContent = data.unread_count;
                    unreadMarker.style.display = 'inline-block';
                }
                if (data.last_message) updateLastMessage(chatListItem, data.last_message);
                chatListItem.parentNode.prepend(chatListItem);
            }
        }
    };

    chatSocket.onclose = () => console.error("Chat socket closed");
    chatSocket.onopen = () => console.log("Chat socket opened");

    window.chatSocket = chatSocket;
}

// ================================
// Send Message
// ================================
function sendMessage() {
    const messageInput = document.getElementById('messageInput');
    const message = messageInput.value.trim();
    const chatMessages = document.getElementById('chatMessages');
    const [roomType, roomId] = chatMessages.dataset.room.split('_');

    if (message && window.chatSocket && roomType && roomId) {
        window.chatSocket.send(JSON.stringify({ message, room_type: roomType, room_id: roomId }));
        messageInput.value = '';
    }
}

// ================================
// Search Chats Functionality
// ================================
function setupChatSearch() {
    const searchInput = document.querySelector('.list-search-input');
    const clearSearchIcon = document.querySelector('.clear-search-icon');
    const chatItems = document.querySelectorAll('.contact-item');

    if (!searchInput) return;

    searchInput.addEventListener('input', function(e) {
        const searchTerm = e.target.value.toLowerCase().trim();
        
        // Show/hide clear icon
        if (clearSearchIcon) {
            clearSearchIcon.style.display = searchTerm ? 'block' : 'none';
        }

        chatItems.forEach(item => {
            const contactName = item.querySelector('.contact-name').textContent.toLowerCase();
            const lastMessage = item.querySelector('.last-message').textContent.toLowerCase();
            
            if (contactName.includes(searchTerm) || lastMessage.includes(searchTerm)) {
                item.style.display = 'flex';
            } else {
                item.style.display = 'none';
            }
        });
    });

    // Clear search functionality
    if (clearSearchIcon) {
        clearSearchIcon.addEventListener('click', function() {
            searchInput.value = '';
            this.style.display = 'none';
            
            chatItems.forEach(item => {
                item.style.display = 'flex';
            });
        });
    }
}

// ================================
// User Search Functions
// ================================
function searchUsers(query, resultsContainer, isGroupSearch = false) {
    if (query.length < 2) {
        resultsContainer.innerHTML = '';
        resultsContainer.style.display = 'none';
        return;
    }

    fetch(`/search_users/?q=${encodeURIComponent(query)}`)
        .then(response => response.json())
        .then(data => {
            resultsContainer.innerHTML = '';
            if (data.users && data.users.length > 0) {
                resultsContainer.style.display = 'block';
                data.users.forEach(user => {
                    const userElement = document.createElement('div');
                    userElement.className = 'search-result-item';
                    userElement.dataset.userId = user.userid;
                    
                    const displayName = user.first_name && user.last_name 
                        ? `${user.first_name} ${user.last_name}` 
                        : user.userid;
                    
                    userElement.textContent = displayName;
                    userElement.addEventListener('click', () => {
                        if (isGroupSearch) {
                            // For group member selection
                            addGroupMember(user.userid, displayName);
                        } else {
                            // For private chat selection
                            const searchInput = document.getElementById('userSearchInput');
                            searchInput.value = displayName;
                            searchInput.dataset.selectedUserId = user.userid;
                            resultsContainer.innerHTML = '';
                            resultsContainer.style.display = 'none';
                        }
                    });
                    
                    resultsContainer.appendChild(userElement);
                });
            } else {
                resultsContainer.style.display = 'block';
                resultsContainer.innerHTML = '<div class="no-results">No users found</div>';
            }
        })
        .catch(error => {
            console.error('Error searching users:', error);
        });
}

// ================================
// Group Member Management
// ================================
function addGroupMember(userId, userName) {
    const selectedMembers = document.getElementById('selectedMembers');
    const selectedUsers = Array.from(selectedMembers.querySelectorAll('.selected-member'))
        .map(el => el.dataset.userId);
    
    if (!selectedUsers.includes(userId)) {
        const selectedMember = document.createElement('div');
        selectedMember.className = 'selected-member';
        selectedMember.dataset.userId = userId;
        selectedMember.innerHTML = `
            ${userName}
            <span class="remove-member" data-user-id="${userId}">×</span>
        `;
        selectedMembers.appendChild(selectedMember);
        
        // Clear search input and results
        const groupMemberSearch = document.getElementById('groupMemberSearch');
        const groupMemberResults = document.getElementById('groupMemberResults');
        if (groupMemberSearch) groupMemberSearch.value = '';
        if (groupMemberResults) {
            groupMemberResults.innerHTML = '';
            groupMemberResults.style.display = 'none';
        }
    }
}

function removeGroupMember(userId) {
    const memberElement = document.querySelector(`.selected-member[data-user-id="${userId}"]`);
    if (memberElement) {
        memberElement.remove();
    }
}

function getSelectedGroupMembers() {
    const selectedMembers = document.getElementById('selectedMembers');
    return Array.from(selectedMembers.querySelectorAll('.selected-member'))
        .map(el => el.dataset.userId);
}

// ================================
// Modal/Dialog Functions
// ================================
function setupModalHandlers() {
    const createNewChatBtn = document.getElementById('createNewChat');
    const closeNewChatModalBtn = document.getElementById('closeNewChatModal');
    const newChatModal = document.getElementById('newChatModal');
    const chatTypeBtns = document.querySelectorAll('.chat-type-btn');
    const privateChatForm = document.getElementById('privateChatForm');
    const groupChatForm = document.getElementById('groupChatForm');
    const userSearchInput = document.getElementById('userSearchInput');
    const userSearchResults = document.getElementById('userSearchResults');
    const createPrivateChatBtn = document.getElementById('createPrivateChatBtn');
    const groupNameInput = document.getElementById('groupNameInput');
    const groupMemberSearch = document.getElementById('groupMemberSearch');
    const groupMemberResults = document.getElementById('groupMemberResults');
    const selectedMembers = document.getElementById('selectedMembers');
    const createGroupChatBtn = document.getElementById('createGroupChatBtn');

    // Open modal
    if (createNewChatBtn) {
        createNewChatBtn.addEventListener('click', () => {
            newChatModal.style.display = 'flex';
            // Reset forms
            if (userSearchInput) {
                userSearchInput.value = '';
                userSearchInput.dataset.selectedUserId = '';
            }
            if (userSearchResults) {
                userSearchResults.innerHTML = '';
                userSearchResults.style.display = 'none';
            }
            if (groupNameInput) groupNameInput.value = '';
            if (groupMemberSearch) groupMemberSearch.value = '';
            if (groupMemberResults) {
                groupMemberResults.innerHTML = '';
                groupMemberResults.style.display = 'none';
            }
            if (selectedMembers) selectedMembers.innerHTML = '';
        });
    }

    // Close modal
    if (closeNewChatModalBtn) {
        closeNewChatModalBtn.addEventListener('click', () => {
            newChatModal.style.display = 'none';
        });
    }

    // Chat type switching
    chatTypeBtns.forEach(btn => {
        btn.addEventListener('click', () => {
            chatTypeBtns.forEach(b => b.classList.remove('active'));
            btn.classList.add('active');
            
            if (btn.dataset.type === 'private') {
                privateChatForm.style.display = 'block';
                groupChatForm.style.display = 'none';
            } else {
                privateChatForm.style.display = 'none';
                groupChatForm.style.display = 'block';
            }
        });
    });

    // User search functionality for private chat
    if (userSearchInput) {
        userSearchInput.addEventListener('input', (e) => {
            searchUsers(e.target.value, userSearchResults, false);
        });
        
        // Hide results when clicking outside
        document.addEventListener('click', (e) => {
            if (!userSearchInput.contains(e.target) && !userSearchResults.contains(e.target)) {
                userSearchResults.style.display = 'none';
            }
        });
    }

    // Group member search functionality
    if (groupMemberSearch) {
        groupMemberSearch.addEventListener('input', (e) => {
            searchUsers(e.target.value, groupMemberResults, true);
        });
        
        // Hide results when clicking outside
        document.addEventListener('click', (e) => {
            if (!groupMemberSearch.contains(e.target) && !groupMemberResults.contains(e.target)) {
                groupMemberResults.style.display = 'none';
            }
        });
    }

    // Remove selected group member
    if (selectedMembers) {
        selectedMembers.addEventListener('click', (e) => {
            if (e.target.classList.contains('remove-member')) {
                const userId = e.target.dataset.userId;
                removeGroupMember(userId);
            }
        });
    }

    // Create private chat
    if (createPrivateChatBtn) {
        createPrivateChatBtn.addEventListener('click', () => {
            const userId = userSearchInput.dataset.selectedUserId;
            if (!userId) {
                alert('Please select a user first');
                return;
            }

            const csrfToken = getCookie('csrftoken');
            fetch('/create_private_chat/', {
                method: 'POST',
                headers: {
                    'Content-Type': 'application/json',
                    'X-CSRFToken': csrfToken
                },
                body: JSON.stringify({ user_id: userId })
            })
            .then(response => response.json())
            .then(data => {
                if (data.success) {
                    newChatModal.style.display = 'none';
                    
                    // Instead of reloading, navigate to the new chat
                    if (data.exists) {
                        // Chat already exists, just navigate to it
                        window.location.href = `/chat/private/${data.chat_id}/`;
                    } else {
                        // New chat created, navigate to it
                        window.location.href = `/chat/private/${data.chat_id}/`;
                    }
                } else {
                    alert('Error creating chat: ' + data.error);
                }
            })
            .catch(error => {
                console.error('Error:', error);
                alert('Error creating chat');
            });
        });
    }

    // Create group chat
    if (createGroupChatBtn) {
        createGroupChatBtn.addEventListener('click', () => {
            const groupName = groupNameInput.value.trim();
            const memberIds = getSelectedGroupMembers();

            if (!groupName) {
                alert('Please enter a group name');
                return;
            }

            if (memberIds.length === 0) {
                alert('Please add at least one member to the group');
                return;
            }

            const csrfToken = getCookie('csrftoken');
            fetch('/create_group_chat/', {
                method: 'POST',
                headers: {
                    'Content-Type': 'application/json',
                    'X-CSRFToken': csrfToken
                },
                body: JSON.stringify({ 
                    name: groupName,
                    members: memberIds 
                })
            })
            .then(response => response.json())
            .then(data => {
                if (data.success) {
                    newChatModal.style.display = 'none';
                    // Navigate to the new group chat
                    window.location.href = `/chat/group/${data.group_id}/`;
                } else {
                    alert('Error creating group: ' + data.error);
                }
            })
            .catch(error => {
                console.error('Error:', error);
                alert('Error creating group');
            });
        });
    }

    // Close modal when clicking outside
    newChatModal.addEventListener('click', (e) => {
        if (e.target === newChatModal) {
            newChatModal.style.display = 'none';
        }
    });
}

// ================================
// Chat Switching & Loading Messages
// ================================
document.addEventListener('DOMContentLoaded', () => {
    const chatListItems = document.querySelectorAll('.contact-item');
    const chatBody = document.getElementById('chatBody');
    const showChatListBtn = document.getElementById('showChatListBtn');
    const chatList = document.getElementById('chatList');
    const currentUsername = document.getElementById('chatAppContent').dataset.username;

    // Setup all functionality
    setupModalHandlers();
    setupChatSearch();

    // Send message handlers
    document.getElementById('sendButton').onclick = sendMessage;
    document.getElementById('messageInput').addEventListener('keydown', (e) => {
        if (e.key === 'Enter') { e.preventDefault(); sendMessage(); }
    });

    // Chat item click handlers
    chatListItems.forEach(item => {
        item.addEventListener('click', () => {
            const roomName = item.dataset.room;
            const chatType = item.dataset.type;

            connectToRoom(chatType, roomName);
            markMessagesAsRead(item);

            fetch(`/get_messages/${chatType}/${roomName}/`)
                .then(res => res.json())
                .then(data => {
                    const chatMessages = document.getElementById('chatMessages');
                    chatMessages.innerHTML = '';

                    if (data.messages && data.messages.length > 0) {
                        data.messages.forEach(msg => {
                            const senderFirstName = (msg.sender_first_name || msg.sender || 'unknown').toLowerCase();
                            const senderUsername = msg.sender_username || msg.sender || 'unknown';
                            displayMessage(msg.message, senderFirstName, senderUsername, currentUsername, msg.timestamp, chatType);
                        });
                    } else {
                        chatMessages.innerHTML = '<p class="empty">No messages in this chat yet</p>';
                    }

                    chatMessages.dataset.room = `${chatType}_${roomName}`;
                });

            const contactName = item.querySelector('.contact-name').textContent;
            document.querySelector('.chat-main .contact-name').textContent = contactName;

            if (window.innerWidth <= 768) { chatList.style.display = 'none'; chatBody.style.display = 'flex'; }
        });
    });

    if (showChatListBtn) {
        showChatListBtn.addEventListener('click', () => {
            if (window.innerWidth <= 768) { chatList.style.display = 'block'; chatBody.style.display = 'none'; }
        });
    }
});