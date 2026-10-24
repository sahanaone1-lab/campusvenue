const express = require('express');
const router = express.Router();

const venueController = require('../controllers/venue.controller');
const { authenticate, authorize } = require('../middleware/auth.middleware');
const {
  validateVenueId,
  validateVenueCreation,
  validateVenueUpdate,
  validateVenueStatusUpdate,
  validateVenueAvailability,
} = require('../middleware/venueValidator');

// Public to all authenticated users (students, faculty, admin)
router.get('/', authenticate, venueController.listVenues);
router.get('/:id/availability', authenticate, validateVenueId, validateVenueAvailability, venueController.getVenueAvailability);
router.get('/:id', authenticate, validateVenueId, venueController.getVenueById);

// Admin-only management endpoints
router.post('/', authenticate, authorize('admin'), validateVenueCreation, venueController.createVenue);
router.patch('/:id/status', authenticate, authorize('admin'), validateVenueId, validateVenueStatusUpdate, venueController.updateVenueStatus);
router.patch('/:id', authenticate, authorize('admin'), validateVenueId, validateVenueUpdate, venueController.updateVenue);

module.exports = router;
