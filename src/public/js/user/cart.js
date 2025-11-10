/* ===== CART PAGE JAVASCRIPT ===== 
 * Features:
 * - Load cart items from database
 * - Update quantity
 * - Checkbox selection for checkout
 * - Edit mode to delete selected items
 * - Calculate totals based on selected items
 * ===================================== */

console.log('=== CART.JS LOADED ===');

let cartData = [];
let isEditMode = false;

document.addEventListener('DOMContentLoaded', function() {
    console.log('=== CART PAGE DOM LOADED ===');
    loadCartItems();
    initEventListeners();
});

function initEventListeners() {
    console.log('=== INITIALIZING EVENT LISTENERS ===');
    const editBtn = document.getElementById('editCartBtn');
    const cancelBtn = document.getElementById('cancelEditBtn');
    const deleteBtn = document.getElementById('deleteSelectedBtn');
    const checkoutBtn = document.getElementById('checkoutBtn');

    console.log('Checkout button found:', !!checkoutBtn);
    
    if (editBtn) editBtn.addEventListener('click', enterEditMode);
    if (cancelBtn) cancelBtn.addEventListener('click', exitEditMode);
    if (deleteBtn) deleteBtn.addEventListener('click', deleteSelectedItems);
    if (checkoutBtn) {
        console.log('Adding click listener to checkout button');
        checkoutBtn.addEventListener('click', proceedToCheckout);
    } else {
        console.error('Checkout button NOT found!');
    }
}

async function loadCartItems() {
    try {
        console.log('=== LOADING CART ITEMS ===');
        const response = await fetch('/api/cart/items');
        const data = await response.json();
        console.log('Cart API response:', data);
        console.log('Cart items:', data.items);
        console.log('Number of items:', data.items?.length);

        if (data.success) {
            cartData = data.items;
            console.log('cartData set to:', cartData);
            // Log the structure of each item
            if (cartData.length > 0) {
                console.log('First item structure:', cartData[0]);
                console.log('First item ID:', cartData[0].id);
                console.log('First item keys:', Object.keys(cartData[0]));
            }
            displayCartItems(data.items);
        } else {
            showBootstrapToast('Load Error', 'Failed to load cart items', 'danger');
        }
    } catch (error) {
        console.error('Error loading cart:', error);
        showBootstrapToast('Error', 'Error loading cart', 'danger');
    }
}

function displayCartItems(items) {
    const cartContainer = document.getElementById('cartItemsContainer');
    const emptyCartMessage = document.getElementById('emptyCartMessage');

    if (!items || items.length === 0) {
        if (cartContainer) cartContainer.innerHTML = '';
        if (emptyCartMessage) emptyCartMessage.style.display = 'block';
        return;
    }

    if (emptyCartMessage) emptyCartMessage.style.display = 'none';

    const html = items.map(item => {
        const stockQty = parseInt(item.stock_quantity) || 0;
        const cartQty = parseInt(item.quantity);
        const hasStock = stockQty > 0;
        const isLowStock = stockQty > 0 && stockQty < 10;
        const exceedsStock = cartQty > stockQty;
        const isOutOfStock = stockQty === 0;
        
        // Determine stock badge
        let stockBadge = '';
        if (isOutOfStock) {
            stockBadge = '<span class="stock-badge out-of-stock"><i class="fas fa-times-circle"></i> Out of Stock</span>';
        } else if (exceedsStock) {
            stockBadge = `<span class="stock-badge exceeds-stock"><i class="fas fa-exclamation-triangle"></i> Only ${stockQty} available</span>`;
        } else if (isLowStock) {
            stockBadge = `<span class="stock-badge low-stock"><i class="fas fa-fire"></i> Low Stock (${stockQty} left)</span>`;
        }
        
        // Disable checkout checkbox if out of stock or exceeds stock (but allow edit mode selection)
        const isDisabledForCheckout = isOutOfStock || exceedsStock;
        
        return `
        <div class="cart-item ${isDisabledForCheckout ? 'item-disabled' : ''}" data-item-id="${item.id}" data-stock="${stockQty}" data-quantity="${cartQty}">
            <div class="cart-item-checkbox visible">
                <label class="checkbox-container">
                    <input type="checkbox" class="item-checkbox" data-item-id="${item.id}" 
                           ${!isEditMode && !isDisabledForCheckout ? 'checked' : ''} 
                           ${!isEditMode && isDisabledForCheckout ? 'disabled' : ''}
                           onchange="updateCartSummaryFromCheckboxes()">
                    <span class="checkmark"></span>
                </label>
            </div>
            <div class="cart-item-image">
                <img src="${item.img_url || '/uploads/products/default-product.jpg'}" alt="${item.product_name}" onerror="this.src='/uploads/products/default-product.jpg'">
                ${isOutOfStock ? '<div class="out-of-stock-overlay"><span>Out of Stock</span></div>' : ''}
            </div>
            <div class="cart-item-details">
                <h3>${item.product_name}</h3>
                ${item.variant_name ? `<p class="variant">Variant: ${item.variant_name}</p>` : ''}
                ${stockBadge}
                <p class="price-mobile">₱${parseFloat(item.price).toFixed(2)}</p>
            </div>
            <div class="cart-item-quantity ${isEditMode || isDisabledForCheckout ? 'disabled' : ''}">
                <button class="qty-btn minus" onclick="updateQuantity(${item.id}, ${parseInt(item.quantity) - 1})" ${isEditMode || isDisabledForCheckout ? 'disabled' : ''}><i class="fas fa-minus"></i></button>
                <input type="number" value="${item.quantity}" min="1" max="${stockQty > 0 ? stockQty : 99}" class="qty-input" ${isEditMode || isDisabledForCheckout ? 'disabled' : ''} onchange="updateQuantity(${item.id}, this.value)">
                <button class="qty-btn plus" onclick="updateQuantity(${item.id}, ${parseInt(item.quantity) + 1})" ${isEditMode || isDisabledForCheckout || cartQty >= stockQty ? 'disabled' : ''}><i class="fas fa-plus"></i></button>
            </div>
            <div class="cart-item-price">
                <span class="subtotal">₱${(parseFloat(item.price) * parseInt(item.quantity)).toFixed(2)}</span>
            </div>
        </div>
    `;
    }).join('');

    if (cartContainer) cartContainer.innerHTML = html;
    updateCartSummaryFromCheckboxes();
}

