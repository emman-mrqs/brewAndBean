//src/controller/auth/forgotPasswordController.js
import db from '../../database/db.js';
import bcrypt from 'bcrypt';
import { generateVerificationCode, sendPasswordResetEmail } from '../../utils/emailService.js';

// Render forgot password page (enter email)
export function renderForgotPassword(req, res) {
    const message = req.session.message;
    const messageType = req.session.messageType;
    
    // Clear session messages
    delete req.session.message;
    delete req.session.messageType;
    
    res.render("auth/forgotPassword", { 
        message, 
        messageType,
        formData: req.session.formData || {}
    });
}

// Handle forgot password email submission
export async function handleForgotPassword(req, res) {
    try {
        const { email } = req.body;
        
        // Basic validation
        if (!email) {
            req.session.message = 'Email address is required';
            req.session.messageType = 'error';
            return res.redirect('/forgot-password');
        }
        
        // Email format validation
        const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
        if (!emailRegex.test(email)) {
            req.session.message = 'Please enter a valid email address';
            req.session.messageType = 'error';
            req.session.formData = { email };
            return res.redirect('/forgot-password');
        }
        
        // Check if user exists
        const userQuery = 'SELECT id, first_name, email FROM users WHERE email = $1';
        const userResult = await db.query(userQuery, [email]);
        
        if (userResult.rows.length === 0) {
            // Don't reveal if email exists or not for security
            req.session.message = 'If this email is registered, you will receive a password reset code shortly.';
            req.session.messageType = 'success';
            return res.redirect('/forgot-password');
        }
        
        const user = userResult.rows[0];
        
        // Generate 6-digit reset code
        const resetCode = generateVerificationCode();
        const expiresAt = new Date(Date.now() + 10 * 60 * 1000); // 10 minutes from now
        
        // Store reset code in database
        const resetQuery = `
            INSERT INTO password_resets (user_id, email, reset_code, expires_at) 
            VALUES ($1, $2, $3, $4)
            ON CONFLICT (email) DO UPDATE SET 
                reset_code = $3, 
                expires_at = $4, 
                created_at = CURRENT_TIMESTAMP
        `;
        
        await db.query(resetQuery, [user.id, email, resetCode, expiresAt]);
        
        // Send reset email
        const emailResult = await sendPasswordResetEmail(email, resetCode, user.first_name);
        
        if (emailResult.success) {
            // Store email in session for verification page
            req.session.resetEmail = email;
            req.session.message = 'Password reset code sent to your email. Please check your inbox.';
            req.session.messageType = 'success';
            res.redirect('/reset-password-verify');
        } else {
            req.session.message = 'Failed to send reset email. Please try again.';
            req.session.messageType = 'error';
            res.redirect('/forgot-password');
        }
        
    } catch (error) {
        console.error('Forgot password error:', error);
        req.session.message = 'An error occurred. Please try again.';
        req.session.messageType = 'error';
        res.redirect('/forgot-password');
    }
}

// Render reset password verification page (enter code)
export function renderResetPasswordVerify(req, res) {
    if (!req.session.resetEmail) {
        req.session.message = 'Please start the password reset process again.';
        req.session.messageType = 'error';
        return res.redirect('/forgot-password');
    }
    
    const message = req.session.message;
    const messageType = req.session.messageType;
    
    // Clear session messages
    delete req.session.message;
    delete req.session.messageType;
    
    res.render("auth/resetPasswordVerify", { 
        message, 
        messageType,
        email: req.session.resetEmail,
        formData: req.session.formData || {}
    });
}

