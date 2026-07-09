"use client";
import Link from 'next/link';
import { useAuth } from '@/hooks/useAuth';
import { motion } from 'framer-motion';

/**
 * Public marketing / hero page — shown to unauthenticated visitors.
 * Authenticated users are redirected to the Dashboard via GuestRoute.
 */
const Landing = () => {
  const { user } = useAuth();

  const containerVariants = {
    hidden: { opacity: 0 },
    show: {
      opacity: 1,
      transition: {
        staggerChildren: 0.2
      }
    }
  };

  const itemVariants = {
    hidden: { opacity: 0, y: 30 },
    show: { opacity: 1, y: 0, transition: { type: "spring", stiffness: 100 } }
  };

  return (
    <div className="min-h-[calc(100dvh-73px)] flex flex-col relative overflow-hidden">
      {/* Ambient glow blobs */}
      <div className="absolute top-1/4 left-1/2 -translate-x-1/2 w-[600px] h-[600px] bg-[var(--primary-base)]/10 blur-[150px] rounded-full pointer-events-none" />
      <div className="absolute top-1/3 left-1/4 w-80 h-80 bg-[var(--secondary-base)]/10 blur-[120px] rounded-full pointer-events-none" />

      {/* ── Hero ── */}
      <main className="flex-grow flex flex-col items-center text-center px-4 sm:px-6 lg:px-8 py-20 lg:py-32 relative z-10">
        
        <motion.div
          variants={containerVariants}
          initial="hidden"
          animate="show"
          className="flex flex-col items-center max-w-4xl w-full"
        >
          {/* Headline */}
          <motion.h1 
            variants={itemVariants}
            className="text-5xl sm:text-7xl md:text-8xl font-extrabold tracking-tight mb-6 bg-gradient-to-br from-[var(--text-primary)] via-[var(--text-primary)] to-[var(--text-secondary)] bg-clip-text text-transparent leading-tight"
          >
            Commute Smarter.<br />Together.
          </motion.h1>

          <motion.p 
            variants={itemVariants}
            className="text-lg sm:text-xl text-[var(--text-secondary)] max-w-2xl mb-12 leading-relaxed font-medium"
          >
            Connect with fellow ST employees heading your way. Share rides, cut costs,
            reduce emissions — and build a stronger community, one commute at a time.
          </motion.p>

          {/* CTA Buttons */}
          <motion.div variants={itemVariants} className="flex flex-col sm:flex-row gap-4 mb-24 w-full justify-center">
            {user ? (
              user.role === 'hybrid' ? (
                <>
                  <Link
                    href="/create-ride"
                    className="btn-primary px-8 py-4 text-base w-full sm:w-auto text-center"
                  >
                    Offer Rides
                  </Link>
                  <Link
                    href="/search"
                    className="glass-panel px-8 py-4 text-[var(--text-primary)] font-semibold hover:bg-[var(--bg-surface)] text-base w-full sm:w-auto text-center"
                  >
                    Find Rides
                  </Link>
                </>
              ) : (
                <Link
                  href="/search"
                  className="btn-primary px-8 py-4 text-base w-full sm:w-auto text-center"
                >
                  Find your ride
                </Link>
              )
            ) : (
              <>
                <Link
                  href="/register"
                  className="btn-primary px-8 py-4 text-base w-full sm:w-auto text-center"
                >
                  Get Started — It's Free
                </Link>
                <Link
                  href="/login"
                  className="glass-panel px-8 py-4 text-[var(--text-primary)] font-semibold hover:bg-[var(--bg-surface)] text-base w-full sm:w-auto text-center"
                >
                  Sign In to Your Account
                </Link>
              </>
            )}
          </motion.div>

          {/* Stats strip */}
          <motion.div variants={itemVariants} className="flex flex-wrap justify-center gap-10 sm:gap-20 mb-24 text-center w-full glass-panel py-8 px-4 border-none bg-transparent shadow-none">
            {[
              { value: '100%', label: 'Free Forever' },
              { value: '@st.com', label: 'ST Employees Only' },
              { value: '↓60%', label: 'Less Emissions' },
            ].map(({ value, label }) => (
              <div key={label} className="flex flex-col items-center">
                <p className="text-3xl md:text-4xl font-extrabold text-[var(--primary-base)]">{value}</p>
                <p className="text-sm text-[var(--text-muted)] mt-2 font-medium tracking-wide">{label}</p>
              </div>
            ))}
          </motion.div>

          {/* Feature Cards */}
          <motion.div variants={itemVariants} className="w-full max-w-6xl grid md:grid-cols-3 gap-6">

            {/* Feature 1 — Eco */}
            <div className="glass-panel glass-panel-hover p-8 text-left group">
              <div className="w-14 h-14 rounded-2xl bg-[var(--primary-base)]/10 border border-[var(--primary-base)]/20 flex items-center justify-center mb-6 group-hover:bg-[var(--primary-base)]/20 transition-all duration-300">
                <svg className="w-7 h-7 text-[var(--primary-base)]" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1.8} d="M3.055 11H5a2 2 0 012 2v1a2 2 0 002 2 2 2 0 012 2v2.945M8 3.935V5.5A2.5 2.5 0 0010.5 8h.5a2 2 0 012 2 2 2 0 104 0 2 2 0 012-2h1.064M15 20.488V18a2 2 0 012-2h3.064M21 12a9 9 0 11-18 0 9 9 0 0118 0z" />
                </svg>
              </div>
              <div className="inline-flex items-center gap-1.5 px-3 py-1 rounded-full text-xs font-semibold bg-[var(--primary-base)]/10 text-[var(--primary-base)] border border-[var(--primary-base)]/15 mb-4">
                🌱 Eco Impact
              </div>
              <h3 className="text-xl font-bold text-[var(--text-primary)] mb-3">Reduce Carbon Emissions</h3>
              <p className="text-[var(--text-secondary)] text-sm leading-relaxed">
                Every shared ride takes one car off the road. By carpooling, you directly cut CO₂ emissions per trip — helping fight climate change one commute at a time.
              </p>
              <div className="mt-6 pt-5 border-t border-[var(--border-subtle)] flex items-center gap-2">
                <div className="w-2 h-2 bg-[var(--primary-base)] rounded-full animate-pulse-slow" />
                <span className="text-xs text-[var(--text-primary)] font-semibold">Up to 60% fewer emissions</span>
              </div>
            </div>

            {/* Feature 2 — Free */}
            <div className="glass-panel glass-panel-hover p-8 text-left group">
              <div className="w-14 h-14 rounded-2xl bg-[var(--secondary-base)]/10 border border-[var(--secondary-base)]/20 flex items-center justify-center mb-6 group-hover:bg-[var(--secondary-base)]/20 transition-all duration-300">
                <svg className="w-7 h-7 text-[var(--secondary-base)]" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1.8} d="M12 8c-1.657 0-3 .895-3 2s1.343 2 3 2 3 .895 3 2-1.343 2-3 2m0-8c1.11 0 2.08.402 2.599 1M12 8V7m0 1v8m0 0v1m0-1c-1.11 0-2.08-.402-2.599-1M21 12a9 9 0 11-18 0 9 9 0 0118 0z" />
                </svg>
              </div>
              <div className="inline-flex items-center gap-1.5 px-3 py-1 rounded-full text-xs font-semibold bg-[var(--secondary-base)]/10 text-[var(--secondary-base)] border border-[var(--secondary-base)]/15 mb-4">
                💎 Earn Rewards
              </div>
              <h3 className="text-xl font-bold text-[var(--text-primary)] mb-3">Free to Use — Earn Credits</h3>
              <p className="text-[var(--text-secondary)] text-sm leading-relaxed">
                Our platform is completely free for every ST employee. And every green ride earns you{' '}
                <span className="text-[var(--text-primary)] font-semibold">Carbon Credits</span> — redeemable for rewards.
              </p>
              <div className="mt-6 pt-5 border-t border-[var(--border-subtle)] flex items-center gap-2">
                <div className="w-2 h-2 bg-[var(--secondary-base)] rounded-full animate-pulse-slow" />
                <span className="text-xs text-[var(--text-primary)] font-semibold">Zero cost · Real rewards</span>
              </div>
            </div>

            {/* Feature 3 — Community */}
            <div className="glass-panel glass-panel-hover p-8 text-left group">
              <div className="w-14 h-14 rounded-2xl bg-[var(--text-primary)]/10 border border-[var(--text-primary)]/20 flex items-center justify-center mb-6 group-hover:bg-[var(--text-primary)]/20 transition-all duration-300">
                <svg className="w-7 h-7 text-[var(--text-primary)]" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1.8} d="M17 20h5v-2a3 3 0 00-5.356-1.857M17 20H7m10 0v-2c0-.656-.126-1.283-.356-1.857M7 20H2v-2a3 3 0 015.356-1.857M7 20v-2c0-.656.126-1.283.356-1.857m0 0a5.002 5.002 0 019.288 0M15 7a3 3 0 11-6 0 3 3 0 016 0z" />
                </svg>
              </div>
              <div className="inline-flex items-center gap-1.5 px-3 py-1 rounded-full text-xs font-semibold bg-[var(--text-primary)]/10 text-[var(--text-primary)] border border-[var(--text-primary)]/15 mb-4">
                🤝 Community
              </div>
              <h3 className="text-xl font-bold text-[var(--text-primary)] mb-3">Stronger ST Family</h3>
              <p className="text-[var(--text-secondary)] text-sm leading-relaxed">
                Carpooling creates bonds. Ride with fellow ST members, share conversations, build friendships, and create a stronger sense of belonging.
              </p>
              <div className="mt-6 pt-5 border-t border-[var(--border-subtle)] flex items-center gap-2">
                <div className="w-2 h-2 bg-[var(--text-primary)] rounded-full animate-pulse-slow" />
                <span className="text-xs text-[var(--text-primary)] font-semibold">Built for ST. By ST.</span>
              </div>
            </div>
          </motion.div>
        </motion.div>
      </main>

      {/* ── Footer ── */}
      <footer className="border-t border-[var(--border-subtle)] py-8 mt-12 text-center text-xs text-[var(--text-muted)] font-medium">
        ST Carpooling Platform — Internal Employee Use Only · @st.com accounts only
      </footer>
    </div>
  );
};

export default Landing;
