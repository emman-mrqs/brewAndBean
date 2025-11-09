// User Dashboard JavaScript
// Dynamic Greeting
function updateGreeting() {
    const hour = new Date().getHours();
    const greetingElement = document.getElementById('greetingText');
    const userName = 'Luis';
    
    let greeting;
    if (hour < 12) {
        greeting = `Good Morning, ${userName}!`;
    } else if (hour < 18) {
        greeting = `Good Afternoon, ${userName}!`;
    } else {
        greeting = `Good Evening, ${userName}!`;
    }
    
    if (greetingElement) {
        greetingElement.textContent = greeting;
    }
}

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
        // Create a form to submit POST request to logout endpoint
        const form = document.createElement('form');
        form.method = 'POST';
        form.action = '/logout';
        
        // Add CSRF token if available
        const csrfToken = document.querySelector('meta[name="csrf-token"]');
        if (csrfToken) {
            const csrfInput = document.createElement('input');
            csrfInput.type = 'hidden';
            csrfInput.name = '_csrf';
            csrfInput.value = csrfToken.getAttribute('content');
            form.appendChild(csrfInput);
        }
        
        document.body.appendChild(form);
        form.submit();
    }
}

// Initialize when DOM is loaded
document.addEventListener('DOMContentLoaded', function() {
    updateGreeting();
    initMobileMenu();
    setInterval(updateGreeting, 60000);
});