const bookingService = require('../services/booking.service');

/**
 * Handle booking request submission (Faculty only).
 */
const createBookingRequest = async (req, res, next) => {
  try {
    const booking = await bookingService.createBookingRequest(req.user.id, req.body);
    return res.status(201).json({
      status: 'success',
      message: 'Booking request submitted successfully. Status is pending administrative approval.',
      data: { booking },
    });
  } catch (error) {
    // If conflict detected, pass conflict details in response
    if (error.statusCode === 409 && error.conflicts) {
      return res.status(409).json({
        status: 'error',
        message: error.message,
        statusCode: 409,
        conflicts: error.conflicts,
      });
    }
    next(error);
  }
};

/**
 * Handle listing authenticated faculty member's own booking requests.
 */
const getFacultyBookings = async (req, res, next) => {
  try {
    const { page, limit, status } = req.query;
    const result = await bookingService.getFacultyBookings(req.user.id, { page, limit, status });
    return res.status(200).json({
      status: 'success',
      data: result,
    });
  } catch (error) {
    next(error);
  }
};

/**
 * Handle retrieving details for a specific booking request.
 */
const getBookingById = async (req, res, next) => {
  try {
    const booking = await bookingService.getBookingById(req.params.id, req.user);
    return res.status(200).json({
      status: 'success',
      data: { booking },
    });
  } catch (error) {
    next(error);
  }
};

/**
 * Handle listing all booking requests across all faculty (Admin only).
 */
const getAllBookingsAdmin = async (req, res, next) => {
  try {
    const { page, limit, status, event_date, venue_id, department } = req.query;
    const result = await bookingService.getAllBookingsAdmin({
      page,
      limit,
      status,
      event_date,
      venue_id,
      department,
    });
    return res.status(200).json({
      status: 'success',
      data: result,
    });
  } catch (error) {
    next(error);
  }
};

/**
 * Handle admin approval of a pending booking request.
 */
const approveBooking = async (req, res, next) => {
  try {
    const booking = await bookingService.approveBooking(
      req.params.id,
      req.user.id,
      req.body.comments
    );
    return res.status(200).json({
      status: 'success',
      message: 'Booking request approved successfully.',
      data: { booking },
    });
  } catch (error) {
    if (error.statusCode === 409 && error.conflicts) {
      return res.status(409).json({
        status: 'error',
        message: error.message,
        statusCode: 409,
        conflicts: error.conflicts,
      });
    }
    next(error);
  }
};

/**
 * Handle admin rejection of a pending booking request.
 */
const rejectBooking = async (req, res, next) => {
  try {
    const booking = await bookingService.rejectBooking(
      req.params.id,
      req.user.id,
      req.body.rejection_reason
    );
    return res.status(200).json({
      status: 'success',
      message: 'Booking request rejected.',
      data: { booking },
    });
  } catch (error) {
    next(error);
  }
};

module.exports = {
  createBookingRequest,
  getFacultyBookings,
  getBookingById,
  getAllBookingsAdmin,
  approveBooking,
  rejectBooking,
};

