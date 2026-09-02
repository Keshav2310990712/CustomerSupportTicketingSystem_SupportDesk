import React, { useState } from 'react';
import { useNavigate } from 'react-router-dom';
import API from '../api/api';

const URGENCY_COLOR = { critical: '#dc2626', high: '#d97706', medium: '#92400e', low: '#166534' };
const URGENCY_BG    = { critical: '#fef2f2', high: '#fffbeb', medium: '#fffbeb', low: '#f0fdf4' };

export default function NewTicket() {
  const [form, setForm]   = useState({ subject: '', description: '' });
  const [files, setFiles] = useState([]);
  const [loading, setLoading] = useState(false);
  const [error, setError]     = useState('');
  const [ack, setAck]         = useState(null);
  const navigate = useNavigate();

  const set = (k) => (e) => setForm((f) => ({ ...f, [k]: e.target.value }));

  const submit = async (e) => {
    e.preventDefault();
    setError(''); setLoading(true);
    try {
      const fd = new FormData();
      fd.append('subject', form.subject);
      fd.append('description', form.description);
      files.forEach((f) => fd.append('attachments', f));
      const { data } = await API.post('/tickets', fd, {
        headers: { 'Content-Type': 'multipart/form-data' },
      });
      setAck(data.acknowledgement);
    } catch (err) {
      setError(err.response?.data?.message || 'Failed to submit ticket. Please try again.');
    } finally {
      setLoading(false);
    }
  };

  /* ── Acknowledgement screen ── */
  if (ack) return (
    <div className="page">
      <div style={{ maxWidth: 640 }}>
        <div className="ack-card">
          <div className="ack-header">
            <div className="ack-check">✓</div>
            <div>
              <div className="ack-title">Ticket {ack.ticketNumber} Submitted!</div>
              <div style={{ fontSize: '.8rem', color: '#166534', marginTop: 2 }}>
                We've received your request and assigned it to our team.
              </div>
            </div>
          </div>
          <div className="ack-message">{ack.message}</div>
          <div className="ack-meta">
            <div className="ack-meta-item">
              🎯
              <span>Urgency: <strong style={{ color: URGENCY_COLOR[ack.urgency] }}>{ack.urgency.toUpperCase()}</strong></span>
            </div>
            <div className="ack-meta-item">🏢 <span>Dept: <strong>{ack.department}</strong></span></div>
            <div className="ack-meta-item">🧑‍💼 <span>Agent: <strong>{ack.assignedTo}</strong></span></div>
            <div className="ack-meta-item">⏰ <span>SLA: <strong>{new Date(ack.slaDeadline).toLocaleString()}</strong></span></div>
          </div>
          <div className="ack-actions">
            <button className="btn btn-primary" onClick={() => navigate('/client')}>
              📋 View My Tickets
            </button>
            <button className="btn btn-ghost" onClick={() => { setAck(null); setForm({ subject: '', description: '' }); setFiles([]); }}>
              ✏️ Submit Another
            </button>
          </div>
        </div>
      </div>
    </div>
  );

  /* ── Submission form ── */
  return (
    <div className="page">
      <div className="page-header">
        <div className="page-title">Submit a Support Ticket</div>
        <div className="page-subtitle">Describe your issue and we'll route it to the right team automatically.</div>
      </div>

      <div style={{ display: 'grid', gridTemplateColumns: '1fr 300px', gap: 20, alignItems: 'start' }}>
        {/* Form */}
        <div className="card card-body">
          {error && (
            <div className="alert alert-error">
              <span className="alert-icon">⚠️</span>{error}
            </div>
          )}

          <form onSubmit={submit}>
            <div className="form-group">
              <label className="form-label">Subject <span style={{ color: 'var(--danger)' }}>*</span></label>
              <input
                className="form-control"
                value={form.subject}
                onChange={set('subject')}
                required
                placeholder="e.g. Cannot login to my account"
                maxLength={120}
              />
              <div className="form-hint">{form.subject.length}/120 characters</div>
            </div>

            <div className="form-group">
              <label className="form-label">Description <span style={{ color: 'var(--danger)' }}>*</span></label>
              <textarea
                className="form-control"
                value={form.description}
                onChange={set('description')}
                required
                placeholder="Please describe your issue in detail. Include any error messages, steps to reproduce, and what you've already tried."
                rows={7}
              />
            </div>

            <div className="form-group">
              <label className="form-label">Attachments <span style={{ color: 'var(--gray-400)', fontWeight: 400 }}>(optional)</span></label>
              <div style={{
                border: '2px dashed var(--gray-200)', borderRadius: 10,
                padding: '20px', textAlign: 'center', background: 'var(--gray-50)',
                cursor: 'pointer', transition: 'border-color .2s',
              }}
                onDragOver={(e) => e.preventDefault()}
                onDrop={(e) => {
                  e.preventDefault();
                  setFiles(Array.from(e.dataTransfer.files));
                }}
              >
                <input
                  type="file" multiple id="file-input"
                  accept=".jpg,.jpeg,.png,.gif,.pdf,.doc,.docx,.txt"
                  style={{ display: 'none' }}
                  onChange={(e) => setFiles(Array.from(e.target.files))}
                />
                <label htmlFor="file-input" style={{ cursor: 'pointer' }}>
                  <div style={{ fontSize: '1.8rem', marginBottom: 6 }}>📎</div>
                  <div style={{ fontSize: '.875rem', color: 'var(--gray-600)', fontWeight: 500 }}>
                    Drag files here or <span style={{ color: 'var(--primary)' }}>browse</span>
                  </div>
                  <div style={{ fontSize: '.75rem', color: 'var(--gray-400)', marginTop: 4 }}>
                    JPG, PNG, PDF, DOC, TXT — max 5MB each
                  </div>
                </label>
              </div>
              {files.length > 0 && (
                <div style={{ marginTop: 10, display: 'flex', flexWrap: 'wrap', gap: 8 }}>
                  {files.map((f, i) => (
                    <div key={i} style={{
                      display: 'flex', alignItems: 'center', gap: 6,
                      background: 'var(--primary-light)', padding: '4px 10px',
                      borderRadius: 6, fontSize: '.78rem', color: 'var(--primary)',
                    }}>
                      📄 {f.name}
                      <button type="button" style={{ background: 'none', border: 'none', color: 'var(--primary)', cursor: 'pointer', fontSize: '.9rem' }}
                        onClick={() => setFiles(files.filter((_, j) => j !== i))}>×</button>
                    </div>
                  ))}
                </div>
              )}
            </div>

            <button className="btn btn-primary btn-lg" disabled={loading} style={{ marginTop: 4 }}>
              {loading
                ? <><span className="spinner" style={{ width: 16, height: 16, border: '2px solid rgba(255,255,255,.3)', borderTopColor: '#fff', margin: 0 }} /> Submitting…</>
                : '🚀 Submit Ticket'
              }
            </button>
          </form>
        </div>

        {/* Tips sidebar */}
        <div style={{ display: 'flex', flexDirection: 'column', gap: 14 }}>
          <div className="card card-body" style={{ padding: 18 }}>
            <div style={{ fontWeight: 700, fontSize: '.85rem', color: 'var(--gray-700)', marginBottom: 12 }}>
              ⚡ Auto-Triage
            </div>
            <p style={{ fontSize: '.82rem', color: 'var(--gray-500)', lineHeight: 1.6 }}>
              Your ticket is automatically classified by urgency and routed to the right team based on your description.
            </p>
            <div style={{ marginTop: 14, display: 'flex', flexDirection: 'column', gap: 8 }}>
              {[
                { level: 'Critical', color: '#dc2626', bg: '#fef2f2', hint: 'Outage, breach, cannot login' },
                { level: 'High',     color: '#d97706', bg: '#fffbeb', hint: 'Payment failed, bug, error' },
                { level: 'Medium',   color: '#92400e', bg: '#fffbeb', hint: 'Feature request, question' },
                { level: 'Low',      color: '#166534', bg: '#f0fdf4', hint: 'Feedback, suggestions' },
              ].map((u) => (
                <div key={u.level} style={{ display: 'flex', alignItems: 'center', gap: 8 }}>
                  <span style={{ background: u.bg, color: u.color, fontSize: '.68rem', fontWeight: 700, padding: '2px 7px', borderRadius: 4 }}>{u.level}</span>
                  <span style={{ fontSize: '.75rem', color: 'var(--gray-500)' }}>{u.hint}</span>
                </div>
              ))}
            </div>
          </div>

          <div className="card card-body" style={{ padding: 18 }}>
            <div style={{ fontWeight: 700, fontSize: '.85rem', color: 'var(--gray-700)', marginBottom: 10 }}>
              💡 Tips for faster help
            </div>
            {[
              'Include specific error messages',
              'Mention when the issue started',
              'List steps to reproduce it',
              'Attach screenshots if relevant',
            ].map((tip) => (
              <div key={tip} style={{ display: 'flex', gap: 8, alignItems: 'flex-start', marginBottom: 8 }}>
                <span style={{ color: 'var(--success)', fontSize: '.8rem', marginTop: 1 }}>✓</span>
                <span style={{ fontSize: '.8rem', color: 'var(--gray-500)' }}>{tip}</span>
              </div>
            ))}
          </div>
        </div>
      </div>
    </div>
  );
}
