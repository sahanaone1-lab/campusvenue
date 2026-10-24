# CampusVenue Backend API

This is the backend service for **CampusVenue (College Venue Booking System)** built with Node.js, Express.js, and PostgreSQL.

---

## 1. Prerequisites

Before running the backend, ensure you have the following installed on your system (macOS):

- **Node.js**: v18.0.0 or higher (`node -v`)
- **npm**: v9.0.0 or higher (`npm -v`)
- **PostgreSQL**: PostgreSQL 14+ (`psql --version` or Homebrew `postgresql@18`)

---

## 2. PostgreSQL Database Setup (macOS)

If PostgreSQL is not yet installed or running on your Mac:

### A. Install PostgreSQL using Homebrew
```bash
brew install postgresql@18
```

### B. Start the PostgreSQL Service
```bash
brew services start postgresql@18
```
Or check service status:
```bash
brew services list
```
Verify PostgreSQL is accepting connections:
```bash
pg_isready
```

### C. Create the Database
Create the `campusvenue` database:
```bash
createdb campusvenue
```

---

## 3. Environment Configuration

1. In the `backend` folder, duplicate `.env.example` to create `.env`:
   ```bash
   cp .env.example .env
   ```

2. Open `.env` and fill in your local settings:
   ```env
   # Server Configuration
   PORT=5000
   NODE_ENV=development
   FRONTEND_URL=http://localhost:5173

   # PostgreSQL Database Configuration
   DB_HOST=localhost
   DB_PORT=5432
   DB_NAME=campusvenue
   DB_USER=your_macos_username
   DB_PASSWORD=your_postgres_password
   DB_POOL_MAX=10

   # JWT Authentication Configuration
   JWT_SECRET=your_super_secret_jwt_key_change_in_production
   JWT_EXPIRES_IN=24h
   ```

> **Note for macOS Homebrew users**: Often your local macOS username (e.g., `sahanas`) is the default superuser with no password required when connecting via localhost/socket. In this case, set `DB_USER=your_username` and leave `DB_PASSWORD=` empty.

---

## 4. Installation & Migrations

Navigate into the `backend` directory and install dependencies:

```bash
cd backend
npm install
```

### Run Database Migrations
Execute all unapplied schema migrations:
```bash
npm run migrate
```
The migration runner:
- Connects using the configured database pool.
- Ensures the `schema_migrations` tracking table exists.
- Runs pending `.sql` migration files within transactions.
- Is strictly **idempotent**: running `npm run migrate` repeatedly will safely skip already-applied migrations without modifying or duplicating schema objects.
- Never drops existing tables or deletes data.

---

## 5. Provisioning the Initial Administrator

Public registration allows creating accounts with the **`student`** or **`faculty`** role only. To maintain security, administrator accounts cannot be registered via public APIs and no hardcoded default accounts exist.

To securely create your first administrator account, run the CLI provisioning tool:

```bash
cd backend
node src/scripts/createAdmin.js \
  --name "System Administrator" \
  --email "admin@campusvenue.edu" \
  --password "YourSecureAdminPassword123!" \
  --department "Campus IT Administration" \
  --college_id "ADM001"
```

The script:
- Normalizes the email address.
- Validates the password length (minimum 8 characters).
- Hashes the password with `bcryptjs` (salt rounds: 10).
- Inserts the user with role `'admin'` and `is_active = true`.

---

## 6. Authentication & Authorization (Phase 3)

CampusVenue implements JWT-based stateless authentication paired with live database account verification and role-based access control.

### How Authentication & Role Checks Work:
1. **Password Hashing**: Plaintext passwords are never saved or returned. Passwords are encrypted using `bcryptjs` with 10 salt rounds.
2. **Token Generation**: Upon successful login, the server signs a JWT containing the user's `id` and `role`.
3. **Live Token Verification (`authenticate` middleware)**:
   - Reads the token from `Authorization: Bearer <token>`.
   - Verifies the cryptographic signature and checks that it has not expired.
   - Queries the database to confirm the user account **still exists** and **`is_active = true`**.
   - If the account has been deactivated or deleted, access is immediately revoked with HTTP 401.
   - Populates `req.user` with trusted account details.
