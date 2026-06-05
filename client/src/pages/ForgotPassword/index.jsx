import React, { useState } from 'react';
import { useNavigate, Link } from 'react-router-dom';
import api from '../../services/api.js';

const ForgotPassword = () => {
  const [email, setEmail] = useState('');
  const [error, setError] = useState('');
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [submitted, setSubmitted] = useState(false);
  const navigate = useNavigate();

  const handleSubmit = async (e) => {
    e.preventDefault();
    setError('');

    // Client-side domain validation
    if (!email.toLowerCase().endsWith('@st.com')) {
      setError('Please enter a valid email address ending with @st.com');
      return;
    }

    setIsSubmitting(true);
    try {
      await api.post('/auth/forgot-password', { email });
      setSubmitted(true);
      // Redirect to OTP verification page after 2 seconds
      setTimeout(() => {
        navigate('/verify-otp', { state: { email } });
      }, 2000);
    } catch (err) {
      setError(err.response?.data?.message || 'Failed to send OTP. Please try again.');
    } finally {
      setIsSubmitting(false);
    }
  };

  return (
    <div className="min-h-[calc(100vh-73px)] bg-slate-950 flex flex-col justify-center py-12 px-4 sm:px-6 lg:px-8 relative">
      <div className="absolute top-1/4 left-1/2 -translate-x-1/2 w-80 h-80 bg-emerald-500/5 blur-[120px] rounded-full pointer-events-none"></div>

      <div className="sm:mx-auto sm:w-full sm:max-w-md">
        <h2 className="mt-6 text-center text-3xl font-extrabold text-slate-100">
          Forgot Password
        </h2>
        <p className="mt-2 text-center text-sm text-slate-400">
          Enter your email address and we'll send you a 4-digit code
        </p>
      </div>

      <div className="mt-8 sm:mx-auto sm:w-full sm:max-w-md">
        <div className="glass-panel py-8 px-4 shadow-2xl rounded-2xl sm:px-10">
          {submitted && (
            <div className="mb-4 bg-emerald-950/40 border border-emerald-500/20 text-emerald-400 p-4 rounded-lg text-sm text-center">
              OTP sent successfully! Redirecting to verification...
            </div>
          )}

          {error && (
            <div className="mb-4 bg-red-950/40 border border-red-500/20 text-red-400 p-4 rounded-lg text-sm">
              {error}
            </div>
          )}

          <form className="space-y-6" onSubmit={handleSubmit}>
            <div>
              <label htmlFor="email" className="block text-sm font-medium text-slate-300">
                Email Address
              </label>
              <input
                id="email"
                name="email"
                type="email"
                autoComplete="email"
                required
                value={email}
                onChange={(e) => setEmail(e.target.value)}
                className="mt-1 appearance-none block w-full px-3 py-2 border border-slate-800 rounded-lg bg-slate-900/50 placeholder-slate-500 text-slate-100 focus:outline-none focus:ring-2 focus:ring-emerald-500/50 focus:border-emerald-500 sm:text-sm"
                placeholder="employee@st.com"
              />
            </div>

            <button
              type="submit"
              disabled={isSubmitting}
              className="w-full flex justify-center py-2.5 px-4 border border-transparent rounded-lg shadow-sm text-sm font-bold text-slate-950 bg-emerald-400 hover:bg-emerald-500 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-emerald-500 transition duration-150 disabled:opacity-50"
            >
              {isSubmitting ? 'Sending...' : 'Send OTP'}
            </button>
          </form>

          <div className="mt-6 text-center">
            <Link to="/login" className="text-sm text-slate-400 hover:text-emerald-400">
              Back to login
            </Link>
          </div>
        </div>
      </div>
    </div>
  );
};

export default ForgotPassword;
