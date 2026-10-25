import dayjs from 'dayjs';
import { facultyVenueService } from './facultyVenueService.js';
import { venueService } from './venueService.js';

/**
 * Calendar Service
 * Centralized aggregator for real campus bookings from Supabase PostgreSQL.
 */

// Clean up any stale demo sample bookings previously stored in localStorage
if (typeof localStorage !== 'undefined') {
  try {
    localStorage.removeItem('college_faculty_requests');
  } catch {
    // Ignore storage errors
  }
}

export const CALENDAR_STATUS = {
  AVAILABLE: 'Available',
  PENDING: 'Pending',
  BOOKED: 'Booked',
};

export const STATUS_COLORS = {
  [CALENDAR_STATUS.AVAILABLE]: {
    color: '#52c41a',
    bg: '#f6ffed',
    border: '#b7eb8f',
    text: '#237804',
    badge: 'success',
  },
  [CALENDAR_STATUS.PENDING]: {
    color: '#faad14',
    bg: '#fffbe6',
    border: '#ffe58f',
    text: '#ad6800',
    badge: 'warning',
  },
  [CALENDAR_STATUS.BOOKED]: {
    color: '#ff4d4f',
    bg: '#fff1f0',
    border: '#ffa39e',
    text: '#cf1322',
    badge: 'error',
  },
};

