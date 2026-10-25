import apiClient from './apiClient';

/**
 * Service for managing Faculty Event Completion Reports
 * Interacts with backend /api/reports endpoints.
 */

/**
 * Calculates client-side attendance percentage for live form preview.
 * Final saved percentage is always computed and validated on the backend.
 * Handles zero expected participants gracefully.
 */
export const calculatePreviewPercentage = (actual, expected) => {
  const actualNum = Number(actual) || 0;
  const expectedNum = Number(expected) || 0;

  if (expectedNum <= 0) {
    return 0.00;
  }

  const pct = (actualNum / expectedNum) * 100;
  return Number(Math.min(100, Math.max(0, pct)).toFixed(2));
};

export const reportService = {
  /**
   * Submit a new completion report (Faculty only).
   * POST /api/reports
   */
  submitReport: async (reportData) => {
    const response = await apiClient.post('/reports', reportData);
    return response.data?.report || response.data;
  },

  /**
   * Update an existing completion report (e.g. following a Dean revision request).
   * PATCH /api/reports/:id
   */
  updateReport: async (reportId, updateData) => {
    const response = await apiClient.patch(`/reports/${reportId}`, updateData);
    return response.data?.report || response.data;
  },

  /**
   * Fetch all completion reports submitted by the logged-in faculty member.
   * GET /api/reports/my-reports
   */
  getFacultyReports: async (params = {}) => {
    const response = await apiClient.get('/reports/my-reports', { params });
    return response.data;
  },

  /**
   * Fetch completion report status & details associated with a specific booking.
   * GET /api/reports/booking/:bookingId
   */
  getReportByBookingId: async (bookingId) => {
    const response = await apiClient.get(`/reports/booking/${bookingId}`);
    return response.data;
  },

  /**
   * Fetch a specific completion report by ID.
   * GET /api/reports/:id
   */
  getReportById: async (reportId) => {
    const response = await apiClient.get(`/reports/${reportId}`);
    return response.data?.report || response.data;
  },

  /**
   * Dean/Admin: Fetch all submitted completion reports across campus.
   * GET /api/reports
   */
  getAllReportsAdmin: async (params = {}) => {
    const response = await apiClient.get('/reports', { params });
    return response.data;
  },

  /**
   * Dean/Admin: Review a completion report (action: 'reviewed' or 'revision_requested').
   * PATCH /api/reports/:id/review
   */
  reviewReport: async (reportId, reviewData) => {
    const response = await apiClient.patch(`/reports/${reportId}/review`, reviewData);
    return response.data?.report || response.data;
  },
};

export default reportService;