// Handle reset code verification
export async function handleResetCodeVerification(req, res) {
    try {
        const { code } = req.body;
        const email = req.session.resetEmail;
        
        if (!email) {
            req.session.message = 'Please start the password reset process again.';
            req.session.messageType = 'error';
            return res.redirect('/forgot-password');
        }
        
        // Basic validation
        if (!code) {
            req.session.message = 'Verification code is required';
            req.session.messageType = 'error';
            return res.redirect('/reset-password-verify');
        }
        
        // Validate code format (6 digits)
        if (!/^\d{6}$/.test(code)) {
            req.session.message = 'Please enter a valid 6-digit code';
            req.session.messageType = 'error';
            return res.redirect('/reset-password-verify');
        }
        
        // Check reset code
        const resetQuery = `
            SELECT user_id, expires_at 
            FROM password_resets 
            WHERE email = $1 AND reset_code = $2
        `;
        const resetResult = await db.query(resetQuery, [email, code]);
        
        if (resetResult.rows.length === 0) {
            req.session.message = 'Invalid verification code. Please try again.';
            req.session.messageType = 'error';
            return res.redirect('/reset-password-verify');
        }
        
        const resetRecord = resetResult.rows[0];
        
        // Check if code has expired
        if (new Date() > new Date(resetRecord.expires_at)) {
            req.session.message = 'Verification code has expired. Please request a new one.';
            req.session.messageType = 'error';
            return res.redirect('/forgot-password');
        }
        
        // Code is valid, allow password reset
        req.session.resetUserId = resetRecord.user_id;
        req.session.message = 'Code verified! Please enter your new password.';
        req.session.messageType = 'success';
        res.redirect('/reset-password');
        
    } catch (error) {
        console.error('Reset code verification error:', error);
        req.session.message = 'An error occurred. Please try again.';
        req.session.messageType = 'error';
        res.redirect('/reset-password-verify');
    }
}

// Render new password page
export function renderResetPassword(req, res) {
    if (!req.session.resetUserId || !req.session.resetEmail) {
        req.session.message = 'Please start the password reset process again.';
        req.session.messageType = 'error';
        return res.redirect('/forgot-password');
    }
    
    const message = req.session.message;
    const messageType = req.session.messageType;
    
    // Clear session messages
    delete req.session.message;
    delete req.session.messageType;
    
    res.render("auth/resetPassword", { 
        message, 
        messageType,
        email: req.session.resetEmail
    });
}

// Handle new password submission
export async function handlePasswordReset(req, res) {
    try {
        const { password, confirmPassword } = req.body;
        const userId = req.session.resetUserId;
        const email = req.session.resetEmail;
        
        if (!userId || !email) {
            req.session.message = 'Please start the password reset process again.';
            req.session.messageType = 'error';
            return res.redirect('/forgot-password');
        }
        
        // Validation
        if (!password || !confirmPassword) {
            req.session.message = 'Both password fields are required';
            req.session.messageType = 'error';
            return res.redirect('/reset-password');
        }
        
        if (password !== confirmPassword) {
            req.session.message = 'Passwords do not match';
            req.session.messageType = 'error';
            return res.redirect('/reset-password');
        }
        
        // Password strength validation
        if (password.length < 8) {
            req.session.message = 'Password must be at least 8 characters long';
            req.session.messageType = 'error';
            return res.redirect('/reset-password');
        }
        
        // Hash new password
        const saltRounds = 12;
        const hashedPassword = await bcrypt.hash(password, saltRounds);
        
        // Update user password
        const updateQuery = 'UPDATE users SET password = $1 WHERE id = $2';
        await db.query(updateQuery, [hashedPassword, userId]);
        
        // Delete used reset record
        const deleteResetQuery = 'DELETE FROM password_resets WHERE email = $1';
        await db.query(deleteResetQuery, [email]);
        
        // Clear session data
        delete req.session.resetEmail;
        delete req.session.resetUserId;
        
        req.session.message = 'Password reset successful! You can now log in with your new password.';
        req.session.messageType = 'success';
        res.redirect('/login');
        
    } catch (error) {
        console.error('Password reset error:', error);
        req.session.message = 'An error occurred. Please try again.';
        req.session.messageType = 'error';
        res.redirect('/reset-password');
    }
}
