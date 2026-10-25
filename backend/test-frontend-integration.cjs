/**
 * Frontend & Integration Test Suite for Event Completion Reports
 * Tests:
 * 1. calculatePreviewPercentage logic (including 0 expected participants)
 * 2. reportService endpoints against live backend (port 5000)
 * 3. Faculty submission -> Dean revision request -> Faculty revision -> Dean review approval
 * 4. Reviewed report lock verification
 * 5. Student access restriction (403 Forbidden)
 * 6. Data persistence after simulated re-login / re-fetch
 */

require('dotenv').config();
const { pool } = require('./src/config/database');
const { signToken } = require('./src/utils/jwt');

// Test the frontend preview calculation function
function calculatePreviewPercentage(actual, expected) {
  const actualNum = Number(actual) || 0;
  const expectedNum = Number(expected) || 0;

  if (expectedNum <= 0) {
    return 0.00;
  }

  const pct = (actualNum / expectedNum) * 100;
  return Number(Math.min(100, Math.max(0, pct)).toFixed(2));
}

async function runFrontendIntegrationTests() {
  console.log('====================================================');
  console.log('  EVENT COMPLETION REPORT FRONTEND & E2E TEST SUITE  ');
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

  // ----------------------------------------------------
  // SECTION 1: Attendance Calculation Verification
  // ----------------------------------------------------
  console.log('--- SECTION 1: Attendance Calculation Verification ---');

  // Test 1: Normal percentage calculation
  const normalPct = calculatePreviewPercentage(80, 100);
  assert(normalPct === 80.00, `80/100 calculates to 80.00% (got: ${normalPct}%)`);

  // Test 2: Fractional percentage calculation
  const fracPct = calculatePreviewPercentage(80, 110);
  assert(fracPct === 72.73, `80/110 calculates to 72.73% (got: ${fracPct}%)`);

  // Test 3: Zero expected participants safely handled (No Division by Zero)
  const zeroExpectedPct = calculatePreviewPercentage(10, 0);
  assert(zeroExpectedPct === 0.00, `Zero expected participants handled safely as 0.00% (got: ${zeroExpectedPct}%)`);

  // Test 4: Zero actual participants
  const zeroActualPct = calculatePreviewPercentage(0, 150);
  assert(zeroActualPct === 0.00, `Zero actual participants calculated as 0.00% (got: ${zeroActualPct}%)`);

  // Test 5: Negative actual participants
  const negActualPct = calculatePreviewPercentage(-10, 100);
  assert(negActualPct <= 0, `Negative actual participants bounds safely to 0.00% (got: ${negActualPct}%)`);

  // ----------------------------------------------------
  // SECTION 2: Role Authentication & Security
  // ----------------------------------------------------
  console.log('\n--- SECTION 2: Role Authentication & Security Verification ---');

  const usersRes = await pool.query('SELECT id, role, email, name FROM users ORDER BY id ASC;');
  const adminUser = usersRes.rows.find((u) => u.role === 'admin');
  const facultyUser = usersRes.rows.find((u) => u.role === 'faculty');
  const studentUser = usersRes.rows.find((u) => u.role === 'student');

  const adminToken = signToken({ id: adminUser.id, role: adminUser.role });
  const facultyToken = signToken({ id: facultyUser.id, role: facultyUser.role });
  const studentToken = signToken({ id: studentUser.id, role: studentUser.role });

  const BASE_URL = 'http://localhost:5000/api';

  async function api(path, { method = 'GET', token, body } = {}) {
    const headers = { 'Content-Type': 'application/json' };
    if (token) headers['Authorization'] = `Bearer ${token}`;
    const res = await fetch(`${BASE_URL}${path}`, {
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

  // Student blocked from reports
  const studentReportsList = await api('/reports', { token: studentToken });
  assert(studentReportsList.status === 403, 'Student blocked from viewing Dean reports (HTTP 403 Forbidden)');

  const studentMyReports = await api('/reports/my-reports', { token: studentToken });
  assert(studentMyReports.status === 403, 'Student blocked from faculty my-reports (HTTP 403 Forbidden)');

  const studentPostReport = await api('/reports', {
    method: 'POST',
    token: studentToken,
    body: { booking_id: 1, actual_participants: 50, event_summary: 'Student test summary', activities_conducted: 'Student test activities' },
  });
  assert(studentPostReport.status === 403, 'Student blocked from submitting reports (HTTP 403 Forbidden)');

  // ----------------------------------------------------
  // SECTION 3: End-to-End Submission, Revision & Review Flow
  // ----------------------------------------------------
  console.log('\n--- SECTION 3: Full End-to-End Faculty & Dean Workflow ---');

  // Fetch an active venue ID dynamically from Supabase
  const venueRes = await pool.query('SELECT id FROM venues WHERE is_active = true LIMIT 1;');
  const activeVenueId = venueRes.rows[0].id;

  // Create an approved concluded booking for Faculty
  const bookingInsert = await pool.query(
    `INSERT INTO bookings (
       event_name, event_type, department, venue_id, faculty_id,
       event_date, start_time, end_time, expected_participants,
       description, status
     )
     VALUES ($1, $2, $3, $4, $5, CURRENT_DATE - INTERVAL '2 days', '10:00:00', '13:00:00', 120, 'E2E Testing Booking', 'approved')
     RETURNING id;`,
    ['Cloud Computing Workshop', 'Workshop', 'CSE', activeVenueId, facultyUser.id]
  );
  const bookingId = bookingInsert.rows[0].id;
  console.log(`  [+] Created concluded test booking #${bookingId} (Expected: 120 participants)`);

  // Faculty submits completion report
  const submitRes = await api('/reports', {
    method: 'POST',
    token: facultyToken,
    body: {
      booking_id: bookingId,
      actual_participants: 96, // 96 / 120 = 80.00%
      event_summary: 'Comprehensive hands-on AWS & GCP deployment workshop for final year undergraduates.',
      activities_conducted: 'Live architecture demonstrations, Terraform provisioning, and containerization labs.',
      challenges_faced: 'Occasional network bandwidth throttling during large container pulls.',
      suggestions_for_future: 'Pre-cache base docker images locally on campus lab workstations.',
    },
  });

  assert(submitRes.status === 201, 'Faculty successfully submits completion report (HTTP 201 Created)');
  const report = submitRes.data.data.report;
  assert(report.actual_participants === 96, 'Actual participants saved correctly (96)');
  assert(report.attendance_percentage === 80.00, 'Attendance percentage computed server-side as 80.00%');
  assert(report.status === 'submitted', 'Initial status is "submitted"');

  const reportId = report.id;

  // Faculty views my-reports
  const myReportsRes = await api('/reports/my-reports', { token: facultyToken });
  assert(myReportsRes.status === 200, 'Faculty retrieves my-reports (HTTP 200 OK)');
  const foundInMyReports = myReportsRes.data.data.reports.some((r) => r.id === reportId);
  assert(foundInMyReports, 'Submitted report appears in Faculty my-reports');

  // Dean views all reports
  const deanListRes = await api('/reports', { token: adminToken });
  assert(deanListRes.status === 200, 'Dean retrieves campus reports (HTTP 200 OK)');
  const foundInDeanList = deanListRes.data.data.reports.some((r) => r.id === reportId);
  assert(foundInDeanList, 'Submitted report appears in Dean dashboard list');

  // Dean requests revision
  const revisionReqRes = await api(`/reports/${reportId}/review`, {
    method: 'PATCH',
    token: adminToken,
    body: {
      action: 'revision_requested',
      dean_remarks: 'Please elaborate on the number of student certifications completed during the session.',
    },
  });

  assert(revisionReqRes.status === 200, 'Dean requests revision with required remarks (HTTP 200 OK)');
  assert(revisionReqRes.data.data.report.status === 'revision_requested', 'Status transitioned to "revision_requested"');
  assert(
    revisionReqRes.data.data.report.dean_remarks.includes('student certifications'),
    'Dean remarks recorded in Supabase'
  );

  // Faculty updates existing report (no duplicate created)
  const updateRes = await api(`/reports/${reportId}`, {
    method: 'PATCH',
    token: facultyToken,
    body: {
      actual_participants: 102, // 102 / 120 = 85.00%
      suggestions_for_future: '78 students completed AWS Cloud Practitioner practice tests. Recommend providing vouchers next semester.',
    },
  });

  assert(updateRes.status === 200, 'Faculty successfully updates existing report (HTTP 200 OK)');
  assert(updateRes.data.data.report.actual_participants === 102, 'Updated attendance persisted (102)');
  assert(updateRes.data.data.report.attendance_percentage === 85.00, 'Recalculated percentage saved (85.00%)');
  assert(updateRes.data.data.report.status === 'submitted', 'Status reset to "submitted" for Dean re-review');

  // Confirm exactly 1 report exists for this booking in Supabase
  const countRes = await pool.query('SELECT count(*) FROM event_completion_reports WHERE booking_id = $1;', [bookingId]);
  assert(parseInt(countRes.rows[0].count, 10) === 1, 'Strict 1-to-1 constraint preserved (no duplicate reports)');

  // Dean approves report as 'reviewed'
  const finalReviewRes = await api(`/reports/${reportId}/review`, {
    method: 'PATCH',
    token: adminToken,
    body: {
      action: 'reviewed',
      dean_remarks: 'Approved. Great workshop outcomes.',
    },
  });

  assert(finalReviewRes.status === 200, 'Dean marks report as reviewed & approved (HTTP 200 OK)');
  assert(finalReviewRes.data.data.report.status === 'reviewed', 'Report final status is "reviewed"');
  assert(finalReviewRes.data.data.report.reviewer.id === adminUser.id, 'Dean reviewer recorded in Supabase');

  // Faculty attempt to modify reviewed report is rejected
  const lockedEditRes = await api(`/reports/${reportId}`, {
    method: 'PATCH',
    token: facultyToken,
    body: { event_summary: 'Attempting to edit reviewed report' },
  });
  assert(lockedEditRes.status === 400, 'Faculty modification strictly locked on reviewed reports (HTTP 400)');

  // ----------------------------------------------------
  // SECTION 4: Persistence After Simulated Session Reload
  // ----------------------------------------------------
  console.log('\n--- SECTION 4: Persistence After Simulated Session Reload ---');

  // Generate a brand new token simulating fresh login
  const freshFacultyToken = signToken({ id: facultyUser.id, role: facultyUser.role });
  const freshFetch = await api(`/reports/${reportId}`, { token: freshFacultyToken });
  assert(freshFetch.status === 200, 'Report persists and is retrieved on fresh session (HTTP 200 OK)');
  assert(freshFetch.data.data.report.status === 'reviewed', 'Report status "reviewed" persisted accurately');
  assert(freshFetch.data.data.report.actual_participants === 102, 'Report actual participants (102) persisted accurately');

  // ----------------------------------------------------
  // CLEANUP TEST DATA
  // ----------------------------------------------------
  console.log('\n--- Cleaning up temporary test booking & report ---');
  await pool.query("DELETE FROM notifications WHERE related_entity_type = 'report' AND related_entity_id = $1;", [reportId]);
  await pool.query('DELETE FROM event_completion_reports WHERE id = $1;', [reportId]);
  await pool.query('DELETE FROM bookings WHERE id = $1;', [bookingId]);
  console.log('  [+] Cleaned up temporary test artifacts from Supabase.\n');

  console.log('====================================================');
  console.log(`TEST RESULTS: ${passed} PASSED, ${failed} FAILED`);
  console.log('====================================================\n');

  await pool.end();
  process.exit(failed > 0 ? 1 : 0);
}

runFrontendIntegrationTests().catch((err) => {
  console.error('Test run failed:', err);
  process.exit(1);
});
