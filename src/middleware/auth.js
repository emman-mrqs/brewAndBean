// src/middleware/auth.js
import session from 'express-session';
import jwt from 'jsonwebtoken';
import { parse as parseCookie } from 'cookie';
import db from '../database/db.js';

// Session configuration
export const sessionConfig = {
    secret: process.env.SESSION_SECRET || 'brew-and-bean-secret-key-change-in-production',
    resave: false,
    saveUninitialized: false,
    cookie: {
        secure: process.env.NODE_ENV === 'production', // HTTPS only in production
        httpOnly: true, // Prevent XSS attacks
        maxAge: 24 * 60 * 60 * 1000, // 24 hours
        sameSite: 'lax' // CSRF protection
    },
    name: 'brew.session.id' // Custom session name
};

// Authentication middleware
export function requireAuth(req, res, next) {
    if (req.session && req.session.isAuthenticated && req.session.user) {
        return next();
    }
    
    // Store the intended destination
    req.session.redirectTo = req.originalUrl;
    
    // Set flash message
    req.session.message = 'Please log in to access this page';
    req.session.messageType = 'info';
    
    res.redirect('/login');
}

// API Authentication middleware (returns JSON instead of redirect)
export function requireAuthAPI(req, res, next) {
    if (req.session && req.session.isAuthenticated && req.session.user) {
        return next();
    }
    
    // Return 401 Unauthorized for API requests
    return res.status(401).json({
        success: false,
        message: 'Authentication required. Please log in.',
        requiresLogin: true
    });
}

// Middleware to check if user is suspended (use after requireAuth)
export async function checkSuspension(req, res, next) {
    // Only check if user is authenticated
    if (!req.session || !req.session.isAuthenticated || !req.session.user) {
        return next();
    }

    try {
        // Check user's suspension status from database
        const result = await db.query(
            'SELECT is_suspended FROM users WHERE id = $1',
            [req.session.user.id]
        );

        if (result.rows.length === 0) {
            // User not found, set message and redirect to login
            req.session.message = 'Account not found. Please log in again.';
            req.session.messageType = 'error';
            req.session.isAuthenticated = false;
            delete req.session.user;
            return res.redirect('/login');
        }

        const user = result.rows[0];

        if (user.is_suspended) {
            // User is suspended, set message and redirect to login
            req.session.message = 'Your account has been suspended. Please contact support for assistance.';
            req.session.messageType = 'error';
            req.session.isAuthenticated = false;
            delete req.session.user;
            return res.redirect('/login');
        }

        // User is not suspended, continue
        next();
    } catch (error) {
        console.error('Error checking suspension status:', error);
        next(); // Continue on error to avoid blocking legitimate users
    }
}

// Guest middleware (redirect authenticated users)
export function requireGuest(req, res, next) {
    if (req.session && req.session.isAuthenticated) {
        return res.redirect('/');
    }
    next();
}

// Admin middleware
export function requireAdmin(req, res, next) {
    // Admins authenticate with a JWT stored in the `admin_token` cookie.
    // Do NOT mutate or set the express-session here — keep admin auth separate
    try {
        const rawCookies = req.headers?.cookie || '';
        const cookies = parseCookie(rawCookies || '');
        const token = cookies?.admin_token;

        if (!token) {
            return res.redirect('/');
        }

        const decoded = jwt.verify(token, process.env.ADMIN_JWT_SECRET);

        // Attach admin info to the request and view locals but do not touch session
        req.admin = decoded;
        res.locals.admin = decoded;
        res.locals.isAdmin = true;

        return next();
    } catch (err) {
        console.error('Admin auth error:', err?.message || err);
        return res.redirect('/');
    }
}

// Verification middleware
export function requireVerification(req, res, next) {
    if (!req.session || !req.session.isAuthenticated) {
        return requireAuth(req, res, next);
    }
    
    if (!req.session.user.isVerified) {
        req.session.message = 'Please verify your email address to access this feature';
        req.session.messageType = 'warning';
        return res.redirect('/signup?showVerify=true&email=' + encodeURIComponent(req.session.user.email));
    }
    
    next();
}

// Middleware to make user data available in all views
export function attachUserToViews(req, res, next) {
    res.locals.user = req.session?.user || null;
    res.locals.isAuthenticated = req.session?.isAuthenticated || false;
    res.locals.isVerified = req.session?.user?.isVerified || false;

    // Also attach admin info to views if an admin_token JWT is present (without altering session)
    try {
        const rawCookies = req.headers?.cookie || '';
        const cookies = parseCookie(rawCookies || '');
        const token = cookies?.admin_token;
        if (token) {
            const decoded = jwt.verify(token, process.env.ADMIN_JWT_SECRET);
            res.locals.admin = decoded;
            res.locals.isAdmin = true;
        } else {
            res.locals.admin = null;
            // do not override isAdmin if session-based auth exists
            if (!res.locals.isAdmin) res.locals.isAdmin = false;
        }
    } catch (e) {
        res.locals.admin = null;
        if (!res.locals.isAdmin) res.locals.isAdmin = false;
    }
    next();
}

// Middleware/helper to clear admin JWT cookie (end admin session)
export function endAdminSession(req, res, next) {
    try {
        // Clear the admin_token cookie (httpOnly) server-side
        res.clearCookie('admin_token', { httpOnly: true, secure: process.env.NODE_ENV === 'production', sameSite: 'lax' });
    } catch (e) {
        console.warn('Failed to clear admin_token cookie:', e?.message || e);
    }

    // Optionally, if the request also has a session (rare for JWT-only admins), clear admin flags
    if (req.session && req.session.user && req.session.user.isAdmin) {
        delete req.session.user.isAdmin;
    }

    // For route handlers that expect to continue, call next(); otherwise route can redirect
    next();
}

// Session cleanup middleware (optional)
export function cleanupSession(req, res, next) {
    // Remove old flash messages
    if (req.session) {
        delete req.session.formData;
        // Keep other session data intact
    }
    next();
}