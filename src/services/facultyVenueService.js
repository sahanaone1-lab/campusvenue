import dayjs from 'dayjs';
import apiClient from './apiClient';
import { venueService } from './venueService';
import { authService } from './authService';
import { notificationService } from './notificationService';

// Master list of campus venues (dynamic from venueService)
export const getFacultyVenues = () => {
  return venueService.getActiveVenues();
};

export const getAllFacultyVenues = () => {
  return venueService.getVenues();
};

export const FACULTY_VENUES = [];

// Predefined event types
export const EVENT_TYPES = [
  'Workshop',
  'Seminar',
  'Guest Lecture',
  'National Conference',
  'Technical Hackathon',
  'Department Meeting',
  'Project Exhibition / Defense',
  'Cultural / Club Event',
  'Examination / Assessment',
  'Alumni Interaction',
];

// Predefined academic departments
export const DEPARTMENTS = [
  'Department of Computer Science & Engineering',
  'Department of Electrical & Electronics Engineering',
  'Department of Mechanical Engineering',
  'Department of Biotechnology & Life Sciences',
  'Department of Physics & Mathematics',
  'Department of Humanities & Social Sciences',
  'Department of Management Studies',
  'Dean of Research & Development',
  'Placement & Industry Relations Cell',
  'Student Affairs & Welfare Board',
];

// Standard campus facility options
export const FACILITY_OPTIONS = [
  'Dual 4K Laser Projectors & Screens',
  'Dolby Surround Sound & Stage Acoustics',
  'Wireless Handheld & Collar Mics',
  'Central Air Conditioning',
  'High-Speed Wi-Fi 6 & Gigabit LAN',
  'Interactive Digital Smartboard',
  'High-Performance Workstations (GPU)',
  'Video Conferencing Unit (Polycom/Zoom)',
  'Podium & Teleprompter Setup',
  'Stage Spotlights & DMX Lighting',
  'Dedicated UPS Power Backup',
  'Locker & Green Room Access',
];

/**
 * Convert various time formats (Dayjs, "09:00 AM", "14:30", "09:00:00") to minutes from midnight
 */
export const parseTimeToMinutes = (timeInput) => {
  if (!timeInput) return null;

  if (dayjs.isDayjs(timeInput)) {
    return timeInput.hour() * 60 + timeInput.minute();
  }

  if (typeof timeInput === 'string') {
    const trimmed = timeInput.trim().toUpperCase();

    // 12-hour format e.g. "09:00 AM", "9:00 AM", "04:30 PM"
    const match12 = trimmed.match(/^(\d{1,2}):(\d{2})(?::\d{2})?\s*(AM|PM)$/);
    if (match12) {
      let hour = parseInt(match12[1], 10);
      const minute = parseInt(match12[2], 10);
      const ampm = match12[3];
      if (ampm === 'PM' && hour < 12) hour += 12;
      if (ampm === 'AM' && hour === 12) hour = 0;
      return hour * 60 + minute;
    }

    // 24-hour format e.g. "09:00", "14:30", "14:30:00"
    const match24 = trimmed.match(/^(\d{1,2}):(\d{2})(?::\d{2})?$/);
    if (match24) {
      const hour = parseInt(match24[1], 10);
      const minute = parseInt(match24[2], 10);
      return hour * 60 + minute;
    }
  }

  return null;
};

/**
 * Format minutes from midnight to "hh:mm A" (e.g., 570 -> "09:30 AM")
 */
export const formatMinutesToTime = (minutes) => {
  if (minutes === null || minutes === undefined) return '';
  const hour24 = Math.floor(minutes / 60);
  const min = minutes % 60;
  const ampm = hour24 >= 12 ? 'PM' : 'AM';
  const hour12 = hour24 % 12 === 0 ? 12 : hour24 % 12;
  const pad = (n) => String(n).padStart(2, '0');
  return `${pad(hour12)}:${pad(min)} ${ampm}`;
};

