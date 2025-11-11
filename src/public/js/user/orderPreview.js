// Order Preview JavaScript - Display current orders

// Variables for modal
let cancelModal;
let orderToCancel = null;

// Load current orders
async function loadCurrentOrders() {
    const loadingSpinner = document.getElementById('loadingSpinner');
    const emptyState = document.getElementById('emptyState');
    const ordersContainer = document.getElementById('ordersContainer');

    try {
        const response = await fetch('/api/orders/current');
        const data = await response.json();

        // Hide loading spinner
        loadingSpinner.style.display = 'none';

        if (!data.success) {
            throw new Error(data.message || 'Failed to load orders');
        }

        if (data.orders.length === 0) {
            // Show empty state
            emptyState.style.display = 'block';
            return;
        }

        // Display orders
        ordersContainer.style.display = 'grid';
        ordersContainer.innerHTML = data.orders.map(order => createOrderCard(order)).join('');

        // Attach cancel event listeners
        attachCancelListeners();

    } catch (error) {
        console.error('Error loading current orders:', error);
        loadingSpinner.style.display = 'none';
        emptyState.innerHTML = `
            <i class="fas fa-exclamation-triangle" style="font-size: 3rem; color: #F44336;"></i>
            <h3 style="margin-top: 1.5rem; color: #666;">Failed to Load Orders</h3>
            <p style="color: #999; margin-top: 0.5rem;">${error.message}</p>
            <button onclick="loadCurrentOrders()" class="btn-primary" style="margin-top: 1.5rem; padding: 0.75rem 2rem; background: #C67C4E; color: white; border: none; border-radius: 8px; cursor: pointer;">
                <i class="fas fa-sync"></i> Retry
            </button>
        `;
        emptyState.style.display = 'block';
    }
}

// Create order card HTML
function createOrderCard(order) {
    const orderDate = new Date(order.created_at);
    const formattedDate = orderDate.toLocaleDateString('en-US', {
        month: 'short',
        day: 'numeric',
        year: 'numeric',
        hour: 'numeric',
        minute: '2-digit'
    });

    const statusBadge = getStatusBadge(order.order_status);
    const paymentBadge = getPaymentBadge(order.payment_status);
    const canCancel = ['pending', 'confirmed'].includes(order.order_status);

    const items = order.items || [];
    const itemsHTML = items.map(item => `
        <div class="order-product">
            <img src="${item.img_url || '/uploads/products/default.jpg'}" 
                 alt="${item.product_name}" 
                 class="product-image"
                 onerror="this.src='/uploads/products/default.jpg'">
            <div class="product-details">
                <h4>${item.product_name}</h4>
                <p>${item.variant_name} - Qty: ${item.quantity}</p>
                <span class="product-price">₱${parseFloat(item.unit_price).toFixed(2)} each</span>
            </div>
            <div class="product-total">
                <strong>₱${parseFloat(item.total_price).toFixed(2)}</strong>
            </div>
        </div>
    `).join('');

    return `
        <section class="card order-card">
            <div class="card-header">
                <div>
                    <h2 class="card-title">
                        <i class="fas fa-receipt"></i> Order #${order.id}
                    </h2>
                    <p class="order-date"><i class="fas fa-calendar"></i> ${formattedDate}</p>
                </div>
                <div style="text-align: right;">
                    ${statusBadge}
                    ${paymentBadge}
                </div>
            </div>
            <div class="card-body">
                <div class="order-info-grid">
                    <div class="info-item">
                        <i class="fas fa-map-marker-alt"></i>
                        <div>
                            <label>Branch</label>
                            <p>${order.branch_name || 'N/A'}</p>
                            <small>${order.branch_street || ''}, ${order.branch_city || ''}</small>
                        </div>
                    </div>
                    <div class="info-item">
                        <i class="fas fa-credit-card"></i>
                        <div>
                            <label>Payment Method</label>
                            <p>${formatPaymentMethod(order.payment_method)}</p>
                        </div>
                    </div>
                </div>

                ${order.notes ? `
                <div class="order-notes">
                    <i class="fas fa-sticky-note"></i>
                    <div>
                        <label>Notes</label>
                        <p>${order.notes}</p>
                    </div>
                </div>
                ` : ''}

                <div class="order-items-section">
                    <h3><i class="fas fa-shopping-bag"></i> Order Items</h3>
                    <div class="order-items-list">
                        ${itemsHTML}
                    </div>
                </div>

                <div class="order-footer">
                    <div class="order-total-section">
                        <span>Total Amount:</span>
                        <span class="order-total">₱${parseFloat(order.total_amount).toFixed(2)}</span>
                    </div>
                    ${canCancel ? `
                    <button class="btn-cancel" data-order-id="${order.id}">
                        <i class="fas fa-times-circle"></i> Cancel Order
                    </button>
                    ` : `
                    <div class="cancel-disabled-note">
                        <i class="fas fa-info-circle"></i>
                        <small>Order cannot be cancelled (Status: ${order.order_status})</small>
                    </div>
                    `}
                </div>
            </div>
        </section>
    `;
}

