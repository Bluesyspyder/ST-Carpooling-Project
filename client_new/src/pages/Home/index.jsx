import { Link } from 'react-router-dom';
import { useAuth } from '../../hooks/useAuth.js';
import PincodeDirectionsMap from './PincodeDirectionsMap.jsx';

const Home = () => {
  const { user } = useAuth();

  return (
    <div className="min-h-[calc(100vh-73px)] bg-slate-950 text-slate-100 flex flex-col justify-between">
      {/* Hero Section */}
      <main className="w-full max-w-[1680px] mx-auto px-4 sm:px-6 lg:px-8 py-10 lg:py-12 flex-grow flex flex-col items-center text-center relative overflow-hidden">
        <div className="absolute top-1/4 left-1/2 -translate-x-1/2 w-96 h-96 bg-green-500/10 blur-[120px] rounded-full pointer-events-none"></div>
        <div className="absolute top-1/3 left-1/3 w-80 h-80 bg-indigo-500/10 blur-[100px] rounded-full pointer-events-none"></div>

        <span className="inline-flex items-center gap-1.5 px-3 py-1.5 rounded-full text-xs font-semibold bg-emerald-500/10 text-emerald-400 border border-emerald-500/20 mb-6">
          <span className="w-2 h-2 bg-emerald-400 rounded-full animate-ping"></span>
          Eco-Friendly Commuting
        </span>

        <h1 className="text-4xl sm:text-6xl font-extrabold tracking-tight mb-6 bg-gradient-to-r from-emerald-400 via-teal-300 to-indigo-400 bg-clip-text text-transparent">
          Carpool App
        </h1>

        <p className="text-lg sm:text-xl text-slate-400 max-w-3xl mb-10">
          Connect with drivers and passengers heading your way. Share rides, split travel expenses, reduce emissions, and meet amazing people.
        </p>

        <section className="w-full mb-10 text-left">
          <div className="glass-panel rounded-2xl overflow-hidden shadow-2xl border border-slate-800/50">
            <PincodeDirectionsMap />
          </div>
        </section>

        {/* Action cards */}
        <div className="grid md:grid-cols-2 gap-6 w-full">
          <Link to="/search" className="glass-card p-8 rounded-2xl text-left hover:scale-[1.01]">
            <div className="w-12 h-12 bg-emerald-500/15 border border-emerald-500/20 rounded-xl flex items-center justify-center mb-6">
              <svg className="w-6 h-6 text-emerald-400" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M21 21l-6-6m2-5a7 7 0 11-14 0 7 7 0 0114 0z" />
              </svg>
            </div>
            <h3 className="text-xl font-bold text-slate-100 mb-2">Find a Ride</h3>
            <p className="text-slate-400 text-sm">
              Search for active drivers going to your destination and request a booking instantly.
            </p>
          </Link>

          <Link to="/create-ride" className="glass-card p-8 rounded-2xl text-left hover:scale-[1.01]">
            <div className="w-12 h-12 bg-indigo-500/15 border border-indigo-500/20 rounded-xl flex items-center justify-center mb-6">
              <svg className="w-6 h-6 text-indigo-400" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 4v16m8-8H4" />
              </svg>
            </div>
            <h3 className="text-xl font-bold text-slate-100 mb-2">Offer a Ride</h3>
            <p className="text-slate-400 text-sm">
              Register your vehicle, define your source, destination, departure time, and list empty seats.
            </p>
          </Link>
        </div>

        {!user && (
          <div className="mt-12 flex gap-4">
            <Link to="/login" className="px-6 py-3 bg-emerald-500 hover:bg-emerald-600 text-slate-950 font-bold rounded-xl transition duration-200 shadow-lg shadow-emerald-500/10">
              Get Started
            </Link>
            <Link to="/register" className="px-6 py-3 border border-slate-700 hover:bg-slate-900 text-slate-300 font-medium rounded-xl transition duration-200">
              Sign Up
            </Link>
          </div>
        )}

        {/* ── Why Carpool? Feature Section ── */}
        <section className="w-full mt-20">
          <div className="text-center mb-10">
            <span className="inline-block px-3 py-1 rounded-full text-xs font-semibold bg-teal-500/10 text-teal-400 border border-teal-500/20 mb-4">
              Why Choose Us
            </span>
            <h2 className="text-3xl sm:text-4xl font-extrabold text-slate-100 mb-3">
              More than a ride — a movement
            </h2>
            <p className="text-slate-400 max-w-xl mx-auto">
              Every shared journey makes a real difference — for the planet, your wallet, and the ST community.
            </p>
          </div>

          <div className="grid md:grid-cols-3 gap-6">

            {/* Feature 1 — Carbon Emissions */}
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
                <div className="w-2 h-2 bg-emerald-400 rounded-full animate-pulse"></div>
                <span className="text-xs text-emerald-400 font-semibold">Up to 60% fewer emissions per ride</span>
              </div>
            </div>

            {/* Feature 2 — Free + Carbon Credits */}
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
                Our platform is completely free for everyone. And every green ride you take earns you <span className="text-amber-400 font-semibold">Carbon Credits</span> — redeemable for rewards and recognition.
              </p>
              <div className="mt-5 pt-5 border-t border-slate-700/50 flex items-center gap-2">
                <div className="w-2 h-2 bg-amber-400 rounded-full animate-pulse"></div>
                <span className="text-xs text-amber-400 font-semibold">Zero cost · Real rewards</span>
              </div>
            </div>

            {/* Feature 3 — ST Community */}
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
                Carpooling creates bonds. Ride with fellow ST members, share conversations, build friendships, and create a stronger sense of belonging within the ST family — every trip counts.
              </p>
              <div className="mt-5 pt-5 border-t border-slate-700/50 flex items-center gap-2">
                <div className="w-2 h-2 bg-indigo-400 rounded-full animate-pulse"></div>
                <span className="text-xs text-indigo-400 font-semibold">Built for ST. By ST.</span>
              </div>
            </div>

          </div>
        </section>
        {/* ── End Feature Section ── */}

      </main>
    </div>
  );
};

export default Home;
