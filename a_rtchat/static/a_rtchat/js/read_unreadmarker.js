// Add to your chat.js
function markMessagesAsRead(roomId, isPrivate) {
    // Send AJAX request to mark messages as read
    fetch('/mark_messages_as_read/', {
        method: 'POST',
        headers: {
            'Content-Type': 'application/json',
            'X-CSRFToken': getCookie('csrftoken'),
        },
        body: JSON.stringify({
            room_id: roomId,
            is_private: isPrivate
        })
    })
    .then(response => response.json())
    .then(data => {
        if (data.success) {
            // Update UI to remove unread markers
            document.querySelectorAll('.unread-marker').forEach(marker => {
                marker.remove();
            });
        }
    });
}

// Call this when opening a chat
function openChat(roomId, isPrivate) {
    markMessagesAsRead(roomId, isPrivate);
    // ... rest of your open chat logic
}

// Helper function to get CSRF token
function getCookie(name) {
    let cookieValue = null;
    if (document.cookie && document.cookie !== '') {
        const cookies = document.cookie.split(';');
        for (let i = 0; i < cookies.length; i++) {
            const cookie = cookies[i].trim();
            if (cookie.substring(0, name.length + 1) === (name + '=')) {
                cookieValue = decodeURIComponent(cookie.substring(name.length + 1));
                break;
            }
        }
    }
    return cookieValue;
}