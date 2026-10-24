/**
 * Validation Middleware for Notification Endpoints
 */

/**
 * Validates the notification ID URL parameter (:id).
 */
const validateNotificationId = (req, res, next) => {
  const id = parseInt(req.params.id, 10);
  if (isNaN(id) || id <= 0) {
    return res.status(400).json({
      status: 'error',
      message: 'Invalid notification ID. Must be a positive integer.',
      statusCode: 400,
    });
  }
  req.params.id = id;
  next();
};

/**
 * Validates pagination query parameters for notification listing.
 */
const validateNotificationQuery = (req, res, next) => {
  const { page, limit, is_read } = req.query;
  const errors = [];

  if (page !== undefined) {
    const parsedPage = parseInt(page, 10);
    if (isNaN(parsedPage) || parsedPage < 1) {
      errors.push('Query parameter "page" must be a positive integer (1 or greater).');
    }
  }

  if (limit !== undefined) {
    const parsedLimit = parseInt(limit, 10);
    if (isNaN(parsedLimit) || parsedLimit < 1 || parsedLimit > 100) {
      errors.push('Query parameter "limit" must be an integer between 1 and 100.');
    }
  }

  if (is_read !== undefined) {
    const normalized = String(is_read).trim().toLowerCase();
    if (normalized !== 'true' && normalized !== 'false') {
      errors.push('Query parameter "is_read" must be either "true" or "false".');
    }
  }

  if (errors.length > 0) {
    return res.status(400).json({
      status: 'error',
      message: errors[0],
      errors,
      statusCode: 400,
    });
  }

  next();
};

module.exports = {
  validateNotificationId,
  validateNotificationQuery,
};
