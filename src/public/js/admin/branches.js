/* ============================================
   BRANCHES MANAGEMENT JAVASCRIPT
   ============================================ */

let branches = [];
let filteredBranches = [];
let currentPage = 1;
const itemsPerPage = 10;
let editingBranchId = null;

// Initialize when DOM is loaded
document.addEventListener('DOMContentLoaded', function() {
    loadBranches();
    initEventListeners();
});

// Initialize event listeners
function initEventListeners() {
    // Add Branch Button
    document.getElementById('addBranchBtn').addEventListener('click', openAddModal);
    
    // Save Branch Button
    document.getElementById('saveBranchBtn').addEventListener('click', saveBranch);
    
    // Delete Confirmation Button
    document.getElementById('confirmDeleteBtn').addEventListener('click', deleteBranch);
    
    // Search Input
    document.getElementById('searchInput').addEventListener('input', handleSearch);
    
    // City Filter
    document.getElementById('cityFilter').addEventListener('change', handleFilter);
    
    // Form Submit
    document.getElementById('branchForm').addEventListener('submit', function(e) {
        e.preventDefault();
        saveBranch();
    });
}

// Load branches from server
async function loadBranches() {
    try {
        const response = await fetch('/api/admin/branches');
        const data = await response.json();
        
        if (data.success) {
            branches = data.branches || [];
            filteredBranches = [...branches];
            updateStats();
            updateCityFilter();
            displayBranches();
        } else {
            showToast('Error loading branches', 'danger');
        }
    } catch (error) {
        console.error('Error loading branches:', error);
        showToast('Failed to load branches', 'danger');
        displayEmptyState();
    }
}

// Update statistics
function updateStats() {
    document.getElementById('totalBranches').textContent = branches.length;
    document.getElementById('activeBranches').textContent = branches.length;
    
    const uniqueCities = [...new Set(branches.map(b => b.city))].length;
    document.getElementById('totalCities').textContent = uniqueCities;
}

// Update city filter options
function updateCityFilter() {
    const cityFilter = document.getElementById('cityFilter');
    const uniqueCities = [...new Set(branches.map(b => b.city))].sort();
    
    cityFilter.innerHTML = '<option value="">All Cities</option>';
    uniqueCities.forEach(city => {
        const option = document.createElement('option');
        option.value = city;
        option.textContent = city;
        cityFilter.appendChild(option);
    });
}

// Display branches in table
function displayBranches() {
    const tbody = document.getElementById('branchesTableBody');
    
    if (filteredBranches.length === 0) {
        displayEmptyState();
        return;
    }
    
    const start = (currentPage - 1) * itemsPerPage;
    const end = start + itemsPerPage;
    const paginatedBranches = filteredBranches.slice(start, end);
    
    tbody.innerHTML = paginatedBranches.map(branch => `
        <tr id="row-${branch.id}" data-branch-id="${branch.id}">
            <td class="view-mode">${branch.id}</td>
            <td class="view-mode"><strong>${branch.name}</strong></td>
            <td class="view-mode">${branch.street || '-'}</td>
            <td class="view-mode">${branch.city || '-'}</td>
            <td class="view-mode">${branch.zipcode || '-'}</td>
            <td class="view-mode">${formatDate(branch.created_at)}</td>
            <td class="text-center">
                <div class="action-buttons view-mode">
                    <button class="btn-icon btn-edit" onclick="enterEditMode(${branch.id})" title="Edit Branch">
                        <i class="fas fa-edit"></i>
                    </button>
                    <button class="btn-icon btn-delete" onclick="openDeleteModal(${branch.id})" title="Delete Branch">
                        <i class="fas fa-trash"></i>
                    </button>
                </div>
                <div class="action-buttons edit-mode" style="display: none;">
                    <button class="btn-icon btn-save" onclick="saveInlineEdit(${branch.id})" title="Save Changes">
                        <i class="fas fa-check"></i>
                    </button>
                    <button class="btn-icon btn-cancel" onclick="cancelEditMode(${branch.id})" title="Cancel">
                        <i class="fas fa-times"></i>
                    </button>
                </div>
            </td>
        </tr>
    `).join('');
    
    updatePagination();
}

