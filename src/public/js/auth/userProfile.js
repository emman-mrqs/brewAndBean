// User Profile Functions for Dashboard Sidebar
document.addEventListener('DOMContentLoaded', function() {
    // Load user statistics when page loads
    loadUserStats();
    
    // Update profile info if needed
    updateProfileDisplay();
});

async function loadUserStats() {
    try {
        // For now, we'll use placeholder data
        // Later you can replace this with an API call to get real user statistics
        
        const userOrdersElement = document.getElementById('user-orders');
        const userPointsElement = document.getElementById('user-points');
        
        if (userOrdersElement && userPointsElement) {
            // Animate counting effect
            animateCountUp(userOrdersElement, 0, 0, 1000); // Will be replaced with real data
            animateCountUp(userPointsElement, 0, 0, 1000); // Will be replaced with real data
            
            // If you want to fetch real data later, uncomment and modify this:
            /*
            const response = await fetch('/api/user/stats');
            if (response.ok) {
                const stats = await response.json();
                animateCountUp(userOrdersElement, 0, stats.totalOrders, 1000);
                animateCountUp(userPointsElement, 0, stats.totalPoints, 1000);
            }
            */
        }
    } catch (error) {
        console.log('Error loading user stats:', error);
    }
}

function animateCountUp(element, start, end, duration) {
    const startTimestamp = performance.now();
    
    function updateCount(timestamp) {
        const elapsed = timestamp - startTimestamp;
        const progress = Math.min(elapsed / duration, 1);
        
        // Easing function for smooth animation
        const easeOutQuart = 1 - Math.pow(1 - progress, 4);
        const current = Math.floor(start + (end - start) * easeOutQuart);
        
        element.textContent = current.toLocaleString();
        
        if (progress < 1) {
            requestAnimationFrame(updateCount);
        } else {
            element.textContent = end.toLocaleString();
        }
    }
    
    requestAnimationFrame(updateCount);
}

function updateProfileDisplay() {
    // Add any additional profile display logic here
    const profileAvatar = document.querySelector('.profile-avatar img');
    
    // Add error handling for avatar images
    if (profileAvatar) {
        profileAvatar.onerror = function() {
            this.src = 'https://ui-avatars.com/api/?name=User&background=C67C4E&color=fff&size=80';
        };
    }
    
    // Add profile interaction effects
    const profileSection = document.querySelector('.sidebar-profile');
    if (profileSection) {
        profileSection.addEventListener('mouseenter', function() {
            this.style.transform = 'translateY(-2px)';
            this.style.transition = 'transform 0.3s ease';
        });
        
        profileSection.addEventListener('mouseleave', function() {
            this.style.transform = 'translateY(0)';
        });
    }
}

// Function to update user stats (can be called from other pages)
function updateUserStats(orders, points) {
    const userOrdersElement = document.getElementById('user-orders');
    const userPointsElement = document.getElementById('user-points');
    
    if (userOrdersElement) {
        animateCountUp(userOrdersElement, parseInt(userOrdersElement.textContent) || 0, orders, 500);
    }
    
    if (userPointsElement) {
        animateCountUp(userPointsElement, parseInt(userPointsElement.textContent) || 0, points, 500);
    }
}

// Function to refresh profile data
async function refreshProfileData() {
    try {
        // This would call your backend API to get updated user stats
        // const response = await fetch('/api/user/profile');
        // const userData = await response.json();
        // updateUserStats(userData.orders, userData.points);
        
        console.log('Profile data refresh requested');
    } catch (error) {
        console.log('Error refreshing profile data:', error);
    }
}

// Logout function for sidebar
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

// Export functions for use in other scripts
window.userProfile = {
    loadUserStats,
    updateUserStats,
    refreshProfileData,
    logout
};
