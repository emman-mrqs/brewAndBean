// Shared admin header JS: hamburger and avatar sidebar toggle with accessibility
(function(){
    if (window.__adminHeaderInitialized) return;
    window.__adminHeaderInitialized = true;

    document.addEventListener('DOMContentLoaded', function() {
        const sidebar = document.getElementById('sidebar') || document.querySelector('.sidebar');
        const sidebarOverlay = document.getElementById('sidebarOverlay') || document.querySelector('.sidebar-overlay');
        const userAvatar = document.querySelector('.user-avatar');
        const toggleBtn = document.getElementById('sidebarToggle') || document.querySelector('.sidebar-toggle');

        if (!sidebar || !sidebarOverlay) return;

        const openSidebar = () => {
            sidebar.classList.add('active');
            sidebarOverlay.classList.add('active');
            sidebar.setAttribute('aria-hidden', 'false');
            if (toggleBtn) toggleBtn.setAttribute('aria-expanded', 'true');
        };

        const closeSidebar = () => {
            sidebar.classList.remove('active');
            sidebarOverlay.classList.remove('active');
            sidebar.setAttribute('aria-hidden', 'true');
            if (toggleBtn) toggleBtn.setAttribute('aria-expanded', 'false');
        };

        const toggleSidebar = () => {
            if (sidebar.classList.contains('active')) closeSidebar();
            else openSidebar();
        };

        // Click handlers
        if (userAvatar) userAvatar.addEventListener('click', toggleSidebar);
        if (toggleBtn) toggleBtn.addEventListener('click', toggleSidebar);

        sidebarOverlay.addEventListener('click', closeSidebar);

        // Close sidebar when clicking a link on mobile
        document.addEventListener('click', function(e){
            const link = e.target.closest && e.target.closest('.sidebar-menu a');
            if (link && window.innerWidth <= 1024) closeSidebar();
        });

        // Keyboard support: Esc to close
        document.addEventListener('keydown', function(e){
            if (e.key === 'Escape' && sidebar.classList.contains('active')) {
                closeSidebar();
            }
        });

        // Ensure correct state on resize
        window.addEventListener('resize', function(){
            if (window.innerWidth > 1024) {
                // ensure sidebar visible on desktop by removing mobile active state
                sidebar.classList.remove('active');
                sidebarOverlay.classList.remove('active');
                sidebar.setAttribute('aria-hidden', 'false');
                if (toggleBtn) toggleBtn.setAttribute('aria-expanded', 'false');
            } else {
                // on small screens assume closed by default
                sidebar.setAttribute('aria-hidden', sidebar.classList.contains('active') ? 'false' : 'true');
            }
        });

        // Initialize ARIA
        sidebar.setAttribute('role', 'navigation');
        sidebar.setAttribute('aria-hidden', sidebar.classList.contains('active') ? 'false' : 'true');
        if (toggleBtn) toggleBtn.setAttribute('aria-expanded', 'false');
    });
})();
