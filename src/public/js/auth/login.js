// Login Page JavaScript
// Toggle password visibility
function togglePassword() {
  const passwordInput = document.getElementById('password');
  const eyeIcon = document.getElementById('eyeIcon');
  const toggleBtn = document.getElementById('togglePasswordBtn');

  if (!passwordInput || !eyeIcon || !toggleBtn) {
    // Safety fallback: if anything's missing, do nothing
    return;
  }

  const isHidden = passwordInput.type === 'password';

  // Toggle the input type
  passwordInput.type = isHidden ? 'text' : 'password';

  // Swap icon classes (Bootstrap Icons)
  if (isHidden) {
    eyeIcon.classList.remove('bi-eye-slash-fill');
    eyeIcon.classList.add('bi-eye-fill');
    toggleBtn.setAttribute('aria-label', 'Hide password');
    toggleBtn.setAttribute('aria-pressed', 'true');
  } else {
    eyeIcon.classList.remove('bi-eye-fill');
    eyeIcon.classList.add('bi-eye-slash-fill');
    toggleBtn.setAttribute('aria-label', 'Show password');
    toggleBtn.setAttribute('aria-pressed', 'false');
  }
}

// Initialize when DOM is loaded
document.addEventListener('DOMContentLoaded', function() {
    // Form submission
    const loginForm = document.getElementById('loginForm');
    if (loginForm) {
        loginForm.addEventListener('submit', function(e) {
            const email = document.getElementById('email').value.trim();
            const password = document.getElementById('password').value.trim();
            
            // Basic client-side validation
            if (!email || !password) {
                e.preventDefault();
                alert('Please enter both email and password.');
                return;
            }
            
            // Email format validation
            const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
            if (!emailRegex.test(email)) {
                e.preventDefault();
                alert('Please enter a valid email address.');
                return;
            }
            
            // Add loading state to button
            const submitBtn = document.querySelector('.btn-login');
            submitBtn.classList.add('loading');
            submitBtn.innerHTML = '<span>Signing In...</span><div class="btn-shine"></div>';
            
            // Let the form submit naturally to the backend
            // The backend will handle authentication and redirect
        });
    }

    // Input focus animations
    const inputs = document.querySelectorAll('.login-form input');
    inputs.forEach(input => {
        input.addEventListener('focus', function() {
            this.parentElement.parentElement.classList.add('focused');
        });
        
        input.addEventListener('blur', function() {
            if (!this.value) {
                this.parentElement.parentElement.classList.remove('focused');
            }
        });
    });

    // Floating animation for coffee beans
    document.querySelectorAll('.coffee-bean').forEach((bean, index) => {
        bean.style.animationDelay = `${index * 0.5}s`;
    });

    // Google Sign-In button
    const googleBtn = document.getElementById('googleSignIn');
    if (googleBtn) {
        googleBtn.addEventListener('click', function() {
            // Redirect to server route that starts OAuth flow
            window.location.href = '/auth/google';
        });
    }
});