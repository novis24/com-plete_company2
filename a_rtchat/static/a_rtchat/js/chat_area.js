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
// Time Formatting
// ================================
function formatTime12h(date) {
    let h = date.getHours();
    const m = date.getMinutes().toString().padStart(2, "0");
    const ampm = h >= 12 ? "PM" : "AM";
    h = h % 12 || 12;
    return `${h}:${m} ${ampm}`;
}

function applyLocalTime(root = document) {
    root.querySelectorAll("[data-iso]").forEach(el => {
        const iso = el.getAttribute("data-iso");
        if (!iso) return;
        const d = new Date(iso);
        el.textContent = formatTime12h(d);
    });
}

// ================================
// Display Messages
// ================================
function displayMessage(message, senderFirstName, senderUsername, currentUsername, timestamp, chatType) {
    const chatMessages = document.getElementById("chatMessages");
    const placeholder = chatMessages.querySelector('.empty');
    if (placeholder) placeholder.remove();

    const messageElement = document.createElement("div");
    messageElement.classList.add("message");
    const isSent = senderUsername === currentUsername;
    messageElement.classList.add(isSent ? "sent" : "received");

    let messageHTML = (chatType === "group" && !isSent)
        ? `<strong>${senderFirstName}:</strong> ${message}`
        : message;

    const d = new Date(timestamp);
    const formattedTime = formatTime12h(d);

    messageElement.innerHTML = `
        <div class="message-content">${messageHTML}</div>
        <div class="timestamp" data-iso="${timestamp}">${formattedTime}</div>
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
                if (data.last_message) {
                    const lastMessageSpan = chatListItem.querySelector('.last-message');
                    if (lastMessageSpan) lastMessageSpan.textContent = data.last_message.message.substring(0,30);
                }
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
        const placeholder = chatMessages.querySelector('.empty');
        if (placeholder) placeholder.remove();
    }
}

// ================================
// Mark Messages as Read
// ================================
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
// Chat List Search
// ================================
function setupChatSearch() {
    const searchInput = document.querySelector('.list-search-input');
    const clearSearchIcon = document.querySelector('.clear-search-icon');
    const chatItems = document.querySelectorAll('.contact-item');
    if (!searchInput) return;

    searchInput.addEventListener('input', function(e) {
        const searchTerm = e.target.value.toLowerCase().trim();
        if (clearSearchIcon) clearSearchIcon.style.display = searchTerm ? 'block' : 'none';

        chatItems.forEach(item => {
            const contactName = item.querySelector('.contact-name').textContent.toLowerCase();
            const lastMessage = item.querySelector('.last-message')?.textContent.toLowerCase() || '';
            item.style.display = contactName.includes(searchTerm) || lastMessage.includes(searchTerm) ? 'flex' : 'none';
        });
    });

    if (clearSearchIcon) {
        clearSearchIcon.addEventListener('click', function() {
            searchInput.value = '';
            this.style.display = 'none';
            chatItems.forEach(item => item.style.display = 'flex');
        });
    }
}

// ================================
// User Search (Private / Group)
// ================================
function searchUsers(query, resultsContainer, isGroupSearch = false) {
    if (query.length < 2) {
        resultsContainer.innerHTML = '';
        resultsContainer.style.display = 'none';
        return;
    }

    fetch(`/search_users/?q=${encodeURIComponent(query)}`)
        .then(res => res.json())
        .then(data => {
            resultsContainer.innerHTML = '';
            if (data.users && data.users.length > 0) {
                resultsContainer.style.display = 'block';
                data.users.forEach(user => {
                    const userElement = document.createElement('div');
                    userElement.className = 'search-result-item';
                    userElement.dataset.userId = user.userid;
                    const displayName = user.first_name && user.last_name ? `${user.first_name} ${user.last_name}` : user.userid;
                    userElement.textContent = displayName;

                    userElement.addEventListener('click', () => {
                        if (isGroupSearch) addGroupMember(user.userid, displayName);
                        else {
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
        }).catch(err => console.error('User search error:', err));
}

// ================================
// Group Member Management
// ================================
function addGroupMember(userId, userName) {
    const selectedMembers = document.getElementById('selectedMembers');
    const selectedUsers = Array.from(selectedMembers.querySelectorAll('.selected-member')).map(el => el.dataset.userId);

    if (!selectedUsers.includes(userId)) {
        const memberElement = document.createElement('div');
        memberElement.className = 'selected-member';
        memberElement.dataset.userId = userId;
        memberElement.textContent = userName;
        const removeBtn = document.createElement('span');
        removeBtn.textContent = ' ×';
        removeBtn.className = 'remove-member';
        removeBtn.addEventListener('click', () => memberElement.remove());
        memberElement.appendChild(removeBtn);
        selectedMembers.appendChild(memberElement);
    }
}

// ================================
// Create New Chat (Private / Group)
// ================================
function createNewChat(e) {
    e.preventDefault();
    const btnId = e.currentTarget.id;
    const chatType = btnId === 'createPrivateChatBtn' ? 'private' : 'group';
    const csrfToken = getCookie('csrftoken');

    if (chatType === 'private') {
        const userId = document.getElementById('userSearchInput')?.dataset.selectedUserId;
        if (!userId) return alert("Select a user");

        fetch('/create_private_chat/', {
            method: 'POST',
            headers: { 'Content-Type': 'application/json', 'X-CSRFToken': csrfToken },
            body: JSON.stringify({ user_id: userId })
        })
        .then(res => res.json())
        .then(data => {
            if (data.success) location.reload();
            else alert(data.error || 'Error creating chat');
        });
    } else if (chatType === 'group') {
        const members = Array.from(document.querySelectorAll('#selectedMembers .selected-member')).map(el => el.dataset.userId);
        const groupNameInput = document.getElementById('groupNameInput');
        if (!groupNameInput) return alert("Group name input not found!");

        const groupName = groupNameInput.value.trim();
        if (!groupName || members.length === 0) return alert("Enter group name and select members");

        fetch('/create_group_chat/', {
            method: 'POST',
            headers: { 'Content-Type': 'application/json', 'X-CSRFToken': csrfToken },
            body: JSON.stringify({ name: groupName, members })
        })
        .then(res => res.json())
        .then(data => {
            if (data.success) location.reload();
            else alert(data.error || 'Error creating group chat');
        });
    }
}

// ================================
// DOM Ready - Setup Everything
// ================================
document.addEventListener('DOMContentLoaded', () => {
    
    const chatBody = document.getElementById('chatBody');
    const chatList = document.getElementById('chatList');
    const currentUsername = document.getElementById('chatAppContent').dataset.username;

    setupChatSearch();

    // Send message
    document.getElementById('sendButton').onclick = sendMessage;
    document.getElementById('messageInput').addEventListener('keydown', (e) => {
        if (e.key === 'Enter') { e.preventDefault(); sendMessage(); }
    });

    // Chat item click
    chatList.addEventListener('click', (e) => {
        const item = e.target.closest('.contact-item');
        if (!item) return;

        const roomName = item.dataset.room;
        const chatType = item.dataset.type;

        if (window.innerWidth <= 768) {
            chatList.style.display = 'none';
            chatBody.style.display = 'flex';
        }

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

        // --- NEW: Show/Hide Group Info Button ---
        const groupInfoBtn = document.getElementById('groupInfoBtn');
        if (groupInfoBtn) {
            groupInfoBtn.style.display = chatType === 'group' ? 'inline-flex' : 'none';
        }
    });

    // Show chat list button (mobile)
    const showChatListBtn = document.getElementById('showChatListBtn');
    if (showChatListBtn) {
        showChatListBtn.addEventListener('click', () => {
            if (window.innerWidth <= 768) {
                chatList.style.display = 'block';
                chatBody.style.display = 'none';
            }
        });
    }

    // Private search
    const userSearchInput = document.getElementById('userSearchInput');
    const userResultsContainer = document.getElementById('userSearchResults');
    if (userSearchInput && userResultsContainer) {
        userSearchInput.addEventListener('input', (e) => searchUsers(e.target.value, userResultsContainer, false));
    }

    // Group search
    const groupSearchInput = document.getElementById('groupMemberSearch');
    const groupResultsContainer = document.getElementById('groupMemberResults');
    if (groupSearchInput && groupResultsContainer) {
        groupSearchInput.addEventListener('input', (e) => searchUsers(e.target.value, groupResultsContainer, true));
    }

    // Chat type toggle
    document.querySelectorAll('.chat-type-btn').forEach(btn => {
        btn.addEventListener('click', () => {
            document.querySelectorAll('.chat-type-btn').forEach(b => b.classList.remove('active'));
            btn.classList.add('active');
            const type = btn.dataset.type;
            document.getElementById('privateChatForm').style.display = type === 'private' ? 'block' : 'none';
            document.getElementById('groupChatForm').style.display = type === 'group' ? 'block' : 'none';
        });
    });

    // Modal open/close
    document.getElementById('createNewChat').addEventListener('click', () => {
        document.getElementById('newChatModal').style.display = 'flex';
    });
    document.getElementById('closeNewChatModal').addEventListener('click', () => {
        document.getElementById('newChatModal').style.display = 'none';
    });

    // Create chat buttons
    document.getElementById('createPrivateChatBtn').addEventListener('click', createNewChat);
    document.getElementById('createGroupChatBtn').addEventListener('click', createNewChat);

    // Format existing timestamps
    applyLocalTime();

    // Watch for new messages
    const chatMessages = document.getElementById("chatMessages");
    if (chatMessages) {
        const observer = new MutationObserver(mutations => {
            for (const mutation of mutations) {
                mutation.addedNodes.forEach(node => {
                    if (node.nodeType === 1) applyLocalTime(node);
                });
            }
        });
        observer.observe(chatMessages, { childList: true, subtree: true });
    }
});

// ================================
// Show Group Members Popup
// ================================
(function() {
    // Create popup container once
    const groupMembersPopup = document.createElement('div');
    groupMembersPopup.id = 'groupMembersPopup';
    groupMembersPopup.style.position = 'absolute';
    groupMembersPopup.style.display = 'none';
    groupMembersPopup.style.background = '#fff';
    groupMembersPopup.style.border = '1px solid #ccc';
    groupMembersPopup.style.borderRadius = '8px';
    groupMembersPopup.style.boxShadow = '0 2px 8px rgba(0,0,0,0.2)';
    groupMembersPopup.style.padding = '10px';
    groupMembersPopup.style.zIndex = '1000';
    groupMembersPopup.style.maxHeight = '400px';
    groupMembersPopup.style.overflowY = 'auto';
    document.body.appendChild(groupMembersPopup);

    // Hide popup if clicked outside
    document.addEventListener('click', (e) => {
        if (!groupMembersPopup.contains(e.target) && !e.target.closest('#groupIcon')) {
            groupMembersPopup.style.display = 'none';
        }
    });

    // Click handler for group icon
    document.getElementById('groupIcon')?.addEventListener('click', async (e) => {
        e.stopPropagation(); // prevent closing immediately
        const chatMessages = document.getElementById('chatMessages');
        if (!chatMessages) return;

        const [roomType, roomId] = chatMessages.dataset.room.split('_');
        if (roomType !== 'group') return;

        try {
            const res = await fetch(`/get_group_members/${roomId}/`);
            const data = await res.json();

            if (!data.members || data.members.length === 0) {
                groupMembersPopup.innerHTML = '<p style="margin:0;">No members found</p>';
            } else {
                groupMembersPopup.innerHTML = '';
                data.members.forEach(member => {
                    const div = document.createElement('div');
                    div.className = 'group-member';
                    div.style.display = 'flex';
                    div.style.alignItems = 'center';
                    div.style.gap = '8px';
                    div.style.padding = '6px 4px';
                    div.style.borderBottom = '1px solid #eee';
                    div.innerHTML = `<span class="member-name">${member.name}</span>`;
                    groupMembersPopup.appendChild(div);
                });
            }

            // Position popup under icon
            const rect = e.target.getBoundingClientRect();
            groupMembersPopup.style.top = `${rect.bottom + window.scrollY}px`;
            groupMembersPopup.style.left = `${rect.left + window.scrollX}px`;
            groupMembersPopup.style.display = 'block';
        } catch (err) {
            console.error('Failed to fetch group members:', err);
        }
    });
})();


// Group Info Button Click - Show Members
const groupInfoBtn = document.getElementById('groupInfoBtn');
const groupMembersModal = document.getElementById('groupMembersModal');
const groupMembersList = document.getElementById('groupMembersList');
const closeGroupMembersModal = document.getElementById('closeGroupMembersModal');

if (groupInfoBtn) {
    groupInfoBtn.addEventListener('click', () => {
        const chatMessages = document.getElementById('chatMessages');
        const roomData = chatMessages.dataset.room; // format: "group_<roomId>"
        if (!roomData) return;

        const roomId = roomData.split('_')[1];

        // Fetch members from your backend
        fetch(`/get_group_members/${roomId}/`)
            .then(res => res.json())
            .then(data => {
                groupMembersList.innerHTML = '';
                if (data.members && data.members.length > 0) {
                    data.members.forEach(member => {
                        const div = document.createElement('div');
                        div.className = 'group-member';
                        div.textContent = member.first_name && member.last_name ? 
                                          `${member.first_name} ${member.last_name}` : 
                                          member.username;
                        groupMembersList.appendChild(div);
                    });
                } else {
                    groupMembersList.innerHTML = '<p>No members found</p>';
                }
                groupMembersModal.style.display = 'flex';
            })
            .catch(err => console.error('Error fetching group members:', err));
    });
}

// Close modal
if (closeGroupMembersModal) {
    closeGroupMembersModal.addEventListener('click', () => {
        groupMembersModal.style.display = 'none';
    });
}

// Close modal when clicking outside content
window.addEventListener('click', (e) => {
    if (e.target === groupMembersModal) groupMembersModal.style.display = 'none';
});
