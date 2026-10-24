import dayjs from 'dayjs';
import relativeTime from 'dayjs/plugin/relativeTime.js';
import apiClient from './apiClient';
import { ROLES } from '../utils/constants.js';

dayjs.extend(relativeTime);

let cachedNotifications = [];
let cachedUnreadCount = 0;

const dispatchNotificationsUpdated = () => {
  if (typeof window !== 'undefined') {
    window.dispatchEvent(
      new CustomEvent('campus_notifications_updated', {
        detail: {
          notifications: cachedNotifications,
          unreadCount: cachedUnreadCount,
        },
      })
    );
  }
};

/**
 * Normalizes notification received from backend API
 */
export const normalizeNotification = (n) => {
  if (!n) return null;
  const isRead = Boolean(n.is_read || n.read);
  const relatedType = n.related_entity_type || n.entityType || null;
  const relatedId = n.related_entity_id || n.entityId || n.requestId || null;

  return {
    id: n.id,
    type: n.type || 'general',
    title: n.title,
    message: n.message,
    related_entity_type: relatedType,
    related_entity_id: relatedId,
    entityType: relatedType,
    entityId: relatedId,
    requestId: relatedType === 'booking' || relatedType === 'booking_request' ? relatedId : null,
    read: isRead,
    is_read: isRead,
    createdAt: n.created_at || n.createdAt || new Date().toISOString(),
    created_at: n.created_at || n.createdAt || new Date().toISOString(),
  };
};

export const notificationService = {
  /**
   * Determine exact target route and contextual query params for notification item.
   * Safe against arbitrary url construction.
   */
  resolveNotificationRoute: (item, currentRole) => {
    if (!item) return '/';

    const role = currentRole || item.recipientRole;
    const targetEntityId = item.related_entity_id || item.entityId || item.requestId;
    const targetEntityType = item.related_entity_type || item.entityType;

    // Faculty: Open exact booking in MyRequestsPage
    if (role === ROLES.FACULTY) {
      if (targetEntityId) {
        // Sanitize ID to avoid arbitrary paths
        const safeId = encodeURIComponent(String(targetEntityId));
        return `/faculty/my-requests?requestId=${safeId}`;
      }
      return '/faculty/my-requests';
    }

    // Admin: Open exact booking in AdminRequestsPage
    if (role === ROLES.ADMIN) {
      if (targetEntityId) {
        const safeId = encodeURIComponent(String(targetEntityId));
        return `/admin/requests?requestId=${safeId}`;
      }
      return '/admin/requests';
    }

    // Student: Open venue details or events
    if (role === ROLES.STUDENT) {
      if (targetEntityType === 'venue' && targetEntityId) {
        const safeId = encodeURIComponent(String(targetEntityId));
        return `/student/venues/${safeId}`;
      }
      return '/student/venues';
    }

    return '/';
  },

  /**
   * Fetch notifications belonging to authenticated user from backend API.
   * GET /api/notifications
   */
  fetchNotifications: async (params = {}) => {
    try {
      const response = await apiClient.get('/notifications', {
        params: { limit: 50, ...params },
      });
      const rawList = response.data?.notifications || response.data || [];
      const normalized = rawList.map(normalizeNotification);
      cachedNotifications = normalized;
      cachedUnreadCount = response.data?.unread_count ?? normalized.filter((n) => !n.read).length;

      dispatchNotificationsUpdated();
      return normalized;
    } catch (err) {
      if (cachedNotifications.length === 0) {
        cachedNotifications = [];
      }
      throw err;
    }
  },

  /**
   * Fetch unread notification count from backend API.
   * GET /api/notifications/unread-count
   */
  fetchUnreadCount: async () => {
    try {
      const response = await apiClient.get('/notifications/unread-count');
      const count = response.data?.unread_count ?? 0;
      cachedUnreadCount = count;
      dispatchNotificationsUpdated();
      return count;
    } catch {
      return cachedUnreadCount;
    }
  },

  /**
   * Retrieve cached notifications for user. Kicks off fetch if cache is empty.
   */
  getUserNotifications: (user) => {
    if (cachedNotifications.length === 0 && apiClient.getToken()) {
      notificationService.fetchNotifications().catch(() => {});
    }
    return cachedNotifications;
  },

  /**
   * Get unread count for current user
   */
  getUnreadCount: (user) => {
    if (cachedNotifications.length === 0 && apiClient.getToken()) {
      notificationService.fetchUnreadCount().catch(() => {});
    }
    return cachedUnreadCount;
  },

  /**
   * Mark a single notification as read via API.
   * PATCH /api/notifications/:id/read
   */
  markAsRead: async (id) => {
    if (!id) return;

    // Optimistically update locally
    const idx = cachedNotifications.findIndex((n) => String(n.id) === String(id));
    if (idx >= 0) {
      if (!cachedNotifications[idx].read) {
        cachedUnreadCount = Math.max(0, cachedUnreadCount - 1);
      }
      cachedNotifications[idx] = {
        ...cachedNotifications[idx],
        read: true,
        is_read: true,
      };
      dispatchNotificationsUpdated();
    }

    try {
      await apiClient.patch(`/notifications/${id}/read`);
    } catch (err) {
      // Background catch
    }
  },

  /**
   * Mark all notifications as read for current user via API.
   * PATCH /api/notifications/read-all
   */
  markAllAsRead: async () => {
    // Optimistically update
    cachedNotifications = cachedNotifications.map((n) => ({
      ...n,
      read: true,
      is_read: true,
    }));
    cachedUnreadCount = 0;
    dispatchNotificationsUpdated();

    try {
      await apiClient.patch('/notifications/read-all');
    } catch (err) {
      // Background catch
    }
  },

  /**
   * Delete or remove a notification (client helper)
   */
  deleteNotification: (id) => {
    cachedNotifications = cachedNotifications.filter((n) => String(n.id) !== String(id));
    dispatchNotificationsUpdated();
  },

  /**
   * Clear read notifications
   */
  clearReadNotifications: () => {
    cachedNotifications = cachedNotifications.filter((n) => !n.read);
    dispatchNotificationsUpdated();
  },

  /**
   * Subscribe to notification updates across components
   */
  subscribe: (callback) => {
    if (typeof window === 'undefined') return () => {};
    const handler = (e) => callback(e.detail || { notifications: cachedNotifications, unreadCount: cachedUnreadCount });
    window.addEventListener('campus_notifications_updated', handler);
    return () => window.removeEventListener('campus_notifications_updated', handler);
  },
};

export default notificationService;
