const { pool } = require('../config/database');

/**
 * Creates a new booking request submitted by an authenticated faculty member.
 * Enforces venue active status, capacity restrictions, Sunday prohibition,
 * and conflict detection with existing pending or approved bookings.
 * 
 * @param {number} facultyId - Trusted user ID from req.user.id
 * @param {object} bookingData - Validated booking fields
 * @returns {Promise<object>} The created booking record with venue details
 */
const createBookingRequest = async (facultyId, bookingData) => {
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
    required_facilities = [],
    additional_requirements,
  } = bookingData;

  // 1. Verify venue existence and active status
  const venueRes = await pool.query(
    'SELECT id, name, location, building, capacity, is_active FROM venues WHERE id = $1;',
    [venue_id]
  );

  const venue = venueRes.rows[0];
  if (!venue) {
    const error = new Error('Venue not found.');
    error.statusCode = 404;
    throw error;
  }

  if (!venue.is_active) {
    const error = new Error(`The venue "${venue.name}" is currently inactive and cannot accept booking requests.`);
    error.statusCode = 400;
    throw error;
  }

  // 2. Validate participant capacity
  if (expected_participants > venue.capacity) {
    const error = new Error(
      `Expected participants (${expected_participants}) exceeds the maximum capacity of "${venue.name}" (${venue.capacity} seats).`
    );
    error.statusCode = 400;
    throw error;
  }

  // 3. Double-check Sunday prohibition via database query
  const dowRes = await pool.query('SELECT EXTRACT(DOW FROM $1::date) AS dow;', [event_date]);
  if (parseInt(dowRes.rows[0].dow, 10) === 0) {
    const error = new Error('Bookings are not permitted on Sundays. Campus venues are closed.');
    error.statusCode = 400;
    throw error;
  }

  // 4. Check for overlapping conflicts (both approved and pending)
  const conflictRes = await pool.query(
    'SELECT * FROM check_booking_conflict($1, $2::date, $3::time, $4::time);',
    [venue_id, event_date, start_time, end_time]
  );

  if (conflictRes.rows.length > 0) {
    const conflicts = conflictRes.rows.map((row) => ({
      conflict_booking_id: row.conflict_id,
      event_name: row.conflict_event_name,
      status: row.conflict_status,
      start_time: row.conflict_start,
      end_time: row.conflict_end,
    }));

    const error = new Error(
      `Booking conflict detected: The venue "${venue.name}" already has an overlapping booking or pending request on ${event_date} between ${start_time} and ${end_time}.`
    );
    error.statusCode = 409;
    error.conflicts = conflicts;
    throw error;
  }

  // 5. Insert new booking with default status 'pending'
  try {
    const insertQuery = `
      INSERT INTO bookings (
        event_name, event_type, department, venue_id, faculty_id,
        event_date, start_time, end_time, expected_participants,
        description, required_facilities, additional_requirements, status
      )
      VALUES ($1, $2, $3, $4, $5, $6::date, $7::time, $8::time, $9, $10, $11::jsonb, $12, 'pending')
      RETURNING id, event_name, event_type, department, venue_id, faculty_id,
                event_date, start_time, end_time, expected_participants,
                description, required_facilities, additional_requirements,
                status, rejection_reason, created_at, updated_at;
    `;

    const result = await pool.query(insertQuery, [
      event_name,
      event_type,
      department,
      venue_id,
      facultyId,
      event_date,
      start_time,
      end_time,
      expected_participants,
      description,
      JSON.stringify(required_facilities),
      additional_requirements,
    ]);

    const booking = result.rows[0];
    booking.venue = {
      id: venue.id,
      name: venue.name,
      location: venue.location,
      building: venue.building,
      capacity: venue.capacity,
    };

    return booking;
  } catch (dbErr) {
    // Catch exclusion constraint violation if concurrent approved booking was finalized
    if (dbErr.code === '23P01') {
      const error = new Error('Booking conflict: An approved booking already occupies this time slot.');
      error.statusCode = 409;
      throw error;
    }
    // Catch trigger violation if venue was deactivated concurrently
    if (dbErr.code === '23514') {
      const error = new Error(dbErr.message || 'Booking violates database integrity constraints.');
      error.statusCode = 400;
      throw error;
    }
    throw dbErr;
  }
};

