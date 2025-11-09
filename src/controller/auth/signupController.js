//src/controller/auth/signupController.js
import db from '../../database/db.js';
import bcrypt from 'bcrypt';
import { generateVerificationCode, sendVerificationEmail } from '../../utils/emailService.js';

export function renderSignup(req, res) {
    const message = req.session.message;
    const messageType = req.session.messageType;
    
    // Clear session messages
    delete req.session.message;
    delete req.session.messageType;
    
    res.render("auth/signup", { 
        message, 
        messageType,
        formData: req.session.formData || {}
    });
}

export async function handleSignup(req, res) {
    try {
        const { firstName, lastName, email, phone, password, confirmPassword } = req.body;
        
        // Basic validation
        if (!firstName || !lastName || !email || !phone || !password) {
            req.session.message = 'All fields are required';
            req.session.messageType = 'error';
            req.session.formData = { firstName, lastName, email, phone };
            return res.redirect('/signup');
        }
        
        if (password !== confirmPassword) {
            req.session.message = 'Passwords do not match';
            req.session.messageType = 'error';
            req.session.formData = { firstName, lastName, email, phone };
            return res.redirect('/signup');
        }
        
        if (password.length < 6) {
            req.session.message = 'Password must be at least 6 characters long';
            req.session.messageType = 'error';
            req.session.formData = { firstName, lastName, email, phone };
            return res.redirect('/signup');
        }
        
        // Email validation
        const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
        if (!emailRegex.test(email)) {
            req.session.message = 'Please enter a valid email address';
            req.session.messageType = 'error';
            req.session.formData = { firstName, lastName, email, phone };
            return res.redirect('/signup');
        }
        
        // Check if user already exists
        const checkQuery = 'SELECT * FROM users WHERE email = $1';
        const existingResult = await db.query(checkQuery, [email]);
        
        if (existingResult.rows.length > 0) {
            const existingUser = existingResult.rows[0];

            // If the existing account was created via Google OAuth, reject local signup with a clear message
            if (existingUser.auth_provider === 'google') {
                req.session.message = 'An account with this email already exists via Google sign-in. Please sign in with Google.';
                req.session.messageType = 'error';
                return res.redirect('/signup');
            }

            if (existingUser.is_verified) {
                req.session.message = 'An account with this email already exists. Please login.';
                req.session.messageType = 'error';
                return res.redirect('/login');
            } else {
                // User exists but not verified - generate new verification code and show verification form
                const verificationCode = generateVerificationCode();
                const expiryTime = new Date(Date.now() + 5 * 60 * 1000); // 5 minutes from now
                
                const updateQuery = `
                    UPDATE users 
                    SET verification_code = $1, verification_expires = $2, updated_at = NOW()
                    WHERE id = $3
                `;
                
                await db.query(updateQuery, [verificationCode, expiryTime, existingUser.id]);
                
                // Send new verification email
                const emailResult = await sendVerificationEmail(email, verificationCode, existingUser.first_name);
                
                if (!emailResult.success) {
                    console.error('Failed to send verification email:', emailResult.error);
                    req.session.message = 'Failed to send verification email. Please try again.';
                    req.session.messageType = 'error';
                    return res.redirect('/signup');
                }
                
                req.session.message = 'Account exists but not verified. Please check your email for verification code.';
                req.session.messageType = 'info';
                
                // Store user info for verification
                req.session.pendingVerification = {
                    userId: existingUser.id,
                    email: email,
                    firstName: existingUser.first_name
                };
                
                return res.redirect('/signup?showVerify=true&email=' + encodeURIComponent(email));
            }
        }
        
        // Hash password
        const saltRounds = 12;
        const hashedPassword = await bcrypt.hash(password, saltRounds);
        
        // Create new user
        const createQuery = `
            INSERT INTO users (first_name, last_name, email, phone, password, is_verified, created_at, updated_at)
            VALUES ($1, $2, $3, $4, $5, $6, NOW(), NOW())
            RETURNING id, first_name, last_name, email, phone, is_verified, created_at
        `;
        
        const createValues = [firstName, lastName, email, phone, hashedPassword, false];
        const createResult = await db.query(createQuery, createValues);
        const newUser = createResult.rows[0];
        
        // Generate and set verification code
        const verificationCode = generateVerificationCode();
        const expiryTime = new Date(Date.now() + 5 * 60 * 1000); // 5 minutes from now
        
        const updateQuery = `
            UPDATE users 
            SET verification_code = $1, verification_expires = $2, updated_at = NOW()
            WHERE id = $3
        `;
        
        await db.query(updateQuery, [verificationCode, expiryTime, newUser.id]);
        
        // Send verification email
        const emailResult = await sendVerificationEmail(email, verificationCode, firstName);
        
        if (!emailResult.success) {
            console.error('Failed to send verification email:', emailResult.error);
            req.session.message = 'Account created but failed to send verification email. Please try again.';
            req.session.messageType = 'error';
            return res.redirect('/signup');
        }
        
        // Store user info in session for verification process
        req.session.pendingVerification = {
            userId: newUser.id,
            email: email,
            firstName: firstName
        };

        req.session.message = 'Account created successfully! Please check your email for the 6-digit verification code.';
        req.session.messageType = 'success';
        
        // Redirect to verification form on same page
        res.redirect('/signup?showVerify=true&email=' + encodeURIComponent(email));
        
    } catch (error) {
        console.error('Signup error:', error);
        req.session.message = 'An error occurred during signup. Please try again.';
        req.session.messageType = 'error';
        req.session.formData = { firstName, lastName, email, phone };
        res.redirect('/signup');
    }
}

// Function to handle verification code submission
export async function handleVerification(req, res) {
    try {
        const { email, verificationCode } = req.body;
        
        if (!email || !verificationCode) {
            req.session.message = 'Email and verification code are required';
            req.session.messageType = 'error';
            return res.redirect('/signup');
        }
        
        // Check if code exists and is not expired
        const checkQuery = `
            SELECT id, email, first_name, verification_code, verification_expires
            FROM users 
            WHERE email = $1 AND verification_code = $2
        `;
        
        const checkResult = await db.query(checkQuery, [email, verificationCode]);
        
        if (checkResult.rows.length === 0) {
            req.session.message = 'Invalid verification code';
            req.session.messageType = 'error';
            return res.redirect('/signup');
        }
        
        const user = checkResult.rows[0];
        
        // Check if code has expired
        if (new Date() > new Date(user.verification_expires)) {
            req.session.message = 'Verification code has expired';
            req.session.messageType = 'error';
            return res.redirect('/signup');
        }
        
        // Update user as verified and clear verification fields
        const updateQuery = `
            UPDATE users 
            SET is_verified = true, verification_code = NULL, verification_expires = NULL, updated_at = NOW()
            WHERE id = $1
        `;
        
        await db.query(updateQuery, [user.id]);
        
        // Clear pending verification from session
        delete req.session.pendingVerification;
        
        req.session.message = 'Email successfully verified! You can now login.';
        req.session.messageType = 'success';
        
        res.redirect('/login');
        
    } catch (error) {
        console.error('Verification error:', error);
        req.session.message = 'An error occurred during verification. Please try again.';
        req.session.messageType = 'error';
        res.redirect('/signup');
    }
}
