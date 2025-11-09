import express from "express";
const router = express.Router();

// Import Controllers
import { renderLogin, handleLogin, handleLogout } from "../controller/auth/loginController.js";
import { 
    renderForgotPassword, 
    handleForgotPassword, 
    renderResetPasswordVerify, 
    handleResetCodeVerification, 
    renderResetPassword, 
    handlePasswordReset 
} from "../controller/auth/forgotPasswordController.js";
import { requireGuest, requireAuth } from "../middleware/auth.js";
import passport from 'passport';

// Login routes
router.get("/login", requireGuest, renderLogin);
router.post("/login", requireGuest, handleLogin);

// Logout route
router.post("/logout", requireAuth, handleLogout);
router.get("/logout", requireAuth, handleLogout);

// Forgot Password routes
router.get("/forgot-password", requireGuest, renderForgotPassword);
router.post("/forgot-password", requireGuest, handleForgotPassword);

// Reset Password Verification routes
router.get("/reset-password-verify", requireGuest, renderResetPasswordVerify);
router.post("/reset-password-verify", requireGuest, handleResetCodeVerification);

// New Password routes
router.get("/reset-password", requireGuest, renderResetPassword);
router.post("/reset-password", requireGuest, handlePasswordReset);

// Google OAuth routes
router.get('/auth/google', passport.authenticate('google', { scope: ['profile', 'email'] }));

router.get('/auth/google/callback', passport.authenticate('google', { failureRedirect: '/login' }), (req, res) => {
    // At this point, passport has set req.user via deserializeUser
    if (req.user) {
        // Mirror session setup used in local login
        req.session.user = {
            id: req.user.id,
            firstName: req.user.first_name || '',
            lastName: req.user.last_name || '',
            email: req.user.email,
            phone: req.user.phone || null,
            isVerified: req.user.is_verified || true
        };
        req.session.isAuthenticated = true;
        // Redirect to originally intended URL or home
        const redirectTo = req.session.redirectTo || '/';
        delete req.session.redirectTo;
        return res.redirect(redirectTo);
    }
    return res.redirect('/login');
});

export default router;