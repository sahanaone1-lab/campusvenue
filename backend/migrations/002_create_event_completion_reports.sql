-- ====================================================================
-- Migration: 002_create_event_completion_reports.sql
-- Description: Sets up the schema for Faculty Event Completion Reports
--   - Non-destructive additive migration
--   - Enforces 1-to-1 relationship with bookings (UNIQUE booking_id)
--   - Tracks faculty submitter, actual attendance, and calculated %
--   - Supports Dean review workflow ('submitted', 'reviewed', 'revision_requested')
--   - Reuses existing update_timestamp_column() trigger function without redefining it
--   - Preserves referential integrity with ON DELETE RESTRICT
-- ====================================================================

CREATE TABLE IF NOT EXISTS event_completion_reports (
  id                     SERIAL PRIMARY KEY,
  booking_id             INTEGER NOT NULL REFERENCES bookings(id) ON DELETE RESTRICT ON UPDATE CASCADE,
  faculty_id             INTEGER NOT NULL REFERENCES users(id) ON DELETE RESTRICT ON UPDATE CASCADE,
  actual_participants    INTEGER NOT NULL CHECK (actual_participants >= 0),
  attendance_percentage  NUMERIC(5, 2) NOT NULL DEFAULT 0.00 CHECK (attendance_percentage >= 0),
  event_summary          TEXT NOT NULL,
  activities_conducted   TEXT NOT NULL,
  challenges_faced       TEXT,
  suggestions_for_future TEXT,
  status                 VARCHAR(30) NOT NULL DEFAULT 'submitted' 
                         CHECK (status IN ('submitted', 'reviewed', 'revision_requested')),
  reviewer_id            INTEGER REFERENCES users(id) ON DELETE RESTRICT ON UPDATE CASCADE,
  reviewed_at            TIMESTAMPTZ,
  dean_remarks           TEXT,
  created_at             TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  updated_at             TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  CONSTRAINT uq_event_completion_reports_booking UNIQUE (booking_id)
);

-- Trigger to automatically update updated_at using existing update_timestamp_column()
DROP TRIGGER IF EXISTS trg_event_completion_reports_updated_at ON event_completion_reports;
CREATE TRIGGER trg_event_completion_reports_updated_at
BEFORE UPDATE ON event_completion_reports
FOR EACH ROW
EXECUTE FUNCTION update_timestamp_column();

-- Indexes for optimal lookup and query performance
-- Note: booking_id is indexed automatically by uq_event_completion_reports_booking
CREATE INDEX IF NOT EXISTS idx_reports_faculty_id ON event_completion_reports (faculty_id);
CREATE INDEX IF NOT EXISTS idx_reports_status ON event_completion_reports (status);
CREATE INDEX IF NOT EXISTS idx_reports_created_at ON event_completion_reports (created_at DESC);
CREATE INDEX IF NOT EXISTS idx_reports_reviewer_id ON event_completion_reports (reviewer_id);
