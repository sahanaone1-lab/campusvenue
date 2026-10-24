-- ====================================================================
-- Migration: 001_create_initial_schema.sql
-- Description: Sets up the core schema for CampusVenue:
--   - PostgreSQL btree_gist extension (for GiST exclusion constraints)
--   - Shared helper functions (auto-timestamp, conflict checking)
--   - users table
--   - venues table
--   - bookings table (with Sunday constraint & GiST exclusion for overlapping approved bookings)
--   - booking_approval_history table
--   - notifications table
--   - Indexes and foreign keys with RESTRICT rules to preserve history
-- ====================================================================

-- 1. Enable btree_gist extension for exclusion constraint support
CREATE EXTENSION IF NOT EXISTS btree_gist;

-- 2. Shared function to automatically update `updated_at` timestamps
CREATE OR REPLACE FUNCTION update_timestamp_column()
RETURNS TRIGGER AS $$
BEGIN
  NEW.updated_at = clock_timestamp();
  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

-- ====================================================================
-- Table: users
-- Roles: student, faculty, admin
-- ====================================================================
CREATE TABLE IF NOT EXISTS users (
  id SERIAL PRIMARY KEY,
  name VARCHAR(100) NOT NULL,
  email VARCHAR(255) NOT NULL,
  password_hash VARCHAR(255) NOT NULL,
  role VARCHAR(20) NOT NULL CHECK (role IN ('student', 'faculty', 'admin')),
  department VARCHAR(150),
  college_id VARCHAR(50),
  is_active BOOLEAN NOT NULL DEFAULT true,
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  CONSTRAINT uq_users_email UNIQUE (email),
  CONSTRAINT uq_users_college_id UNIQUE (college_id)
);

DROP TRIGGER IF EXISTS trg_users_updated_at ON users;
CREATE TRIGGER trg_users_updated_at
BEFORE UPDATE ON users
FOR EACH ROW
EXECUTE FUNCTION update_timestamp_column();

-- ====================================================================
-- Table: venues
-- Only active venues can receive new booking requests
-- ====================================================================
CREATE TABLE IF NOT EXISTS venues (
  id SERIAL PRIMARY KEY,
  name VARCHAR(150) NOT NULL,
  location VARCHAR(255) NOT NULL,
  building VARCHAR(150) NOT NULL,
  capacity INTEGER NOT NULL CHECK (capacity > 0),
  description TEXT,
  facilities JSONB NOT NULL DEFAULT '[]'::jsonb,
  is_active BOOLEAN NOT NULL DEFAULT true,
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  CONSTRAINT uq_venues_name UNIQUE (name)
);

DROP TRIGGER IF EXISTS trg_venues_updated_at ON venues;
CREATE TRIGGER trg_venues_updated_at
BEFORE UPDATE ON venues
FOR EACH ROW
EXECUTE FUNCTION update_timestamp_column();

-- ====================================================================
-- Table: bookings
-- Rules:
--   - Sunday bookings are forbidden: CHECK (EXTRACT(DOW FROM event_date) != 0)
--   - end_time must be later than start_time: CHECK (end_time > start_time)
--   - expected_participants >= 0: CHECK (expected_participants >= 0)
--   - Exclusion constraint prevents overlapping approved bookings
--   - ON DELETE RESTRICT on venue_id and faculty_id to preserve history
-- ====================================================================
CREATE TABLE IF NOT EXISTS bookings (
  id SERIAL PRIMARY KEY,
  event_name VARCHAR(255) NOT NULL,
  event_type VARCHAR(100) NOT NULL,
  department VARCHAR(150) NOT NULL,
  venue_id INTEGER NOT NULL REFERENCES venues(id) ON DELETE RESTRICT ON UPDATE CASCADE,
  faculty_id INTEGER NOT NULL REFERENCES users(id) ON DELETE RESTRICT ON UPDATE CASCADE,
  event_date DATE NOT NULL,
  start_time TIME NOT NULL,
  end_time TIME NOT NULL,
  expected_participants INTEGER NOT NULL CHECK (expected_participants >= 0),
  description TEXT,
  required_facilities JSONB NOT NULL DEFAULT '[]'::jsonb,
  additional_requirements TEXT,
  status VARCHAR(20) NOT NULL DEFAULT 'pending' CHECK (status IN ('pending', 'approved', 'rejected', 'cancelled')),
  rejection_reason TEXT,
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  CONSTRAINT check_booking_time_order CHECK (end_time > start_time),
  CONSTRAINT check_no_sunday_booking CHECK (EXTRACT(DOW FROM event_date) != 0),
  CONSTRAINT no_overlap_approved_bookings EXCLUDE USING gist (
    venue_id WITH =,
    tsrange((event_date + start_time), (event_date + end_time), '[)') WITH &&
  ) WHERE (status = 'approved')
);

DROP TRIGGER IF EXISTS trg_bookings_updated_at ON bookings;
CREATE TRIGGER trg_bookings_updated_at
BEFORE UPDATE ON bookings
FOR EACH ROW
EXECUTE FUNCTION update_timestamp_column();

