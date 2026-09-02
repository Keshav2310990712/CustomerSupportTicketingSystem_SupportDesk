import React, { useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { useAuth } from '../context/AuthContext';

export default function LoginPage() {
  const [mode, setMode]       = useState('login');   // 'login' | 'register'
  const [role, setRole]       = useState('client');
  const [form, setForm]       = useState({ name: '', email: '', password: '', department: 'general' });
  const [error, setError]     = useState('');
  const [loading, setLoading] = useState(false);
  const { login, register }   = useAuth();
  const navigate              = useNavigate();

  const set = (k) => (e) => setForm((f) => ({ ...f, [k]: e.target.value }));

  const submit = async (e) => {
    e.preventDefault();
    setError(''); setLoading(true);
    try {
      const u = mode === 'login'
        ? await login(form.email, form.password)
        : await register({ ...form, role });
      navigate(u.role === 'agent' ? '/agent' : '/client');
    } catch (err) {
      setError(err.response?.data?.message || 'Something went wrong. Please try again.');
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="auth-page">
      {/* ── Left panel ── */}
      <div className="auth-left">
        <div className="auth-left-logo">
          <div className="auth-left-logo-icon">🛡</div>
          ResolveHub
        </div>

        <div>
          <div className="auth-left-headline">
            Support that <span>moves faster</span> than your problems.
          </div>
          <div className="auth-left-sub">
            AI-powered ticket triage, smart routing, and real-time updates — all in one place.
          </div>
          <div className="auth-features">
            {[
              { icon: '⚡', text: 'Auto-classify tickets by urgency & department' },
              { icon: '🤖', text: 'Smart agent routing with load balancing' },
              { icon: '📡', text: 'Real-time dashboard updates via WebSocket' },
              { icon: '⏱',  text: 'SLA tracking with automatic breach alerts' },
            ].map((f) => (
              <div className="auth-feature" key={f.text}>
                <div className="auth-feature-icon">{f.icon}</div>
                <div className="auth-feature-text">{f.text}</div>
              </div>
            ))}
          </div>
        </div>

        <div style={{ fontSize: '.78rem', color: '#6366f1' }}>
          © 2026 ResolveHub · Built with MERN Stack
        </div>
      </div>

      {/* ── Right panel ── */}
      <div className="auth-right">
        <div className="auth-box">
          <div className="auth-box-title">
            {mode === 'login' ? 'Welcome back 👋' : 'Create account'}
          </div>
          <div className="auth-box-sub">
            {mode === 'login'
              ? 'Sign in to your ResolveHub account'
              : 'Get started — it only takes a minute'}
          </div>

          {/* Role switch — only on register */}
          {mode === 'register' && (
            <div className="role-switch">
              <button
                type="button"
                className={`role-btn ${role === 'client' ? 'active' : ''}`}
                onClick={() => setRole('client')}
              >
                👤 Client
              </button>
              <button
                type="button"
                className={`role-btn ${role === 'agent' ? 'active' : ''}`}
                onClick={() => setRole('agent')}
              >
                🧑‍💼 Support Agent
              </button>
            </div>
          )}

          {error && (
            <div className="alert alert-error">
              <span className="alert-icon">⚠️</span>
              {error}
            </div>
          )}

          <form onSubmit={submit}>
            {mode === 'register' && (
              <div className="form-group">
                <label className="form-label">Full Name <span>*</span></label>
                <div className="input-group">
                  <span className="input-icon">👤</span>
                  <input className="form-control" value={form.name} onChange={set('name')} required placeholder="Jane Doe" />
                </div>
              </div>
            )}

            <div className="form-group">
              <label className="form-label">Email Address <span>*</span></label>
              <div className="input-group">
                <span className="input-icon">✉️</span>
                <input className="form-control" type="email" value={form.email} onChange={set('email')} required placeholder="you@example.com" />
              </div>
            </div>

            <div className="form-group">
              <label className="form-label">Password <span>*</span></label>
              <div className="input-group">
                <span className="input-icon">🔒</span>
                <input className="form-control" type="password" value={form.password} onChange={set('password')} required placeholder="Min. 6 characters" minLength={6} />
              </div>
            </div>

            {mode === 'register' && role === 'agent' && (
              <div className="form-group">
                <label className="form-label">Department <span>*</span></label>
                <select className="form-control" value={form.department} onChange={set('department')}>
                  <option value="general">🌐 General</option>
                  <option value="billing">💳 Billing</option>
                  <option value="technical">⚙️ Technical</option>
                  <option value="sales">💼 Sales</option>
                </select>
              </div>
            )}

            <button className="btn btn-primary btn-block btn-lg" style={{ marginTop: 4 }} disabled={loading}>
              {loading
                ? <><span className="spinner" style={{ width: 16, height: 16, border: '2px solid rgba(255,255,255,.3)', borderTopColor: '#fff', margin: 0 }} /> Please wait…</>
                : mode === 'login' ? '→ Sign In' : '→ Create Account'
              }
            </button>
          </form>

          <div className="auth-divider">or</div>

          <div className="auth-toggle">
            {mode === 'login' ? "Don't have an account? " : 'Already have an account? '}
            <a onClick={() => { setMode(mode === 'login' ? 'register' : 'login'); setError(''); }}>
              {mode === 'login' ? 'Register free' : 'Sign in'}
            </a>
          </div>

          {/* Demo hint */}
          <div style={{
            marginTop: 20, padding: '12px 16px',
            background: 'var(--primary-light)', borderRadius: 10,
            fontSize: '.78rem', color: 'var(--primary)',
            border: '1px solid #c7d2fe',
          }}>
            💡 <strong>Demo:</strong> Register as a <strong>Client</strong> to submit tickets, or as an <strong>Agent</strong> to manage them.
          </div>
        </div>
      </div>
    </div>
  );
}
