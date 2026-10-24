const notificationService = require('../services/notification.service');

/**
 * Handle listing notifications for authenticated user.
 */
const getUserNotifications = async (req, res, next) => {
  try {
    const result = await notificationService.getUserNotifications(req.user.id, req.query);
    return res.status(200).json({
      status: 'success',
      data: result,
    });
  } catch (error) {
    next(error);
  }
};

/**
 * Handle retrieving unread notification count for authenticated user.
 */
const getUnreadCount = async (req, res, next) => {
  try {
    const result = await notificationService.getUnreadNotificationCount(req.user.id);
    return res.status(200).json({
      status: 'success',
      data: result,
    });
  } catch (error) {
    next(error);
  }
};

/**
 * Handle marking a single notification as read.
 */
const markAsRead = async (req, res, next) => {
  try {
    const notification = await notificationService.markNotificationAsRead(req.user.id, req.params.id);
    return res.status(200).json({
      status: 'success',
      message: 'Notification marked as read.',
      data: { notification },
    });
  } catch (error) {
    next(error);
  }
};

/**
 * Handle marking all notifications as read for authenticated user.
 */
const markAllAsRead = async (req, res, next) => {
  try {
    const result = await notificationService.markAllNotificationsAsRead(req.user.id);
    return res.status(200).json({
      status: 'success',
      message: 'All notifications marked as read.',
      data: result,
    });
  } catch (error) {
    next(error);
  }
};

module.exports = {
  getUserNotifications,
  getUnreadCount,
  markAsRead,
  markAllAsRead,
};
