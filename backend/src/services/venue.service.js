const { pool } = require('../config/database');

/**
 * Lists venues with optional search, status filtering, and pagination.
 * Defaults to returning active venues.
 * 
 * @param {object} params
 * @param {string} [params.search] - Search term across name, building, and location
 * @param {number} [params.page=1] - 1-indexed page number
 * @param {number} [params.limit=10] - Number of items per page
 * @param {string} [params.status='active'] - 'active', 'inactive', or 'all'
 * @returns {Promise<{ venues: Array, pagination: object }>}
 */
const listVenues = async ({ search, page = 1, limit = 10, status = 'active' }) => {
  const safePage = Math.max(1, parseInt(page, 10) || 1);
  const safeLimit = Math.min(100, Math.max(1, parseInt(limit, 10) || 10));
  const offset = (safePage - 1) * safeLimit;

  const conditions = [];
  const queryParams = [];

  // Filter by active status
  if (status === 'active') {
    conditions.push('is_active = true');
  } else if (status === 'inactive') {
    conditions.push('is_active = false');
  }
  // status === 'all' applies no active filter

  // Filter by search keyword
  if (search && typeof search === 'string' && search.trim()) {
    queryParams.push(`%${search.trim()}%`);
    const searchIdx = queryParams.length;
    conditions.push(
      `(name ILIKE $${searchIdx} OR building ILIKE $${searchIdx} OR location ILIKE $${searchIdx})`
    );
  }

  const whereClause = conditions.length > 0 ? `WHERE ${conditions.join(' AND ')}` : '';

  // Count total matching venues
  const countQuery = `SELECT COUNT(*) AS total FROM venues ${whereClause};`;
  const countRes = await pool.query(countQuery, queryParams);
  const total = parseInt(countRes.rows[0].total, 10);

  // Fetch paginated results
  queryParams.push(safeLimit);
  const limitIdx = queryParams.length;
  queryParams.push(offset);
  const offsetIdx = queryParams.length;

  const dataQuery = `
    SELECT id, name, location, building, capacity, description, facilities, is_active, created_at, updated_at
    FROM venues
    ${whereClause}
    ORDER BY name ASC
    LIMIT $${limitIdx} OFFSET $${offsetIdx};
  `;

  const { rows: venues } = await pool.query(dataQuery, queryParams);

  return {
    venues,
    pagination: {
      total,
      page: safePage,
      limit: safeLimit,
      totalPages: Math.ceil(total / safeLimit) || 1,
    },
  };
};

/**
 * Fetches a single venue by its primary key ID.
 * 
 * @param {number} id
 * @returns {Promise<object>}
 */
const getVenueById = async (id) => {
  const query = `
    SELECT id, name, location, building, capacity, description, facilities, is_active, created_at, updated_at
    FROM venues
    WHERE id = $1;
  `;
  const res = await pool.query(query, [id]);

  if (res.rows.length === 0) {
    const error = new Error('Venue not found.');
    error.statusCode = 404;
    throw error;
  }

  return res.rows[0];
};

/**
 * Creates a new venue (Admin only).
 * 
 * @param {object} venueData
 * @returns {Promise<object>} The newly created venue
 */
const createVenue = async ({ name, location, building, capacity, description, facilities = [], is_active = true }) => {
  const cleanName = name.trim();

  // Check for duplicate venue name
  const existingRes = await pool.query(
    'SELECT id FROM venues WHERE LOWER(name) = LOWER($1);',
    [cleanName]
  );
  if (existingRes.rows.length > 0) {
    const error = new Error(`A venue with the name "${cleanName}" already exists.`);
    error.statusCode = 409;
    throw error;
  }

  try {
    const insertQuery = `
      INSERT INTO venues (name, location, building, capacity, description, facilities, is_active)
      VALUES ($1, $2, $3, $4, $5, $6::jsonb, $7)
      RETURNING id, name, location, building, capacity, description, facilities, is_active, created_at, updated_at;
    `;
    const res = await pool.query(insertQuery, [
      cleanName,
      location.trim(),
      building.trim(),
      capacity,
      description ? description.trim() : null,
      JSON.stringify(facilities),
      is_active,
    ]);

    return res.rows[0];
  } catch (err) {
    if (err.code === '23505') {
      const error = new Error(`A venue with the name "${cleanName}" already exists.`);
      error.statusCode = 409;
      throw error;
    }
    throw err;
  }
};

/**
 * Updates an existing venue's details (Admin only).
 * 
 * @param {number} id
 * @param {object} fields - Allowed fields to update
 * @returns {Promise<object>} The updated venue
 */
