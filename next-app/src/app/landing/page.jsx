"use client";
import Link from 'next/link';


import { useAuth } from '@/hooks/useAuth';

/**
 * Public marketing / hero page — shown to unauthenticated visitors.
 * Authenticated users are redirected to the Dashboard via GuestRoute.
 */
const Landing = () => {
  const { user } = useAuth();

  return (
    <div className="min-h-[calc(100vh-73px)] bg-slate-950 text-slate-100 flex flex-col">
      {/* ── Hero ── */}
      <main className="flex-grow flex flex-col items-center text-center px-4 sm:px-6 lg:px-8 py-16 lg:py-24 relative overflow-hidden">
        {/* Ambient glow blobs */}
        <div className="absolute top-1/4 left-1/2 -translate-x-1/2 w-[500px] h-[500px] bg-emerald-500/8 blur-[140px] rounded-full pointer-events-none" />
        <div className="absolute top-1/3 left-1/4 w-80 h-80 bg-indigo-500/8 blur-[120px] rounded-full pointer-events-none" />
        <div className="absolute bottom-1/4 right-1/4 w-80 h-80 bg-teal-500/6 blur-[120px] rounded-full pointer-events-none" />

        {/* Headline */}
        <h1 className="text-5xl sm:text-7xl font-extrabold tracking-tight mb-6 bg-gradient-to-br from-emerald-400 via-teal-300 to-indigo-400 bg-clip-text text-transparent leading-tight max-w-4xl">
          Commute Smarter.<br />Together.
        </h1>

        <p className="text-lg sm:text-xl text-slate-400 max-w-2xl mb-12 leading-relaxed">
          Connect with fellow ST employees heading your way. Share rides, cut costs,
          reduce emissions — and build a stronger community, one commute at a time.
        </p>

        {/* CTA Buttons */}
        <div className="flex flex-col sm:flex-row gap-4 mb-20 justify-center">
          {user ? (
            user.role === 'hybrid' ? (
              <>
                <Link
                  href="/create-ride"
                  className="px-8 py-4 bg-emerald-400 hover:bg-emerald-500 text-slate-950 rounded-2xl transition-all duration-200 font-bold text-base shadow-xl shadow-emerald-500/25 hover:shadow-emerald-500/40 hover:scale-105"
                >
                  Offer Rides
                </Link>
                <Link
                  href="/search"
                  className="px-8 py-4 border border-slate-700 hover:border-emerald-500/40 hover:bg-slate-900 text-slate-300 hover:text-emerald-400 rounded-2xl transition-all duration-200 font-semibold text-base"
                >
                  Find Rides
                </Link>
              </>
            ) : (
              <Link
                href="/search"
                className="px-8 py-4 bg-emerald-400 hover:bg-emerald-500 text-slate-950 rounded-2xl transition-all duration-200 font-bold text-base shadow-xl shadow-emerald-500/25 hover:shadow-emerald-500/40 hover:scale-105"
              >
                Find your ride
              </Link>
            )
          ) : (
            <>
              <Link
                href="/register"
                className="px-8 py-4 bg-emerald-400 hover:bg-emerald-500 text-slate-950 rounded-2xl transition-all duration-200 font-bold text-base shadow-xl shadow-emerald-500/25 hover:shadow-emerald-500/40 hover:scale-105"
              >
                Get Started — It's Free
              </Link>
              <Link
                href="/login"
                className="px-8 py-4 border border-slate-700 hover:border-emerald-500/40 hover:bg-slate-900 text-slate-300 hover:text-emerald-400 rounded-2xl transition-all duration-200 font-semibold text-base"
              >
                Sign In to Your Account
              </Link>
            </>
          )}
        </div>

        {/* Stats strip */}
        <div className="flex flex-wrap justify-center gap-8 sm:gap-16 mb-20 text-center">
          {[
            { value: '100%', label: 'Free Forever' },
            { value: '@st.com', label: 'ST Employees Only' },
            { value: '↓60%', label: 'Less Emissions' },
          ].map(({ value, label }) => (
            <div key={label}>
              <p className="text-3xl font-extrabold text-emerald-400">{value}</p>
              <p className="text-xs text-slate-500 mt-1 font-medium">{label}</p>
            </div>
          ))}
        </div>

        {/* Feature Cards */}
        <div className="w-full max-w-5xl grid md:grid-cols-3 gap-6">

          {/* Feature 1 — Eco */}
          <div className="glass-card p-8 rounded-2xl text-left group hover:scale-[1.02] transition-all duration-300">
            <div className="w-14 h-14 rounded-2xl bg-emerald-500/10 border border-emerald-500/20 flex items-center justify-center mb-6 group-hover:bg-emerald-500/20 transition-all duration-300">
              <svg className="w-7 h-7 text-emerald-400" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1.8} d="M3.055 11H5a2 2 0 012 2v1a2 2 0 002 2 2 2 0 012 2v2.945M8 3.935V5.5A2.5 2.5 0 0010.5 8h.5a2 2 0 012 2 2 2 0 104 0 2 2 0 012-2h1.064M15 20.488V18a2 2 0 012-2h3.064M21 12a9 9 0 11-18 0 9 9 0 0118 0z" />
              </svg>
            </div>
            <div className="inline-flex items-center gap-1.5 px-2.5 py-1 rounded-full text-xs font-semibold bg-emerald-500/10 text-emerald-400 border border-emerald-500/15 mb-4">
              🌱 Eco Impact
            </div>
            <h3 className="text-xl font-bold text-slate-100 mb-3">Reduce Carbon Emissions</h3>
            <p className="text-slate-400 text-sm leading-relaxed">
              Every shared ride takes one car off the road. By carpooling, you directly cut CO₂ emissions per trip — helping fight climate change one commute at a time.
            </p>
            <div className="mt-5 pt-5 border-t border-slate-700/50 flex items-center gap-2">
              <div className="w-2 h-2 bg-emerald-400 rounded-full animate-pulse" />
              <span className="text-xs text-emerald-400 font-semibold">Up to 60% fewer emissions per ride</span>
            </div>
          </div>

          {/* Feature 2 — Free */}
          <div className="glass-card p-8 rounded-2xl text-left group hover:scale-[1.02] transition-all duration-300">
            <div className="w-14 h-14 rounded-2xl bg-amber-500/10 border border-amber-500/20 flex items-center justify-center mb-6 group-hover:bg-amber-500/20 transition-all duration-300">
              <svg className="w-7 h-7 text-amber-400" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1.8} d="M12 8c-1.657 0-3 .895-3 2s1.343 2 3 2 3 .895 3 2-1.343 2-3 2m0-8c1.11 0 2.08.402 2.599 1M12 8V7m0 1v8m0 0v1m0-1c-1.11 0-2.08-.402-2.599-1M21 12a9 9 0 11-18 0 9 9 0 0118 0z" />
              </svg>
            </div>
            <div className="inline-flex items-center gap-1.5 px-2.5 py-1 rounded-full text-xs font-semibold bg-amber-500/10 text-amber-400 border border-amber-500/15 mb-4">
              💎 Earn Rewards
            </div>
            <h3 className="text-xl font-bold text-slate-100 mb-3">Free to Use — Earn Carbon Credits</h3>
            <p className="text-slate-400 text-sm leading-relaxed">
              Our platform is completely free for every ST employee. And every green ride earns you{' '}
              <span className="text-amber-400 font-semibold">Carbon Credits</span> — redeemable for rewards and recognition.
            </p>
            <div className="mt-5 pt-5 border-t border-slate-700/50 flex items-center gap-2">
              <div className="w-2 h-2 bg-amber-400 rounded-full animate-pulse" />
              <span className="text-xs text-amber-400 font-semibold">Zero cost · Real rewards</span>
            </div>
          </div>

          {/* Feature 3 — Community */}
          <div className="glass-card p-8 rounded-2xl text-left group hover:scale-[1.02] transition-all duration-300">
            <div className="w-14 h-14 rounded-2xl bg-indigo-500/10 border border-indigo-500/20 flex items-center justify-center mb-6 group-hover:bg-indigo-500/20 transition-all duration-300">
              <svg className="w-7 h-7 text-indigo-400" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1.8} d="M17 20h5v-2a3 3 0 00-5.356-1.857M17 20H7m10 0v-2c0-.656-.126-1.283-.356-1.857M7 20H2v-2a3 3 0 015.356-1.857M7 20v-2c0-.656.126-1.283.356-1.857m0 0a5.002 5.002 0 019.288 0M15 7a3 3 0 11-6 0 3 3 0 016 0z" />
              </svg>
            </div>
            <div className="inline-flex items-center gap-1.5 px-2.5 py-1 rounded-full text-xs font-semibold bg-indigo-500/10 text-indigo-400 border border-indigo-500/15 mb-4">
              🤝 Community
            </div>
            <h3 className="text-xl font-bold text-slate-100 mb-3">Stronger ST Family Together</h3>
            <p className="text-slate-400 text-sm leading-relaxed">
              Carpooling creates bonds. Ride with fellow ST members, share conversations, build friendships, and create a stronger sense of belonging — every trip counts.
            </p>
            <div className="mt-5 pt-5 border-t border-slate-700/50 flex items-center gap-2">
              <div className="w-2 h-2 bg-indigo-400 rounded-full animate-pulse" />
              <span className="text-xs text-indigo-400 font-semibold">Built for ST. By ST.</span>
            </div>
          </div>
        </div>
      </main>

      {/* ── Footer ── */}
      <footer className="border-t border-slate-800/60 py-8 text-center text-xs text-slate-600">
        ST Carpooling Platform — Internal Employee Use Only · @st.com accounts only
      </footer>
    </div>
  );
};

export default Landing;
