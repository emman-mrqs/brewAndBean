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

    // Start countdown timer
    function startTimer() {
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

    // Start resend cooldown
    function startResendCooldown() {
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
                verificationForm.submit();
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
        
        try {
            const formData = new FormData(this);
            const response = await fetch('/verify', {
                method: 'POST',
                body: formData
            });

            if (response.ok) {
                showMessage('Email verified successfully!', 'success');
                
                // Clear timer
                clearInterval(timerInterval);
                timerElement.textContent = 'Verified ✓';
                timerElement.style.color = '#27ae60';
                
                // Redirect to login after 2 seconds
                setTimeout(() => {
                    window.location.href = '/login?verified=true';
                }, 2000);
                
            } else {
                showMessage('Invalid or expired verification code', 'error');
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

    // Handle resend - simplified (redirect back to signup)
    if (resendForm) {
        resendForm.addEventListener('submit', function(e) {
            e.preventDefault();
            
            const email = new URLSearchParams(window.location.search).get('email');
            if (email) {
                showMessage('Redirecting to signup page to resend code...', 'info');
                setTimeout(() => {
                    window.location.href = '/signup';
                }, 1500);
            }
        });
    }

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