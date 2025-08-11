// Function to get CSRF token from the cookie
function getCookie(name) {
    let cookieValue = null;
    if (document.cookie && document.cookie !== '') {
        const cookies = document.cookie.split(';');
        for (let i = 0; i < cookies.length; i++) {
            const cookie = cookies[i].trim();
            // Does this cookie string begin with the name we want?
            if (cookie.startsWith(name + '=')) {
                cookieValue = decodeURIComponent(cookie.substring(name.length + 1));
                break;
            }
        }
    }
    return cookieValue;
}

// Function to update the last message in the chat list
function updateLastMessage(chatListItem, message) {
    const lastMessageSpan = chatListItem.querySelector('.last-message');
    if (lastMessageSpan) {
        lastMessageSpan.textContent = message.message.substring(0, 30);
    }
}

// Function to update the unread count in the chat list
function updateUnreadCount(chatListItem) {
    const unreadMarker = chatListItem.querySelector('.unread-marker');
    if (unreadMarker) {
        const count = parseInt(unreadMarker.textContent, 10);
        unreadMarker.textContent = count + 1;
        unreadMarker.style.display = 'inline-block';
    } else {
        const newUnreadMarker = document.createElement('span');
        newUnreadMarker.className = 'unread-marker';
        newUnreadMarker.textContent = '1';
        newUnreadMarker.style.display = 'inline-block';
        chatListItem.appendChild(newUnreadMarker);
    }
}

// Function to mark all messages in a chat as read
function markMessagesAsRead(chatListItem) {
    if (!chatListItem) {
        console.error("Chat list item not found, cannot mark messages as read.");
        return;
    }
    
    // Immediately remove the unread marker to provide instant feedback
    const unreadMarker = chatListItem.querySelector('.unread-marker');
    if (unreadMarker) {
        unreadMarker.remove();
    }

    const room_id = chatListItem.dataset.room;
    const is_private = chatListItem.dataset.type === 'private';
    const csrfToken = getCookie('csrftoken');
    
    // Now send the request to the backend to update the database
    fetch('/mark_messages_as_read/', {
        method: 'POST',
        headers: {
            'Content-Type': 'application/json',
            'X-CSRFToken': csrfToken,
        },
        body: JSON.stringify({ room_id, is_private })
    })
    .then(response => response.json())
    .then(data => {
        if (!data.success) {
            console.error('Failed to mark messages as read on the server.');
        }
    })
    .catch(error => console.error('Error marking messages as read:', error));
}


// Function to connect to a WebSocket for a given room
function connectToRoom(roomType, roomId) {
    if (window.chatSocket) {
        console.log('Closing existing WebSocket connection.');
        window.chatSocket.close();
    }

    const ws_scheme = window.location.protocol === "https:" ? "wss" : "ws";
    const chatSocket = new WebSocket(
        ws_scheme + '://' + window.location.host + '/ws/chat/' + roomType + '/' + roomId + '/'
    );

    chatSocket.onmessage = function(e) {
        console.log("WebSocket message received:", e.data);
        const data = JSON.parse(e.data);
        const { username } = document.getElementById('chatAppContent').dataset;

        if (data.type === 'chat_message') {
            console.log("Displaying new message:", data);
            displayMessage(data.message, data.sender, username, data.timestamp);
        } else if (data.type === 'notification' && data.unread_count) {
            // Find the chat item in the list and update the unread count
            const chatList = document.getElementById('chatList');
            const chatListItem = chatList.querySelector(`.contact-item[data-room="${data.room_id}"][data-type="${data.room_type}"]`);
            if (chatListItem) {
                const unreadMarker = chatListItem.querySelector('.unread-marker');
                if (unreadMarker) {
                    unreadMarker.textContent = data.unread_count;
                    unreadMarker.style.display = 'inline-block';
                } else {
                    const newUnreadMarker = document.createElement('span');
                    newUnreadMarker.className = 'unread-marker';
                    newUnreadMarker.textContent = data.unread_count;
                    newUnreadMarker.style.display = 'inline-block';
                    chatListItem.appendChild(newUnreadMarker);
                }
                
                if (data.last_message) {
                    updateLastMessage(chatListItem, data.last_message);
                }

                const parent = chatListItem.parentNode;
                parent.prepend(chatListItem);

            }
        } else {
            console.warn("Received unknown message type:", data.type);
        }
    };

    chatSocket.onclose = function(e) {
        console.error('Chat socket closed unexpectedly');
    };

    chatSocket.onopen = function(e) {
        console.log('Chat socket opened successfully');
    };

    window.chatSocket = chatSocket;
}


