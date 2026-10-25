const { pool } = require('../config/database');

/**
 * Calculates attendance percentage safely.
 * Handles zero expected participants gracefully without dividing by zero.
 */
const calculateAttendancePercentage = (actual, expected) => {
  const actualNum = Number(actual) || 0;
  const expectedNum = Number(expected) || 0;

  if (expectedNum <= 0) {
    return 0.00;
  }

  const pct = (actualNum / expectedNum) * 100;
  return Number(Math.min(100, Math.max(0, pct)).toFixed(2));
};

/**
 * Formats a database report row into a standard client object.
 */
const formatReport = (r) => ({
  id: r.id,
  booking_id: r.booking_id,
  faculty_id: r.faculty_id,
  actual_participants: r.actual_participants,
  attendance_percentage: parseFloat(r.attendance_percentage),
  event_summary: r.event_summary,
  activities_conducted: r.activities_conducted,
  challenges_faced: r.challenges_faced || '',
  suggestions_for_future: r.suggestions_for_future || '',
  status: r.status,
  reviewer_id: r.reviewer_id,
  reviewed_at: r.reviewed_at,
  dean_remarks: r.dean_remarks || '',
  created_at: r.created_at,
  updated_at: r.updated_at,
  booking: {
    id: r.booking_id,
    event_name: r.event_name,
    event_type: r.event_type,
    department: r.department,
    event_date: r.event_date ? r.event_date.toISOString().slice(0, 10) : null,
    start_time: r.start_time,
    end_time: r.end_time,
    expected_participants: r.expected_participants,
    venue_id: r.venue_id,
    venue_name: r.venue_name,
    venue_building: r.venue_building,
    venue_location: r.venue_location,
    status: r.booking_status,
  },
  faculty: {
    id: r.faculty_id,
    name: r.faculty_name,
    email: r.faculty_email,
    department: r.faculty_department,
    college_id: r.faculty_college_id,
  },
  reviewer: r.reviewer_id ? {
    id: r.reviewer_id,
    name: r.reviewer_name,
    email: r.reviewer_email,
  } : null,
});

/**
 * Shared base SELECT query for reports with booking, venue, faculty, and reviewer details.
 */
const BASE_REPORT_SELECT = `
  SELECT
    r.id, r.booking_id, r.faculty_id, r.actual_participants, r.attendance_percentage,
    r.event_summary, r.activities_conducted, r.challenges_faced, r.suggestions_for_future,
    r.status, r.reviewer_id, r.reviewed_at, r.dean_remarks, r.created_at, r.updated_at,
    b.event_name, b.event_type, b.department, b.event_date, b.start_time, b.end_time,
    b.expected_participants, b.venue_id, b.status AS booking_status,
    v.name AS venue_name, v.building AS venue_building, v.location AS venue_location,
    u.name AS faculty_name, u.email AS faculty_email, u.department AS faculty_department, u.college_id AS faculty_college_id,
    rev.name AS reviewer_name, rev.email AS reviewer_email
  FROM event_completion_reports r
  JOIN bookings b ON r.booking_id = b.id
  JOIN venues v ON b.venue_id = v.id
  JOIN users u ON r.faculty_id = u.id
  LEFT JOIN users rev ON r.reviewer_id = rev.id
`;

/**
 * Faculty submits a new completion report for their approved, concluded booking.
 */
