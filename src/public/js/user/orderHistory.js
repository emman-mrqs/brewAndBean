// User Order History JavaScript

// Fetch and display order history
async function loadOrderHistory() {
    const loadingSpinner = document.getElementById('loadingSpinner');
    const emptyState = document.getElementById('emptyState');
    const ordersTable = document.getElementById('ordersTable');
    const ordersTableBody = document.getElementById('ordersTableBody');

    try {
        const response = await fetch('/api/orders/history');
        const data = await response.json();

        // Hide loading spinner
        loadingSpinner.style.display = 'none';

        if (!data.success) {
            throw new Error(data.message || 'Failed to load order history');
        }

        if (data.orders.length === 0) {
            // Show empty state
            emptyState.style.display = 'block';
            return;
        }

        // Display orders
        ordersTable.style.display = 'table';
        ordersTableBody.innerHTML = data.orders.map(order => {
            const orderDate = new Date(order.created_at);
            const formattedDate = orderDate.toLocaleDateString('en-US', {
                month: 'short',
                day: 'numeric',
                year: 'numeric',
                hour: 'numeric',
                minute: '2-digit'
            });

            // Format order status badge
            const statusBadge = getStatusBadge(order.order_status);
            const paymentBadge = getPaymentBadge(order.payment_status);

            // Keep items short for table view but full value goes in title attribute
            const itemsText = (order.items || 'N/A').replace(/"/g, '&quot;');

            return `
                <tr>
                    <td><strong>#${order.id}</strong></td>
                    <td>${formattedDate}</td>
                    <td style="max-width: 250px; overflow: hidden; text-overflow: ellipsis; white-space: nowrap;" title="${itemsText}">
                        ${itemsText}
                    </td>
                    <td>${order.branch_name || 'N/A'}${order.branch_city ? ', ' + order.branch_city : ''}</td>
                    <td><strong>₱${parseFloat(order.total_amount).toFixed(2)}</strong></td>
                    <td>${statusBadge}</td>
                    <td>${paymentBadge}</td>
                </tr>
            `;
        }).join('');

        // *** IMPORTANT: add data-label attributes so responsive CSS can show header labels in card view
        addDataLabelsToTable();

    } catch (error) {
        console.error('Error loading order history:', error);
        loadingSpinner.style.display = 'none';
        emptyState.innerHTML = `
            <i class="fas fa-exclamation-triangle" style="font-size: 3rem; color: #F44336;"></i>
            <p style="margin-top: 1rem; color: #666;">Failed to load order history</p>
            <p style="color: #999; font-size: 0.9rem;">${error.message}</p>
            <button onclick="loadOrderHistory()" class="btn-primary-small" style="margin-top: 1rem;">
                <i class="fas fa-sync"></i> Retry
            </button>
        `;
        emptyState.style.display = 'block';
    }
}

// Get status badge HTML
function getStatusBadge(status) {
    const statusClasses = {
        'completed': 'badge-success',
        'cancelled': 'badge-danger',
        'pending': 'badge-warning',
        'processing': 'badge-info',
        'confirmed': 'badge-info'
    };

    const statusIcons = {
        'completed': 'check-circle',
        'cancelled': 'times-circle',
        'pending': 'clock',
        'processing': 'spinner',
        'confirmed': 'check'
    };

    const statusText = status ? (status.charAt(0).toUpperCase() + status.slice(1)) : 'N/A';
    const badgeClass = statusClasses[status] || 'badge-secondary';
    const icon = statusIcons[status] || 'info-circle';

    return `<span class="badge ${badgeClass}"><i class="fas fa-${icon}"></i> ${statusText}</span>`;
}

// Get payment status badge HTML
function getPaymentBadge(paymentStatus) {
    const paymentClasses = {
        'completed': 'badge-success',
        'pending': 'badge-warning',
        'failed': 'badge-danger',
        'refunded': 'badge-info'
    };

    const paymentText = paymentStatus ? (paymentStatus.charAt(0).toUpperCase() + paymentStatus.slice(1)) : 'N/A';
    const badgeClass = paymentClasses[paymentStatus] || 'badge-secondary';

    return `<span class="badge ${badgeClass}">${paymentText}</span>`;
}

/* ------------------ ADD DATA-LABELS HELPER ------------------
   This adds data-label="Header Name" to each <td> based on the table <thead> order.
   Necessary for the responsive card CSS (td::before { content: attr(data-label) }).
*/
function addDataLabelsToTable() {
    const table = document.getElementById('ordersTable');
    if (!table) return;

    // Get header names
    const headers = Array.from(table.querySelectorAll('thead th')).map(th => th.innerText.trim());

    // Apply to each row's cells
    table.querySelectorAll('tbody tr').forEach(tr => {
        const cells = Array.from(tr.querySelectorAll('td'));
        cells.forEach((td, idx) => {
            if (headers[idx] && !td.hasAttribute('data-label')) {
                td.setAttribute('data-label', headers[idx]);
            }
        });
    });
}
/* ------------------ END HELPER ------------------ */

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

    // If the table was rendered server-side, ensure data-labels exist immediately
    addDataLabelsToTable();

    // Then load dynamic rows (if any)
    loadOrderHistory();
});
