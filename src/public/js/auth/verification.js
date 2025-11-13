// js/auth/verification.js
document.addEventListener('DOMContentLoaded', function() {
    'use strict';

    // Elements
    const verificationForm = document.getElementById('verificationForm');
    const resendForm = document.getElementById('resendForm');
    const codeInput = document.getElementById('verificationCode');
    const timerElement = document.getElementById('timer');
    const resendBtn = document.getElementById('resendBtn');
    const resendCooldown = document.getElementById('resendCooldown');
    const cooldownTimer = document.getElementById('cooldownTimer');
    const verifyBtn = document.getElementById('verifyBtn');

    // Timer variables
    let timeLeft = 5 * 60; // 5 minutes in seconds
    let timerInterval;
    let resendCooldownTime = 0;
    let resendCooldownInterval;

    // Start countdown timer (only if timer element exists)
    function startTimer() {
        if (!timerElement) return;
        
        timerInterval = setInterval(() => {
            if (timeLeft <= 0) {
                clearInterval(timerInterval);
                timerElement.textContent = 'Expired';
                timerElement.style.color = '#e74c3c';
                showExpiredMessage();
                return;
            }

            const minutes = Math.floor(timeLeft / 60);
            const seconds = timeLeft % 60;
            timerElement.textContent = `${minutes}:${seconds.toString().padStart(2, '0')}`;
            
            // Change color when less than 1 minute left
            if (timeLeft <= 60) {
                timerElement.style.color = '#e74c3c';
            }
            
            timeLeft--;
        }, 1000);
    }

    // Start resend cooldown (only if elements exist)
    function startResendCooldown() {
        if (!resendBtn || !resendCooldown || !cooldownTimer) return;
        
        resendCooldownTime = 30; // 30 seconds
        resendBtn.style.display = 'none';
        resendCooldown.style.display = 'block';

        resendCooldownInterval = setInterval(() => {
            cooldownTimer.textContent = resendCooldownTime;
            resendCooldownTime--;

            if (resendCooldownTime < 0) {
                clearInterval(resendCooldownInterval);
                resendBtn.style.display = 'inline-block';
                resendCooldown.style.display = 'none';
            }
        }, 1000);
    }

    // Show expired message
    function showExpiredMessage() {
        const alertDiv = document.createElement('div');
        alertDiv.className = 'alert alert-error';
        alertDiv.innerHTML = `
            <i class="fas fa-exclamation-circle"></i>
            Verification code has expired. Please request a new code.
        `;
        
        const existingAlert = document.querySelector('.alert');
        if (existingAlert) {
            existingAlert.replaceWith(alertDiv);
        } else {
            verificationForm.parentNode.insertBefore(alertDiv, verificationForm);
        }
    }

    // Show success message
    function showMessage(message, type = 'info') {
        const alertDiv = document.createElement('div');
        alertDiv.className = `alert alert-${type}`;
        const iconClass = type === 'success' ? 'check-circle' : 
                         type === 'error' ? 'exclamation-circle' : 'info-circle';
        
        alertDiv.innerHTML = `
            <i class="fas fa-${iconClass}"></i>
            ${message}
        `;
        
        const existingAlert = document.querySelector('.alert');
        if (existingAlert) {
            existingAlert.replaceWith(alertDiv);
        } else {
            verificationForm.parentNode.insertBefore(alertDiv, verificationForm);
        }

        // Auto-hide success messages after 5 seconds
        if (type === 'success') {
            setTimeout(() => {
                alertDiv.style.opacity = '0';
                setTimeout(() => alertDiv.remove(), 300);
            }, 5000);
        }
    }

    // Format code input
    codeInput.addEventListener('input', function(e) {
        // Only allow numbers
        this.value = this.value.replace(/[^0-9]/g, '');
        
        // Auto-submit when 6 digits entered
        if (this.value.length === 6) {
            setTimeout(() => {
                verificationForm.dispatchEvent(new Event('submit'));
            }, 500);
        }
    });

    // Handle verification form submission
    verificationForm.addEventListener('submit', async function(e) {
        e.preventDefault();
        
        const code = codeInput.value.trim();
        
        if (code.length !== 6) {
            showMessage('Please enter a 6-digit verification code', 'error');
            codeInput.focus();
            return;
        }

        // Show loading state
        verifyBtn.disabled = true;
        verifyBtn.classList.add('loading');
        console.log('Making fetch request to /verify');
        
        try {
            const payload = {
                email: document.querySelector('input[name="email"]').value,
                verificationCode: code
            };
            
            const response = await fetch('/verify', {
                method: 'POST',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify(payload)
            });
            
            console.log('Response received:', response);
            const result = await response.json();
            console.log('Parsed result:', result);

            if (result.success) {
                showMessage(result.message || 'Email verified successfully!', 'success');
                
                // Clear timer if it exists
                if (timerInterval) {
                    clearInterval(timerInterval);
                }
                if (timerElement) {
                    timerElement.textContent = 'Verified ✓';
                    timerElement.style.color = '#27ae60';
                }
                
                // Redirect after 2 seconds
                setTimeout(() => {
                    console.log('Redirecting to:', result.redirectTo || '/login?verified=true');
                    window.location.href = result.redirectTo || '/login?verified=true';
                }, 2000);
                
            } else {
                showMessage(result.message || 'Invalid or expired verification code', 'error');
                codeInput.value = '';
                codeInput.focus();
            }
            
        } catch (error) {
            console.error('Verification error:', error);
            showMessage('An error occurred. Please try again.', 'error');
        } finally {
            verifyBtn.disabled = false;
            verifyBtn.classList.remove('loading');
        }
    });

    // Handle verification button click (fallback)
    verifyBtn.addEventListener('click', function(e) {
        verificationForm.dispatchEvent(new Event('submit'));
    });    // Handle resend - make AJAX request
    if (resendForm) {
        resendForm.addEventListener('submit', async function(e) {
            e.preventDefault();
            
            const email = document.querySelector('input[name="email"]').value;
            if (!email) {
                showMessage('Email not found', 'error');
                return;
            }

            // Show loading state
            const resendBtn = document.querySelector('.signup-link');
            if (resendBtn) {
                resendBtn.textContent = 'Sending...';
                resendBtn.style.pointerEvents = 'none';
            }

            try {
                const payload = { email };
                
                const response = await fetch('/resend-code', {
                    method: 'POST',
                    headers: { 'Content-Type': 'application/json' },
                    body: JSON.stringify(payload)
                });
                
                const result = await response.json();
                
                if (result.success) {
                    showMessage(result.message || 'New verification code sent to your email', 'success');
                    startResendCooldown();
                } else {
                    showMessage(result.message || 'Failed to resend code', 'error');
                }
                
            } catch (error) {
                console.error('Resend error:', error);
                showMessage('An error occurred while resending the code', 'error');
            } finally {
                if (resendBtn) {
                    resendBtn.textContent = 'Resend Code';
                    resendBtn.style.pointerEvents = 'auto';
                }
            }
        });
    }

    // Global function for onclick handler
    window.handleResendCode = function() {
        resendForm.dispatchEvent(new Event('submit'));
    };

    // Keyboard shortcuts
    document.addEventListener('keydown', function(e) {
        // Focus code input when typing numbers
        if (/[0-9]/.test(e.key) && document.activeElement !== codeInput) {
            codeInput.focus();
        }
        
        // Submit on Enter
        if (e.key === 'Enter' && document.activeElement === codeInput) {
            verificationForm.dispatchEvent(new Event('submit'));
        }
    });

    // Auto-focus code input
    codeInput.focus();

    // Start the timer
    startTimer();

    // Check if page was loaded with a message
    const urlParams = new URLSearchParams(window.location.search);
    if (urlParams.get('resent') === 'true') {
        showMessage('New verification code sent to your email', 'success');
        startResendCooldown();
    }
    
    // Handle page visibility change (reset timer when user comes back)
    document.addEventListener('visibilitychange', function() {
        if (!document.hidden && timeLeft > 0) {
            // Optionally refresh verification status when user returns
            console.log('User returned to verification page');
        }
    });

});