const createCompletionReport = async (facultyId, reportData) => {
  const {
    booking_id,
    actual_participants,
    event_summary,
    activities_conducted,
    challenges_faced,
    suggestions_for_future,
  } = reportData;

  // 1. Fetch booking details and check ownership and status
  const bookingRes = await pool.query(
    `SELECT
       b.id, b.faculty_id, b.venue_id, b.event_name, b.event_date,
       b.start_time, b.end_time, b.expected_participants, b.status,
       v.name AS venue_name,
       (b.event_date + b.end_time) <= NOW() AS has_concluded
     FROM bookings b
     JOIN venues v ON b.venue_id = v.id
     WHERE b.id = $1;`,
    [booking_id]
  );

  const booking = bookingRes.rows[0];
  if (!booking) {
    const error = new Error('Booking request not found.');
    error.statusCode = 404;
    throw error;
  }

  // 2. Enforce booking ownership: only the faculty member who owns the booking can submit
  if (booking.faculty_id !== facultyId) {
    const error = new Error('You are not authorized to submit a completion report for this booking.');
    error.statusCode = 403;
    throw error;
  }

  // 3. Enforce booking status: must be approved
  if (booking.status !== 'approved') {
    const error = new Error(`Completion reports can only be submitted for approved bookings. Current booking status is "${booking.status}".`);
    error.statusCode = 400;
    throw error;
  }

  // 4. Enforce event conclusion: event end time must have passed
  if (!booking.has_concluded) {
    const error = new Error('Completion reports cannot be submitted before the event has concluded.');
    error.statusCode = 400;
    throw error;
  }

  // 5. Validate actual attendance against expected participants
  if (actual_participants < 0) {
    const error = new Error('Actual attendance cannot be negative.');
    error.statusCode = 400;
    throw error;
  }

  if (actual_participants > booking.expected_participants) {
    const error = new Error(
      `Actual participants (${actual_participants}) cannot exceed the expected participants (${booking.expected_participants}) for this booking.`
    );
    error.statusCode = 400;
    throw error;
  }

  // 6. Enforce 1-to-1 relationship: prevent duplicate report creation
  const existingReportRes = await pool.query(
    'SELECT id, status FROM event_completion_reports WHERE booking_id = $1;',
    [booking_id]
  );
  if (existingReportRes.rows.length > 0) {
    const existing = existingReportRes.rows[0];
    const error = new Error(
      `A completion report has already been created for this booking (Report #${existing.id}, Status: ${existing.status}). Please update the existing report if a revision was requested.`
    );
    error.statusCode = 409;
    throw error;
  }

  // 7. Calculate attendance percentage consistently
  const attendancePercentage = calculateAttendancePercentage(
    actual_participants,
    booking.expected_participants
  );

  // 8. Insert completion report into Supabase PostgreSQL
  const insertQuery = `
    INSERT INTO event_completion_reports (
      booking_id,
      faculty_id,
      actual_participants,
      attendance_percentage,
      event_summary,
      activities_conducted,
      challenges_faced,
      suggestions_for_future,
      status
    )
    VALUES ($1, $2, $3, $4, $5, $6, $7, $8, 'submitted')
    RETURNING id;
  `;

  const insertRes = await pool.query(insertQuery, [
    booking_id,
    facultyId,
    actual_participants,
    attendancePercentage,
    event_summary,
    activities_conducted,
    challenges_faced || null,
    suggestions_for_future || null,
  ]);

  const reportId = insertRes.rows[0].id;

  // 9. Retrieve and return full formatted report object
  return getReportById(facultyId, 'faculty', reportId);
};

/**
 * Faculty updates an existing completion report (e.g., following a Dean revision request).
 */
const updateCompletionReport = async (facultyId, reportId, updateData) => {
  // 1. Fetch current report and booking details
  const reportRes = await pool.query(
    `SELECT r.*, b.expected_participants, b.event_name
     FROM event_completion_reports r
     JOIN bookings b ON r.booking_id = b.id
     WHERE r.id = $1;`,
    [reportId]
  );

  const report = reportRes.rows[0];
  if (!report) {
    const error = new Error('Completion report not found.');
    error.statusCode = 404;
    throw error;
  }

  // 2. Ownership check
  if (report.faculty_id !== facultyId) {
    const error = new Error('You are not authorized to edit this completion report.');
    error.statusCode = 403;
    throw error;
  }

  // 3. Status check: reviewed reports are locked
  if (report.status === 'reviewed') {
    const error = new Error('This completion report has already been approved and marked as reviewed by the Dean. It cannot be modified.');
    error.statusCode = 400;
    throw error;
  }

  // 4. Validate actual attendance if updated
  let finalActual = report.actual_participants;
  if (updateData.actual_participants !== undefined && updateData.actual_participants !== null) {
    finalActual = updateData.actual_participants;
    if (finalActual < 0) {
      const error = new Error('Actual attendance cannot be negative.');
      error.statusCode = 400;
      throw error;
    }
    if (finalActual > report.expected_participants) {
      const error = new Error(
        `Actual participants (${finalActual}) cannot exceed expected participants (${report.expected_participants}) for this booking.`
      );
      error.statusCode = 400;
      throw error;
    }
  }

  const finalPercentage = calculateAttendancePercentage(finalActual, report.expected_participants);
  const finalSummary = updateData.event_summary !== undefined ? updateData.event_summary : report.event_summary;
  const finalActivities = updateData.activities_conducted !== undefined ? updateData.activities_conducted : report.activities_conducted;
  const finalChallenges = updateData.challenges_faced !== undefined ? updateData.challenges_faced : report.challenges_faced;
  const finalSuggestions = updateData.suggestions_for_future !== undefined ? updateData.suggestions_for_future : report.suggestions_for_future;

  // 5. Update report and reset status to 'submitted' for Dean re-review
  const updateQuery = `
    UPDATE event_completion_reports
    SET
      actual_participants = $1,
      attendance_percentage = $2,
      event_summary = $3,
      activities_conducted = $4,
      challenges_faced = $5,
      suggestions_for_future = $6,
      status = 'submitted',
      updated_at = NOW()
    WHERE id = $7
    RETURNING id;
  `;

  await pool.query(updateQuery, [
    finalActual,
    finalPercentage,
    finalSummary,
    finalActivities,
    finalChallenges || null,
    finalSuggestions || null,
    reportId,
  ]);

  return getReportById(facultyId, 'faculty', reportId);
};

