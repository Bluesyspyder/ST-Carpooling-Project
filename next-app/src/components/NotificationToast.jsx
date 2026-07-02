"use client";
import { useState, useCallback, useEffect, useRef } from 'react';

/**
 * NotificationToast — global overlay for real-time Socket.io notifications.
 *
 * Props:
 *  - notifications: Array<{ id, type, message, title }>
 *  - onDismiss: (id) => void
 */
const NotificationToast = ({ notifications = [], onDismiss }) => {
  if (notifications.length === 0) return null;

  return (
    <div
      className="fixed top-5 right-5 z-[9999] flex flex-col gap-3 max-w-sm w-full pointer-events-none"
      aria-live="polite"
    >
      {notifications.map((n) => (
        <ToastItem key={n.id} notification={n} onDismiss={onDismiss} />
      ))}
    </div>
  );
};

const TYPE_STYLES = {
  success: {
    border: 'border-emerald-500/30',
    bg: 'bg-emerald-950/80',
    icon: '✅',
    bar: 'bg-emerald-400',
    title: 'text-emerald-400',
  },
  info: {
    border: 'border-indigo-500/30',
    bg: 'bg-indigo-950/80',
    icon: '📬',
    bar: 'bg-indigo-400',
    title: 'text-indigo-300',
  },
  warning: {
    border: 'border-amber-500/30',
    bg: 'bg-amber-950/80',
    icon: '⚠',
    bar: 'bg-amber-400',
    title: 'text-amber-300',
  },
  error: {
    border: 'border-red-500/30',
    bg: 'bg-red-950/80',
    icon: '❌',
    bar: 'bg-red-400',
    title: 'text-red-300',
  },
};

const TOAST_DURATION = 5000; // ms

const ToastItem = ({ notification, onDismiss }) => {
  const { id, type = 'info', message, title } = notification;
  const style = TYPE_STYLES[type] || TYPE_STYLES.info;
  const [visible, setVisible] = useState(false);
  const [closing, setClosing] = useState(false);
  const timerRef = useRef(null);

  // Animate in
  useEffect(() => {
    requestAnimationFrame(() => setVisible(true));
    timerRef.current = setTimeout(() => dismiss(), TOAST_DURATION);
    return () => clearTimeout(timerRef.current);
  }, []);

  const dismiss = useCallback(() => {
    setClosing(true);
    setTimeout(() => onDismiss(id), 300);
  }, [id, onDismiss]);

  return (
    <div
      className={`
        pointer-events-auto relative overflow-hidden rounded-xl border backdrop-blur-md
        shadow-2xl transition-all duration-300 ease-out
        ${style.bg} ${style.border}
        ${visible && !closing ? 'translate-x-0 opacity-100' : 'translate-x-full opacity-0'}
      `}
    >
      {/* Progress bar */}
      <div
        className={`absolute bottom-0 left-0 h-0.5 ${style.bar}`}
        style={{ animation: `shrink ${TOAST_DURATION}ms linear forwards` }}
      />

      <div className="flex items-start gap-3 p-4 pr-10">
        <span className="text-xl flex-shrink-0 mt-0.5">{style.icon}</span>
        <div className="flex-1 min-w-0">
          {title && (
            <p className={`text-xs font-bold uppercase tracking-wider mb-0.5 ${style.title}`}>
              {title}
            </p>
          )}
          <p className="text-sm text-slate-200 leading-snug">{message}</p>
        </div>
      </div>

      {/* Close button */}
      <button
        onClick={dismiss}
        className="absolute top-3 right-3 w-6 h-6 rounded-full bg-slate-800/60 hover:bg-slate-700 flex items-center justify-center text-slate-400 hover:text-slate-200 transition text-xs"
      >
        ✕
      </button>

      {/* Shrink keyframes injected inline via style tag */}
      <style>{`
        @keyframes shrink {
          from { width: 100%; }
          to { width: 0%; }
        }
      `}</style>
    </div>
  );
};

/**
 * useNotifications — hook to manage notification state.
 *
 * Returns { notifications, addNotification, dismissNotification }
 *
 * Usage:
 *   const { notifications, addNotification, dismissNotification } = useNotifications();
 *   addNotification({ type: 'success', title: 'Booking Accepted', message: '...' });
 */
export const useNotifications = () => {
  const [notifications, setNotifications] = useState([]);

  const addNotification = useCallback(({ type = 'info', title = '', message = '' }) => {
    const id = `notif-${Date.now()}-${Math.random().toString(36).slice(2)}`;
    setNotifications((prev) => [...prev.slice(-4), { id, type, title, message }]); // max 5
  }, []);

  const dismissNotification = useCallback((id) => {
    setNotifications((prev) => prev.filter((n) => n.id !== id));
  }, []);

  return { notifications, addNotification, dismissNotification };
};

export default NotificationToast;