// Helper function to send a message
const sendMessage = () => {
    const messageInput = document.getElementById('messageInput');
    const message = messageInput.value;
    const chatMessages = document.getElementById('chatMessages');
    const roomCombined = chatMessages.dataset.room;
    
    // Extract roomType and roomId from the roomCombined string
    const [roomType, roomId] = roomCombined.split('_');

    if (message.trim() && window.chatSocket && roomType && roomId) {
        console.log("Sending message via WebSocket:", { message, roomType, roomId });
        window.chatSocket.send(JSON.stringify({
            'message': message,
            'room_type': roomType,
            'room_id': roomId,
        }));
        messageInput.value = '';
    } else {
        console.error("Could not send message. WebSocket not open or message is empty.");
    }
};

// Function to display messages in the chat body
function displayMessage(message, sender, currentUser, timestamp) {
    const chatMessages = document.getElementById('chatMessages');
    const messageElement = document.createElement('div');
    messageElement.classList.add('message');
    if (sender === currentUser) {
        messageElement.classList.add('sent');
    } else {
        messageElement.classList.add('received');
    }
    // Now we can safely use the timestamp variable
    messageElement.innerHTML = `<strong>${sender}:</strong> ${message}<div class="timestamp">${timestamp}</div>`;
    chatMessages.appendChild(messageElement);
    chatMessages.scrollTop = chatMessages.scrollHeight;
}

// Event listener for sending messages
document.getElementById('sendButton').onclick = sendMessage;

// Event listener for Enter key on message input
document.getElementById('messageInput').addEventListener('keydown', (e) => {
    if (e.key === 'Enter') {
        e.preventDefault();
        sendMessage();
    }
});


// Event listener to switch chats
document.addEventListener('DOMContentLoaded', () => {
    const chatListItems = document.querySelectorAll('.contact-item');
    const chatBody = document.getElementById('chatBody');
    const showChatListBtn = document.getElementById('showChatListBtn');
    const chatList = document.getElementById('chatList');

    if (window.innerWidth <= 768) {
        chatList.style.display = 'none';
        chatBody.style.display = 'block';
    }
    
    chatListItems.forEach(item => {
        item.addEventListener('click', () => {
            const roomName = item.dataset.room;
            const chatType = item.dataset.type;
            
            connectToRoom(chatType, roomName);
            // This will now update the UI immediately
            markMessagesAsRead(item);

            fetch(`/get_messages/${chatType}/${roomName}/`)
            .then(response => {
                if (!response.ok) {
                    throw new Error('Network response was not ok');
                }
                return response.json();
            })
            .then(data => {
                const chatMessages = document.getElementById('chatMessages');
                chatMessages.innerHTML = '';
                if (data.messages && data.messages.length > 0) {
                    data.messages.forEach(msg => {
                        displayMessage(msg.message, msg.sender, document.getElementById('chatAppContent').dataset.username, msg.timestamp);
                    });
                } else {
                    chatMessages.innerHTML = '<p style="text-align:center;color:#888;margin-top:20px;">No messages in this chat yet</p>';
                }
                chatMessages.dataset.room = `${chatType}_${roomName}`;
            })
            .catch(error => {
                console.error('Error loading messages:', error);
                const chatMessages = document.getElementById('chatMessages');
                chatMessages.innerHTML = '<p style="text-align:center;color:#888;margin-top:20px;">Error loading messages</p>';
            });

            const contactName = item.querySelector('.contact-name').textContent;
            const headerName = document.querySelector('.chat-main .contact-name');
            headerName.textContent = contactName;

            if (window.innerWidth <= 768) {
                chatList.style.display = 'none';
                chatBody.style.display = 'flex';
            }
        });
    });

    if (showChatListBtn) {
        showChatListBtn.addEventListener('click', () => {
            if (window.innerWidth <= 768) {
                chatList.style.display = 'block';
                chatBody.style.display = 'none';
            }
        });
    }

    const searchInput = document.querySelector('.list-search-input');
    const clearSearchIcon = document.querySelector('.clear-search-icon');
    
    searchInput.addEventListener('input', (e) => {
        const query = e.target.value.toLowerCase();
        const chatItems = document.querySelectorAll('.contact-item');
        if (query) {
            clearSearchIcon.style.display = 'inline-block';
        } else {
            clearSearchIcon.style.display = 'none';
        }
        chatItems.forEach(item => {
            const name = item.querySelector('.contact-name').textContent.toLowerCase();
            if (name.includes(query)) {
                item.style.display = '';
            } else {
                item.style.display = 'none';
            }
        });
    });

    clearSearchIcon.addEventListener('click', () => {
        searchInput.value = '';
        searchInput.dispatchEvent(new Event('input'));
    });
});