4. **Role Authorization (`authorize(...allowedRoles)`)**:
   - Compares `req.user.role` against authorized roles (e.g., `student`, `faculty`, `admin`).
   - If unauthorized, rejects the request with HTTP 403 Forbidden.

---

## 7. Authentication Endpoints

### A. Register (`POST /api/auth/register`)
Publicly registers a `student` or `faculty` account. Admin registration is strictly blocked.

**Request:**
```bash
curl -X POST http://localhost:5000/api/auth/register \
  -H "Content-Type: application/json" \
  -d '{
    "name": "Jane Student",
    "email": "jane.student@college.edu",
    "password": "SecurePassword123!",
    "role": "student",
    "department": "Computer Science & Engineering",
    "college_id": "STU1024"
  }'
```

**Response (HTTP 201 Created):**
```json
{
  "status": "success",
  "message": "User registered successfully.",
  "data": {
    "user": {
      "id": 1,
      "name": "Jane Student",
      "email": "jane.student@college.edu",
      "role": "student",
      "department": "Computer Science & Engineering",
      "college_id": "STU1024",
      "is_active": true,
      "created_at": "2026-10-23T15:40:00.000Z"
    }
  }
}
```

---

### B. Login (`POST /api/auth/login`)
Authenticates an active user using email and password, returning a signed JWT token.

**Request:**
```bash
curl -X POST http://localhost:5000/api/auth/login \
  -H "Content-Type: application/json" \
  -d '{
    "email": "jane.student@college.edu",
    "password": "SecurePassword123!"
  }'
```

**Response (HTTP 200 OK):**
```json
{
  "status": "success",
  "message": "Login successful.",
  "data": {
    "token": "eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9...",
    "user": {
      "id": 1,
      "name": "Jane Student",
      "email": "jane.student@college.edu",
      "role": "student",
      "department": "Computer Science & Engineering",
      "college_id": "STU1024",
      "is_active": true,
      "created_at": "2026-10-23T15:40:00.000Z"
    }
  }
}
```

---

### C. Get Current User Profile (`GET /api/auth/me`)
Retrieves the safe authenticated profile of the current user. Requires a valid Bearer token.

**Request:**
```bash
curl -X GET http://localhost:5000/api/auth/me \
  -H "Authorization: Bearer <YOUR_JWT_TOKEN>"
```

---

## 8. Venue APIs & Availability (Phase 4)

All venue endpoints require authentication (`Bearer <token>`).

### A. List Venues (`GET /api/venues`)
- **Access**: Authenticated (`student`, `faculty`, `admin`).
- **Query Parameters**:
  - `search` (optional): Case-insensitive keyword matching `name`, `building`, or `location`.
  - `page` (optional, default: `1`): Page number.
  - `limit` (optional, default: `10`, max: `100`): Results per page.
  - `status` (optional, default: `'active'`): Filter by `'active'`, `'inactive'`, or `'all'`.

**Request:**
```bash
curl -X GET "http://localhost:5000/api/venues?search=Auditorium&page=1&limit=10" \
  -H "Authorization: Bearer <TOKEN>"
```

---

### B. Get Venue by ID (`GET /api/venues/:id`)
- **Access**: Authenticated (`student`, `faculty`, `admin`).
- Returns full details for a single venue. Returns 404 if not found.

---

### C. Check Venue Availability (`GET /api/venues/:id/availability?date=YYYY-MM-DD`)
- **Access**: Authenticated (`student`, `faculty`, `admin`).
- Displays whether the venue is available for scheduling on the requested date and lists approved/pending slots.
- **Sunday Handling**: Clearly reports `is_sunday: true` and `is_available: false` (Sunday bookings prohibited).
- **Inactive Venue Handling**: Clearly reports `is_available: false` and that the venue is unavailable for new bookings.
- **Privacy Protection**: Excludes faculty contact information, internal justification notes, and attendee headcounts.

---

### D. Create Venue (`POST /api/venues`)
- **Access**: Admin only (`admin`).
- Rejects non-positive capacity (`capacity <= 0`) and duplicate names (409 Conflict).

