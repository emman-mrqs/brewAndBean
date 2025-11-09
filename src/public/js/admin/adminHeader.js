// Shared admin header JS: hamburger and avatar sidebar toggle with accessibility
(function(){
    if (window.__adminHeaderInitialized) return;
    window.__adminHeaderInitialized = true;

    document.addEventListener('DOMContentLoaded', function() {
        const sidebar = document.getElementById('sidebar') || document.querySelector('.sidebar');
        const sidebarOverlay = document.getElementById('sidebarOverlay') || document.querySelector('.sidebar-overlay');
        const toggleBtn = document.getElementById('sidebarToggle') || document.querySelector('.sidebar-toggle');

        if (!sidebar || !sidebarOverlay) return;

        const openSidebar = () => {
            sidebar.classList.add('active');
            sidebarOverlay.classList.add('active');
            sidebar.setAttribute('aria-hidden', 'false');
            if (toggleBtn) toggleBtn.setAttribute('aria-expanded', 'true');
            syncSidebarState();
        };

        const closeSidebar = () => {
            sidebar.classList.remove('active');
            sidebarOverlay.classList.remove('active');
            sidebar.setAttribute('aria-hidden', 'true');
            if (toggleBtn) toggleBtn.setAttribute('aria-expanded', 'false');
            syncSidebarState();
            
            // Extra cleanup: ensure body overflow is restored if no modal is open
            setTimeout(() => {
                const hasModalOpen = document.querySelector('.modal.show') || document.body.classList.contains('modal-open');
                if (!hasModalOpen) {
                    document.body.style.overflow = '';
                    document.body.style.paddingRight = '';
                }
            }, 50);
        };

        // Keep body scroll locked only when sidebar is open on small screens,
        // and ensure overlay visibility stays in sync with the sidebar state.
        function syncSidebarState(){
            const isMobile = window.innerWidth <= 1024;
            const isActive = sidebar.classList.contains('active');
            // overlay should only be interactive on mobile when sidebar is active
            if (isMobile && isActive) {
                sidebarOverlay.classList.add('active');
                // Only lock body scroll if no modal is currently open
                const hasModalOpen = document.querySelector('.modal.show') || document.body.classList.contains('modal-open');
                if (!hasModalOpen) {
                    try{ document.body.style.overflow = 'hidden'; }catch(e){}
                }
            } else {
                sidebarOverlay.classList.remove('active');
                // Only restore scroll if no modal is currently open
                const hasModalOpen = document.querySelector('.modal.show') || document.body.classList.contains('modal-open');
                if (!hasModalOpen) {
                    try{ document.body.style.overflow = ''; }catch(e){}
                }
            }
        }

        const toggleSidebar = () => {
            if (sidebar.classList.contains('active')) closeSidebar();
            else openSidebar();
        };

        // Click handlers - only use toggle button, not user avatar
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
            // keep overlay/body consistent after resize
            syncSidebarState();
        });

        // run initial sync to ensure overlay/body are correct on load
        syncSidebarState();

        // Initialize ARIA
        sidebar.setAttribute('role', 'navigation');
        sidebar.setAttribute('aria-hidden', sidebar.classList.contains('active') ? 'false' : 'true');
        if (toggleBtn) toggleBtn.setAttribute('aria-expanded', 'false');

        // Listen for modal events to ensure sidebar and modals don't conflict
        document.addEventListener('show.bs.modal', function() {
            // Close sidebar when a modal opens
            if (sidebar.classList.contains('active')) {
                closeSidebar();
            }
        });

        // Ensure body overflow is properly managed when modals close
        document.addEventListener('hidden.bs.modal', function() {
            setTimeout(() => {
                // If sidebar is not active and no other modal is open, restore scroll
                const hasModalOpen = document.querySelector('.modal.show');
                const sidebarActive = sidebar.classList.contains('active');
                if (!hasModalOpen && !sidebarActive) {
                    document.body.style.overflow = '';
                    document.body.style.paddingRight = '';
                    document.body.classList.remove('modal-open');
                }
            }, 100);
        });
    });
})();
