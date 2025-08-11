document.addEventListener('DOMContentLoaded', () => {
    // This script runs after the sidebar HTML is loaded into the DOM by app.js
    const sidebar = document.getElementById('mainSidebar');
    const sidebarToggle = document.getElementById('sidebarToggle');
    const navLinks = document.querySelectorAll('.main-nav .nav-link');

    if (!sidebar || !sidebarToggle || navLinks.length === 0) {
        console.warn("Sidebar elements not found. Ensure sidebar.html is loaded correctly.");
        return;
    }

    /*
        ========================================
        SIDEBAR COLLAPSE/EXPAND LOGIC
        ========================================
    */
    function toggleSidebar() {
        sidebar.classList.toggle('collapsed');
    }

    sidebarToggle.addEventListener('click', (event) => {
        event.stopPropagation();
        toggleSidebar();
    });

    document.addEventListener('click', (event) => {
        if (!sidebar.classList.contains('collapsed') &&
            !sidebar.contains(event.target) &&
            event.target !== sidebarToggle &&
            !sidebarToggle.contains(event.target)) {
            sidebar.classList.add('collapsed');
        }
    });

    sidebar.addEventListener('click', (event) => {
        event.stopPropagation();
    });

    /*
        ========================================
        SIDEBAR NAVIGATION HANDLER
        (Delegates content switching to global app.js)
        ========================================
    */
    navLinks.forEach(link => {
        link.addEventListener('click', (event) => {
            event.preventDefault();

            navLinks.forEach(nav => nav.classList.remove('active-sidebar'));
            link.classList.add('active-sidebar');

            const targetContentId = link.dataset.contentTarget;
            if (window.switchContent) { // Call the global content switching function
                window.switchContent(targetContentId);
            } else {
                console.error("Global 'switchContent' function not found in app.js.");
            }
        });
    });
});