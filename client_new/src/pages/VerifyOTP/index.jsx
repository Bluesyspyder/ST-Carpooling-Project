import { useState, useEffect } from 'react';
import { useNavigate, useLocation, Link } from 'react-router-dom';
import api from '../../services/api.js';

const VerifyOTP = () => {
  const [otp, setOtp] = useState('');
  const [error, setError] = useState('');
  const [isSubmitting, setIsSubmitting] = useState(false);
  const navigate = useNavigate();
  const location = useLocation();
  const email = location.state?.email || '';

  useEffect(() => {
    if (!email) {
      navigate('/forgot-password');
    }
  }, [email, navigate]);

  const handleChange = (e) => {
    const value = e.target.value.replace(/\D/g, ''); // Only allow digits
    if (value.length <= 4) {
      setOtp(value);
    }
  };

  const handleSubmit = async (e) => {
    e.preventDefault();
    setError('');

    if (otp.length !== 4) {
      setError('Please enter a valid 4-digit OTP');
      return;
    }

    setIsSubmitting(true);
    try {
      await api.post('/auth/verify-otp', { email, otp });
      // Redirect to reset password page
      navigate('/reset-password', { state: { email, otp } });
    } catch (err) {
      setError(err.response?.data?.message || 'OTP verification failed. Please try again.');
    } finally {
      setIsSubmitting(false);
    }
  };

  return (
    <div className="min-h-[calc(100vh-73px)] bg-slate-950 flex flex-col justify-center py-12 px-4 sm:px-6 lg:px-8 relative">
      <div className="absolute top-1/4 left-1/2 -translate-x-1/2 w-80 h-80 bg-emerald-500/5 blur-[120px] rounded-full pointer-events-none"></div>

      <div className="sm:mx-auto sm:w-full sm:max-w-md">
        <h2 className="mt-6 text-center text-3xl font-extrabold text-slate-100">
          Verify OTP
        </h2>
        <p className="mt-2 text-center text-sm text-slate-400">
          Enter the 4-digit code sent to<br/>
          <span className="text-slate-300 font-medium">{email}</span>
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
              <label htmlFor="otp" className="block text-sm font-medium text-slate-300 text-center">
                Enter OTP
              </label>
              <input
                id="otp"
                name="otp"
                type="text"
                inputMode="numeric"
                maxLength="4"
                required
                value={otp}
                onChange={handleChange}
                className="mt-4 appearance-none block w-full px-6 py-4 text-4xl text-center tracking-[1.5rem] border-2 border-slate-800 rounded-lg bg-slate-900/50 placeholder-slate-500 text-emerald-400 font-bold focus:outline-none focus:ring-2 focus:ring-emerald-500/50 focus:border-emerald-500 sm:text-sm"
                placeholder="0000"
              />
            </div>

            <button
              type="submit"
              disabled={isSubmitting || otp.length !== 4}
              className="w-full flex justify-center py-2.5 px-4 border border-transparent rounded-lg shadow-sm text-sm font-bold text-slate-950 bg-emerald-400 hover:bg-emerald-500 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-emerald-500 transition duration-150 disabled:opacity-50"
            >
              {isSubmitting ? 'Verifying...' : 'Verify OTP'}
            </button>
          </form>

          <div className="mt-6 space-y-2 text-center text-sm">
            <p className="text-slate-400">
              Didn't receive the code?{' '}
              <Link to="/forgot-password" className="text-emerald-400 hover:text-emerald-300">
                Try again
              </Link>
            </p>
            <Link to="/login" className="block text-slate-400 hover:text-emerald-400">
              Back to login
            </Link>
          </div>
        </div>
      </div>
    </div>
  );
};

export default VerifyOTP;
