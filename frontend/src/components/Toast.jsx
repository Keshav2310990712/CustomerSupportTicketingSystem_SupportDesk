import React from 'react';

const ICONS = { success: '✅', error: '❌', info: 'ℹ️' };

export default function Toast({ toasts }) {
  if (!toasts?.length) return null;
  return (
    <div className="toast-wrap">
      {toasts.map((t) => (
        <div key={t.id} className={`toast ${t.type}`}>
          <span className="toast-icon">{ICONS[t.type] || 'ℹ️'}</span>
          <span>{t.msg}</span>
        </div>
      ))}
    </div>
  );
}

// Hook
let _id = 0;
export function useToast() {
  const [toasts, setToasts] = React.useState([]);
  const show = React.useCallback((msg, type = 'success') => {
    const id = ++_id;
    setToasts((p) => [...p, { id, msg, type }]);
    setTimeout(() => setToasts((p) => p.filter((t) => t.id !== id)), 3500);
  }, []);
  return { toasts, show };
}
