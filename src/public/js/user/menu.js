/* ===== MENU PAGE SCRIPT WITH DATABASE INTEGRATION =====
 * Features:
 * - Load products from database
 * - Category filtering (All, Hot, Cold, Special)
 * - Pagination (12 products per page for All category only)
 * ===================================================== */

let allProducts = [];
let filteredProducts = [];
let currentCategory = 'all';
let currentPage = 1;
const productsPerPage = 12;

// Initialize on page load
document.addEventListener('DOMContentLoaded', function() {
    loadProducts();
    initTabSwitching();
    initScrollAnimations();
    initBackToTop();
    initImagePreview();
    initViewButtons();
    initAddToCartButtons();
});

// Load products from database
async function loadProducts() {
    try {
        const response = await fetch('/api/products');
        const data = await response.json();

        if (data.success) {
            allProducts = data.products;
            filteredProducts = allProducts;
            currentPage = 1;
            displayCurrentPage();
        } else {
            console.error('Failed to load products:', data.message);
            showToast('❌ Failed to load products');
        }
    } catch (error) {
        console.error('Error loading products:', error);
        showToast('❌ Error loading products');
    }
}

// Display current page of products
function displayCurrentPage() {
    // Only use pagination for 'all' category
    if (currentCategory === 'all') {
        const startIndex = (currentPage - 1) * productsPerPage;
        const endIndex = startIndex + productsPerPage;
        const productsToDisplay = filteredProducts.slice(startIndex, endIndex);
        displayProducts(productsToDisplay);
        updatePagination();
        updateProductCounter();
    } else {
        // Show all products for other categories (no pagination)
        displayProducts(filteredProducts);
        updatePagination();
        updateProductCounter();
    }
}

// Display products in the current tab
function displayProducts(products) {
    const activeTab = document.querySelector('.menu-content.active');
    const menuGrid = activeTab ? activeTab.querySelector('.menu-grid') : null;
    
    if (!menuGrid) return;

    if (!products || products.length === 0) {
        menuGrid.innerHTML = `
            <div style="grid-column: 1/-1; text-align: center; padding: 60px 20px;">
                <i class="fas fa-coffee" style="font-size: 48px; color: #ccc; margin-bottom: 16px;"></i>
                <p style="color: #999; font-size: 1.1rem;">No products found</p>
            </div>
        `;
        return;
    }

    menuGrid.innerHTML = products.map((product, index) => {
        const imageUrl = product.img_url || '/uploads/products/default-product.jpg';
        const price = product.price || 0;
        
        // Check if all variants are out of stock
        const isSoldOut = product.variants && product.variants.length > 0 
            ? product.variants.every(v => v.stock_quantity === 0)
            : false;
        
        return `
            <div class="menu-item ${isSoldOut ? 'sold-out' : ''}" data-aos="fade-up" data-delay="${index * 50}" 
                 data-product-id="${product.id}" data-name="${product.name}" 
                 data-price="${price}"
                 data-img="${imageUrl}">
                <div class="menu-item-visual">
                    <img src="${imageUrl}" alt="${product.name}" class="menu-item-image" 
                         onerror="this.src='/uploads/products/default-product.jpg'">
                    ${isSoldOut ? `
                        <div class="sold-out-overlay">
                            <span class="sold-out-badge">
                                <i class="fas fa-ban"></i> SOLD OUT
                            </span>
                        </div>
                    ` : ''}
                </div>
                <div class="menu-item-info">
                    <div class="menu-item-header">
                        <h3>${product.name}</h3>
                        <span class="price">₱${parseFloat(price).toFixed(2)}</span>
                    </div>
                    <p>${product.description || 'Delicious coffee beverage'}</p>
                    ${renderVariants(product.variants)}
                    <div class="menu-item-actions">
                        <button class="view-btn" title="View Details">
                            <i class="fas fa-eye"></i> View
                        </button>
                        <button class="add-to-cart-btn" title="${isSoldOut ? 'Out of Stock' : 'Add to Cart'}" ${isSoldOut ? 'disabled' : ''}>
                            <i class="fas ${isSoldOut ? 'fa-ban' : 'fa-cart-plus'}"></i> ${isSoldOut ? 'Sold Out' : 'Add to Cart'}
                        </button>
                    </div>
                </div>
            </div>
        `;
    }).join('');

    // Re-initialize scroll animations for new items
    initScrollAnimations();
}

