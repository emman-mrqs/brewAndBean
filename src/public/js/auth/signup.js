// Toggle password visibility (sync both password & confirm fields + icons)
// Compatible with both togglePassword('password') and togglePassword('password','eyeIcon1')
function togglePassword(fieldId, iconId) {
    const pwd = document.getElementById('password');
    const conf = document.getElementById('confirmPassword');
    const triggerField = document.getElementById(fieldId);

    // icons (may be null if called without icon ids)
    const eye1 = document.getElementById('eyeIcon1');
    const eye2 = document.getElementById('eyeIcon2');
    const triggerIcon = iconId ? document.getElementById(iconId) : null;

    // Safety: require at least the two inputs
    if (!pwd || !conf || !triggerField) return;

    // Determine the new type based on the clicked field's current type
    const newType = (triggerField.type === 'password') ? 'text' : 'password';

    // Apply new type to both fields
    pwd.type = newType;
    conf.type = newType;

    // Update both eye icons to match newType
    function setIconToEye(iconEl) {
        if (!iconEl) return;
        iconEl.classList.remove('bi-eye-slash');
        iconEl.classList.add('bi-eye');
    }
    function setIconToEyeSlash(iconEl) {
        if (!iconEl) return;
        iconEl.classList.remove('bi-eye');
        iconEl.classList.add('bi-eye-slash');
    }

    if (newType === 'text') {
        setIconToEyeSlash(eye1);
        setIconToEyeSlash(eye2);
    } else {
        setIconToEye(eye1);
        setIconToEye(eye2);
    }

    // Keep focus on the field the user clicked (optional UX nicety)
    try {
      triggerField.focus();
      // place cursor at end if switching to text (works for most browsers)
      const len = triggerField.value.length;
      triggerField.setSelectionRange(len, len);
    } catch (e) {
      // ignore browsers that don't support setSelectionRange on password fields
    }
}

// Initialize when DOM is loaded
document.addEventListener('DOMContentLoaded', function() {
    // Password strength checker
    const passwordInput = document.getElementById('password');
    const strengthFill = document.getElementById('strengthFill');
    const strengthText = document.getElementById('strengthText');

    if (passwordInput && strengthFill && strengthText) {
        passwordInput.addEventListener('input', function() {
            const password = this.value;
            let strength = 0;
            
            // Check password criteria
            if (password.length >= 8) strength++;
            if (password.match(/[a-z]+/)) strength++;
            if (password.match(/[A-Z]+/)) strength++;
            if (password.match(/[0-9]+/)) strength++;
            if (password.match(/[$@#&!]+/)) strength++;
            
            // Update strength bar
            const percentage = (strength / 5) * 100;
            strengthFill.style.width = percentage + '%';
            
            // Update colors and text
            if (strength === 0) {
                strengthFill.style.background = '#E3E3E3';
                strengthText.textContent = 'Password strength';
                strengthText.style.color = '#7E7D7C';
            } else if (strength <= 2) {
                strengthFill.style.background = '#ff4444';
                strengthText.textContent = 'Weak password';
                strengthText.style.color = '#ff4444';
            } else if (strength <= 3) {
                strengthFill.style.background = '#ffaa00';
                strengthText.textContent = 'Medium password';
                strengthText.style.color = '#ffaa00';
            } else {
                strengthFill.style.background = '#00C851';
                strengthText.textContent = 'Strong password';
                strengthText.style.color = '#00C851';
            }
        });
    }

    // Form submission
    const signupForm = document.getElementById('signupForm');
    if (signupForm) {
        signupForm.addEventListener('submit', function(e) {
            const firstName = document.getElementById('firstName').value.trim();
            const lastName = document.getElementById('lastName').value.trim();
            const email = document.getElementById('email').value.trim();
            const phone = document.getElementById('phone').value.trim();
            const password = document.getElementById('password').value;
            const confirmPassword = document.getElementById('confirmPassword').value;
            
            // Client-side validation
            if (!firstName || !lastName || !email || !phone || !password) {
                e.preventDefault();
                alert('All fields are required!');
                return;
            }
            
            // Email format validation
            const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
            if (!emailRegex.test(email)) {
                e.preventDefault();
                alert('Please enter a valid email address!');
                return;
            }
            
            // Validate passwords match
            if (password !== confirmPassword) {
                e.preventDefault();
                alert('Passwords do not match!');
                return;
            }
            
            // Password strength validation
            if (password.length < 6) {
                e.preventDefault();
                alert('Password must be at least 6 characters long!');
                return;
            }
            
            
            // Add loading state to button
            const submitBtn = document.querySelector('.btn-signup');
            submitBtn.classList.add('loading');
            submitBtn.innerHTML = '<span>Creating Account...</span><div class="btn-shine"></div>';
            
            // Let the form submit naturally to the backend
            // The backend will handle user creation and email verification
        });
    }

    // Input focus animations
    const inputs = document.querySelectorAll('.signup-form input');
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

    // Google Sign-Up button
    const googleSignupBtn = document.querySelector('.btn-social.google');
    if (googleSignupBtn) {
        googleSignupBtn.addEventListener('click', function() {
            // Redirect to OAuth start route; signup and login can share the same Google flow
            window.location.href = '/auth/google';
        });
    }

    // ===== VERIFICATION FORM FUNCTIONALITY =====
    
    // Check if we need to show verification form on page load
    const urlParams = new URLSearchParams(window.location.search);
    const showVerify = urlParams.get('showVerify');
    const email = urlParams.get('email');
    
    if (showVerify === 'true' && email) {
        showVerificationForm(email);
    }
    
    // Add event listener for verification code formatting
    const verificationCodeInput = document.getElementById('verificationCode');
    if (verificationCodeInput) {
        verificationCodeInput.addEventListener('input', function(e) {
            let value = e.target.value.replace(/\D/g, '');
            if (value.length > 6) value = value.substring(0, 6);
            e.target.value = value;
            
            // Auto-submit when 6 digits are entered
            if (value.length === 6) {
                setTimeout(() => {
                    document.getElementById('verificationForm').submit();
                }, 500);
            }
        });
    }
});

// ===== VERIFICATION FORM FUNCTIONS =====

function showVerificationForm(email) {
    console.log('showVerificationForm called with email:', email);
    
    const signupForm = document.getElementById('signupForm');
    const verificationForm = document.getElementById('verificationForm');
    const verificationEmail = document.getElementById('verificationEmail');
    const verificationCode = document.getElementById('verificationCode');
    
    console.log('Elements found:', {
        signupForm: !!signupForm,
        verificationForm: !!verificationForm,
        verificationEmail: !!verificationEmail,
        verificationCode: !!verificationCode
    });
    
    if (signupForm && verificationForm) {
        signupForm.style.display = 'none';
        verificationForm.style.display = 'block';
        
        if (verificationEmail) {
            verificationEmail.value = email || '';
        }
        
        if (verificationCode) {
            verificationCode.focus();
        }
        
        console.log('Verification form should now be visible');
    } else {
        console.error('Required form elements not found');
    }
}

function showSignupForm() {
    const signupForm = document.getElementById('signupForm');
    const verificationForm = document.getElementById('verificationForm');
    
    if (signupForm && verificationForm) {
        signupForm.style.display = 'block';
        verificationForm.style.display = 'none';
    }
}