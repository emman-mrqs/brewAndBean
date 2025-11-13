// /public/js/auth/logout.js
// Robust logout utility — attach globals early and use delegation.

// Define functions immediately so inline onclick() won't fail.
function logout() {
    if (!confirm('Are you sure you want to logout?')) return;

    // Show loading state on all matching logout buttons
    document.querySelectorAll('.btn-logout, [data-logout]').forEach(btn => {
        try {
            btn.disabled = true;
            btn.dataset.originalHtml = btn.innerHTML;
            btn.innerHTML = '<i class="fas fa-spinner fa-spin"></i> Signing Out...';
        } catch (e) { /* ignore */ }
    });

    // Create and submit a POST form to /logout (works even without JS on server)
    const form = document.createElement('form');
    form.method = 'POST';
    form.action = '/logout';

    // If you use CSRF meta tag, include it
    const csrfToken = document.querySelector('meta[name="csrf-token"]')?.getAttribute('content');
    if (csrfToken) {
        const input = document.createElement('input');
        input.type = 'hidden';
        input.name = '_csrf';
        input.value = csrfToken;
        form.appendChild(input);
    }

    form.style.display = 'none';
    document.body.appendChild(form);
    form.submit();
}

async function logoutAsync() {
    if (!confirm('Are you sure you want to logout?')) return;

    document.querySelectorAll('.btn-logout, [data-logout]').forEach(btn => {
        try {
            btn.disabled = true;
            btn.dataset.originalHtml = btn.innerHTML;
            btn.innerHTML = '<i class="fas fa-spinner fa-spin"></i> Signing Out...';
        } catch (e) {}
    });

    try {
        const csrfToken = document.querySelector('meta[name="csrf-token"]')?.getAttribute('content');

        const headers = { 'Content-Type': 'application/json' };
        if (csrfToken) headers['CSRF-Token'] = csrfToken;

        const res = await fetch('/logout', {
            method: 'POST',
            headers,
            credentials: 'same-origin'
        });

        if (res.ok) {
            // redirect to login (server also redirects for non-fetch)
            window.location.href = '/login?message=Successfully logged out';
        } else {
            console.error('Logout failed:', res.status, res.statusText);
            alert('Logout failed. Please try again.');

            // restore buttons
            document.querySelectorAll('.btn-logout, [data-logout]').forEach(btn => {
                try {
                    btn.disabled = false;
                    if (btn.dataset.originalHtml) btn.innerHTML = btn.dataset.originalHtml;
                } catch (e) {}
            });
        }
    } catch (err) {
        console.error('Logout error:', err);
        alert('An error occurred during logout. Please try again.');
        document.querySelectorAll('.btn-logout, [data-logout]').forEach(btn => {
            try {
                btn.disabled = false;
                if (btn.dataset.originalHtml) btn.innerHTML = btn.dataset.originalHtml;
            } catch (e) {}
        });
    }
}

function quickLogout() {
    window.location.href = '/logout';
}

// Make functions global immediately to avoid "not defined" inline errors
window.logout = logout;
window.logoutAsync = logoutAsync;
window.quickLogout = quickLogout;
window.confirmLogout = logout; // alias for older inline calls

// Use event delegation so markup only needs data-logout attribute.
// This attaches one listener and handles dynamically added buttons too.
// Delegated logout click handler with debug traces
document.addEventListener('click', (e) => {
  const el = e.target.closest('[data-logout], .btn-logout');
  if (!el) return;

  // Debug: confirm the listener fired and show the element
  console.log('Logout click detected on:', el);
  try {
    console.trace('Trace logout click'); // optional deeper trace
  } catch (err) {}

  e.preventDefault();

  // Show which action we will take (helps verify data-* attr)
  const action = el.dataset.action;
  console.log('Logout action attribute:', action || '(none)');

  if (action === 'async') {
    logoutAsync();
  } else {
    logout();
  }
});

