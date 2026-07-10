"use client";
import Link from 'next/link';
import { usePathname } from 'next/navigation';
import { useState } from 'react';

import api from '@/services/api';

/**
 * Shown immediately after registration.
 * Tells the user to check their inbox and provides a resend button.
 */
const CheckEmail = () => {
  const location = usePathname();
  const email = location.state?.email || '';
  const [resending, setResending] = useState(false);
  const [resent, setResent] = useState(false);
  const [error, setError] = useState('');

  const handleResend = async () => {
    setResending(true);
    setError('');
    try {
      await api.post('/auth/resend-verification', { email });
      setResent(true);
    } catch (err) {
      setError(err.response?.data?.message || 'Failed to resend email. Please try again.');
    } finally {
      setResending(false);
    }
  };

  return (
    <div className="min-h-[calc(100vh-73px)] bg-[var(--bg-default)] flex flex-col items-center justify-center px-4 relative">
      <div className="absolute top-1/3 left-1/2 -translate-x-1/2 w-96 h-96 bg-emerald-500/5 blur-[140px] rounded-full pointer-events-none" />

      <div className="glass-panel max-w-md w-full p-10 rounded-2xl border border-[var(--border-subtle)]/80 text-center relative">
        {/* Icon */}
        <div className="w-20 h-20 mx-auto mb-6 rounded-full bg-emerald-500/10 border border-emerald-500/20 flex items-center justify-center">
          <svg className="w-10 h-10 text-emerald-400" fill="none" viewBox="0 0 24 24" stroke="currentColor">
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1.5} d="M3 8l7.89 5.26a2 2 0 002.22 0L21 8M5 19h14a2 2 0 002-2V7a2 2 0 00-2-2H5a2 2 0 00-2 2v10a2 2 0 002 2z" />
          </svg>
        </div>

        <h1 className="text-2xl font-extrabold text-[var(--text-primary)] mb-3">Check your inbox</h1>

        <p className="text-[var(--text-secondary)] text-sm leading-relaxed mb-6">
          We sent a verification link to{' '}
          {email ? (
            <span className="text-emerald-400 font-semibold">{email}</span>
          ) : (
            'your @st.com email address'
          )}.
          {' '}Click the link in the email to activate your account.
        </p>

        {error && (
          <div className="mb-4 bg-red-950/40 border border-red-500/20 text-red-400 p-3 rounded-lg text-sm">
            {error}
          </div>
        )}

        {resent ? (
          <div className="mb-4 bg-emerald-950/40 border border-emerald-500/20 text-emerald-400 p-3 rounded-lg text-sm">
            ✓ Verification email resent successfully!
          </div>
        ) : (
          <button
            onClick={handleResend}
            disabled={resending || !email}
            className="w-full py-3 px-4 bg-[var(--bg-surface-hover)] hover:bg-[var(--bg-surface-hover)] border border-[var(--border-default)] text-[var(--text-primary)] font-semibold rounded-xl transition-all duration-200 text-sm disabled:opacity-50 mb-4"
          >
            {resending ? 'Resending...' : 'Resend verification email'}
          </button>
        )}

        <p className="text-xs text-[var(--text-muted)]">
          Wrong account?{' '}
          <Link href="/login" className="text-emerald-400 hover:text-emerald-300 font-semibold">
            Sign in with a different account
          </Link>
        </p>
      </div>
    </div>
  );
};

export default CheckEmail;
