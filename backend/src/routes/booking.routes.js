const express = require('express');
const router = express.Router();

const bookingController = require('../controllers/booking.controller');
const { authenticate, authorize } = require('../middleware/auth.middleware');
const {
  validateBookingCreation,
  validateBookingId,
  validateBookingApproval,
  validateBookingRejection,
} = require('../middleware/bookingValidator');

// Admin-only: Retrieve all booking requests across faculty (supports filters & pagination)
router.get(
  '/',
  authenticate,
  authorize('admin'),
  bookingController.getAllBookingsAdmin
);

// Faculty-only: Submit a new booking request
router.post(
  '/',
  authenticate,
  authorize('faculty'),
  validateBookingCreation,
  bookingController.createBookingRequest
);

// Faculty-only: Retrieve own booking requests
router.get(
  '/my-requests',
  authenticate,
  authorize('faculty'),
  bookingController.getFacultyBookings
);

// Authenticated users: View booking details (role-filtered permissions apply)
router.get(
  '/:id',
  authenticate,
  validateBookingId,
  bookingController.getBookingById
);

// Admin-only: Approve a pending booking request
router.patch(
  '/:id/approve',
  authenticate,
  authorize('admin'),
  validateBookingId,
  validateBookingApproval,
  bookingController.approveBooking
);

// Admin-only: Reject a pending booking request
router.patch(
  '/:id/reject',
  authenticate,
  authorize('admin'),
  validateBookingId,
  validateBookingRejection,
  bookingController.rejectBooking
);

module.exports = router;

