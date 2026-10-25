const express = require('express');
const router = express.Router();

const reportController = require('../controllers/report.controller');
const { authenticate, authorize } = require('../middleware/auth.middleware');
const {
  validateReportSubmission,
  validateReportUpdate,
  validateReportReview,
  validateReportId,
} = require('../middleware/reportValidator');

// All report endpoints require authenticated session
router.use(authenticate);

// Faculty endpoints
router.post(
  '/',
  authorize('faculty'),
  validateReportSubmission,
  reportController.createReport
);

router.get(
  '/my-reports',
  authorize('faculty'),
  reportController.getFacultyReports
);

router.patch(
  '/:id',
  authorize('faculty'),
  validateReportId,
  validateReportUpdate,
  reportController.updateReport
);

// Dean / Admin endpoints
router.get(
  '/',
  authorize('admin'),
  reportController.getAllReportsAdmin
);

router.patch(
  '/:id/review',
  authorize('admin'),
  validateReportId,
  validateReportReview,
  reportController.reviewReport
);

// Shared endpoints (Faculty owner or Dean / Admin)
router.get(
  '/booking/:bookingId',
  authorize('faculty', 'admin'),
  reportController.getReportByBookingId
);

router.get(
  '/:id',
  authorize('faculty', 'admin'),
  validateReportId,
  reportController.getReportById
);

module.exports = router;
