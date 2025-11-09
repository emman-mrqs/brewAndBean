// src/utils/emailService.js
import nodemailer from 'nodemailer';

// Create transporter
const transporter = nodemailer.createTransport({
    service: 'gmail',
    auth: {
        user: process.env.EMAIL_USER,
        pass: process.env.EMAIL_PASS
    }
});

// Generate 6-digit verification code
export function generateVerificationCode() {
    return Math.floor(100000 + Math.random() * 900000).toString();
}

// Send verification email
export async function sendVerificationEmail(email, verificationCode, firstName) {
    const mailOptions = {
        from: process.env.EMAIL_USER,
        to: email,
        subject: 'Bean & Brew - Email Verification',
        html: `
            <!DOCTYPE html>
            <html>
            <head>
                <style>
                    body { font-family: 'Arial', sans-serif; margin: 0; padding: 0; background-color: #f5f5f5; }
                    .container { max-width: 600px; margin: 0 auto; background-color: white; }
                    .header { background: linear-gradient(135deg, #6B4423 0%, #8B4513 100%); color: white; text-align: center; padding: 30px; }
                    .logo { font-size: 2.5rem; margin-bottom: 10px; }
                    .brand { font-size: 1.8rem; font-weight: bold; letter-spacing: 2px; }
                    .content { padding: 40px 30px; }
                    .welcome { font-size: 1.4rem; color: #333; margin-bottom: 20px; }
                    .code-container { background: #f8f9fa; border: 2px dashed #6B4423; border-radius: 10px; padding: 30px; text-align: center; margin: 30px 0; }
                    .code { font-size: 3rem; font-weight: bold; color: #6B4423; letter-spacing: 8px; margin: 20px 0; }
                    .instructions { color: #666; line-height: 1.6; margin: 20px 0; }
                    .footer { background: #333; color: white; text-align: center; padding: 20px; }
                    .warning { color: #e74c3c; font-weight: bold; margin-top: 20px; }
                </style>
            </head>
            <body>
                <div class="container">
                    <div class="header">
                        <div class="logo">☕</div>
                        <div class="brand">BEAN & BREW</div>
                        <p>Premium Coffee Experience</p>
                    </div>
                    
                    <div class="content">
                        <h2 class="welcome">Welcome${firstName ? `, ${firstName}` : ''}!</h2>
                        <p>Thank you for joining Bean & Brew! To complete your registration, please verify your email address using the code below:</p>
                        
                        <div class="code-container">
                            <p style="margin: 0; color: #666;">Your Verification Code</p>
                            <div class="code">${verificationCode}</div>
                            <p style="margin: 0; color: #666;">Enter this code to activate your account</p>
                        </div>
                        
                        <div class="instructions">
                            <strong>Instructions:</strong>
                            <ul>
                                <li>This code is valid for <strong>5 minutes</strong></li>
                                <li>Enter the code on the verification page</li>
                                <li>If you need a new code, click "Resend Code"</li>
                                <li>You can complete verification anytime later</li>
                            </ul>
                        </div>
                        
                        <p class="warning">⚠️ This code will expire in 5 minutes for security purposes.</p>
                        
                        <p>If you didn't create this account, please ignore this email.</p>
                    </div>
                    
                    <div class="footer">
                        <p>&copy; 2024 Bean & Brew. All rights reserved.</p>
                        <p>Brewing excellence, one cup at a time ☕</p>
                    </div>
                </div>
            </body>
            </html>
        `
    };

    try {
        await transporter.sendMail(mailOptions);
        return { success: true };
    } catch (error) {
        console.error('Email sending error:', error);
        return { success: false, error: error.message };
    }
}

