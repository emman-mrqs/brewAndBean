/* ============================================
   ORDER CONFIRMATION PAGE - Bean & Brew
   ============================================ */

(function() {
    'use strict';

    // Get order ID from URL
    const urlParams = new URLSearchParams(window.location.search);
    const orderId = urlParams.get('orderId');

    /* ============================================
       INITIALIZATION
       ============================================ */
    
    document.addEventListener('DOMContentLoaded', function() {
        if (!orderId) {
            window.location.href = '/cart';
            return;
        }

        loadOrderDetails();
    });

    /* ============================================
       LOAD ORDER & PAYMENT DETAILS
       ============================================ */
    
    async function loadOrderDetails() {
        try {
            // Fetch order details
            const orderResponse = await fetch(`/api/orders/${orderId}`);
            const orderResult = await orderResponse.json();

            if (!orderResult.success || !orderResult.order) {
                throw new Error('Failed to load order details');
            }

            const order = orderResult.order;
            console.log('Order data:', order);

            // Fetch payment details
            const paymentResponse = await fetch(`/api/orders/${orderId}/payment`);
            const paymentResult = await paymentResponse.json();

            let payment = null;
            if (paymentResult.success && paymentResult.payment) {
                payment = paymentResult.payment;
                console.log('Payment data:', payment);
            }

            // Render order information
            renderOrderInfo(order, payment);
            renderOrderItems(order.items);

        } catch (error) {
            console.error('Error loading order:', error);
            showError('Failed to load order details');
        }
    }

    /* ============================================
       RENDER FUNCTIONS
       ============================================ */
    
    function renderOrderInfo(order, payment) {
        // Format dates
        const orderDate = new Date(order.created_at);
        const formattedDate = orderDate.toLocaleDateString('en-US', {
            year: 'numeric',
            month: 'long',
            day: 'numeric'
        });
        const formattedDateTime = orderDate.toLocaleString('en-US', {
            year: 'numeric',
            month: 'long',
            day: 'numeric',
            hour: '2-digit',
            minute: '2-digit'
        });

        // Set invoice date
        document.getElementById('invoiceDate').textContent = formattedDateTime;

        // Set order information
        document.getElementById('orderNumber').textContent = `#${order.id}`;
        document.getElementById('orderDate').textContent = formattedDate;

        // Payment status
        const statusEl = document.getElementById('paymentStatus');
        const paymentStatus = order.payment_status || 'pending';
        const statusClass = paymentStatus === 'completed' || paymentStatus === 'paid' ? 'completed' : 'pending';
        const statusText = paymentStatus.charAt(0).toUpperCase() + paymentStatus.slice(1);
        statusEl.innerHTML = `<span class="payment-badge ${statusClass}">${statusText}</span>`;

        // Customer & pickup details
        const shippingAddress = order.shipping_address || '';
        const addressLines = shippingAddress.split('\n');
        const customerName = addressLines[0] || 'N/A';
        
        // Extract email and phone from shipping address
        const customerEmail = addressLines[1] || '';
        const customerPhone = addressLines[2] || '';
        
        document.getElementById('customerName').textContent = customerName;
        
        // Construct branch info
        let branchInfo = order.branch_name || 'N/A';
        if (order.branch_street || order.branch_city) {
            const branchParts = [order.branch_street, order.branch_city].filter(Boolean);
            if (branchParts.length > 0) {
                branchInfo += ` - ${branchParts.join(', ')}`;
            }
        }
        document.getElementById('pickupBranch').textContent = branchInfo;
        
        // Payment method
        let paymentMethodText = 'N/A';
        if (payment && payment.payment_method) {
            const methodMap = {
                'cash_on_pickup': 'Cash on Pickup',
                'gcash': 'GCash',
                'paypal': 'PayPal',
                'card': 'Credit/Debit Card'
            };
            paymentMethodText = methodMap[payment.payment_method] || payment.payment_method;
        } else if (order.payment_method) {
            const methodMap = {
                'cash_on_pickup': 'Cash on Pickup',
                'gcash': 'GCash',
                'paypal': 'PayPal',
                'card': 'Credit/Debit Card',
                'pending': 'Pending'
            };
            paymentMethodText = methodMap[order.payment_method] || order.payment_method;
        }
        document.getElementById('paymentMethod').textContent = paymentMethodText;

        // Calculate totals with 2% tax
        const totalAmount = parseFloat(order.total_amount);
        const subtotal = totalAmount / 1.02; // Reverse calculate subtotal (total / 1.02)
        const tax = totalAmount - subtotal; // Tax is 2% of subtotal
        const discount = 0; // You can add discount logic here
        
        document.getElementById('subtotal').textContent = `₱${subtotal.toFixed(2)}`;
        document.getElementById('tax').textContent = `₱${tax.toFixed(2)}`;
        document.getElementById('discount').textContent = `₱${discount.toFixed(2)}`;
        document.getElementById('grandTotal').textContent = `₱${totalAmount.toFixed(2)}`;

        // Transaction details (if payment exists)
        if (payment) {
            document.getElementById('transactionDetails').style.display = 'block';
            document.getElementById('transactionId').textContent = payment.transaction_id || payment.id || '-';
            
            if (payment.payment_date) {
                const paymentDate = new Date(payment.payment_date);
                document.getElementById('paymentDate').textContent = paymentDate.toLocaleString('en-US', {
                    year: 'numeric',
                    month: 'long',
                    day: 'numeric',
                    hour: '2-digit',
                    minute: '2-digit'
                });
            } else {
                document.getElementById('paymentDate').textContent = '-';
            }
            
            document.getElementById('amountPaid').textContent = `₱${parseFloat(payment.amount_paid || totalAmount).toFixed(2)}`;
        }
    }

    function renderOrderItems(items) {
        const tbody = document.getElementById('orderItems');
        
        if (!items || items.length === 0) {
            tbody.innerHTML = '<tr><td colspan="4" class="text-center text-muted">No items found</td></tr>';
            return;
        }

        tbody.innerHTML = items.map(item => {
            const quantity = item.quantity || 1;
            const unitPrice = parseFloat(item.unit_price || 0);
            const totalPrice = parseFloat(item.total_price || (unitPrice * quantity));

            return `
                <tr>
                    <td>${escapeHtml(item.name || item.product_name || 'Unknown Item')}</td>
                    <td class="text-center">${quantity}</td>
                    <td class="text-end">₱${unitPrice.toFixed(2)}</td>
                    <td class="text-end fw-bold">₱${totalPrice.toFixed(2)}</td>
                </tr>
            `;
        }).join('');
    }

    /* ============================================
       UTILITY FUNCTIONS
       ============================================ */
    
    function escapeHtml(text) {
        const map = {
            '&': '&amp;',
            '<': '&lt;',
            '>': '&gt;',
            '"': '&quot;',
            "'": '&#039;'
        };
        return text ? String(text).replace(/[&<>"']/g, m => map[m]) : '';
    }

    function showError(message) {
        const wrapper = document.querySelector('.confirmation-wrapper');
        if (wrapper) {
            wrapper.innerHTML = `
                <div class="alert alert-danger text-center">
                    <i class="bi bi-exclamation-triangle me-2"></i>
                    ${message}
                    <div class="mt-3">
                        <a href="/cart" class="btn btn-primary">Return to Cart</a>
                    </div>
                </div>
            `;
        }
    }

})();