// Render variants if available
function renderVariants(variants) {
    if (!variants || variants.length === 0) return '';
    
    return `
        <div class="product-variants" style="margin: 8px 0; display: flex; flex-wrap: wrap; gap: 6px;">
            ${variants.map(variant => `
                <span class="variant-badge" style="background: rgba(198, 124, 78, 0.1); padding: 4px 10px; border-radius: 12px; font-size: 0.75rem; color: var(--brew-primary);">
                    ${variant.name}
                </span>
            `).join('')}
        </div>
    `;
}

// Update pagination controls
function updatePagination() {
    const activeTab = document.querySelector('.menu-content.active');
    
    if (!activeTab) return;
    
    // Get pagination container (now exists in HTML)
    const paginationContainer = activeTab.querySelector('.pagination-container');
    
    if (!paginationContainer) return;
    
    // Only show pagination for 'all' category
    if (currentCategory !== 'all') {
        paginationContainer.innerHTML = '';
        return;
    }
    
    const totalPages = Math.ceil(filteredProducts.length / productsPerPage);
    
    if (totalPages <= 1) {
        paginationContainer.innerHTML = '';
        return;
    }
    
    let paginationHTML = '<div class="pagination" style="display: flex; gap: 8px; align-items: center;">';
    
    // Previous button «
    paginationHTML += `
        <button class="pagination-btn" onclick="changePage(${currentPage - 1})" 
                ${currentPage === 1 ? 'disabled' : ''}
                style="width: 40px; height: 40px; border: 2px solid var(--brew-primary); background: white; color: var(--brew-primary); border-radius: 8px; cursor: pointer; font-weight: 600; transition: all 0.3s;">
            &laquo;
        </button>
    `;
    
    // Page numbers
    const maxVisiblePages = 5;
    let startPage = Math.max(1, currentPage - Math.floor(maxVisiblePages / 2));
    let endPage = Math.min(totalPages, startPage + maxVisiblePages - 1);
    
    if (endPage - startPage < maxVisiblePages - 1) {
        startPage = Math.max(1, endPage - maxVisiblePages + 1);
    }
    
    // First page and ellipsis
    if (startPage > 1) {
        paginationHTML += `<button class="pagination-btn" onclick="changePage(1)" 
            style="width: 40px; height: 40px; border: 2px solid var(--brew-primary); background: white; color: var(--brew-primary); border-radius: 8px; cursor: pointer; font-weight: 600; transition: all 0.3s;">1</button>`;
        if (startPage > 2) {
            paginationHTML += `<span style="padding: 0 8px; color: #999;">...</span>`;
        }
    }
    
    // Page number buttons
    for (let i = startPage; i <= endPage; i++) {
        const isActive = i === currentPage;
        paginationHTML += `
            <button class="pagination-btn ${isActive ? 'active' : ''}" onclick="changePage(${i})"
                    style="width: 40px; height: 40px; border: 2px solid var(--brew-primary); background: ${isActive ? 'var(--brew-primary)' : 'white'}; color: ${isActive ? 'white' : 'var(--brew-primary)'}; border-radius: 8px; cursor: pointer; font-weight: 600; transition: all 0.3s;">
                ${i}
            </button>
        `;
    }
    
    // Ellipsis and last page
    if (endPage < totalPages) {
        if (endPage < totalPages - 1) {
            paginationHTML += `<span style="padding: 0 8px; color: #999;">...</span>`;
        }
        paginationHTML += `<button class="pagination-btn" onclick="changePage(${totalPages})" 
            style="width: 40px; height: 40px; border: 2px solid var(--brew-primary); background: white; color: var(--brew-primary); border-radius: 8px; cursor: pointer; font-weight: 600; transition: all 0.3s;">${totalPages}</button>`;
    }
    
    // Next button »
    paginationHTML += `
        <button class="pagination-btn" onclick="changePage(${currentPage + 1})" 
                ${currentPage === totalPages ? 'disabled' : ''}
                style="width: 40px; height: 40px; border: 2px solid var(--brew-primary); background: white; color: var(--brew-primary); border-radius: 8px; cursor: pointer; font-weight: 600; transition: all 0.3s;">
            &raquo;
        </button>
    `;
    
    paginationHTML += '</div>';
    paginationContainer.innerHTML = paginationHTML;
}

