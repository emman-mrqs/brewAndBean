// Admin Users JavaScript
// (sidebar toggle moved to /js/admin/adminHeader.js)

let usersData = []; // Store users data globally
let filteredUsers = []; // Store filtered users
let currentPage = 1;
const usersPerPage = 10;

document.addEventListener('DOMContentLoaded', function() {
    loadUsers();
    setupSearchFilter();
    setupSuspensionTypeToggle();
});

// Load all users from database
async function loadUsers() {
    try {
        const response = await fetch('/admin/api/users');
        const data = await response.json();

        if (data.success) {
            usersData = data.users;
            filteredUsers = data.users;
            currentPage = 1;
            displayCurrentPage();
        } else {
            console.error('Failed to load users:', data.message);
            showError('Failed to load users');
        }
    } catch (error) {
        console.error('Error loading users:', error);
        showError('Error loading users');
    }
}

// Display users in the table
function displayUsers(users) {
    const tbody = document.querySelector('.data-table tbody');
    
    if (!users || users.length === 0) {
        tbody.innerHTML = `
            <tr>
                <td colspan="5" style="text-align: center; padding: 40px;">
                    <i class="fas fa-users" style="font-size: 48px; color: #ccc; margin-bottom: 16px;"></i>
                    <p style="color: #999;">No users found</p>
                </td>
            </tr>
        `;
        return;
    }

    tbody.innerHTML = users.map((user, index) => {
        const initials = getInitials(user.fullName);
        const avatarColor = getAvatarColor(index);
        
        let statusBadge = '';
        if (user.status === 'suspended') {
            statusBadge = '<span class="status-badge suspended">Suspended</span>';
        } else if (user.status === 'active') {
            statusBadge = '<span class="status-badge active">Active</span>';
        } else {
            statusBadge = '<span class="status-badge pending">Pending</span>';
        }

        const isSuspended = user.isSuspended;
        const suspendButton = isSuspended
            ? `<button class="btn-icon" onclick="showLiftSuspensionModal(${user.id}, '${user.email}')" title="Lift Suspension">
                <i class="fas fa-unlock"></i>
               </button>`
            : `<button class="btn-icon" onclick="showSuspendModal(${user.id}, '${user.email}')" title="Suspend User">
                <i class="fas fa-ban"></i>
               </button>`;

        return `
            <tr data-user-id="${user.id}">
                <td>#${String(user.id).padStart(3, '0')}</td>
                <td>
                    <div class="user-cell">
                        <div class="user-avatar-sm" style="background: ${avatarColor};">${initials}</div>
                        <span class="user-name-display">${user.fullName}</span>
                        <div class="user-name-edit" style="display: none;">
                            <input type="text" class="form-control form-control-sm d-inline-block" 
                                   style="width: 120px; margin-right: 5px;" 
                                   value="${user.firstName || ''}" 
                                   data-field="firstName" 
                                   placeholder="First Name">
                            <input type="text" class="form-control form-control-sm d-inline-block" 
                                   style="width: 120px;" 
                                   value="${user.lastName || ''}" 
                                   data-field="lastName" 
                                   placeholder="Last Name">
                        </div>
                    </div>
                </td>
                <td>${user.email}</td>
                <td>${statusBadge}</td>
                <td>
                    <div class="action-buttons">
                        <button class="btn-icon btn-edit-mode" onclick="toggleEditMode(${user.id})" title="Edit User">
                            <i class="fas fa-edit"></i>
                        </button>
                        <button class="btn-icon btn-save-mode" style="display: none;" onclick="saveUser(${user.id})" title="Save Changes">
                            <i class="fas fa-save"></i>
                        </button>
                        <button class="btn-icon btn-cancel-mode" style="display: none;" onclick="cancelEdit(${user.id})" title="Cancel">
                            <i class="fas fa-times"></i>
                        </button>
                        ${suspendButton}
                        <button class="btn-icon delete" onclick="deleteUser(${user.id}, '${user.email}')" title="Delete User">
                            <i class="fas fa-trash"></i>
                        </button>
                    </div>
                </td>
            </tr>
        `;
    }).join('');
}

// Display current page of users
function displayCurrentPage() {
    const startIndex = (currentPage - 1) * usersPerPage;
    const endIndex = startIndex + usersPerPage;
    const usersToDisplay = filteredUsers.slice(startIndex, endIndex);
    
    displayUsers(usersToDisplay);
    updatePagination();
}