// Send welcome email after successful verification
export async function sendWelcomeEmail(email, firstName) {
    const mailOptions = {
        from: process.env.EMAIL_USER,
        to: email,
        subject: 'Welcome to Bean & Brew - Account Verified!',
        html: `
            <!DOCTYPE html>
            <html>
            <head>
                <style>
                    body { font-family: 'Arial', sans-serif; margin: 0; padding: 0; background-color: #f5f5f5; }
                    .container { max-width: 600px; margin: 0 auto; background-color: white; }
                    .header { background: linear-gradient(135deg, #6B4423 0%, #8B4513 100%); color: white; text-align: center; padding: 30px; }
                    .logo { font-size: 2.5rem; margin-bottom: 10px; }
                    .brand { font-size: 1.8rem; font-weight: bold; letter-spacing: 2px; }
                    .content { padding: 40px 30px; text-align: center; }
                    .success-icon { font-size: 4rem; color: #27ae60; margin-bottom: 20px; }
                    .footer { background: #333; color: white; text-align: center; padding: 20px; }
                </style>
            </head>
            <body>
                <div class="container">
                    <div class="header">
                        <div class="logo">☕</div>
                        <div class="brand">BEAN & BREW</div>
                    </div>
                    
                    <div class="content">
                        <div class="success-icon">✅</div>
                        <h2>Account Successfully Verified!</h2>
                        <p>Hi ${firstName || 'Coffee Lover'},</p>
                        <p>Your Bean & Brew account has been successfully verified! You can now:</p>
                        <ul style="text-align: left; max-width: 400px; margin: 0 auto;">
                            <li>Browse our premium coffee menu</li>
                            <li>Place orders and track deliveries</li>
                            <li>Earn rewards and exclusive offers</li>
                            <li>Access member-only specialties</li>
                        </ul>
                        <p><strong>Ready to start your coffee journey?</strong></p>
                        <p>Log in to your account and explore our world-class coffee experience!</p>
                    </div>
                    
                    <div class="footer">
                        <p>&copy; 2024 Bean & Brew. All rights reserved.</p>
                        <p>Welcome to the family! ☕</p>
                    </div>
                </div>
            </body>
            </html>
        `
    };

    try {
        await transporter.sendMail(mailOptions);
        return { success: true };
    } catch (error) {
        console.error('Welcome email error:', error);
        return { success: false, error: error.message };
    }
}

// Send password reset email
export async function sendPasswordResetEmail(email, resetCode, firstName) {
    const mailOptions = {
        from: process.env.EMAIL_USER,
        to: email,
        subject: 'Bean & Brew - Password Reset Request',
        html: `
            <!DOCTYPE html>
            <html>
            <head>
                <style>
                    body { font-family: 'Arial', sans-serif; margin: 0; padding: 0; background-color: #f5f5f5; }
                    .container { max-width: 600px; margin: 0 auto; background-color: white; }
                    .header { background: linear-gradient(135deg, #6B4423 0%, #8B4513 100%); color: white; text-align: center; padding: 30px; }
                    .logo { font-size: 2.5rem; margin-bottom: 10px; }
                    .brand { font-size: 1.8rem; font-weight: bold; letter-spacing: 2px; }
                    .content { padding: 40px 30px; }
                    .reset-title { font-size: 1.4rem; color: #333; margin-bottom: 20px; }
                    .code-container { background: #fff3cd; border: 2px solid #ffc107; border-radius: 10px; padding: 30px; text-align: center; margin: 30px 0; }
                    .code { font-size: 3rem; font-weight: bold; color: #856404; letter-spacing: 8px; margin: 20px 0; }
                    .instructions { color: #666; line-height: 1.6; margin: 20px 0; }
                    .footer { background: #333; color: white; text-align: center; padding: 20px; }
                    .warning { color: #e74c3c; font-weight: bold; margin-top: 20px; }
                    .security-note { background: #f8d7da; border: 1px solid #f5c6cb; color: #721c24; padding: 15px; border-radius: 5px; margin: 20px 0; }
                </style>
            </head>
            <body>
                <div class="container">
                    <div class="header">
                        <div class="logo">☕</div>
                        <div class="brand">BEAN & BREW</div>
                        <p>Password Reset Request</p>
                    </div>
                    
                    <div class="content">
                        <h2 class="reset-title">Password Reset Request</h2>
                        <p>Hi${firstName ? `, ${firstName}` : ''},</p>
                        <p>We received a request to reset your Bean & Brew account password. Use the verification code below to proceed with your password reset:</p>
                        
                        <div class="code-container">
                            <p style="margin: 0; color: #856404; font-weight: bold;">Password Reset Code</p>
                            <div class="code">${resetCode}</div>
                            <p style="margin: 0; color: #856404;">Enter this code to reset your password</p>
                        </div>
                        
                        <div class="instructions">
                            <strong>Next Steps:</strong>
                            <ol>
                                <li>Go to the password reset page</li>
                                <li>Enter your email address</li>
                                <li>Enter the 6-digit code above</li>
                                <li>Create your new password</li>
                            </ol>
                        </div>
                        
                        <div class="security-note">
                            <strong>🛡️ Security Notice:</strong>
                            <ul style="margin: 10px 0; padding-left: 20px;">
                                <li>This code expires in <strong>10 minutes</strong></li>
                                <li>Only use this code if you requested the password reset</li>
                                <li>Never share this code with anyone</li>
                            </ul>
                        </div>
                        
                        <p class="warning">⚠️ If you didn't request this password reset, please ignore this email and your password will remain unchanged.</p>
                    </div>
                    
                    <div class="footer">
                        <p>&copy; 2024 Bean & Brew. All rights reserved.</p>
                        <p>Keep your account secure ☕</p>
                    </div>
                </div>
            </body>
            </html>
        `
    };

    try {
        await transporter.sendMail(mailOptions);
        return { success: true };
    } catch (error) {
        console.error('Password reset email error:', error);
        return { success: false, error: error.message };
    }
}