// Update product counter
function updateProductCounter() {
    const counterElement = document.getElementById('productCounter');
    if (!counterElement) return;

    const totalProducts = filteredProducts.length;
    
    if (totalProducts === 0) {
        counterElement.textContent = 'No products found';
        return;
    }

    if (currentCategory === 'all') {
        // For 'all' category with pagination
        const startIndex = (currentPage - 1) * productsPerPage + 1;
        const endIndex = Math.min(currentPage * productsPerPage, totalProducts);
        counterElement.textContent = `Showing ${startIndex}-${endIndex} of ${totalProducts} ${totalProducts === 1 ? 'product' : 'products'}`;
    } else {
        // For other categories without pagination
        counterElement.textContent = `Showing ${totalProducts} ${totalProducts === 1 ? 'product' : 'products'}`;
    }
}

// Change page
function changePage(page) {
    // Only allow page change for 'all' category
    if (currentCategory !== 'all') return;
    
    const totalPages = Math.ceil(filteredProducts.length / productsPerPage);
    
    if (page < 1 || page > totalPages) return;
    
    currentPage = page;
    displayCurrentPage();
    
    // Scroll to top of menu section
    document.querySelector('.menu')?.scrollIntoView({ behavior: 'smooth', block: 'start' });
}

// Tab switching functionality
function initTabSwitching() {
    const tabBtns = document.querySelectorAll('.tab-btn');
    const menuContents = document.querySelectorAll('.menu-content');

    tabBtns.forEach(btn => {
        btn.addEventListener('click', () => {
            const targetTab = btn.dataset.tab;
            currentCategory = targetTab;
            
            // Remove active class from all buttons and contents
            tabBtns.forEach(b => b.classList.remove('active'));
            menuContents.forEach(content => content.classList.remove('active'));
            
            // Add active class to clicked button and corresponding content
            btn.classList.add('active');
            const targetContent = document.getElementById(targetTab);
            if (targetContent) {
                targetContent.classList.add('active');
            }
            
            // Filter products by category
            filterByCategory(targetTab);
        });
    });
}

// Filter products by category
function filterByCategory(category) {
    if (category === 'all') {
        filteredProducts = allProducts;
    } else {
        // Filter by variant name (Hot, Cold, Special)
        filteredProducts = allProducts.filter(product => {
            // Check if product has variants with matching name
            if (product.variants && product.variants.length > 0) {
                return product.variants.some(variant => 
                    variant.name.toLowerCase().includes(category.toLowerCase())
                );
            }
            // Fallback to product category
            return product.category && product.category.toLowerCase() === category.toLowerCase();
        });
    }
    
    currentPage = 1;
    displayCurrentPage();
}