/**
 * Converts any time input to standard display format "hh:mm A"
 */
export const formatTimeToDisplay = (timeInput) => {
  if (!timeInput) return '';
  if (dayjs.isDayjs(timeInput)) {
    return timeInput.format('hh:mm A');
  }
  const min = parseTimeToMinutes(timeInput);
  if (min !== null) {
    return formatMinutesToTime(min);
  }
  return String(timeInput);
};

/**
 * Converts any time input to backend format "HH:mm:ss"
 */
export const formatTimeToBackend = (timeInput) => {
  if (!timeInput) return '09:00:00';
  if (dayjs.isDayjs(timeInput)) {
    return timeInput.format('HH:mm:ss');
  }
  const min = parseTimeToMinutes(timeInput);
  if (min !== null) {
    const h = Math.floor(min / 60);
    const m = min % 60;
    const pad = (n) => String(n).padStart(2, '0');
    return `${pad(h)}:${pad(m)}:00`;
  }
  return String(timeInput);
};

/**
 * Normalize backend booking record into unified frontend data contract
 */
export const normalizeBooking = (b) => {
  if (!b) return null;

  const formattedStart = formatTimeToDisplay(b.start_time);
  const formattedEnd = formatTimeToDisplay(b.end_time);

  const statusCapitalized = b.status
    ? b.status.charAt(0).toUpperCase() + b.status.slice(1).toLowerCase()
    : 'Pending';

  const venueName =
    typeof b.venue === 'object' && b.venue?.name
      ? b.venue.name
      : b.venue_name || b.venue || 'Campus Venue';

  const venueId =
    typeof b.venue === 'object' && b.venue?.id
      ? b.venue.id
      : b.venue_id || null;

  const facultyName =
    typeof b.faculty === 'object' && b.faculty?.name
      ? b.faculty.name
      : b.faculty_name || 'Faculty Member';

  const formattedDate = b.event_date
    ? (typeof b.event_date === 'string' ? b.event_date.split('T')[0] : dayjs(b.event_date).format('YYYY-MM-DD'))
    : '';

  const submittedDate = b.created_at
    ? (typeof b.created_at === 'string' ? b.created_at.split('T')[0] : dayjs(b.created_at).format('YYYY-MM-DD'))
    : '';

  return {
    id: b.id,
    displayId: `REQ-${b.id}`,
    eventName: b.event_name,
    eventTitle: b.event_name,
    eventType: b.event_type || 'Academic Event',
    department: b.department,
    facultyName,
    requestedBy: facultyName,
    venue: venueName,
    venueId,
    venueDetails: typeof b.venue === 'object' ? b.venue : null,
    date: formattedDate,
    event_date: formattedDate,
    startTime: formattedStart,
    endTime: formattedEnd,
    start_time: b.start_time,
    end_time: b.end_time,
    timeSlot: `${formattedStart} - ${formattedEnd}`,
    expectedParticipants: Number(b.expected_participants) || 0,
    description: b.description || '',
    requiredFacilities: Array.isArray(b.required_facilities) ? b.required_facilities : [],
    additionalRequirements: b.additional_requirements || '',
    status: statusCapitalized,
    rawStatus: b.status,
    submittedOn: submittedDate,
    rejectionReason: b.rejection_reason || '',
    remark: b.rejection_reason || (statusCapitalized === 'Approved' ? 'Approved by Administration' : ''),
    createdAt: b.created_at,
    updatedAt: b.updated_at,
  };
};

let cachedRequests = [];

const dispatchRequestsUpdated = () => {
  if (typeof window !== 'undefined') {
    window.dispatchEvent(new CustomEvent('campus_requests_updated', { detail: cachedRequests }));
  }
};