---

### E. Update Venue Details (`PATCH /api/venues/:id`)
- **Access**: Admin only (`admin`).
- Allows partial updates of `name`, `location`, `building`, `capacity`, `description`, `facilities`.

---

### F. Toggle Venue Active Status (`PATCH /api/venues/:id/status`)
- **Access**: Admin only (`admin`).
- Explicitly activates or deactivates a venue (`is_active: true | false`).
- Never deletes the venue or its historical bookings.

---

## 9. Booking Requests & Conflict Detection (Phase 5)

Phase 5 introduces faculty booking requests, capacity verification, Sunday restrictions, and collision detection against pending and approved reservations.

### Conflict Detection Policy & Concurrency Protection
CampusVenue implements a **two-tier collision prevention architecture**:

1. **Submission-Time Conflict Detection**:
   - When a faculty member submits a booking request, the server executes `check_booking_conflict(venue_id, date, start_time, end_time)`.
   - It checks against **both approved and pending bookings** using PostgreSQL half-open range overlap operator `&&` on `tsrange([start, end))`.
   - Adjacent intervals (e.g., 10:00–12:00 and 12:00–14:00) are permitted and do not collide.
   - If an overlapping booking or pending request exists, the submission is rejected immediately with **HTTP 409 Conflict**, returning the conflicting booking IDs and time slots.

2. **Database Engine Concurrency Guarantee**:
   - The conflict check alone is not treated as a concurrency guarantee against race conditions.
   - The PostgreSQL GiST exclusion constraint (`no_overlap_approved_bookings`) serializes and guarantees at the storage engine level that two overlapping approved bookings can **never** be committed simultaneously for the same venue.

---

### Booking Endpoints

#### A. Submit Booking Request (`POST /api/bookings`)
- **Access**: Faculty only (`faculty`).
- **Security**: The `faculty_id` is derived strictly from the authenticated JWT session (`req.user.id`). Client-supplied faculty IDs or statuses are discarded.
- **Validations**:
  - `event_name` (2–255 chars), `event_type` (2–100 chars), `department` (2–150 chars).
  - `venue_id` must point to an existing, active venue (HTTP 400 if inactive, HTTP 404 if missing).
  - `expected_participants` cannot exceed the venue's maximum capacity (HTTP 400).
  - `event_date` cannot be a Sunday (HTTP 400).
  - `end_time` must be strictly later than `start_time` (HTTP 400).
  - No overlapping pending or approved bookings on the same venue/date (HTTP 409).
  - Status defaults strictly to `'pending'`.

**Request:**
```bash
curl -X POST http://localhost:5000/api/bookings \
  -H "Authorization: Bearer <FACULTY_TOKEN>" \
  -H "Content-Type: application/json" \
  -d '{
    "event_name": "International AI & Machine Learning Symposium",
    "event_type": "National Conference",
    "department": "Department of Computer Science & Engineering",
    "venue_id": 1,
    "event_date": "2026-10-24",
    "start_time": "09:30:00",
    "end_time": "12:30:00",
    "expected_participants": 120,
    "description": "Annual technical symposium featuring keynote speakers and paper presentations.",
    "required_facilities": ["Projector", "Dolby Surround", "Stage Lighting"],
    "additional_requirements": "Guest parking passes and green room access."
  }'
```

**Response (HTTP 201 Created):**
```json
{
  "status": "success",
  "message": "Booking request submitted successfully. Status is pending administrative approval.",
  "data": {
    "booking": {
      "id": 14,
      "event_name": "International AI & Machine Learning Symposium",
      "event_type": "National Conference",
      "department": "Department of Computer Science & Engineering",
      "venue_id": 1,
      "faculty_id": 2,
      "event_date": "2026-10-24",
      "start_time": "09:30:00",
      "end_time": "12:30:00",
      "expected_participants": 120,
      "description": "Annual technical symposium featuring keynote speakers and paper presentations.",
      "required_facilities": ["Projector", "Dolby Surround", "Stage Lighting"],
      "additional_requirements": "Guest parking passes and green room access.",
      "status": "pending",
      "rejection_reason": null,
      "created_at": "2026-10-23T16:15:00.000Z",
      "updated_at": "2026-10-23T16:15:00.000Z",
      "venue": {
        "id": 1,
        "name": "Main Auditorium",
        "location": "Ground Floor, North Wing",
        "building": "Administrative Block A",
        "capacity": 500
      }
    }
  }
}
```