// Scroll animations
function initScrollAnimations() {
    const observerOptions = {
        threshold: 0.2,
        rootMargin: '0px 0px -50px 0px'
    };

    const observer = new IntersectionObserver((entries) => {
        entries.forEach(entry => {
            if (entry.isIntersecting) {
                const delay = entry.target.getAttribute('data-delay') || 0;
                setTimeout(() => {
                    entry.target.classList.add('animate-in');
                }, parseInt(delay));
            }
        });
    }, observerOptions);

    document.querySelectorAll('[data-aos]').forEach(el => observer.observe(el));
}

// Back to top functionality
function scrollToTop() {
    window.scrollTo({
        top: 0,
        behavior: 'smooth'
    });
}

function initBackToTop() {
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
}

// Image preview functionality
function initImagePreview() {
    const previewOverlay = document.getElementById('imagePreviewOverlay');
    const previewImage = document.getElementById('previewImage');
    const closePreview = document.getElementById('closePreview');

    if (!previewOverlay || !previewImage || !closePreview) return;

    // Close preview on button click
    closePreview.addEventListener('click', function() {
        previewOverlay.classList.remove('active');
        document.body.style.overflow = '';
    });

    // Close preview on overlay click
    previewOverlay.addEventListener('click', function(e) {
        if (e.target === previewOverlay) {
            previewOverlay.classList.remove('active');
            document.body.style.overflow = '';
        }
    });

    // Close preview on ESC key
    document.addEventListener('keydown', function(e) {
        if (e.key === 'Escape' && previewOverlay.classList.contains('active')) {
            previewOverlay.classList.remove('active');
            document.body.style.overflow = '';
        }
    });
}

// View button functionality
function initViewButtons() {
    document.addEventListener('click', function(e) {
        if (e.target.closest('.view-btn')) {
            const item = e.target.closest('.menu-item');
            const img = item.querySelector('.menu-item-image');
            const previewOverlay = document.getElementById('imagePreviewOverlay');
            const previewImage = document.getElementById('previewImage');
            
            if (img && previewOverlay && previewImage) {
                previewImage.src = img.src;
                previewImage.alt = img.alt;
                previewOverlay.classList.add('active');
                document.body.style.overflow = 'hidden';
            }
        }
    });
}

// Add to Cart functionality
function initAddToCartButtons() {
    document.addEventListener('click', function(e) {
        if (e.target.closest('.add-to-cart-btn')) {
            const btn = e.target.closest('.add-to-cart-btn');
            
            // Prevent action if button is disabled
            if (btn.disabled) {
                e.preventDefault();
                e.stopPropagation();
                return false;
            }
            
            const item = btn.closest('.menu-item');
            
            const productId = item.dataset.productId;
            const productName = item.dataset.name;
            
            // Find product to get first available variant
            const product = allProducts.find(p => p.id.toString() === productId);
            
            // Get first available variant if exists
            let variantId = null;
            if (product && product.variants && product.variants.length > 0) {
                const firstAvailableVariant = product.variants.find(v => v.stock_quantity > 0);
                if (firstAvailableVariant) {
                    variantId = firstAvailableVariant.id;
                }
            }
            
            // Add to cart
            addItemToCart(productId, variantId, productName, btn);
        }
    });
}

