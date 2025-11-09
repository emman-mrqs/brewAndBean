// Shared Logout Utility
// This file provides a consistent logout function for all pages

// Main logout function that properly handles session destruction
function logout() {
    if (confirm('Are you sure you want to logout?')) {
        // Show loading state on logout button
        const logoutBtn = document.querySelector('.btn-logout');
        if (logoutBtn) {
            logoutBtn.disabled = true;
            logoutBtn.innerHTML = '<i class="fas fa-spinner fa-spin"></i> Signing Out...';
        }
        
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
        
        // Hide the form and submit
        form.style.display = 'none';
        document.body.appendChild(form);
        form.submit();
    }
}

// Alternative logout function using fetch API (more modern approach)
async function logoutAsync() {
    if (confirm('Are you sure you want to logout?')) {
        try {
            // Show loading state
            const logoutBtn = document.querySelector('.btn-logout');
            if (logoutBtn) {
                logoutBtn.disabled = true;
                logoutBtn.innerHTML = '<i class="fas fa-spinner fa-spin"></i> Signing Out...';
            }
            
            const response = await fetch('/logout', {
                method: 'POST',
                headers: {
                    'Content-Type': 'application/json',
                },
                credentials: 'same-origin'
            });
            
            if (response.ok) {
                // Successful logout - redirect to login page
                window.location.href = '/login?message=Successfully logged out';
            } else {
                // Handle error
                console.error('Logout failed:', response.statusText);
                alert('Logout failed. Please try again.');
                
                // Reset button state
                if (logoutBtn) {
                    logoutBtn.disabled = false;
                    logoutBtn.innerHTML = '<i class="fas fa-sign-out-alt"></i> Logout';
                }
            }
        } catch (error) {
            console.error('Logout error:', error);
            alert('An error occurred during logout. Please try again.');
            
            // Reset button state
            const logoutBtn = document.querySelector('.btn-logout');
            if (logoutBtn) {
                logoutBtn.disabled = false;
                logoutBtn.innerHTML = '<i class="fas fa-sign-out-alt"></i> Logout';
            }
        }
    }
}

// Quick logout without confirmation (for admin or forced logout)
function quickLogout() {
    window.location.href = '/logout';
}

// Initialize logout functionality when DOM is loaded
document.addEventListener('DOMContentLoaded', function() {
    // Add logout event listener to logout buttons
    const logoutButtons = document.querySelectorAll('.btn-logout, [data-logout]');
    logoutButtons.forEach(button => {
        button.addEventListener('click', function(e) {
            e.preventDefault();
            logout();
        });
    });
});

// Make logout function globally available
window.logout = logout;
window.logoutAsync = logoutAsync;
window.quickLogout = quickLogout;
