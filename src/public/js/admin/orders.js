// Admin Orders Management - JavaScript
(function() {
    'use strict';

    // Configuration
    const API_BASE = '/admin/api/orders';
    const PAGE_SIZE = 10;

    // State
    let allOrders = [];
    let filteredOrders = [];
    let currentPage = 1;
    let searchTerm = '';
    let statusFilter = '';
    let currentOrder = null;

    // DOM Elements
    let elements = {};

    // Initialize
    document.addEventListener('DOMContentLoaded', init);

    function init() {
        console.log('🚀 Orders.js initializing...');
        cacheElements();
        attachEventListeners();
        loadOrders();
    }

    function cacheElements() {
        elements = {
            searchInput: document.getElementById('orderSearch'),
            statusFilter: document.getElementById('statusFilter'),
            tableBody: document.getElementById('ordersTableBody'),
            pagination: document.getElementById('ordersPagination'),
            editStatusModal: document.getElementById('editStatusModal'),
            editOrderId: document.getElementById('editOrderId'),
            editOrderIdDisplay: document.getElementById('editOrderIdDisplay'),
            editCustomerName: document.getElementById('editCustomerName'),
            editOrderStatus: document.getElementById('editOrderStatus'),
            editOrderNotes: document.getElementById('editOrderNotes'),
            saveStatusBtn: document.getElementById('saveStatusBtn'),
            viewInvoiceModal: document.getElementById('viewInvoiceModal'),
            invoiceContent: document.getElementById('invoiceContent'),
            toastContainer: document.getElementById('toastContainer')
        };
        
        // Debug: Check which elements are missing
        console.log('[Orders] Element check:');
        Object.keys(elements).forEach(key => {
            if (!elements[key]) {
                console.error(`[Orders] Missing element: ${key}`);
            } else {
                console.log(`[Orders] ✓ Found: ${key}`);
            }
        });
    }

    function attachEventListeners() {
        // Search
        if (elements.searchInput) {
            elements.searchInput.addEventListener('input', debounce(handleSearch, 300));
        }

        // Status filter
        if (elements.statusFilter) {
            elements.statusFilter.addEventListener('change', handleStatusFilter);
        }

        // Save status button
        if (elements.saveStatusBtn) {
            elements.saveStatusBtn.addEventListener('click', handleSaveStatus);
        }

        // Table event delegation
        if (elements.tableBody) {
            elements.tableBody.addEventListener('click', handleTableAction);
        }
    }

    // API Functions
    async function loadOrders() {
        try {
            console.log('[Orders] Fetching orders from:', API_BASE);
            const response = await fetch(API_BASE, {
                credentials: 'same-origin'
            });
            
            console.log('[Orders] Response status:', response.status);
            const data = await response.json();
            console.log('[Orders] Response data:', data);

            if (data.success) {
                allOrders = data.orders || [];
                console.log('[Orders] Loaded orders count:', allOrders.length);
                applyFiltersAndRender();
            } else {
                console.error('[Orders] Failed to load orders:', data.message);
                showToast('Failed to load orders', 'danger');
            }
        } catch (error) {
            console.error('[Orders] Error loading orders:', error);
            showToast('Error loading orders', 'danger');
        }
    }

    async function getOrderDetails(orderId) {
        try {
            const response = await fetch(`${API_BASE}/${orderId}`, {
                credentials: 'same-origin'
            });
            const data = await response.json();

            if (data.success) {
                return data.order;
            } else {
                showToast('Failed to load order details', 'danger');
                return null;
            }
        } catch (error) {
            console.error('Error loading order details:', error);
            showToast('Error loading order details', 'danger');
            return null;
        }
    }

    async function updateOrderStatus(orderId, orderStatus) {
        try {
            const response = await fetch(`${API_BASE}/${orderId}/status`, {
                method: 'PATCH',
                headers: {
                    'Content-Type': 'application/json'
                },
                credentials: 'same-origin',
                body: JSON.stringify({ order_status: orderStatus })
            });

            const data = await response.json();

            if (data.success) {
                showToast('Order status updated successfully', 'success');
                await loadOrders();
                return true;
            } else {
                showToast(data.message || 'Failed to update order status', 'danger');
                return false;
            }
        } catch (error) {
            console.error('Error updating order status:', error);
            showToast('Error updating order status', 'danger');
            return false;
        }
    }

    // Event Handlers
    function handleSearch(e) {
        searchTerm = e.target.value.toLowerCase();
        currentPage = 1;
        applyFiltersAndRender();
    }

    function handleStatusFilter(e) {
        statusFilter = e.target.value;
        currentPage = 1;
        applyFiltersAndRender();
    }

    function handleTableAction(e) {
        const viewBtn = e.target.closest('.btn-view');
        const editBtn = e.target.closest('.btn-edit');

        if (viewBtn) {
            const orderId = viewBtn.dataset.id;
            openInvoiceModal(orderId);
        } else if (editBtn) {
            const orderId = editBtn.dataset.id;
            const order = allOrders.find(o => String(o.id) === String(orderId));
            
            if (order) {
                // Check if button is disabled (order is finalized)
                if (editBtn.disabled) {
                    const statusCapitalized = order.order_status.charAt(0).toUpperCase() + order.order_status.slice(1);
                    showToast(`Cannot edit ${order.order_status} orders. This order is already ${statusCapitalized}.`, 'warning');
                    return;
                }
                
                // Double-check order status before opening modal
                if (order.order_status === 'completed' || order.order_status === 'cancelled') {
                    showToast(`Cannot edit ${order.order_status} orders`, 'warning');
                    return;
                }
                
                openEditStatusModal(order);
            }
        }
    }

    async function handleSaveStatus() {
        const orderId = elements.editOrderId.value;
        const orderStatus = elements.editOrderStatus.value;

        if (!orderId || !orderStatus) {
            showToast('Please fill all required fields', 'warning');
            return;
        }

        // Find the current order
        const order = allOrders.find(o => String(o.id) === String(orderId));
        if (!order) {
            showToast('Order not found', 'danger');
            return;
        }

        // Validation 1: Prevent changing completed or cancelled orders
        if (order.order_status === 'completed' || order.order_status === 'cancelled') {
            showToast(`Cannot change status of ${order.order_status} orders`, 'warning');
            return;
        }

        // Validation 2: Prevent PayPal orders from being set to pending
        if (order.payment_method?.toLowerCase() === 'paypal' && orderStatus === 'pending') {
            showToast('PayPal orders cannot be changed to pending status', 'warning');
            return;
        }

        // Validation 3: Confirm before cancelling
        if (orderStatus === 'cancelled') {
            const confirmed = await showConfirmation(
                'Cancel Order',
                'Are you sure you want to cancel this order? This action cannot be undone.',
                'Yes, Cancel Order',
                'btn-danger'
            );
            if (!confirmed) return;
        }

        // Validation 4: Confirm before completing
        if (orderStatus === 'completed') {
            const confirmed = await showConfirmation(
                'Complete Order',
                'Are you sure the customer has received this order? This action cannot be undone.',
                'Yes, Order Received',
                'btn-success'
            );
            if (!confirmed) return;
        }

        elements.saveStatusBtn.disabled = true;
        elements.saveStatusBtn.innerHTML = '<span class="spinner-border spinner-border-sm me-2"></span>Updating...';

        const success = await updateOrderStatus(orderId, orderStatus);

        if (success) {
            closeModal(elements.editStatusModal);
        }

        elements.saveStatusBtn.disabled = false;
        elements.saveStatusBtn.textContent = 'Update Status';
    }

    // Filter and Render
    function applyFiltersAndRender() {
        console.log('[Orders] Applying filters - Total orders:', allOrders.length);
        filteredOrders = allOrders.filter(order => {
            const matchesSearch = !searchTerm || 
                order.id.toString().includes(searchTerm) ||
                order.customer_name.toLowerCase().includes(searchTerm) ||
                order.customer_email.toLowerCase().includes(searchTerm);

            const matchesStatus = !statusFilter || order.order_status === statusFilter;

            return matchesSearch && matchesStatus;
        });
        
        console.log('[Orders] Filtered orders:', filteredOrders.length);
        renderTable();
        renderPagination();
    }

    function renderTable() {
        if (!elements.tableBody) {
            console.error('[Orders] Table body element not found!');
            return;
        }

        const start = (currentPage - 1) * PAGE_SIZE;
        const end = start + PAGE_SIZE;
        const pageOrders = filteredOrders.slice(start, end);
        
        console.log('[Orders] Rendering orders:', pageOrders.length, 'out of', filteredOrders.length);

        if (pageOrders.length === 0) {
            const message = filteredOrders.length === 0 && allOrders.length === 0 
                ? 'No orders in the database yet' 
                : 'No orders match your search criteria';
            
            elements.tableBody.innerHTML = `
                <tr>
                    <td colspan="8" class="text-center py-4">
                        <i class="fas fa-receipt fa-3x text-muted mb-3"></i>
                        <p class="text-muted">${message}</p>
                        ${allOrders.length === 0 ? '<p class="text-muted small">Orders will appear here once customers place orders.</p>' : ''}
                    </td>
                </tr>
            `;
            return;
        }

        elements.tableBody.innerHTML = pageOrders.map(order => {
            try {
                const orderDate = new Date(order.created_at);
                const formattedDate = orderDate.toLocaleDateString('en-US', {
                    month: 'short',
                    day: 'numeric',
                    year: 'numeric'
                });

                const paymentMethodIcon = getPaymentMethodIcon(order.payment_method);
                const paymentMethodHtml = getPaymentMethodHtml(order.payment_method);
                const paymentStatusClass = order.payment_status === 'completed' ? 'active' : 'pending';
                const orderStatusClass = `order-status-${order.order_status || 'pending'}`;
                
                // Determine if order can be edited
                const isOrderFinalized = order.order_status === 'completed' || order.order_status === 'cancelled';
                const editBtnTitle = isOrderFinalized 
                    ? `Cannot edit ${order.order_status} orders` 
                    : 'Edit Status';

                return `
                    <tr data-order-id="${order.id}">
                        <td>#${order.id}</td>
                        <td>
                            <div class="user-cell">
                                <div class="user-avatar-sm" style="background: ${getAvatarColor(order.customer_name)};">
                                    ${getInitials(order.customer_name)}
                                </div>
                                <span>${escapeHtml(order.customer_name)}</span>
                            </div>
                        </td>
                        <td>
                            ${paymentMethodHtml}
                        </td>
                        <td>₱${parseFloat(order.total_amount).toFixed(2)}</td>
                        <td>
                            <span class="status-badge ${paymentStatusClass}">
                                ${order.payment_status ? order.payment_status.charAt(0).toUpperCase() + order.payment_status.slice(1) : 'Pending'}
                            </span>
                        </td>
                        <td>
                            <span class="order-status-badge ${orderStatusClass}">
                                ${order.order_status ? order.order_status.charAt(0).toUpperCase() + order.order_status.slice(1) : 'Pending'}
                            </span>
                        </td>
                        <td>${formattedDate}</td>
                        <td>
                            <div class="action-buttons">
                                <button class="btn-icon btn-view" data-id="${order.id}" title="View Invoice">
                                    <i class="fas fa-eye"></i>
                                </button>
                                <button class="btn-icon btn-edit" data-id="${order.id}" title="${editBtnTitle}" 
                                        ${isOrderFinalized ? 'disabled' : ''}>
                                    <i class="fas fa-edit"></i>
                                </button>
                            </div>
                        </td>
                    </tr>
                `;
            } catch (error) {
                console.error('[Orders] Error rendering order:', order.id, error);
                return `
                    <tr>
                        <td colspan="8" class="text-danger">Error rendering order #${order.id}</td>
                    </tr>
                `;
            }
        }).join('');
        
        console.log('[Orders] Table rendered successfully');
    }

    function renderPagination() {
        if (!elements.pagination) return;

        const total = filteredOrders.length;
        const totalPages = Math.max(1, Math.ceil(total / PAGE_SIZE));
        const start = total === 0 ? 0 : (currentPage - 1) * PAGE_SIZE + 1;
        const end = Math.min(total, currentPage * PAGE_SIZE);

        let html = `
            <div class="pagination-info">
                Showing ${start}-${end} of ${total} orders
            </div>
            <div class="pagination-buttons">
        `;

        // Previous button
        html += `
            <button class="pagination-btn" ${currentPage <= 1 ? 'disabled' : ''} data-page="${currentPage - 1}">
                <i class="fas fa-chevron-left"></i>
            </button>
        `;

        // Page numbers
        const maxButtons = 7;
        let startPage = Math.max(1, currentPage - Math.floor(maxButtons / 2));
        let endPage = Math.min(totalPages, startPage + maxButtons - 1);
        
        if (endPage - startPage + 1 < maxButtons) {
            startPage = Math.max(1, endPage - maxButtons + 1);
        }

        for (let i = startPage; i <= endPage; i++) {
            html += `
                <button class="pagination-btn ${i === currentPage ? 'active' : ''}" 
                        ${i === currentPage ? 'disabled' : ''} 
                        data-page="${i}">
                    ${i}
                </button>
            `;
        }

        // Next button
        html += `
            <button class="pagination-btn" ${currentPage >= totalPages ? 'disabled' : ''} data-page="${currentPage + 1}">
                <i class="fas fa-chevron-right"></i>
            </button>
        `;

        html += '</div>';
        elements.pagination.innerHTML = html;

        // Attach pagination click handlers
        elements.pagination.querySelectorAll('[data-page]').forEach(btn => {
            btn.addEventListener('click', () => {
                const page = parseInt(btn.dataset.page);
                if (page >= 1 && page <= totalPages) {
                    currentPage = page;
                    applyFiltersAndRender();
                }
            });
        });
    }

    // Modal Functions
    function openEditStatusModal(order) {
        currentOrder = order;
        elements.editOrderId.value = order.id;
        elements.editOrderIdDisplay.value = `#${order.id}`;
        elements.editCustomerName.value = order.customer_name;
        elements.editOrderStatus.value = order.order_status || 'pending';
        elements.editOrderNotes.value = order.notes || '';
        
        // Disable status change for completed or cancelled orders
        const isOrderFinalized = order.order_status === 'completed' || order.order_status === 'cancelled';
        elements.editOrderStatus.disabled = isOrderFinalized;
        elements.saveStatusBtn.disabled = isOrderFinalized;
        
        if (isOrderFinalized) {
            // Show a notice in the modal
            const statusCapitalized = order.order_status.charAt(0).toUpperCase() + order.order_status.slice(1);
            showToast(`This order is ${order.order_status} and cannot be modified`, 'info');
        }
        
        openModal(elements.editStatusModal);
    }

    async function openInvoiceModal(orderId) {
        const order = await getOrderDetails(orderId);
        if (!order) return;

        const orderDate = new Date(order.created_at);
        const formattedDate = orderDate.toLocaleDateString('en-US', {
            year: 'numeric',
            month: 'long',
            day: 'numeric'
        });
        const formattedTime = orderDate.toLocaleTimeString('en-US', {
            hour: '2-digit',
            minute: '2-digit'
        });

        const paymentMethodHtml = getPaymentMethodHtml(order.payment_method);

        let invoiceHTML = `
            <div class="invoice-header">
                <div class="row">
                    <div class="col-md-6">
                        <h2 class="h4 mb-1">Bean & Brew</h2>
                        <p class="mb-0 opacity-75">Premium Coffee Shop</p>
                    </div>
                    <div class="col-md-6 text-md-end mt-3 mt-md-0">
                        <h3 class="h5 mb-1">RECEIPT</h3>
                        <p class="mb-0">Order #${order.id}</p>
                        <p class="mb-0">${formattedDate} at ${formattedTime}</p>
                    </div>
                </div>
            </div>

            <div class="invoice-body">
                <div class="row mb-4">
                    <div class="col-md-6">
                        <div class="invoice-info-section">
                            <h6>Bill To:</h6>
                            <p class="mb-1"><strong>${escapeHtml(order.customer_name)}</strong></p>
                            <p class="mb-1 text-muted">${escapeHtml(order.customer_email)}</p>
                            <p class="mb-0 text-muted">${escapeHtml(order.customer_phone)}</p>
                        </div>
                    </div>
                    <div class="col-md-6">
                        <div class="invoice-info-section">
                            <h6>Pickup Location:</h6>
                            <p class="mb-1"><strong>${escapeHtml(order.branch_name || 'N/A')}</strong></p>
                            ${order.branch_street ? `<p class="mb-1 text-muted">${escapeHtml(order.branch_street)}</p>` : ''}
                            ${order.branch_city ? `<p class="mb-0 text-muted">${escapeHtml(order.branch_city)}</p>` : ''}
                        </div>
                    </div>
                </div>

                <div class="invoice-info-section">
                    <h6>Order Items</h6>
                    <table class="invoice-items-table">
                        <thead>
                            <tr>
                                <th>Item</th>
                                <th>Variant</th>
                                <th class="text-center">Qty</th>
                                <th class="text-end">Unit Price</th>
                                <th class="text-end">Total</th>
                            </tr>
                        </thead>
                        <tbody>
                            ${order.items.map(item => `
                                <tr>
                                    <td><strong>${escapeHtml(item.product_name || 'N/A')}</strong></td>
                                    <td class="text-muted">${escapeHtml(item.variant_name || '-')}</td>
                                    <td class="text-center">${item.quantity}</td>
                                    <td class="text-end">₱${parseFloat(item.unit_price).toFixed(2)}</td>
                                    <td class="text-end"><strong>₱${parseFloat(item.total_price).toFixed(2)}</strong></td>
                                </tr>
                            `).join('')}
                        </tbody>
                    </table>
                </div>

                <div class="invoice-summary">
                    <div class="invoice-summary-row">
                        <span>Subtotal:</span>
                        <span>₱${parseFloat(order.total_amount).toFixed(2)}</span>
                    </div>
                    <div class="invoice-summary-row grand-total">
                        <span>Total Amount:</span>
                        <span>₱${parseFloat(order.total_amount).toFixed(2)}</span>
                    </div>
                </div>

                <div class="row mt-4">
                    <div class="col-md-6">
                        <div class="invoice-info-section">
                            <h6>Payment Information</h6>
                            <div class="invoice-info-row">
                                <span class="invoice-info-label">Payment Method:</span>
                                <span class="invoice-info-value">${paymentMethodHtml}</span>
                            </div>
                            <div class="invoice-info-row">
                                <span class="invoice-info-label">Payment Status:</span>
                                <span class="invoice-info-value">
                                    <span class="invoice-payment-badge ${order.payment_status === 'completed' ? 'completed' : 'pending'}">
                                        <i class="fas fa-${order.payment_status === 'completed' ? 'check-circle' : 'clock'}"></i>
                                        ${order.payment_status ? order.payment_status.charAt(0).toUpperCase() + order.payment_status.slice(1) : 'Pending'}
                                    </span>
                                </span>
                            </div>
                        </div>
                    </div>
                    <div class="col-md-6">
                        <div class="invoice-info-section">
                            <h6>Order Status</h6>
                            <div class="invoice-info-row">
                                <span class="invoice-info-label">Current Status:</span>
                                <span class="invoice-info-value">
                                    <span class="order-status-badge order-status-${order.order_status || 'pending'}">
                                        ${order.order_status ? order.order_status.charAt(0).toUpperCase() + order.order_status.slice(1) : 'Pending'}
                                    </span>
                                </span>
                            </div>
                        </div>
                    </div>
                </div>

                ${order.notes ? `
                    <div class="mt-4">
                        <div class="invoice-info-section">
                            <h6>Special Notes:</h6>
                            <p class="text-muted mb-0">${escapeHtml(order.notes)}</p>
                        </div>
                    </div>
                ` : ''}

                <div class="text-center mt-5 pt-4 border-top">
                    <p class="text-muted mb-0">Thank you for your order!</p>
                    <p class="text-muted small">For questions, please contact us at support@beanandbrew.com</p>
                </div>
            </div>
        `;

        elements.invoiceContent.innerHTML = invoiceHTML;
        openModal(elements.viewInvoiceModal);
    }

    function openModal(modalElement) {
        if (!modalElement) return;
        const modal = bootstrap.Modal.getOrCreateInstance(modalElement);
        modal.show();
    }

    function closeModal(modalElement) {
        if (!modalElement) return;
        const modal = bootstrap.Modal.getInstance(modalElement);
        if (modal) modal.hide();
    }

    // Confirmation Dialog
    function showConfirmation(title, message, confirmText, confirmClass = 'btn-primary') {
        return new Promise((resolve) => {
            const confirmId = 'confirm-' + Date.now();
            
            const confirmHtml = `
                <div class="modal fade" id="${confirmId}" tabindex="-1" aria-hidden="true">
                    <div class="modal-dialog modal-dialog-centered">
                        <div class="modal-content">
                            <div class="modal-header">
                                <h5 class="modal-title">${escapeHtml(title)}</h5>
                                <button type="button" class="btn-close" data-bs-dismiss="modal" aria-label="Close"></button>
                            </div>
                            <div class="modal-body">
                                <p class="mb-0">${escapeHtml(message)}</p>
                            </div>
                            <div class="modal-footer">
                                <button type="button" class="btn btn-secondary" data-bs-dismiss="modal">Cancel</button>
                                <button type="button" class="btn ${confirmClass}" id="${confirmId}-confirm">${escapeHtml(confirmText)}</button>
                            </div>
                        </div>
                    </div>
                </div>
            `;
            
            document.body.insertAdjacentHTML('beforeend', confirmHtml);
            
            const confirmModal = document.getElementById(confirmId);
            const confirmBtn = document.getElementById(`${confirmId}-confirm`);
            const modal = new bootstrap.Modal(confirmModal);
            
            confirmBtn.addEventListener('click', () => {
                modal.hide();
                resolve(true);
            });
            
            confirmModal.addEventListener('hidden.bs.modal', () => {
                if (!confirmModal.dataset.confirmed) {
                    resolve(false);
                }
                confirmModal.remove();
            });
            
            confirmBtn.addEventListener('click', () => {
                confirmModal.dataset.confirmed = 'true';
            });
            
            modal.show();
        });
    }

    // Utility Functions
    function showToast(message, type = 'info') {
        const toastId = 'toast-' + Date.now();
        const bgClass = type === 'success' ? 'bg-success' : type === 'danger' ? 'bg-danger' : type === 'warning' ? 'bg-warning' : 'bg-info';
        
        const toastHtml = `
            <div id="${toastId}" class="toast align-items-center text-white ${bgClass} border-0" role="alert" aria-live="assertive" aria-atomic="true">
                <div class="d-flex">
                    <div class="toast-body">${escapeHtml(message)}</div>
                    <button type="button" class="btn-close btn-close-white me-2 m-auto" data-bs-dismiss="modal" aria-label="Close"></button>
                </div>
            </div>
        `;
        
        elements.toastContainer.insertAdjacentHTML('beforeend', toastHtml);
        
        const toastElement = document.getElementById(toastId);
        const toast = new bootstrap.Toast(toastElement, { delay: 3000 });
        toast.show();
        
        toastElement.addEventListener('hidden.bs.toast', () => {
            toastElement.remove();
        });
    }

    function debounce(func, wait) {
        let timeout;
        return function executedFunction(...args) {
            const later = () => {
                clearTimeout(timeout);
                func(...args);
            };
            clearTimeout(timeout);
            timeout = setTimeout(later, wait);
        };
    }

    function escapeHtml(text) {
        if (!text) return '';
        const div = document.createElement('div');
        div.textContent = text;
        return div.innerHTML;
    }

    function getInitials(name) {
        if (!name) return '??';
        return name.split(' ')
            .map(n => n[0])
            .join('')
            .toUpperCase()
            .slice(0, 2);
    }

    function getAvatarColor(name) {
        const colors = ['#EF4444', '#10B981', '#F59E0B', '#8B5CF6', '#3B82F6', '#EC4899'];
        const index = (name || '').length % colors.length;
        return colors[index];
    }

    function getPaymentMethodIcon(method) {
        switch(method?.toLowerCase()) {
            case 'paypal':
                return '<i class="fab fa-paypal"></i>';
            case 'gcash':
                return '<i class="fas fa-mobile-alt"></i>';
            case 'cash':
            case 'cash_on_pickup':
                return '<i class="fas fa-money-bill-wave"></i>';
            case 'card':
                return '<i class="fas fa-credit-card"></i>';
            default:
                return '<i class="fas fa-question-circle"></i>';
        }
    }

    function getPaymentMethodHtml(method) {
        const lowerMethod = method?.toLowerCase() || '';
        let iconClass, iconColor, displayText;

        switch(lowerMethod) {
            case 'paypal':
                iconClass = 'fab fa-paypal';
                iconColor = 'paypal';
                displayText = 'PayPal';
                break;
            case 'gcash':
                iconClass = 'fas fa-mobile-alt';
                iconColor = 'gcash';
                displayText = 'GCash';
                break;
            case 'cash':
            case 'cash_on_pickup':
                iconClass = 'fas fa-money-bill-wave';
                iconColor = 'cash';
                displayText = 'Cash on Pickup';
                break;
            case 'card':
                iconClass = 'fas fa-credit-card';
                iconColor = 'card';
                displayText = 'Credit/Debit Card';
                break;
            default:
                iconClass = 'fas fa-question-circle';
                iconColor = 'cash';
                displayText = method ? method.charAt(0).toUpperCase() + method.slice(1) : 'N/A';
        }

        return `
            <div class="payment-method-cell">
                <div class="payment-icon ${iconColor}">
                    <i class="${iconClass}"></i>
                </div>
                <span class="payment-text">${escapeHtml(displayText)}</span>
            </div>
        `;
    }

    function formatPaymentMethod(method) {
        if (!method) return 'N/A';
        switch(method.toLowerCase()) {
            case 'paypal': return 'PayPal';
            case 'gcash': return 'GCash';
            case 'cash': return 'Cash';
            case 'cash_on_pickup': return 'Cash on Pickup';
            case 'card': return 'Credit/Debit Card';
            default: return method.charAt(0).toUpperCase() + method.slice(1);
        }
    }

})();