**Conflict Response (HTTP 409 Conflict):**
```json
{
  "status": "error",
  "message": "Booking conflict detected: The venue \"Main Auditorium\" already has an overlapping booking or pending request on 2026-10-24 between 11:00:00 and 13:00:00.",
  "statusCode": 409,
  "conflicts": [
    {
      "conflict_booking_id": 14,
      "event_name": "International AI & Machine Learning Symposium",
      "status": "pending",
      "start_time": "09:30:00",
      "end_time": "12:30:00"
    }
  ]
}
```

---

#### B. Faculty Booking Requests (`GET /api/bookings/my-requests`)
- **Access**: Faculty only (`faculty`).
- Returns the authenticated faculty member's own booking requests sorted newest first (`created_at DESC`).
- Includes nested venue details (`id`, `name`, `location`, `building`, `capacity`).
- Supports pagination (`page`, `limit`) and status filter (`?status=pending|approved|rejected|cancelled`).
- **Privacy**: Never exposes another faculty member's booking requests.

**Request:**
```bash
curl -X GET "http://localhost:5000/api/bookings/my-requests?page=1&limit=10" \
  -H "Authorization: Bearer <FACULTY_TOKEN>"
```

**Response (HTTP 200 OK):**
```json
{
  "status": "success",
  "data": {
    "bookings": [
      {
        "id": 14,
        "event_name": "International AI & Machine Learning Symposium",
        "event_type": "National Conference",
        "department": "Department of Computer Science & Engineering",
        "event_date": "2026-10-24",
        "start_time": "09:30:00",
        "end_time": "12:30:00",
        "expected_participants": 120,
        "description": "Annual technical symposium...",
        "required_facilities": ["Projector", "Dolby Surround", "Stage Lighting"],
        "additional_requirements": "Guest parking passes and green room access.",
        "status": "pending",
        "rejection_reason": null,
        "created_at": "2026-10-23T16:15:00.000Z",
        "updated_at": "2026-10-23T16:15:00.000Z",
        "venue": {
          "id": 1,
          "name": "Main Auditorium",
          "location": "Ground Floor, North Wing",
          "building": "Administrative Block A",
          "capacity": 500
        }
      }
    ],
    "pagination": {
      "total": 1,
      "page": 1,
      "limit": 10,
      "totalPages": 1
    }
  }
}
```

---

#### C. Get Booking Details (`GET /api/bookings/:id`)
- **Access**: Authenticated (`student`, `faculty`, `admin`).
- **Role-Based Privacy Filtering**:
  - **Admin**: Views full booking details including faculty contact details and administrative notes.
  - **Faculty**: May view full details of **their own** bookings only. Viewing another faculty member's booking returns **HTTP 403 Forbidden**.
  - **Student**: Views public schedule details only (`id`, `event_name`, `event_type`, `event_date`, `start_time`, `end_time`, `status`, `venue`). Private internal descriptions, additional requirements, faculty names, and rejection reasons are strictly suppressed.

**Request:**
```bash
curl -X GET http://localhost:5000/api/bookings/14 \
  -H "Authorization: Bearer <TOKEN>"
```

---

## 10. Phase 6: Admin Booking Review, Approval & Rejection

Campus administrators have dedicated review endpoints to manage booking requests submitted by faculty members across all departments.

### A. List All Bookings (`GET /api/bookings`)
- **Access**: Admin only (`role: 'admin'`). Non-admin attempts return **HTTP 403 Forbidden**.
- **Sorting**: Newest requests first by default (`created_at DESC`).
- **Query Parameters**:
  - `page` (default: 1)
  - `limit` (default: 10, max: 100)
  - `status` (`pending`, `approved`, `rejected`, `cancelled`)
  - `event_date` (`YYYY-MM-DD`)
  - `venue_id` (numeric ID)
  - `department` (partial search, case-insensitive)
