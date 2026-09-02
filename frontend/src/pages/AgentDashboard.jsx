import React, { useState, useEffect, useCallback, useRef } from 'react';
import { useNavigate } from 'react-router-dom';
import API from '../api/api';
import Toast, { useToast } from '../components/Toast';

const POLL_INTERVAL = 8000; // refresh every 8 seconds
const URGENCY_ORD   = { critical: 0, high: 1, medium: 2, low: 3 };
const STATUS_DOTS   = { open: '#0284c7', 'in-progress': '#7c3aed', pending: '#d97706', resolved: '#059669', closed: '#9ca3af' };

export default function AgentDashboard() {
  const [tickets, setTickets] = useState([]);
  const [stats, setStats]     = useState(null);
  const [total, setTotal]     = useState(0);
  const [page, setPage]       = useState(1);
  const [pages, setPages]     = useState(1);
  const [view, setView]       = useState('assigned');
  const [filters, setFilters] = useState({ status: '', urgency: '', department: '' });
  const [loading, setLoading] = useState(true);
  const { toasts, show }      = useToast();
  const navigate              = useNavigate();
  const pollRef               = useRef(null);

  const fetchStats = useCallback(async () => {
    try {
      const { data } = await API.get('/tickets/stats/overview');
      setStats(data);
    } catch {}
  }, []);

  const fetchTickets = useCallback(async (silent = false) => {
    if (!silent) setLoading(true);
    try {
      const endpoint = view === 'all' ? '/tickets/all' : '/tickets/agent';
      const { data } = await API.get(endpoint, { params: { page, limit: 20, ...filters } });
      setTickets(data.tickets);
      setTotal(data.total);
      setPages(data.pages);
    } catch {
      if (!silent) show('Failed to load tickets', 'error');
    } finally {
      if (!silent) setLoading(false);
    }
  }, [view, page, filters]);

  // Initial load
  useEffect(() => {
    fetchTickets(false);
    fetchStats();
  }, [fetchTickets, fetchStats]);

  // Polling
  useEffect(() => {
    pollRef.current = setInterval(() => {
      fetchTickets(true);
      fetchStats();
    }, POLL_INTERVAL);
    return () => clearInterval(pollRef.current);
  }, [fetchTickets, fetchStats]);

  const updateStatus = async (id, status) => {
    try {
      await API.patch(`/tickets/${id}/status`, { status });
      setTickets((p) => p.map((t) => t._id === id ? { ...t, status } : t));
      fetchStats();
      show(`Status → "${status}" ✓`);
    } catch { show('Update failed', 'error'); }
  };

  const setFilter = (k, v) => { setFilters((f) => ({ ...f, [k]: v })); setPage(1); };
  const sorted = [...tickets].sort((a, b) => (URGENCY_ORD[a.urgency] ?? 9) - (URGENCY_ORD[b.urgency] ?? 9));

  return (
    <div className="page">
      <Toast toasts={toasts} />

      <div className="page-header">
        <div className="page-title">Agent Dashboard</div>
        <div className="page-subtitle">Manage and resolve incoming support tickets</div>
      </div>

      {/* Stats */}
      {stats && (
        <div className="stats-grid">
          <div className="stat-card indigo">
            <div className="stat-icon">📋</div>
            <div className="stat-value">{stats.total}</div>
            <div className="stat-label">Total</div>
          </div>
          <div className="stat-card blue">
            <div className="stat-icon">🔓</div>
            <div className="stat-value">{stats.open}</div>
            <div className="stat-label">Open</div>
          </div>
          <div className="stat-card purple">
            <div className="stat-icon">⚙️</div>
            <div className="stat-value">{stats.inProgress}</div>
            <div className="stat-label">In Progress</div>
          </div>
          <div className="stat-card green">
            <div className="stat-icon">✅</div>
            <div className="stat-value">{stats.resolved}</div>
            <div className="stat-label">Resolved</div>
          </div>
          <div className="stat-card red">
            <div className="stat-icon">🔥</div>
            <div className="stat-value">{stats.critical}</div>
            <div className="stat-label">Critical</div>
          </div>
          <div className="stat-card orange">
            <div className="stat-icon">⚠️</div>
            <div className="stat-value">{stats.escalated}</div>
            <div className="stat-label">Escalated</div>
          </div>
        </div>
      )}

      {/* Dept breakdown */}
      {stats?.byDept?.length > 0 && (
        <div className="card card-body" style={{ marginBottom: 20 }}>
          <div style={{ fontWeight: 700, fontSize: '.85rem', color: 'var(--gray-600)', marginBottom: 14, textTransform: 'uppercase', letterSpacing: '.05em' }}>
            Tickets by Department
          </div>
          <div className="dept-grid">
            {stats.byDept.map((d) => (
              <div className="dept-pill" key={d._id} onClick={() => setFilter('department', d._id)} style={{ cursor: 'pointer' }}>
                <div className="dept-pill-count">{d.count}</div>
                <div className="dept-pill-name">{d._id}</div>
              </div>
            ))}
          </div>
        </div>
      )}

      {/* Main table card */}
      <div className="card">
        <div className="card-header">
          {/* View toggle */}
          <div style={{ display: 'flex', background: 'var(--gray-100)', borderRadius: 9, padding: 4, gap: 4 }}>
            {['assigned', 'all'].map((v) => (
              <button key={v} onClick={() => { setView(v); setPage(1); }} style={{
                padding: '6px 18px', borderRadius: 7, border: 'none', cursor: 'pointer',
                background: view === v ? '#fff' : 'transparent',
                color: view === v ? 'var(--primary)' : 'var(--gray-500)',
                fontWeight: 600, fontSize: '.84rem',
                boxShadow: view === v ? 'var(--shadow-sm)' : 'none',
                transition: 'all .2s',
              }}>
                {v === 'assigned' ? '👤 My Queue' : '📋 All Tickets'}
              </button>
            ))}
          </div>
          <div style={{ display: 'flex', alignItems: 'center', gap: 12 }}>
            <span style={{ fontSize: '.75rem', color: 'var(--gray-400)' }}>🔄 Auto-refreshes every 8s</span>
            <span style={{ fontSize: '.84rem', color: 'var(--gray-400)' }}>{total} ticket{total !== 1 ? 's' : ''}</span>
          </div>
        </div>

        {/* Filters */}
        <div style={{ padding: '12px 24px 0' }}>
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
            <select value={filters.department} onChange={(e) => setFilter('department', e.target.value)}>
              <option value="">All Departments</option>
              {['billing', 'technical', 'general', 'sales'].map((d) => (
                <option key={d} value={d}>{d}</option>
              ))}
            </select>
            {(filters.status || filters.urgency || filters.department) && (
              <button className="btn btn-ghost btn-sm"
                onClick={() => { setFilters({ status: '', urgency: '', department: '' }); setPage(1); }}>
                × Clear
              </button>
            )}
          </div>
        </div>

        <div className="card-body" style={{ padding: '12px 0 0' }}>
          {loading ? (
            <div className="spinner" />
          ) : sorted.length === 0 ? (
            <div className="empty-state">
              <div className="empty-icon">📭</div>
              <div className="empty-title">No tickets found</div>
              <div className="empty-sub">Try adjusting your filters</div>
            </div>
          ) : (
            <div className="table-wrap">
              <table>
                <thead>
                  <tr>
                    <th>Ticket #</th>
                    <th>Subject</th>
                    <th>Client</th>
                    <th>Status</th>
                    <th>Urgency</th>
                    <th>Dept</th>
                    <th>SLA</th>
                    <th>Actions</th>
                  </tr>
                </thead>
                <tbody>
                  {sorted.map((t) => {
                    const slaExpired = t.slaDeadline && new Date(t.slaDeadline) < new Date()
                      && !['resolved', 'closed'].includes(t.status);
                    return (
                      <tr key={t._id} className={slaExpired ? 'sla-row-alert' : ''}>
                        <td><span className="ticket-num">{t.ticketNumber}</span></td>
                        <td style={{ maxWidth: 240 }}>
                          <span className="ticket-link" onClick={() => navigate(`/agent/tickets/${t._id}`)}>
                            {t.subject}
                          </span>
                          {t.tags?.length > 0 && (
                            <div className="tag-list">
                              {t.tags.map((tag) => <span key={tag} className="tag">{tag}</span>)}
                            </div>
                          )}
                          {slaExpired && <div style={{ marginTop: 3 }}><span className="sla-chip">⚠ SLA Breached</span></div>}
                        </td>
                        <td>
                          <div style={{ fontSize: '.84rem', fontWeight: 500 }}>{t.client?.name}</div>
                          <div style={{ fontSize: '.72rem', color: 'var(--gray-400)' }}>{t.client?.email}</div>
                        </td>
                        <td>
                          <span className={`badge badge-${t.status}`}>
                            <span style={{ width: 6, height: 6, borderRadius: '50%', background: STATUS_DOTS[t.status], display: 'inline-block' }} />
                            {t.status}
                          </span>
                        </td>
                        <td><span className={`badge badge-${t.urgency}`}>{t.urgency}</span></td>
                        <td style={{ textTransform: 'capitalize', fontSize: '.84rem', color: 'var(--gray-500)' }}>{t.department}</td>
                        <td style={{ fontSize: '.75rem', color: slaExpired ? 'var(--danger)' : 'var(--gray-400)', whiteSpace: 'nowrap', fontWeight: slaExpired ? 600 : 400 }}>
                          {t.slaDeadline ? new Date(t.slaDeadline).toLocaleString('en-US', { month: 'short', day: 'numeric', hour: '2-digit', minute: '2-digit' }) : '—'}
                        </td>
                        <td>
                          <div style={{ display: 'flex', gap: 4 }}>
                            {t.status !== 'in-progress' && !['resolved', 'closed'].includes(t.status) && (
                              <button className="btn btn-xs btn-purple" onClick={() => updateStatus(t._id, 'in-progress')}>Start</button>
                            )}
                            {!['resolved', 'closed'].includes(t.status) && (
                              <button className="btn btn-xs btn-success" onClick={() => updateStatus(t._id, 'resolved')}>Resolve</button>
                            )}
                            {t.status !== 'closed' && (
                              <button className="btn btn-xs btn-slate" onClick={() => updateStatus(t._id, 'closed')}>Close</button>
                            )}
                          </div>
                        </td>
                      </tr>
                    );
                  })}
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