/**
 * Retrieves booking requests submitted by the authenticated faculty member.
 * 
 * @param {number} facultyId
 * @param {object} params
 * @param {number} [params.page=1]
 * @param {number} [params.limit=10]
 * @param {string} [params.status]
 * @returns {Promise<{ bookings: Array, pagination: object }>}
 */
const getFacultyBookings = async (facultyId, { page = 1, limit = 10, status }) => {
  const safePage = Math.max(1, parseInt(page, 10) || 1);
  const safeLimit = Math.min(100, Math.max(1, parseInt(limit, 10) || 10));
  const offset = (safePage - 1) * safeLimit;

  const conditions = ['b.faculty_id = $1'];
  const queryParams = [facultyId];

  if (status && ['pending', 'approved', 'rejected', 'cancelled'].includes(status.trim().toLowerCase())) {
    queryParams.push(status.trim().toLowerCase());
    conditions.push(`b.status = $${queryParams.length}`);
  }

  const whereClause = `WHERE ${conditions.join(' AND ')}`;

  // Count total matching
  const countQuery = `SELECT COUNT(*) AS total FROM bookings b ${whereClause};`;
  const countRes = await pool.query(countQuery, queryParams);
  const total = parseInt(countRes.rows[0].total, 10);

  // Fetch paginated bookings with venue details
  queryParams.push(safeLimit);
  const limitIdx = queryParams.length;
  queryParams.push(offset);
  const offsetIdx = queryParams.length;

  const dataQuery = `
    SELECT
      b.id, b.event_name, b.event_type, b.department, b.event_date,
      b.start_time, b.end_time, b.expected_participants, b.description,
      b.required_facilities, b.additional_requirements, b.status,
      b.rejection_reason, b.created_at, b.updated_at,
      v.id AS venue_id, v.name AS venue_name, v.location AS venue_location,
      v.building AS venue_building, v.capacity AS venue_capacity
    FROM bookings b
    JOIN venues v ON b.venue_id = v.id
    ${whereClause}
    ORDER BY b.created_at DESC
    LIMIT $${limitIdx} OFFSET $${offsetIdx};
  `;

  const { rows } = await pool.query(dataQuery, queryParams);

  const bookings = rows.map((r) => ({
    id: r.id,
    event_name: r.event_name,
    event_type: r.event_type,
    department: r.department,
    event_date: r.event_date,
    start_time: r.start_time,
    end_time: r.end_time,
    expected_participants: r.expected_participants,
    description: r.description,
    required_facilities: r.required_facilities,
    additional_requirements: r.additional_requirements,
    status: r.status,
    rejection_reason: r.rejection_reason,
    created_at: r.created_at,
    updated_at: r.updated_at,
    venue: {
      id: r.venue_id,
      name: r.venue_name,
      location: r.venue_location,
      building: r.venue_building,
      capacity: r.venue_capacity,
    },
  }));

  return {
    bookings,
    pagination: {
      total,
      page: safePage,
      limit: safeLimit,
      totalPages: Math.ceil(total / safeLimit) || 1,
    },
  };
};

/**
 * Retrieves a booking by ID with role-based field filtering.
 * 
 * - Admin: Full booking details.
 * - Faculty: Full booking details if they own the request; 403 otherwise.
 * - Student: Public event information only (no private descriptions or faculty details).
 * 
 * @param {number} bookingId
 * @param {object} user - Authenticated user identity (id, role)
 * @returns {Promise<object>} The permitted booking details
 */