- **Response**: Full booking details, including requesting faculty details (`id`, `name`, `email`, `department`) and venue specifications (`id`, `name`, `location`, `building`, `capacity`).

**Request Example:**
```bash
curl -X GET "http://localhost:5000/api/bookings?status=pending&department=Computer&page=1&limit=10" \
  -H "Authorization: Bearer <ADMIN_TOKEN>"
```

**Response Example (200 OK):**
```json
{
  "status": "success",
  "data": {
    "bookings": [
      {
        "id": 14,
        "event_name": "AI & Robotics Annual Symposium",
        "event_type": "Conference",
        "department": "Computer Science & Engineering",
        "event_date": "2026-11-04",
        "start_time": "09:00:00",
        "end_time": "12:00:00",
        "expected_participants": 120,
        "description": "Annual technical conference.",
        "required_facilities": ["Projector", "Sound System"],
        "status": "pending",
        "rejection_reason": null,
        "created_at": "2026-10-24T04:15:00.000Z",
        "faculty": {
          "id": 4,
          "name": "Dr. Alan Turing",
          "email": "turing@campusvenue.edu",
          "department": "Computer Science & Engineering",
          "college_id": "FAC-001"
        },
        "venue": {
          "id": 1,
          "name": "Main Auditorium",
          "location": "Auditorium Complex - Ground Floor",
          "building": "Main Block",
          "capacity": 250
        }
      }
    ],
    "pagination": {
      "total": 1,
      "page": 1,
      "limit": 10,
      "totalPages": 1
    }
  }
}
```

---

### B. Approve Booking Request (`PATCH /api/bookings/:id/approve`)
- **Access**: Admin only (`role: 'admin'`). Non-admin attempts return **HTTP 403 Forbidden**.
- **Status Guard**: Only requests in `pending` status may be approved. Non-pending requests return **HTTP 409 Conflict**.
- **Transaction Safety & Constraints**:
  - Executes inside a transactional block (`BEGIN ... COMMIT / ROLLBACK`) with row-level locking (`FOR UPDATE`).
  - Re-verifies active venue status, Sunday prohibition, time order, and participant capacity.
  - Calls `check_booking_conflict(venue_id, date, start, end, exclude_id)` to ensure no overlapping approved or pending bookings exist. If a conflict is found, returns **HTTP 409 Conflict** with conflict details and leaves the booking pending.
  - Protected by PostgreSQL GiST exclusion constraint (`no_overlap_approved_bookings`) against race conditions under concurrent approvals, cleanly catching SQL error code `23P01` as HTTP 409.
- **Audit & Notification**:
  - Appends an immutable audit log to `booking_approval_history` with `action: 'approved'`, `admin_id`, and optional `comments`.
  - Dispatches an in-app notification in `notifications` to the faculty member with `type: 'booking_approved'`.

**Request Example:**
```bash
curl -X PATCH http://localhost:5000/api/bookings/14/approve \
  -H "Authorization: Bearer <ADMIN_TOKEN>" \
  -H "Content-Type: application/json" \
  -d '{"comments": "Approved. AV team has been scheduled."}'
```

**Response Example (200 OK):**
```json
{
  "status": "success",
  "message": "Booking request approved successfully.",
  "data": {
    "booking": {
      "id": 14,
      "event_name": "AI & Robotics Annual Symposium",
      "status": "approved",
      "venue": {
        "id": 1,
        "name": "Main Auditorium",
        "location": "Auditorium Complex - Ground Floor",
        "building": "Main Block",
        "capacity": 250
      }
    }
  }
}
```

---