export const facultyVenueService = {
  /**
   * Fetch booking requests submitted by the authenticated faculty member.
   * GET /api/bookings/my-requests
   */
  fetchFacultyRequests: async (params = {}) => {
    try {
      const response = await apiClient.get('/bookings/my-requests', { params });
      const rawList = response.data?.bookings || response.data || [];
      const normalized = rawList.map(normalizeBooking);
      cachedRequests = normalized;
      dispatchRequestsUpdated();
      return normalized;
    } catch (err) {
      if (cachedRequests.length === 0) {
        cachedRequests = [];
      }
      throw err;
    }
  },

  /**
   * Fetch all booking requests across all faculty members (Admin only).
   * GET /api/bookings
   */
  fetchAdminRequests: async (params = {}) => {
    try {
      const response = await apiClient.get('/bookings', { params });
      const rawList = response.data?.bookings || response.data || [];
      const normalized = rawList.map(normalizeBooking);
      cachedRequests = normalized;
      dispatchRequestsUpdated();
      return normalized;
    } catch (err) {
      if (cachedRequests.length === 0) {
        cachedRequests = [];
      }
      throw err;
    }
  },

  /**
   * Automatically fetch requests appropriate for current user role
   */
  fetchRequests: async (params = {}) => {
    const currentUser = authService.getCurrentUser();
    if (currentUser?.role === 'admin') {
      return facultyVenueService.fetchAdminRequests(params);
    }
    if (currentUser?.role === 'faculty') {
      return facultyVenueService.fetchFacultyRequests(params);
    }
    return [];
  },

  /**
   * Return currently cached requests. Kicks off fetch if cache is empty.
   */
  getRequests: () => {
    if (cachedRequests.length === 0 && apiClient.getToken()) {
      facultyVenueService.fetchRequests().catch(() => {});
    }
    return cachedRequests;
  },

  /**
   * Fetch single booking details by ID.
   * GET /api/bookings/:id
   */
  getBookingById: async (id) => {
    if (!id) return null;
    const cleanId = String(id).replace(/^REQ-/, '');
    const response = await apiClient.get(`/bookings/${cleanId}`);
    const booking = response.data?.booking || response.data;
    const normalized = normalizeBooking(booking);

    // Update in cachedRequests
    const idx = cachedRequests.findIndex((r) => String(r.id) === String(cleanId));
    if (idx >= 0) {
      cachedRequests[idx] = normalized;
    } else if (normalized) {
      cachedRequests.unshift(normalized);
    }
    dispatchRequestsUpdated();
    return normalized;
  },

  /**
   * Submit a new venue reservation request (Faculty only).
   * POST /api/bookings
   */
  createRequest: async (requestData) => {
    // Sunday restriction
    if (dayjs(requestData.date).day() === 0) {
      throw new Error('Venue booking is not available on Sundays. Please select another date.');
    }

    // Resolve venue ID
    let venueId = requestData.venueId;
    if (!venueId && requestData.venue) {
      const allVenues = venueService.getVenues();
      const matched = allVenues.find(
        (v) => String(v.id) === String(requestData.venue) ||
               v.name.toLowerCase() === String(requestData.venue).toLowerCase()
      );
      if (matched) venueId = matched.id;
      else if (!isNaN(parseInt(requestData.venue, 10))) {
        venueId = parseInt(requestData.venue, 10);
      }
    }

    const payload = {
      event_name: (requestData.eventName || requestData.eventTitle || '').trim(),
      event_type: (requestData.eventType || 'Academic Event').trim(),
      department: (requestData.department || '').trim(),
      venue_id: parseInt(venueId, 10),
      event_date: requestData.date,
      start_time: formatTimeToBackend(requestData.startTime),
      end_time: formatTimeToBackend(requestData.endTime),
      expected_participants: Number(requestData.expectedParticipants) || 1,
      description: (requestData.description || requestData.eventDescription || '').trim() || null,
      required_facilities: Array.isArray(requestData.requiredFacilities) ? requestData.requiredFacilities : [],
      additional_requirements: (requestData.additionalRequirements || '').trim() || null,
    };

    const response = await apiClient.post('/bookings', payload);
    const created = normalizeBooking(response.data?.booking || response.data);

    // Refresh requests in background
    await facultyVenueService.fetchFacultyRequests().catch(() => {});
    return created;
  },

  /**
   * Approve a pending booking request (Admin only).
   * PATCH /api/bookings/:id/approve
   */
  approveRequest: async (id, comments = '') => {
    const cleanId = String(id).replace(/^REQ-/, '');
    const payload = { comments: typeof comments === 'string' ? comments.trim() : null };
    const response = await apiClient.patch(`/bookings/${cleanId}/approve`, payload);
    const updated = normalizeBooking(response.data?.booking || response.data);

    // Refresh admin requests
    await facultyVenueService.fetchAdminRequests().catch(() => {});
    return updated;
  },

  /**
   * Reject a pending booking request (Admin only).
   * PATCH /api/bookings/:id/reject
   */
  rejectRequest: async (id, reason) => {
    if (!reason || !reason.trim() || reason.trim().length < 3) {
      throw new Error('A rejection reason with at least 3 characters is required.');
    }
    const cleanId = String(id).replace(/^REQ-/, '');
    const payload = { rejection_reason: reason.trim() };
    const response = await apiClient.patch(`/bookings/${cleanId}/reject`, payload);
    const updated = normalizeBooking(response.data?.booking || response.data);

    // Refresh admin requests
    await facultyVenueService.fetchAdminRequests().catch(() => {});
    return updated;
  },

  /**
   * Check venue availability and identify potential clashes.
   */
  checkAvailability: async ({ venue, venueId, date, startTime, endTime }) => {
    if (!date || !startTime || !endTime) {
      return {
        hasConflict: false,
        conflictDetails: null,
        message: 'Incomplete parameters for availability check.',
      };
    }

    // Sunday restriction
    if (dayjs(date).day() === 0) {
      return {
        hasConflict: true,
        isSunday: true,
        conflictDetails: {
          existingEvent: 'Sunday Closure',
          existingDate: date,
          existingTime: 'All Day',
          venueName: venue || 'Campus Venue',
          reason: 'Venue booking is not available on Sundays. Please select another date.',
        },
        message: 'Venue booking is not available on Sundays. Please select another date.',
      };
    }

    const reqStartMin = parseTimeToMinutes(startTime);
    const reqEndMin = parseTimeToMinutes(endTime);

    if (reqStartMin === null || reqEndMin === null || reqEndMin <= reqStartMin) {
      return {
        hasConflict: true,
        isInvalidRange: true,
        conflictDetails: null,
        message: 'End time must be later than start time.',
      };
    }

    // Resolve venue
    let targetVenueId = venueId;
    let targetVenueName = venue;
    const allVenues = venueService.getVenues();
    const matchedVenue = allVenues.find(
      (v) => String(v.id) === String(venueId || venue) ||
             v.name.toLowerCase() === String(venue).toLowerCase()
    );

    if (matchedVenue) {
      targetVenueId = matchedVenue.id;
      targetVenueName = matchedVenue.name;
    }

    // Check inactive
    if (matchedVenue && !matchedVenue.is_active) {
      return {
        hasConflict: true,
        isDeactivated: true,
        conflictDetails: {
          existingEvent: 'Facility Deactivated by Administration',
          existingDate: date,
          existingTime: 'All Day',
          venueName: targetVenueName,
          reason: 'This venue has been deactivated and is unavailable for booking.',
        },
        message: 'Venue Unavailable',
      };
    }

    // Query backend real-time availability if venue ID is available
    if (targetVenueId) {
      try {
        const avail = await venueService.checkAvailability(targetVenueId, date);
        if (avail) {
          if (avail.is_sunday) {
            return {
              hasConflict: true,
              isSunday: true,
              message: 'Campus venues are closed on Sundays.',
            };
          }
          if (avail.is_available === false && !avail.bookings?.length) {
            return {
              hasConflict: true,
              message: avail.message || 'Venue Unavailable',
            };
          }

          // Check bookings for time overlap
          const bookings = avail.bookings || [];
          for (const b of bookings) {
            const bStartMin = parseTimeToMinutes(b.start_time);
            const bEndMin = parseTimeToMinutes(b.end_time);
            if (bStartMin !== null && bEndMin !== null) {
              if (reqStartMin < bEndMin && reqEndMin > bStartMin) {
                return {
                  hasConflict: true,
                  conflictDetails: {
                    existingEvent: b.event_name,
                    existingDate: date,
                    existingTime: `${formatTimeToDisplay(b.start_time)} - ${formatTimeToDisplay(b.end_time)}`,
                    venueName: targetVenueName,
                    status: b.status,
                  },
                  message: 'Venue Unavailable',
                };
              }
            }
          }
        }
      } catch (err) {
        // Backend check fallback
      }
    }

    return {
      hasConflict: false,
      conflictDetails: null,
      message: 'Venue is available.',
    };
  },

  /**
   * Final clash check prior to admin approval.
   */
  checkAvailabilityForApproval: ({ venue, date, startTime, endTime, excludeRequestId }) => {
    if (!venue || !date || !startTime || !endTime) {
      return {
        hasConflict: false,
        conflictDetails: null,
        message: 'Incomplete parameters for clash check.',
      };
    }

    if (dayjs(date).day() === 0) {
      return {
        hasConflict: true,
        isSunday: true,
        conflictDetails: {
          existingEvent: 'Sunday Closure',
          existingDate: date,
          existingTime: 'All Day',
          venueName: venue,
          reason: 'Bookings are not allowed on Sundays.',
        },
        message: 'Bookings are not allowed on Sundays.',
      };
    }

    const reqStartMin = parseTimeToMinutes(startTime);
    const reqEndMin = parseTimeToMinutes(endTime);

    if (reqStartMin === null || reqEndMin === null || reqEndMin <= reqStartMin) {
      return {
        hasConflict: true,
        message: 'Invalid time range.',
      };
    }

    // Check against cached approved bookings
    for (const b of cachedRequests) {
      if (String(b.id) === String(excludeRequestId)) continue;
      if (b.status !== 'Approved') continue;
      if (b.date !== date) continue;

      const sameVenue =
        b.venue.toLowerCase() === String(venue).toLowerCase() ||
        String(b.venueId) === String(venue);

      if (!sameVenue) continue;

      const exStartMin = parseTimeToMinutes(b.startTime || b.start_time);
      const exEndMin = parseTimeToMinutes(b.endTime || b.end_time);

      if (exStartMin !== null && exEndMin !== null) {
        if (reqStartMin < exEndMin && reqEndMin > exStartMin) {
          return {
            hasConflict: true,
            conflictDetails: {
              existingEvent: b.eventName || b.eventTitle,
              existingDate: b.date,
              existingTime: b.timeSlot,
              venueName: b.venue,
              department: b.department,
            },
            message: 'Cannot approve this request because the venue is no longer available for the selected time.',
          };
        }
      }
    }

    return {
      hasConflict: false,
      conflictDetails: null,
      message: 'Venue is available for approval.',
    };
  },

  /**
   * Cancel request (local update)
   */
  cancelRequest: (id) => {
    const cleanId = String(id).replace(/^REQ-/, '');
    cachedRequests = cachedRequests.map((r) => {
      if (String(r.id) === String(cleanId)) {
        return { ...r, status: 'Cancelled' };
      }
      return r;
    });
    dispatchRequestsUpdated();
    return true;
  },

  /**
   * Subscribe to request updates
   */
  subscribe: (callback) => {
    if (typeof window === 'undefined') return () => {};
    const handler = (e) => callback(e.detail || cachedRequests);
    window.addEventListener('campus_requests_updated', handler);
    return () => window.removeEventListener('campus_requests_updated', handler);
  },
};

export default facultyVenueService;