// Display empty state
function displayEmptyState() {
    const tbody = document.getElementById('branchesTableBody');
    tbody.innerHTML = `
        <tr>
            <td colspan="7" class="empty-state">
                <i class="fas fa-store"></i>
                <p>No branches found</p>
                <button class="btn-primary" onclick="openAddModal()">
                    <i class="fas fa-plus"></i> Add Your First Branch
                </button>
            </td>
        </tr>
    `;
    updatePagination();
}

// Update pagination
function updatePagination() {
    const totalPages = Math.ceil(filteredBranches.length / itemsPerPage);
    const pagination = document.getElementById('pagination');
    
    const start = (currentPage - 1) * itemsPerPage + 1;
    const end = Math.min(currentPage * itemsPerPage, filteredBranches.length);
    
    document.getElementById('showingStart').textContent = filteredBranches.length > 0 ? start : 0;
    document.getElementById('showingEnd').textContent = end;
    document.getElementById('totalEntries').textContent = filteredBranches.length;
    
    let paginationHTML = `
        <button ${currentPage === 1 ? 'disabled' : ''} onclick="goToPage(${currentPage - 1})">
            <i class="fas fa-chevron-left"></i>
        </button>
    `;
    
    for (let i = 1; i <= totalPages; i++) {
        if (i === 1 || i === totalPages || (i >= currentPage - 1 && i <= currentPage + 1)) {
            paginationHTML += `
                <button class="${i === currentPage ? 'active' : ''}" onclick="goToPage(${i})">
                    ${i}
                </button>
            `;
        } else if (i === currentPage - 2 || i === currentPage + 2) {
            paginationHTML += '<button disabled>...</button>';
        }
    }
    
    paginationHTML += `
        <button ${currentPage === totalPages ? 'disabled' : ''} onclick="goToPage(${currentPage + 1})">
            <i class="fas fa-chevron-right"></i>
        </button>
    `;
    
    pagination.innerHTML = paginationHTML;
}

// Go to page
function goToPage(page) {
    currentPage = page;
    displayBranches();
}

// Handle search
function handleSearch(e) {
    const searchTerm = e.target.value.toLowerCase();
    
    filteredBranches = branches.filter(branch => 
        branch.name.toLowerCase().includes(searchTerm) ||
        (branch.street && branch.street.toLowerCase().includes(searchTerm)) ||
        (branch.city && branch.city.toLowerCase().includes(searchTerm)) ||
        (branch.zipcode && branch.zipcode.toLowerCase().includes(searchTerm))
    );
    
    currentPage = 1;
    displayBranches();
}

// Handle filter
function handleFilter(e) {
    const city = e.target.value;
    
    if (city) {
        filteredBranches = branches.filter(branch => branch.city === city);
    } else {
        filteredBranches = [...branches];
    }
    
    currentPage = 1;
    displayBranches();
}

// Open Add Modal
function openAddModal() {
    editingBranchId = null;
    
    const modalTitleText = document.getElementById('modalTitleText');
    const saveButtonText = document.getElementById('saveButtonText');
    const saveBtn = document.getElementById('saveBranchBtn');
    
    // Reset modal title
    if (modalTitleText) {
        modalTitleText.textContent = 'Add New Branch';
    }
    
    // Reset save button - recreate proper structure if needed
    if (saveBtn) {
        saveBtn.innerHTML = '<i class="fas fa-save"></i> <span id="saveButtonText">Save Branch</span>';
    }
    
    // Reset form
    document.getElementById('branchForm').reset();
    document.getElementById('branchId').value = '';
    
    const modal = new bootstrap.Modal(document.getElementById('branchModal'));
    modal.show();
}