/**
 * Retrieves a single report by ID with full role verification.
 */
const getReportById = async (userId, userRole, reportId) => {
  const query = `${BASE_REPORT_SELECT} WHERE r.id = $1;`;
  const res = await pool.query(query, [reportId]);
  const row = res.rows[0];

  if (!row) {
    const error = new Error('Completion report not found.');
    error.statusCode = 404;
    throw error;
  }

  // Non-admin faculty can only see their own report
  if (userRole === 'faculty' && row.faculty_id !== userId) {
    const error = new Error('You are not authorized to view this completion report.');
    error.statusCode = 403;
    throw error;
  }

  // Students have zero access
  if (userRole === 'student') {
    const error = new Error('Students are not permitted to access event completion reports.');
    error.statusCode = 403;
    throw error;
  }

  return formatReport(row);
};

/**
 * Retrieves the completion report associated with a specific booking.
 */
const getReportByBookingId = async (userId, userRole, bookingId) => {
  // Check booking first to verify permissions
  const bookingRes = await pool.query(
    `SELECT b.id, b.faculty_id, b.status, (b.event_date + b.end_time) <= NOW() AS has_concluded
     FROM bookings b
     WHERE b.id = $1;`,
    [bookingId]
  );

  const booking = bookingRes.rows[0];
  if (!booking) {
    const error = new Error('Booking not found.');
    error.statusCode = 404;
    throw error;
  }

  if (userRole === 'faculty' && booking.faculty_id !== userId) {
    const error = new Error('You are not authorized to view completion report for this booking.');
    error.statusCode = 403;
    throw error;
  }

  if (userRole === 'student') {
    const error = new Error('Students are not permitted to access event completion reports.');
    error.statusCode = 403;
    throw error;
  }

  const query = `${BASE_REPORT_SELECT} WHERE r.booking_id = $1;`;
  const res = await pool.query(query, [bookingId]);
  if (res.rows.length === 0) {
    return {
      has_report: false,
      report: null,
      can_submit: booking.status === 'approved' && booking.has_concluded,
      reason: booking.status !== 'approved'
        ? `Booking is ${booking.status}. Reports require an approved booking.`
        : !booking.has_concluded
          ? 'Event has not yet concluded.'
          : null,
    };
  }

  return {
    has_report: true,
    report: formatReport(res.rows[0]),
    can_submit: false,
  };
};

/**
 * Retrieves all reports submitted by the authenticated faculty member.
 */
const getFacultyReports = async (facultyId, { page = 1, limit = 20, status }) => {
  const safePage = Math.max(1, parseInt(page, 10) || 1);
  const safeLimit = Math.min(100, Math.max(1, parseInt(limit, 10) || 20));
  const offset = (safePage - 1) * safeLimit;

  const conditions = ['r.faculty_id = $1'];
  const queryParams = [facultyId];

  if (status && ['submitted', 'reviewed', 'revision_requested'].includes(status.trim().toLowerCase())) {
    queryParams.push(status.trim().toLowerCase());
    conditions.push(`r.status = $${queryParams.length}`);
  }

  const whereClause = `WHERE ${conditions.join(' AND ')}`;

  const countQuery = `SELECT COUNT(*) AS total FROM event_completion_reports r ${whereClause};`;
  const countRes = await pool.query(countQuery, queryParams);
  const total = parseInt(countRes.rows[0].total, 10);

  queryParams.push(safeLimit);
  const limitIdx = queryParams.length;
  queryParams.push(offset);
  const offsetIdx = queryParams.length;

  const dataQuery = `
    ${BASE_REPORT_SELECT}
    ${whereClause}
    ORDER BY r.created_at DESC
    LIMIT $${limitIdx} OFFSET $${offsetIdx};
  `;

  const { rows } = await pool.query(dataQuery, queryParams);

  return {
    reports: rows.map(formatReport),
    pagination: {
      total,
      page: safePage,
      limit: safeLimit,
      totalPages: Math.ceil(total / safeLimit) || 1,
    },
  };
};

/**
 * Dean/Admin retrieves all submitted completion reports across campus.
 */
