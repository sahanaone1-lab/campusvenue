import { ROLE_HOME_ROUTES } from '../utils/constants';
import apiClient, { USER_KEY, TOKEN_KEY } from './apiClient';

export const authService = {
  /**
   * Retrieve currently authenticated user from localStorage.
   * Returns normalized user object { id, userId, name, email, role, department, ... } or null.
   */
  getCurrentUser: () => {
    try {
      if (typeof localStorage === 'undefined') return null;
      const data = localStorage.getItem(USER_KEY);
      if (!data) return null;
      const parsed = JSON.parse(data);
      if (parsed && parsed.email && parsed.role && (parsed.id || parsed.userId)) {
        return {
          ...parsed,
          id: parsed.id || parsed.userId,
          userId: parsed.id || parsed.userId,
          role: String(parsed.role).toLowerCase(),
        };
      }
      return null;
    } catch {
      return null;
    }
  },

  /**
   * Authenticate user credentials against POST /api/auth/login.
   * Stores signed JWT token and user profile in localStorage.
   * Derives role strictly from the backend response.
   */
  login: async ({ identifier, email, password }) => {
    const cleanEmail = (email || identifier || '').trim();

    if (!cleanEmail) {
      throw new Error('Please enter your College Email address.');
    }
    if (!password) {
      throw new Error('Please enter your password.');
    }

    const response = await apiClient.post('/auth/login', {
      email: cleanEmail,
      password,
    });

    const { user, token } = response.data;

    // Normalize user session
    const userSession = {
      id: user.id,
      userId: user.id,
      name: user.name,
      email: user.email,
      role: String(user.role).toLowerCase(),
      collegeId: user.college_id || '',
      college_id: user.college_id || '',
      department: user.department || '',
      isActive: user.is_active,
      loginTime: new Date().toISOString(),
    };

    apiClient.setToken(token);
    localStorage.setItem(USER_KEY, JSON.stringify(userSession));

    return userSession;
  },

  /**
   * Register a new user account via POST /api/auth/register.
   * Public registration is restricted to 'student' and 'faculty'.
   */
  register: async ({ name, email, password, role, department, college_id, collegeId }) => {
    const cleanRole = String(role || '').trim().toLowerCase();

    if (cleanRole === 'admin') {
      throw new Error('Administrator accounts cannot be registered publicly.');
    }
    if (!['student', 'faculty'].includes(cleanRole)) {
      throw new Error('Please select a valid role (Student or Faculty).');
    }

    const response = await apiClient.post('/auth/register', {
      name: (name || '').trim(),
      email: (email || '').trim().toLowerCase(),
      password,
      role: cleanRole,
      department: department ? department.trim() : null,
      college_id: (college_id || collegeId) ? String(college_id || collegeId).trim() : null,
    });

    return response.data?.user;
  },

  /**
   * Verify authenticated session via GET /api/auth/me.
   * Updates local profile with current database state.
   */
  getMe: async () => {
    const token = apiClient.getToken();
    if (!token) return null;

    try {
      const response = await apiClient.get('/auth/me');
      const user = response.data?.user;
      if (!user) return null;

      const userSession = {
        id: user.id,
        userId: user.id,
        name: user.name,
        email: user.email,
        role: String(user.role).toLowerCase(),
        collegeId: user.college_id || '',
        college_id: user.college_id || '',
        department: user.department || '',
        isActive: user.is_active,
        loginTime: new Date().toISOString(),
      };

      localStorage.setItem(USER_KEY, JSON.stringify(userSession));
      return userSession;
    } catch {
      apiClient.clearAuth();
      return null;
    }
  },

  /**
   * Clear session data from localStorage.
   */
  logout: () => {
    apiClient.clearAuth();
  },

  /**
   * Return assigned home route for a given user role.
   */
  getDefaultRouteForRole: (role) => {
    const clean = String(role || '').toLowerCase();
    return ROLE_HOME_ROUTES[clean] || '/login';
  },
};

export default authService;