// Send suspension notification email
export async function sendSuspensionEmail(email, firstName, reason, suspensionType, endDate, customMessage) {
    const isPermanent = suspensionType === 'permanent';
    const suspensionDuration = isPermanent 
        ? 'permanently' 
        : `until ${new Date(endDate).toLocaleString('en-US', { dateStyle: 'long', timeStyle: 'short' })}`;

    const mailOptions = {
        from: process.env.EMAIL_USER,
        to: email,
        subject: 'Account Suspension Notice - Bean & Brew',
        html: `
            <!DOCTYPE html>
            <html>
            <head>
                <style>
                    body { font-family: 'Arial', sans-serif; margin: 0; padding: 0; background-color: #f5f5f5; }
                    .container { max-width: 600px; margin: 0 auto; background-color: white; }
                    .header { background: linear-gradient(135deg, #dc3545 0%, #c82333 100%); color: white; text-align: center; padding: 30px; }
                    .logo { font-size: 2.5rem; margin-bottom: 10px; }
                    .brand { font-size: 1.8rem; font-weight: bold; letter-spacing: 2px; }
                    .content { padding: 40px 30px; }
                    .alert-box { background: #fff3cd; border-left: 4px solid #ffc107; padding: 20px; margin: 20px 0; }
                    .reason-box { background: #f8f9fa; border-radius: 10px; padding: 20px; margin: 20px 0; }
                    .info-row { display: flex; justify-content: space-between; margin: 10px 0; padding: 10px 0; border-bottom: 1px solid #dee2e6; }
                    .info-label { font-weight: bold; color: #666; }
                    .info-value { color: #333; }
                    .footer { background: #333; color: white; text-align: center; padding: 20px; }
                    .warning { color: #dc3545; font-weight: bold; }
                </style>
            </head>
            <body>
                <div class="container">
                    <div class="header">
                        <div class="logo">⚠️</div>
                        <div class="brand">BEAN & BREW</div>
                        <p>Account Suspension Notice</p>
                    </div>
                    
                    <div class="content">
                        <h2>Hello${firstName ? `, ${firstName}` : ''},</h2>
                        
                        <div class="alert-box">
                            <h3 style="margin-top: 0; color: #856404;">
                                <i class="fas fa-exclamation-triangle"></i> Your account has been suspended
                            </h3>
                            <p style="margin-bottom: 0;">Your Bean & Brew account has been suspended ${suspensionDuration}.</p>
                        </div>

                        <div class="reason-box">
                            <div class="info-row">
                                <span class="info-label">Suspension Type:</span>
                                <span class="info-value">${isPermanent ? 'Permanent' : 'Temporary'}</span>
                            </div>
                            ${!isPermanent ? `
                            <div class="info-row">
                                <span class="info-label">End Date:</span>
                                <span class="info-value">${new Date(endDate).toLocaleString('en-US', { dateStyle: 'long', timeStyle: 'short' })}</span>
                            </div>
                            ` : ''}
                            <div class="info-row" style="border-bottom: none;">
                                <span class="info-label">Reason:</span>
                            </div>
                            <p style="color: #333; margin: 10px 0;">${reason}</p>
                        </div>

                        ${customMessage ? `
                        <div style="margin: 20px 0; padding: 15px; background: #e7f3ff; border-radius: 8px;">
                            <strong>Additional Information:</strong>
                            <p style="margin: 10px 0 0 0;">${customMessage}</p>
                        </div>
                        ` : ''}

                        <p><strong>What this means:</strong></p>
                        <ul>
                            <li>You will not be able to log in to your account</li>
                            <li>Your active orders and data remain secure</li>
                            <li>You cannot place new orders during the suspension period</li>
                            ${!isPermanent ? '<li>Your account will be automatically restored after the suspension period</li>' : ''}
                        </ul>

                        <p class="warning">If you believe this is a mistake or would like to appeal this decision, please contact our support team.</p>
                    </div>
                    
                    <div class="footer">
                        <p>&copy; 2024 Bean & Brew. All rights reserved.</p>
                        <p>Support: ${process.env.EMAIL_USER}</p>
                    </div>
                </div>
            </body>
            </html>
        `
    };

    try {
        await transporter.sendMail(mailOptions);
        return { success: true };
    } catch (error) {
        console.error('Suspension email error:', error);
        return { success: false, error: error.message };
    }
}

