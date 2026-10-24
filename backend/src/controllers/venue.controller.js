const venueService = require('../services/venue.service');

/**
 * Lists venues with optional search, filtering, and pagination.
 */
const listVenues = async (req, res, next) => {
  try {
    const { search, page, limit, status } = req.query;
    // Admins can view all venues (including inactive) or filter by status.
    // Non-admins (students and faculty) are restricted strictly to active venues.
    let effectiveStatus;
    if (req.user && req.user.role === 'admin') {
      effectiveStatus = status || 'all';
    } else {
      effectiveStatus = 'active';
    }
    const result = await venueService.listVenues({ search, page, limit, status: effectiveStatus });
    return res.status(200).json({
      status: 'success',
      data: result,
    });
  } catch (error) {
    next(error);
  }
};

/**
 * Retrieves details for a specific venue by ID.
 */
const getVenueById = async (req, res, next) => {
  try {
    const venue = await venueService.getVenueById(req.params.id);
    return res.status(200).json({
      status: 'success',
      data: { venue },
    });
  } catch (error) {
    next(error);
  }
};

/**
 * Creates a new venue (Admin only).
 */
const createVenue = async (req, res, next) => {
  try {
    const venue = await venueService.createVenue(req.body);
    return res.status(201).json({
      status: 'success',
      message: 'Venue created successfully.',
      data: { venue },
    });
  } catch (error) {
    next(error);
  }
};

/**
 * Updates an existing venue's details (Admin only).
 */
const updateVenue = async (req, res, next) => {
  try {
    const venue = await venueService.updateVenue(req.params.id, req.body);
    return res.status(200).json({
      status: 'success',
      message: 'Venue updated successfully.',
      data: { venue },
    });
  } catch (error) {
    next(error);
  }
};

/**
 * Activates or deactivates a venue (Admin only).
 */
const updateVenueStatus = async (req, res, next) => {
  try {
    const venue = await venueService.updateVenueStatus(req.params.id, req.body.is_active);
    const actionLabel = req.body.is_active ? 'activated' : 'deactivated';
    return res.status(200).json({
      status: 'success',
      message: `Venue ${actionLabel} successfully.`,
      data: { venue },
    });
  } catch (error) {
    next(error);
  }
};

/**
 * Retrieves availability schedule for a venue on a specific date.
 */
const getVenueAvailability = async (req, res, next) => {
  try {
    const availability = await venueService.getVenueAvailability(req.params.id, req.query.date);
    return res.status(200).json({
      status: 'success',
      data: availability,
    });
  } catch (error) {
    next(error);
  }
};

module.exports = {
  listVenues,
  getVenueById,
  createVenue,
  updateVenue,
  updateVenueStatus,
  getVenueAvailability,
};
