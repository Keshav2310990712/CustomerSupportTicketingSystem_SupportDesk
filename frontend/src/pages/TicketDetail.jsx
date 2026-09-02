import React, { useState, useEffect, useRef, useCallback } from 'react';
import { useParams, useNavigate } from 'react-router-dom';
import API from '../api/api';
import { useAuth } from '../context/AuthContext';
import { io } from 'socket.io-client';
import Toast, { useToast } from '../components/Toast';

const SOCKET_URL = 'http://localhost:5000';

const STATUS_CONFIG = {
  open:         { label: 'Open',        color: '#0284c7', dot: '#0284c7' },
  'in-progress':{ label: 'In Progress', color: '#7c3aed', dot: '#7c3aed' },
  pending:      { label: 'Pending',     color: '#d97706', dot: '#d97706' },
  resolved:     { label: 'Resolved',    color: '#059669', dot: '#059669' },
  closed:       { label: 'Closed',      color: '#9ca3af', dot: '#9ca3af' },
};

function getInitials(name = '') {
  return name.split(' ').map((w) => w[0]).join('').toUpperCase().slice(0, 2);
}

export default function TicketDetail() {
  const { id }          = useParams();
  const { user }        = useAuth();
  const navigate        = useNavigate();
  const { toasts, show } = useToast();

  const [ticket, setTicket]     = useState(null);
  const [agents, setAgents]     = useState([]);
  const [reply, setReply]       = useState('');
  const [replyFiles, setReplyFiles] = useState([]);
  const [loading, setLoading]   = useState(true);
  const [sending, setSending]   = useState(false);
  const [error, setError]       = useState('');
  const bottomRef = useRef(null);

  const fetchTicket = useCallback(async () => {
    try {
      const { data } = await API.get(`/tickets/${id}`);
      setTicket(data);
    } catch (err) {
      setError(err.response?.data?.message || 'Failed to load ticket');
    } finally {
      setLoading(false);
    }
  }, [id]);

  const fetchAgents = useCallback(async () => {
    try { const { data } = await API.get('/users/agents'); setAgents(data); } catch {}
  }, []);

  useEffect(() => {
    fetchTicket();
    if (user?.role === 'agent') fetchAgents();
  }, [fetchTicket, fetchAgents, user]);

  useEffect(() => {
    const socket = io(SOCKET_URL, { transports: ['websocket', 'polling'] });
    socket.on('ticket:message', ({ ticketId }) => {
      if (ticketId === id) fetchTicket();
    });
    socket.on('ticket:updated', ({ id: tid, status }) => {
      if (tid === id) setTicket((p) => p ? { ...p, status } : p);
    });
    return () => socket.disconnect();
  }, [id, fetchTicket]);

  useEffect(() => {
    bottomRef.current?.scrollIntoView({ behavior: 'smooth' });
  }, [ticket?.messages?.length]);

  const sendReply = async (e) => {
    e.preventDefault();
    if (!reply.trim()) return;
    setSending(true);
    try {
      const fd = new FormData();
      fd.append('content', reply.trim());
      replyFiles.forEach((f) => fd.append('attachments', f));
      await API.post(`/tickets/${id}/messages`, fd, { headers: { 'Content-Type': 'multipart/form-data' } });
      setReply(''); setReplyFiles([]);
      fetchTicket();
      show('Reply sent ✓');
    } catch (err) {
      show(err.response?.data?.message || 'Failed to send reply', 'error');
    } finally { setSending(false); }
  };

  const updateStatus = async (status) => {
    try {
      await API.patch(`/tickets/${id}/status`, { status });
      setTicket((p) => ({ ...p, status }));
      show(`Status updated to "${status}" ✓`);
    } catch { show('Update failed', 'error'); }
  };

  const reassign = async (agentId) => {
    if (!agentId) return;
    try {
      const { data } = await API.patch(`/tickets/${id}/assign`, { agentId });
      setTicket((p) => ({ ...p, assignedAgent: data.assignedAgent }));
      show('Ticket reassigned ✓');
    } catch { show('Reassignment failed', 'error'); }
  };

  if (loading) return (
    <div className="page" style={{ display: 'flex', alignItems: 'center', justifyContent: 'center', minHeight: 300 }}>
      <div className="spinner" />
    </div>
  );

  if (error) return (
    <div className="page">
      <div className="alert alert-error"><span className="alert-icon">⚠️</span>{error}</div>
      <button className="btn btn-ghost btn-sm" onClick={() => navigate(-1)}>← Go Back</button>
    </div>
  );

  if (!ticket) return null;

  const isClosed  = ['resolved', 'closed'].includes(ticket.status);
  const backPath  = user?.role === 'agent' ? '/agent' : '/client';
  const slaExpired = ticket.slaDeadline && new Date(ticket.slaDeadline) < new Date() && !isClosed;

  return (
    <div className="page">
      <Toast toasts={toasts} />

      {/* Back + breadcrumb */}
      <button className="btn btn-ghost btn-sm" style={{ marginBottom: 18 }} onClick={() => navigate(backPath)}>
        ← Back to {user?.role === 'agent' ? 'Dashboard' : 'My Tickets'}
      </button>

      {/* Header */}
      <div style={{ marginBottom: 24 }}>
        <div style={{ display: 'flex', alignItems: 'flex-start', gap: 12, flexWrap: 'wrap' }}>
          <h1 style={{ fontSize: '1.25rem', fontWeight: 800, color: 'var(--gray-900)', flex: 1 }}>
            {ticket.subject}
          </h1>
          <span className={`badge badge-${ticket.status}`}
            style={{ fontSize: '.8rem', padding: '5px 12px' }}>
            <span style={{ width: 7, height: 7, borderRadius: '50%', background: STATUS_CONFIG[ticket.status]?.dot, display: 'inline-block' }} />
            {ticket.status}
          </span>
          <span className={`badge badge-${ticket.urgency}`} style={{ fontSize: '.8rem', padding: '5px 12px' }}>
            {ticket.urgency}
          </span>
        </div>

        {/* Meta row */}
        <div style={{ display: 'flex', flexWrap: 'wrap', gap: 16, marginTop: 12, fontSize: '.82rem', color: 'var(--gray-500)' }}>
          <span>🎫 <strong style={{ color: 'var(--gray-700)' }}>{ticket.ticketNumber}</strong></span>
          <span>🏢 <strong style={{ color: 'var(--gray-700)', textTransform: 'capitalize' }}>{ticket.department}</strong></span>
          <span>👤 {ticket.client?.name}</span>
          <span>🧑‍💼 {ticket.assignedAgent?.name || 'Unassigned'}</span>
          <span>📅 {new Date(ticket.createdAt).toLocaleString()}</span>
          {ticket.slaDeadline && (
            <span className={slaExpired ? 'sla-breached' : ''}>
              ⏰ SLA: <strong>{new Date(ticket.slaDeadline).toLocaleString()}</strong>
              {slaExpired && ' ⚠ Breached'}
            </span>
          )}
        </div>

        {ticket.tags?.length > 0 && (
          <div className="tag-list" style={{ marginTop: 10 }}>
            {ticket.tags.map((tag) => <span key={tag} className="tag">{tag}</span>)}
          </div>
        )}
      </div>

      {/* Two-column layout */}
      <div className="ticket-detail-grid" style={{ display: 'grid', gridTemplateColumns: '1fr 280px', gap: 20, alignItems: 'start' }}>

        {/* Left: description + conversation */}
        <div style={{ display: 'flex', flexDirection: 'column', gap: 16 }}>

          {/* Original description */}
          <div className="card card-body">
            <div style={{ fontWeight: 700, fontSize: '.83rem', color: 'var(--gray-500)', textTransform: 'uppercase', letterSpacing: '.06em', marginBottom: 12 }}>
              Original Description
            </div>
            <p style={{ fontSize: '.9rem', color: 'var(--gray-700)', lineHeight: 1.7, whiteSpace: 'pre-wrap' }}>
              {ticket.description}
            </p>
            {ticket.attachments?.length > 0 && (
              <div style={{ marginTop: 14 }}>
                <div style={{ fontSize: '.76rem', fontWeight: 600, color: 'var(--gray-400)', textTransform: 'uppercase', marginBottom: 8 }}>Attachments</div>
                <div style={{ display: 'flex', flexWrap: 'wrap', gap: 8 }}>
                  {ticket.attachments.map((a, i) => (
                    <a key={i}
                      href={`/uploads/${a.path?.split(/[\\/]/).pop()}`}
                      target="_blank" rel="noreferrer"
                      style={{ display: 'flex', alignItems: 'center', gap: 6, background: 'var(--primary-light)', color: 'var(--primary)', padding: '5px 12px', borderRadius: 7, fontSize: '.78rem', fontWeight: 500 }}>
                      📎 {a.filename}
                    </a>
                  ))}
                </div>
              </div>
            )}
          </div>

          {/* Conversation */}
          <div className="card card-body">
            <div style={{ fontWeight: 700, fontSize: '.83rem', color: 'var(--gray-500)', textTransform: 'uppercase', letterSpacing: '.06em', marginBottom: 14 }}>
              Conversation · {ticket.messages?.length || 0} messages
            </div>

            {(!ticket.messages || ticket.messages.length === 0) ? (
              <div style={{ textAlign: 'center', padding: '24px 0', color: 'var(--gray-400)', fontSize: '.875rem' }}>
                No messages yet. Be the first to reply.
              </div>
            ) : (
              <div className="conversation">
                {ticket.messages.map((msg, i) => (
                  <div key={i} className={`msg-row ${msg.senderRole || 'client'}`}>
                    {msg.senderRole !== 'agent' && (
                      <div className="msg-avatar client">{getInitials(msg.sender?.name)}</div>
                    )}
                    <div className="msg-bubble">
                      <div className="msg-sender">{msg.sender?.name} · {msg.senderRole}</div>
                      <div className="msg-text">{msg.content}</div>
                      {msg.attachments?.length > 0 && (
                        <div style={{ marginTop: 8 }}>
                          {msg.attachments.map((a, j) => (
                            <a key={j} href={`/uploads/${a.path?.split(/[\\/]/).pop()}`} target="_blank" rel="noreferrer"
                              style={{ display: 'inline-flex', alignItems: 'center', gap: 4, marginRight: 8, fontSize: '.75rem',
                                color: msg.senderRole === 'agent' ? 'rgba(255,255,255,.8)' : 'var(--primary)' }}>
                              📎 {a.filename}
                            </a>
                          ))}
                        </div>
                      )}
                      <span className="msg-time">{new Date(msg.createdAt).toLocaleString()}</span>
                    </div>
                    {msg.senderRole === 'agent' && (
                      <div className="msg-avatar agent">{getInitials(msg.sender?.name)}</div>
                    )}
                  </div>
                ))}
                <div ref={bottomRef} />
              </div>
            )}

            {/* Reply box */}
            {!isClosed ? (
              <div className="reply-area">
                <form onSubmit={sendReply}>
                  <div className="reply-input-wrap">
                    <textarea
                      value={reply}
                      onChange={(e) => setReply(e.target.value)}
                      placeholder="Type your reply… (Shift+Enter for new line)"
                      onKeyDown={(e) => { if (e.key === 'Enter' && !e.shiftKey) { e.preventDefault(); sendReply(e); } }}
                    />
                    <div className="reply-actions">
                      <label style={{ cursor: 'pointer', display: 'flex', alignItems: 'center', gap: 4,
                        background: 'var(--gray-100)', border: '1px solid var(--gray-200)',
                        borderRadius: 7, padding: '6px 10px', fontSize: '.78rem', color: 'var(--gray-600)' }}>
                        📎 {replyFiles.length > 0 ? `${replyFiles.length}` : ''}
                        <input type="file" multiple style={{ display: 'none' }}
                          onChange={(e) => setReplyFiles(Array.from(e.target.files))} />
                      </label>
                      <button className="btn btn-primary btn-sm" disabled={sending || !reply.trim()}>
                        {sending ? '…' : '↑ Send'}
                      </button>
                    </div>
                  </div>
                </form>
              </div>
            ) : (
              <div style={{ marginTop: 14, padding: '10px 14px', background: 'var(--gray-50)', borderRadius: 8, fontSize: '.84rem', color: 'var(--gray-400)', textAlign: 'center', border: '1px solid var(--gray-200)' }}>
                🔒 This ticket is <strong>{ticket.status}</strong>. Replies are disabled.
              </div>
            )}
          </div>
        </div>

        {/* Right sidebar */}
        <div style={{ display: 'flex', flexDirection: 'column', gap: 14 }}>

          {/* Agent controls */}
          {user?.role === 'agent' && (
            <div className="card card-body">
              <div style={{ fontWeight: 700, fontSize: '.83rem', color: 'var(--gray-500)', textTransform: 'uppercase', letterSpacing: '.06em', marginBottom: 12 }}>
                Update Status
              </div>
              <div className="status-actions">
                {Object.entries(STATUS_CONFIG).map(([s, cfg]) => (
                  <button key={s} className={`status-btn ${ticket.status === s ? 'active' : ''}`}
                    onClick={() => updateStatus(s)} disabled={ticket.status === s}>
                    <span className="status-btn-dot" style={{ background: cfg.dot }} />
                    {cfg.label}
                    {ticket.status === s && <span style={{ marginLeft: 'auto', fontSize: '.7rem' }}>✓ Current</span>}
                  </button>
                ))}
              </div>

              {agents.length > 0 && (
                <div style={{ marginTop: 18 }}>
                  <div style={{ fontWeight: 700, fontSize: '.83rem', color: 'var(--gray-500)', textTransform: 'uppercase', letterSpacing: '.06em', marginBottom: 8 }}>
                    Reassign
                  </div>
                  <select className="form-control" defaultValue="" onChange={(e) => reassign(e.target.value)}>
                    <option value="" disabled>Select agent…</option>
                    {agents.map((a) => (
                      <option key={a._id} value={a._id}>
                        {a.name} ({a.department})
                        {a._id === ticket.assignedAgent?._id ? ' ← current' : ''}
                      </option>
                    ))}
                  </select>
                </div>
              )}
            </div>
          )}

          {/* Ticket info */}
          <div className="card card-body">
            <div style={{ fontWeight: 700, fontSize: '.83rem', color: 'var(--gray-500)', textTransform: 'uppercase', letterSpacing: '.06em', marginBottom: 14 }}>
              Ticket Details
            </div>
            <div className="info-grid">
              <div className="info-item">
                <div className="info-item-label">Ticket ID</div>
                <div className="info-item-value" style={{ fontFamily: 'monospace', fontSize: '.85rem' }}>{ticket.ticketNumber}</div>
              </div>
              <div className="info-item">
                <div className="info-item-label">Department</div>
                <div className="info-item-value" style={{ textTransform: 'capitalize' }}>{ticket.department}</div>
              </div>
              <div className="info-item">
                <div className="info-item-label">Priority</div>
                <div><span className={`badge badge-${ticket.urgency}`}>{ticket.urgency}</span></div>
              </div>
              <div className="info-item">
                <div className="info-item-label">Submitted</div>
                <div className="info-item-value">{new Date(ticket.createdAt).toLocaleString()}</div>
              </div>
              {ticket.firstResponseAt && (
                <div className="info-item">
                  <div className="info-item-label">First Response</div>
                  <div className="info-item-value">{new Date(ticket.firstResponseAt).toLocaleString()}</div>
                </div>
              )}
              {ticket.resolvedAt && (
                <div className="info-item">
                  <div className="info-item-label">Resolved At</div>
                  <div className="info-item-value" style={{ color: 'var(--success)' }}>
                    {new Date(ticket.resolvedAt).toLocaleString()}
                  </div>
                </div>
              )}
              {ticket.slaDeadline && (
                <div className="info-item">
                  <div className="info-item-label">SLA Deadline</div>
                  <div className="info-item-value" style={{ color: slaExpired ? 'var(--danger)' : undefined }}>
                    {new Date(ticket.slaDeadline).toLocaleString()}
                    {slaExpired && <div style={{ fontSize: '.75rem', color: 'var(--danger)', fontWeight: 600, marginTop: 2 }}>⚠ Breached</div>}
                  </div>
                </div>
              )}
            </div>
          </div>

          {/* Client info */}
          <div className="card card-body">
            <div style={{ fontWeight: 700, fontSize: '.83rem', color: 'var(--gray-500)', textTransform: 'uppercase', letterSpacing: '.06em', marginBottom: 12 }}>
              Client
            </div>
            <div style={{ display: 'flex', alignItems: 'center', gap: 10 }}>
              <div style={{ width: 38, height: 38, borderRadius: '50%', background: 'var(--info-light)', color: 'var(--info)', display: 'flex', alignItems: 'center', justifyContent: 'center', fontWeight: 700 }}>
                {getInitials(ticket.client?.name)}
              </div>
              <div>
                <div style={{ fontWeight: 600, fontSize: '.9rem' }}>{ticket.client?.name}</div>
                <div style={{ fontSize: '.78rem', color: 'var(--gray-400)' }}>{ticket.client?.email}</div>
              </div>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}
