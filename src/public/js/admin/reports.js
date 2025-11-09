// Admin Reports JavaScript

// Mobile sidebar toggle
document.addEventListener('DOMContentLoaded', function() {
    const sidebar = document.getElementById('sidebar');
    const sidebarOverlay = document.getElementById('sidebarOverlay');
    const userAvatar = document.querySelector('.user-avatar');
    
    if (userAvatar && sidebar && sidebarOverlay) {
        userAvatar.addEventListener('click', () => {
            sidebar.classList.toggle('active');
            sidebarOverlay.classList.toggle('active');
        });
        
        sidebarOverlay.addEventListener('click', () => {
            sidebar.classList.remove('active');
            sidebarOverlay.classList.remove('active');
        });

        // Close sidebar when clicking a link on mobile
        const sidebarLinks = document.querySelectorAll('.sidebar-menu a');
        sidebarLinks.forEach(link => {
            link.addEventListener('click', () => {
                if (window.innerWidth <= 1024) {
                    sidebar.classList.remove('active');
                    sidebarOverlay.classList.remove('active');
                }
            });
        });
    }
});