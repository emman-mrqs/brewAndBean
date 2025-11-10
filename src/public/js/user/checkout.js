/* ============================================
   CHECKOUT PAGE JAVASCRIPT - Bean & Brew
   ============================================ */

(function() {
    'use strict';

    // Constants
    const CART_KEY = 'bb_cart_items';
    const PROMO_KEY = 'bb_cart_promo';
    const TAX_RATE = 0.02; // 2% tax

    // DOM Elements
    const orderItemsEl = document.getElementById('orderItems');
    const subtotalEl = document.getElementById('checkoutSubtotal');
    const shippingEl = document.getElementById('checkoutShipping');
    const taxEl = document.getElementById('checkoutTax');
    const totalEl = document.getElementById('checkoutTotal');
    const discountRowEl = document.getElementById('checkoutDiscountRow');
    const discountEl = document.getElementById('checkoutDiscount');
    const placeOrderBtn = document.getElementById('placeOrderBtn');
    const branchSelect = document.getElementById('branch');
    const branchInfo = document.getElementById('branchInfo');
    const branchNameEl = document.getElementById('branchName');
    const branchAddressEl = document.getElementById('branchAddress');
    
    // Contact form elements
    const editContactBtn = document.getElementById('editContactBtn');
    const cancelContactBtn = document.getElementById('cancelContactBtn');
    const fullNameInput = document.getElementById('fullName');
    const emailInput = document.getElementById('email');
    const phoneInput = document.getElementById('phone');
    const contactInfoNote = document.querySelector('.contact-info-note');

    // State
    let branches = [];
    let orderTotal = 0;
    let isEditingContact = false;
    let originalContactData = {
        fullName: '',
        email: '',
        phone: ''
    };

    /* ============================================
       INITIALIZATION
       ============================================ */
    
    document.addEventListener('DOMContentLoaded', function() {
        console.log('Checkout page initialized');
        
        // Store original contact data
        storeOriginalContactData();
        
        loadBranches();
        renderOrderSummary();
        initEventListeners();
        restoreFormData(); // Restore saved form data
    });

    /* ============================================
       EVENT LISTENERS
       ============================================ */
    
    function initEventListeners() {
        // Branch selection
        if (branchSelect) {
            branchSelect.addEventListener('change', handleBranchSelection);
        }

        // Place order button
        if (placeOrderBtn) {
            placeOrderBtn.addEventListener('click', handlePlaceOrder);
        }
        
        // Edit contact button
        if (editContactBtn) {
            editContactBtn.addEventListener('click', toggleContactEdit);
        }
        
        // Cancel contact button
        if (cancelContactBtn) {
            cancelContactBtn.addEventListener('click', cancelContactEdit);
        }

        // Auto-save form data on input
        const formInputs = ['fullName', 'email', 'phone', 'branch', 'notes'];
        formInputs.forEach(fieldId => {
            const field = document.getElementById(fieldId);
            if (field) {
                field.addEventListener('input', saveFormData);
                field.addEventListener('change', saveFormData);
            }
        });
    }

    /* ============================================
       CONTACT INFORMATION MANAGEMENT
       ============================================ */
    
    // Store original contact data from server
    function storeOriginalContactData() {
        if (fullNameInput) originalContactData.fullName = fullNameInput.value;
        if (emailInput) originalContactData.email = emailInput.value;
        if (phoneInput) originalContactData.phone = phoneInput.value;
    }
    
    // Toggle contact edit mode
    function toggleContactEdit() {
        isEditingContact = !isEditingContact;
        
        if (isEditingContact) {
            // Enable editing
            if (fullNameInput) fullNameInput.removeAttribute('readonly');
            if (emailInput) emailInput.removeAttribute('readonly');
            if (phoneInput) phoneInput.removeAttribute('readonly');
            
            // Update buttons
            editContactBtn.innerHTML = '<i class="fas fa-check"></i> Save';
            editContactBtn.classList.add('editing');
            
            // Show cancel button
            if (cancelContactBtn) {
                cancelContactBtn.style.display = 'inline-flex';
            }
            
            // Show info note
            if (contactInfoNote) {
                contactInfoNote.style.display = 'flex';
            }
            
            // Focus on first input
            if (fullNameInput) fullNameInput.focus();
        } else {
            // Disable editing
            if (fullNameInput) fullNameInput.setAttribute('readonly', 'readonly');
            if (emailInput) emailInput.setAttribute('readonly', 'readonly');
            if (phoneInput) phoneInput.setAttribute('readonly', 'readonly');
            
            // Update buttons
            editContactBtn.innerHTML = '<i class="fas fa-edit"></i> Edit';
            editContactBtn.classList.remove('editing');
            
            // Hide cancel button
            if (cancelContactBtn) {
                cancelContactBtn.style.display = 'none';
            }
            
            // Hide info note
            if (contactInfoNote) {
                contactInfoNote.style.display = 'none';
            }
            
            // Save the edited data
            saveFormData();
        }
    }
    
    // Cancel contact editing and restore original values
    function cancelContactEdit() {
        // Reset to original values
        resetContactData();
        
        // Disable editing mode
        isEditingContact = false;
        
        // Disable inputs
        if (fullNameInput) fullNameInput.setAttribute('readonly', 'readonly');
        if (emailInput) emailInput.setAttribute('readonly', 'readonly');
        if (phoneInput) phoneInput.setAttribute('readonly', 'readonly');
        
        // Update buttons
        editContactBtn.innerHTML = '<i class="fas fa-edit"></i> Edit';
        editContactBtn.classList.remove('editing');
        
        // Hide cancel button
        if (cancelContactBtn) {
            cancelContactBtn.style.display = 'none';
        }
        
        // Hide info note
        if (contactInfoNote) {
            contactInfoNote.style.display = 'none';
        }
    }
    
    // Reset contact to original values
    function resetContactData() {
        if (fullNameInput) fullNameInput.value = originalContactData.fullName;
        if (emailInput) emailInput.value = originalContactData.email;
        if (phoneInput) phoneInput.value = originalContactData.phone;
    }

    /* ============================================
       BRANCH MANAGEMENT
       ============================================ */
    
    // Load branches from API
    async function loadBranches() {
        try {
            console.log('Loading branches from /api/branches...');
            const response = await fetch('/api/branches');
            console.log('Response status:', response.status);
            
            const data = await response.json();
            console.log('Branches data:', data);
            
            if (data.success && data.branches) {
                branches = data.branches;
                console.log('Loaded branches:', branches.length);
                renderBranchOptions();
            } else {
                console.error('Failed to load branches:', data.message);
                showNotification('Unable to load branches. Please try again.', 'error');
            }
        } catch (error) {
            console.error('Error loading branches:', error);
            showNotification('Failed to load branches. Please refresh the page.', 'error');
        }
    }

    // Render branch dropdown options
    function renderBranchOptions() {
        if (!branchSelect) {
            console.error('Branch select element not found');
            return;
        }

        console.log('Rendering branch options...');
        const options = branches.map(branch => 
            `<option value="${branch.id}" 
                     data-name="${escapeHtml(branch.name)}"
                     data-street="${escapeHtml(branch.street || '')}"
                     data-city="${escapeHtml(branch.city || '')}"
                     data-zipcode="${escapeHtml(branch.zipcode || '')}">
                ${escapeHtml(branch.name)} - ${escapeHtml(branch.city)}
            </option>`
        ).join('');
        
        branchSelect.innerHTML = '<option value="">-- Select a branch --</option>' + options;
        console.log('Branch options rendered:', branches.length, 'branches');
    }

    // Handle branch selection
    function handleBranchSelection() {
        const selectedOption = branchSelect.options[branchSelect.selectedIndex];
        
        if (branchSelect.value) {
            const name = selectedOption.getAttribute('data-name');
            const street = selectedOption.getAttribute('data-street');
            const city = selectedOption.getAttribute('data-city');
            const zipcode = selectedOption.getAttribute('data-zipcode');
            
            branchNameEl.textContent = name;
            branchAddressEl.textContent = `${street}, ${city} ${zipcode}`;
            branchInfo.style.display = 'flex';
        } else {
            branchInfo.style.display = 'none';
        }
    }

    /* ============================================
       FORM DATA PERSISTENCE
       ============================================ */
    
    // Save form data to localStorage
    function saveFormData() {
        const formData = {
            fullName: document.getElementById('fullName')?.value || '',
            email: document.getElementById('email')?.value || '',
            phone: document.getElementById('phone')?.value || '',
            branch: document.getElementById('branch')?.value || '',
            notes: document.getElementById('notes')?.value || ''
        };
        
        localStorage.setItem('bb_checkout_form', JSON.stringify(formData));
        console.log('Form data saved');
    }

    // Restore form data from localStorage
    function restoreFormData() {
        try {
            const savedData = localStorage.getItem('bb_checkout_form');
            if (!savedData) return;

            const formData = JSON.parse(savedData);
            console.log('Restoring form data:', formData);

            // Restore input fields
            if (formData.fullName) {
                const fullNameField = document.getElementById('fullName');
                if (fullNameField) fullNameField.value = formData.fullName;
            }

            if (formData.email) {
                const emailField = document.getElementById('email');
                if (emailField) emailField.value = formData.email;
            }

            if (formData.phone) {
                const phoneField = document.getElementById('phone');
                if (phoneField) phoneField.value = formData.phone;
            }

            if (formData.notes) {
                const notesField = document.getElementById('notes');
                if (notesField) notesField.value = formData.notes;
            }

            // Restore branch selection (after branches are loaded)
            if (formData.branch) {
                const restoreBranch = () => {
                    const branchField = document.getElementById('branch');
                    if (branchField && branchField.options.length > 1) {
                        branchField.value = formData.branch;
                        handleBranchSelection();
                        console.log('Branch restored:', formData.branch);
                    } else {
                        // Try again after a short delay if branches haven't loaded yet
                        setTimeout(restoreBranch, 500);
                    }
                };
                restoreBranch();
            }

        } catch (error) {
            console.error('Error restoring form data:', error);
        }
    }

    // Clear saved form data
    function clearFormData() {
        localStorage.removeItem('bb_checkout_form');
        console.log('Form data cleared');
    }

    /* ============================================
       CART & ORDER MANAGEMENT
       ============================================ */
    
    // Load cart data from localStorage
    function loadCart() {
        try {
            const rawData = localStorage.getItem(CART_KEY);
            console.log('Checkout - Raw localStorage value:', rawData);
            const data = JSON.parse(rawData);
            console.log('Checkout - Parsed cart data:', data);
            // Return all items in cart - no need to filter by selected
            const result = Array.isArray(data) ? data : [];
            console.log('Checkout - Final cart array:', result);
            return result;
        } catch (error) {
            console.error('Error loading cart:', error);
            return [];
        }
    }

    // Load promo code data
    function loadPromo() {
        try {
            return JSON.parse(localStorage.getItem(PROMO_KEY)) || { code: '', type: null, value: 0 };
        } catch (error) {
            return { code: '', type: null, value: 0 };
        }
    }

    // Render order summary
    function renderOrderSummary() {
        const items = loadCart();
        const promo = loadPromo();

        console.log('=== CHECKOUT DEBUG ===');
        console.log('Checkout - Cart items loaded:', items);
        console.log('Checkout - Number of items:', items.length);
        console.log('Checkout - Items detail:', JSON.stringify(items, null, 2));
        console.log('======================');

        if (!items.length) {
            orderItemsEl.innerHTML = `
                <div class="empty-order" style="text-align: center; padding: 2rem;">
                    <i class="fas fa-shopping-cart" style="font-size: 3rem; color: #ccc; margin-bottom: 1rem;"></i>
                    <p style="color: #666; margin-bottom: 1rem;">No items in your order.</p>
                    <a href="/cart" class="btn-link" style="color: #C67C4E; text-decoration: none;">
                        <i class="fas fa-arrow-left"></i> Back to Cart
                    </a>
                </div>
            `;
            
            // Disable place order button
            if (placeOrderBtn) {
                placeOrderBtn.disabled = true;
            }
            return;
        }

        // Render order items
        console.log('Checkout - About to render items...');
        orderItemsEl.innerHTML = items.map((item, index) => {
            console.log(`Checkout - Rendering item ${index}:`, item);
            return `
            <div class="order-item">
                <div class="oi-thumb">
                    ${item.img && (item.img.includes('/') || item.img.endsWith('.webp')) 
                        ? `<img src="${item.img}" alt="${escapeHtml(item.name)}" onerror="this.src='/uploads/products/default-product.jpg'">`
                        : item.img || '☕'}
                </div>
                <div class="oi-info">
                    <div class="oi-name">${escapeHtml(item.name)}</div>
                    <div class="oi-qty">Qty: ${item.qty}</div>
                </div>
                <div class="oi-price">₱${(item.price * item.qty).toFixed(2)}</div>
            </div>
        `}).join('');

        console.log('Checkout - Order items HTML generated, length:', orderItemsEl.innerHTML.length);

        // Calculate totals
        const subtotal = items.reduce((sum, item) => sum + (item.price * item.qty), 0);
        const tax = subtotal * TAX_RATE; // 2% tax
        let discount = 0;
        
        if (promo.type === 'percent') {
            discount = subtotal * promo.value;
        }
        
        orderTotal = Math.max(0, subtotal - discount) + tax;

        // Update UI
        subtotalEl.textContent = `₱${subtotal.toFixed(2)}`;
        shippingEl.textContent = `₱${tax.toFixed(2)}`; // This shows tax in the shipping element
        taxEl.textContent = `₱0.00`;
        totalEl.textContent = `₱${orderTotal.toFixed(2)}`;

        if (discount > 0) {
            discountRowEl.style.display = '';
            discountEl.textContent = `–₱${discount.toFixed(2)}`;
        } else {
            discountRowEl.style.display = 'none';
        }

        // Enable place order button
        if (placeOrderBtn) {
            placeOrderBtn.disabled = false;
        }
    }

    /* ============================================
       FORM VALIDATION & SUBMISSION
       ============================================ */
    
    // Validate checkout form
    function validateForm() {
        const fullName = document.getElementById('fullName');
        const email = document.getElementById('email');
        const phone = document.getElementById('phone');
        const branch = document.getElementById('branch');

        // Check required fields
        if (!fullName || !fullName.value.trim()) {
            showNotification('Please enter your full name.', 'error');
            fullName.focus();
            return false;
        }

        if (!email || !email.value.trim()) {
            showNotification('Please enter your email address.', 'error');
            email.focus();
            return false;
        }

        // Email validation
        const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
        if (!emailRegex.test(email.value.trim())) {
            showNotification('Please enter a valid email address.', 'error');
            email.focus();
            return false;
        }

        if (!phone || !phone.value.trim()) {
            showNotification('Please enter your phone number.', 'error');
            phone.focus();
            return false;
        }

        if (!branch || !branch.value) {
            showNotification('Please select a pickup branch.', 'error');
            branch.focus();
            return false;
        }

        return true;
    }

    // Handle place order
    async function handlePlaceOrder(e) {
        e.preventDefault();

        // Validate form
        if (!validateForm()) {
            return;
        }

        // Get cart items
        const items = loadCart();
        if (!items.length) {
            showNotification('Your cart is empty.', 'error');
            return;
        }

        // Prepare order data - DON'T create order yet, just save temporarily
        const orderData = {
            fullName: document.getElementById('fullName').value.trim(),
            email: document.getElementById('email').value.trim(),
            phone: document.getElementById('phone').value.trim(),
            branchId: document.getElementById('branch').value,
            notes: document.getElementById('notes') ? document.getElementById('notes').value.trim() : '',
            items: items.map(item => ({
                productVariantId: item.id,
                name: item.name,
                quantity: item.qty,
                unitPrice: item.price,
                totalPrice: item.price * item.qty,
                img: item.img // Include image URL
            })),
            subtotal: items.reduce((sum, item) => sum + (item.price * item.qty), 0),
            tax: items.reduce((sum, item) => sum + (item.price * item.qty), 0) * TAX_RATE,
            discount: 0, // Calculate if promo applied
            total: orderTotal
        };

        // Save order data to localStorage (will create order when payment is confirmed)
        localStorage.setItem('bb_pending_order_data', JSON.stringify(orderData));
        
        // Redirect to payment page immediately - no API call yet
        window.location.href = '/payment';
    }

    /* ============================================
       UTILITY FUNCTIONS
       ============================================ */
    
    // Escape HTML to prevent XSS
    function escapeHtml(text) {
        const map = {
            '&': '&amp;',
            '<': '&lt;',
            '>': '&gt;',
            '"': '&quot;',
            "'": '&#039;'
        };
        return String(text).replace(/[&<>"']/g, m => map[m]);
    }

    // Show notification
    function showNotification(message, type = 'info') {
        // Create toast container if it doesn't exist
        let toastContainer = document.querySelector('.toast-container');
        if (!toastContainer) {
            toastContainer = document.createElement('div');
            toastContainer.className = 'toast-container';
            document.body.appendChild(toastContainer);
        }

        // Toast styling based on type
        const toastStyles = {
            success: {
                icon: 'fa-check-circle',
                bgColor: '#d4edda',
                borderColor: '#28a745',
                iconColor: '#28a745',
                title: 'Success'
            },
            error: {
                icon: 'fa-times-circle',
                bgColor: '#f8d7da',
                borderColor: '#dc3545',
                iconColor: '#dc3545',
                title: 'Error'
            },
            warning: {
                icon: 'fa-exclamation-triangle',
                bgColor: '#fff3cd',
                borderColor: '#ffc107',
                iconColor: '#ffc107',
                title: 'Warning'
            },
            info: {
                icon: 'fa-info-circle',
                bgColor: '#d1ecf1',
                borderColor: '#17a2b8',
                iconColor: '#17a2b8',
                title: 'Info'
            }
        };

        const style = toastStyles[type] || toastStyles.info;

        // Create toast element
        const toastId = 'toast-' + Date.now();
        const toastEl = document.createElement('div');
        toastEl.id = toastId;
        toastEl.className = 'toast';
        toastEl.setAttribute('role', 'alert');
        toastEl.setAttribute('aria-live', 'assertive');
        toastEl.setAttribute('aria-atomic', 'true');
        toastEl.style.backgroundColor = style.bgColor;
        toastEl.style.borderLeft = `4px solid ${style.borderColor}`;

        toastEl.innerHTML = `
            <div class="toast-header" style="background-color: ${style.bgColor};">
                <i class="fas ${style.icon} me-2" style="color: ${style.iconColor};"></i>
                <strong class="me-auto" style="color: #333;">${style.title}</strong>
                <button type="button" class="btn-close" data-bs-dismiss="toast" aria-label="Close"></button>
            </div>
            <div class="toast-body" style="color: #333;">${message}</div>
        `;

        toastContainer.appendChild(toastEl);
        const bsToast = new bootstrap.Toast(toastEl, { autohide: true, delay: 4000 });
        bsToast.show();
        
        // Remove toast element after it's hidden
        toastEl.addEventListener('hidden.bs.toast', function() {
            toastEl.remove();
        });
    }

    // Make functions globally available if needed
    window.checkoutPage = {
        loadBranches,
        renderOrderSummary,
        validateForm
    };

})();
