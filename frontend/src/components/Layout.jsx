import React from 'react';
import { useNavigate, useLocation } from 'react-router-dom';
import { useAuth } from '../context/AuthContext';

const CLIENT_NAV = [
  { label: 'My Tickets',  path: '/client',     icon: '🎫' },
  { label: 'New Ticket',  path: '/client/new', icon: '✏️' },
];
const AGENT_NAV = [
  { label: 'Dashboard',   path: '/agent',      icon: '📊' },
];

function getInitials(name = '') {
  return name.split(' ').map((w) => w[0]).join('').toUpperCase().slice(0, 2);
}

export default function Layout({ children }) {
  const { user, logout } = useAuth();
  const navigate = useNavigate();
  const location = useLocation();
  const nav = user?.role === 'agent' ? AGENT_NAV : CLIENT_NAV;

  const handleLogout = () => { logout(); navigate('/login'); };

  const routeTitle = {
    '/client':     'My Tickets',
    '/client/new': 'New Ticket',
    '/agent':      'Agent Dashboard',
  }[location.pathname] ?? 'SupportDesk';

  return (
    <div className="app-layout">
      {/* ── Sidebar ── */}
      <aside className="sidebar">
        <div className="sidebar-logo">
          <div className="sidebar-logo-icon">🛡</div>
          <div>
            <div className="sidebar-logo-text">SupportDesk</div>
            <div className="sidebar-logo-sub">Support Platform</div>
          </div>
        </div>

        <div className="sidebar-section">
          <div className="sidebar-section-label">Menu</div>
          {nav.map((item) => (
            <div
              key={item.path}
              className={`nav-item ${location.pathname === item.path ? 'active' : ''}`}
              onClick={() => navigate(item.path)}
            >
              <span className="nav-icon">{item.icon}</span>
              {item.label}
            </div>
          ))}
        </div>

        <div className="sidebar-footer">
          <div className="sidebar-user-card">
            <div className="sidebar-avatar">{getInitials(user?.name)}</div>
            <div style={{ flex: 1, minWidth: 0 }}>
              <div className="sidebar-user-name" style={{ overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>
                {user?.name}
              </div>
              <div className="sidebar-user-role">{user?.role}</div>
            </div>
            <button className="sidebar-logout" title="Logout" onClick={handleLogout}>⏻</button>
          </div>
        </div>
      </aside>

      {/* ── Main ── */}
      <div className="main-wrapper">
        <header className="topbar">
          <div className="topbar-left">
            <span className="topbar-title">{routeTitle}</span>
          </div>
          <div className="topbar-right">
            <span className={`topbar-role-pill ${user?.role === 'agent' ? 'role-agent' : 'role-client'}`}>
              {user?.role === 'agent' ? '🧑‍💼 Agent' : '👤 Client'}
            </span>
            {user?.role === 'agent' && (
              <span style={{ fontSize: '.8rem', color: 'var(--gray-400)', textTransform: 'capitalize' }}>
                {user.department}
              </span>
            )}
          </div>
        </header>
        <main style={{ flex: 1 }}>{children}</main>
      </div>
    </div>
  );
}
