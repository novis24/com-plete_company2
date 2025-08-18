document.addEventListener('DOMContentLoaded', function() {
    // Filter functionality
    const filterOptions = document.querySelectorAll('.filter-option');
    const chatItems = document.querySelectorAll('.contact-item');
    
    filterOptions.forEach(option => {
        option.addEventListener('click', function(e) {
            e.preventDefault();
            const filterType = this.getAttribute('data-filter');
            
            // Remove active class from all options
            filterOptions.forEach(opt => opt.classList.remove('active'));
            
            // Add active class to selected option
            this.classList.add('active');
            
            // Filter chat items
            chatItems.forEach(item => {
                item.classList.remove('hidden');
                
                if (filterType === 'all') {
                    // Show all items
                    return;
                }
                
                if (filterType === 'unread') {
                    // Implement unread logic - you'll need to add unread markers to your HTML
                    // This is a placeholder - you'll need to implement actual unread tracking
                    if (!item.querySelector('.unread-marker')) {
                        item.classList.add('hidden');
                    }
                } else if (filterType === 'private' && !item.classList.contains('private-chat')) {
                    item.classList.add('hidden');
                } else if (filterType === 'group' && !item.classList.contains('group-chat')) {
                    item.classList.add('hidden');
                }
            });
        });
    });
    
    // Toggle dropdown when clicking filter icon
    document.getElementById('filterChats').addEventListener('click', function(e) {
        e.stopPropagation();
        const dropdown = document.getElementById('filterDropdown');
        dropdown.style.display = dropdown.style.display === 'block' ? 'none' : 'block';
    });
    
    // Close dropdown when clicking elsewhere
    document.addEventListener('click', function() {
        document.getElementById('filterDropdown').style.display = 'none';
    });
});

// Filter functionality
document.querySelectorAll('.filter-option').forEach(option => {
    option.addEventListener('click', function(e) {
        e.preventDefault();
        const filterType = this.dataset.filter;
        
        // Remove active class from all options
        document.querySelectorAll('.filter-option').forEach(opt => {
            opt.classList.remove('active');
        });
        
        // Add active class to selected option
        this.classList.add('active');
        
        // Filter chat items
        filterChats(filterType);
    });
});

function filterChats(filterType) {
    const chatItems = document.querySelectorAll('.contact-item');
    
    chatItems.forEach(item => {
        item.style.display = 'flex'; // Reset display
        
        if (filterType === 'all') {
            return; // Show all items
        }
        
        if (filterType === 'unread') {
            // Hide items with no unread messages
            if (!item.querySelector('.unread-marker')) {
                item.style.display = 'none';
            }
        } else {
            // Hide items that don't match the filter type
            const itemType = item.dataset.type;
            if (itemType !== filterType) {
                item.style.display = 'none';
            }
        }
    });
}

// Filter functionality
document.querySelectorAll('.filter-option').forEach(option => {
    option.addEventListener('click', function(e) {
        e.preventDefault();
        const filterType = this.dataset.filter;
        
        // Update active state
        document.querySelectorAll('.filter-option').forEach(opt => {
            opt.classList.remove('active');
        });
        this.classList.add('active');
        
        // Try client-side filtering first
        filterChatsClientSide(filterType);
        
        // Then update URL via history API
        history.pushState({}, '', this.href);
    });
});

function filterChatsClientSide(filterType) {
    const chatItems = document.querySelectorAll('.contact-item');
    
    chatItems.forEach(item => {
        item.style.display = 'flex'; // Reset display
        
        if (filterType === 'all') {
            return; // Show all items
        }
        
        if (filterType === 'unread') {
            // Hide items with no unread messages
            if (!item.querySelector('.unread-marker')) {
                item.style.display = 'none';
            }
        } else {
            // Hide items that don't match the filter type
            const itemType = item.dataset.type;
            if (itemType !== filterType) {
                item.style.display = 'none';
            }
        }
    });
}