// Get status badge HTML
function getStatusBadge(status) {
    const statusConfig = {
        'pending': { class: 'badge-warning', icon: 'clock', text: 'Pending' },
        'confirmed': { class: 'badge-info', icon: 'check', text: 'Confirmed' },
        'processing': { class: 'badge-info', icon: 'cog fa-spin', text: 'Processing' },
        'ready': { class: 'badge-success', icon: 'check-circle', text: 'Ready' },
        'preparing': { class: 'badge-info', icon: 'utensils', text: 'Preparing' }
    };

    const config = statusConfig[status] || { class: 'badge-secondary', icon: 'info-circle', text: status };
    
    return `<span class="badge ${config.class}"><i class="fas fa-${config.icon}"></i> ${config.text}</span>`;
}

// Get payment status badge HTML
function getPaymentBadge(paymentStatus) {
    const paymentConfig = {
        'completed': { class: 'badge-success', text: 'Paid' },
        'pending': { class: 'badge-warning', text: 'Pending Payment' },
        'failed': { class: 'badge-danger', text: 'Payment Failed' }
    };

    const config = paymentConfig[paymentStatus] || { class: 'badge-secondary', text: paymentStatus || 'N/A' };
    
    return `<span class="badge ${config.class}">${config.text}</span>`;
}

// Format payment method
function formatPaymentMethod(method) {
    const methods = {
        'cash': 'Cash on Pickup',
        'cash_on_pickup': 'Cash on Pickup',
        'gcash': 'GCash',
        'paypal': 'PayPal',
        'card': 'Credit/Debit Card'
    };
    return methods[method] || method || 'N/A';
}

// Attach cancel button event listeners
function attachCancelListeners() {
    const cancelButtons = document.querySelectorAll('.btn-cancel');
    cancelButtons.forEach(button => {
        button.addEventListener('click', function() {
            const orderId = this.getAttribute('data-order-id');
            showCancelConfirmation(orderId);
        });
    });
}

// Show cancel confirmation modal
function showCancelConfirmation(orderId) {
    orderToCancel = orderId;
    
    // Initialize and show modal
    const modalElement = document.getElementById('cancelOrderModal');
    cancelModal = new bootstrap.Modal(modalElement);
    cancelModal.show();
}

// Confirm and cancel order
async function confirmCancelOrder() {
    if (!orderToCancel) return;

    const confirmBtn = document.getElementById('confirmCancelBtn');
    const originalText = confirmBtn.innerHTML;
    confirmBtn.disabled = true;
    confirmBtn.innerHTML = '<i class="fas fa-spinner fa-spin"></i> Cancelling...';

    try {
        const response = await fetch(`/api/orders/${orderToCancel}/cancel`, {
            method: 'POST',
            headers: {
                'Content-Type': 'application/json'
            }
        });

        const data = await response.json();

        if (!data.success) {
            throw new Error(data.message || 'Failed to cancel order');
        }

        // Hide modal
        cancelModal.hide();
        
        // Reset button state
        confirmBtn.disabled = false;
        confirmBtn.innerHTML = originalText;
        
        // Show success toast
        showToast('success', 'Order cancelled successfully!');
        
        // Reload orders after a short delay
        setTimeout(() => {
            loadCurrentOrders();
            orderToCancel = null;
        }, 500);

    } catch (error) {
        console.error('Error cancelling order:', error);
        
        // Show error toast
        showToast('error', `Failed to cancel order: ${error.message}`);
        
        // Reset button state
        confirmBtn.disabled = false;
        confirmBtn.innerHTML = originalText;
        
        // Don't reset orderToCancel on error, user might want to retry
    }
}

// Show toast notification
function showToast(type, message) {
    const toastElement = document.getElementById('orderToast');
    const toastBody = toastElement.querySelector('.toast-body');
    const toastIcon = toastElement.querySelector('.toast-icon');
    const toastMessage = toastElement.querySelector('.toast-message');
    
    // Reset classes
    toastElement.className = 'toast align-items-center border-0';
    
    // Set type-specific styling
    if (type === 'success') {
        toastElement.classList.add('text-bg-success');
        toastIcon.className = 'toast-icon fas fa-check-circle me-2';
    } else if (type === 'error') {
        toastElement.classList.add('text-bg-danger');
        toastIcon.className = 'toast-icon fas fa-exclamation-circle me-2';
    } else if (type === 'warning') {
        toastElement.classList.add('text-bg-warning');
        toastIcon.className = 'toast-icon fas fa-exclamation-triangle me-2';
    } else {
        toastElement.classList.add('text-bg-info');
        toastIcon.className = 'toast-icon fas fa-info-circle me-2';
    }
    
    // Set message
    toastMessage.textContent = message;
    
    // Show toast
    const toast = new bootstrap.Toast(toastElement, {
        autohide: true,
        delay: 4000
    });
    toast.show();
}

// Initialize when DOM is loaded
document.addEventListener('DOMContentLoaded', function() {
    loadCurrentOrders();
    
    // Attach confirm cancel button event
    const confirmCancelBtn = document.getElementById('confirmCancelBtn');
    if (confirmCancelBtn) {
        confirmCancelBtn.addEventListener('click', confirmCancelOrder);
    }
});