const getBookingById = async (bookingId, user) => {
  const query = `
    SELECT
      b.id, b.event_name, b.event_type, b.department, b.event_date,
      b.start_time, b.end_time, b.expected_participants, b.description,
      b.required_facilities, b.additional_requirements, b.status,
      b.rejection_reason, b.created_at, b.updated_at,
      b.faculty_id,
      u.name AS faculty_name, u.email AS faculty_email,
      v.id AS venue_id, v.name AS venue_name, v.location AS venue_location,
      v.building AS venue_building, v.capacity AS venue_capacity
    FROM bookings b
    JOIN venues v ON b.venue_id = v.id
    JOIN users u ON b.faculty_id = u.id
    WHERE b.id = $1;
  `;

  const res = await pool.query(query, [bookingId]);
  const row = res.rows[0];

  if (!row) {
    const error = new Error('Booking request not found.');
    error.statusCode = 404;
    throw error;
  }

  // Role-based authorization and privacy filtering
  if (user.role === 'admin') {
    // Administrator: full details
    return {
      id: row.id,
      event_name: row.event_name,
      event_type: row.event_type,
      department: row.department,
      event_date: row.event_date,
      start_time: row.start_time,
      end_time: row.end_time,
      expected_participants: row.expected_participants,
      description: row.description,
      required_facilities: row.required_facilities,
      additional_requirements: row.additional_requirements,
      status: row.status,
      rejection_reason: row.rejection_reason,
      created_at: row.created_at,
      updated_at: row.updated_at,
      faculty: {
        id: row.faculty_id,
        name: row.faculty_name,
        email: row.faculty_email,
      },
      venue: {
        id: row.venue_id,
        name: row.venue_name,
        location: row.venue_location,
        building: row.venue_building,
        capacity: row.venue_capacity,
      },
    };
  }

  if (user.role === 'faculty') {
    // Faculty: only permitted to view their own bookings
    if (row.faculty_id !== user.id) {
      const error = new Error('Access forbidden: You may only view your own booking requests.');
      error.statusCode = 403;
      throw error;
    }

    return {
      id: row.id,
      event_name: row.event_name,
      event_type: row.event_type,
      department: row.department,
      event_date: row.event_date,
      start_time: row.start_time,
      end_time: row.end_time,
      expected_participants: row.expected_participants,
      description: row.description,
      required_facilities: row.required_facilities,
      additional_requirements: row.additional_requirements,
      status: row.status,
      rejection_reason: row.rejection_reason,
      created_at: row.created_at,
      updated_at: row.updated_at,
      venue: {
        id: row.venue_id,
        name: row.venue_name,
        location: row.venue_location,
        building: row.venue_building,
        capacity: row.venue_capacity,
      },
    };
  }

  // Student role: public event schedule only (protects faculty privacy and internal notes)
  return {
    id: row.id,
    event_name: row.event_name,
    event_type: row.event_type,
    department: row.department,
    event_date: row.event_date,
    start_time: row.start_time,
    end_time: row.end_time,
    status: row.status,
    venue: {
      id: row.venue_id,
      name: row.venue_name,
      location: row.venue_location,
      building: row.venue_building,
      capacity: row.venue_capacity,
    },
  };
};

/**
 * Retrieves all booking requests across all faculty members (Admin only).
 * Supports pagination and filtering by status, date, venue, and department.
 * 
 * @param {object} params
 * @returns {Promise<{ bookings: Array, pagination: object }>}
 */
