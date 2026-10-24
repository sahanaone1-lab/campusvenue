const { pool } = require('../config/database');

/**
 * Retrieves notifications for the authenticated user with pagination and optional read filter.
 * Always strictly scopes results to recipient_user_id = userId.
 * 
 * @param {number} userId - Authenticated user ID (from req.user.id)
 * @param {object} params
 * @param {number} [params.page=1]
 * @param {number} [params.limit=10]
 * @param {string|boolean} [params.is_read]
 * @returns {Promise<{ notifications: Array, unread_count: number, pagination: object }>}
 */
const getUserNotifications = async (userId, { page = 1, limit = 10, is_read }) => {
  const safePage = Math.max(1, parseInt(page, 10) || 1);
  const safeLimit = Math.min(100, Math.max(1, parseInt(limit, 10) || 10));
  const offset = (safePage - 1) * safeLimit;

  const conditions = ['recipient_user_id = $1'];
  const queryParams = [userId];

  if (is_read !== undefined && is_read !== null) {
    const isReadBool = String(is_read).trim().toLowerCase() === 'true';
    queryParams.push(isReadBool);
    conditions.push(`is_read = $${queryParams.length}`);
  }

  const whereClause = `WHERE ${conditions.join(' AND ')}`;

  // 1. Total matching count for pagination
  const countQuery = `SELECT COUNT(*) AS total FROM notifications ${whereClause};`;
  const countRes = await pool.query(countQuery, queryParams);
  const total = parseInt(countRes.rows[0].total, 10);

  // 2. Global unread count for the user
  const unreadRes = await pool.query(
    'SELECT COUNT(*) AS unread_count FROM notifications WHERE recipient_user_id = $1 AND is_read = false;',
    [userId]
  );
  const unreadCount = parseInt(unreadRes.rows[0].unread_count, 10);

  // 3. Paginated notifications data query
  const dataParams = [...queryParams, safeLimit, offset];
  const limitIdx = dataParams.length - 1;
  const offsetIdx = dataParams.length;

  const dataQuery = `
    SELECT
      id, type, title, message, related_entity_type, related_entity_id,
      is_read, created_at
    FROM notifications
    ${whereClause}
    ORDER BY created_at DESC, id DESC
    LIMIT $${limitIdx} OFFSET $${offsetIdx};
  `;

  const { rows } = await pool.query(dataQuery, dataParams);

  const notifications = rows.map((r) => ({
    id: r.id,
    type: r.type,
    title: r.title,
    message: r.message,
    related_entity_type: r.related_entity_type,
    related_entity_id: r.related_entity_id,
    is_read: r.is_read,
    created_at: r.created_at,
  }));

  return {
    notifications,
    unread_count: unreadCount,
    pagination: {
      total,
      page: safePage,
      limit: safeLimit,
      totalPages: Math.ceil(total / safeLimit) || 1,
    },
  };
};

/**
 * Retrieves the count of unread notifications for the authenticated user.
 * 
 * @param {number} userId - Authenticated user ID
 * @returns {Promise<{ unread_count: number }>}
 */
const getUnreadNotificationCount = async (userId) => {
  const result = await pool.query(
    'SELECT COUNT(*) AS unread_count FROM notifications WHERE recipient_user_id = $1 AND is_read = false;',
    [userId]
  );

  return {
    unread_count: parseInt(result.rows[0].unread_count, 10),
  };
};

/**
 * Marks a single notification as read if it belongs to the authenticated user.
 * Returns 404 if the notification does not exist or belongs to another user.
 * 
 * @param {number} userId - Authenticated user ID
 * @param {number} notificationId - Target notification ID
 * @returns {Promise<object>} The updated notification record
 */
const markNotificationAsRead = async (userId, notificationId) => {
  const query = `
    UPDATE notifications
    SET is_read = true
    WHERE id = $1 AND recipient_user_id = $2
    RETURNING id, type, title, message, related_entity_type, related_entity_id, is_read, created_at;
  `;

  const result = await pool.query(query, [notificationId, userId]);

  if (result.rows.length === 0) {
    const error = new Error('Notification not found.');
    error.statusCode = 404;
    throw error;
  }

  const row = result.rows[0];
  return {
    id: row.id,
    type: row.type,
    title: row.title,
    message: row.message,
    related_entity_type: row.related_entity_type,
    related_entity_id: row.related_entity_id,
    is_read: row.is_read,
    created_at: row.created_at,
  };
};

/**
 * Marks all unread notifications belonging to the authenticated user as read.
 * Scoped strictly to recipient_user_id = userId.
 * 
 * @param {number} userId - Authenticated user ID
 * @returns {Promise<{ updated_count: number }>}
 */
const markAllNotificationsAsRead = async (userId) => {
  const query = `
    UPDATE notifications
    SET is_read = true
    WHERE recipient_user_id = $1 AND is_read = false
    RETURNING id;
  `;

  const result = await pool.query(query, [userId]);

  return {
    updated_count: result.rowCount,
  };
};

module.exports = {
  getUserNotifications,
  getUnreadNotificationCount,
  markNotificationAsRead,
  markAllNotificationsAsRead,
};
