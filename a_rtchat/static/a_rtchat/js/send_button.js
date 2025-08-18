document.addEventListener('DOMContentLoaded', function() {
    const sendButton = document.getElementById('sendButton');
    const messageInput = document.getElementById('messageInput');
    const chatMessages = document.getElementById('chatMessages');
    const username = window.USERNAME;

    if (!sendButton || !messageInput || !chatMessages || !username) {
        console.error('Missing required elements or user not authenticated');
        return;
    }

    // Get room name from data attribute
    const roomName = chatMessages.getAttribute('data-room');
    const protocol = window.location.protocol === 'https:' ? 'wss' : 'ws';
    const wsUrl = `${protocol}://${window.location.host}/ws/chat/${roomName}/`;

    let chatSocket = new WebSocket(wsUrl);

    // Connection handlers
    chatSocket.onopen = () => console.log('WebSocket connected');
    chatSocket.onerror = (error) => console.error('WebSocket error:', error);
    
    chatSocket.onclose = (e) => {
        if (e.code === 4001) {
            alert("You don't have permission to access this chat");
        }
        console.log('WebSocket disconnected:', e.reason);
    };

    // Message handler
    chatSocket.onmessage = (e) => {
        const data = JSON.parse(e.data);
        if (!data.message) {
            return;
        }

        const bubble = document.createElement('div');
        bubble.classList.add('chat-bubble');
        bubble.classList.add(data.sender === username ? 'user-message' : 'other-message');
        bubble.innerHTML = `
            <strong>${data.sender}:</strong> ${data.message}
            <div class="timestamp">${new Date(data.timestamp).toLocaleTimeString()}</div>
        `;
        chatMessages.appendChild(bubble);
        chatMessages.scrollTop = chatMessages.scrollHeight;
    };

    // Send message
    function sendMessage() {
        const messageText = messageInput.value.trim();
        if (!messageText || chatSocket.readyState !== WebSocket.OPEN) {return;
        }

        chatSocket.send(JSON.stringify({
            message: messageText,
            username: username  // Still send as 'username' for the consumer
        }));
        messageInput.value = '';
    }

    sendButton.addEventListener('click', sendMessage);
    messageInput.addEventListener('keydown', (e) => {
        if (e.key === 'Enter') {
            e.preventDefault();
            sendMessage();
        }
    });
});