const getAllBookingsAdmin = async ({ page = 1, limit = 10, status, event_date, venue_id, department }) => {
  const safePage = Math.max(1, parseInt(page, 10) || 1);
  const safeLimit = Math.min(100, Math.max(1, parseInt(limit, 10) || 10));
  const offset = (safePage - 1) * safeLimit;

  const conditions = [];
  const queryParams = [];

  if (status && ['pending', 'approved', 'rejected', 'cancelled'].includes(status.trim().toLowerCase())) {
    queryParams.push(status.trim().toLowerCase());
    conditions.push(`b.status = $${queryParams.length}`);
  }

  if (event_date && /^\d{4}-\d{2}-\d{2}$/.test(event_date.trim())) {
    queryParams.push(event_date.trim());
    conditions.push(`b.event_date = $${queryParams.length}::date`);
  }

  if (venue_id && parseInt(venue_id, 10) > 0) {
    queryParams.push(parseInt(venue_id, 10));
    conditions.push(`b.venue_id = $${queryParams.length}`);
  }

  if (department && department.trim()) {
    queryParams.push(`%${department.trim()}%`);
    conditions.push(`b.department ILIKE $${queryParams.length}`);
  }

  const whereClause = conditions.length > 0 ? `WHERE ${conditions.join(' AND ')}` : '';

  const countQuery = `SELECT COUNT(*) AS total FROM bookings b ${whereClause};`;
  const countRes = await pool.query(countQuery, queryParams);
  const total = parseInt(countRes.rows[0].total, 10);

  queryParams.push(safeLimit);
  const limitIdx = queryParams.length;
  queryParams.push(offset);
  const offsetIdx = queryParams.length;

  const dataQuery = `
    SELECT
      b.id, b.event_name, b.event_type, b.department, b.event_date,
      b.start_time, b.end_time, b.expected_participants, b.description,
      b.required_facilities, b.additional_requirements, b.status,
      b.rejection_reason, b.created_at, b.updated_at,
      u.id AS faculty_id, u.name AS faculty_name, u.email AS faculty_email,
      u.department AS faculty_department, u.college_id AS faculty_college_id,
      v.id AS venue_id, v.name AS venue_name, v.location AS venue_location,
      v.building AS venue_building, v.capacity AS venue_capacity
    FROM bookings b
    JOIN venues v ON b.venue_id = v.id
    JOIN users u ON b.faculty_id = u.id
    ${whereClause}
    ORDER BY b.created_at DESC
    LIMIT $${limitIdx} OFFSET $${offsetIdx};
  `;

  const { rows } = await pool.query(dataQuery, queryParams);

  const bookings = rows.map((r) => ({
    id: r.id,
    event_name: r.event_name,
    event_type: r.event_type,
    department: r.department,
    event_date: r.event_date,
    start_time: r.start_time,
    end_time: r.end_time,
    expected_participants: r.expected_participants,
    description: r.description,
    required_facilities: r.required_facilities,
    additional_requirements: r.additional_requirements,
    status: r.status,
    rejection_reason: r.rejection_reason,
    created_at: r.created_at,
    updated_at: r.updated_at,
    faculty: {
      id: r.faculty_id,
      name: r.faculty_name,
      email: r.faculty_email,
      department: r.faculty_department,
      college_id: r.faculty_college_id,
    },
    venue: {
      id: r.venue_id,
      name: r.venue_name,
      location: r.venue_location,
      building: r.venue_building,
      capacity: r.venue_capacity,
    },
  }));

  return {
    bookings,
    pagination: {
      total,
      page: safePage,
      limit: safeLimit,
      totalPages: Math.ceil(total / safeLimit) || 1,
    },
  };
};

/**
 * Approves a pending booking request (Admin only).
 * Executes inside a database transaction:
 * - Locks row for update
 * - Re-validates active venue status, Sunday restrictions, capacity
 * - Re-checks conflicts against other bookings excluding itself
 * - Updates status to 'approved'
 * - Records audit entry in booking_approval_history
 * - Dispatches notification to faculty
 * - Relies on GiST exclusion constraint against concurrent approval races
 * 
 * @param {number} bookingId
 * @param {number} adminId
 * @param {string} [comments]
 * @returns {Promise<object>} The approved booking details
 */
