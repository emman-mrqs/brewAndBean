// src/controller/user/userSettingsController.js
import pool from '../../database/db.js';
import bcrypt from 'bcrypt';

const SALT_ROUNDS = 12;

class UserSettingsController {
  // GET /settings
// src/controller/user/userSettingsController.js (only the getSettings method)
static async getSettings(req, res) {
  try {
    if (!req.session || !req.session.user) {
      return res.redirect('/login');
    }

    const userId = req.session.user.id;

    // Select only columns that exist in your users table according to the diagram
    const q = `
      SELECT id, first_name, last_name, email, phone, auth_provider,
             is_suspended, created_at, updated_at
      FROM users
      WHERE id = $1
    `;
    const { rows } = await pool.query(q, [userId]);

    if (!rows.length) {
      // session user missing from DB, force logout
      req.session.isAuthenticated = false;
      delete req.session.user;
      return res.redirect('/login');
    }

    const freshUser = rows[0];

    // keep session in sync
    if (req.session) req.session.user = { ...req.session.user, ...freshUser };

    const { success, error } = req.query;
    return res.render('user/settings', {
      title: 'Settings - Bean & Brew',
      page: 'settings',
      user: freshUser,
      message: success || null,
      error: error || null
    });
  } catch (err) {
    console.error('getSettings error:', err);

    // Safer: don't attempt to render a non-existent generic 'error' view.
    // Return a simple error page / text so the app doesn't crash.
    res.status(500).send('Internal Server Error while loading settings.');
  }
}


  // POST /settings/profile
  static async updateProfile(req, res) {
    try {
      if (!req.session || !req.session.user) {
        return res.redirect('/login');
      }

      const userId = req.session.user.id;
      const { first_name, last_name, phone, email } = req.body;

      if (!first_name || !last_name || !email) {
        return res.redirect('/settings?error=' + encodeURIComponent('Please fill required fields.'));
      }

      // Optionally, prevent email change for external auth users by checking auth_provider
      const { rows: existingRows } = await pool.query('SELECT auth_provider FROM users WHERE id = $1', [userId]);
      if (!existingRows.length) {
        return res.redirect('/settings?error=' + encodeURIComponent('User not found.'));
      }

      const authProvider = existingRows[0].auth_provider;
      // If you want to disallow email change for OAuth users uncomment the next lines:
      // if (authProvider && authProvider !== 'local') {
      //   // ignore email update for external provider accounts
      //   // or return with error: return res.redirect('/settings?error=' + encodeURIComponent('Cannot change email for external auth accounts.'));
      // }

      const query = `
        UPDATE users
        SET first_name = $1,
            last_name  = $2,
            phone      = $3,
            email      = $4,
            updated_at = NOW()
        WHERE id = $5
        RETURNING id, first_name, last_name, phone, email, auth_provider;
      `;
      const values = [first_name.trim(), last_name.trim(), phone ? phone.trim() : null, email.trim(), userId];

      const result = await pool.query(query, values);

      // Keep session user in sync if you store user there
      if (req.session) {
        req.session.user = { ...req.session.user, ...result.rows[0] };
      }

      return res.redirect('/settings?success=' + encodeURIComponent('Profile updated.'));
    } catch (err) {
      console.error('updateProfile error:', err);
      return res.redirect('/settings?error=' + encodeURIComponent('Failed to update profile.'));
    }
  }

  // POST /settings/password
  static async updatePassword(req, res) {
    try {
      if (!req.session || !req.session.user) return res.redirect('/login');

      const userId = req.session.user.id;
      const { current_password, new_password, confirm_password } = req.body;

      if (!current_password || !new_password || !confirm_password) {
        return res.redirect('/settings?error=' + encodeURIComponent('Please fill all password fields.'));
      }
      if (new_password !== confirm_password) {
        return res.redirect('/settings?error=' + encodeURIComponent('New passwords do not match.'));
      }
      if (new_password.length < 8) {
        return res.redirect('/settings?error=' + encodeURIComponent('New password must be at least 8 characters.'));
      }

      const q = 'SELECT password, auth_provider FROM users WHERE id = $1';
      const { rows } = await pool.query(q, [userId]);
      if (!rows.length) return res.redirect('/settings?error=' + encodeURIComponent('User not found.'));

      const { password: hash, auth_provider } = rows[0];

      if (auth_provider && auth_provider !== 'local') {
        return res.redirect('/settings?error=' + encodeURIComponent('Password change is not allowed for external auth users.'));
      }

      const match = await bcrypt.compare(current_password, hash);
      if (!match) {
        return res.redirect('/settings?error=' + encodeURIComponent('Current password is incorrect.'));
      }

      const newHash = await bcrypt.hash(new_password, SALT_ROUNDS);
      await pool.query('UPDATE users SET password = $1, updated_at = NOW() WHERE id = $2', [newHash, userId]);

      return res.redirect('/settings?success=' + encodeURIComponent('Password changed successfully.'));
    } catch (err) {
      console.error('updatePassword error:', err);
      return res.redirect('/settings?error=' + encodeURIComponent('Failed to change password.'));
    }
  }

  // Optional generic updateSettings (keeps compatibility if your routes use it)
  static async updateSettings(req, res) {
    // A generic handler that for now delegates to updateProfile
    return this.updateProfile(req, res);
  }
}

export default UserSettingsController;
