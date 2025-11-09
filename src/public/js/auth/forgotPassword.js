// Forgot Password JavaScript functionality
document.addEventListener('DOMContentLoaded', function() {
    // Auto-format verification code input
    const codeInput = document.getElementById('code');
    if (codeInput) {
        codeInput.addEventListener('input', function(e) {
            // Only allow numbers
            this.value = this.value.replace(/[^0-9]/g, '');
            
            // Limit to 6 digits
            if (this.value.length > 6) {
                this.value = this.value.substring(0, 6);
            }
        });

        // Auto-submit when 6 digits are entered
        codeInput.addEventListener('input', function(e) {
            if (this.value.length === 6) {
                // Add small delay for better UX
                setTimeout(() => {
                    this.closest('form').submit();
                }, 500);
            }
        });

        // Focus the input on page load
        codeInput.focus();
    }

    // Password confirmation validation
    const passwordField = document.getElementById('password');
    const confirmPasswordField = document.getElementById('confirmPassword');
    
    if (passwordField && confirmPasswordField) {
        function validatePasswords() {
            const password = passwordField.value;
            const confirmPassword = confirmPasswordField.value;
            
            // Reset validation states
            passwordField.classList.remove('error', 'success');
            confirmPasswordField.classList.remove('error', 'success');
            
            if (password.length > 0) {
                if (password.length >= 8) {
                    passwordField.classList.add('success');
                } else {
                    passwordField.classList.add('error');
                }
            }
            
            if (confirmPassword.length > 0) {
                if (password === confirmPassword && password.length >= 8) {
                    confirmPasswordField.classList.add('success');
                } else {
                    confirmPasswordField.classList.add('error');
                }
            }
        }
        
        passwordField.addEventListener('input', validatePasswords);
        confirmPasswordField.addEventListener('input', validatePasswords);
    }

    // Email validation for forgot password form
    const emailField = document.getElementById('email');
    if (emailField) {
        emailField.addEventListener('blur', function() {
            const email = this.value;
            const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
            
            this.classList.remove('error', 'success');
            
            if (email.length > 0) {
                if (emailRegex.test(email)) {
                    this.classList.add('success');
                } else {
                    this.classList.add('error');
                }
            }
        });
    }

    // Form submission loading states
    const forms = document.querySelectorAll('.auth-form');
    forms.forEach(form => {
        form.addEventListener('submit', function(e) {
            const submitBtn = this.querySelector('.auth-btn');
            if (submitBtn) {
                submitBtn.disabled = true;
                submitBtn.innerHTML = '<span>Processing...</span>';
                
                // Re-enable button after 5 seconds to prevent permanent disable
                setTimeout(() => {
                    submitBtn.disabled = false;
                    submitBtn.innerHTML = submitBtn.dataset.originalText || '<span>Submit</span>';
                }, 5000);
            }
        });
    });

    // Store original button text
    const authBtns = document.querySelectorAll('.auth-btn');
    authBtns.forEach(btn => {
        btn.dataset.originalText = btn.innerHTML;
    });

    // Add visual feedback for successful actions
    const successMessages = document.querySelectorAll('.message.success');
    successMessages.forEach(msg => {
        msg.style.animation = 'slideIn 0.5s ease-out, pulse 2s ease-in-out 0.5s';
    });

    // Auto-hide messages after 10 seconds
    const messages = document.querySelectorAll('.message');
    messages.forEach(msg => {
        setTimeout(() => {
            msg.style.transition = 'all 0.5s ease-out';
            msg.style.opacity = '0';
            msg.style.transform = 'translateY(-10px)';
            setTimeout(() => {
                msg.remove();
            }, 500);
        }, 10000);
    });
});

// CSS for input validation states
const style = document.createElement('style');
style.textContent = `
    .form-group input.error {
        border-color: #dc3545;
        box-shadow: 0 0 0 3px rgba(220, 53, 69, 0.1);
    }
    
    .form-group input.success {
        border-color: #28a745;
        box-shadow: 0 0 0 3px rgba(40, 167, 69, 0.1);
    }
    
    @keyframes pulse {
        0%, 100% { transform: scale(1); }
        50% { transform: scale(1.02); }
    }
`;
document.head.appendChild(style);