const approveBooking = async (bookingId, adminId, comments) => {
  const client = await pool.connect();
  try {
    await client.query('BEGIN;');

    // 1. Lock and retrieve the booking row
    const bookingRes = await client.query(
      `SELECT
        b.id, b.event_name, b.event_type, b.department, b.venue_id, b.faculty_id,
        b.event_date, b.start_time, b.end_time, b.expected_participants, b.status
       FROM bookings b
       WHERE b.id = $1
       FOR UPDATE;`,
      [bookingId]
    );

    const booking = bookingRes.rows[0];
    if (!booking) {
      const error = new Error('Booking request not found.');
      error.statusCode = 404;
      throw error;
    }

    if (booking.status !== 'pending') {
      const error = new Error(
        `Cannot approve booking: Request is not in pending status (current status: '${booking.status}').`
      );
      error.statusCode = 409;
      throw error;
    }

    // 2. Verify venue existence and active status
    const venueRes = await client.query(
      'SELECT id, name, location, building, capacity, is_active FROM venues WHERE id = $1;',
      [booking.venue_id]
    );
    const venue = venueRes.rows[0];
    if (!venue) {
      const error = new Error('Venue not found.');
      error.statusCode = 404;
      throw error;
    }

    if (!venue.is_active) {
      const error = new Error(
        `Cannot approve booking: Venue "${venue.name}" is currently inactive.`
      );
      error.statusCode = 400;
      throw error;
    }

    // 3. Re-verify Sunday restriction
    const dowRes = await client.query(
      'SELECT EXTRACT(DOW FROM $1::date) AS dow;',
      [booking.event_date]
    );
    if (parseInt(dowRes.rows[0].dow, 10) === 0) {
      const error = new Error('Cannot approve booking: Sunday bookings are prohibited.');
      error.statusCode = 400;
      throw error;
    }

    // 4. Re-verify valid time range
    if (booking.end_time <= booking.start_time) {
      const error = new Error('Cannot approve booking: Invalid time sequence (end_time <= start_time).');
      error.statusCode = 400;
      throw error;
    }

    // 5. Re-verify participant capacity
    if (booking.expected_participants > venue.capacity) {
      const error = new Error(
        `Cannot approve booking: Expected participants (${booking.expected_participants}) exceeds venue capacity (${venue.capacity}).`
      );
      error.statusCode = 400;
      throw error;
    }

    // 6. Conflict check: exclude current booking ID
    const conflictRes = await client.query(
      'SELECT * FROM check_booking_conflict($1, $2::date, $3::time, $4::time, $5);',
      [booking.venue_id, booking.event_date, booking.start_time, booking.end_time, booking.id]
    );

    if (conflictRes.rows.length > 0) {
      const conflicts = conflictRes.rows.map((row) => ({
        conflict_booking_id: row.conflict_id,
        event_name: row.conflict_event_name,
        status: row.conflict_status,
        start_time: row.conflict_start,
        end_time: row.conflict_end,
      }));

      const error = new Error(
        `Cannot approve booking: The venue "${venue.name}" has an overlapping booking or pending request on this date and time.`
      );
      error.statusCode = 409;
      error.conflicts = conflicts;
      throw error;
    }

    // 7. Update booking status to 'approved'
    const updateRes = await client.query(
      `UPDATE bookings
       SET status = 'approved', rejection_reason = NULL, updated_at = NOW()
       WHERE id = $1
       RETURNING *;`,
      [bookingId]
    );
    const updatedBooking = updateRes.rows[0];

    // 8. Record audit log in booking_approval_history
    await client.query(
      `INSERT INTO booking_approval_history (booking_id, admin_id, action, comments)
       VALUES ($1, $2, 'approved', $3);`,
      [bookingId, adminId, comments || 'Approved by administrator.']
    );

    // 9. Send in-app notification to the requesting faculty member
    const dateFormatted = typeof booking.event_date === 'string'
      ? booking.event_date
      : new Date(booking.event_date).toISOString().split('T')[0];

    const notifMessage = `Your booking request for "${booking.event_name}" at "${venue.name}" on ${dateFormatted} (${booking.start_time} - ${booking.end_time}) has been approved.`;

    await client.query(
      `INSERT INTO notifications (recipient_user_id, type, title, message, related_entity_type, related_entity_id)
       VALUES ($1, 'booking_approved', 'Booking Request Approved', $2, 'booking', $3);`,
      [booking.faculty_id, notifMessage, bookingId]
    );

    await client.query('COMMIT;');

    updatedBooking.venue = {
      id: venue.id,
      name: venue.name,
      location: venue.location,
      building: venue.building,
      capacity: venue.capacity,
    };

    return updatedBooking;
  } catch (err) {
    await client.query('ROLLBACK;');
    // Catch exclusion constraint error cleanly without exposing SQL internals
    if (err.code === '23P01') {
      const error = new Error(
        'Cannot approve booking: Another approved booking was confirmed concurrently for this venue and time slot.'
      );
      error.statusCode = 409;
      throw error;
    }
    throw err;
  } finally {
    client.release();
  }
};

