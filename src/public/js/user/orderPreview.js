// User Order Preview JavaScript
// Mobile Menu Toggle
function initMobileMenu() {
    const menuToggle = document.getElementById('mobileMenuToggle');
    const sidebar = document.getElementById('sidebar');
    const mainContent = document.querySelector('.main-content');

    if (menuToggle && sidebar) {
        menuToggle.addEventListener('click', function() {
            sidebar.classList.toggle('open');
        });

        // Close sidebar when clicking outside on mobile
        if (mainContent) {
            mainContent.addEventListener('click', function() {
                if (sidebar.classList.contains('open')) {
                    sidebar.classList.remove('open');
                }
            });
        }
    }
}

// Logout
function logout() {
    if (confirm('Are you sure you want to logout?')) {
        window.location.href = '/login';
    }
}

// Initialize when DOM is loaded
document.addEventListener('DOMContentLoaded', function() {
    initMobileMenu();
});