function updateCartSummaryFromCheckboxes() {
    const checkboxes = document.querySelectorAll('.item-checkbox:checked');
    const selectedItems = [];
    checkboxes.forEach(checkbox => {
        const itemId = checkbox.dataset.itemId; // Keep as string
        // Compare as strings since cartData has string IDs
        const item = cartData.find(i => String(i.id) === String(itemId));
        if (item) selectedItems.push(item);
    });
    updateCartSummary(selectedItems);
}

function updateCartSummary(items) {
    const subtotal = items.reduce((sum, item) => sum + (parseFloat(item.price) * parseInt(item.quantity)), 0);
    const taxFee = subtotal * 0.02;
    const total = subtotal + taxFee;

    const subtotalEl = document.getElementById('cartSubtotal');
    const taxEl = document.getElementById('cartShipping');
    const totalEl = document.getElementById('cartTotal');
    const itemCountEl = document.getElementById('itemCount');

    if (subtotalEl) subtotalEl.textContent = `₱${subtotal.toFixed(2)}`;
    if (taxEl) taxEl.textContent = `₱${taxFee.toFixed(2)}`;
    if (totalEl) totalEl.textContent = `₱${total.toFixed(2)}`;
    if (itemCountEl) itemCountEl.textContent = items.length;
}

async function updateQuantity(itemId, newQuantity) {
    if (isEditMode) return;
    newQuantity = parseInt(newQuantity);
    if (newQuantity < 1) newQuantity = 1;
    
    // Find the item in cartData to check stock
    const item = cartData.find(i => String(i.id) === String(itemId));
    if (item) {
        const stockQty = parseInt(item.stock_quantity) || 0;
        
        // Check if item is out of stock
        if (stockQty === 0) {
            showBootstrapToast('Out of Stock', 'This item is currently out of stock', 'danger');
            return;
        }
        
        // Check if new quantity exceeds stock
        if (newQuantity > stockQty) {
            showBootstrapToast('Insufficient Stock', `Only ${stockQty} available in stock`, 'warning');
            return;
        }
    }
    
    if (newQuantity > 99) {
        showBootstrapToast('Maximum Quantity', 'Maximum quantity is 99', 'warning');
        return;
    }

    try {
        const response = await fetch(`/cart/update/${itemId}`, {
            method: 'PUT',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({ quantity: newQuantity })
        });
        const data = await response.json();
        if (data.success) {
            loadCartItems();
            showBootstrapToast('Quantity Updated', 'Item quantity has been updated', 'success');
        } else {
            showBootstrapToast('Update Failed', data.message, 'danger');
        }
    } catch (error) {
        console.error('Error updating quantity:', error);
        showBootstrapToast('Error', 'Failed to update quantity', 'danger');
    }
}

