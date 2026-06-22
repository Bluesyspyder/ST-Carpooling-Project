"use client";
import Link from 'next/link';
import { useRouter } from 'next/navigation';
import { useState } from 'react';

import { useAuth } from '@/hooks/useAuth';

const Login = () => {
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [error, setError] = useState('');
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [showPassword, setShowPassword] = useState(false);
  
  const { login } = useAuth();
  const navigate = useRouter();

  const handleSubmit = async (e) => {
    e.preventDefault();
    setError('');
    setIsSubmitting(true);
    try {
      await login(email.trim().toLowerCase(), password);
      navigate.push('/');
    } catch (err) {
      setError(
        err.response?.data?.message ||
        'Login server is unavailable. Please make sure the backend is running.'
      );
    } finally {
      setIsSubmitting(false);
    }
  };

  return (
    <div className="min-h-[calc(100vh-73px)] relative py-8 px-4 sm:px-6 lg:px-8 flex flex-col justify-center">
      <div className="sm:mx-auto sm:w-full sm:max-w-md">
        <p className="text-[var(--color-transit-muted)] font-bold uppercase tracking-widest text-[10px] mb-2 text-center">SYS. MSG // AUTHENTICATION</p>
        <h2 className="mt-2 text-center text-3xl font-['Space_Grotesk'] font-bold text-white uppercase tracking-widest">
          Welcome back
        </h2>
        <p className="mt-2 text-center text-sm text-[var(--color-transit-muted)]">
          Or{' '}
          <Link href="/register" className="font-bold text-[var(--color-transit-accent)] hover:text-white transition-colors uppercase tracking-wide">
            register for a new account
          </Link>
        </p>
      </div>

      <div className="mt-8 sm:mx-auto sm:w-full sm:max-w-md">
        <div className="transit-panel">
          {error && (
            <div className="mb-6 border border-red-500/50 bg-red-500/10 text-red-500 p-4 text-sm font-bold uppercase tracking-wide">
              ⚠ {error}
            </div>
          )}

          <form className="space-y-6" onSubmit={handleSubmit}>
            <div>
              <label htmlFor="email" className="block text-xs font-bold text-[var(--color-transit-muted)] uppercase tracking-widest mb-2">
                Email address
              </label>
              <input
                id="email"
                name="email"
                type="email"
                required
                value={email}
                onChange={(e) => setEmail(e.target.value)}
                className="transit-input"
                placeholder="NAME@EXAMPLE.COM"
              />
            </div>

            <div>
              <label htmlFor="password" className="block text-xs font-bold text-[var(--color-transit-muted)] uppercase tracking-widest mb-2 flex justify-between">
                <span>Password</span>
                <Link href="/forgot-password" className="text-[10px] text-[var(--color-transit-accent)] hover:text-white">
                  FORGOT PASSWORD?
                </Link>
              </label>
              <div className="relative">
                <input
                  id="password"
                  name="password"
                  type={showPassword ? "text" : "password"}
                  required
                  value={password}
                  onChange={(e) => setPassword(e.target.value)}
                  className="transit-input pr-10"
                  placeholder="••••••••"
                />
                <button
                  type="button"
                  onClick={() => setShowPassword(!showPassword)}
                  className="absolute inset-y-0 right-0 flex items-center pr-3 text-[var(--color-transit-muted)] hover:text-white cursor-pointer"
                >
                  {showPassword ? (
                    <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M13.875 18.825A10.05 10.05 0 0112 19c-4.478 0-8.268-2.943-9.543-7a9.97 9.97 0 011.563-3.029m5.858.908a3 3 0 114.243 4.243M9.878 9.878l4.242 4.242M9.88 9.88l-3.29-3.29m7.532 7.532l3.29 3.29M3 3l3.59 3.59m0 0A9.953 9.953 0 0112 5c4.478 0 8.268 2.943 9.543 7a10.025 10.025 0 01-4.132 5.411m0 0L21 21" />
                    </svg>
                  ) : (
                    <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M15 12a3 3 0 11-6 0 3 3 0 016 0z" />
                      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M2.458 12C3.732 7.943 7.523 5 12 5c4.478 0 8.268 2.943 9.542 7-1.274 4.057-5.064 7-9.542 7-4.477 0-8.268-2.943-9.542-7z" />
                    </svg>
                  )}
                </button>
              </div>
            </div>

            <div>
              <button
                type="submit"
                disabled={isSubmitting}
                className="w-full bg-[var(--color-transit-accent)] text-black font-bold uppercase tracking-widest py-3 hover:bg-white transition-colors disabled:opacity-50"
              >
                {isSubmitting ? 'SIGNING IN...' : 'SIGN IN'}
              </button>
            </div>
          </form>
        </div>
      </div>
    </div>
  );
};

export default Login;
