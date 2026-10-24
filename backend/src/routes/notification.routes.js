const express = require('express');
const router = express.Router();

const notificationController = require('../controllers/notification.controller');
const { authenticate } = require('../middleware/auth.middleware');
const {
  validateNotificationId,
  validateNotificationQuery,
} = require('../middleware/notificationValidator');

// Retrieve notifications for authenticated user (supports pagination & read filtering)
router.get(
  '/',
  authenticate,
  validateNotificationQuery,
  notificationController.getUserNotifications
);

// Retrieve total unread notifications count for authenticated user
router.get(
  '/unread-count',
  authenticate,
  notificationController.getUnreadCount
);

// Mark all unread notifications for authenticated user as read
router.patch(
  '/read-all',
  authenticate,
  notificationController.markAllAsRead
);

// Mark a single notification as read (scoped to authenticated user)
router.patch(
  '/:id/read',
  authenticate,
  validateNotificationId,
  notificationController.markAsRead
);

module.exports = router;
