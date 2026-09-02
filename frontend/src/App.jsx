import React from 'react';
import { BrowserRouter, Routes, Route, Navigate } from 'react-router-dom';
import { AuthProvider, useAuth } from './context/AuthContext';
import LoginPage from './pages/LoginPage';
import ClientDashboard from './pages/ClientDashboard';
import AgentDashboard from './pages/AgentDashboard';
import TicketDetail from './pages/TicketDetail';
import NewTicket from './pages/NewTicket';
import Layout from './components/Layout';

function ProtectedRoute({ children, role }) {
  const { user, loading } = useAuth();
  if (loading) return <div className="loading">Loading…</div>;
  if (!user) return <Navigate to="/login" replace />;
  if (role && user.role !== role) {
    return <Navigate to={user.role === 'agent' ? '/agent' : '/client'} replace />;
  }
  return children;
}

function AppRoutes() {
  const { user } = useAuth();
  return (
    <Routes>
      <Route path="/login" element={user ? <Navigate to={user.role === 'agent' ? '/agent' : '/client'} /> : <LoginPage />} />
      <Route path="/client" element={<ProtectedRoute role="client"><Layout><ClientDashboard /></Layout></ProtectedRoute>} />
      <Route path="/client/new" element={<ProtectedRoute role="client"><Layout><NewTicket /></Layout></ProtectedRoute>} />
      <Route path="/client/tickets/:id" element={<ProtectedRoute role="client"><Layout><TicketDetail /></Layout></ProtectedRoute>} />
      <Route path="/agent" element={<ProtectedRoute role="agent"><Layout><AgentDashboard /></Layout></ProtectedRoute>} />
      <Route path="/agent/tickets/:id" element={<ProtectedRoute role="agent"><Layout><TicketDetail /></Layout></ProtectedRoute>} />
      <Route path="*" element={<Navigate to="/login" replace />} />
    </Routes>
  );
}

export default function App() {
  return (
    <AuthProvider>
      <BrowserRouter>
        <AppRoutes />
      </BrowserRouter>
    </AuthProvider>
  );
}