function enterEditMode() {
    isEditMode = true;
    document.getElementById('editCartBtn').style.display = 'none';
    document.getElementById('deleteSelectedBtn').style.display = 'inline-flex';
    document.getElementById('cancelEditBtn').style.display = 'inline-flex';
    
    // Disable checkout button during edit mode
    const checkoutBtn = document.getElementById('checkoutBtn');
    if (checkoutBtn) {
        checkoutBtn.disabled = true;
        checkoutBtn.style.opacity = '0.5';
        checkoutBtn.style.cursor = 'not-allowed';
    }
    
    document.querySelectorAll('.item-checkbox').forEach(cb => cb.checked = false);
    displayCartItems(cartData);
}

function exitEditMode() {
    isEditMode = false;
    document.getElementById('editCartBtn').style.display = 'inline-flex';
    document.getElementById('deleteSelectedBtn').style.display = 'none';
    document.getElementById('cancelEditBtn').style.display = 'none';
    
    // Re-enable checkout button
    const checkoutBtn = document.getElementById('checkoutBtn');
    if (checkoutBtn) {
        checkoutBtn.disabled = false;
        checkoutBtn.style.opacity = '1';
        checkoutBtn.style.cursor = 'pointer';
    }
    
    displayCartItems(cartData);
}

async function deleteSelectedItems() {
    const checkboxes = document.querySelectorAll('.item-checkbox:checked');
    if (checkboxes.length === 0) {
        showBootstrapToast('No Selection', 'Please select items to delete', 'warning');
        return;
    }
    
    const itemIds = Array.from(checkboxes).map(cb => parseInt(cb.dataset.itemId));
    try {
        const deletePromises = itemIds.map(itemId => 
            fetch(`/cart/remove/${itemId}`, { method: 'DELETE' }).then(res => res.json())
        );
        const results = await Promise.all(deletePromises);
        if (results.every(r => r.success)) {
            showBootstrapToast('Items Deleted', `${itemIds.length} item(s) removed from cart`, 'success');
            exitEditMode();
            await loadCartItems();
        } else {
            showBootstrapToast('Delete Failed', 'Some items could not be deleted', 'danger');
        }
    } catch (error) {
        console.error('Error deleting items:', error);
        showBootstrapToast('Error', 'Failed to delete items', 'danger');
    }
}

function proceedToCheckout() {
    console.log('=== PROCEED TO CHECKOUT CLICKED ===');
    console.log('Cart - isEditMode:', isEditMode);
    console.log('Cart - cartData:', cartData);
    console.log('Cart - cartData length:', cartData.length);
    
    // Prevent checkout during edit mode
    if (isEditMode) {
        showBootstrapToast('Exit Edit Mode', 'Please exit edit mode before checking out', 'warning');
        return;
    }
    
    const checkboxes = document.querySelectorAll('.item-checkbox:checked');
    console.log('Cart - Found checked checkboxes:', checkboxes.length);
    console.log('Cart - Total checkboxes:', document.querySelectorAll('.item-checkbox').length);
    
    if (checkboxes.length === 0) {
        showBootstrapToast('No Items Selected', 'Please select items to checkout', 'warning');
        return;
    }
    
    // Validate stock availability
    const stockIssues = [];
    const selectedItems = [];
    
    checkboxes.forEach((checkbox, index) => {
        const itemId = checkbox.dataset.itemId; // Keep as string to match cartData
        console.log(`Cart - Checkbox ${index}: itemId=${itemId} (type: ${typeof itemId})`);
        console.log(`Cart - Looking for item with id=${itemId} in cartData:`, cartData);
        // Compare as strings since cartData has string IDs
        const item = cartData.find(i => String(i.id) === String(itemId));
        console.log(`Cart - Found item:`, item);
        
        if (item) {
            const stockQty = parseInt(item.stock_quantity) || 0;
            const cartQty = parseInt(item.quantity);
            
            // Check stock availability
            if (stockQty === 0) {
                stockIssues.push(`${item.product_name} is out of stock`);
            } else if (cartQty > stockQty) {
                stockIssues.push(`${item.product_name}: Only ${stockQty} available (you have ${cartQty} in cart)`);
            } else {
                // Item is valid, add to selected items
                const selectedItem = {
                    id: item.variant_id || item.product_id,
                    name: item.product_name,
                    price: parseFloat(item.price),
                    qty: cartQty,
                    img: item.img_url || '/uploads/products/default-product.jpg',
                    stock_quantity: stockQty
                };
                console.log(`Cart - Adding to selectedItems:`, selectedItem);
                selectedItems.push(selectedItem);
            }
        } else {
            console.error(`Cart - ITEM NOT FOUND for id=${itemId}`);
            console.error(`Cart - Available IDs in cartData:`, cartData.map(i => i.id));
        }
    });
    
    // Show stock issues if any
    if (stockIssues.length > 0) {
        const issueMessage = stockIssues.join('<br>');
        showBootstrapToast('Stock Unavailable', issueMessage, 'danger');
        return;
    }
    
    console.log('Cart - Final selectedItems:', selectedItems);
    console.log('Cart - selectedItems length:', selectedItems.length);
    
    // Validate that we have items to checkout
    if (selectedItems.length === 0) {
        console.error('Cart - ERROR: No valid items found!');
        showBootstrapToast('No Valid Items', 'Unable to find selected items. Please try again.', 'error');
        return;
    }
    
    console.log('Cart - Saving selected items to localStorage:', selectedItems);
    localStorage.setItem('bb_cart_items', JSON.stringify(selectedItems));
    console.log('Cart - Saved to localStorage, length:', selectedItems.length);
    console.log('Cart - Verify localStorage:', localStorage.getItem('bb_cart_items'));
    
    // Small delay to ensure localStorage is written
    setTimeout(() => {
        window.location.href = '/checkout';
    }, 100);
}

