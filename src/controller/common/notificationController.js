// src/controller/common/notificationController.js
import pool from '../../database/db.js';

/* ───────── User Notifications ───────── */

export async function getUserNotificationCount(req, res) {
  try {
    if (!req.session?.user?.id) return res.json({ count: 0 });
    const userId = req.session.user.id;
    console.log('getUserNotificationCount for user:', userId);
    
    // Count only if there are notifications for this user
    const { rows } = await pool.query(
      `SELECT COUNT(*)::int AS count
       FROM notifications
       WHERE user_id = $1`,
      [userId]
    );
    if (rows[0].count === 0) {
      // No notifications at all
      return res.json({ count: 0 });
    }
    // Otherwise, count unread
    const { rows: unreadRows } = await pool.query(
      `SELECT COUNT(*)::int AS count
       FROM notifications
       WHERE user_id = $1 AND is_read = FALSE`,
      [userId]
    );
    return res.json({ count: unreadRows[0].count });
  } catch (e) {
    console.error('getUserNotificationCount:', e);
    res.status(500).json({ count: 0 });
  }
}

export async function listUserNotifications(req, res) {
  try {
    if (!req.session?.user?.id) return res.json({ items: [] });
    const limit = Math.min(Number(req.query.limit || 15), 50);
    const { rows } = await pool.query(
      `SELECT id, type, title, message, order_id, is_read, created_at
       FROM notifications
       WHERE user_id = $1
       ORDER BY created_at DESC
       LIMIT $2`,
      [req.session.user.id, limit]
    );
    res.json({ items: rows });
  } catch (e) {
    console.error('listUserNotifications:', e);
    res.status(500).json({ items: [] });
  }
}

// ───── Replace this block in notificationController.js ─────
export async function markAllUserNotificationsRead(req, res) {
  try {
    if (!req.session?.user?.id) return res.status(401).json({ success: false, message: 'Not authenticated' });

    const client = await pool.connect();
    try {
      await client.query('BEGIN');

      // mark unread as read
      const updateResult = await client.query(
        `UPDATE notifications
         SET is_read = TRUE
         WHERE user_id = $1 AND is_read = FALSE
         RETURNING id`,
        [req.session.user.id]
      );
      console.log('Marked as read - notification IDs:', updateResult.rows.map(r => r.id));

      // return remaining unread count (should be 0)
      const { rows } = await client.query(
        `SELECT COUNT(*)::int AS count
         FROM notifications
         WHERE user_id = $1 AND is_read = FALSE`,
        [req.session.user.id]
      );
      
      console.log('After mark all read - remaining unread count:', rows[0].count);

      await client.query('COMMIT');
      res.json({ success: true, count: rows[0].count });
    } catch (e) {
      await client.query('ROLLBACK');
      throw e;
    } finally {
      client.release();
    }
  } catch (e) {
    console.error('markAllUserNotificationsRead:', e);
    res.status(500).json({ success: false });
  }
}

export async function markUserNotificationRead(req, res) {
  try {
    if (!req.session?.user?.id) return res.status(401).json({ success: false, message: 'Not authenticated' });
    const notificationId = Number(req.params.id);
    if (!notificationId) return res.status(400).json({ success: false, message: 'Invalid id' });

    const client = await pool.connect();
    try {
      await client.query('BEGIN');

      // Verify ownership
      const checkResult = await client.query(
        `SELECT id FROM notifications 
         WHERE id = $1 AND user_id = $2`,
        [notificationId, req.session.user.id]
      );

      if (checkResult.rows.length === 0) {
        await client.query('ROLLBACK');
        return res.status(404).json({ success: false, message: 'Notification not found' });
      }

      // Mark as read
      const updateResult = await client.query(
        `UPDATE notifications
         SET is_read = TRUE
         WHERE id = $1
         RETURNING id, is_read`,
        [notificationId]
      );
      console.log('Marked notification as read:', updateResult.rows[0]);

      // return remaining unread count
      const { rows } = await client.query(
        `SELECT COUNT(*)::int AS count
         FROM notifications
         WHERE user_id = $1 AND is_read = FALSE`,
        [req.session.user.id]
      );
      
      console.log('After marking single notification - remaining unread count:', rows[0].count);

      await client.query('COMMIT');
      res.json({ success: true, count: rows[0].count });
    } catch (e) {
      await client.query('ROLLBACK');
      throw e;
    } finally {
      client.release();
    }
  } catch (e) {
    console.error('markUserNotificationRead:', e);
    res.status(500).json({ success: false });
  }
}


/* ───────── Admin Notifications ───────── */

function isAdmin(req) {
  // Adjust if you have a different admin session flag
  return !!req.admin;
}

export async function getAdminNotificationCount(req, res) {
  try {
    if (!isAdmin(req)) return res.json({ count: 0 });
    const { rows } = await pool.query(
      `SELECT COUNT(*)::int AS count
       FROM admin_notifications
       WHERE is_read = FALSE`
    );
    res.json(rows[0]);
  } catch (e) {
    console.error('getAdminNotificationCount:', e);
    res.status(500).json({ count: 0 });
  }
}

export async function listAdminNotifications(req, res) {
  try {
    if (!isAdmin(req)) return res.json({ items: [] });
    const limit = Math.min(Number(req.query.limit || 15), 100);
    const { rows } = await pool.query(
      `SELECT id, type, title, message, order_id, is_read, created_at
       FROM admin_notifications
       ORDER BY created_at DESC
       LIMIT $1`,
      [limit]
    );
    res.json({ items: rows });
  } catch (e) {
    console.error('listAdminNotifications:', e);
    res.status(500).json({ items: [] });
  }
}

export async function markAllAdminNotificationsRead(req, res) {
  try {
    if (!isAdmin(req)) return res.json({ success: true });
    await pool.query(
      `UPDATE admin_notifications
       SET is_read = TRUE
       WHERE is_read = FALSE`
    );
    res.json({ success: true });
  } catch (e) {
    console.error('markAllAdminNotificationsRead:', e);
    res.status(500).json({ success: false });
  }
}

export async function markAdminNotificationRead(req, res) {
  try {
    if (!isAdmin(req)) return res.json({ success: false });
    const notificationId = req.params.id;
    
    // Check if the notification exists (admins can mark any admin notification)
    const checkResult = await pool.query(
      `SELECT id FROM admin_notifications 
       WHERE id = $1`,
      [notificationId]
    );
    
    if (checkResult.rows.length === 0) {
      return res.status(404).json({ success: false, message: 'Notification not found' });
    }
    
    // Mark as read
    await pool.query(
      `UPDATE admin_notifications
       SET is_read = TRUE
       WHERE id = $1`,
      [notificationId]
    );
    
    res.json({ success: true });
  } catch (e) {
    console.error('markAdminNotificationRead:', e);
    res.status(500).json({ success: false });
  }
}
