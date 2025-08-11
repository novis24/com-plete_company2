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

































































//  // Get room name from the chat messages container
// const roomName = document.getElementById('chatMessages').getAttribute('data-room');
// const wsUrl = `${protocol}://${window.location.host}/ws/chat/${roomName}/`;
 
 
 
 
//  document.addEventListener('DOMContentLoaded', function () {
//     const sendButton = document.getElementById('sendButton');
//     const messageInput = document.getElementById('messageInput');
//     const chatMessages = document.querySelector('.chat-messages');

//     if (!sendButton || !messageInput || !chatMessages) {
//         console.warn('Chat input elements not found.');
//         return;
//     }

//     const username = window.USERNAME || 'Anonymous';

//     // WebSocket URL (adjust if you use a path or room)
//     const protocol = window.location.protocol === 'https:' ? 'wss' : 'ws';
//     const wsUrl = `${protocol}://${window.location.host}/ws/chat/`;

//     let chatSocket = new WebSocket(wsUrl);

//     chatSocket.onopen = () => {
//         console.log('WebSocket connection opened');
//     };

//     chatSocket.onerror = (error) => {
//         console.error('WebSocket error:', error);
//     };

//     chatSocket.onmessage = (e) => {
//         const data = JSON.parse(e.data);
//         if (!data.message) return;

//         const bubble = document.createElement('div');
//         bubble.classList.add('chat-bubble');
//         bubble.classList.add(data.username === username ? 'user-message' : 'other-message');
//         bubble.textContent = `${data.username}: ${data.message}`;
//         chatMessages.appendChild(bubble);
//         chatMessages.scrollTop = chatMessages.scrollHeight;
//     };

//     sendButton.addEventListener('click', () => {
//         const messageText = messageInput.value.trim();
//         if (messageText === '') return;

//         if (chatSocket.readyState === WebSocket.OPEN) {
//             chatSocket.send(JSON.stringify({
//                 message: messageText,
//                 username: username,
//             }));
//             messageInput.value = '';
//         } else {
//             alert('WebSocket is not connected.');
//         }
//     });

//     messageInput.addEventListener('keydown', (event) => {
//         if (event.key === 'Enter') {
//             event.preventDefault();
//             sendButton.click();
//         }
//     });
// });

 
 
//  // Ensure the script runs after the DOM is fully loaded
//     document.addEventListener('DOMContentLoaded', function () {
//         const chatList = document.getElementById('chatList');
//         const chatBody = document.getElementById('chatBody');
//         const showChatListBtn = document.getElementById('showChatListBtn');

//         // Toggle chat list visibility
//         showChatListBtn.addEventListener('click', function () {
//             chatList.classList.toggle('hidden');
//             chatBody.classList.toggle('expanded');
//         });
//     });
// // Wrap inside an IIFE to avoid interfering with other scripts
// (function () {
//     // Ensure the DOM is fully loaded
//     document.addEventListener('DOMContentLoaded', function () {
//         const sendButton = document.getElementById('sendButton');
//         const messageInput = document.getElementById('messageInput');
//         const chatMessages = document.getElementById('chatMessages');

//         if (!sendButton || !messageInput || !chatMessages) {
//             console.warn('Chat input elements not found.');
//             return;
//         }

//         // Helper to create a message bubble
//         function createMessageBubble(messageText) {
//             const bubble = document.createElement('div');
//             bubble.classList.add('chat-bubble', 'user-message'); // You can style these classes in CSS
//             bubble.textContent = messageText;
//             return bubble;
//         }

//         // Send button click event
//         sendButton.addEventListener('click', function () {
//             const messageText = messageInput.value.trim();
//             if (messageText === '') {
//                 return;
//             }
//             const newBubble = createMessageBubble(messageText);
//             chatMessages.appendChild(newBubble);
//             messageInput.value = '';
//             chatMessages.scrollTop = chatMessages.scrollHeight; // Auto-scroll
//         });

//         // Optional: Send message on Enter key
//         messageInput.addEventListener('keydown', function (event) {
//             if (event.key === 'Enter') {
//                 event.preventDefault(); // Prevent form submission if inside a form
//                 sendButton.click();
//             }
//         });
//     });
// })();