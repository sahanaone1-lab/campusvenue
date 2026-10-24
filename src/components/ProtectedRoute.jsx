import React from 'react';
import { Navigate, useLocation } from 'react-router-dom';
import { Spin } from 'antd';
import { useAuth } from '../services/useAuth';
import { ROLE_HOME_ROUTES } from '../utils/constants';

/**
 * ProtectedRoute component for Role-Based Access Control (RBAC).
 * - Waits for initial session verification.
 * - Redirects unauthenticated visitors to /login.
 * - Redirects authenticated users attempting to access unauthorized roles back to their assigned dashboard.
 */
export const ProtectedRoute = ({ children, allowedRoles }) => {
  const { user, isAuthenticated, loading } = useAuth();
  const location = useLocation();

  if (loading) {
    return (
      <div style={{ display: 'flex', justifyContent: 'center', alignItems: 'center', height: '100vh' }}>
        <Spin size="large" />
      </div>
    );
  }

  if (!isAuthenticated || !user) {
    return <Navigate to="/login" state={{ from: location }} replace />;
  }

  if (allowedRoles && !allowedRoles.includes(user.role)) {
    // If role does not match, redirect user to their authorized dashboard
    const fallbackPath = ROLE_HOME_ROUTES[user.role] || '/login';
    return <Navigate to={fallbackPath} replace />;
  }

  return children;
};

export default ProtectedRoute;
