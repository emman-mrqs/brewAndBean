// Admin Products Management - Clean Implementation
(function() {
    'use strict';

    // Configuration
    const API_BASE = '/admin/api/products';
    const PAGE_SIZE = 10;

    // State
    let allProducts = [];
    let filteredProducts = [];
    let currentPage = 1;
    let searchTerm = '';
    let isLoading = false;
    let currentEditingId = null;

    // DOM Elements
    let elements = {};

    // Initialize on DOM ready
    document.addEventListener('DOMContentLoaded', init);

    function init() {
        console.log('🚀 Products.js initializing...');
        cacheElements();
        console.log('📦 Elements cached:', {
            searchInput: !!elements.searchInput,
            addBtn: !!elements.addBtn,
            tableBody: !!elements.tableBody,
            pagination: !!elements.pagination,
            productModal: !!elements.productModal,
            deleteModal: !!elements.deleteModal
        });
        attachEventListeners();
        console.log('🔗 Event listeners attached');
        loadProducts();
        console.log('📊 Loading products...');
    }

    function cacheElements() {
        elements = {
            searchInput: document.getElementById('productSearch'),
            addBtn: document.getElementById('addProductBtn'),
            tableBody: document.getElementById('productsTableBody'),
            pagination: document.getElementById('productsPagination'),
            productModal: document.getElementById('productModal'),
            productForm: document.getElementById('productForm'),
            productFormSubmit: document.getElementById('productFormSubmit'),
            productModalTitle: document.getElementById('productModalTitle'),
            deleteModal: document.getElementById('deleteModal'),
            deleteMessage: document.getElementById('deleteMessage'),
            deleteProductId: document.getElementById('deleteProductId'),
            confirmDelete: document.getElementById('confirmDelete'),
            imageInput: document.getElementById('productFormImage'),
            imagePreview: document.getElementById('imagePreview'),
            imagePreviewContainer: document.getElementById('imagePreviewContainer'),
            toastContainer: document.getElementById('toastContainer')
        };
    }

    function attachEventListeners() {
        // Search with debounce
        if (elements.searchInput) {
            elements.searchInput.addEventListener('input', debounce(handleSearch, 300));
        }

        // Add product button
        if (elements.addBtn) {
            elements.addBtn.addEventListener('click', openAddModal);
        }

        // Form submit
        if (elements.productFormSubmit) {
            elements.productFormSubmit.addEventListener('click', handleFormSubmit);
        }

        // Delete confirm
        if (elements.confirmDelete) {
            elements.confirmDelete.addEventListener('click', handleDelete);
        }

        // Image preview
        if (elements.imageInput) {
            elements.imageInput.addEventListener('change', handleImagePreview);
        }

        // Table event delegation for edit/delete buttons
        if (elements.tableBody) {
            console.log('Attaching click listener to table body');
            elements.tableBody.addEventListener('click', handleTableAction);
            // Test that it's attached
            elements.tableBody.addEventListener('click', function(e) {
                console.log('Table body clicked:', e.target);
            }, { capture: true });
        } else {
            console.error('Table body element not found!');
        }

        // Modal cleanup on hide
        if (elements.productModal) {
            elements.productModal.addEventListener('hidden.bs.modal', resetForm);
        }
    }

    // API Functions
    async function loadProducts() {
        if (isLoading) return;
        isLoading = true;

        try {
            const response = await fetch(API_BASE, {
                credentials: 'same-origin'
            });
            const data = await response.json();

            if (data.success) {
                allProducts = data.products || [];
                applyFiltersAndRender();
            } else {
                showToast('Failed to load products', 'danger');
            }
        } catch (error) {
            console.error('Error loading products:', error);
            showToast('Error loading products', 'danger');
        } finally {
            isLoading = false;
        }
    }

    async function saveProduct(formData, isEdit = false) {
        const productId = currentEditingId;
        const url = isEdit ? `${API_BASE}/${productId}` : API_BASE;
        const method = isEdit ? 'PUT' : 'POST';

        try {
            const response = await fetch(url, {
                method: method,
                body: formData,
                credentials: 'same-origin'
            });

            const data = await response.json();

            if (data.success) {
                showToast(`Product ${isEdit ? 'updated' : 'created'} successfully`, 'success');
                closeModal(elements.productModal);
                loadProducts();
                return true;
            } else {
                showToast(data.message || `Failed to ${isEdit ? 'update' : 'create'} product`, 'danger');
                return false;
            }
        } catch (error) {
            console.error('Error saving product:', error);
            showToast('Error saving product', 'danger');
            return false;
        }
    }

    async function deleteProduct(productId) {
        try {
            const response = await fetch(`${API_BASE}/${productId}`, {
                method: 'DELETE',
                credentials: 'same-origin'
            });

            const data = await response.json();

            if (data.success) {
                showToast('Product deleted successfully', 'success');
                closeModal(elements.deleteModal);
                loadProducts();
                return true;
            } else {
                showToast(data.message || 'Failed to delete product', 'danger');
                return false;
            }
        } catch (error) {
            console.error('Error deleting product:', error);
            showToast('Error deleting product', 'danger');
            return false;
        }
    }

    // UI Functions
    function applyFiltersAndRender() {
        const query = searchTerm.toLowerCase().trim();

        if (!query) {
            filteredProducts = [...allProducts];
        } else {
            filteredProducts = allProducts.filter(product => {
                return (
                    product.name?.toLowerCase().includes(query) ||
                    product.variant_name?.toLowerCase().includes(query) ||
                    product.id?.toString().includes(query)
                );
            });
        }

        const totalPages = Math.max(1, Math.ceil(filteredProducts.length / PAGE_SIZE));
        if (currentPage > totalPages) currentPage = totalPages;

        renderTable();
        renderPagination();
    }

    function renderTable() {
        if (!elements.tableBody) return;

        const start = (currentPage - 1) * PAGE_SIZE;
        const end = start + PAGE_SIZE;
        const pageProducts = filteredProducts.slice(start, end);

        if (pageProducts.length === 0) {
            elements.tableBody.innerHTML = `
                <tr>
                    <td colspan="7" class="text-center py-4">
                        <i class="fas fa-box-open fa-3x text-muted mb-3"></i>
                        <p class="text-muted">No products found</p>
                    </td>
                </tr>
            `;
            return;
        }

        elements.tableBody.innerHTML = pageProducts.map(product => `
            <tr data-product-id="${product.id}">
                <td>${product.id}</td>
                <td>
                    <div class="product-cell">
                        ${product.img_url ? 
                            `<img src="${escapeHtml(product.img_url)}" alt="${escapeHtml(product.name)}" class="product-thumb">` : 
                            `<div class="product-thumb d-flex align-items-center justify-content-center bg-light">
                                <i class="fas fa-coffee text-muted"></i>
                            </div>`
                        }
                        <span>${escapeHtml(product.name)}</span>
                    </div>
                </td>
                <td>${escapeHtml(product.variant_name || '-')}</td>
                <td>${formatCurrency(product.price)}</td>
                <td>${product.stock_quantity ?? '-'}</td>
                <td>
                    <span class="status-badge ${product.price != null ? 'active' : 'suspended'}">
                        ${product.price != null ? 'Active' : 'Draft'}
                    </span>
                </td>
                <td>
                    <div class="action-buttons">
                        <button class="btn-icon btn-edit" data-id="${product.id}" title="Edit">
                            <i class="fas fa-edit"></i>
                        </button>
                        <button class="btn-icon btn-delete" data-id="${product.id}" title="Delete">
                            <i class="fas fa-trash"></i>
                        </button>
                    </div>
                </td>
            </tr>
        `).join('');
    }

    function renderPagination() {
        if (!elements.pagination) return;

        const total = filteredProducts.length;
        const totalPages = Math.max(1, Math.ceil(total / PAGE_SIZE));
        const start = total === 0 ? 0 : (currentPage - 1) * PAGE_SIZE + 1;
        const end = Math.min(total, currentPage * PAGE_SIZE);

        let html = `
            <div class="pagination-info">
                Showing ${start}-${end} of ${total} products
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

    // Event Handlers
    function handleSearch(e) {
        searchTerm = e.target.value;
        currentPage = 1;
        applyFiltersAndRender();
    }

    function handleTableAction(e) {
        const editBtn = e.target.closest('.btn-edit');
        const deleteBtn = e.target.closest('.btn-delete');

        if (editBtn) {
            e.preventDefault();
            e.stopPropagation();
            const productId = editBtn.dataset.id;
            console.log('Edit clicked for product ID:', productId);
            const product = allProducts.find(p => String(p.id) === String(productId));
            console.log('Found product:', product);
            if (product) {
                openEditModal(product);
            } else {
                console.error('Product not found in allProducts array');
            }
        } else if (deleteBtn) {
            e.preventDefault();
            e.stopPropagation();
            const productId = deleteBtn.dataset.id;
            console.log('Delete clicked for product ID:', productId);
            const product = allProducts.find(p => String(p.id) === String(productId));
            console.log('Found product:', product);
            if (product) {
                openDeleteModal(product);
            } else {
                console.error('Product not found in allProducts array');
            }
        }
    }

    async function handleFormSubmit(e) {
        e.preventDefault();
        
        if (!validateForm()) return;

        const formData = new FormData(elements.productForm);
        const isEdit = currentEditingId !== null;

        // Disable submit button during save
        elements.productFormSubmit.disabled = true;
        elements.productFormSubmit.innerHTML = '<span class="spinner-border spinner-border-sm me-2"></span>Saving...';

        try {
            await saveProduct(formData, isEdit);
        } finally {
            elements.productFormSubmit.disabled = false;
            elements.productFormSubmit.textContent = 'Save Product';
        }
    }

    async function handleDelete() {
        const productId = parseInt(elements.deleteProductId.value);
        if (!productId) return;

        elements.confirmDelete.disabled = true;
        elements.confirmDelete.innerHTML = '<span class="spinner-border spinner-border-sm me-2"></span>Deleting...';

        try {
            await deleteProduct(productId);
        } finally {
            elements.confirmDelete.disabled = false;
            elements.confirmDelete.textContent = 'Delete';
        }
    }

    function handleImagePreview(e) {
        const file = e.target.files[0];
        if (file) {
            const reader = new FileReader();
            reader.onload = function(e) {
                elements.imagePreview.src = e.target.result;
                elements.imagePreviewContainer.style.display = 'block';
            };
            reader.readAsDataURL(file);
        } else {
            elements.imagePreviewContainer.style.display = 'none';
        }
    }

    // Modal Functions
    function openAddModal() {
        currentEditingId = null;
        elements.productModalTitle.textContent = 'Add Product';
        elements.productFormSubmit.textContent = 'Create Product';
        elements.imageInput.required = true;
        resetForm();
        openModal(elements.productModal);
    }

    function openEditModal(product) {
        currentEditingId = product.id;
        elements.productModalTitle.textContent = 'Edit Product';
        elements.productFormSubmit.textContent = 'Update Product';
        elements.imageInput.required = false;

        // Populate form
        document.getElementById('productFormId').value = product.id;
        document.getElementById('productFormName').value = product.name || '';
        document.getElementById('productFormPrice').value = product.price || '';
        document.getElementById('productFormVariant').value = product.variant_name || '';
        document.getElementById('productFormStock').value = product.stock_quantity || '';
        document.getElementById('productFormDescription').value = product.description || '';

        // Show current image
        if (product.img_url) {
            elements.imagePreview.src = product.img_url;
            elements.imagePreviewContainer.style.display = 'block';
        }

        openModal(elements.productModal);
    }

    function openDeleteModal(product) {
        elements.deleteMessage.textContent = `Are you sure you want to delete "${product.name}"? This action cannot be undone.`;
        elements.deleteProductId.value = product.id;
        openModal(elements.deleteModal);
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

    function resetForm() {
        if (elements.productForm) {
            elements.productForm.reset();
            elements.productForm.classList.remove('was-validated');
            elements.imagePreviewContainer.style.display = 'none';
        }
        currentEditingId = null;
    }

    // Validation
    function validateForm() {
        if (!elements.productForm.checkValidity()) {
            elements.productForm.classList.add('was-validated');
            showToast('Please fill in all required fields', 'warning');
            return false;
        }

        const price = parseFloat(document.getElementById('productFormPrice').value);
        if (price < 0) {
            showToast('Price cannot be negative', 'warning');
            return false;
        }

        const stock = parseInt(document.getElementById('productFormStock').value);
        if (stock < 0) {
            showToast('Stock quantity cannot be negative', 'warning');
            return false;
        }

        const imageFile = elements.imageInput.files[0];
        if (imageFile) {
            const maxSize = 5 * 1024 * 1024; // 5MB
            if (imageFile.size > maxSize) {
                showToast('Image file size must be less than 5MB', 'warning');
                return false;
            }

            const allowedTypes = ['image/jpeg', 'image/jpg', 'image/png', 'image/webp', 'image/gif'];
            if (!allowedTypes.includes(imageFile.type)) {
                showToast('Invalid image format. Please use JPEG, PNG, WebP, or GIF', 'warning');
                return false;
            }
        }

        return true;
    }

    // Utility Functions
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

    function formatCurrency(value) {
        if (value == null) return '-';
        return '₱' + parseFloat(value).toLocaleString('en-PH', {
            minimumFractionDigits: 2,
            maximumFractionDigits: 2
        });
    }

    function showToast(message, type = 'success') {
        if (!elements.toastContainer) return;

        const toastId = 'toast-' + Date.now();
        const bgClass = type === 'success' ? 'bg-success' : type === 'danger' ? 'bg-danger' : 'bg-warning';
        
        const toastHtml = `
            <div id="${toastId}" class="toast align-items-center text-white ${bgClass} border-0" role="alert">
                <div class="d-flex">
                    <div class="toast-body">
                        <i class="fas fa-${type === 'success' ? 'check-circle' : type === 'danger' ? 'exclamation-circle' : 'exclamation-triangle'} me-2"></i>
                        ${escapeHtml(message)}
                    </div>
                    <button type="button" class="btn-close btn-close-white me-2 m-auto" data-bs-dismiss="toast"></button>
                </div>
            </div>
        `;

        const toastElement = createElementFromHTML(toastHtml);
        elements.toastContainer.appendChild(toastElement);

        const toast = new bootstrap.Toast(toastElement, {
            autohide: true,
            delay: 4000
        });

        toastElement.addEventListener('hidden.bs.toast', () => {
            toastElement.remove();
        });

        toast.show();
    }

    function createElementFromHTML(htmlString) {
        const div = document.createElement('div');
        div.innerHTML = htmlString.trim();
        return div.firstChild;
    }

})();
