import React, { useState, useEffect } from 'react';
import { AuthContext } from './authContext';
import { authService } from './authService';
import apiClient from './apiClient';

export const AuthProvider = ({ children }) => {
  const [user, setUser] = useState(() => authService.getCurrentUser());
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    // Validate session with backend GET /api/auth/me on initial load
    const initAuth = async () => {
      const token = apiClient.getToken();
      if (token) {
        try {
          const freshUser = await authService.getMe();
          setUser(freshUser);
        } catch {
          setUser(null);
        }
      } else {
        setUser(null);
      }
      setLoading(false);
    };

    initAuth();

    const handleAuthExpired = () => {
      setUser(null);
    };

    if (typeof window !== 'undefined') {
      window.addEventListener('campus_auth_expired', handleAuthExpired);
    }

    return () => {
      if (typeof window !== 'undefined') {
        window.removeEventListener('campus_auth_expired', handleAuthExpired);
      }
    };
  }, []);

  const login = async (credentials) => {
    const loggedInUser = await authService.login(credentials);
    setUser(loggedInUser);
    return loggedInUser;
  };

  const register = async (userData) => {
    const registeredUser = await authService.register(userData);
    return registeredUser;
  };

  const logout = () => {
    authService.logout();
    setUser(null);
  };

  const value = {
    user,
    isAuthenticated: !!user,
    role: user?.role ? user.role.toLowerCase() : null,
    login,
    register,
    logout,
    loading,
  };

  return <AuthContext.Provider value={value}>{children}</AuthContext.Provider>;
};

export default AuthProvider;
