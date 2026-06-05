import React, { useState, useEffect } from 'react';
import { useNavigate, useLocation, Link } from 'react-router-dom';
import api from '../../services/api.js';

const ResetPassword = () => {
  const [newPassword, setNewPassword] = useState('');
  const [confirmPassword, setConfirmPassword] = useState('');
  const [email, setEmail] = useState('');
  const [otp, setOtp] = useState('');
  const [error, setError] = useState('');
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [success, setSuccess] = useState(false);
  const navigate = useNavigate();
  const location = useLocation();

  useEffect(() => {
    // Get email and otp from navigation state or redirect to forgot password
    if (location.state?.email && location.state?.otp) {
      setEmail(location.state.email);
      setOtp(location.state.otp);
    } else {
      navigate('/forgot-password');
    }
  }, [location, navigate]);

  const handleSubmit = async (e) => {
    e.preventDefault();
    setError('');

    // Validation
    if (newPassword.length < 6) {
      setError('Password must be at least 6 characters');
      return;
    }

    if (newPassword !== confirmPassword) {
      setError('Passwords do not match');
      return;
    }

    setIsSubmitting(true);
    try {
      await api.post('/auth/reset-password', {
        email,
        otp,
        newPassword,
      });
      setSuccess(true);
      // Redirect to login page after 3 seconds
      setTimeout(() => {
        navigate('/login');
      }, 3000);
    } catch (err) {
      setError(err.response?.data?.message || 'Password reset failed. Please try again.');
    } finally {
      setIsSubmitting(false);
    }
  };

  if (success) {
    return (
      <div className="min-h-[calc(100vh-73px)] bg-slate-950 flex flex-col justify-center py-12 px-4 sm:px-6 lg:px-8 relative">
        <div className="absolute top-1/4 left-1/2 -translate-x-1/2 w-80 h-80 bg-emerald-500/5 blur-[120px] rounded-full pointer-events-none"></div>

        <div className="sm:mx-auto sm:w-full sm:max-w-md">
          <div className="glass-panel py-12 px-4 shadow-2xl rounded-2xl sm:px-10 text-center">
            <div className="mx-auto flex items-center justify-center h-12 w-12 rounded-full bg-emerald-500/10 mb-4">
              <svg className="h-6 w-6 text-emerald-400" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M5 13l4 4L19 7" />
              </svg>
            </div>
            <h2 className="text-2xl font-extrabold text-slate-100 mb-2">
              Password Reset Successful
            </h2>
            <p className="text-slate-400 mb-6">
              Your password has been reset successfully. Redirecting to login...
            </p>
            <Link
              to="/login"
              className="inline-block px-6 py-2 bg-emerald-400 text-slate-950 rounded-lg font-bold hover:bg-emerald-500 transition"
            >
              Go to Login
            </Link>
          </div>
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-[calc(100vh-73px)] bg-slate-950 flex flex-col justify-center py-12 px-4 sm:px-6 lg:px-8 relative">
      <div className="absolute top-1/4 left-1/2 -translate-x-1/2 w-80 h-80 bg-emerald-500/5 blur-[120px] rounded-full pointer-events-none"></div>

      <div className="sm:mx-auto sm:w-full sm:max-w-md">
        <h2 className="mt-6 text-center text-3xl font-extrabold text-slate-100">
          Reset Password
        </h2>
        <p className="mt-2 text-center text-sm text-slate-400">
          Enter your new password
        </p>
      </div>

      <div className="mt-8 sm:mx-auto sm:w-full sm:max-w-md">
        <div className="glass-panel py-8 px-4 shadow-2xl rounded-2xl sm:px-10">
          {error && (
            <div className="mb-4 bg-red-950/40 border border-red-500/20 text-red-400 p-4 rounded-lg text-sm">
              {error}
            </div>
          )}

          <form className="space-y-6" onSubmit={handleSubmit}>
            <div>
              <label htmlFor="newPassword" className="block text-sm font-medium text-slate-300">
                New Password
              </label>
              <input
                id="newPassword"
                name="newPassword"
                type="password"
                required
                value={newPassword}
                onChange={(e) => setNewPassword(e.target.value)}
                className="mt-1 appearance-none block w-full px-3 py-2 border border-slate-800 rounded-lg bg-slate-900/50 placeholder-slate-500 text-slate-100 focus:outline-none focus:ring-2 focus:ring-emerald-500/50 focus:border-emerald-500 sm:text-sm"
                placeholder="Min 6 characters"
              />
            </div>

            <div>
              <label htmlFor="confirmPassword" className="block text-sm font-medium text-slate-300">
                Confirm Password
              </label>
              <input
                id="confirmPassword"
                name="confirmPassword"
                type="password"
                required
                value={confirmPassword}
                onChange={(e) => setConfirmPassword(e.target.value)}
                className="mt-1 appearance-none block w-full px-3 py-2 border border-slate-800 rounded-lg bg-slate-900/50 placeholder-slate-500 text-slate-100 focus:outline-none focus:ring-2 focus:ring-emerald-500/50 focus:border-emerald-500 sm:text-sm"
                placeholder="Confirm your password"
              />
            </div>

            <button
              type="submit"
              disabled={isSubmitting}
              className="w-full flex justify-center py-2.5 px-4 border border-transparent rounded-lg shadow-sm text-sm font-bold text-slate-950 bg-emerald-400 hover:bg-emerald-500 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-emerald-500 transition duration-150 disabled:opacity-50"
            >
              {isSubmitting ? 'Resetting...' : 'Reset Password'}
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

export default ResetPassword;