export const calendarService = {
  /**
   * Retrieve all real campus bookings and pending requests directly from facultyVenueService.
   * Standardizes fields:
   * {
   *   id, event, venue, venueId, faculty, department, date, time, startTime, endTime,
   *   participants, status ('Available' | 'Pending' | 'Booked'), isApproved, source, description
   * }
   */
  getAllBookings: () => {
    const unified = [];
    const seenMap = new Map(); // Key: venueId + date + startTime

    const normalizeTime = (t) => (t || '').trim().toUpperCase();

    // Ingest Real Bookings from facultyVenueService (backed by Supabase PostgreSQL)
    const requests = facultyVenueService.getRequests();
    requests.forEach((req) => {
      if (req.status === 'Approved' || req.status === 'Pending') {
        const status = req.status === 'Approved' ? CALENDAR_STATUS.BOOKED : CALENDAR_STATUS.PENDING;
        const key = `${String(req.venueId || req.venue || '').toLowerCase()}__${req.date}__${normalizeTime(req.startTime)}`;

        const item = {
          id: req.id,
          event: req.eventName || req.eventTitle,
          venue: req.venue,
          venueId: req.venueId || null,
          faculty: req.facultyName || 'Faculty Member',
          department: req.department || 'Academic Department',
          date: req.date,
          time: req.timeSlot || `${req.startTime} - ${req.endTime}`,
          startTime: req.startTime,
          endTime: req.endTime,
          participants: Number(req.expectedParticipants) || 50,
          status: status,
          isApproved: req.status === 'Approved',
          source: 'faculty_request',
          description: req.description || '',
          requiredFacilities: req.requiredFacilities || [],
          reviewedBy: req.reviewedBy,
          approvedOn: req.approvedOn,
          submittedOn: req.submittedOn,
        };

        unified.push(item);
        seenMap.set(key, item);
      }
    });

    // Requirement: Exclude all Sunday bookings
    return unified.filter((b) => dayjs(b.date).day() !== 0);
  },

  /**
   * Get bookings filtered by criteria
   */
  getFilteredBookings: ({
    bookings = null,
    venue = 'ALL',
    department = 'ALL',
    date = null,
    status = 'ALL',
    role = null,
    facultyUser = null,
    viewMyOnly = false,
  }) => {
    let list = bookings ? [...bookings] : calendarService.getAllBookings();

    // 1. Role / Faculty filtering:
    // "FACULTY: View their own approved bookings"
    if (role === 'faculty' && viewMyOnly && facultyUser) {
      const fName = (facultyUser.name || '').toLowerCase();
      const fDept = (facultyUser.department || '').toLowerCase();
      list = list.filter((b) => {
        const nameMatches = b.faculty && b.faculty.toLowerCase().includes(fName);
        const deptMatches = b.department && b.department.toLowerCase().includes(fDept);
        return (nameMatches || deptMatches) && b.isApproved;
      });
    }

    // 2. Venue filter
    if (venue && venue !== 'ALL') {
      list = list.filter(
        (b) =>
          b.venueId === venue ||
          b.venue.toLowerCase().includes(String(venue).toLowerCase())
      );
    }

    // 3. Department filter
    if (department && department !== 'ALL') {
      list = list.filter(
        (b) =>
          b.department &&
          b.department.toLowerCase() === department.toLowerCase()
      );
    }

    // 4. Date filter
    if (date) {
      const dateStr = dayjs(date).format('YYYY-MM-DD');
      list = list.filter((b) => b.date === dateStr);
    }

    // 5. Status filter
    if (status && status !== 'ALL') {
      list = list.filter((b) => b.status === status);
    }

    return list;
  },

  /**
   * Compute availability for a specific venue on a given date.
   * Returns list of available time windows or full day available slot.
   */
  getVenueAvailabilityForDate: (venueId, dateStr) => {
    // Requirement 1 & 7: Venues are NEVER available on Sundays
    if (dayjs(dateStr).day() === 0) {
      return [];
    }

    const venues = venueService.getVenues();
    const venue = venues.find(
      (v) => v.id === venueId || v.name.toLowerCase() === String(venueId).toLowerCase()
    );

    if (!venue) return [];

    // If venue is Inactive or Maintenance, it is not available
    if (venue.status === 'Inactive' || venue.status === 'Maintenance') {
      return [];
    }

    // Gather all bookings and pending requests for this venue on dateStr
    const allBookings = calendarService.getAllBookings();
    const dateBookings = allBookings.filter(
      (b) =>
        (b.venueId === venue.id || b.venue.toLowerCase() === venue.name.toLowerCase()) &&
        b.date === dateStr
    );

    // If no bookings or requests, the entire operating day (08:00 AM - 08:00 PM) is Available!
    if (dateBookings.length === 0) {
      return [
        {
          id: `AVAIL-${venue.id}-${dateStr}`,
          event: `Open for Booking (${venue.name})`,
          venue: venue.name,
          venueId: venue.id,
          faculty: 'Open Reservation',
          department: 'All Academic Departments',
          date: dateStr,
          time: '08:00 AM - 08:00 PM',
          startTime: '08:00 AM',
          endTime: '08:00 PM',
          participants: venue.capacity,
          status: CALENDAR_STATUS.AVAILABLE,
          isApproved: false,
          source: 'availability_matrix',
          description: `${venue.name} is completely vacant and available for faculty reservation on ${dateStr}.`,
        },
      ];
    }

    // If there are bookings, compute remaining free slots
    // For simplicity and clarity, if less than 8 hours booked, show partial availability
    const bookedEventsCount = dateBookings.filter((b) => b.status === CALENDAR_STATUS.BOOKED).length;
    if (bookedEventsCount < 2) {
      return [
        {
          id: `AVAIL-${venue.id}-${dateStr}-partial`,
          event: `Available Time Windows (${venue.name})`,
          venue: venue.name,
          venueId: venue.id,
          faculty: 'Open Reservation',
          department: 'All Academic Departments',
          date: dateStr,
          time: 'Morning / Evening Slots Available',
          startTime: '08:00 AM',
          endTime: '08:00 PM',
          participants: venue.capacity,
          status: CALENDAR_STATUS.AVAILABLE,
          isApproved: false,
          source: 'availability_matrix',
          description: `${venue.name} has vacant morning or evening slots available outside reserved hours.`,
        },
      ];
    }

    return [];
  },

  /**
   * Get all active venues across campus
   */
  getVenuesList: () => {
    return venueService.getVenues();
  },

  /**
   * Subscribe to updates across both requests and venues
   */
  subscribe: (callback) => {
    if (typeof window === 'undefined') return () => {};
    const handler = () => {
      callback(calendarService.getAllBookings());
    };
    window.addEventListener('campus_requests_updated', handler);
    window.addEventListener('faculty_requests_updated', handler);
    window.addEventListener('campus_venues_updated', handler);
    return () => {
      window.removeEventListener('campus_requests_updated', handler);
      window.removeEventListener('faculty_requests_updated', handler);
      window.removeEventListener('campus_venues_updated', handler);
    };
  },
};

export default calendarService;