// Open Edit Modal
function openEditModal(branchId) {
    const branch = branches.find(b => b.id === branchId);
    if (!branch) return;
    
    editingBranchId = branchId;
    
    const modalTitleText = document.getElementById('modalTitleText');
    const saveBtn = document.getElementById('saveBranchBtn');
    
    // Reset modal title
    if (modalTitleText) {
        modalTitleText.textContent = 'Edit Branch';
    }
    
    // Reset save button - recreate proper structure if needed
    if (saveBtn) {
        saveBtn.innerHTML = '<i class="fas fa-save"></i> <span id="saveButtonText">Update Branch</span>';
    }
    
    document.getElementById('branchId').value = branch.id;
    document.getElementById('branchName').value = branch.name;
    document.getElementById('branchStreet').value = branch.street || '';
    document.getElementById('branchCity').value = branch.city || '';
    document.getElementById('branchZipcode').value = branch.zipcode || '';
    
    const modal = new bootstrap.Modal(document.getElementById('branchModal'));
    modal.show();
}

// Enter inline edit mode
function enterEditMode(branchId) {
    console.log('Entering edit mode for branch:', branchId);
    console.log('Available branches:', branches);
    console.log('Branch ID type:', typeof branchId);
    
    // Convert branchId to number for comparison
    const numericBranchId = Number(branchId);
    const branch = branches.find(b => Number(b.id) === numericBranchId);
    
    if (!branch) {
        console.error('Branch not found:', branchId);
        console.error('Searched in branches:', branches.map(b => b.id));
        return;
    }
    
    const row = document.getElementById(`row-${branchId}`);
    if (!row) {
        console.error('Row not found:', `row-${branchId}`);
        return;
    }
    
    const cells = row.querySelectorAll('td');
    
    // Store original values
    row.dataset.originalName = branch.name;
    row.dataset.originalStreet = branch.street || '';
    row.dataset.originalCity = branch.city || '';
    row.dataset.originalZipcode = branch.zipcode || '';
    
    // Replace cells with input fields (escape quotes in values)
    const escapedName = (branch.name || '').replace(/"/g, '&quot;');
    const escapedStreet = (branch.street || '').replace(/"/g, '&quot;');
    const escapedCity = (branch.city || '').replace(/"/g, '&quot;');
    const escapedZipcode = (branch.zipcode || '').replace(/"/g, '&quot;');
    
    cells[1].innerHTML = `<input type="text" class="edit-input" value="${escapedName}" id="edit-name-${branchId}" required>`;
    cells[2].innerHTML = `<input type="text" class="edit-input" value="${escapedStreet}" id="edit-street-${branchId}" required>`;
    cells[3].innerHTML = `<input type="text" class="edit-input" value="${escapedCity}" id="edit-city-${branchId}" required>`;
    cells[4].innerHTML = `<input type="text" class="edit-input" value="${escapedZipcode}" id="edit-zipcode-${branchId}" maxlength="10">`;
    
    // Toggle action buttons
    const viewButtons = row.querySelector('.action-buttons.view-mode');
    const editButtons = row.querySelector('.action-buttons.edit-mode');
    
    if (viewButtons) viewButtons.style.display = 'none';
    if (editButtons) editButtons.style.display = 'flex';
    
    // Add editing class to row
    row.classList.add('editing-row');
    
    // Focus first input
    const firstInput = document.getElementById(`edit-name-${branchId}`);
    if (firstInput) {
        setTimeout(() => firstInput.focus(), 100);
    }
}

// Cancel edit mode
function cancelEditMode(branchId) {
    const row = document.getElementById(`row-${branchId}`);
    if (!row) return;
    
    const cells = row.querySelectorAll('td');
    
    // Restore original values
    cells[1].innerHTML = `<strong>${row.dataset.originalName}</strong>`;
    cells[2].innerHTML = row.dataset.originalStreet || '-';
    cells[3].innerHTML = row.dataset.originalCity || '-';
    cells[4].innerHTML = row.dataset.originalZipcode || '-';
    
    // Toggle action buttons
    const viewButtons = row.querySelector('.action-buttons.view-mode');
    const editButtons = row.querySelector('.action-buttons.edit-mode');
    
    if (viewButtons) viewButtons.style.display = 'flex';
    if (editButtons) editButtons.style.display = 'none';
    
    // Remove editing class
    row.classList.remove('editing-row');
}

// Save inline edit
async function saveInlineEdit(branchId) {
    const name = document.getElementById(`edit-name-${branchId}`).value.trim();
    const street = document.getElementById(`edit-street-${branchId}`).value.trim();
    const city = document.getElementById(`edit-city-${branchId}`).value.trim();
    const zipcode = document.getElementById(`edit-zipcode-${branchId}`).value.trim();
    
    // Validation
    if (!name || !street || !city) {
        showToast('Please fill in all required fields', 'warning');
        return;
    }
    
    const branchData = { name, street, city, zipcode };
    
    try {
        const response = await fetch(`/api/admin/branches/${branchId}`, {
            method: 'PUT',
            headers: {
                'Content-Type': 'application/json'
            },
            body: JSON.stringify(branchData)
        });
        
        const data = await response.json();
        
        if (data.success) {
            showToast('Branch updated successfully', 'success');
            
            // Reload branches from server to get fresh data
            await loadBranches();
        } else {
            showToast(data.message || 'Failed to update branch', 'danger');
        }
    } catch (error) {
        console.error('Error updating branch:', error);
        showToast('Failed to update branch', 'danger');
    }
}

// Save Branch
async function saveBranch() {
    const form = document.getElementById('branchForm');
    
    if (!form.checkValidity()) {
        form.reportValidity();
        return;
    }
    
    const branchData = {
        name: document.getElementById('branchName').value.trim(),
        street: document.getElementById('branchStreet').value.trim(),
        city: document.getElementById('branchCity').value.trim(),
        zipcode: document.getElementById('branchZipcode').value.trim()
    };
    
    const saveBtn = document.getElementById('saveBranchBtn');
    saveBtn.disabled = true;
    saveBtn.innerHTML = '<i class="fas fa-spinner fa-spin"></i> Saving...';
    
    try {
        const url = editingBranchId 
            ? `/api/admin/branches/${editingBranchId}`
            : '/api/admin/branches';
        
        const method = editingBranchId ? 'PUT' : 'POST';
        
        const response = await fetch(url, {
            method: method,
            headers: {
                'Content-Type': 'application/json'
            },
            body: JSON.stringify(branchData)
        });
        
        const data = await response.json();
        
        if (data.success) {
            showToast(
                editingBranchId ? 'Branch updated successfully' : 'Branch added successfully',
                'success'
            );
            
            const modal = bootstrap.Modal.getInstance(document.getElementById('branchModal'));
            modal.hide();
            
            // Reset button state before reloading
            saveBtn.disabled = false;
            saveBtn.innerHTML = '<i class="fas fa-save"></i> <span id="saveButtonText">Save Branch</span>';
            
            await loadBranches();
        } else {
            showToast(data.message || 'Failed to save branch', 'danger');
            saveBtn.disabled = false;
            saveBtn.innerHTML = '<i class="fas fa-save"></i> <span id="saveButtonText">' + 
                (editingBranchId ? 'Update Branch' : 'Save Branch') + '</span>';
        }
    } catch (error) {
        console.error('Error saving branch:', error);
        showToast('Failed to save branch', 'danger');
        saveBtn.disabled = false;
        saveBtn.innerHTML = '<i class="fas fa-save"></i> <span id="saveButtonText">' + 
            (editingBranchId ? 'Update Branch' : 'Save Branch') + '</span>';
    }
}

// Open Delete Modal
function openDeleteModal(branchId) {
    const numericBranchId = Number(branchId);
    const branch = branches.find(b => Number(b.id) === numericBranchId);
    if (!branch) return;
    
    editingBranchId = numericBranchId;
    document.getElementById('deleteBranchName').textContent = branch.name;
    document.getElementById('deleteBranchAddress').textContent = 
        `${branch.street || ''}, ${branch.city || ''} ${branch.zipcode || ''}`.trim();
    
    const modal = new bootstrap.Modal(document.getElementById('deleteBranchModal'));
    modal.show();
}

// Delete Branch
async function deleteBranch() {
    if (!editingBranchId) return;
    
    const deleteBtn = document.getElementById('confirmDeleteBtn');
    deleteBtn.disabled = true;
    deleteBtn.innerHTML = '<i class="fas fa-spinner fa-spin"></i> Deleting...';
    
    try {
        const response = await fetch(`/api/admin/branches/${editingBranchId}`, {
            method: 'DELETE'
        });
        
        const data = await response.json();
        
        if (data.success) {
            showToast('Branch deleted successfully', 'success');
            
            const modal = bootstrap.Modal.getInstance(document.getElementById('deleteBranchModal'));
            modal.hide();
            
            loadBranches();
        } else {
            showToast(data.message || 'Failed to delete branch', 'danger');
        }
    } catch (error) {
        console.error('Error deleting branch:', error);
        showToast('Failed to delete branch', 'danger');
    } finally {
        deleteBtn.disabled = false;
        deleteBtn.innerHTML = '<i class="fas fa-trash"></i> Delete Branch';
        editingBranchId = null;
    }
}

// Show Toast Notification (Bootstrap)
function showToast(message, type = 'info') {
    // Create toast container if it doesn't exist
    let toastContainer = document.querySelector('.toast-container');
    if (!toastContainer) {
        toastContainer = document.createElement('div');
        toastContainer.className = 'toast-container position-fixed bottom-0 end-0 p-3';
        toastContainer.style.zIndex = '10001';
        document.body.appendChild(toastContainer);
    }
    
    // Map types to Bootstrap classes
    const toastTypes = {
        success: { bg: 'bg-success', icon: 'fa-check-circle', title: 'Success' },
        danger: { bg: 'bg-danger', icon: 'fa-times-circle', title: 'Error' },
        warning: { bg: 'bg-warning', icon: 'fa-exclamation-triangle', title: 'Warning' },
        info: { bg: 'bg-info', icon: 'fa-info-circle', title: 'Info' }
    };
    
    const toastConfig = toastTypes[type] || toastTypes.info;
    const toastId = 'toast-' + Date.now();
    
    // Create Bootstrap toast
    const toastEl = document.createElement('div');
    toastEl.className = 'toast';
    toastEl.id = toastId;
    toastEl.setAttribute('role', 'alert');
    toastEl.setAttribute('aria-live', 'assertive');
    toastEl.setAttribute('aria-atomic', 'true');
    
    toastEl.innerHTML = `
        <div class="toast-header ${toastConfig.bg} text-white">
            <i class="fas ${toastConfig.icon} me-2"></i>
            <strong class="me-auto">${toastConfig.title}</strong>
            <button type="button" class="btn-close btn-close-white" data-bs-dismiss="toast" aria-label="Close"></button>
        </div>
        <div class="toast-body">
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
    
    // Remove from DOM after hidden
    toastEl.addEventListener('hidden.bs.toast', () => {
        toastEl.remove();
    });
}

// Format date
function formatDate(dateString) {
    if (!dateString) return '-';
    const date = new Date(dateString);
    return date.toLocaleDateString('en-US', { 
        year: 'numeric', 
        month: 'short', 
        day: 'numeric' 
    });
}

// Make functions globally available
window.openAddModal = openAddModal;
window.openEditModal = openEditModal;
window.openDeleteModal = openDeleteModal;
window.goToPage = goToPage;
window.enterEditMode = enterEditMode;
window.cancelEditMode = cancelEditMode;
window.saveInlineEdit = saveInlineEdit;
