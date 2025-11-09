//src/controller/auth/loginController.js
import db from '../../database/db.js';
import bcrypt from 'bcrypt';

export function renderLogin(req, res) {
    const message = req.session.message;
    const messageType = req.session.messageType;
    
    // Clear session messages
    delete req.session.message;
    delete req.session.messageType;
    
    res.render("auth/login", { 
        message, 
        messageType,
        formData: req.session.formData || {}
    });
}

export async function handleLogin(req, res) {
    try {
        const { email, password } = req.body;
        
        // Basic validation
        if (!email || !password) {
            req.session.message = 'Email and password are required';
            req.session.messageType = 'error';
            req.session.formData = { email };
            return res.redirect('/login');
        }
        
        // Find user by email and compare credentials
        const query = 'SELECT id, first_name, last_name, email, password, is_verified, is_suspended, phone FROM users WHERE email = $1';
        const result = await db.query(query, [email]);
        
        if (result.rows.length === 0) {
            req.session.message = 'Invalid email or password';
            req.session.messageType = 'error';
            req.session.formData = { email };
            return res.redirect('/login');
        }
        
        const user = result.rows[0];
        
        // Check if user is suspended
        if (user.is_suspended) {
            req.session.message = 'Your account has been suspended. Please contact support for assistance.';
            req.session.messageType = 'error';
            req.session.formData = { email };
            return res.redirect('/login');
        }
        
        // Check password using bcrypt
        const passwordMatch = await bcrypt.compare(password, user.password);
        
        if (!passwordMatch) {
            req.session.message = 'Invalid email or password';
            req.session.messageType = 'error';
            req.session.formData = { email };
            return res.redirect('/login');
        }
        
        // Check if user is verified
        if (!user.is_verified) {
            req.session.message = 'Please verify your email address before logging in.';
            req.session.messageType = 'error';
            return res.redirect('/signup');
        }
        
        // Set user session
        req.session.user = {
            id: user.id,
            firstName: user.first_name,
            lastName: user.last_name,
            email: user.email,
            phone: user.phone,
            isVerified: user.is_verified
        };
        
        req.session.isAuthenticated = true;
        
        // Set session expiry to 24 hours (no remember me option)
        req.session.cookie.maxAge = 24 * 60 * 60 * 1000; // 24 hours
        
        // Clear form data
        delete req.session.formData;
        
        // Redirect to home page
        res.redirect('/');
        
    } catch (error) {
        console.error('Login error:', error);
        req.session.message = 'An error occurred during login. Please try again.';
        req.session.messageType = 'error';
        req.session.formData = { email: req.body.email };
        res.redirect('/login');
    }
}

export function handleLogout(req, res) {
    req.session.destroy((err) => {
        if (err) {
            console.error('Logout error:', err);
            return res.redirect('/dashboard');
        }
        // Clear session cookie
        res.clearCookie('connect.sid');
        // Also clear admin JWT cookie if present so admin auth doesn't survive logout
        try {
            res.clearCookie('admin_token', { httpOnly: true, secure: process.env.NODE_ENV === 'production' });
        } catch (e) {
            // Ignore cookie clear errors; proceed with redirect
            console.warn('Could not clear admin_token cookie:', e?.message || e);
        }

        res.redirect('/login?message=Successfully logged out');
    });
}