window.updateQuantity = updateQuantity;
window.updateCartSummaryFromCheckboxes = updateCartSummaryFromCheckboxes;

function showBootstrapToast(title, message, type = 'info') {
    let toastContainer = document.querySelector('.toast-container');
    if (!toastContainer) {
        toastContainer = document.createElement('div');
        toastContainer.className = 'toast-container position-fixed bottom-0 end-0 p-3';
        toastContainer.style.zIndex = '10001';
        toastContainer.style.bottom = '80px';
        toastContainer.style.right = '20px';
        document.body.appendChild(toastContainer);
    }
    
    const icons = { success: 'fa-check-circle', warning: 'fa-exclamation-triangle', danger: 'fa-times-circle', info: 'fa-info-circle' };
    const bgColors = { success: '#d4edda', warning: '#fff3cd', danger: '#f8d7da', info: '#d1ecf1' };
    const borderColors = { success: '#28a745', warning: '#ffc107', danger: '#dc3545', info: '#17a2b8' };
    const iconColors = { success: '#28a745', warning: '#ffc107', danger: '#dc3545', info: '#17a2b8' };
    
    const toastId = 'toast-' + Date.now();
    const toastEl = document.createElement('div');
    toastEl.id = toastId;
    toastEl.className = 'toast';
    toastEl.setAttribute('role', 'alert');
    toastEl.setAttribute('aria-live', 'assertive');
    toastEl.setAttribute('aria-atomic', 'true');
    toastEl.style.minWidth = '300px';
    toastEl.style.maxWidth = '350px';
    toastEl.style.backgroundColor = bgColors[type];
    toastEl.style.borderLeft = `4px solid ${borderColors[type]}`;
    toastEl.style.boxShadow = '0 0.5rem 1rem rgba(0, 0, 0, 0.15)';
    toastEl.style.borderRadius = '8px';
    toastEl.style.marginBottom = '10px';
    
    toastEl.innerHTML = `
        <div class="toast-header" style="background-color: ${bgColors[type]}; border-bottom: 1px solid ${borderColors[type]}20;">
            <i class="fas ${icons[type]} me-2" style="color: ${iconColors[type]}; font-size: 1.1rem;"></i>
            <strong class="me-auto" style="color: #333;">${title}</strong>
            <button type="button" class="btn-close" data-bs-dismiss="toast" aria-label="Close"></button>
        </div>
        <div class="toast-body" style="color: #333; padding: 12px;">${message}</div>
    `;
    
    toastContainer.appendChild(toastEl);
    const bsToast = new bootstrap.Toast(toastEl, { autohide: true, delay: 3000 });
    bsToast.show();
    toastEl.addEventListener('hidden.bs.toast', function() { toastEl.remove(); });
}

function scrollToTop() {
    window.scrollTo({ top: 0, behavior: 'smooth' });
}

window.addEventListener('scroll', function() {
    const backToTopBtn = document.getElementById('backToTop');
    if (backToTopBtn) {
        if (window.scrollY > 300) {
            backToTopBtn.classList.add('visible');
        } else {
            backToTopBtn.classList.remove('visible');
        }
    }
});
