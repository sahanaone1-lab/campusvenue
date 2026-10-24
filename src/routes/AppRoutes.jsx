import React from 'react';
import { Routes, Route, Navigate } from 'react-router-dom';
import AppLayout from '../layouts/AppLayout';
import ProtectedRoute from '../components/ProtectedRoute';
import { ROLES } from '../utils/constants';

// Pages
import LandingPage from '../pages/LandingPage';
import LoginPage from '../pages/auth/LoginPage';
import StudentDashboard from '../pages/student/StudentDashboard';
import VenuesPage from '../pages/student/VenuesPage';
import VenueDetailsPage from '../pages/student/VenueDetailsPage';
import EventsPage from '../pages/student/EventsPage';
import AvailabilityPage from '../pages/student/AvailabilityPage';
import FacultyDashboard from '../pages/faculty/FacultyDashboard';
import RequestVenuePage from '../pages/faculty/RequestVenuePage';
import MyRequestsPage from '../pages/faculty/MyRequestsPage';
import AdminDashboard from '../pages/admin/AdminDashboard';
import AdminVenuesPage from '../pages/admin/AdminVenuesPage';
import AdminRequestsPage from '../pages/admin/AdminRequestsPage';
import AdminReportsPage from '../pages/admin/AdminReportsPage';
import CampusCalendarPage from '../pages/calendar/CampusCalendarPage';
import NotificationsPage from '../pages/notifications/NotificationsPage';
import NotFoundPage from '../pages/NotFoundPage';
import PlaceholderPage from '../pages/PlaceholderPage';

export const AppRoutes = () => {
  return (
    <Routes>
      {/* Public Pages */}
      <Route path="/" element={<LandingPage />} />
      <Route path="/login" element={<LoginPage />} />

      {/* Student Portal Routes */}
      <Route
        path="/student"
        element={
          <ProtectedRoute allowedRoles={[ROLES.STUDENT]}>
            <AppLayout />
          </ProtectedRoute>
        }
      >
        <Route index element={<Navigate to="/student/dashboard" replace />} />
        <Route path="dashboard" element={<StudentDashboard />} />
        <Route path="venues" element={<VenuesPage />} />
        <Route path="venues/:id" element={<VenueDetailsPage />} />
        <Route path="events" element={<EventsPage />} />
        <Route path="availability" element={<AvailabilityPage />} />
        <Route path="calendar" element={<CampusCalendarPage />} />
        <Route path="notifications" element={<NotificationsPage />} />
        <Route path="*" element={<Navigate to="/student/dashboard" replace />} />
      </Route>

      {/* Faculty Portal Routes */}
      <Route
        path="/faculty"
        element={
          <ProtectedRoute allowedRoles={[ROLES.FACULTY]}>
            <AppLayout />
          </ProtectedRoute>
        }
      >
        <Route index element={<Navigate to="/faculty/dashboard" replace />} />
        <Route path="dashboard" element={<FacultyDashboard />} />
        <Route path="request-venue" element={<RequestVenuePage />} />
        <Route path="my-requests" element={<MyRequestsPage />} />
        <Route path="calendar" element={<CampusCalendarPage />} />
        <Route path="notifications" element={<NotificationsPage />} />
        <Route path="*" element={<Navigate to="/faculty/dashboard" replace />} />
      </Route>

      {/* Admin Portal Routes */}
      <Route
        path="/admin"
        element={
          <ProtectedRoute allowedRoles={[ROLES.ADMIN]}>
            <AppLayout />
          </ProtectedRoute>
        }
      >
        <Route index element={<Navigate to="/admin/dashboard" replace />} />
        <Route path="dashboard" element={<AdminDashboard />} />
        <Route path="venues" element={<AdminVenuesPage />} />
        <Route path="requests" element={<AdminRequestsPage />} />
        <Route path="calendar" element={<CampusCalendarPage />} />
        <Route path="notifications" element={<NotificationsPage />} />
        <Route
          path="events"
          element={
            <PlaceholderPage
              title="Event Management"
              subtitle="Publish official events to the student portal and campus digital boards"
              breadcrumbItems={[
                { title: 'Admin', path: '/admin/dashboard' },
                { title: 'Events' },
              ]}
            />
          }
        />
        <Route
          path="users"
          element={
            <PlaceholderPage
              title="User Directory"
              subtitle="Manage student, faculty, and administrative permissions"
              breadcrumbItems={[
                { title: 'Admin', path: '/admin/dashboard' },
                { title: 'Users' },
              ]}
            />
          }
        />
        <Route path="reports" element={<AdminReportsPage />} />
        <Route path="*" element={<Navigate to="/admin/dashboard" replace />} />
      </Route>

      {/* 404 Fallback */}
      <Route path="*" element={<NotFoundPage />} />
    </Routes>
  );
};

export default AppRoutes;