// Update pagination controls
function updatePagination() {
    const totalPages = Math.ceil(filteredUsers.length / usersPerPage);
    const paginationInfo = document.querySelector('.pagination-info');
    const paginationButtons = document.querySelector('.pagination-buttons');
    
    if (!paginationInfo || !paginationButtons) return;
    
    // Update info text
    const startIndex = (currentPage - 1) * usersPerPage + 1;
    const endIndex = Math.min(currentPage * usersPerPage, filteredUsers.length);
    paginationInfo.textContent = `Showing ${startIndex}-${endIndex} of ${filteredUsers.length} users`;
    
    // Generate pagination buttons
    let buttonsHTML = '';
    
    // Previous button
    buttonsHTML += `
        <button class="pagination-btn" onclick="changePage(${currentPage - 1})" ${currentPage === 1 ? 'disabled' : ''}>
            &laquo;
        </button>
    `;
    
    // Page numbers
    const maxVisiblePages = 5;
    let startPage = Math.max(1, currentPage - Math.floor(maxVisiblePages / 2));
    let endPage = Math.min(totalPages, startPage + maxVisiblePages - 1);
    
    // Adjust startPage if we're near the end
    if (endPage - startPage < maxVisiblePages - 1) {
        startPage = Math.max(1, endPage - maxVisiblePages + 1);
    }
    
    // First page and ellipsis
    if (startPage > 1) {
        buttonsHTML += `<button class="pagination-btn" onclick="changePage(1)">1</button>`;
        if (startPage > 2) {
            buttonsHTML += `<span style="padding: 0 8px; color: #999;">...</span>`;
        }
    }
    
    // Page number buttons
    for (let i = startPage; i <= endPage; i++) {
        buttonsHTML += `
            <button class="pagination-btn ${i === currentPage ? 'active' : ''}" onclick="changePage(${i})">
                ${i}
            </button>
        `;
    }
    
    // Ellipsis and last page
    if (endPage < totalPages) {
        if (endPage < totalPages - 1) {
            buttonsHTML += `<span style="padding: 0 8px; color: #999;">...</span>`;
        }
        buttonsHTML += `<button class="pagination-btn" onclick="changePage(${totalPages})">${totalPages}</button>`;
    }
    
    // Next button
    buttonsHTML += `
        <button class="pagination-btn" onclick="changePage(${currentPage + 1})" ${currentPage === totalPages || totalPages === 0 ? 'disabled' : ''}>
            &raquo;
        </button>
    `;
    
    paginationButtons.innerHTML = buttonsHTML;
}

// Change page
function changePage(page) {
    const totalPages = Math.ceil(filteredUsers.length / usersPerPage);
    
    if (page < 1 || page > totalPages) return;
    
    currentPage = page;
    displayCurrentPage();
    
    // Scroll to top of table
    document.querySelector('.data-table-container')?.scrollIntoView({ behavior: 'smooth', block: 'start' });
}

// Toggle edit mode for a user row
function toggleEditMode(userId) {
    const row = document.querySelector(`tr[data-user-id="${userId}"]`);
    if (!row) return;

    // Hide display elements, show edit elements
    row.querySelector('.user-name-display').style.display = 'none';
    row.querySelector('.user-name-edit').style.display = 'inline-block';

    // Toggle buttons
    row.querySelector('.btn-edit-mode').style.display = 'none';
    row.querySelector('.btn-save-mode').style.display = 'inline-flex';
    row.querySelector('.btn-cancel-mode').style.display = 'inline-flex';
}

// Cancel edit mode
function cancelEdit(userId) {
    const row = document.querySelector(`tr[data-user-id="${userId}"]`);
    if (!row) return;

    // Show display elements, hide edit elements
    row.querySelector('.user-name-display').style.display = 'inline';
    row.querySelector('.user-name-edit').style.display = 'none';

    // Toggle buttons
    row.querySelector('.btn-edit-mode').style.display = 'inline-flex';
    row.querySelector('.btn-save-mode').style.display = 'none';
    row.querySelector('.btn-cancel-mode').style.display = 'none';

    // Reload to reset values
    loadUsers();
}