/**
 * Rejects a pending booking request with a mandatory rejection reason (Admin only).
 * Executes inside a database transaction:
 * - Locks row for update
 * - Confirms pending status
 * - Updates status to 'rejected' and records rejection_reason
 * - Inserts audit entry in booking_approval_history
 * - Dispatches notification to faculty
 * 
 * @param {number} bookingId
 * @param {number} adminId
 * @param {string} rejectionReason
 * @returns {Promise<object>} The rejected booking details
 */
const rejectBooking = async (bookingId, adminId, rejectionReason) => {
  const client = await pool.connect();
  try {
    await client.query('BEGIN;');

    const bookingRes = await client.query(
      `SELECT
        b.id, b.event_name, b.venue_id, b.faculty_id, b.event_date,
        b.start_time, b.end_time, b.status
       FROM bookings b
       WHERE b.id = $1
       FOR UPDATE;`,
      [bookingId]
    );

    const booking = bookingRes.rows[0];
    if (!booking) {
      const error = new Error('Booking request not found.');
      error.statusCode = 404;
      throw error;
    }

    if (booking.status !== 'pending') {
      const error = new Error(
        `Cannot reject booking: Request is not in pending status (current status: '${booking.status}').`
      );
      error.statusCode = 409;
      throw error;
    }

    // Update booking status to 'rejected'
    const updateRes = await client.query(
      `UPDATE bookings
       SET status = 'rejected', rejection_reason = $1, updated_at = NOW()
       WHERE id = $2
       RETURNING *;`,
      [rejectionReason, bookingId]
    );
    const updatedBooking = updateRes.rows[0];

    // Retrieve venue details for consistent response structure
    const venueRes = await client.query(
      'SELECT id, name, location, building, capacity FROM venues WHERE id = $1;',
      [booking.venue_id]
    );
    if (venueRes.rows[0]) {
      updatedBooking.venue = venueRes.rows[0];
    }

    // Record audit log in booking_approval_history
    await client.query(
      `INSERT INTO booking_approval_history (booking_id, admin_id, action, comments)
       VALUES ($1, $2, 'rejected', $3);`,
      [bookingId, adminId, rejectionReason]
    );

    // Send in-app notification to the requesting faculty member
    const notifMessage = `Your booking request for "${booking.event_name}" was rejected. Reason: ${rejectionReason}`;

    await client.query(
      `INSERT INTO notifications (recipient_user_id, type, title, message, related_entity_type, related_entity_id)
       VALUES ($1, 'booking_rejected', 'Booking Request Rejected', $2, 'booking', $3);`,
      [booking.faculty_id, notifMessage, bookingId]
    );

    await client.query('COMMIT;');
    return updatedBooking;
  } catch (err) {
    await client.query('ROLLBACK;');
    throw err;
  } finally {
    client.release();
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
