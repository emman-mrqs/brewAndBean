// User Dashboard JavaScript

// Initialize dashboard on page load
document.addEventListener('DOMContentLoaded', () => {
    loadDashboardData();
    initMobileMenu();
});

// Load all dashboard data
async function loadDashboardData() {
    try {
        await Promise.all([
            loadUserStats(),
            loadRecentOrders(),
            loadCartPreview()
        ]);
    } catch (error) {
        console.error('Error loading dashboard data:', error);
    }
}

// Load user statistics
async function loadUserStats() {
    try {
        const response = await fetch('/api/dashboard/stats');
        const data = await response.json();

        if (data.success) {
            const stats = data.stats;
            
            // Update stat cards
            document.getElementById('totalOrders').textContent = stats.totalOrders.toLocaleString();
            document.getElementById('cartItems').textContent = stats.cartItems.toLocaleString();
            document.getElementById('totalSpent').textContent = `₱${stats.totalSpent.toLocaleString('en-PH', { minimumFractionDigits: 2, maximumFractionDigits: 2 })}`;
            document.getElementById('pendingOrders').textContent = stats.pendingOrders.toLocaleString();
        }
    } catch (error) {
        console.error('Error loading user stats:', error);
    }
}

// Load recent orders
async function loadRecentOrders() {
    try {
        const response = await fetch('/api/dashboard/recent-orders');
        const data = await response.json();

        if (data.success && data.orders.length > 0) {
            const ordersList = document.getElementById('recentOrdersList');
            ordersList.innerHTML = data.orders.map(order => `
                <div class="order-item">
                    <div class="order-header">
                        <span class="order-id">Order #${order.id}</span>
                        <span class="order-status ${getStatusClass(order.order_status)}">${formatStatus(order.order_status)}</span>
                    </div>
                    <div class="order-details">
                        <span class="order-date">${formatDate(order.created_at)}</span>
                        <span class="order-amount">₱${parseFloat(order.total_amount).toLocaleString('en-PH', { minimumFractionDigits: 2 })}</span>
                    </div>
                </div>
            `).join('');
        }
    } catch (error) {
        console.error('Error loading recent orders:', error);
    }
}

// Load cart preview
async function loadCartPreview() {
    try {
        const response = await fetch('/api/dashboard/cart-preview');
        const data = await response.json();

        if (data.success && data.cartItems.length > 0) {
            const cartPreview = document.getElementById('cartPreview');
            cartPreview.innerHTML = `
                ${data.cartItems.map(item => `
                    <div class="cart-item">
                        <img src="${item.img_url || '/images/default-product.png'}" alt="${item.product_name}" class="cart-item-image">
                        <div class="cart-item-info">
                            <h4 class="cart-item-name">${item.product_name}</h4>
                            <p class="cart-item-variant">${item.variant_name} × ${item.quantity}</p>
                        </div>
                        <div class="cart-item-price">₱${parseFloat(item.item_total).toLocaleString('en-PH', { minimumFractionDigits: 2 })}</div>
                    </div>
                `).join('')}
                <div class="cart-total">
                    <span>Total:</span>
                    <span>₱${data.cartTotal.toLocaleString('en-PH', { minimumFractionDigits: 2, maximumFractionDigits: 2 })}</span>
                </div>
                <a href="/cart" class="btn-primary-small" style="width: 100%; margin-top: 1rem; text-align: center;">View Full Cart</a>
            `;
        }
    } catch (error) {
        console.error('Error loading cart preview:', error);
    }
}

// Helper function to get status CSS class
function getStatusClass(status) {
    const statusMap = {
        'pending': 'pending',
        'processing': 'pending',
        'preparing': 'pending',
        'completed': 'completed',
        'cancelled': 'cancelled',
        'failed': 'cancelled'
    };
    return statusMap[status] || 'pending';
}

// Helper function to format status text
function formatStatus(status) {
    return status.charAt(0).toUpperCase() + status.slice(1);
}

// Helper function to format date
function formatDate(dateString) {
    const date = new Date(dateString);
    const now = new Date();
    const diff = now - date;
    const days = Math.floor(diff / (1000 * 60 * 60 * 24));

    if (days === 0) {
        const hours = Math.floor(diff / (1000 * 60 * 60));
        if (hours === 0) {
            const minutes = Math.floor(diff / (1000 * 60));
            return `${minutes} ${minutes === 1 ? 'minute' : 'minutes'} ago`;
        }
        return `${hours} ${hours === 1 ? 'hour' : 'hours'} ago`;
    } else if (days === 1) {
        return 'Yesterday';
    } else if (days < 7) {
        return `${days} days ago`;
    } else {
        return date.toLocaleDateString('en-US', { month: 'short', day: 'numeric', year: 'numeric' });
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