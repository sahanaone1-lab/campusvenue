/**
 * Validation Middleware for Event Completion Reports Endpoints
 */

/**
 * Validates report submission payload (Faculty only).
 */
const validateReportSubmission = (req, res, next) => {
  const {
    booking_id,
    actual_participants,
    event_summary,
    activities_conducted,
    challenges_faced,
    suggestions_for_future,
  } = req.body || {};

  const errors = [];

  // 1. Booking ID validation
  const parsedBookingId = parseInt(booking_id, 10);
  if (!booking_id || isNaN(parsedBookingId) || parsedBookingId <= 0) {
    errors.push('A valid positive booking ID is required.');
  }

  // 2. Actual participants validation
  const parsedParticipants = parseInt(actual_participants, 10);
  if (actual_participants === undefined || actual_participants === null || isNaN(parsedParticipants)) {
    errors.push('Actual participant count is required.');
  } else if (parsedParticipants < 0) {
    errors.push('Actual participants cannot be negative.');
  }

  // 3. Event Summary
  if (!event_summary || typeof event_summary !== 'string' || event_summary.trim().length < 10) {
    errors.push('Event summary is required and must be at least 10 characters.');
  } else if (event_summary.trim().length > 5000) {
    errors.push('Event summary cannot exceed 5000 characters.');
  }

  // 4. Activities Conducted
  if (!activities_conducted || typeof activities_conducted !== 'string' || activities_conducted.trim().length < 10) {
    errors.push('Activities conducted is required and must be at least 10 characters.');
  } else if (activities_conducted.trim().length > 5000) {
    errors.push('Activities conducted cannot exceed 5000 characters.');
  }

  // 5. Challenges Faced (Optional)
  if (challenges_faced !== undefined && challenges_faced !== null && typeof challenges_faced === 'string') {
    if (challenges_faced.trim().length > 2500) {
      errors.push('Challenges faced cannot exceed 2500 characters.');
    }
  }

  // 6. Suggestions for Future (Optional)
  if (suggestions_for_future !== undefined && suggestions_for_future !== null && typeof suggestions_for_future === 'string') {
    if (suggestions_for_future.trim().length > 2500) {
      errors.push('Suggestions for future cannot exceed 2500 characters.');
    }
  }

  if (errors.length > 0) {
    return res.status(400).json({
      status: 'error',
      message: errors[0],
      errors,
      statusCode: 400,
    });
  }

  req.body.booking_id = parsedBookingId;
  req.body.actual_participants = parsedParticipants;
  req.body.event_summary = event_summary.trim();
  req.body.activities_conducted = activities_conducted.trim();
  if (challenges_faced) req.body.challenges_faced = challenges_faced.trim();
  if (suggestions_for_future) req.body.suggestions_for_future = suggestions_for_future.trim();

  next();
};

/**
 * Validates report update / revision payload (Faculty only).
 */
const validateReportUpdate = (req, res, next) => {
  const {
    actual_participants,
    event_summary,
    activities_conducted,
    challenges_faced,
    suggestions_for_future,
  } = req.body || {};

  const errors = [];

  if (actual_participants !== undefined && actual_participants !== null) {
    const parsedParticipants = parseInt(actual_participants, 10);
    if (isNaN(parsedParticipants) || parsedParticipants < 0) {
      errors.push('Actual participants must be a non-negative integer.');
    } else {
      req.body.actual_participants = parsedParticipants;
    }
  }

  if (event_summary !== undefined) {
    if (typeof event_summary !== 'string' || event_summary.trim().length < 10) {
      errors.push('Event summary must be at least 10 characters long.');
    } else if (event_summary.trim().length > 5000) {
      errors.push('Event summary cannot exceed 5000 characters.');
    } else {
      req.body.event_summary = event_summary.trim();
    }
  }

  if (activities_conducted !== undefined) {
    if (typeof activities_conducted !== 'string' || activities_conducted.trim().length < 10) {
      errors.push('Activities conducted must be at least 10 characters long.');
    } else if (activities_conducted.trim().length > 5000) {
      errors.push('Activities conducted cannot exceed 5000 characters.');
    } else {
      req.body.activities_conducted = activities_conducted.trim();
    }
  }

  if (challenges_faced !== undefined && challenges_faced !== null) {
    if (typeof challenges_faced === 'string' && challenges_faced.trim().length > 2500) {
      errors.push('Challenges faced cannot exceed 2500 characters.');
    } else if (typeof challenges_faced === 'string') {
      req.body.challenges_faced = challenges_faced.trim();
    }
  }

  if (suggestions_for_future !== undefined && suggestions_for_future !== null) {
    if (typeof suggestions_for_future === 'string' && suggestions_for_future.trim().length > 2500) {
      errors.push('Suggestions for future cannot exceed 2500 characters.');
    } else if (typeof suggestions_for_future === 'string') {
      req.body.suggestions_for_future = suggestions_for_future.trim();
    }
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
 * Validates report review action by Dean/Admin.
 */
const validateReportReview = (req, res, next) => {
  const { action, dean_remarks } = req.body || {};
  const validActions = ['reviewed', 'revision_requested'];

  if (!action || !validActions.includes(action.trim().toLowerCase())) {
    return res.status(400).json({
      status: 'error',
      message: 'Invalid review action. Must be either "reviewed" or "revision_requested".',
      statusCode: 400,
    });
  }

  const cleanAction = action.trim().toLowerCase();

  if (cleanAction === 'revision_requested') {
    if (!dean_remarks || typeof dean_remarks !== 'string' || dean_remarks.trim().length < 5) {
      return res.status(400).json({
        status: 'error',
        message: 'Dean remarks (minimum 5 characters) are required when requesting a revision.',
        statusCode: 400,
      });
    }
  }

  req.body.action = cleanAction;
  if (dean_remarks && typeof dean_remarks === 'string') {
    req.body.dean_remarks = dean_remarks.trim();
  } else {
    req.body.dean_remarks = null;
  }

  next();
};

/**
 * Validates report ID URL parameter (:id).
 */
const validateReportId = (req, res, next) => {
  const id = parseInt(req.params.id, 10);
  if (isNaN(id) || id <= 0) {
    return res.status(400).json({
      status: 'error',
      message: 'Invalid report ID. Must be a positive integer.',
      statusCode: 400,
    });
  }
  req.params.id = id;
  next();
};

module.exports = {
  validateReportSubmission,
  validateReportUpdate,
  validateReportReview,
  validateReportId,
};
