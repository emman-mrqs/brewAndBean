//src/controller/auth/verificationController.js
import { 
    verifyUserWithCode, 
    getUserVerificationStatus, 
    updateVerificationCode, 
    findUserByEmail 
} from '../../database/authQueries.js';
import { generateVerificationCode, sendVerificationEmail, sendWelcomeEmail } from '../../utils/emailService.js';

export function renderVerification(req, res) {
    const email = req.query.email || req.session.pendingVerification?.email;
    
    if (!email) {
        req.session.message = 'No email specified for verification';
        req.session.messageType = 'error';
        return res.redirect('/auth/signup');
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
        const verificationResult = await verifyUserWithCode(email, verificationCode);
        
        if (!verificationResult.success) {
            return res.json({
                success: false,
                message: verificationResult.message
            });
        }
        
        // Send welcome email
        const user = verificationResult.user;
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
            redirectTo: '/auth/login?verified=true'
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
        const user = await findUserByEmail(email);
        if (!user) {
            return res.json({ 
                success: false, 
                message: 'User not found' 
            });
        }
        
        if (user.is_verified) {
            return res.json({ 
                success: false, 
                message: 'Email is already verified' 
            });
        }
        
        // Check current verification status
        const verificationStatus = await getUserVerificationStatus(email);
        
        // If code exists and not expired, inform user
        if (verificationStatus && 
            verificationStatus.verification_code && 
            !verificationStatus.isCodeExpired) {
            return res.json({ 
                success: false, 
                message: 'A verification code was already sent recently. Please check your email or wait for it to expire.' 
            });
        }
        
        // Generate new verification code
        const verificationCode = generateVerificationCode();
        await updateVerificationCode(user.id, verificationCode);
        
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
        
        const verificationStatus = await getUserVerificationStatus(email);
        
        if (!verificationStatus) {
            return res.json({ 
                success: false, 
                message: 'User not found' 
            });
        }
        
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
