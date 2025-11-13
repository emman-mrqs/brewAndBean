//src/controller/auth/verificationController.js
import db from '../../database/db.js';
import { generateVerificationCode, sendVerificationEmail, sendWelcomeEmail } from '../../utils/emailService.js';

export function renderVerification(req, res) {
    const email = req.query.email || req.session.pendingVerification?.email;
    
    if (!email) {
        req.session.message = 'No email specified for verification';
        req.session.messageType = 'error';
        return res.redirect('/signup');
    }
    
    const message = req.session.message;
    const messageType = req.session.messageType;
    
    // Clear session messages
    delete req.session.message;
    delete req.session.messageType;
    
    res.render("auth/verification", { 
        email,
        message, 
        messageType
    });
}

export async function handleVerification(req, res) {
    try {
        const { email, verificationCode } = req.body;
        
        if (!email || !verificationCode) {
            return res.json({ 
                success: false, 
                message: 'Email and verification code are required' 
            });
        }
        
        if (verificationCode.length !== 6) {
            return res.json({ 
                success: false, 
                message: 'Verification code must be 6 digits' 
            });
        }
        
        // Verify the code
        const checkQuery = `
            SELECT id, email, first_name, last_name, verification_code, verification_expires, is_verified
            FROM users 
            WHERE email = $1 AND verification_code = $2
        `;
        
        const checkResult = await db.query(checkQuery, [email, verificationCode]);
        
        if (checkResult.rows.length === 0) {
            return res.json({
                success: false,
                message: 'Invalid verification code'
            });
        }
        
        const user = checkResult.rows[0];
        
        // Check if code has expired
        if (new Date() > new Date(user.verification_expires)) {
            return res.json({
                success: false,
                message: 'Verification code has expired'
            });
        }
        
        // Update user as verified and clear verification fields
        const updateQuery = `
            UPDATE users 
            SET is_verified = true, verification_code = NULL, verification_expires = NULL, updated_at = NOW()
            WHERE id = $1
            RETURNING id, email, first_name, last_name, is_verified
        `;
        
        const updateResult = await db.query(updateQuery, [user.id]);
        const updatedUser = updateResult.rows[0];
        try {
            await sendWelcomeEmail(user.email, user.first_name);
        } catch (emailError) {
            console.error('Failed to send welcome email:', emailError);
            // Don't fail verification if welcome email fails
        }
        
        // Clear pending verification from session
        delete req.session.pendingVerification;
        
        // Set success message for login page
        req.session.message = 'Email successfully verified! You can now log in to your account.';
        req.session.messageType = 'success';
        
        return res.json({
            success: true,
            message: 'Email successfully verified! Redirecting to login...',
            redirectTo: '/login?verified=true'
        });
        
    } catch (error) {
        console.error('Verification error:', error);
        return res.json({
            success: false,
            message: 'An error occurred during verification. Please try again.'
        });
    }
}

export async function handleResendCode(req, res) {
    try {
        const { email } = req.body;
        
        if (!email) {
            return res.json({ 
                success: false, 
                message: 'Email is required' 
            });
        }
        
        // Find user
        const findUserQuery = `
            SELECT id, email, first_name, last_name, phone, is_verified, verification_code, verification_expires, created_at
            FROM users
            WHERE email = $1
        `;
        
        const findUserResult = await db.query(findUserQuery, [email]);
        
        if (findUserResult.rows.length === 0) {
            return res.json({ 
                success: false, 
                message: 'User not found' 
            });
        }
        
        const user = findUserResult.rows[0];
        
        if (user.is_verified) {
            return res.json({ 
                success: false, 
                message: 'Email is already verified' 
            });
        }
        
        // Check current verification status
        const statusQuery = `
            SELECT id, email, first_name, is_verified, verification_code, verification_expires
            FROM users
            WHERE email = $1
        `;
        
        const statusResult = await db.query(statusQuery, [email]);
        
        if (statusResult.rows.length === 0) {
            return res.json({ 
                success: false, 
                message: 'User not found' 
            });
        }
        
        const verificationStatus = statusResult.rows[0];
        const now = new Date();
        const expiry = new Date(verificationStatus.verification_expires);
        const isCodeExpired = verificationStatus.verification_expires ? now > expiry : false;
        
        // If code exists and not expired, inform user
        if (verificationStatus.verification_code && !isCodeExpired) {
            return res.json({ 
                success: false, 
                message: 'A verification code was already sent recently. Please check your email or wait for it to expire.' 
            });
        }
        
        // Generate new verification code
        const verificationCode = generateVerificationCode();
        const expiryTime = new Date(Date.now() + 5 * 60 * 1000); // 5 minutes from now
        
        const updateCodeQuery = `
            UPDATE users 
            SET verification_code = $1, verification_expires = $2, updated_at = NOW()
            WHERE id = $3
        `;
        
        await db.query(updateCodeQuery, [verificationCode, expiryTime, user.id]);
        
        // Send verification email
        const emailResult = await sendVerificationEmail(email, verificationCode, user.first_name);
        
        if (!emailResult.success) {
            console.error('Failed to resend verification email:', emailResult.error);
            return res.json({
                success: false,
                message: 'Failed to send verification email. Please try again.'
            });
        }
        
        return res.json({
            success: true,
            message: 'New verification code sent to your email'
        });
        
    } catch (error) {
        console.error('Resend code error:', error);
        return res.json({
            success: false,
            message: 'An error occurred while resending the code. Please try again.'
        });
    }
}

export async function checkVerificationStatus(req, res) {
    try {
        const { email } = req.query;
        
        if (!email) {
            return res.json({ 
                success: false, 
                message: 'Email is required' 
            });
        }
        
        const statusQuery = `
            SELECT id, email, first_name, is_verified, verification_code, verification_expires
            FROM users
            WHERE email = $1
        `;
        
        const statusResult = await db.query(statusQuery, [email]);
        
        if (statusResult.rows.length === 0) {
            return res.json({ 
                success: false, 
                message: 'User not found' 
            });
        }
        
        const verificationStatus = statusResult.rows[0];
        const now = new Date();
        const expiry = new Date(verificationStatus.verification_expires);
        const isCodeExpired = verificationStatus.verification_expires ? now > expiry : false;
        
        return res.json({
            success: true,
            isVerified: verificationStatus.is_verified,
            hasCode: !!verificationStatus.verification_code,
            isCodeExpired: verificationStatus.isCodeExpired
        });
        
    } catch (error) {
        console.error('Check verification status error:', error);
        return res.json({
            success: false,
            message: 'An error occurred while checking verification status'
        });
    }
}
