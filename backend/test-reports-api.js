/**
 * Comprehensive Backend Test Suite for Event Completion Reports
 * Uses Node.js native fetch with app.listen(0) - no external packages needed.
 * Tests:
 * 1. Role-based security (Students strictly blocked 403 on all endpoints)
 * 2. Pre-conclusion check (Rejects report submission before event has concluded)
 * 3. Booking ownership check (Rejects submission by non-owner faculty)
 * 4. Attendance validation (Rejects negative attendance or attendance > expected)
 * 5. Successful submission & automated percentage calculation
 * 6. Duplicate report prevention (1-to-1 booking constraint)
 * 7. Dean report retrieval & query filtering
 * 8. Dean revision request workflow & automated faculty notification
 * 9. Faculty report revision update & automatic status reset
 * 10. Dean final review approval & report locking
 */

require('dotenv').config({ path: '.env.render' });
const http = require('http');
const app = require('./src/app');
const { pool } = require('./src/config/database');
const { signToken } = require('./src/utils/jwt');

async function runTests() {
  console.log('====================================================');
  console.log('  STARTING EVENT COMPLETION REPORT BACKEND TEST SUITE');
  console.log('====================================================\n');

  let passed = 0;
  let failed = 0;

  function assert(condition, message) {
    if (condition) {
      console.log(`  [PASS] ${message}`);
      passed++;
    } else {
      console.error(`  [FAIL] ${message}`);
      failed++;
    }
  }

  // Start test server on dynamic port
  const server = http.createServer(app);
  await new Promise((resolve) => server.listen(0, resolve));
  const port = server.address().port;
  const baseUrl = `http://localhost:${port}/api`;
  console.log(`Test server running on port ${port}\n`);

  try {
    // 1. Fetch real test users from database
    const usersRes = await pool.query("SELECT id, role, email, name FROM users ORDER BY id ASC;");
    const adminUser = usersRes.rows.find((u) => u.role === 'admin');
    const facultyUser = usersRes.rows.find((u) => u.role === 'faculty');
    const studentUser = usersRes.rows.find((u) => u.role === 'student');

    if (!adminUser || !facultyUser || !studentUser) {
      throw new Error('Required test users (admin, faculty, student) not found in Supabase.');
    }

    const adminToken = signToken({ id: adminUser.id, role: adminUser.role });
    const facultyToken = signToken({ id: facultyUser.id, role: facultyUser.role });
    const studentToken = signToken({ id: studentUser.id, role: studentUser.role });

    console.log(`Test accounts identified:`);
    console.log(`  - Admin: #${adminUser.id} (${adminUser.name})`);
    console.log(`  - Faculty: #${facultyUser.id} (${facultyUser.name})`);
    console.log(`  - Student: #${studentUser.id} (${studentUser.name})\n`);

    // Helper fetcher
    async function apiRequest(endpoint, { method = 'GET', token, body } = {}) {
      const headers = { 'Content-Type': 'application/json' };
      if (token) headers['Authorization'] = `Bearer ${token}`;
      const res = await fetch(`${baseUrl}${endpoint}`, {
        method,
        headers,
        body: body ? JSON.stringify(body) : undefined,
      });
      let data = null;
      try {
        data = await res.json();
      } catch {}
      return { status: res.status, data };
    }

    // ---------------------------------------------------------------
    // TEST SECTION 1: Student Permissions (Security & Access Control)
    // ---------------------------------------------------------------
    console.log('--- TEST SECTION 1: Student Security & Role Restrictions ---');

    const resStudentPost = await apiRequest('/reports', {
      method: 'POST',
      token: studentToken,
      body: { booking_id: 1, actual_participants: 50, event_summary: 'Test summary long enough', activities_conducted: 'Activities long enough' },
    });
    assert(resStudentPost.status === 403, 'Student cannot submit completion report (HTTP 403 Forbidden)');

    const resStudentGet = await apiRequest('/reports', {
      method: 'GET',
      token: studentToken,
    });
    assert(resStudentGet.status === 403, 'Student cannot view Dean reports list (HTTP 403 Forbidden)');

    const resStudentMyReports = await apiRequest('/reports/my-reports', {
      method: 'GET',
      token: studentToken,
    });
    assert(resStudentMyReports.status === 403, 'Student cannot access faculty reports endpoint (HTTP 403 Forbidden)');

    const resStudentReview = await apiRequest('/reports/1/review', {
      method: 'PATCH',
      token: studentToken,
      body: { action: 'reviewed' },
    });
    assert(resStudentReview.status === 403, 'Student cannot review reports (HTTP 403 Forbidden)');

    // ---------------------------------------------------------------
    // TEST SECTION 2: Future / Unconcluded Event Rejection
    // ---------------------------------------------------------------
    console.log('\n--- TEST SECTION 2: Concluded Event Eligibility Check ---');

    // Booking #1 is scheduled for 2026-11-10 (future event)
    const resFutureSubmit = await apiRequest('/reports', {
      method: 'POST',
      token: facultyToken,
      body: {
        booking_id: 1,
        actual_participants: 80,
        event_summary: 'This event is scheduled for next month and has not yet concluded.',
        activities_conducted: 'Presentation, Workshop sessions',
      },
    });
    assert(
      resFutureSubmit.status === 400 && resFutureSubmit.data?.message?.includes('concluded'),
      'Rejects report submission for events that have not concluded yet (HTTP 400)'
    );

    // ---------------------------------------------------------------
    // TEST SECTION 3: Create Concluded Booking for End-to-End Testing
    // ---------------------------------------------------------------
    console.log('\n--- TEST SECTION 3: Full End-to-End Submission & Review ---');

    // Insert a real test booking that concluded yesterday for Faculty
    const testBookingRes = await pool.query(
      `INSERT INTO bookings (
         event_name, event_type, department, venue_id, faculty_id,
         event_date, start_time, end_time, expected_participants,
         description, status
       )
       VALUES ($1, $2, $3, 1, $4, CURRENT_DATE - INTERVAL '1 day', '09:00:00', '12:00:00', 110, 'Test Concluded Seminar', 'approved')
       RETURNING id;`,
      ['AI Robotics Symposium', 'Seminar', 'CSE', facultyUser.id]
    );
    const testBookingId = testBookingRes.rows[0].id;
    console.log(`  [+] Created test concluded booking #${testBookingId} (Expected: 110 participants)`);

    // Test: Attendance exceeding expected count rejection
    const resExceeding = await apiRequest('/reports', {
      method: 'POST',
      token: facultyToken,
      body: {
        booking_id: testBookingId,
        actual_participants: 150, // exceeds 110
        event_summary: 'Comprehensive report on AI robotics symposium.',
        activities_conducted: 'Robotics demonstrations, neural net lectures.',
      },
    });
    assert(
      resExceeding.status === 400 && resExceeding.data?.message?.includes('exceed'),
      'Rejects actual attendance exceeding expected participants (HTTP 400)'
    );

    // Test: Negative attendance rejection
    const resNegative = await apiRequest('/reports', {
      method: 'POST',
      token: facultyToken,
      body: {
        booking_id: testBookingId,
        actual_participants: -5,
        event_summary: 'Comprehensive report on AI robotics symposium.',
        activities_conducted: 'Robotics demonstrations, neural net lectures.',
      },
    });
    assert(resNegative.status === 400, 'Rejects negative actual attendance (HTTP 400)');

    // Test: Ownership rejection (Faculty submitting report for someone else's booking)
    const otherFacultyToken = signToken({ id: 9999, role: 'faculty' });
    const resWrongOwner = await apiRequest('/reports', {
      method: 'POST',
      token: otherFacultyToken,
      body: {
        booking_id: testBookingId,
        actual_participants: 80,
        event_summary: 'Comprehensive report on AI robotics symposium.',
        activities_conducted: 'Robotics demonstrations, neural net lectures.',
      },
    });
    assert(resWrongOwner.status === 401 || resWrongOwner.status === 403, 'Rejects report submission by non-owner (HTTP 403/401)');

    // Test: Legitimate submission (80 actual out of 110 expected = 72.73%)
    const resSubmit = await apiRequest('/reports', {
      method: 'POST',
      token: facultyToken,
      body: {
        booking_id: testBookingId,
        actual_participants: 80,
        event_summary: 'The AI Robotics Symposium was conducted smoothly with high student engagement.',
        activities_conducted: 'Keynote by industry experts, hands-on rover simulation, student Q&A.',
        challenges_faced: 'Slight delay in projector HDMI sync during initial keynote.',
        suggestions_for_future: 'Ensure wireless clickers are battery-checked beforehand.',
      },
    });

    assert(resSubmit.status === 201, 'Faculty successfully submits completion report (HTTP 201 Created)');
    const createdReport = resSubmit.data.data.report;
    assert(createdReport.actual_participants === 80, 'Actual participants stored accurately (80)');
    assert(createdReport.attendance_percentage === 72.73, 'Attendance percentage automatically calculated as 72.73%');
    assert(createdReport.status === 'submitted', 'Report initial status is "submitted"');

    const reportId = createdReport.id;

    // Test: Duplicate report submission prevention (1-to-1 constraint)
    const resDuplicate = await apiRequest('/reports', {
      method: 'POST',
      token: facultyToken,
      body: {
        booking_id: testBookingId,
        actual_participants: 80,
        event_summary: 'Duplicate submission attempt.',
        activities_conducted: 'Duplicate activities.',
      },
    });
    assert(resDuplicate.status === 409, 'Duplicate report submission prevented by 1-to-1 constraint (HTTP 409 Conflict)');

    // ---------------------------------------------------------------
    // TEST SECTION 4: Dean Review & Revision Request Workflow
    // ---------------------------------------------------------------
    console.log('\n--- TEST SECTION 4: Dean Review & Revision Cycle ---');

    // Dean views all reports
    const resDeanList = await apiRequest('/reports', {
      method: 'GET',
      token: adminToken,
    });
    assert(resDeanList.status === 200, 'Dean can list all reports (HTTP 200 OK)');
    const foundInDeanList = resDeanList.data.data.reports.some((r) => r.id === reportId);
    assert(foundInDeanList, 'Submitted report appears in Dean reports list');

    // Dean requests revision
    const resRevision = await apiRequest(`/reports/${reportId}/review`, {
      method: 'PATCH',
      token: adminToken,
      body: {
        action: 'revision_requested',
        dean_remarks: 'Please provide more details on student feedback in the suggestions section.',
      },
    });
    assert(resRevision.status === 200, 'Dean requests revision (HTTP 200 OK)');
    assert(resRevision.data.data.report.status === 'revision_requested', 'Report status updated to "revision_requested"');

    // Verify notification was dispatched to faculty in Supabase
    const notifRes = await pool.query(
      "SELECT * FROM notifications WHERE recipient_user_id = $1 AND related_entity_type = 'report' AND related_entity_id = $2 ORDER BY id DESC LIMIT 1;",
      [facultyUser.id, reportId]
    );
    assert(notifRes.rows.length > 0, 'Notification for revision request was stored in Supabase');

    // Faculty updates/revises report
    const resUpdate = await apiRequest(`/reports/${reportId}`, {
      method: 'PATCH',
      token: facultyToken,
      body: {
        actual_participants: 85, // Updated attendance (85/110 = 77.27%)
        suggestions_for_future: 'Collected 45 student feedback forms; 90% requested annual continuation with advanced ROS robotics tracks.',
      },
    });
    assert(resUpdate.status === 200, 'Faculty successfully updates report (HTTP 200 OK)');
    assert(resUpdate.data.data.report.actual_participants === 85, 'Updated attendance persisted (85)');
    assert(resUpdate.data.data.report.attendance_percentage === 77.27, 'Attendance percentage recalculated (77.27%)');
    assert(resUpdate.data.data.report.status === 'submitted', 'Status automatically reset to "submitted" for re-review');

    // Dean approves final report as 'reviewed'
    const resFinalReview = await apiRequest(`/reports/${reportId}/review`, {
      method: 'PATCH',
      token: adminToken,
      body: {
        action: 'reviewed',
        dean_remarks: 'Well documented. Approved for department records.',
      },
    });
    assert(resFinalReview.status === 200, 'Dean approves report as reviewed (HTTP 200 OK)');
    assert(resFinalReview.data.data.report.status === 'reviewed', 'Report final status is "reviewed"');
    assert(resFinalReview.data.data.report.reviewer.id === adminUser.id, 'Reviewer ID recorded in Supabase');
    assert(resFinalReview.data.data.report.reviewed_at !== null, 'Review timestamp recorded in Supabase');

    // Test: Modification locked after final review
    const resLockedEdit = await apiRequest(`/reports/${reportId}`, {
      method: 'PATCH',
      token: facultyToken,
      body: { event_summary: 'Attempting edit on reviewed report' },
    });
    assert(resLockedEdit.status === 400, 'Modification prevented on reviewed reports (HTTP 400)');

    // ---------------------------------------------------------------
    // CLEANUP TEST DATA
    // ---------------------------------------------------------------
    console.log('\n--- Cleaning up temporary test booking & report ---');
    await pool.query("DELETE FROM notifications WHERE related_entity_type = 'report' AND related_entity_id = $1;", [reportId]);
    await pool.query("DELETE FROM event_completion_reports WHERE id = $1;", [reportId]);
    await pool.query("DELETE FROM bookings WHERE id = $1;", [testBookingId]);
    console.log('  [+] Cleaned up temporary test artifacts from Supabase.\n');

    console.log('====================================================');
    console.log(`TEST RESULTS: ${passed} PASSED, ${failed} FAILED`);
    console.log('====================================================\n');
  } finally {
    server.close();
    await pool.end();
  }
}

runTests().catch((err) => {
  console.error('Test execution error:', err);
  process.exit(1);
});