const getAllReportsAdmin = async ({ page = 1, limit = 20, status, search }) => {
  const safePage = Math.max(1, parseInt(page, 10) || 1);
  const safeLimit = Math.min(100, Math.max(1, parseInt(limit, 10) || 20));
  const offset = (safePage - 1) * safeLimit;

  const conditions = [];
  const queryParams = [];

  if (status && ['submitted', 'reviewed', 'revision_requested'].includes(status.trim().toLowerCase())) {
    queryParams.push(status.trim().toLowerCase());
    conditions.push(`r.status = $${queryParams.length}`);
  }

  if (search && search.trim()) {
    queryParams.push(`%${search.trim()}%`);
    const sIdx = queryParams.length;
    conditions.push(`(b.event_name ILIKE $${sIdx} OR u.name ILIKE $${sIdx} OR v.name ILIKE $${sIdx} OR b.department ILIKE $${sIdx})`);
  }

  const whereClause = conditions.length > 0 ? `WHERE ${conditions.join(' AND ')}` : '';

  const countQuery = `
    SELECT COUNT(*) AS total
    FROM event_completion_reports r
    JOIN bookings b ON r.booking_id = b.id
    JOIN venues v ON b.venue_id = v.id
    JOIN users u ON r.faculty_id = u.id
    ${whereClause};
  `;
  const countRes = await pool.query(countQuery, queryParams);
  const total = parseInt(countRes.rows[0].total, 10);

  queryParams.push(safeLimit);
  const limitIdx = queryParams.length;
  queryParams.push(offset);
  const offsetIdx = queryParams.length;

  const dataQuery = `
    ${BASE_REPORT_SELECT}
    ${whereClause}
    ORDER BY
      CASE WHEN r.status = 'submitted' THEN 1 WHEN r.status = 'revision_requested' THEN 2 ELSE 3 END,
      r.created_at DESC
    LIMIT $${limitIdx} OFFSET $${offsetIdx};
  `;

  const { rows } = await pool.query(dataQuery, queryParams);

  return {
    reports: rows.map(formatReport),
    pagination: {
      total,
      page: safePage,
      limit: safeLimit,
      totalPages: Math.ceil(total / safeLimit) || 1,
    },
  };
};

/**
 * Dean reviews a report: marks it as 'reviewed' or requests 'revision_requested'.
 */
const reviewCompletionReport = async (adminId, reportId, { action, dean_remarks }) => {
  // 1. Fetch current report details
  const reportRes = await pool.query(
    `SELECT r.*, b.event_name, b.event_date, u.id AS faculty_id, u.name AS faculty_name,
            adm.name AS admin_name
     FROM event_completion_reports r
     JOIN bookings b ON r.booking_id = b.id
     JOIN users u ON r.faculty_id = u.id
     CROSS JOIN (SELECT name FROM users WHERE id = $1) adm
     WHERE r.id = $2;`,
    [adminId, reportId]
  );

  const report = reportRes.rows[0];
  if (!report) {
    const error = new Error('Completion report not found.');
    error.statusCode = 404;
    throw error;
  }

  const targetStatus = action === 'reviewed' ? 'reviewed' : 'revision_requested';
  const cleanRemarks = dean_remarks ? dean_remarks.trim() : null;

  // 2. Update report status in Supabase PostgreSQL
  const updateQuery = `
    UPDATE event_completion_reports
    SET
      status = $1,
      reviewer_id = $2,
      reviewed_at = NOW(),
      dean_remarks = $3,
      updated_at = NOW()
    WHERE id = $4
    RETURNING id;
  `;

  await pool.query(updateQuery, [targetStatus, adminId, cleanRemarks, reportId]);

  // 3. Dispatch real notification to faculty submitter in Supabase
  const notificationTitle = targetStatus === 'reviewed'
    ? 'Event Completion Report Reviewed'
    : 'Event Completion Report Revision Requested';

  const notificationMessage = targetStatus === 'reviewed'
    ? `The Dean has reviewed and approved your completion report for "${report.event_name}".${cleanRemarks ? ` Remarks: ${cleanRemarks}` : ''}`
    : `The Dean has requested a revision on your completion report for "${report.event_name}". Remarks: ${cleanRemarks}`;

  await pool.query(
    `INSERT INTO notifications (recipient_user_id, type, title, message, related_entity_type, related_entity_id)
     VALUES ($1, $2, $3, $4, 'report', $5);`,
    [
      report.faculty_id,
      targetStatus === 'reviewed' ? 'report_reviewed' : 'report_revision_requested',
      notificationTitle,
      notificationMessage,
      reportId,
    ]
  );

  return getReportById(adminId, 'admin', reportId);
};

module.exports = {
  createCompletionReport,
  updateCompletionReport,
  getReportById,
  getReportByBookingId,
  getFacultyReports,
  getAllReportsAdmin,
  reviewCompletionReport,
  calculateAttendancePercentage,
};