### C. Reject Booking Request (`PATCH /api/bookings/:id/reject`)
- **Access**: Admin only (`role: 'admin'`). Non-admin attempts return **HTTP 403 Forbidden**.
- **Payload Validation**: `rejection_reason` is mandatory (minimum 3 characters, max 1000 characters). Missing or blank reasons return **HTTP 400 Bad Request**.
- **Status Guard**: Only requests in `pending` status may be rejected. Already approved, rejected, or cancelled requests return **HTTP 409 Conflict**.
- **Transaction Safety**:
  - Updates `status = 'rejected'` and populates `rejection_reason` on the booking record.
  - Appends an audit entry to `booking_approval_history` with `action: 'rejected'`, `admin_id`, and `comments` containing the reason.
  - Dispatches an in-app notification in `notifications` to the requesting faculty member with `type: 'booking_rejected'`.
  - Never deletes or modifies other booking records.

**Request Example:**
```bash
curl -X PATCH http://localhost:5000/api/bookings/14/reject \
  -H "Authorization: Bearer <ADMIN_TOKEN>" \
  -H "Content-Type: application/json" \
  -d '{"rejection_reason": "Venue is reserved for an institutional governance meeting."}'
```

**Response Example (200 OK):**
```json
{
  "status": "success",
  "message": "Booking request rejected.",
  "data": {
    "booking": {
      "id": 14,
      "event_name": "AI & Robotics Annual Symposium",
      "status": "rejected",
      "rejection_reason": "Venue is reserved for an institutional governance meeting.",
      "venue": {
        "id": 1,
        "name": "Main Auditorium"
      }
    }
  }
}
```

---

## 11. Phase 7: Notification APIs

Notifications provide automated alerts to users upon administrative decisions (e.g., booking approvals, booking rejections) or system announcements. All notification endpoints strictly enforce user ownership based on the authenticated JWT subject (`req.user.id`).

### A. List User Notifications (`GET /api/notifications`)
- **Access**: All authenticated roles (`student`, `faculty`, `admin`).
- **Ownership**: Returns notifications belonging exclusively to the authenticated user (`recipient_user_id = req.user.id`). Never exposes another user's records.
- **Sorting**: Newest first (`created_at DESC, id DESC`).
- **Query Parameters**:
  - `page` (default: 1, positive integer)
  - `limit` (default: 10, max: 100)
  - `is_read` (`true` or `false`, optional filter)
- **Response**: Includes notification metadata, pagination, unread count, and related entity navigation identifiers (`related_entity_type: 'booking'`, `related_entity_id: <bookingId>`).

**Request Example:**
```bash
curl -X GET "http://localhost:5000/api/notifications?page=1&limit=10" \
  -H "Authorization: Bearer <TOKEN>"
```

**Response Example (200 OK):**
```json
{
  "status": "success",
  "data": {
    "notifications": [
      {
        "id": 28,
        "type": "booking_approved",
        "title": "Booking Request Approved",
        "message": "Your booking request for \"AI Symposium\" at \"Main Auditorium\" on 2026-11-04 (09:00:00 - 12:00:00) has been approved.",
        "related_entity_type": "booking",
        "related_entity_id": 14,
        "is_read": false,
        "created_at": "2026-10-24T04:20:00.000Z"
      }
    ],
    "unread_count": 1,
    "pagination": {
      "total": 1,
      "page": 1,
      "limit": 10,
      "totalPages": 1
    }
  }
}
```

---

### B. Get Unread Notification Count (`GET /api/notifications/unread-count`)
- **Access**: All authenticated roles (`student`, `faculty`, `admin`).
- **Ownership**: Calculates unread notifications for `req.user.id` using an efficient indexed count query.

**Request Example:**
```bash
curl -X GET http://localhost:5000/api/notifications/unread-count \
  -H "Authorization: Bearer <TOKEN>"
```

**Response Example (200 OK):**
```json
{
  "status": "success",
  "data": {
    "unread_count": 1
  }
}
```

---

### C. Mark Single Notification as Read (`PATCH /api/notifications/:id/read`)
- **Access**: All authenticated roles (`student`, `faculty`, `admin`).
- **Validation**: `:id` must be a positive integer.
- **Ownership & Privacy Guard**: Sets `is_read = true` only where `id = :id AND recipient_user_id = req.user.id`. If the notification does not exist or belongs to another user, returns **HTTP 404 Not Found** without leaking the existence of other users' records.

