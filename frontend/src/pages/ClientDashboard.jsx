import React, { useState, useEffect, useCallback, useRef } from 'react';
import { useNavigate } from 'react-router-dom';
import API from '../api/api';
import Toast, { useToast } from '../components/Toast';

const POLL_INTERVAL = 10000; // refresh every 10 seconds

export default function ClientDashboard() {
  const [tickets, setTickets] = useState([]);
  const [total, setTotal]     = useState(0);
  const [page, setPage]       = useState(1);
  const [pages, setPages]     = useState(1);
  const [filters, setFilters] = useState({ status: '', urgency: '' });
  const [loading, setLoading] = useState(true);
  const { toasts, show }      = useToast();
  const navigate              = useNavigate();
  const pollRef               = useRef(null);

  const fetchTickets = useCallback(async (silent = false) => {
    if (!silent) setLoading(true);
    try {
      const params = { page, limit: 10, ...filters };
      const { data } = await API.get('/tickets/my', { params });
      setTickets(data.tickets);
      setTotal(data.total);
      setPages(data.pages);
    } catch {
      if (!silent) show('Failed to load tickets', 'error');
    } finally {
      if (!silent) setLoading(false);
    }
  }, [page, filters]);

  // Initial load
  useEffect(() => {
    fetchTickets(false);
  }, [fetchTickets]);

  // Polling — silently refresh every 10s
  useEffect(() => {
    pollRef.current = setInterval(() => fetchTickets(true), POLL_INTERVAL);
    return () => clearInterval(pollRef.current);
  }, [fetchTickets]);

  const counts   = tickets.reduce((a, t) => ({ ...a, [t.status]: (a[t.status] || 0) + 1 }), {});
  const setFilter = (k, v) => { setFilters((f) => ({ ...f, [k]: v })); setPage(1); };

  return (
    <div className="page">
      <Toast toasts={toasts} />

      <div className="page-header" style={{ display: 'flex', alignItems: 'flex-start', justifyContent: 'space-between' }}>
        <div>
          <div className="page-title">My Support Tickets</div>
          <div className="page-subtitle">Track the status of all your submitted tickets</div>
        </div>
        <button className="btn btn-primary" onClick={() => navigate('/client/new')}>
          ✏️ New Ticket
        </button>
      </div>

      {/* Stats */}
      <div className="stats-grid">
        <div className="stat-card blue">
          <div className="stat-icon">🎫</div>
          <div className="stat-value">{total}</div>
          <div className="stat-label">Total Tickets</div>
        </div>
        <div className="stat-card orange">
          <div className="stat-icon">🔓</div>
          <div className="stat-value">{counts['open'] || 0}</div>
          <div className="stat-label">Open</div>
        </div>
        <div className="stat-card purple">
          <div className="stat-icon">⚙️</div>
          <div className="stat-value">{counts['in-progress'] || 0}</div>
          <div className="stat-label">In Progress</div>
        </div>
        <div className="stat-card green">
          <div className="stat-icon">✅</div>
          <div className="stat-value">{counts['resolved'] || 0}</div>
          <div className="stat-label">Resolved</div>
        </div>
      </div>

      {/* Table card */}
      <div className="card">
        <div className="card-header">
          <div className="card-title">Ticket History</div>
          <span style={{ fontSize: '.75rem', color: 'var(--gray-400)' }}>
            🔄 Auto-refreshes every 10s
          </span>
        </div>

        {/* Filters */}
        <div style={{ padding: '14px 24px 0' }}>
          <div className="filter-bar">
            <select value={filters.status} onChange={(e) => setFilter('status', e.target.value)}>
              <option value="">All Statuses</option>
              {['open', 'in-progress', 'pending', 'resolved', 'closed'].map((s) => (
                <option key={s} value={s}>{s}</option>
              ))}
            </select>
            <select value={filters.urgency} onChange={(e) => setFilter('urgency', e.target.value)}>
              <option value="">All Urgencies</option>
              {['critical', 'high', 'medium', 'low'].map((u) => (
                <option key={u} value={u}>{u}</option>
              ))}
            </select>
            {(filters.status || filters.urgency) && (
              <button className="btn btn-ghost btn-sm" onClick={() => { setFilters({ status: '', urgency: '' }); setPage(1); }}>
                × Clear filters
              </button>
            )}
            <span className="filter-count">{total} ticket{total !== 1 ? 's' : ''}</span>
          </div>
        </div>

        <div className="card-body" style={{ padding: '14px 0 0' }}>
          {loading ? (
            <div className="spinner" />
          ) : tickets.length === 0 ? (
            <div className="empty-state">
              <div className="empty-icon">🎫</div>
              <div className="empty-title">No tickets yet</div>
              <div className="empty-sub">Submit your first support ticket to get started</div>
              <button className="btn btn-primary" style={{ marginTop: 16 }} onClick={() => navigate('/client/new')}>
                ✏️ Create Ticket
              </button>
            </div>
          ) : (
            <div className="table-wrap">
              <table>
                <thead>
                  <tr>
                    <th>Ticket #</th>
                    <th>Subject</th>
                    <th>Status</th>
                    <th>Urgency</th>
                    <th>Department</th>
                    <th>Assigned To</th>
                    <th>Created</th>
                  </tr>
                </thead>
                <tbody>
                  {tickets.map((t) => (
                    <tr key={t._id}>
                      <td><span className="ticket-num">{t.ticketNumber}</span></td>
                      <td>
                        <span className="ticket-link" onClick={() => navigate(`/client/tickets/${t._id}`)}>
                          {t.subject}
                        </span>
                        {t.tags?.length > 0 && (
                          <div className="tag-list">
                            {t.tags.map((tag) => <span key={tag} className="tag">{tag}</span>)}
                          </div>
                        )}
                      </td>
                      <td><span className={`badge badge-${t.status}`}>{t.status}</span></td>
                      <td><span className={`badge badge-${t.urgency}`}>{t.urgency}</span></td>
                      <td style={{ textTransform: 'capitalize', color: 'var(--gray-500)', fontSize: '.84rem' }}>{t.department}</td>
                      <td style={{ fontSize: '.84rem' }}>
                        {t.assignedAgent
                          ? <span style={{ display: 'flex', alignItems: 'center', gap: 6 }}>
                              <span style={{ width: 24, height: 24, borderRadius: '50%', background: 'var(--primary-light)', color: 'var(--primary)', display: 'inline-flex', alignItems: 'center', justifyContent: 'center', fontSize: '.7rem', fontWeight: 700 }}>
                                {t.assignedAgent.name?.[0]}
                              </span>
                              {t.assignedAgent.name}
                            </span>
                          : <span style={{ color: 'var(--gray-300)' }}>—</span>
                        }
                      </td>
                      <td style={{ fontSize: '.78rem', color: 'var(--gray-400)', whiteSpace: 'nowrap' }}>
                        {new Date(t.createdAt).toLocaleDateString('en-US', { month: 'short', day: 'numeric', year: 'numeric' })}
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          )}
        </div>

        {pages > 1 && (
          <div className="card-footer" style={{ justifyContent: 'center' }}>
            <div className="pagination">
              <button className="page-btn" disabled={page === 1} onClick={() => setPage(p => p - 1)}>‹</button>
              {Array.from({ length: pages }, (_, i) => i + 1).map((p) => (
                <button key={p} className={`page-btn ${p === page ? 'active' : ''}`} onClick={() => setPage(p)}>{p}</button>
              ))}
              <button className="page-btn" disabled={page === pages} onClick={() => setPage(p => p + 1)}>›</button>
            </div>
          </div>
        )}
      </div>
    </div>
  );
}
