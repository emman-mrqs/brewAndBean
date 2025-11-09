import express from 'express';
import jwt from 'jsonwebtoken';
import { parse } from 'cookie';
import { endAdminSession } from '../middleware/auth.js';

const router = express.Router();

// Show admin login page only when the secret path token matches
router.get('/admin/login/:token', (req, res) => {
  const token = req.params.token;
  if (!token || token !== process.env.ADMIN_LOGIN_TOKEN) {
    return res.status(404).send('Not Found');
  }

  // Render admin login view (same styling as user login)
  res.render('auth/adminLogin', {
    message: req.session?.message,
    messageType: req.session?.messageType,
    formData: {}
  });
});

// Handle admin login
router.post('/admin/login/:token', (req, res) => {
  const token = req.params.token;
  if (!token || token !== process.env.ADMIN_LOGIN_TOKEN) {
    return res.status(404).send('Not Found');
  }

  const { email, password } = req.body;
  // Basic validation
  if (!email || !password) {
    req.session.message = 'Email and password are required';
    req.session.messageType = 'error';
    return res.redirect(`/admin/login/${process.env.ADMIN_LOGIN_TOKEN}`);
  }

  const adminEmail = process.env.ADMIN_EMAIL;
  const adminPassword = process.env.ADMIN_PASSWORD;

  if (email === adminEmail && password === adminPassword) {
    // Create JWT
    const jwtToken = jwt.sign(
      { email: adminEmail, role: 'admin' },
      process.env.ADMIN_JWT_SECRET,
      { expiresIn: process.env.ADMIN_JWT_EXPIRES || '2h' }
    );

    // Set httpOnly cookie and session for compatibility with existing middleware
    res.cookie('admin_token', jwtToken, {
      httpOnly: true,
      secure: process.env.NODE_ENV === 'production',
      maxAge: 1000 * 60 * 60 * 2 // 2 hours (matches default)
    });

    // Also mark session as authenticated and admin so existing flows work
    // NOTE: intentionally do NOT set session values for admin; admins authenticate via JWT only
    return res.redirect('/admin');
  }

  req.session.message = 'Invalid admin credentials';
  req.session.messageType = 'error';
  return res.redirect(`/admin/login/${process.env.ADMIN_LOGIN_TOKEN}`);
});

export default router;

// Admin logout endpoint - clears the admin JWT and redirects to home
router.post('/admin/logout', endAdminSession, (req, res) => {
  // After middleware clears cookie, redirect to home or admin login path
  return res.redirect('/');
});
