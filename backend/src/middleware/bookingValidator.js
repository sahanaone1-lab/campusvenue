/**
 * Validation Middleware for Booking Endpoints
 */

const DATE_REGEX = /^\d{4}-\d{2}-\d{2}$/;
const TIME_REGEX = /^([01]\d|2[0-3]):([0-5]\d)(:([0-5]\d))?$/;

/**
 * Validates booking request creation payload (Faculty only).
 */
const validateBookingCreation = (req, res, next) => {
  const {
    event_name,
    event_type,
    department,
    venue_id,
    event_date,
    start_time,
    end_time,
    expected_participants,
    description,
    required_facilities,
    additional_requirements,
  } = req.body || {};

  const errors = [];

  // 1. Event Name
  if (!event_name || typeof event_name !== 'string' || event_name.trim().length < 2) {
    errors.push('Event name is required and must be at least 2 characters.');
  } else if (event_name.trim().length > 255) {
    errors.push('Event name cannot exceed 255 characters.');
  }

  // 2. Event Type
  if (!event_type || typeof event_type !== 'string' || event_type.trim().length < 2) {
    errors.push('Event type is required and must be at least 2 characters.');
  } else if (event_type.trim().length > 100) {
    errors.push('Event type cannot exceed 100 characters.');
  }

  // 3. Department
  if (!department || typeof department !== 'string' || department.trim().length < 2) {
    errors.push('Department is required and must be at least 2 characters.');
  } else if (department.trim().length > 150) {
    errors.push('Department cannot exceed 150 characters.');
  }

  // 4. Venue ID
  const parsedVenueId = parseInt(venue_id, 10);
  if (!venue_id || isNaN(parsedVenueId) || parsedVenueId <= 0) {
    errors.push('A valid positive venue ID is required.');
  }

  // 5. Event Date
  if (!event_date || typeof event_date !== 'string' || !DATE_REGEX.test(event_date)) {
    errors.push('A valid event date in YYYY-MM-DD format is required.');
  } else {
    const parsedDate = new Date(`${event_date}T00:00:00Z`);
    if (isNaN(parsedDate.getTime())) {
      errors.push('Invalid calendar date.');
    } else {
      // Check for Sunday restriction (0 = Sunday in getUTCDay)
      if (parsedDate.getUTCDay() === 0) {
        errors.push('Bookings are not permitted on Sundays. Campus venues are closed.');
      }
    }
  }

  // 6. Start & End Times
  let validTimes = true;
  if (!start_time || typeof start_time !== 'string' || !TIME_REGEX.test(start_time.trim())) {
    errors.push('A valid start time in HH:MM or HH:MM:SS format is required.');
    validTimes = false;
  }
  if (!end_time || typeof end_time !== 'string' || !TIME_REGEX.test(end_time.trim())) {
    errors.push('A valid end time in HH:MM or HH:MM:SS format is required.');
    validTimes = false;
  }

  // Time sequence check
  if (validTimes) {
    const cleanStart = start_time.trim();
    const cleanEnd = end_time.trim();
    if (cleanEnd <= cleanStart) {
      errors.push('End time must be later than start time.');
    }
  }

  // 7. Expected Participants
  const participants = Number(expected_participants);
  if (
    expected_participants === undefined ||
    expected_participants === null ||
    !Number.isInteger(participants) ||
    participants < 0
  ) {
    errors.push('Expected participants must be a non-negative integer (0 or greater).');
  }

  // 8. Facilities (Optional)
  if (required_facilities !== undefined && required_facilities !== null && !Array.isArray(required_facilities)) {
    errors.push('Required facilities must be an array of strings.');
  }

  // 9. Description (Optional)
  if (description !== undefined && description !== null && typeof description !== 'string') {
    errors.push('Description must be a text string.');
  }

  // 10. Additional Requirements (Optional)
  if (additional_requirements !== undefined && additional_requirements !== null && typeof additional_requirements !== 'string') {
    errors.push('Additional requirements must be a text string.');
  }

  if (errors.length > 0) {
    return res.status(400).json({
      status: 'error',
      message: errors[0],
      errors,
      statusCode: 400,
    });
  }

  // Sanitize and normalize payload
  req.body.event_name = event_name.trim();
  req.body.event_type = event_type.trim();
  req.body.department = department.trim();
  req.body.venue_id = parsedVenueId;
  req.body.event_date = event_date.trim();
  req.body.start_time = start_time.trim();
  req.body.end_time = end_time.trim();
  req.body.expected_participants = participants;
  req.body.description = description ? description.trim() : null;
  req.body.required_facilities = Array.isArray(required_facilities) ? required_facilities : [];
  req.body.additional_requirements = additional_requirements ? additional_requirements.trim() : null;

  // Security: Never trust client-supplied status or faculty ID
  delete req.body.status;
  delete req.body.faculty_id;

  next();
};

/**
 * Validates booking ID route parameter (:id)
 */
const validateBookingId = (req, res, next) => {
  const id = parseInt(req.params.id, 10);
  if (isNaN(id) || id <= 0) {
    return res.status(400).json({
      status: 'error',
      message: 'Invalid booking ID. Must be a positive integer.',
      statusCode: 400,
    });
  }
  req.params.id = id;
  next();
};

/**
 * Validates booking approval payload (Admin only)
 */
const validateBookingApproval = (req, res, next) => {
  const { comments } = req.body || {};
  if (comments !== undefined && comments !== null && typeof comments !== 'string') {
    return res.status(400).json({
      status: 'error',
      message: 'Admin comments must be a text string.',
      statusCode: 400,
    });
  }
  req.body.comments = comments && typeof comments === 'string' ? comments.trim() : null;
  next();
};

/**
 * Validates booking rejection payload (Admin only)
 */
const validateBookingRejection = (req, res, next) => {
  const reason = (req.body?.rejection_reason || req.body?.comments || '').trim();

  if (!reason || reason.length < 3) {
    return res.status(400).json({
      status: 'error',
      message: 'A non-empty rejection reason is required (minimum 3 characters).',
      statusCode: 400,
    });
  }

  if (reason.length > 1000) {
    return res.status(400).json({
      status: 'error',
      message: 'Rejection reason cannot exceed 1000 characters.',
      statusCode: 400,
    });
  }

  req.body.rejection_reason = reason;
  req.body.comments = reason;
  next();
};

module.exports = {
  validateBookingCreation,
  validateBookingId,
  validateBookingApproval,
  validateBookingRejection,
};
