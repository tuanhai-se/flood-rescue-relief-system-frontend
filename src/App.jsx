import React, { useEffect } from 'react';
import { BrowserRouter, Routes, Route, Navigate } from 'react-router-dom';
import useAuthStore from './store/authStore';
import { connectSocket } from './services/socket';

// Pages
import CitizenHome from './pages/CitizenHome';
import TrackRequest from './pages/TrackRequest';
import LoginPage from './pages/LoginPage';
import Dashboard from './pages/Dashboard';
import RequestsList from './pages/RequestsList';
import MissionsList from './pages/MissionsList';
import TeamsPage from './pages/TeamsPage';
import ResourcesPage from './pages/ResourcesPage';
import UsersPage from './pages/UsersPage';
import ConfigPage from './pages/ConfigPage';
import NotificationsPage from './pages/NotificationsPage';
import ReportPage from './pages/ReportPage';
// AuditLogsPage đã bỏ - không cần thiết theo đề bài

// Layout
import DashboardLayout from './components/common/DashboardLayout';

function ProtectedRoute({ children, roles }) {
  const { user, token } = useAuthStore();
  if (!token) return <Navigate to="/login" replace />;
  if (roles && !roles.includes(user?.role)) return <Navigate to="/dashboard" replace />;
  return children;
}

export default function App() {
  const { token } = useAuthStore();

  useEffect(() => {
    if (token) connectSocket(token);
  }, [token]);

  return (
    <BrowserRouter>
      <Routes>
        {/* Public */}
        <Route path="/" element={<CitizenHome />} />
        <Route path="/track" element={<TrackRequest />} />
        <Route path="/track/:code" element={<TrackRequest />} />
        <Route path="/login" element={token ? <Navigate to="/dashboard" replace /> : <LoginPage />} />

        {/* Protected dashboard */}
        <Route path="/dashboard" element={
          <ProtectedRoute><DashboardLayout /></ProtectedRoute>
        }>
          <Route index element={<Dashboard />} />
          <Route path="requests" element={
            <ProtectedRoute roles={['manager', 'coordinator']}>
              <RequestsList />
            </ProtectedRoute>
          } />
          <Route path="missions" element={
            <ProtectedRoute roles={['manager', 'coordinator', 'rescue_team']}>
              <MissionsList />
            </ProtectedRoute>
          } />
          <Route path="teams" element={
            <ProtectedRoute roles={['manager', 'coordinator']}>
              <TeamsPage />
            </ProtectedRoute>
          } />
          <Route path="resources" element={
            <ProtectedRoute roles={['manager', 'coordinator']}>
              <ResourcesPage />
            </ProtectedRoute>
          } />
          <Route path="users" element={
            <ProtectedRoute roles={['admin', 'manager']}>
              <UsersPage />
            </ProtectedRoute>
          } />
          <Route path="config" element={
            <ProtectedRoute roles={['admin']}>
              <ConfigPage />
            </ProtectedRoute>
          } />
          <Route path="reports" element={
            <ProtectedRoute roles={['admin', 'manager']}>
              <ReportPage />
            </ProtectedRoute>
          } />
          <Route path="notifications" element={<NotificationsPage />} />
        </Route>

        <Route path="*" element={<Navigate to="/" replace />} />
      </Routes>
    </BrowserRouter>
  );
}
