"use client";
import Link from 'next/link';
import { useRouter } from 'next/navigation';
import { useEffect, useState } from 'react';

import { useAuth } from '@/hooks/useAuth';
import api from '@/services/api';
import ProfileCompletionBanner, { useProfileCompletion } from '@/components/ProfileCompletionBanner';
import RideCalendar from "@/components/RideCalendar";
/**
 * Authenticated dashboard — protected route at `/`.
 * Shows role-specific widgets:
 *   - Rider (hybrid): Offer a Ride + Find a Ride action cards + rides they're driving + rider statistics + recent activity feed
 *   - Co-Rider (passenger): Nearby Rides feed + upcoming bookings + passenger statistics + recent activity feed
 */
const rides = [
  {
    id: 1,
    date: "2026-07-02",
    status: "completed",
    from: "Campus",
    to: "City Centre",
  },
  {
    id: 2,
    date: "2026-07-05",
    status: "upcoming",
    from: "Campus",
    to: "Railway Station",
  },
  {
    id: 3,
    date: "2026-07-08",
    status: "cancelled",
    from: "Campus",
    to: "Airport",
  },
  {
    id: 4,
    date: "2026-07-10",
    status: "pending",
    from: "Campus",
    to: "Mall",
  },
];
const Dashboard = () => {
  const { user } = useAuth();
  const navigate = useRouter();
  const isRider = user?.role === 'hybrid';
  const { isComplete, percentage } = useProfileCompletion();

  const [upcomingBookings, setUpcomingBookings] = useState([]);
  const [drivingRides, setDrivingRides] = useState([]);
  const [nearbyRides, setNearbyRides] = useState([]);
  const [loadingStats, setLoadingStats] = useState(true);
  const [loadingNearby, setLoadingNearby] = useState(!isRider);
  const [resendingEmail, setResendingEmail] = useState(false);
  const [resendMessage, setResendMessage] = useState('');

  const [stats, setStats] = useState({
    totalBookings: 0,
    completedTrips: 0,
    ridesOffered: 0,
    passengersTransported: 0,
    averageRating: 5.0,
    reliabilityScore: 100,
    recentActivity: [],
  });

  // Greeting based on time of day
  const getGreeting = () => {
    const h = new Date().getHours();
    if (h < 12) return 'Good morning';
    if (h < 17) return 'Good afternoon';
    return 'Good evening';
  };

  // Format departure time nicely
  const fmtTime = (ride) => {
    if (!ride) return 'Time TBD';
    if (ride.journeyDate && ride.journeyTime) {
      const d = new Date(ride.journeyDate);
      if (!isNaN(d.getTime())) {
        return `${d.toLocaleDateString('en-US', { weekday: 'short', month: 'short', day: 'numeric' })} · ${ride.journeyTime}`;
      }
    }
    if (ride.departureTime) {
      const d = new Date(ride.departureTime);
      if (!isNaN(d.getTime())) {
        return d.toLocaleDateString('en-US', { weekday: 'short', month: 'short', day: 'numeric' }) +
          ' · ' + d.toLocaleTimeString('en-US', { hour: '2-digit', minute: '2-digit' });
      }
    }
    return 'Time TBD';
  };

  // Relative time helper
  const getRelativeTime = (dateStr) => {
    const d = new Date(dateStr);
    const seconds = Math.floor((new Date() - d) / 1000);
    let interval = Math.floor(seconds / 31536000);
    if (interval >= 1) return interval + ' yr' + (interval > 1 ? 's' : '') + ' ago';
    interval = Math.floor(seconds / 2592000);
    if (interval >= 1) return interval + ' mo' + (interval > 1 ? 's' : '') + ' ago';
    interval = Math.floor(seconds / 86400);
    if (interval >= 1) return interval + ' day' + (interval > 1 ? 's' : '') + ' ago';
    interval = Math.floor(seconds / 3600);
    if (interval >= 1) return interval + ' hr' + (interval > 1 ? 's' : '') + ' ago';
    interval = Math.floor(seconds / 60);
    if (interval >= 1) return interval + ' min' + (interval > 1 ? 's' : '') + ' ago';
    return 'Just now';
  };

  // Load dashboard stats
  useEffect(() => {
    const fetchStats = async () => {
      setLoadingStats(true);
      try {
        const res = await api.get('/users/me/stats');
        const d = res.data.data;
        setUpcomingBookings(d.upcomingBookings || []);
        setDrivingRides(d.drivingRides || []);
        setStats({
          totalBookings: d.totalBookings || 0,
          completedTrips: d.completedTrips || 0,
          ridesOffered: d.ridesOffered || 0,
          passengersTransported: d.passengersTransported || 0,
          averageRating: d.averageRating || 5.0,
          reliabilityScore: d.reliabilityScore || 100,
          recentActivity: d.recentActivity || [],
        });
      } catch (err) {
        console.error('Failed to load dashboard stats:', err);
      } finally {
        setLoadingStats(false);
      }
    };
    fetchStats();
  }, []);

  // Load nearby rides for passengers using home location
  useEffect(() => {
    if (isRider) return;
    const fetchNearby = async () => {
      setLoadingNearby(true);
      try {
        const lat = user?.homeLocation?.latitude;
        const lng = user?.homeLocation?.longitude;
        const params = { limit: 6, status: 'active' };
        if (lat && lng) { params.lat = lat; params.lng = lng; params.radius = 25; }
        const res = await api.get('/rides', { params });
        setNearbyRides(res.data.data.rides || []);
      } catch (err) {
        console.error('Failed to load nearby rides:', err);
      } finally {
        setLoadingNearby(false);
      }
    };
    fetchNearby();
  }, [isRider, user]);

  const handleResendVerification = async () => {
    setResendingEmail(true);
    setResendMessage('');
    try {
      const res = await api.post('/auth/resend-verification', { email: user?.email });
      setResendMessage(res.data.data?.message || 'Verification email sent!');
    } catch (err) {
      setResendMessage(err.response?.data?.message || 'Failed to resend email.');
    } finally {
      setResendingEmail(false);
    }
  };

  const roleBadge = isRider
    ? <span className="inline-flex items-center gap-1 px-3 py-1 rounded-full text-xs font-bold bg-amber-500/15 text-amber-400 border border-amber-500/25">🚗 Rider</span>
    : <span className="inline-flex items-center gap-1 px-3 py-1 rounded-full text-xs font-bold bg-emerald-500/15 text-emerald-400 border border-emerald-500/25">🧑‍💼 Co-Rider</span>;

  // Custom Stat Card Component
  const StatCard = ({ title, value, icon, colorClass, glowClass }) => (
    <div className="glass-panel p-6 border border-[var(--border-subtle)] hover:-translate-y-1 transition-all duration-300 group relative overflow-hidden flex flex-col justify-between">
      <div className="flex items-center justify-between mb-4">
        <span className="text-xs font-bold uppercase tracking-widest text-[var(--text-secondary)]">{title}</span>
        <div className={`w-8 h-8 flex items-center justify-center rounded-lg ${colorClass}`}>
          {icon}
        </div>
      </div>
      <div className="w-full h-px bg-[var(--border-subtle)] mb-4"></div>
      <div className="text-3xl font-bold text-[var(--text-primary)] tracking-tight">{value}</div>
    </div>
  );

  // Custom Action Card Component
  const ActionCard = ({ to, title, description, icon, theme }) => {
    const themes = {
      emerald: {
        border: 'hover:border-emerald-500/30 hover:shadow-emerald-500/5',
        iconBg: 'bg-emerald-500/10 border-emerald-500/20 text-emerald-400 group-hover:bg-emerald-500/20',
        text: 'text-emerald-400'
      },
      indigo: {
        border: 'hover:border-indigo-500/30 hover:shadow-indigo-500/5',
        iconBg: 'bg-indigo-500/10 border-indigo-500/20 text-indigo-400 group-hover:bg-indigo-500/20',
        text: 'text-indigo-400'
      },
      violet: {
        border: 'hover:border-violet-500/30 hover:shadow-violet-500/5',
        iconBg: 'bg-violet-500/10 border-violet-500/20 text-violet-400 group-hover:bg-violet-500/20',
        text: 'text-violet-400'
      },
      amber: {
        border: 'hover:border-amber-500/30 hover:shadow-amber-500/5',
        iconBg: 'bg-amber-500/10 border-amber-500/20 text-amber-400 group-hover:bg-amber-500/20',
        text: 'text-amber-400'
      }
    };

    const t = themes[theme] || themes.indigo;

    return (
      <Link
        href={to}
        className={`group glass-panel p-6 hover:-translate-y-1 transition-all duration-300 ${t.border}`}
      >
        <div className={`w-10 h-10 rounded-sm border flex items-center justify-center mb-6 transition-transform duration-300 group-hover:scale-110 ${t.iconBg}`}>
          {icon}
        </div>
        <h3 className="text-base font-bold text-[var(--text-primary)] uppercase tracking-wider mb-2 transition">{title}</h3>
        <p className="text-[var(--text-secondary)] text-xs leading-relaxed">{description}</p>
        <div className={`mt-6 flex items-center gap-1.5 ${t.text} text-[10px] uppercase font-bold tracking-widest`}>
          Execute <span className="group-hover:translate-x-1 transition-transform">→</span>
        </div>
      </Link>
    );
  };

  // Activity Feed Helper
  const getActivityIcon = (type) => {
    switch (type) {
      case 'booking_pending':
      case 'booking_received':
        return { emoji: '⏳', bg: 'bg-amber-500/10 border-amber-500/20' };
      case 'booking_accepted':
      case 'ride_completed':
        return { emoji: '✅', bg: 'bg-emerald-500/10 border-emerald-500/20' };
      case 'booking_rejected':
        return { emoji: '❌', bg: 'bg-red-500/10 border-red-500/20' };
      case 'booking_cancelled':
      case 'ride_cancelled':
        return { emoji: '🚫', bg: 'bg-slate-700/20 border-slate-700/35' };
      case 'ride_published':
      default:
        return { emoji: '🚗', bg: 'bg-indigo-500/10 border-indigo-500/20' };
    }
  };

  return (
    <div className="min-h-[calc(100vh-73px)] relative py-8 px-4 sm:px-6 lg:px-8">
      <div className="max-w-6xl mx-auto space-y-8 relative">
        
        {/* ── SECTION 1: Welcome Header (Ref 3 Mobile Style) ── */}
        <div className="glass-panel p-6 sm:p-8 flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4 border-b-0 rounded-[2rem] shadow-2xl relative overflow-hidden">
          <div className="absolute top-0 right-0 -mt-10 -mr-10 w-40 h-40 bg-[var(--primary-base)]/10 rounded-full blur-3xl"></div>
          <div className="relative z-10">
            <h1 className="text-3xl sm:text-4xl font-bold text-[var(--text-primary)] tracking-tight mb-1">
              Hey {user?.firstName},
            </h1>
            <p className="text-[var(--text-secondary)] font-medium text-sm sm:text-base">
              {getGreeting()} — Here is your transit overview.
            </p>
          </div>
          <div className="flex items-center gap-3">
            {roleBadge}
            {stats.averageRating && (
              <span className="inline-flex items-center gap-1 px-3 py-1 rounded-full text-xs font-bold bg-amber-500/10 text-amber-400 border border-amber-500/20">
                ⭐ {Number(stats.averageRating).toFixed(1)}
              </span>
            )}
          </div>
        </div>

        {/* Profile Completion banner embedded if incomplete */}
        {!isComplete && (
          <div className="transition-all duration-300">
            <ProfileCompletionBanner compact={true} />
          </div>
        )}

        {/* Unverified Email Banner */}
        {/*
        {user && user.isEmailVerified === false && (
          <div className="bg-amber-950/40 border border-amber-500/30 rounded-xl p-4 flex flex-col sm:flex-row items-center justify-between gap-4">
            <div>
              <h3 className="text-amber-400 font-bold text-sm flex items-center gap-2">
                <span>⚠️</span> Email Not Verified
              </h3>
              <p className="text-amber-200/80 text-xs mt-1">
                You must verify your @st.com email address to create or book rides.
              </p>
              {resendMessage && (
                <p className="text-amber-300 font-medium text-xs mt-2">{resendMessage}</p>
              )}
            </div>
            <button
              onClick={handleResendVerification}
              disabled={resendingEmail}
              className="whitespace-nowrap px-4 py-2 bg-amber-500 hover:bg-amber-600 text-amber-950 text-xs font-bold rounded-lg transition-colors disabled:opacity-50"
            >
              {resendingEmail ? 'Sending...' : 'Resend Email'}
            </button>
          </div>
        )}
        */}

        {/* ── SECTION 2: Quick Actions Grid ── */}
        <div>
          <h2 className="text-xl font-bold text-[var(--text-primary)] mb-4 flex items-center gap-2">
            <span className="w-1.5 h-6 rounded bg-emerald-400 block" />
            Quick Actions
          </h2>
          <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-5">
            {isRider ? (
              <>
                <ActionCard
                  to="/create-ride"
                  title="Offer a Ride"
                  description="Publish a new commute route, set price per seat, and carry colleagues."
                  icon={<svg className="w-6 h-6 text-emerald-400" fill="none" viewBox="0 0 24 24" stroke="currentColor"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 4v16m8-8H4" /></svg>}
                  theme="emerald"
                />
                <ActionCard
                  to="/bookings"
                  title="My Rides"
                  description="Manage the status of active and past rides you are driving."
                  icon={<svg className="w-6 h-6 text-indigo-400" fill="none" viewBox="0 0 24 24" stroke="currentColor"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M8 7h12m0 0l-4-4m4 4l-4 4m0 6H4m0 0l4 4m-4-4l4-4" /></svg>}
                  theme="indigo"
                />
                <ActionCard
                  to="/bookings"
                  title="Manage Bookings"
                  description="Review pending passenger requests, confirmations, and reports."
                  icon={<svg className="w-6 h-6 text-violet-400" fill="none" viewBox="0 0 24 24" stroke="currentColor"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 5H7a2 2 0 00-2 2v12a2 2 0 002 2h10a2 2 0 002-2V7a2 2 0 00-2-2h-2M9 5a2 2 0 002 2h2a2 2 0 002-2M9 5a2 2 0 012-2h2a2 2 0 012 2m-3 7h3m-3 4h3m-6-4h.01M9 16h.01" /></svg>}
                  theme="violet"
                />
                <ActionCard
                  to="/profile"
                  title="View Profile"
                  description="Update details, add home starting location, and specify vehicle."
                  icon={<svg className="w-6 h-6 text-amber-400" fill="none" viewBox="0 0 24 24" stroke="currentColor"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M16 7a4 4 0 11-8 0 4 4 0 018 0zM12 14a7 7 0 00-7 7h14a7 7 0 00-7-7z" /></svg>}
                  theme="amber"
                />
                <ActionCard
                  to="/green-impact"
                  title="Green Credits"
                  description="Track carbon savings, earn eco points, unlock badges and maintain your ride streak."
                  icon={
                    <svg
                      className="w-6 h-6 text-green-400"
                      fill="none"
                      stroke="currentColor"
                      strokeWidth={2}
                      viewBox="0 0 24 24"
                    >
                      <path
                        strokeLinecap="round"
                        strokeLinejoin="round"
                        d="M12 22C8 19 5 15 5 10a7 7 0 0114 0c0 5-3 9-7 12z"
                      />
                      <path
                        strokeLinecap="round"
                        strokeLinejoin="round"
                        d="M12 15c2-1 3-3 3-5-2 0-4 1-5 3-1-1-2-3-1-5"
                      />
                    </svg>
                  }
                  theme="emerald"
                />
              </>
            ) : (
              <>
                <ActionCard
                  to="/search"
                  title="Find a Ride"
                  description="Search available commutes to ST office and book seats instantly."
                  icon={<svg className="w-6 h-6 text-emerald-400" fill="none" viewBox="0 0 24 24" stroke="currentColor"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M21 21l-6-6m2-5a7 7 0 11-14 0 7 7 0 0114 0z" /></svg>}
                  theme="emerald"
                />
                <ActionCard
                  to="/bookings"
                  title="My Bookings"
                  description="Track passenger bookings, departure details, and cancellations."
                  icon={<svg className="w-6 h-6 text-indigo-400" fill="none" viewBox="0 0 24 24" stroke="currentColor"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 5H7a2 2 0 00-2 2v12a2 2 0 002 2h10a2 2 0 002-2V7a2 2 0 00-2-2h-2M9 5a2 2 0 002 2h2a2 2 0 002-2M9 5a2 2 0 012-2h2a2 2 0 012 2m-3 7h3m-3 4h3m-6-4h.01M9 16h.01" /></svg>}
                  theme="indigo"
                />
                <ActionCard
                  to="/profile"
                  title="Personal Profile"
                  description="Manage email, saved locations, phone, bio and preferences."
                  icon={<svg className="w-6 h-6 text-violet-400" fill="none" viewBox="0 0 24 24" stroke="currentColor"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M16 7a4 4 0 11-8 0 4 4 0 018 0zM12 14a7 7 0 00-7 7h14a7 7 0 00-7-7z" /></svg>}
                  theme="violet"
                />
                <Link
  href="/green-impact"
  className="group glass-panel p-6 hover:-translate-y-1 transition-all duration-300 border border-emerald-500/20 hover:border-emerald-400"
>

    <div className="flex items-center justify-between">

        <div className="w-12 h-12 rounded-xl bg-emerald-500/10 flex items-center justify-center text-2xl">
            🌱
        </div>

        <div className="text-right">
            <p className="text-xs text-slate-400 uppercase">
                Green Credits
            </p>

            <p className="text-3xl font-bold text-emerald-400">
                {user?.greenCredits ?? 0}
            </p>
        </div>

    </div>

    <div className="mt-6">

        <div className="flex justify-between text-xs mb-2">

            <span className="text-slate-400">
                Eco Badge
            </span>

            <span className="text-emerald-400 font-semibold">
                {user?.greenBadge || "Beginner"}
            </span>

        </div>

        <div className="w-full h-2 rounded-full bg-slate-800">

            <div
                className="h-2 rounded-full bg-gradient-to-r from-green-500 to-emerald-300"
                style={{
                    width: `${Math.min((user?.greenCredits || 0),100)}%`
                }}
            />

        </div>

        <p className="mt-4 text-xs text-slate-400">
            View carbon impact →
        </p>

    </div>

</Link>
              </>
            )}
          </div>
        </div>

        {/* ── SECTION 3 & SECTION 4 / SECTION 5 (Two Column Grid) ── */}
        <div className="grid grid-cols-1 lg:grid-cols-3 gap-8">
          
          {/* Left Columns (Upcoming Activities & Nearby Rides) */}
          <div className="lg:col-span-2 space-y-8">
            
            {/* Upcoming Activities */}
            <div className="glass-panel overflow-hidden">
              <div className="px-6 py-4 border-b border-[var(--border-subtle)] flex items-center justify-between">
                <h2 className="font-bold text-[var(--text-primary)] flex items-center gap-2 uppercase tracking-widest text-sm">
                  <span className="w-2 h-2 bg-[var(--primary-base)] rounded-sm animate-pulse" />
                  Upcoming Activity
                </h2>
                <Link href="/bookings" className="text-[10px] text-[var(--primary-base)] hover:text-[var(--primary-hover)] uppercase font-bold tracking-widest transition">
                  View all →
                </Link>
              </div>
              <div className="p-6">
                {loadingStats ? (
                  <div className="space-y-3">
                    {[1, 2].map(i => <div key={i} className="h-16 bg-slate-850/50 rounded-xl animate-pulse" />)}
                  </div>
                ) : isRider ? (
                  // Rider list
                  drivingRides.length === 0 ? (
                    <div className="text-center py-8 text-slate-500">
                      <span className="text-3xl block mb-2">🚗</span>
                      <p className="text-sm">No upcoming rides scheduled.</p>
                      <Link href="/create-ride" className="mt-3 inline-block text-emerald-400 text-sm font-semibold hover:text-emerald-300 transition">
                        Create your first ride →
                      </Link>
                    </div>
                  ) : (
                    <div className="space-y-3">
                      {drivingRides.slice(0, 3).map(ride => (
                        <Link
                          key={ride._id}
                          href={`/ride-details?id=${ride._id}`}
                          className="flex items-center justify-between p-4 bg-[var(--primary-base)]/10 rounded-xl border border-[var(--primary-base)]/20 hover:border-[var(--primary-base)]/40 transition group"
                        >
                          <div className="flex-1 min-w-0 pr-4 overflow-hidden">
                            <p className="text-sm font-semibold text-[var(--text-primary)] group-hover:text-[var(--primary-base)] transition truncate">
                              {ride.pickupLocation?.address || ride.source} → {ride.destinationLocation?.address || ride.destination}
                            </p>
                            <p className="text-xs text-[var(--text-secondary)] mt-0.5 truncate">{fmtTime(ride)}</p>
                          </div>
                          <div className="text-right flex-shrink-0 ml-2">
                            <span className="text-xs font-bold text-amber-400 bg-amber-500/10 border border-amber-500/20 px-2 py-0.5 rounded-full whitespace-nowrap">
                              {ride.availableSeats} seats left
                            </span>
                            {ride.pendingRequests > 0 && (
                              <p className="text-xs text-amber-400 mt-1 font-semibold whitespace-nowrap">
                                {ride.pendingRequests} pending request{ride.pendingRequests > 1 ? 's' : ''}
                              </p>
                            )}
                          </div>
                        </Link>
                      ))}
                    </div>
                  )
                ) : (
                  // Co-Rider list
                  upcomingBookings.length === 0 ? (
                    <div className="text-center py-8 text-slate-500">
                      <span className="text-3xl block mb-2">📅</span>
                      <p className="text-sm">No upcoming bookings.</p>
                      <Link href="/search" className="mt-3 inline-block text-emerald-400 text-sm font-semibold hover:text-emerald-300 transition">
                        Find a ride →
                      </Link>
                    </div>
                  ) : (
                    <div className="space-y-3">
                      {upcomingBookings.slice(0, 3).map(booking => (
                        <Link
                          key={booking._id}
                          href={`/ride-details?id=${booking.ride?._id}`}
                          className="flex items-center justify-between p-4 bg-[var(--primary-base)]/10 rounded-xl border border-[var(--primary-base)]/20 hover:border-[var(--primary-base)]/40 transition group"
                        >
                          <div className="flex-1 min-w-0 pr-4 overflow-hidden">
                            <p className="text-sm font-semibold text-[var(--text-primary)] group-hover:text-[var(--primary-base)] transition truncate">
                              {booking.ride?.pickupLocation?.address || booking.ride?.source} → {booking.ride?.destinationLocation?.address || booking.ride?.destination}
                            </p>
                            <p className="text-xs text-[var(--text-secondary)] mt-0.5 truncate">{fmtTime(booking.ride)}</p>
                          </div>
                          <span className={`text-xs font-bold px-2.5 py-1 rounded-full border flex-shrink-0 ml-2 whitespace-nowrap ${
                            booking.bookingStatus === 'confirmed'
                              ? 'bg-emerald-950 text-emerald-400 border-emerald-500/20'
                              : 'bg-amber-950 text-amber-400 border-amber-500/20'
                          }`}>
                            {booking.bookingStatus}
                          </span>
                        </Link>
                      ))}
                    </div>
                  )
                )}
              </div>
            </div>

            {/* Nearby Rides Feed (Only for Co-Riders) */}
            {!isRider && (
              <div>
                <div className="flex items-center justify-between mb-4">
                  
                  <Link href="/search" className="text-sm text-emerald-400 hover:text-emerald-300 font-semibold transition">
                    Search with filters →
                  </Link>
                </div>
                <div className="flex gap-6 mb-6">

                  <div className="flex items-center gap-2">
                    <div className="w-4 h-4 bg-green-500 rounded"></div>
                    Completed
                  </div>

                  <div className="flex items-center gap-2">
                    <div className="w-4 h-4 bg-blue-500 rounded"></div>
                    Upcoming
                  </div>

                  <div className="flex items-center gap-2">
                    <div className="w-4 h-4 bg-yellow-500 rounded"></div>
                    Pending
                  </div>

                  <div className="flex items-center gap-2">
                    <div className="w-4 h-4 bg-red-500 rounded"></div>
                    Cancelled
                  </div>

                </div>
                <div className="mt-12 rounded-3xl bg-[#111827] p-8">

                  <h2 className="text-3xl font-bold mb-6">
                    Ride Calendar
                  </h2>

                  <RideCalendar rides={rides} />

                </div>
                <h2 className="text-xl font-bold text-[var(--text-primary)] flex items-center gap-2">
                    <span className="w-1.5 h-6 rounded bg-emerald-400 block" />
                    {user?.homeLocation?.latitude ? 'Rides Near You' : 'Available Rides'}
                  </h2>
                {loadingNearby ? (
                  <div className="grid sm:grid-cols-2 gap-4">
                    {[1, 2, 3, 4].map(i => (
                      <div key={i} className="h-36 bg-slate-850/50 rounded-2xl animate-pulse" />
                    ))}
                  </div>
                ) : nearbyRides.length === 0 ? (
                  <div className="glass-panel py-16 text-center text-[var(--text-muted)]">
                    <span className="text-3xl block mb-2 opacity-50">📡</span>
                    <p className="text-sm font-bold uppercase tracking-wider">No active rides found nearby.</p>
                    <p className="text-xs mt-1">Check back later or set your home location in Profile settings.</p>
                  </div>
                ) : (
                  <div className="grid sm:grid-cols-2 gap-4">
                    {nearbyRides.map(ride => (
                      <Link
                        key={ride._id}
                        href={`/ride-details?id=${ride._id}`}
                        className="group glass-panel p-5 hover:-translate-y-1 transition-all duration-300"
                      >
                        <div className="flex items-start justify-between mb-3">
                          <div className="flex-1 min-w-0 pr-2">
                            <p className="text-sm font-bold text-slate-100 truncate group-hover:text-emerald-400 transition">
                              {ride.pickupLocation?.address || ride.source}
                            </p>
                            <p className="text-xs text-slate-500 flex items-center gap-1 mt-0.5 truncate">
                              <span>↓</span> {ride.destinationLocation?.address || ride.destination}
                            </p>
                          </div>
                          <span className="text-xs font-bold text-emerald-400 bg-emerald-500/10 border border-emerald-500/20 px-2 py-0.5 rounded-full whitespace-nowrap">
                            ₹{ride.pricePerSeat}/seat
                          </span>
                        </div>

                        <div className="flex items-center justify-between text-xs text-slate-500">
                          <span>{fmtTime(ride)}</span>
                          <span className={`font-semibold ${ride.availableSeats <= 1 ? 'text-red-400' : 'text-slate-400'}`}>
                            {ride.availableSeats} seat{ride.availableSeats !== 1 ? 's' : ''} left
                          </span>
                        </div>

                        {ride.driver && (
                          <div className="mt-3 pt-3 border-t border-slate-800/60 flex items-center gap-2">
                            <div className="w-6 h-6 rounded-full bg-indigo-500/20 border border-indigo-500/30 flex items-center justify-center text-[10px] font-bold text-indigo-400">
                              {ride.driver.firstName?.[0]}
                            </div>
                            <span className="text-xs text-slate-400">{ride.driver.firstName} {ride.driver.lastName}</span>
                            {ride.driver.averageRating && (
                              <span className="ml-auto text-xs text-amber-400 font-semibold">⭐ {ride.driver.averageRating.toFixed(1)}</span>
                            )}
                          </div>
                        )}
                      </Link>
                    ))}
                  </div>
                )}
              </div>
            )}
          </div>

          {/* Right Column (Statistics Cards & Recent Activity Timeline) */}
          <div className="space-y-6">
            
            {/* Statistics */}
            <div>
              <h2 className="font-bold text-[var(--text-primary)] mb-6 uppercase tracking-widest text-sm flex items-center gap-2">
                <span className="w-1.5 h-6 rounded bg-indigo-400 block" />
                Your Statistics
              </h2>

              {loadingStats ? (
                <div className="grid grid-cols-2 lg:grid-cols-1 gap-4">
                  {[1, 2, 3, 4].map(i => (
                    <div key={i} className="h-24 bg-slate-850/50 rounded-2xl animate-pulse" />
                  ))}
                </div>
              ) : (
                <div className="grid grid-cols-2 lg:grid-cols-1 gap-4">
                  {isRider ? (
                    <>
                      <StatCard
                        title="Rides Offered"
                        value={stats.ridesOffered}
                        icon="🚗"
                        colorClass="bg-indigo-500/10 text-indigo-400 border border-indigo-500/20"
                        glowClass="bg-indigo-500"
                      />
                      <StatCard
                        title="Passengers Transported"
                        value={stats.passengersTransported}
                        icon="🧑‍🤝‍🧑"
                        colorClass="bg-emerald-500/10 text-emerald-400 border border-emerald-500/20"
                        glowClass="bg-emerald-500"
                      />
                      <StatCard
                        title="Average Rating"
                        value={Number(stats.averageRating).toFixed(1)}
                        icon="⭐"
                        colorClass="bg-amber-500/10 text-amber-400 border border-amber-500/20"
                        glowClass="bg-amber-500"
                      />
                      <StatCard
                        title="Reliability Score"
                        value={`${stats.reliabilityScore}%`}
                        icon="📈"
                        colorClass="bg-violet-500/10 text-violet-400 border border-violet-500/20"
                        glowClass="bg-violet-500"
                      />
                    </>
                  ) : (
                    <>
                      <StatCard
                        title="Total Bookings"
                        value={stats.totalBookings}
                        icon="📋"
                        colorClass="bg-emerald-500/10 text-emerald-400 border border-emerald-500/20"
                        glowClass="bg-emerald-500"
                      />
                      <StatCard
                        title="Completed Trips"
                        value={stats.completedTrips}
                        icon="🌍"
                        colorClass="bg-indigo-500/10 text-indigo-400 border border-indigo-500/20"
                        glowClass="bg-indigo-500"
                      />
                      <StatCard
                        title="Average Rating"
                        value={Number(stats.averageRating).toFixed(1)}
                        icon="⭐"
                        colorClass="bg-amber-500/10 text-amber-400 border border-amber-500/20"
                        glowClass="bg-amber-500"
                      />
                      <StatCard
                        title="Reliability Score"
                        value={`${stats.reliabilityScore}%`}
                        icon="📈"
                        colorClass="bg-violet-500/10 text-violet-400 border border-violet-500/20"
                        glowClass="bg-violet-500"
                      />
                    </>
                  )}
                </div>
              )}
            </div>

            {/* Recent Activity Timeline Feed */}
            <div className="glass-panel p-6 relative overflow-hidden">
              <h2 className="font-bold text-[var(--text-primary)] mb-6 uppercase tracking-widest text-sm flex items-center gap-2">
                <span className="text-lg">⚡</span> Telemetry Log
              </h2>
              
              {loadingStats ? (
                <div className="space-y-4">
                  {[1, 2, 3].map(i => (
                    <div key={i} className="flex gap-3">
                      <div className="w-8 h-8 rounded-lg bg-slate-850 animate-pulse" />
                      <div className="flex-1 space-y-2 py-1">
                        <div className="h-3 bg-slate-850 rounded animate-pulse w-3/4" />
                        <div className="h-2 bg-slate-850 rounded animate-pulse w-1/4" />
                      </div>
                    </div>
                  ))}
                </div>
              ) : stats.recentActivity.length === 0 ? (
                <div className="text-center py-8 text-[var(--text-secondary)] text-sm">
                  No recent activities recorded.
                </div>
              ) : (
                <div className="relative border-l-2 border-[var(--border-subtle)] ml-5 pl-8 space-y-8 mt-4">
                  {stats.recentActivity.map((activity, idx) => {
                    const iconConfig = getActivityIcon(activity.type);
                    return (
                      <div key={idx} className="relative group">
                        {/* Timeline node */}
                        <div className={`absolute -left-[45px] top-0 w-8 h-8 rounded-full shadow-lg border-4 border-[var(--bg-surface)] flex items-center justify-center text-xs ${iconConfig.bg} z-10 transition-transform duration-300 group-hover:scale-110`}>
                          {iconConfig.emoji}
                        </div>
                        
                        <div className="bg-[var(--bg-surface)]/50 p-4 rounded-2xl border border-[var(--border-subtle)] transition-colors hover:bg-[var(--bg-surface)]">
                          <p className="text-sm font-semibold text-[var(--text-primary)] transition">
                            {activity.message}
                          </p>
                          <div className="flex items-center gap-2 mt-2">
                             <span className="text-xs text-[var(--text-secondary)] font-medium flex items-center gap-1">
                               <svg className="w-3.5 h-3.5" fill="none" viewBox="0 0 24 24" stroke="currentColor"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 8v4l3 3m6-3a9 9 0 11-18 0 9 9 0 0118 0z" /></svg>
                               {getRelativeTime(activity.timestamp)}
                             </span>
                          </div>
                        </div>
                      </div>
                    );
                  })}
                </div>
              )}
            </div>

          </div>
          
        </div>

      </div>
    </div>
  );
};

export default Dashboard;