// Save user changes
async function saveUser(userId) {
    const row = document.querySelector(`tr[data-user-id="${userId}"]`);
    if (!row) return;

    const firstName = row.querySelector('input[data-field="firstName"]').value.trim();
    const lastName = row.querySelector('input[data-field="lastName"]').value.trim();

    if (!firstName || !lastName) {
        showError('First name and last name are required');
        return;
    }

    try {
        const response = await fetch(`/admin/api/users/${userId}`, {
            method: 'PUT',
            headers: {
                'Content-Type': 'application/json'
            },
            body: JSON.stringify({
                firstName,
                lastName
            })
        });

        const data = await response.json();

        if (data.success) {
            showSuccess('User updated successfully');
            loadUsers(); // Reload the list
        } else {
            showError(data.message || 'Failed to update user');
        }
    } catch (error) {
        console.error('Error updating user:', error);
        showError('Error updating user');
    }
}

// Show suspend user modal
function showSuspendModal(userId, email) {
    document.getElementById('suspendUserId').value = userId;
    document.getElementById('suspendUserEmail').textContent = email;
    
    // Reset form
    document.getElementById('suspendUserForm').reset();
    document.getElementById('suspensionType').value = 'permanent';
    document.getElementById('suspensionDateGroup').style.display = 'none';
    
    // Show modal
    const modal = new bootstrap.Modal(document.getElementById('suspendUserModal'));
    modal.show();
}

// Setup suspension type toggle
function setupSuspensionTypeToggle() {
    const suspensionType = document.getElementById('suspensionType');
    if (suspensionType) {
        suspensionType.addEventListener('change', function() {
            const dateGroup = document.getElementById('suspensionDateGroup');
            if (this.value === 'temporary') {
                dateGroup.style.display = 'block';
                document.getElementById('suspensionEndDate').required = true;
            } else {
                dateGroup.style.display = 'none';
                document.getElementById('suspensionEndDate').required = false;
            }
        });
    }
}

// Confirm suspend user
async function confirmSuspendUser() {
    const userId = document.getElementById('suspendUserId').value;
    const reason = document.getElementById('suspensionReason').value.trim();
    const suspensionType = document.getElementById('suspensionType').value;
    const suspensionEndDate = document.getElementById('suspensionEndDate').value;
    const emailMessage = document.getElementById('emailMessage').value.trim();
    const emailTitle = document.getElementById('emailTitle').value.trim();

    if (!reason) {
        showError('Please provide a reason for suspension');
        return;
    }

    if (!emailTitle) {
        showError('Please provide an email subject');
        return;
    }

    if (suspensionType === 'temporary' && !suspensionEndDate) {
        showError('Please select an end date for temporary suspension');
        return;
    }

    // Get button and show loading state
    const btn = document.getElementById('btnSuspendUser');
    const originalHTML = btn.innerHTML;
    btn.disabled = true;
    btn.innerHTML = '<span class="spinner-border spinner-border-sm me-2" role="status" aria-hidden="true"></span>Sending Email...';

    try {
        const response = await fetch(`/admin/api/users/${userId}/suspend`, {
            method: 'POST',
            headers: {
                'Content-Type': 'application/json'
            },
            body: JSON.stringify({
                reason,
                suspensionType,
                suspensionEndDate: suspensionType === 'temporary' ? suspensionEndDate : null,
                emailMessage,
                emailTitle
            })
        });

        const data = await response.json();

        if (data.success) {
            showSuccess('User suspended successfully. Email notification sent.');
            bootstrap.Modal.getInstance(document.getElementById('suspendUserModal')).hide();
            loadUsers(); // Reload the list
        } else {
            showError(data.message || 'Failed to suspend user');
        }
    } catch (error) {
        console.error('Error suspending user:', error);
        showError('Error suspending user');
    } finally {
        // Restore button state
        btn.disabled = false;
        btn.innerHTML = originalHTML;
    }
}

// Show lift suspension modal
function showLiftSuspensionModal(userId, email) {
    document.getElementById('liftUserId').value = userId;
    document.getElementById('liftUserEmail').textContent = email;
    
    const modal = new bootstrap.Modal(document.getElementById('liftSuspensionModal'));
    modal.show();
}

// Confirm lift suspension
async function confirmLiftSuspension() {
    const userId = document.getElementById('liftUserId').value;

    // Get button and show loading state
    const btn = document.getElementById('btnLiftSuspension');
    const originalHTML = btn.innerHTML;
    btn.disabled = true;
    btn.innerHTML = '<span class="spinner-border spinner-border-sm me-2" role="status" aria-hidden="true"></span>Sending Email...';

    try {
        const response = await fetch(`/admin/api/users/${userId}/lift-suspension`, {
            method: 'POST',
            headers: {
                'Content-Type': 'application/json'
            }
        });

        const data = await response.json();

        if (data.success) {
            showSuccess('Suspension lifted successfully. Email notification sent.');
            bootstrap.Modal.getInstance(document.getElementById('liftSuspensionModal')).hide();
            loadUsers(); // Reload the list
        } else {
            showError(data.message || 'Failed to lift suspension');
        }
    } catch (error) {
        console.error('Error lifting suspension:', error);
        showError('Error lifting suspension');
    } finally {
        // Restore button state
        btn.disabled = false;
        btn.innerHTML = originalHTML;
    }
}


