/**
 * Validation Middleware for Venue Endpoints
 */

/**
 * Validates venue ID route parameter (:id)
 */
const validateVenueId = (req, res, next) => {
  const id = parseInt(req.params.id, 10);
  if (isNaN(id) || id <= 0) {
    return res.status(400).json({
      status: 'error',
      message: 'Invalid venue ID. Must be a positive integer.',
      statusCode: 400,
    });
  }
  req.params.id = id;
  next();
};

/**
 * Validates venue creation request body
 */
const validateVenueCreation = (req, res, next) => {
  const { name, location, building, capacity, description, facilities, is_active } = req.body || {};
  const errors = [];

  // Name validation
  if (!name || typeof name !== 'string' || name.trim().length < 2) {
    errors.push('Venue name is required and must be at least 2 characters.');
  } else if (name.trim().length > 150) {
    errors.push('Venue name cannot exceed 150 characters.');
  }

  // Location validation
  if (!location || typeof location !== 'string' || location.trim().length < 2) {
    errors.push('Location is required and must be at least 2 characters.');
  } else if (location.trim().length > 255) {
    errors.push('Location cannot exceed 255 characters.');
  }

  // Building validation
  if (!building || typeof building !== 'string' || building.trim().length < 2) {
    errors.push('Building is required and must be at least 2 characters.');
  } else if (building.trim().length > 150) {
    errors.push('Building cannot exceed 150 characters.');
  }

  // Capacity validation (must be positive integer)
  const cap = Number(capacity);
  if (capacity === undefined || capacity === null || !Number.isInteger(cap) || cap <= 0) {
    errors.push('Capacity is required and must be a positive integer.');
  }

  // Facilities validation (must be an array if provided)
  if (facilities !== undefined && facilities !== null && !Array.isArray(facilities)) {
    errors.push('Facilities must be an array of strings.');
  }

  // Description validation (optional)
  if (description !== undefined && description !== null && typeof description !== 'string') {
    errors.push('Description must be a string.');
  }

  // is_active validation (optional)
  if (is_active !== undefined && typeof is_active !== 'boolean') {
    errors.push('is_active must be a boolean.');
  }

  if (errors.length > 0) {
    return res.status(400).json({
      status: 'error',
      message: errors[0],
      errors,
      statusCode: 400,
    });
  }

  req.body.name = name.trim();
  req.body.location = location.trim();
  req.body.building = building.trim();
  req.body.capacity = cap;
  req.body.description = description ? description.trim() : null;
  req.body.facilities = Array.isArray(facilities) ? facilities : [];
  req.body.is_active = is_active !== undefined ? is_active : true;

  next();
};

/**
 * Validates venue update request body
 */
const validateVenueUpdate = (req, res, next) => {
  const { name, location, building, capacity, description, facilities, is_active } = req.body || {};
  const errors = [];

  // Reject empty update body
  const updateKeys = Object.keys(req.body || {}).filter(
    (k) => ['name', 'location', 'building', 'capacity', 'description', 'facilities'].includes(k)
  );

  if (updateKeys.length === 0) {
    return res.status(400).json({
      status: 'error',
      message: 'At least one valid field (name, location, building, capacity, description, facilities) must be provided for update.',
      statusCode: 400,
    });
  }

  // Separate endpoint exists for status updates
  if (is_active !== undefined) {
    return res.status(400).json({
      status: 'error',
      message: 'Use PATCH /api/venues/:id/status to activate or deactivate a venue.',
      statusCode: 400,
    });
  }

  if (name !== undefined) {
    if (typeof name !== 'string' || name.trim().length < 2) {
      errors.push('Venue name must be at least 2 characters.');
    } else if (name.trim().length > 150) {
      errors.push('Venue name cannot exceed 150 characters.');
    } else {
      req.body.name = name.trim();
    }
  }

  if (location !== undefined) {
    if (typeof location !== 'string' || location.trim().length < 2) {
      errors.push('Location must be at least 2 characters.');
    } else if (location.trim().length > 255) {
      errors.push('Location cannot exceed 255 characters.');
    } else {
      req.body.location = location.trim();
    }
  }

  if (building !== undefined) {
    if (typeof building !== 'string' || building.trim().length < 2) {
      errors.push('Building must be at least 2 characters.');
    } else if (building.trim().length > 150) {
      errors.push('Building cannot exceed 150 characters.');
    } else {
      req.body.building = building.trim();
    }
  }

  if (capacity !== undefined) {
    const cap = Number(capacity);
    if (!Number.isInteger(cap) || cap <= 0) {
      errors.push('Capacity must be a positive integer.');
    } else {
      req.body.capacity = cap;
    }
  }

  if (facilities !== undefined && !Array.isArray(facilities)) {
    errors.push('Facilities must be an array of strings.');
  }

  if (description !== undefined && description !== null && typeof description !== 'string') {
    errors.push('Description must be a string.');
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

/**
 * Validates status update request body (PATCH /api/venues/:id/status)
 */
const validateVenueStatusUpdate = (req, res, next) => {
  const { is_active } = req.body || {};

  if (typeof is_active !== 'boolean') {
    return res.status(400).json({
      status: 'error',
      message: 'Field "is_active" is required and must be an explicit boolean (true or false).',
      statusCode: 400,
    });
  }

  next();
};

/**
 * Validates availability query params (GET /api/venues/:id/availability?date=YYYY-MM-DD)
 */
const validateVenueAvailability = (req, res, next) => {
  const { date } = req.query;

  if (!date || typeof date !== 'string') {
    return res.status(400).json({
      status: 'error',
      message: 'Query parameter "date" is required (format: YYYY-MM-DD).',
      statusCode: 400,
    });
  }

  const DATE_REGEX = /^\d{4}-\d{2}-\d{2}$/;
  if (!DATE_REGEX.test(date)) {
    return res.status(400).json({
      status: 'error',
      message: 'Invalid date format. Expected YYYY-MM-DD.',
      statusCode: 400,
    });
  }

  const parsed = new Date(`${date}T00:00:00Z`);
  if (isNaN(parsed.getTime())) {
    return res.status(400).json({
      status: 'error',
      message: 'Invalid calendar date provided.',
      statusCode: 400,
    });
  }

  next();
};

module.exports = {
  validateVenueId,
  validateVenueCreation,
  validateVenueUpdate,
  validateVenueStatusUpdate,
  validateVenueAvailability,
};