const updateVenue = async (id, fields) => {
  // Confirm venue exists
  await getVenueById(id);

  // If name is changing, ensure uniqueness
  if (fields.name) {
    const dupRes = await pool.query(
      'SELECT id FROM venues WHERE LOWER(name) = LOWER($1) AND id != $2;',
      [fields.name.trim(), id]
    );
    if (dupRes.rows.length > 0) {
      const error = new Error(`A venue with the name "${fields.name.trim()}" already exists.`);
      error.statusCode = 409;
      throw error;
    }
  }

  const setClauses = [];
  const values = [];

  const allowedColumns = ['name', 'location', 'building', 'capacity', 'description', 'facilities'];

  for (const col of allowedColumns) {
    if (fields[col] !== undefined) {
      if (col === 'facilities') {
        values.push(JSON.stringify(fields[col]));
        setClauses.push(`${col} = $${values.length}::jsonb`);
      } else {
        values.push(fields[col]);
        setClauses.push(`${col} = $${values.length}`);
      }
    }
  }

  if (setClauses.length === 0) {
    const error = new Error('No valid fields provided for update.');
    error.statusCode = 400;
    throw error;
  }

  values.push(id);
  const idIdx = values.length;

  const updateQuery = `
    UPDATE venues
    SET ${setClauses.join(', ')}
    WHERE id = $${idIdx}
    RETURNING id, name, location, building, capacity, description, facilities, is_active, created_at, updated_at;
  `;

  try {
    const res = await pool.query(updateQuery, values);
    return res.rows[0];
  } catch (err) {
    if (err.code === '23505') {
      const error = new Error('A venue with this name already exists.');
      error.statusCode = 409;
      throw error;
    }
    throw err;
  }
};

/**
 * Activates or deactivates a venue (Admin only).
 * Does not delete the venue or its booking history.
 * 
 * @param {number} id
 * @param {boolean} isActive
 * @returns {Promise<object>} The updated venue
 */
const updateVenueStatus = async (id, isActive) => {
  // Confirm venue exists
  await getVenueById(id);

  const query = `
    UPDATE venues
    SET is_active = $1
    WHERE id = $2
    RETURNING id, name, location, building, capacity, description, facilities, is_active, created_at, updated_at;
  `;
  const res = await pool.query(query, [isActive, id]);
  return res.rows[0];
};

/**
 * Checks venue availability for a given date.
 * Returns venue active status, Sunday restriction status, and approved/pending booking intervals.
 * 
 * @param {number} venueId
 * @param {string} dateString - Format 'YYYY-MM-DD'
 * @returns {Promise<object>} Availability report
 */
const getVenueAvailability = async (venueId, dateString) => {
  // 1. Fetch venue details
  const venue = await getVenueById(venueId);

  // 2. Check if date is Sunday using PostgreSQL EXTRACT(DOW FROM ...)
  const dowRes = await pool.query(
    'SELECT EXTRACT(DOW FROM $1::date) AS dow;',
    [dateString]
  );
  const isSunday = parseInt(dowRes.rows[0].dow, 10) === 0;

  if (isSunday) {
    return {
      venue: {
        id: venue.id,
        name: venue.name,
        location: venue.location,
        building: venue.building,
        capacity: venue.capacity,
        is_active: venue.is_active,
      },
      date: dateString,
      is_sunday: true,
      is_available: false,
      message: 'Campus venues are closed on Sundays. Booking requests are not permitted.',
      bookings: [],
      disclaimer: 'Sunday bookings are prohibited by campus policy.',
    };
  }

  // 3. Check if venue is currently inactive
  if (!venue.is_active) {
    return {
      venue: {
        id: venue.id,
        name: venue.name,
        location: venue.location,
        building: venue.building,
        capacity: venue.capacity,
        is_active: false,
      },
      date: dateString,
      is_sunday: false,
      is_available: false,
      message: 'This venue is currently inactive and unavailable for new bookings.',
      bookings: [],
      disclaimer: 'Inactive venues cannot accept new booking requests.',
    };
  }

  // 4. Retrieve approved and pending bookings for the requested date
  // Excludes private internal notes, faculty contact details, and unnecessary metadata
  const bookingsRes = await pool.query(
    `SELECT id, event_name, event_type, start_time, end_time, status
     FROM bookings
     WHERE venue_id = $1
       AND event_date = $2::date
       AND status IN ('approved', 'pending')
     ORDER BY start_time ASC;`,
    [venueId, dateString]
  );

  const bookings = bookingsRes.rows;
  const approvedCount = bookings.filter((b) => b.status === 'approved').length;
  const pendingCount = bookings.filter((b) => b.status === 'pending').length;

  return {
    venue: {
      id: venue.id,
      name: venue.name,
      location: venue.location,
      building: venue.building,
      capacity: venue.capacity,
      is_active: venue.is_active,
    },
    date: dateString,
    is_sunday: false,
    is_available: true,
    total_slots_booked: approvedCount,
    total_slots_pending: pendingCount,
    bookings,
    disclaimer: 'Availability display is for scheduling guidance only and does not guarantee booking approval. Server-side conflict verification is strictly enforced during booking submission and administrative review.',
  };
};

module.exports = {
  listVenues,
  getVenueById,
  createVenue,
  updateVenue,
  updateVenueStatus,
  getVenueAvailability,
};