**Request Example:**
```bash
curl -X PATCH http://localhost:5000/api/notifications/28/read \
  -H "Authorization: Bearer <TOKEN>"
```

**Response Example (200 OK):**
```json
{
  "status": "success",
  "message": "Notification marked as read.",
  "data": {
    "notification": {
      "id": 28,
      "type": "booking_approved",
      "title": "Booking Request Approved",
      "message": "Your booking request for \"AI Symposium\" at \"Main Auditorium\" on 2026-11-04 (09:00:00 - 12:00:00) has been approved.",
      "related_entity_type": "booking",
      "related_entity_id": 14,
      "is_read": true,
      "created_at": "2026-10-24T04:20:00.000Z"
    }
  }
}
```

---

### D. Mark All Notifications as Read (`PATCH /api/notifications/read-all`)
- **Access**: All authenticated roles (`student`, `faculty`, `admin`).
- **Ownership**: Updates all unread notifications where `recipient_user_id = req.user.id` to `is_read = true`. Does not modify any other user's notifications.

**Request Example:**
```bash
curl -X PATCH http://localhost:5000/api/notifications/read-all \
  -H "Authorization: Bearer <TOKEN>"
```

**Response Example (200 OK):**
```json
{
  "status": "success",
  "message": "All notifications marked as read.",
  "data": {
    "updated_count": 3
  }
}
```

---

## 12. Starting the Server

### Development Mode (with hot-reload via nodemon)
```bash
cd backend
npm run dev
```

### Production Mode
```bash
cd backend
npm start
```

---

## 13. Project Structure

```
backend/
├── migrations/
│   └── 001_create_initial_schema.sql  # Core DDL: tables, indexes, constraints, triggers
├── src/
│   ├── config/
│   │   └── database.js               # PostgreSQL connection pool and health test
│   ├── controllers/
│   │   ├── auth.controller.js        # Controller handling /register, /login, /me
│   │   ├── booking.controller.js     # Controller handling booking requests, admin review, approvals & rejections
│   │   ├── health.controller.js      # Controller handling /api/health
│   │   ├── notification.controller.js# Controller handling notification listing, unread counts & read status
│   │   └── venue.controller.js       # Controller handling /api/venues CRUD & availability
│   ├── middleware/
│   │   ├── auth.middleware.js        # JWT verification and role authorization
│   │   ├── bookingValidator.js       # Validation for booking requests, approvals, rejections, and IDs
│   │   ├── errorHandler.js           # Centralized error handler
│   │   ├── notFoundHandler.js        # JSON 404 handler for undefined routes
│   │   ├── notificationValidator.js  # Validation for notification IDs and pagination queries
│   │   ├── validator.js              # Request body sanitization for auth
│   │   └── venueValidator.js         # Input validation for venue operations
│   ├── routes/
│   │   ├── auth.routes.js            # Authentication routes (/api/auth)
│   │   ├── booking.routes.js         # Booking routes (/api/bookings)
│   │   ├── health.routes.js          # Health route declarations (/api/health)
│   │   ├── notification.routes.js    # Notification routes (/api/notifications)
│   │   └── venue.routes.js           # Venue routes (/api/venues)
│   ├── scripts/
│   │   ├── createAdmin.js            # Secure administrator provisioning script
│   │   └── migrate.js                # Migration runner script (npm run migrate)
│   ├── services/
│   │   ├── auth.service.js           # Authentication database logic & hashing
│   │   ├── booking.service.js        # Booking logic, transactional approval/rejection, audit history, notifications
│   │   ├── notification.service.js   # Notification database logic, isolation, unread counters
│   │   └── venue.service.js          # Venue queries, updates, and availability logic
│   ├── utils/
│   │   └── jwt.js                    # JWT signing and verification utility
│   ├── app.js                        # Express application setup and middleware
│   └── server.js                     # Entry point and server lifecycle
├── .env.example                      # Example environment variables (committed)
├── .gitignore                        # Git ignore rules for backend
├── package.json                      # Backend dependencies and scripts
└── README.md                         # Documentation and API reference
```
