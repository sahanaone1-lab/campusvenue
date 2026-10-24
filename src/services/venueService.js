import apiClient from './apiClient';

export const BUILDINGS_LIST = [
  'Administrative Block A',
  'Science Block B',
  'Computing Science Center',
  'Sports & Recreation Complex',
  'Academic Block C',
  'Central Library Building',
  'South Campus Commons',
  'Mechanical Engineering Wing',
  'Research & Innovation Hub',
  'Student Activity Center',
];

export const STANDARD_FACILITIES = [
  'Projector',
  'AC',
  'Sound System',
  'Microphone',
  'Wi-Fi',
  'Smart Board',
  'Stage',
  'Podium',
  'Dual 4K Laser Projectors',
  'Dolby 7.1 Surround Sound',
  'Central Air Conditioning',
  'Stage Lighting & Spotlights',
  'High-Speed Wi-Fi 6',
  'Interactive Digital Smartboard',
  'High-Performance Workstations (GPU)',
  'Wheelchair Accessible',
  'Video Conferencing Unit (Polycom/Zoom)',
  'Locker & Green Room Access',
];

let cachedVenues = [];

const dispatchVenuesUpdated = () => {
  if (typeof window !== 'undefined') {
    window.dispatchEvent(new CustomEvent('campus_venues_updated', { detail: cachedVenues }));
  }
};

const normalizeVenue = (v) => {
  if (!v) return null;
  const isActive = Boolean(v.is_active);
  return {
    id: v.id,
    name: v.name,
    location: v.location,
    building: v.building || 'Campus Facility',
    capacity: Number(v.capacity) || 0,
    description: v.description || '',
    facilities: Array.isArray(v.facilities) ? v.facilities : [],
    is_active: isActive,
    status: isActive ? 'Active' : 'Inactive',
    currentStatus: isActive ? 'Available' : 'Inactive',
    created_at: v.created_at,
    updated_at: v.updated_at,
  };
};

export const venueService = {
  /**
   * Fetch all venues from backend API GET /api/venues.
   * Supports query filtering by search, building, status, page, and limit.
   */
  fetchVenues: async (params = {}) => {
    try {
      const response = await apiClient.get('/venues', { params });
      const rawList = response.data?.venues || response.data || [];
      const normalized = rawList.map(normalizeVenue);
      cachedVenues = normalized;
      dispatchVenuesUpdated();
      return normalized;
    } catch (err) {
      // If error occurs, do not overwrite with empty array if cached data exists
      if (cachedVenues.length === 0) {
        cachedVenues = [];
      }
      throw err;
    }
  },

  /**
   * Synchronously return currently cached venues.
   * If cache is empty, kicks off a background fetch.
   */
  getVenues: () => {
    if (cachedVenues.length === 0 && apiClient.getToken()) {
      venueService.fetchVenues().catch(() => {});
    }
    return cachedVenues;
  },

  /**
   * Return only active venues from cache.
   */
  getActiveVenues: () => {
    const list = venueService.getVenues();
    return list.filter((v) => v.is_active);
  },

  /**
   * Fetch a single venue profile by ID from GET /api/venues/:id.
   */
  getVenueById: async (id) => {
    if (!id) return null;
    const response = await apiClient.get(`/venues/${id}`);
    const venue = response.data?.venue || response.data;
    const normalized = normalizeVenue(venue);
    // Update or append in local cache
    const idx = cachedVenues.findIndex((v) => String(v.id) === String(id));
    if (idx >= 0) {
      cachedVenues[idx] = normalized;
    } else if (normalized) {
      cachedVenues.push(normalized);
    }
    return normalized;
  },

  /**
   * Fetch real-time venue availability and slot reservations for a specific date
   * GET /api/venues/:id/availability?date=YYYY-MM-DD.
   */
  checkAvailability: async (venueId, date) => {
    const response = await apiClient.get(`/venues/${venueId}/availability`, {
      params: { date },
    });
    return response.data;
  },

  /**
   * Admin only: Create a new campus venue profile via POST /api/venues.
   */
  createVenue: async (venueData) => {
    const payload = {
      name: venueData.name?.trim(),
      location: venueData.location?.trim(),
      building: venueData.building?.trim(),
      capacity: parseInt(venueData.capacity, 10),
      description: venueData.description?.trim() || null,
      facilities: Array.isArray(venueData.facilities) ? venueData.facilities : [],
    };

    const response = await apiClient.post('/venues', payload);
    const created = normalizeVenue(response.data?.venue || response.data);
    await venueService.fetchVenues();
    return created;
  },

  /**
   * Admin only: Update an existing campus venue profile via PATCH /api/venues/:id.
   */
  updateVenue: async (id, venueData) => {
    const payload = {};
    if (venueData.name !== undefined) payload.name = venueData.name.trim();
    if (venueData.location !== undefined) payload.location = venueData.location.trim();
    if (venueData.building !== undefined) payload.building = venueData.building.trim();
    if (venueData.capacity !== undefined) payload.capacity = parseInt(venueData.capacity, 10);
    if (venueData.description !== undefined) payload.description = venueData.description ? venueData.description.trim() : null;
    if (venueData.facilities !== undefined) payload.facilities = Array.isArray(venueData.facilities) ? venueData.facilities : [];

    const response = await apiClient.patch(`/venues/${id}`, payload);
    const updated = normalizeVenue(response.data?.venue || response.data);
    await venueService.fetchVenues();
    return updated;
  },

  /**
   * Admin only: Toggle a venue's operational active/inactive status via PATCH /api/venues/:id/status.
   */
  toggleVenueStatus: async (id, targetStatus) => {
    let nextIsActive;
    if (typeof targetStatus === 'boolean') {
      nextIsActive = targetStatus;
    } else if (typeof targetStatus === 'string') {
      nextIsActive = targetStatus.toLowerCase() === 'active';
    } else {
      const current = cachedVenues.find((v) => String(v.id) === String(id));
      nextIsActive = current ? !current.is_active : false;
    }

    const response = await apiClient.patch(`/venues/${id}/status`, {
      is_active: nextIsActive,
    });
    const updated = normalizeVenue(response.data?.venue || response.data);
    await venueService.fetchVenues();
    return updated;
  },

  deactivateVenue: async (id) => venueService.toggleVenueStatus(id, false),
  activateVenue: async (id) => venueService.toggleVenueStatus(id, true),

  /**
   * Subscribe to venue updates across the application.
   */
  subscribe: (callback) => {
    if (typeof window === 'undefined') return () => {};
    const handler = (e) => callback(e.detail || cachedVenues);
    window.addEventListener('campus_venues_updated', handler);
    return () => window.removeEventListener('campus_venues_updated', handler);
  },
};

export default venueService;
