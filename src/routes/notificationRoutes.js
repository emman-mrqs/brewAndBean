// src/routes/notificationRoutes.js
import express from 'express';
import {
  getUserNotificationCount,
  listUserNotifications,
  markAllUserNotificationsRead,
  markUserNotificationRead,
  getAdminNotificationCount,
  listAdminNotifications,
  markAllAdminNotificationsRead,
  markAdminNotificationRead
} from '../controller/common/notificationController.js';

const router = express.Router();

/* User */
router.get('/api/notifications/count', getUserNotificationCount);
router.get('/api/notifications',       listUserNotifications);
router.post('/api/notifications/mark-all-read', markAllUserNotificationsRead);
router.post('/api/notifications/:id/read', markUserNotificationRead);

/* Admin */
router.get('/admin/api/notifications/count', getAdminNotificationCount);
router.get('/admin/api/notifications',       listAdminNotifications);
router.post('/admin/api/notifications/mark-all-read', markAllAdminNotificationsRead);
router.post('/admin/api/notifications/:id/read', markAdminNotificationRead);

export default router;
