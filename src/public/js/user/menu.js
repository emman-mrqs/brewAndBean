/* ===== MENU PAGE SCRIPT =====
 * Order of execution:
 * 1. Tab switching setup (immediately)
 * 2. Scroll animations setup (immediately)
 * 3. Auto-inject buttons into all menu items (immediately)
 * 4. Populate "All" tab with cloned items (immediately after injection)
 * 5. Load favorites and re-populate All tab (on window.load)
 * ============================= */

// Tab switching functionality
function initTabSwitching() {
    const tabBtns = document.querySelectorAll('.tab-btn');
    const menuContents = document.querySelectorAll('.menu-content');

    tabBtns.forEach(btn => {
        btn.addEventListener('click', () => {
            const targetTab = btn.dataset.tab;
            
            // Remove active class from all buttons and contents
            tabBtns.forEach(b => b.classList.remove('active'));
            menuContents.forEach(content => content.classList.remove('active'));
            
            // Add active class to clicked button and corresponding content
            btn.classList.add('active');
            const targetContent = document.getElementById(targetTab);
            if (targetContent) {
                targetContent.classList.add('active');
            }
        });
    });
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

// Show/hide back to top button based on scroll position
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
    const menuImages = document.querySelectorAll('.menu-item-image');

    if (!previewOverlay || !previewImage || !closePreview) return;

    // Add click event to all menu images
    menuImages.forEach(img => {
        img.style.cursor = 'pointer';
        img.addEventListener('click', function() {
            previewImage.src = this.src;
            previewImage.alt = this.alt;
            previewOverlay.classList.add('active');
            document.body.style.overflow = 'hidden';
        });
    });

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

// Auto-inject buttons into all menu items that don't have them
function injectMenuButtons() {
    document.querySelectorAll('.menu-item').forEach(item => {
        const visual = item.querySelector('.menu-item-visual');
        const info = item.querySelector('.menu-item-info');
        const img = visual ? visual.querySelector('img') : null;
        const h3 = info ? info.querySelector('h3') : null;
        const price = info ? info.querySelector('.price') : null;
        
        // Add data attributes if missing
        if (!item.dataset.name && h3) item.dataset.name = h3.textContent.trim();
        if (!item.dataset.price && price) item.dataset.price = price.textContent.replace('$', '').trim();
        if (!item.dataset.img && img) item.dataset.img = img.src;
        if (!item.dataset.category) {
            const tab = item.closest('[id]');
            item.dataset.category = tab ? tab.id : 'all';
        }

        // Add favorite button if not exists
        if (visual && !visual.querySelector('.favorite-btn')) {
            const favBtn = document.createElement('button');
            favBtn.className = 'favorite-btn';
            favBtn.setAttribute('aria-label', 'Add to favorites');
            favBtn.innerHTML = '<i class="far fa-heart"></i>';
            visual.appendChild(favBtn);
        }

        // Add action buttons if not exists
        if (info && !info.querySelector('.menu-item-actions')) {
            const actions = document.createElement('div');
            actions.className = 'menu-item-actions';
            actions.innerHTML = `
                <button class="view-btn" title="View Details">
                    <i class="fas fa-eye"></i> View
                </button>
                <button class="add-to-cart-btn" title="Add to Cart">
                    <i class="fas fa-cart-plus"></i> Add to Cart
                </button>
            `;
            info.appendChild(actions);
        }
    });
}

// Populate "All" tab with items from all categories (after buttons are injected)
function populateAllTab() {
    const allGrid = document.querySelector('#all .menu-grid');
    const hotItems = document.querySelectorAll('#hot .menu-item');
    const coldItems = document.querySelectorAll('#cold .menu-item');
    const specialItems = document.querySelectorAll('#special .menu-item');
    
    console.log('Populating All tab...');
    console.log('Hot items:', hotItems.length);
    console.log('Cold items:', coldItems.length);
    console.log('Special items:', specialItems.length);
    console.log('All grid element:', allGrid);
    
    if (!allGrid) {
        console.error('All grid not found!');
        return;
    }
    
    // Clear any existing content
    allGrid.innerHTML = '';
    
    // Clone and append all items
    const allItems = [...hotItems, ...coldItems, ...specialItems];
    console.log('Total items to add:', allItems.length);
    
    allItems.forEach((item, index) => {
        const clone = item.cloneNode(true);
        allGrid.appendChild(clone);
        console.log('Added item', index + 1);
    });
    
    console.log('All tab populated with', allGrid.children.length, 'items');
}

// Favorite button functionality
function initFavoriteButtons() {
    document.addEventListener('click', function(e) {
        if (e.target.closest('.favorite-btn')) {
            const btn = e.target.closest('.favorite-btn');
            const icon = btn.querySelector('i');
            const item = btn.closest('.menu-item');
            const itemName = item.dataset.name;
            
            if (icon.classList.contains('far')) {
                icon.classList.remove('far');
                icon.classList.add('fas');
                btn.classList.add('active');
                
                // Save to localStorage
                let favorites = JSON.parse(localStorage.getItem('bb_favorites') || '[]');
                if (!favorites.includes(itemName)) {
                    favorites.push(itemName);
                    localStorage.setItem('bb_favorites', JSON.stringify(favorites));
                }
                
                showToast(`❤️ ${itemName} added to favorites!`);
            } else {
                icon.classList.remove('fas');
                icon.classList.add('far');
                btn.classList.remove('active');
                
                // Remove from localStorage
                let favorites = JSON.parse(localStorage.getItem('bb_favorites') || '[]');
                favorites = favorites.filter(f => f !== itemName);
                localStorage.setItem('bb_favorites', JSON.stringify(favorites));
                
                showToast(`${itemName} removed from favorites`);
            }
        }
    });
}

// Load favorites on page load
function loadFavorites() {
    const favorites = JSON.parse(localStorage.getItem('bb_favorites') || '[]');
    document.querySelectorAll('.menu-item').forEach(item => {
        if (favorites.includes(item.dataset.name)) {
            const btn = item.querySelector('.favorite-btn');
            if (btn) {
                const icon = btn.querySelector('i');
                if (icon) {
                    icon.classList.remove('far');
                    icon.classList.add('fas');
                    btn.classList.add('active');
                }
            }
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
            const item = btn.closest('.menu-item');
            
            const cartItem = {
                id: item.dataset.name.toLowerCase().replace(/\\s+/g, '-'),
                name: item.dataset.name,
                note: item.dataset.category.charAt(0).toUpperCase() + item.dataset.category.slice(1),
                price: parseFloat(item.dataset.price),
                qty: 1,
                selected: true,
                img: item.dataset.img
            };

            // Load existing cart
            let cart = JSON.parse(localStorage.getItem('bb_cart_items') || '[]');
            
            // Check if item already exists
            const existingIndex = cart.findIndex(c => c.id === cartItem.id);
            if (existingIndex >= 0) {
                cart[existingIndex].qty += 1;
                showToast(`📦 ${cartItem.name} quantity updated in cart!`);
            } else {
                cart.push(cartItem);
                showToast(`✅ ${cartItem.name} added to cart!`);
            }
            
            // Save cart
            localStorage.setItem('bb_cart_items', JSON.stringify(cart));
            
            // Visual feedback
            btn.innerHTML = '<i class="fas fa-check"></i> Added!';
            btn.style.background = 'linear-gradient(135deg, #2e7d32, #1b5e20)';
            setTimeout(() => {
                btn.innerHTML = '<i class="fas fa-cart-plus"></i> Add to Cart';
                btn.style.background = '';
            }, 2000);
        }
    });
}

// Toast notification
function showToast(message) {
    const existingToast = document.querySelector('.toast-notification');
    if (existingToast) existingToast.remove();
    
    const toast = document.createElement('div');
    toast.className = 'toast-notification';
    toast.textContent = message;
    document.body.appendChild(toast);
    
    setTimeout(() => toast.classList.add('show'), 100);
    setTimeout(() => {
        toast.classList.remove('show');
        setTimeout(() => toast.remove(), 300);
    }, 3000);
}

// Initialize everything when DOM is loaded
document.addEventListener('DOMContentLoaded', function() {
    initTabSwitching();
    initScrollAnimations();
    initBackToTop();
    initImagePreview();
    injectMenuButtons();
    populateAllTab();
    initFavoriteButtons();
    initViewButtons();
    initAddToCartButtons();
});

// Load favorites when window loads
window.addEventListener('load', function() {
    // Re-populate All tab to ensure it has all the buttons and data
    populateAllTab();
    loadFavorites();
});