// Add item to cart via API
async function addItemToCart(productId, variantId, productName, btn) {
    try {
        // Disable button during request
        const originalHTML = btn.innerHTML;
        btn.disabled = true;
        btn.innerHTML = '<i class="fas fa-spinner fa-spin"></i> Adding...';
        
        const response = await fetch('/cart/add', {
            method: 'POST',
            headers: {
                'Content-Type': 'application/json'
            },
            body: JSON.stringify({
                productId: parseInt(productId),
                variantId: variantId ? parseInt(variantId) : null,
                quantity: 1
            })
        });
        
        const data = await response.json();
        
        // Check if user is not authenticated (401 or redirect response)
        if (response.status === 401 || response.redirected) {
            showBootstrapToast('Login Required', 'Please login to add items to cart', 'warning');
            setTimeout(() => {
                window.location.href = '/login';
            }, 1500);
            return;
        }
        
        if (response.ok && data.success) {
            // Success feedback
            btn.innerHTML = '<i class="fas fa-check"></i> Added!';
            btn.style.background = 'linear-gradient(135deg, #2e7d32, #1b5e20)';
            
            // Show Bootstrap toast
            if (data.updated) {
                showBootstrapToast('Cart Updated', `${productName} quantity updated in cart!`, 'warning');
            } else {
                showBootstrapToast('Added to Cart', `${productName} has been added to your cart!`, 'success');
            }
            
            setTimeout(() => {
                btn.innerHTML = originalHTML;
                btn.style.background = '';
                btn.disabled = false;
            }, 2000);
        } else {
            throw new Error(data.message || 'Failed to add to cart');
        }
    } catch (error) {
        console.error('Error adding to cart:', error);
        
        // Check if error is due to authentication
        if (error.message && error.message.includes('Unauthorized')) {
            showBootstrapToast('Login Required', 'Please login to add items to cart', 'warning');
            setTimeout(() => {
                window.location.href = '/login';
            }, 1500);
        } else {
            showBootstrapToast('Error', error.message || 'Failed to add to cart', 'danger');
        }
        
        // Reset button
        btn.innerHTML = '<i class="fas fa-cart-plus"></i> Add to Cart';
        btn.disabled = false;
    }
}

// Bootstrap Toast notification
function showBootstrapToast(title, message, type = 'success') {
    // Create toast container if it doesn't exist
    let toastContainer = document.querySelector('.toast-container');
    if (!toastContainer) {
        toastContainer = document.createElement('div');
        toastContainer.className = 'toast-container position-fixed bottom-0 end-0 p-3';
        toastContainer.style.zIndex = '9999';
        document.body.appendChild(toastContainer);
    }
    
    // Icon and color based on type
    const icons = {
        success: 'fa-check-circle',
        warning: 'fa-exclamation-circle',
        danger: 'fa-times-circle',
        info: 'fa-info-circle'
    };
    
    const textColors = {
        success: 'text-success',
        warning: 'text-warning',
        danger: 'text-danger',
        info: 'text-info'
    };
    
    const bgColors = {
        success: '#d4edda',
        warning: '#fff3cd',
        danger: '#f8d7da',
        info: '#d1ecf1'
    };
    
    const borderColors = {
        success: '#c3e6cb',
        warning: '#ffeaa7',
        danger: '#f5c6cb',
        info: '#bee5eb'
    };
    
    // Create unique ID for this toast
    const toastId = 'toast-' + Date.now();
    
    // Create toast element
    const toastEl = document.createElement('div');
    toastEl.id = toastId;
    toastEl.className = 'toast';
    toastEl.setAttribute('role', 'alert');
    toastEl.setAttribute('aria-live', 'assertive');
    toastEl.setAttribute('aria-atomic', 'true');
    toastEl.style.minWidth = '250px';
    toastEl.style.backgroundColor = bgColors[type];
    toastEl.style.border = `1px solid ${borderColors[type]}`;
    
    toastEl.innerHTML = `
        <div class="toast-header" style="background-color: white; border-bottom: 1px solid ${borderColors[type]};">
            <i class="fas ${icons[type]} ${textColors[type]} me-2"></i>
            <strong class="me-auto ${textColors[type]}">${title}</strong>
            <button type="button" class="btn-close" data-bs-dismiss="toast" aria-label="Close"></button>
        </div>
        <div class="toast-body" style="color: #333;">
            ${message}
        </div>
    `;
    
    toastContainer.appendChild(toastEl);
    
    // Initialize and show Bootstrap toast
    const bsToast = new bootstrap.Toast(toastEl, {
        autohide: true,
        delay: 3000
    });
    
    bsToast.show();
    
    // Remove toast element after it's hidden
    toastEl.addEventListener('hidden.bs.toast', function() {
        toastEl.remove();
    });
}