// Get initials from full name
function getInitials(name) {
    if (!name || name === 'N/A') return 'U';
    const parts = name.trim().split(' ');
    if (parts.length >= 2) {
        return (parts[0][0] + parts[parts.length - 1][0]).toUpperCase();
    }
    return name.substring(0, 2).toUpperCase();
}

// Get avatar color based on index
function getAvatarColor(index) {
    const colors = [
        '#EF4444', '#10B981', '#F59E0B', '#8B5CF6', 
        '#EC4899', '#14B8A6', '#6366F1', '#F97316'
    ];
    return colors[index % colors.length];
}

// Setup search filter
function setupSearchFilter() {
    const searchInput = document.querySelector('.filter-search input');
    
    if (searchInput) {
        searchInput.addEventListener('input', function(e) {
            const searchTerm = e.target.value.toLowerCase();
            
            // Filter users based on search term
            filteredUsers = usersData.filter(user => {
                const searchText = `${user.fullName} ${user.email} ${user.firstName || ''} ${user.lastName || ''}`.toLowerCase();
                return searchText.includes(searchTerm);
            });
            
            // Reset to first page when searching
            currentPage = 1;
            displayCurrentPage();
        });
    }
}

// Show delete user modal
function deleteUser(userId, email) {
    document.getElementById('deleteUserId').value = userId;
    document.getElementById('deleteUserEmail').textContent = email;
    
    const modal = new bootstrap.Modal(document.getElementById('deleteUserModal'));
    modal.show();
}

// Confirm delete user
async function confirmDeleteUser() {
    const userId = document.getElementById('deleteUserId').value;

    // Get button and show loading state
    const btn = document.getElementById('btnDeleteUser');
    const originalHTML = btn.innerHTML;
    btn.disabled = true;
    btn.innerHTML = '<span class="spinner-border spinner-border-sm me-2" role="status" aria-hidden="true"></span>Deleting...';

    try {
        const response = await fetch(`/admin/api/users/${userId}`, {
            method: 'DELETE'
        });

        const data = await response.json();

        if (data.success) {
            showSuccess('User deleted successfully');
            bootstrap.Modal.getInstance(document.getElementById('deleteUserModal')).hide();
            loadUsers(); // Reload the list
        } else {
            showError(data.message || 'Failed to delete user');
        }
    } catch (error) {
        console.error('Error deleting user:', error);
        showError('Error deleting user');
    } finally {
        // Restore button state
        btn.disabled = false;
        btn.innerHTML = originalHTML;
    }
}

// Show success message using Bootstrap toast
function showSuccess(message) {
    showToast(message, 'success');
}

// Show error message using Bootstrap toast
function showError(message) {
    showToast(message, 'danger');
}

// Generic toast function
function showToast(message, type) {
    // Create toast container if it doesn't exist
    let toastContainer = document.querySelector('.toast-container');
    if (!toastContainer) {
        toastContainer = document.createElement('div');
        toastContainer.className = 'toast-container position-fixed bottom-0 end-0 p-3';
        toastContainer.style.zIndex = '9999';
        document.body.appendChild(toastContainer);
    }

    // Create toast
    const toastId = 'toast-' + Date.now();
    const toastHTML = `
        <div id="${toastId}" class="toast align-items-center text-white bg-${type} border-0" role="alert" aria-live="assertive" aria-atomic="true">
            <div class="d-flex">
                <div class="toast-body">
                    <i class="fas fa-${type === 'success' ? 'check-circle' : 'exclamation-circle'}"></i>
                    ${message}
                </div>
                <button type="button" class="btn-close btn-close-white me-2 m-auto" data-bs-dismiss="toast" aria-label="Close"></button>
            </div>
        </div>
    `;

    toastContainer.insertAdjacentHTML('beforeend', toastHTML);
    
    const toastElement = document.getElementById(toastId);
    const toast = new bootstrap.Toast(toastElement, { autohide: true, delay: 3000 });
    toast.show();

    // Remove toast element after it's hidden
    toastElement.addEventListener('hidden.bs.toast', function() {
        toastElement.remove();
    });
}