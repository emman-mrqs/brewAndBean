// src/public/js/contact.js (updated)
// Single, consolidated contact page script with email validation + 3-minute throttle

(function () {
  // Log when page ready
  document.addEventListener('DOMContentLoaded', init);

  function init() {
    console.log('Contact page loaded');

    // Remove any stale fallback-toasts container from previous dev runs
    const oldFallback = document.getElementById('fallback-toast-container');
    if (oldFallback) oldFallback.remove();

    // Wire up hero buttons
    const sendMessageBtn = document.querySelector('a[href="#contactForm"]');
    const findLocationBtn = document.querySelector('a[href="#map-section"]');
    if (sendMessageBtn) sendMessageBtn.addEventListener('click', e => { e.preventDefault(); scrollToSection('contactForm'); });
    if (findLocationBtn) findLocationBtn.addEventListener('click', e => { e.preventDefault(); scrollToSection('map-section'); });

    // Initialize form handler
    attachContactFormHandler();

    // Start intersection observer for simple scroll animations
    initObserver();

    // Back-to-top logic
    window.addEventListener('scroll', () => {
      const backToTopBtn = document.getElementById('backToTop');
      if (backToTopBtn) backToTopBtn.classList.toggle('visible', window.scrollY > 300);
    });
  }

  /* ------------------------------------------------------------------ */
  /* Toast helper (uses bootstrap if available, fallback otherwise)      */
  /* ------------------------------------------------------------------ */
  function showToast(type, title, message) {
    const toastEl = document.getElementById('siteToast');

    // If bootstrap and toast element exist -> use bootstrap
    if (window.bootstrap && toastEl) {
      try {
        // ensure visible for bootstrap to animate
        toastEl.style.display = 'block';

        const titleEl = document.getElementById('siteToastTitle');
        const bodyEl = document.getElementById('siteToastBody');
        const timeEl = document.getElementById('siteToastTime');

        titleEl.textContent = title || (type === 'success' ? 'Success' : 'Notice');
        bodyEl.textContent = message || '';
        timeEl.textContent = 'Just now';

        // style header
        const header = toastEl.querySelector('.toast-header');
        if (header) {
          header.classList.remove('bg-success', 'bg-danger', 'text-white');
          if (type === 'success') header.classList.add('bg-success', 'text-white');
          else header.classList.add('bg-danger', 'text-white');
        }

        const bsToast = bootstrap.Toast.getOrCreateInstance(toastEl, { autohide: true, delay: 4000 });
        bsToast.show();
        return;
      } catch (err) {
        console.warn('Bootstrap toast failed, falling back:', err);
      }
    }

    // Fallback if bootstrap not available
    createFallbackToast(type, title, message);
  }

  function createFallbackToast(type, title, message) {
    const containerId = 'fallback-toast-container';
    let container = document.getElementById(containerId);
    if (!container) {
      container = document.createElement('div');
      container.id = containerId;
      Object.assign(container.style, {
        position: 'fixed',
        right: '1rem',
        bottom: '1rem',
        zIndex: 1100,
        display: 'flex',
        flexDirection: 'column',
        gap: '0.5rem',
        alignItems: 'flex-end'
      });
      document.body.appendChild(container);
    }

    const toast = document.createElement('div');
    toast.className = 'fallback-toast';
    Object.assign(toast.style, {
      minWidth: '280px',
      maxWidth: '420px',
      background: '#fff',
      borderRadius: '10px',
      padding: '12px 14px',
      boxShadow: '0 8px 22px rgba(0,0,0,0.12)',
      borderLeft: type === 'success' ? '4px solid #C67C4E' : '4px solid #dc3545',
      fontFamily: 'Poppins, Arial, sans-serif',
      color: '#222',
      overflow: 'hidden'
    });

    const titleEl = document.createElement('div');
    titleEl.textContent = title || (type === 'success' ? 'Success' : 'Notice');
    Object.assign(titleEl.style, { fontWeight: 700, marginBottom: '6px' });

    const bodyEl = document.createElement('div');
    bodyEl.textContent = message || '';
    Object.assign(bodyEl.style, { fontSize: '0.95rem', color: '#444' });

    toast.appendChild(titleEl);
    toast.appendChild(bodyEl);
    container.appendChild(toast);

    // auto remove
    setTimeout(() => {
      toast.style.transition = 'opacity 250ms ease, transform 250ms ease';
      toast.style.opacity = '0';
      toast.style.transform = 'translateY(10px)';
      setTimeout(() => toast.remove(), 300);
    }, 4000);
  }

  /* ------------------------------------------------------------------ */
  /* Contact form handling with email validation + 3-minute throttle     */
  /* ------------------------------------------------------------------ */

  // key used in localStorage for throttle
  const LAST_SENT_KEY = 'beanandbrew_contact_last_sent';
  // throttle window in milliseconds (3 minutes)
  const THROTTLE_MS = 3 * 60 * 1000;

  function attachContactFormHandler() {
    const contactForm = document.getElementById('contactForm');
    if (!contactForm) return;

    contactForm.addEventListener('submit', async (e) => {
      e.preventDefault();

      // throttle check
      const now = Date.now();
      const lastSent = parseInt(localStorage.getItem(LAST_SENT_KEY), 10) || 0;
      const diff = now - lastSent;
      if (diff < THROTTLE_MS) {
        const remainingMs = THROTTLE_MS - diff;
        const minutes = Math.floor(remainingMs / 60000);
        const seconds = Math.ceil((remainingMs % 60000) / 1000);
        const timeStr = `${minutes}:${seconds.toString().padStart(2, '0')}`;
        showToast('error', 'Wait before sending', `Please wait ${timeStr} before sending another message.`);
        return;
      }

      const submitBtn = contactForm.querySelector('.btn-submit');
      const originalText = submitBtn ? submitBtn.innerHTML : null;
      if (submitBtn) { submitBtn.innerHTML = '<span>Sending...</span>'; submitBtn.disabled = true; }

      const fd = new FormData(contactForm);
      const payload = {
        name: (fd.get('name') || '').toString().trim(),
        email: (fd.get('email') || '').toString().trim(),
        phone: (fd.get('phone') || '').toString().trim(),
        subject: (fd.get('subject') || '').toString().trim(),
        message: (fd.get('message') || '').toString().trim()
      };

      // basic required fields validation
      if (!payload.name || !payload.email || !payload.subject || !payload.message) {
        showToast('error', 'Missing fields', 'Please fill in all required fields.');
        if (submitBtn) { submitBtn.innerHTML = originalText; submitBtn.disabled = false; }
        return;
      }

      // email format validation
      if (!isValidEmail(payload.email)) {
        showToast('error', 'Invalid email', 'Please enter a valid email address.');
        if (submitBtn) { submitBtn.innerHTML = originalText; submitBtn.disabled = false; }
        return;
      }

      try {
        const res = await fetch('/contact/submit', {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify(payload)
        });

        let json = null;
        try { json = await res.json(); } catch (err) { /* ignore parse errors */ }

        if (res.ok && json && json.success) {
          // set throttle timestamp only on success
          localStorage.setItem(LAST_SENT_KEY, Date.now().toString());

          showToast('success', 'Message Sent!', "Thank you! We'll get back to you soon.");
          contactForm.reset();
        } else {
          const msg = (json && json.message) ? json.message : 'Server error while sending message.';
          showToast('error', 'Send failed', msg);
        }
      } catch (err) {
        console.error('Contact form network error:', err);
        showToast('error', 'Network error', 'Could not reach server. Please try again later.');
      } finally {
        if (submitBtn) { submitBtn.innerHTML = originalText; submitBtn.disabled = false; }
      }
    });
  }

  // Simple RFC5322-ish email validation (good client-side check)
  function isValidEmail(email) {
    if (!email || typeof email !== 'string') return false;
    const re = /^[^\s@]+@[^\s@]+\.[^\s@]{2,}$/;
    return re.test(email);
  }

  /* ------------------------------------------------------------------ */
  /* Smooth scroll and simple intersection animations                    */
  /* ------------------------------------------------------------------ */

  function scrollToSection(sectionId) {
    const section = document.getElementById(sectionId);
    if (section) {
      const offsetTop = section.offsetTop - 100;
      window.scrollTo({ top: offsetTop, behavior: 'smooth' });
    }
  }

  function initObserver() {
    const observer = new IntersectionObserver(entries => {
      entries.forEach(entry => {
        if (entry.isIntersecting) {
          const delay = entry.target.getAttribute('data-delay') || 0;
          setTimeout(() => entry.target.classList.add('animate-in'), parseInt(delay));
        }
      });
    }, { threshold: 0.2, rootMargin: '0px 0px -50px 0px' });

    document.querySelectorAll('[data-aos]').forEach(el => observer.observe(el));
  }

})(); 
