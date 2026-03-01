import React, { useEffect } from 'react';
import { BrowserRouter, Routes, Route, Navigate } from 'react-router-dom';
import useAuthStore from './store/authStore';
import { connectSocket } from './services/socket';

// Pages
import CitizenHome from './pages/CitizenHome';
import TrackRequest from './pages/TrackRequest';
import LoginPage from './pages/LoginPage';
import RequestsList from './pages/RequestsList';
import MissionsList from './pages/MissionsList';

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
        <Route path="/login" element={token ? <Navigate to="/dashboard/requests" replace /> : <LoginPage />} />

        {/* Protected dashboard */}
        <Route path="/dashboard" element={
          <ProtectedRoute><DashboardLayout /></ProtectedRoute>
        }>
          <Route index element={<Navigate to="/dashboard/requests" replace />} />
          <Route path="requests" element={
            <ProtectedRoute roles={['manager','coordinator']}>
              <RequestsList />
            </ProtectedRoute>
          } />
          <Route path="missions" element={
            <ProtectedRoute roles={['manager','coordinator','rescue_team']}>
              <MissionsList />
            </ProtectedRoute>
          } />
          {/* Notifications might be needed as it's common */}
          <Route path="notifications" element={<div className="p-6">Trang thông báo (Đang phát triển)</div>} />
        </Route>

        <Route path="*" element={<Navigate to="/" replace />} />
      </Routes>
    </BrowserRouter>
  );
}
