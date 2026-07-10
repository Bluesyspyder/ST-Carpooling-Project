"use client";
import { useEffect, useState, Suspense } from 'react';
import { useRouter, useSearchParams } from 'next/navigation';
import api from '@/services/api';
import Link from 'next/link';

const VerifyEmailContent = () => {
  const router = useRouter();
  const searchParams = useSearchParams();
  const token = searchParams.get('token');

  const [status, setStatus] = useState('verifying'); // 'verifying', 'success', 'error'
  const [message, setMessage] = useState('');

  useEffect(() => {
    if (!token) {
      setStatus('error');
      setMessage('No verification token provided. Please check your email link.');
      return;
    }

    const verifyToken = async () => {
      try {
        const res = await api.post('/auth/verify-email', { token });
        setStatus('success');
        setMessage(res.data.message || 'Your email has been verified successfully!');
      } catch (err) {
        setStatus('error');
        setMessage(err.response?.data?.message || 'Invalid or expired verification link.');
      }
    };

    verifyToken();
  }, [token]);

  return (
    <div className="w-full max-w-md mx-auto p-8 glass-panel rounded-3xl shadow-2xl relative overflow-hidden">
      <div className="absolute -top-12 -right-12 w-32 h-32 bg-emerald-500/10 rounded-full blur-2xl"></div>
      
      <div className="text-center space-y-6">
        {status === 'verifying' && (
          <>
            <div className="w-16 h-16 border-4 border-emerald-400 border-t-transparent rounded-full animate-spin mx-auto mb-4"></div>
            <h2 className="text-2xl font-bold text-slate-100">Verifying Email</h2>
            <p className="text-[var(--text-secondary)] text-sm">Please wait while we verify your account...</p>
          </>
        )}

        {status === 'success' && (
          <>
            <div className="w-16 h-16 bg-emerald-500/20 rounded-full flex items-center justify-center mx-auto mb-4">
              <span className="text-3xl">✅</span>
            </div>
            <h2 className="text-2xl font-bold text-emerald-400">Email Verified!</h2>
            <p className="text-[var(--text-primary)] text-sm leading-relaxed">{message}</p>
            <div className="pt-4">
              <Link href="/login" className="block w-full py-3 px-4 rounded-xl font-bold bg-emerald-500 hover:bg-emerald-600 text-slate-900 transition-colors shadow-lg shadow-emerald-500/20">
                Continue to Login
              </Link>
            </div>
          </>
        )}

        {status === 'error' && (
          <>
            <div className="w-16 h-16 bg-red-500/20 rounded-full flex items-center justify-center mx-auto mb-4">
              <span className="text-3xl">❌</span>
            </div>
            <h2 className="text-2xl font-bold text-red-400">Verification Failed</h2>
            <p className="text-[var(--text-primary)] text-sm leading-relaxed">{message}</p>
            <div className="pt-4">
              <Link href="/login" className="block w-full py-3 px-4 rounded-xl font-bold bg-[var(--bg-surface-hover)] hover:bg-slate-700 text-[var(--text-primary)] transition-colors">
                Back to Login
              </Link>
            </div>
          </>
        )}
      </div>
    </div>
  );
};

export default function VerifyEmailPage() {
  return (
    <div className="min-h-screen bg-[var(--bg-default)] flex items-center justify-center p-4">
      <Suspense fallback={<div className="text-emerald-400">Loading...</div>}>
        <VerifyEmailContent />
      </Suspense>
    </div>
  );
}