-- Trigger to prevent creating or moving a booking to an inactive venue
CREATE OR REPLACE FUNCTION enforce_active_venue_booking()
RETURNS TRIGGER AS $$
DECLARE
  v_is_active BOOLEAN;
BEGIN
  SELECT is_active INTO v_is_active FROM venues WHERE id = NEW.venue_id;
  IF v_is_active IS NULL THEN
    RAISE EXCEPTION 'Referenced venue (id: %) does not exist', NEW.venue_id
      USING ERRCODE = 'foreign_key_violation';
  ELSIF v_is_active IS FALSE THEN
    RAISE EXCEPTION 'Cannot create or modify booking for inactive venue (venue_id: %)', NEW.venue_id
      USING ERRCODE = 'check_violation';
  END IF;
  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

DROP TRIGGER IF EXISTS trg_check_active_venue_before_booking ON bookings;
CREATE TRIGGER trg_check_active_venue_before_booking
BEFORE INSERT OR UPDATE OF venue_id ON bookings
FOR EACH ROW
EXECUTE FUNCTION enforce_active_venue_booking();

-- ====================================================================
-- Table: booking_approval_history
-- Records each administrative approval or rejection action
-- ====================================================================
CREATE TABLE IF NOT EXISTS booking_approval_history (
  id SERIAL PRIMARY KEY,
  booking_id INTEGER NOT NULL REFERENCES bookings(id) ON DELETE RESTRICT ON UPDATE CASCADE,
  admin_id INTEGER NOT NULL REFERENCES users(id) ON DELETE RESTRICT ON UPDATE CASCADE,
  action VARCHAR(20) NOT NULL CHECK (action IN ('approved', 'rejected')),
  comments TEXT,
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

-- ====================================================================
-- Table: notifications
-- Targeted user notifications with entity correlation
-- ====================================================================
CREATE TABLE IF NOT EXISTS notifications (
  id SERIAL PRIMARY KEY,
  recipient_user_id INTEGER NOT NULL REFERENCES users(id) ON DELETE CASCADE ON UPDATE CASCADE,
  type VARCHAR(50) NOT NULL,
  title VARCHAR(255) NOT NULL,
  message TEXT NOT NULL,
  related_entity_type VARCHAR(50),
  related_entity_id INTEGER,
  is_read BOOLEAN NOT NULL DEFAULT false,
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

-- ====================================================================
-- Indexes for performance and query optimization
-- ====================================================================
-- User indexes
CREATE UNIQUE INDEX IF NOT EXISTS idx_users_email_lower ON users (LOWER(email));
CREATE INDEX IF NOT EXISTS idx_users_role ON users (role);
CREATE INDEX IF NOT EXISTS idx_users_is_active ON users (is_active);

-- Venue indexes
CREATE INDEX IF NOT EXISTS idx_venues_is_active ON venues (is_active);
CREATE INDEX IF NOT EXISTS idx_venues_building ON venues (building);

-- Booking indexes
CREATE INDEX IF NOT EXISTS idx_bookings_venue_event_date ON bookings (venue_id, event_date);
CREATE INDEX IF NOT EXISTS idx_bookings_faculty_created_at ON bookings (faculty_id, created_at);
CREATE INDEX IF NOT EXISTS idx_bookings_status ON bookings (status);
CREATE INDEX IF NOT EXISTS idx_bookings_event_date ON bookings (event_date);

-- Approval history indexes
CREATE INDEX IF NOT EXISTS idx_approval_history_booking ON booking_approval_history (booking_id);
CREATE INDEX IF NOT EXISTS idx_approval_history_admin ON booking_approval_history (admin_id);

-- Notification indexes
CREATE INDEX IF NOT EXISTS idx_notifications_recipient_read ON notifications (recipient_user_id, is_read);
CREATE INDEX IF NOT EXISTS idx_notifications_recipient_created ON notifications (recipient_user_id, created_at DESC);

-- ====================================================================
-- Helper Function: Conflict Detection for Pending and Approved Bookings
-- Used by application services to check for time conflicts
-- ====================================================================
CREATE OR REPLACE FUNCTION check_booking_conflict(
  p_venue_id INT,
  p_event_date DATE,
  p_start_time TIME,
  p_end_time TIME,
  p_exclude_booking_id INT DEFAULT NULL
)
RETURNS TABLE (
  conflict_id INT,
  conflict_event_name VARCHAR,
  conflict_status VARCHAR,
  conflict_start TIME,
  conflict_end TIME
) AS $$
BEGIN
  RETURN QUERY
  SELECT b.id, b.event_name, b.status, b.start_time, b.end_time
  FROM bookings b
  WHERE b.venue_id = p_venue_id
    AND b.event_date = p_event_date
    AND (p_exclude_booking_id IS NULL OR b.id != p_exclude_booking_id)
    AND b.status IN ('approved', 'pending')
    AND tsrange((b.event_date + b.start_time), (b.event_date + b.end_time), '[)') &&
        tsrange((p_event_date + p_start_time), (p_event_date + p_end_time), '[)');
END;
$$ LANGUAGE plpgsql;
