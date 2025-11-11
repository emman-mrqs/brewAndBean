// public/js/user/settings.js
document.addEventListener('DOMContentLoaded', function () {
  // Toggle edit profile form
  const editProfileBtn = document.getElementById('editProfileBtn');
  const editProfileForm = document.getElementById('editProfileForm');
  const cancelEditProfile = document.getElementById('cancelEditProfile');

  const changePasswordBtn = document.getElementById('changePasswordBtn');
  const changePasswordForm = document.getElementById('changePasswordForm');
  const cancelChangePassword = document.getElementById('cancelChangePassword');

  function show(el) { if (el) el.style.display = ''; }
  function hide(el) { if (el) el.style.display = 'none'; }

  if (editProfileBtn && editProfileForm) {
    editProfileBtn.addEventListener('click', function () {
      show(editProfileForm);
      hide(changePasswordForm);
    });
  }
  if (cancelEditProfile && editProfileForm) {
    cancelEditProfile.addEventListener('click', function () { hide(editProfileForm); });
  }

  if (changePasswordBtn && changePasswordForm) {
    changePasswordBtn.addEventListener('click', function () {
      show(changePasswordForm);
      hide(editProfileForm);
    });
  }
  if (cancelChangePassword && changePasswordForm) {
    cancelChangePassword.addEventListener('click', function () { hide(changePasswordForm); });
  }

  // Password client-side check: confirm match before submit
  const changePassForm = document.getElementById('changePasswordForm');
  if (changePassForm) {
    changePassForm.addEventListener('submit', function (e) {
      const newPassword = document.getElementById('new_password').value;
      const confirmPassword = document.getElementById('confirm_password').value;
      if (newPassword !== confirmPassword) {
        e.preventDefault();
        showToast('Error', 'New password and confirmation do not match.', 'danger');
        return false;
      }
      if (newPassword.length < 8) {
        e.preventDefault();
        showToast('Error', 'New password must be at least 8 characters.', 'danger');
        return false;
      }
    });
  }

  // Toast helper using Bootstrap 5's Toast component
  function showToast(title, message, variant = 'primary') {
    try {
      // Elements
      const toastEl = document.getElementById('appToast');
      const toastTitle = document.getElementById('appToastTitle');
      const toastBody = document.getElementById('appToastBody');
      const toastTime = document.getElementById('appToastTime');

      if (!toastEl || !toastTitle || !toastBody) {
        // fallback to alert if toast elements missing
        alert(message);
        return;
      }

      // Set content
      toastTitle.textContent = title || 'Notification';
      toastBody.textContent = message || '';
      // timestamp (e.g., "just now")
      toastTime.textContent = 'just now';

      // adjust toast color variant (light background)
      // we'll apply simple styles instead of Bootstrap contextual classes because Toast header uses background of parent
      // For a subtle approach, change title color for danger/success
      toastTitle.style.color = (variant === 'danger') ? '#b91c1c' : (variant === 'success' ? '#03543f' : '');
      // Show the toast
      const bsToast = bootstrap.Toast.getOrCreateInstance(toastEl);
      bsToast.show();
    } catch (err) {
      console.error('Toast error', err);
    }
  }

  // Show quick messages passed as query params using the #pageMessage data attributes
  const msgEl = document.getElementById('pageMessage');
  if (msgEl) {
    const success = msgEl.dataset.message;
    const error = msgEl.dataset.error;

    if (success && success.length) {
      showToast('Success', success, 'success');
    } else if (error && error.length) {
      showToast('Error', error, 'danger');
    }
  }
});
