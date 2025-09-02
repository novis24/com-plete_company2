document.addEventListener('DOMContentLoaded', function() {

    // --- Modal Elements ---
    const createNewChatBtn = document.getElementById('createNewChat');
    const newChatModal = document.getElementById('newChatModal');
    const closeModalBtn = document.getElementById('closeNewChatModal');

    // --- Tab Elements ---
    const tabBtns = document.querySelectorAll('.tab-btn');
    const privateTab = document.getElementById('privateTab');
    const groupTab = document.getElementById('groupTab');

    // --- Private Chat Elements ---
    const privateUserSelect = document.getElementById('privateChatUserSelect');
    const createPrivateBtn = document.getElementById('createPrivateChat');

    // --- Group Chat Elements ---
    const groupNameInput = document.getElementById('groupNameInput');
    const groupMembersSelect = document.getElementById('groupMembersSelect');
    const createGroupBtn = document.getElementById('createGroupChat');

    // --- Modal Event Listeners ---
    if (createNewChatBtn) {
        createNewChatBtn.addEventListener('click', function() {
            newChatModal.style.display = 'flex';
        });
    }

    if (closeModalBtn) {
        closeModalBtn.addEventListener('click', function() {
            newChatModal.style.display = 'none';
        });
    }

    // --- Tab Switching ---
    tabBtns.forEach(btn => {
        btn.addEventListener('click', function() {
            tabBtns.forEach(b => b.classList.remove('active'));
            this.classList.add('active');

            if (this.dataset.tab === 'private') {
                privateTab.classList.add('active');
                groupTab.classList.remove('active');
            } else {
                privateTab.classList.remove('active');
                groupTab.classList.add('active');
            }
        });
    });

    // --- Form Validation ---
    function validateGroupForm() {
        const isValid = groupNameInput.value.trim() && groupMembersSelect.selectedOptions.length > 0;
        createGroupBtn.disabled = !isValid;
    }

    if (privateUserSelect) {
        privateUserSelect.addEventListener('change', function() {
            createPrivateBtn.disabled = !this.value;
        });
    }

    if (groupNameInput && groupMembersSelect) {
        groupNameInput.addEventListener('input', validateGroupForm);
        groupMembersSelect.addEventListener('change', validateGroupForm);
    }

    // --- Chat Creation Logic (using async/await) ---
    async function handlePrivateChatCreation() {
        const userId = privateUserSelect.value;
        if (!userId) {
            alert('Please select a user first.');
            return;
        }

        try {
            const response = await fetch('/create/private-chat/', {
                method: 'POST',
                headers: {
                    'Content-Type': 'application/json',
                    'X-CSRFToken': getCookie('csrftoken'),
                },
                body: JSON.stringify({ user_id: userId })
            });

            const data = await response.json();

            if (data.success) {
                // Correct redirect using chat_id from the server
                window.location.href = `/chat/private/${data.chat_id}/`;
            } else {
                alert('Error creating chat: ' + (data.error || 'Unknown error'));
            }
        } catch (error) {
            console.error('Error:', error);
            alert('An unexpected error occurred while creating the chat.');
        }
    }

    async function handleGroupChatCreation() {
        const groupName = groupNameInput.value.trim();
        const members = Array.from(groupMembersSelect.selectedOptions).map(opt => opt.value);

        if (!groupName || members.length === 0) {
            alert('Please enter a group name and select at least one member.');
            return;
        }

        try {
            const response = await fetch('/create/group-chat/', {
                method: 'POST',
                headers: {
                    'Content-Type': 'application/json',
                    'X-CSRFToken': getCookie('csrftoken'),
                },
                body: JSON.stringify({ name: groupName, members: members })
            });

            const data = await response.json();

            if (data.success) {
                // Correct redirect using group_id from the server
                window.location.href = `/chat/group/${data.group_id}/`;
            } else {
                alert('Error creating group: ' + (data.error || 'Unknown error'));
            }
        } catch (error) {
            console.error('Error:', error);
            alert('An unexpected error occurred while creating the group.');
        }
    }

    // --- Button Event Listeners ---
    if (createPrivateBtn) {
        createPrivateBtn.addEventListener('click', handlePrivateChatCreation);
    }

    if (createGroupBtn) {
        createGroupBtn.addEventListener('click', handleGroupChatCreation);
    }

    // --- Helper function for CSRF token ---
    function getCookie(name) {
        let cookieValue = null;
        if (document.cookie && document.cookie !== '') {
            const cookies = document.cookie.split(';');
            for (let i = 0; i < cookies.length; i++) {
                const cookie = cookies[i].trim();
                if (cookie.startsWith(name + '=')) {
                    cookieValue = decodeURIComponent(cookie.substring(name.length + 1));
                    break;
                }
            }
        }
        return cookieValue;
    }
});