// Send suspension lifted email
export async function sendSuspensionLiftedEmail(email, firstName) {
    const mailOptions = {
        from: process.env.EMAIL_USER,
        to: email,
        subject: 'Account Suspension Lifted - Bean & Brew',
        html: `
            <!DOCTYPE html>
            <html>
            <head>
                <style>
                    body { font-family: 'Arial', sans-serif; margin: 0; padding: 0; background-color: #f5f5f5; }
                    .container { max-width: 600px; margin: 0 auto; background-color: white; }
                    .header { background: linear-gradient(135deg, #28a745 0%, #218838 100%); color: white; text-align: center; padding: 30px; }
                    .logo { font-size: 2.5rem; margin-bottom: 10px; }
                    .brand { font-size: 1.8rem; font-weight: bold; letter-spacing: 2px; }
                    .content { padding: 40px 30px; }
                    .success-box { background: #d4edda; border-left: 4px solid #28a745; padding: 20px; margin: 20px 0; }
                    .footer { background: #333; color: white; text-align: center; padding: 20px; }
                    .btn { display: inline-block; padding: 12px 30px; background: #28a745; color: white; text-decoration: none; border-radius: 5px; margin: 20px 0; }
                </style>
            </head>
            <body>
                <div class="container">
                    <div class="header">
                        <div class="logo">✅</div>
                        <div class="brand">BEAN & BREW</div>
                        <p>Account Restored</p>
                    </div>
                    
                    <div class="content">
                        <h2>Great News${firstName ? `, ${firstName}` : ''}!</h2>
                        
                        <div class="success-box">
                            <h3 style="margin-top: 0; color: #155724;">
                                Your account suspension has been lifted
                            </h3>
                            <p style="margin-bottom: 0;">You can now access your Bean & Brew account and enjoy our services again.</p>
                        </div>

                        <p><strong>What you can do now:</strong></p>
                        <ul>
                            <li>Log in to your account</li>
                            <li>Browse our menu and place orders</li>
                            <li>Access all premium features</li>
                            <li>Enjoy your favorite coffee</li>
                        </ul>

                        <p>We're happy to have you back! If you have any questions, feel free to reach out to our support team.</p>

                        <div style="text-align: center;">
                            <a href="${process.env.APP_URL || 'http://localhost:3000'}/login" class="btn">Login to Your Account</a>
                        </div>
                    </div>
                    
                    <div class="footer">
                        <p>&copy; 2024 Bean & Brew. All rights reserved.</p>
                        <p>Brewing excellence, one cup at a time ☕</p>
                    </div>
                </div>
            </body>
            </html>
        `
    };

    try {
        await transporter.sendMail(mailOptions);
        return { success: true };
    } catch (error) {
        console.error('Suspension lifted email error:', error);
        return { success: false, error: error.message };
    }
}