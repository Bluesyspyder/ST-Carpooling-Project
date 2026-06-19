import { useEffect, useState } from 'react';
import { useSearchParams, Link } from 'react-router-dom';
import api from '../../services/api.js';

/**
 * Email verification landing page.
 * Activated when user clicks the link in their verification email: /verify-email?token=xxx
 */
const VerifyEmail = () => {
  const [searchParams] = useSearchParams();
  const token = searchParams.get('token');

  const [status, setStatus] = useState('loading'); // 'loading' | 'success' | 'error'
  const [message, setMessage] = useState('');

  useEffect(() => {
    if (!token) {
      setStatus('error');
      setMessage('Invalid verification link. No token provided.');
      return;
    }

    const verify = async () => {
      try {
        await api.get(`/auth/verify-email?token=${token}`);
        setStatus('success');
      } catch (err) {
        setStatus('error');
        setMessage(err.response?.data?.message || 'Verification failed. The link may have expired.');
      }
    };

    verify();
  }, [token]);

  return (
    <div className="min-h-[calc(100vh-73px)] bg-slate-950 flex flex-col items-center justify-center px-4 relative">
      <div className="absolute top-1/3 left-1/2 -translate-x-1/2 w-96 h-96 bg-emerald-500/5 blur-[140px] rounded-full pointer-events-none" />

      <div className="glass-panel max-w-md w-full p-10 rounded-2xl border border-slate-800/80 text-center relative">

        {status === 'loading' && (
          <>
            <div className="w-16 h-16 mx-auto mb-6 rounded-full bg-slate-800 border border-slate-700 flex items-center justify-center">
              <div className="w-8 h-8 border-2 border-emerald-400 border-t-transparent rounded-full animate-spin" />
            </div>
            <h1 className="text-xl font-bold text-slate-100 mb-2">Verifying your email...</h1>
            <p className="text-slate-400 text-sm">This will only take a moment.</p>
          </>
        )}

        {status === 'success' && (
          <>
            <div className="w-20 h-20 mx-auto mb-6 rounded-full bg-emerald-500/10 border border-emerald-500/20 flex items-center justify-center">
              <svg className="w-10 h-10 text-emerald-400" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M5 13l4 4L19 7" />
              </svg>
            </div>
            <h1 className="text-2xl font-extrabold text-slate-100 mb-3">Email Verified!</h1>
            <p className="text-slate-400 text-sm leading-relaxed mb-8">
              Your @st.com email has been verified. Your account is now fully active.
            </p>
            <Link
              to="/login"
              className="block w-full py-3 px-4 bg-emerald-400 hover:bg-emerald-500 text-slate-950 font-bold rounded-xl transition-all duration-200 text-sm"
            >
              Sign in to your account
            </Link>
          </>
        )}

        {status === 'error' && (
          <>
            <div className="w-20 h-20 mx-auto mb-6 rounded-full bg-red-500/10 border border-red-500/20 flex items-center justify-center">
              <svg className="w-10 h-10 text-red-400" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
              </svg>
            </div>
            <h1 className="text-2xl font-extrabold text-slate-100 mb-3">Verification Failed</h1>
            <p className="text-slate-400 text-sm leading-relaxed mb-6">{message}</p>
            <Link
              to="/check-email"
              className="block w-full py-3 px-4 bg-slate-800 hover:bg-slate-700 border border-slate-700 text-slate-300 font-semibold rounded-xl transition-all duration-200 text-sm mb-3"
            >
              Request a new verification email
            </Link>
            <Link
              to="/login"
              className="block text-sm text-emerald-400 hover:text-emerald-300 font-semibold"
            >
              Back to sign in
            </Link>
          </>
        )}
      </div>
    </div>
  );
};

export default VerifyEmail;
