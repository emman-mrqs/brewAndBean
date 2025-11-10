/* ============================================
   PAYMENT CHECKOUT PAGE JAVASCRIPT - Bean & Brew
   ============================================ */

(function() {
    'use strict';

    // DOM Elements
    const orderDetailsEl = document.getElementById('orderDetails');
    const orderSummaryContent = document.getElementById('orderSummaryContent');
    const orderItemsList = document.getElementById('orderItemsList');
    const summarySubtotal = document.getElementById('summarySubtotal');
    const summaryTax = document.getElementById('summaryTax');
    const summaryTotal = document.getElementById('summaryTotal');
    const confirmPaymentBtn = document.getElementById('confirmPaymentBtn');

    // Payment method radio buttons
    const paymentRadios = document.querySelectorAll('input[name="paymentMethod"]');

    // Order data (from localStorage, not from API yet)
    let orderData = null;

    /* ============================================
       INITIALIZATION
       ============================================ */
    
    document.addEventListener('DOMContentLoaded', function() {
        console.log('Payment checkout page initialized');

        loadOrderDataFromStorage();
        initEventListeners();
    });

    /* ============================================
       EVENT LISTENERS
       ============================================ */
    
    function initEventListeners() {
        // Payment method selection
        paymentRadios.forEach(radio => {
            radio.addEventListener('change', handlePaymentMethodChange);
        });

        // Confirm payment button
        if (confirmPaymentBtn) {
            confirmPaymentBtn.addEventListener('click', handleConfirmPayment);
        }
    }

    /* ============================================
       ORDER MANAGEMENT
       ============================================ */
    
    // Load order data from localStorage (not from API)
    function loadOrderDataFromStorage() {
        try {
            const pendingOrderData = localStorage.getItem('bb_pending_order_data');
            
            if (!pendingOrderData) {
                showNotification('No order found. Please start from the cart.', 'error');
                setTimeout(() => {
                    window.location.href = '/cart';
                }, 2000);
                return;
            }

            orderData = JSON.parse(pendingOrderData);
            console.log('Loaded order data from storage:', orderData);
            renderOrderSummary();
        } catch (error) {
            console.error('Error loading order data:', error);
            orderDetailsEl.innerHTML = `
                <div class="error-message">
                    <i class="fas fa-exclamation-circle"></i>
                    <p>Failed to load order details.</p>
                    <button onclick="window.location.href='/cart'" class="btn-secondary">
                        Return to Cart
                    </button>
                </div>
            `;
        }
    }

    // Render order summary
    function renderOrderSummary() {
        // Hide loading, show content
        orderDetailsEl.style.display = 'none';
        orderSummaryContent.style.display = 'block';

        // Render order items with images
        orderItemsList.innerHTML = orderData.items.map(item => `
            <div class="order-item">
                <div class="oi-thumb">
                    ${item.img && (item.img.includes('/') || item.img.endsWith('.webp')) 
                        ? `<img src="${item.img}" alt="${escapeHtml(item.name)}">`
                        : item.img || '☕'}
                </div>
                <div class="oi-info">
                    <div class="oi-name">${escapeHtml(item.name)}</div>
                    <div class="oi-qty">Qty: ${item.quantity}</div>
                </div>
                <div class="oi-price">₱${(item.unitPrice * item.quantity).toFixed(2)}</div>
            </div>
        `).join('');

        // Update totals
        summarySubtotal.textContent = `₱${parseFloat(orderData.subtotal).toFixed(2)}`;
        summaryTax.textContent = `₱${parseFloat(orderData.tax).toFixed(2)}`;
        summaryTotal.textContent = `₱${parseFloat(orderData.total).toFixed(2)}`;
    }

    /* ============================================
       PAYMENT METHOD HANDLING
       ============================================ */
    
    function handlePaymentMethodChange(e) {
        const selectedMethod = e.target.value;

        // Hide PayPal button container if switching away from PayPal
        const paypalContainer = document.getElementById('paypal-button-container');
        if (paypalContainer && selectedMethod !== 'paypal') {
            paypalContainer.style.display = 'none';
        }

        // Show confirm button when switching payment methods
        if (confirmPaymentBtn) {
            confirmPaymentBtn.style.display = 'block';
        }

        // Update button text based on payment method
        updateButtonText(selectedMethod);
    }

    function updateButtonText(method) {
        const buttonText = {
            'cash_on_pickup': '<i class="fas fa-check"></i> Confirm Order',
            'paypal': '<i class="fab fa-paypal"></i> Pay with PayPal'
        };

        confirmPaymentBtn.innerHTML = buttonText[method] || '<i class="fas fa-lock"></i> Complete Payment';
    }

    /* ============================================
       PAYMENT PROCESSING
       ============================================ */
    
    async function handleConfirmPayment() {
        // Get selected payment method
        const selectedMethod = document.querySelector('input[name="paymentMethod"]:checked').value;

        // If PayPal, use PayPal button flow instead
        if (selectedMethod === 'paypal') {
            showNotification('Please use the PayPal button below to complete payment', 'info');
            showPayPalButton();
            return;
        }

        // For Cash on Pickup, proceed with normal flow
        confirmPaymentBtn.innerHTML = '<i class="fas fa-spinner fa-spin"></i> Processing...';
        confirmPaymentBtn.disabled = true;

        try {
            // STEP 1: Create the order in the database first
            console.log('Creating order with data:', orderData);
            
            const orderResponse = await fetch('/api/orders', {
                method: 'POST',
                headers: {
                    'Content-Type': 'application/json'
                },
                body: JSON.stringify(orderData)
            });

            const orderResult = await orderResponse.json();

            if (!orderResult.success) {
                throw new Error(orderResult.message || 'Failed to create order');
            }

            const orderId = orderResult.orderId;
            console.log('Order created successfully with ID:', orderId);

            // STEP 2: Now process the payment
            const paymentData = {
                orderId: orderId,
                paymentMethod: selectedMethod,
                amount: orderData.total
            };

            // Process payment
            const paymentResponse = await fetch('/api/orders/payment', {
                method: 'POST',
                headers: {
                    'Content-Type': 'application/json'
                },
                body: JSON.stringify(paymentData)
            });

            const paymentResult = await paymentResponse.json();

            if (paymentResult.success) {
                // Payment successful - NOW clear everything
                localStorage.removeItem('bb_cart_items');
                localStorage.removeItem('bb_cart_promo');
                localStorage.removeItem('bb_pending_order_data');
                localStorage.removeItem('bb_checkout_form_data');
                
                // Go to order confirmation
                window.location.href = `/order-confirmation?orderId=${orderId}`;
            } else {
                throw new Error(paymentResult.message || 'Payment failed');
            }
        } catch (error) {
            console.error('Error processing payment:', error);
            showNotification(error.message || 'Payment failed. Please try again.', 'error');
            
            // Reset button
            confirmPaymentBtn.innerHTML = '<i class="bi bi-shield-check"></i> Confirm Order';
            confirmPaymentBtn.disabled = false;
        }
    }

    /* ============================================
       PAYPAL INTEGRATION
       ============================================ */

    let paypalSDKLoaded = false;
    let paypalSDKLoading = false;

    function loadPayPalSDK() {
        return new Promise((resolve, reject) => {
            // If already loaded, resolve immediately
            if (paypalSDKLoaded && typeof paypal !== 'undefined' && typeof paypal.Buttons === 'function') {
                resolve();
                return;
            }

            // If already loading, wait for it
            if (paypalSDKLoading) {
                const checkInterval = setInterval(() => {
                    if (paypalSDKLoaded && typeof paypal !== 'undefined' && typeof paypal.Buttons === 'function') {
                        clearInterval(checkInterval);
                        resolve();
                    }
                }, 100);
                return;
            }

            paypalSDKLoading = true;

            // Check if script already exists
            const existingScript = document.querySelector('script[src*="paypal.com/sdk"]');
            if (existingScript) {
                existingScript.remove();
            }

            // Create script element with additional parameters to avoid errors
            const script = document.createElement('script');
            // Use basic parameters only - some SDK params cause internal errors
            script.src = `https://www.paypal.com/sdk/js?client-id=${window.PAYPAL_CLIENT_ID}&currency=PHP&components=buttons`;
            script.async = true;
            
            // Suppress PayPal SDK errors that we can't control
            const originalConsoleError = console.error;
            window.addEventListener('error', function(e) {
                if (e.message && e.message.includes('startsWith')) {
                    e.preventDefault();
                    console.warn('PayPal SDK internal error suppressed:', e.message);
                }
            });

            script.onload = () => {
                console.log('PayPal SDK script loaded successfully');
                
                // Wait longer and check multiple times for PayPal to fully initialize
                let checkAttempts = 0;
                const maxAttempts = 30; // 30 attempts × 500ms = 15 seconds
                
                const checkPayPalSDK = setInterval(() => {
                    checkAttempts++;
                    
                    // IMPORTANT: Use window['paypal'] to avoid conflict with the radio button element id="paypal"
                    const paypalSDK = window['paypal'];
                    const paypalExists = typeof paypalSDK !== 'undefined' && paypalSDK !== null && !(paypalSDK instanceof HTMLElement);
                    const buttonsExists = paypalExists && typeof paypalSDK.Buttons === 'function';
                    
                    if (checkAttempts % 5 === 0) {
                        console.log(`Checking PayPal SDK (attempt ${checkAttempts}): SDK=${paypalExists}, Buttons=${buttonsExists}`);
                    }
                    
                    if (buttonsExists) {
                        clearInterval(checkPayPalSDK);
                        console.log('✅ PayPal Buttons is ready!');
                        paypalSDKLoaded = true;
                        paypalSDKLoading = false;
                        resolve();
                    } else if (checkAttempts >= maxAttempts) {
                        clearInterval(checkPayPalSDK);
                        paypalSDKLoading = false;
                        console.error('❌ PayPal Buttons not available after timeout');
                        
                        // Log what we found
                        console.log('PayPal SDK type:', typeof paypalSDK);
                        console.log('Is HTML Element?', paypalSDK instanceof HTMLElement);
                        console.log('Available PayPal properties:', paypalSDK && !(paypalSDK instanceof HTMLElement) ? Object.keys(paypalSDK) : 'N/A');
                        
                        reject(new Error('PayPal SDK loaded but Buttons not available after timeout'));
                    }
                }, 500);
            };

            script.onerror = () => {
                console.error('Failed to load PayPal SDK');
                paypalSDKLoading = false;
                reject(new Error('Failed to load PayPal SDK'));
            };

            document.head.appendChild(script);
        });
    }

    async function showPayPalButton() {
        // Hide confirm button
        confirmPaymentBtn.style.display = 'none';

        // Create PayPal button container if it doesn't exist
        let paypalContainer = document.getElementById('paypal-button-container');
        if (!paypalContainer) {
            paypalContainer = document.createElement('div');
            paypalContainer.id = 'paypal-button-container';
            paypalContainer.className = 'paypal-button-wrapper';
            paypalContainer.style.marginTop = '20px';
            paypalContainer.style.width = '100%';
            paypalContainer.style.maxWidth = '750px';
            paypalContainer.style.margin = '20px auto';
            confirmPaymentBtn.parentNode.insertBefore(paypalContainer, confirmPaymentBtn);
        } else {
            // Make sure container is visible if it was hidden
            paypalContainer.style.display = 'block';
        }

        // Show loading message
        paypalContainer.innerHTML = `
            <div class="alert alert-info">
                <div class="spinner-border spinner-border-sm me-2" role="status">
                    <span class="visually-hidden">Loading...</span>
                </div>
                <i class="bi bi-hourglass-split"></i> Loading PayPal... Please wait.
            </div>
        `;

        try {
            // Load PayPal SDK
            await loadPayPalSDK();
            
            // Clear loading message
            paypalContainer.innerHTML = '';
            
            // Render PayPal button
            renderPayPalButton(paypalContainer);
        } catch (error) {
            console.error('Error loading PayPal:', error);
            
            // Show detailed error with troubleshooting
            paypalContainer.innerHTML = `
                <div class="alert alert-danger">
                    <h6 class="alert-heading"><i class="bi bi-exclamation-triangle"></i> PayPal Loading Failed</h6>
                    <p class="mb-2">Unable to load PayPal payment system.</p>
                    <small class="text-muted">Error: ${error.message}</small>
                    <hr>
                    <div class="d-flex gap-2 mt-3">
                        <button class="btn btn-sm btn-outline-danger" onclick="location.reload()">
                            <i class="bi bi-arrow-clockwise"></i> Refresh Page
                        </button>
                        <button class="btn btn-sm btn-outline-secondary" onclick="document.getElementById('confirmPaymentBtn').style.display='block'; document.getElementById('paypal-button-container').style.display='none';">
                            <i class="bi bi-arrow-left"></i> Choose Another Method
                        </button>
                    </div>
                    <div class="mt-3">
                        <small class="text-muted d-block"><strong>Troubleshooting:</strong></small>
                        <small class="text-muted d-block">1. Clear browser cache and refresh</small>
                        <small class="text-muted d-block">2. Try a different browser</small>
                        <small class="text-muted d-block">3. Disable ad blockers</small>
                        <small class="text-muted d-block">4. Use "Cash on Pickup" instead</small>
                    </div>
                </div>
            `;
        }
    }

    function renderPayPalButton(container) {
        // IMPORTANT: Use window['paypal'] to avoid conflict with radio button id="paypal"
        const PayPalSDK = window['paypal'];
        
        if (typeof PayPalSDK === 'undefined' || typeof PayPalSDK.Buttons !== 'function' || PayPalSDK instanceof HTMLElement) {
            console.error('PayPal SDK not ready');
            console.log('PayPal type:', typeof PayPalSDK);
            console.log('Is HTML Element?', PayPalSDK instanceof HTMLElement);
            container.innerHTML = '<div class="alert alert-danger">PayPal is not ready. Please refresh the page.</div>';
            confirmPaymentBtn.style.display = 'block';
            return;
        }

        PayPalSDK.Buttons({
            createOrder: async function(data, actions) {
                try {
                    // Call backend to create PayPal order
                    const response = await fetch('/api/paypal/create-order', {
                        method: 'POST',
                        headers: {
                            'Content-Type': 'application/json'
                        },
                        body: JSON.stringify({ orderData })
                    });

                    const result = await response.json();
                    
                    if (!result.success) {
                        showNotification(result.message || 'Failed to create PayPal order', 'error');
                        throw new Error(result.message);
                    }

                    return result.orderId;
                } catch (error) {
                    console.error('Error creating PayPal order:', error);
                    showNotification('Failed to initialize PayPal payment', 'error');
                    throw error;
                }
            },

            onApprove: async function(data, actions) {
                try {
                    showNotification('Processing payment...', 'info');

                    // Call backend to capture payment
                    const response = await fetch('/api/paypal/capture-payment', {
                        method: 'POST',
                        headers: {
                            'Content-Type': 'application/json'
                        },
                        body: JSON.stringify({ orderID: data.orderID })
                    });

                    const result = await response.json();

                    if (!result.success) {
                        showNotification(result.message || 'Payment failed', 'error');
                        return;
                    }

                    // Clear cart and order data
                    localStorage.removeItem('bb_cart_items');
                    localStorage.removeItem('bb_cart_promo');
                    localStorage.removeItem('bb_pending_order_data');
                    localStorage.removeItem('bb_checkout_form_data');

                    // Show success message
                    showNotification('Payment successful! Redirecting...', 'success');

                    // Redirect to order confirmation
                    setTimeout(() => {
                        window.location.href = `/order-confirmation?orderId=${result.orderId}`;
                    }, 1500);

                } catch (error) {
                    console.error('Error capturing payment:', error);
                    showNotification('Failed to process payment', 'error');
                }
            },

            onError: function(err) {
                console.error('PayPal error:', err);
                showNotification('Payment failed. Please try again.', 'error');
                
                // Hide PayPal container and show confirm button
                const paypalContainer = document.getElementById('paypal-button-container');
                if (paypalContainer) {
                    paypalContainer.style.display = 'none';
                }
                confirmPaymentBtn.style.display = 'block';
            },

            onCancel: function(data) {
                console.log('PayPal payment cancelled by user');
                showNotification('Payment cancelled', 'warning');
                
                // Hide PayPal container and show confirm button
                const paypalContainer = document.getElementById('paypal-button-container');
                if (paypalContainer) {
                    paypalContainer.style.display = 'none';
                }
                confirmPaymentBtn.style.display = 'block';
            },

            style: {
                layout: 'vertical',
                color: 'gold',
                shape: 'rect',
                label: 'paypal',
                height: window.innerWidth < 480 ? 44 : (window.innerWidth < 768 ? 48 : 50),
                tagline: false
            }
        }).render(container).catch(function(err) {
            console.error('PayPal button render error:', err);
            container.innerHTML = '<div class="alert alert-danger">Failed to load PayPal button. Please refresh the page.</div>';
            confirmPaymentBtn.style.display = 'block';
        });
    }

    // Listen for payment method changes
    function handlePaymentMethodChange() {
        const selectedMethod = document.querySelector('input[name="paymentMethod"]:checked').value;
        const paypalContainer = document.getElementById('paypal-button-container');
        
        if (selectedMethod === 'paypal') {
            // Hide confirm button when PayPal selected
            confirmPaymentBtn.innerHTML = '<i class="bi bi-paypal"></i> Pay with PayPal';
        } else {
            // Show confirm button for other methods
            confirmPaymentBtn.innerHTML = '<i class="bi bi-shield-check"></i> Confirm Order';
            confirmPaymentBtn.style.display = 'block';
            
            // Hide PayPal button if exists
            if (paypalContainer) {
                paypalContainer.style.display = 'none';
            }
        }
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
        return text ? text.replace(/[&<>"']/g, m => map[m]) : '';
    }

    function showNotification(message, type = 'info') {
        // Create Bootstrap toast
        const toastContainer = document.querySelector('.toast-container') || createToastContainer();
        
        const toastId = 'toast-' + Date.now();
        const iconClass = type === 'success' ? 'bi-check-circle-fill text-success' : 
                         type === 'error' ? 'bi-exclamation-circle-fill text-danger' : 
                         'bi-info-circle-fill text-info';
        
        const toastHTML = `
            <div id="${toastId}" class="toast align-items-center border-0" role="alert" aria-live="assertive" aria-atomic="true">
                <div class="d-flex">
                    <div class="toast-body d-flex align-items-center">
                        <i class="bi ${iconClass} me-2 fs-5"></i>
                        <span>${message}</span>
                    </div>
                    <button type="button" class="btn-close me-2 m-auto" data-bs-dismiss="toast" aria-label="Close"></button>
                </div>
            </div>
        `;
        
        toastContainer.insertAdjacentHTML('beforeend', toastHTML);
        
        const toastElement = document.getElementById(toastId);
        const toast = new bootstrap.Toast(toastElement, {
            autohide: true,
            delay: 3000
        });
        
        toast.show();
        
        // Remove toast element after it's hidden
        toastElement.addEventListener('hidden.bs.toast', () => {
            toastElement.remove();
        });
    }

    function createToastContainer() {
        const container = document.createElement('div');
        container.className = 'toast-container position-fixed bottom-0 end-0 p-3';
        container.style.zIndex = '9999';
        document.body.appendChild(container);
        return container;
    }

})();
